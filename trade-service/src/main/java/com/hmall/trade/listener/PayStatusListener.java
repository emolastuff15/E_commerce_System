package com.hmall.trade.listener;

import com.hmall.trade.config.MqDeadLetterConfig;
import com.hmall.trade.domain.po.Order;
import com.hmall.trade.service.IOrderService;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.annotation.Argument;
import org.springframework.amqp.rabbit.annotation.Exchange;
import org.springframework.amqp.rabbit.annotation.Queue;
import org.springframework.amqp.rabbit.annotation.QueueBinding;
import org.springframework.amqp.rabbit.annotation.RabbitListener;
import org.springframework.stereotype.Component;

/**
 * 消费"支付成功"通知：把订单标记为已付款。
 *
 * <p>修掉了原实现的两个问题：
 * 1. if 分支里"不做处理"却没有 return，导致任何消息都会执行 markOrderPaySuccess
 *    （已关闭的订单都会被改成已付款）；
 * 2. 用无条件 updateById 更新，不幂等（重复通知会反复覆盖状态和时间）。
 */
@Slf4j
@Component
@RequiredArgsConstructor
public class PayStatusListener {

    private final IOrderService orderService;

    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = "trade.pay.success.queue", durable = "true",
                    arguments = {
                            @Argument(name = "x-dead-letter-exchange", value = MqDeadLetterConfig.DLX_EXCHANGE),
                            @Argument(name = "x-dead-letter-routing-key", value = MqDeadLetterConfig.DLX_ROUTING_KEY)
                    }),
            exchange = @Exchange(name = "pay.direct"),
            key = "pay.success"
    ))
    public void listenPaySuccess(Long orderId) {
        Order order = orderService.getById(orderId);
        if (order == null) {
            log.error("[支付成功通知] 订单不存在，忽略, orderId={}", orderId);
            return;
        }
        Integer status = order.getStatus();
        if (status != null && status == 2) {
            // 重复通知：已经是已付款，直接幂等退出
            log.info("[支付成功通知] 订单已是已付款，忽略重复通知, orderId={}", orderId);
            return;
        }
        if (status != null && status == 5) {
            // 竞态：支付成功的同时订单被超时关单且库存已回滚 → 钱收了、库存退了，必须补偿
            log.error("[支付成功通知] 订单已关闭但支付成功，需要补偿（退款或恢复库存）, orderId={}", orderId);
            return;
        }
        if (status == null || status != 1) {
            log.warn("[支付成功通知] 订单状态不是待付款，忽略, orderId={}, status={}", orderId, status);
            return;
        }
        // 条件更新（只把 1→2），天然幂等；重复投递不会造成状态回退
        orderService.markOrderPaySuccess(orderId);
        log.info("[支付成功通知] 订单已标记为已付款, orderId={}", orderId);
    }
}
