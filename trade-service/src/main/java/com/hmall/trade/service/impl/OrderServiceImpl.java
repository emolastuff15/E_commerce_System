package com.hmall.trade.service.impl;

import com.baomidou.mybatisplus.extension.plugins.pagination.Page;
import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmall.api.client.CartClient;
import com.hmall.api.client.ItemClient;
import com.hmall.common.domain.PageDTO;
import com.hmall.common.domain.PageQuery;
import com.hmall.common.exception.BadRequestException;
import com.hmall.common.utils.BeanUtils;
import com.hmall.common.utils.CollUtils;
import com.hmall.common.utils.UserContext;

import com.hmall.api.dto.ItemDTO;
import com.hmall.api.dto.OrderDetailDTO;
import com.hmall.api.dto.OrderFormDTO;
import com.hmall.trade.constants.MQConstants;
import com.hmall.trade.domain.po.Order;
import com.hmall.trade.domain.po.OrderDetail;
import com.hmall.trade.domain.vo.OrderVO;
import com.hmall.trade.mapper.OrderMapper;
import com.hmall.trade.service.ICartService;
import com.hmall.trade.service.IOrderDetailService;
import com.hmall.trade.service.IOrderService;
import io.seata.spring.annotation.GlobalTransactional;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.AmqpException;
import org.springframework.amqp.core.Message;
import org.springframework.amqp.core.MessagePostProcessor;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;

import java.time.LocalDateTime;
import java.util.ArrayList;
import java.util.Collections;
import java.util.List;
import java.util.Map;
import java.util.Set;
import java.util.stream.Collectors;

/**
 * <p>
 * 服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2023-05-05
 */
@Slf4j
@Service
@RequiredArgsConstructor

public class OrderServiceImpl extends ServiceImpl<OrderMapper, Order> implements IOrderService {

    private final ItemClient itemClient;
    //private final IItemService itemService;
    private final IOrderDetailService detailService;
    private final CartClient cartClient;
    private final RabbitTemplate rabbitTemplate;

    @Override
    @Transactional
    @GlobalTransactional
    public Long createOrder(OrderFormDTO orderFormDTO) {
        // 1.订单数据
        Order order = new Order();
        // 1.1.查询商品
        List<OrderDetailDTO> detailDTOS = orderFormDTO.getDetails();
        // 1.2.获取商品id和数量的Map
        Map<Long, Integer> itemNumMap = detailDTOS.stream()
                .collect(Collectors.toMap(OrderDetailDTO::getItemId, OrderDetailDTO::getNum));
        Set<Long> itemIds = itemNumMap.keySet();
        // 1.3.查询商品
        List<ItemDTO> items = itemClient.queryItemByIds(itemIds);
        if (items == null || items.size() < itemIds.size()) {
            throw new BadRequestException("商品不存在");
        }
        // 1.4.基于商品价格、购买数量计算商品总价：totalFee
        int total = 0;
        for (ItemDTO item : items) {
            total += item.getPrice() * itemNumMap.get(item.getId());
        }
        order.setTotalFee(total);
        // 1.5.其它属性
        order.setPaymentType(orderFormDTO.getPaymentType());
        order.setUserId(UserContext.getUser());
        order.setStatus(1);
        // 1.6.将Order写入数据库order表中
        save(order);

        // 2.保存订单详情
        List<OrderDetail> details = buildDetails(order.getId(), items, itemNumMap);
        detailService.saveBatch(details);

        // 3.清理购物车商品
        cartClient.deleteCartItemByIds(itemIds);
        // 4.扣减库存
        try {
            itemClient.deductStock(detailDTOS);
        } catch (Exception e) {
            throw new RuntimeException("库存不足！");
        }

        //5.发送延迟消息
        rabbitTemplate.convertAndSend(
                MQConstants.DELAY_EXCHANGE_NAME,
                MQConstants.Delay_ORDER_KEY,
                order.getId(),
                new MessagePostProcessor() {
                    @Override
                    public Message postProcessMessage(Message message) throws AmqpException {
                        message.getMessageProperties().setDelay(10000);
                        return message;
                    }
                }
        );

        return order.getId();
    }

