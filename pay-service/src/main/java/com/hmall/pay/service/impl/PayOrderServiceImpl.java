package com.hmall.pay.service.impl;

import com.baomidou.mybatisplus.core.toolkit.IdWorker;
import com.baomidou.mybatisplus.core.toolkit.StringUtils;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmall.api.client.TradeClient;
import com.hmall.api.client.UserClient;
import com.hmall.common.exception.BizIllegalException;
import com.hmall.common.utils.BeanUtils;
import com.hmall.common.utils.UserContext;

import com.hmall.pay.domain.dto.PayApplyDTO;
import com.hmall.pay.domain.dto.PayOrderFormDTO;
import com.hmall.pay.domain.po.PayOrder;
import com.hmall.pay.enums.PayStatus;
import com.hmall.pay.service.IPayOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.hmall.pay.mapper.PayOrderMapper;
import java.time.LocalDateTime;

/**
 * <p>
 * 支付订单 服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2023-05-16
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class PayOrderServiceImpl extends ServiceImpl<PayOrderMapper, PayOrder> implements IPayOrderService {

    private final UserClient userClient;

    private final TradeClient tradeClient;

    private final RabbitTemplate rabbitTemplate;

    @Override
    public String applyPayOrder(PayApplyDTO applyDTO) {
        // 1.幂等性校验
        PayOrder payOrder = checkIdempotent(applyDTO);
        // 2.返回结果
        return payOrder.getId().toString();
    }

    /**
     * 余额支付：付款就扣减账户余额。
     * <p>
     * 顺序很重要 —— 必须“先抢占支付单（乐观锁改状态），再调用 user-service 扣款”：
     * 并发重复提交时，只有把状态从“待支付”改成“支付成功”的那一次请求会走到扣款，
     * 从而保证最多扣一次钱；扣款失败会抛异常，本次事务回滚（状态改回“待支付”），
     * 钱没动，用户可以重试。
     */
    @Override
    @Transactional
    public void tryPayOrderByBalance(PayOrderFormDTO payOrderFormDTO) {
        // 1.查询支付单
        PayOrder po = getById(payOrderFormDTO.getId());
        if (po == null) {
            throw new BizIllegalException("支付单不存在");
        }
        // 2.越权校验：只能支付自己的交易单
        Long userId = UserContext.getUser();
        if (po.getBizUserId() != null && !po.getBizUserId().equals(userId)) {
            throw new BizIllegalException("无权支付该交易单");
        }
        // 3.状态校验：只有“未提交/待支付”能付款
        if (!PayStatus.WAIT_BUYER_PAY.equalsValue(po.getStatus())
                && !PayStatus.NOT_COMMIT.equalsValue(po.getStatus())) {
            throw new BizIllegalException("交易已支付或关闭！");
        }
        // 4.超时校验：超时就把支付单关掉，避免超时后还能把钱扣走
        if (po.getPayOverTime() != null && po.getPayOverTime().isBefore(LocalDateTime.now())) {
            closePayOrder(po.getId());
            throw new BizIllegalException("支付已超时，请重新下单");
        }
        // 5.金额校验
        if (po.getAmount() == null || po.getAmount() <= 0) {
            throw new BizIllegalException("支付金额异常");
        }
        // 6.抢占支付单（乐观锁）：保证后面的扣款最多执行一次
        if (!markPayOrderSuccess(po.getId(), LocalDateTime.now())) {
            throw new BizIllegalException("交易已支付或关闭！");
        }
        // 7.扣减余额（密码错误 / 余额不足会抛业务异常，事务回滚，第 6 步的状态修改一起撤销）
        try {
            userClient.deductMoney(payOrderFormDTO.getPw(), po.getAmount());
            log.info("余额支付成功: payOrderId={}, bizOrderNo={}, amount={}",
                    po.getId(), po.getBizOrderNo(), po.getAmount());
        } catch (BizIllegalException e) {
            throw e;
        } catch (Exception e) {
            log.error("调用 user-service 扣减余额失败: payOrderId={}", po.getId(), e);
            throw new BizIllegalException("扣减余额失败，请稍后重试");
        }
        // 8.通知交易服务把订单标记为已支付
        //    （消息发送失败只记日志：钱已扣、支付单已成功，交易侧靠 /orders/{id} 状态查询与对账补偿）
        try {
            rabbitTemplate.convertAndSend("pay.direct", "pay.success", po.getBizOrderNo());
        } catch (Exception e) {
            log.error("发送支付状态通知失败: bizOrderNo={}", po.getBizOrderNo(), e);
        }
    }

    /** 乐观锁把支付单改成“支付成功”，返回 false 说明已被其它请求处理 */
    public boolean markPayOrderSuccess(Long id, LocalDateTime successTime) {
        return lambdaUpdate()
                .set(PayOrder::getStatus, PayStatus.TRADE_SUCCESS.getValue())
                .set(PayOrder::getPaySuccessTime, successTime)
                .eq(PayOrder::getId, id)
                // 支付状态的乐观锁判断
                .in(PayOrder::getStatus, PayStatus.NOT_COMMIT.getValue(), PayStatus.WAIT_BUYER_PAY.getValue())
                .update();
    }

    /** 关闭支付单（超时/取消） */
    public boolean closePayOrder(Long id) {
        return lambdaUpdate()
                .set(PayOrder::getStatus, PayStatus.TRADE_CLOSED.getValue())
                .eq(PayOrder::getId, id)
                .in(PayOrder::getStatus, PayStatus.NOT_COMMIT.getValue(), PayStatus.WAIT_BUYER_PAY.getValue())
                .update();
    }


    private PayOrder checkIdempotent(PayApplyDTO applyDTO) {
        // 1.首先查询支付单
        PayOrder oldOrder = queryByBizOrderNo(applyDTO.getBizOrderNo());
        // 2.判断是否存在
        if (oldOrder == null) {
            // 不存在支付单，说明是第一次，写入新的支付单并返回
            PayOrder payOrder = buildPayOrder(applyDTO);
            payOrder.setPayOrderNo(IdWorker.getId());
            save(payOrder);
            return payOrder;
        }
        // 3.旧单已经存在，判断是否支付成功
        if (PayStatus.TRADE_SUCCESS.equalsValue(oldOrder.getStatus())) {
            // 已经支付成功，抛出异常
            throw new BizIllegalException("订单已经支付！");
        }
        // 4.旧单已经存在，判断是否已经关闭
        if (PayStatus.TRADE_CLOSED.equalsValue(oldOrder.getStatus())) {
            // 已经关闭，抛出异常
            throw new BizIllegalException("订单已关闭");
        }
        // 5.旧单已经存在，判断支付渠道是否一致
        if (!StringUtils.equals(oldOrder.getPayChannelCode(), applyDTO.getPayChannelCode())) {
            // 支付渠道不一致，需要重置数据，然后重新申请支付单
            PayOrder payOrder = buildPayOrder(applyDTO);
            payOrder.setId(oldOrder.getId());
            payOrder.setQrCodeUrl("");
            updateById(payOrder);
            payOrder.setPayOrderNo(oldOrder.getPayOrderNo());
            return payOrder;
        }
        // 6.旧单已经存在，且可能是未支付或未提交，且支付渠道一致，直接返回旧数据
        return oldOrder;
    }

    private PayOrder buildPayOrder(PayApplyDTO payApplyDTO) {
        // 1.数据转换
        PayOrder payOrder = BeanUtils.toBean(payApplyDTO, PayOrder.class);
        // 2.初始化数据
        payOrder.setPayOverTime(LocalDateTime.now().plusMinutes(120L));
        payOrder.setStatus(PayStatus.WAIT_BUYER_PAY.getValue());
        payOrder.setBizUserId(UserContext.getUser());
        return payOrder;
    }

    public PayOrder queryByBizOrderNo(Long bizOrderNo) {
        return lambdaQuery()
                .eq(PayOrder::getBizOrderNo, bizOrderNo)
                .one();
    }
}