    @Override
    public void markOrderPaySuccess(Long orderId) {
        // 条件更新（幂等）：只有把订单从"1未付款"改成"2已付款"的那一次算成功。
        // 重复的支付通知 / 重复投递的延迟消息不会覆盖后续状态
        //（例如已经关闭的订单不会被改成已付款）。
        boolean updated = lambdaUpdate()
                .set(Order::getStatus, 2)
                .set(Order::getPayTime, LocalDateTime.now())
                .eq(Order::getId, orderId)
                .eq(Order::getStatus, 1)
                .update();
        if (!updated) {
            log.warn("[订单] 标记已付款未生效（订单当前不是待付款状态）, orderId={}", orderId);
        }
    }

    @Override
    public void cancelOrder(Long orderId) {
        // 1.乐观锁关单：只有把订单从"1未付款"改成"5交易取消/订单关闭"的那一次，才有资格回滚库存
        boolean closed = lambdaUpdate()
                .set(Order::getStatus, 5)
                .set(Order::getCloseTime, LocalDateTime.now())
                .eq(Order::getId, orderId)
                .eq(Order::getStatus, 1)
                .update();
        if (!closed) {
            // 订单不存在 / 已支付 / 已经被关过 → 幂等退出，绝不能回滚库存
            return;
        }
        // 2.回滚库存
        rollBackStorge(orderId);
    }

    @Override
    public PageDTO<OrderVO> queryMyOrders(PageQuery query, Integer status) {
        Long userId = UserContext.getUser();
        // 1.按当前登录用户分页查询，默认按创建时间倒序
        Page<Order> page = lambdaQuery()
                .eq(Order::getUserId, userId)
                .eq(status != null, Order::getStatus, status)
                .page(query.toMpPageDefaultSortByCreateTimeDesc());
        // 2.转 VO
        List<OrderVO> vos = BeanUtils.copyList(page.getRecords(), OrderVO.class);
        // 3.补上订单明细（列表里要展示商品名/图片，避免前端逐单再查一次）
        fillDetails(vos);
        return PageDTO.of(page, vos);
    }

    @Override
    public OrderVO queryMyOrderDetail(Long orderId) {
        Order order = getById(orderId);
        // 只能查自己的订单
        if (order == null || !order.getUserId().equals(UserContext.getUser())) {
            throw new BadRequestException("订单不存在或不属于当前用户");
        }
        OrderVO vo = BeanUtils.copyBean(order, OrderVO.class);
        fillDetails(Collections.singletonList(vo));
        return vo;
    }

    /** 批量把订单明细塞进 VO，避免 N+1 次查询 */
    private void fillDetails(List<OrderVO> vos) {
        if (CollUtils.isEmpty(vos)) {
            return;
        }
        List<Long> orderIds = vos.stream().map(OrderVO::getId).collect(Collectors.toList());
        Map<Long, List<OrderDetail>> detailMap = detailService.lambdaQuery()
                .in(OrderDetail::getOrderId, orderIds)
                .list()
                .stream()
                .collect(Collectors.groupingBy(OrderDetail::getOrderId));
        vos.forEach(vo -> vo.setDetails(detailMap.getOrDefault(vo.getId(), new ArrayList<>())));
    }

    private List<OrderDetail> buildDetails(Long orderId, List<ItemDTO> items, Map<Long, Integer> numMap) {
        List<OrderDetail> details = new ArrayList<>(items.size());
        for (ItemDTO item : items) {
            OrderDetail detail = new OrderDetail();
            detail.setName(item.getName());
            detail.setSpec(item.getSpec());
            detail.setPrice(item.getPrice());
            detail.setNum(numMap.get(item.getId()));
            detail.setItemId(item.getId());
            detail.setImage(item.getImage());
            detail.setOrderId(orderId);
            details.add(detail);
        }
        return details;
    }

    public void rollBackStorge(Long orderId){


        List<OrderDetail> list = detailService.lambdaQuery()
                .eq(OrderDetail::getOrderId, orderId)
                .list();
        List<OrderDetailDTO> items=list.stream().map(og->
                new OrderDetailDTO().setItemId(og.getItemId()).setNum(og.getNum())).collect(Collectors.toList());

        itemClient.rollBackStock(items);
    }
}
