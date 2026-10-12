package com.hmall.trade.listener;

import com.hmall.api.client.PayClient;
import com.hmall.api.dto.PayOrderDTO;
import com.hmall.trade.config.MqDeadLetterConfig;
import com.hmall.trade.constants.MQConstants;
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

@Slf4j
@Component
@RequiredArgsConstructor
public class OrderDelayMessageListener {

    private final IOrderService orderService;
    private final PayClient payClient;

    /**
     * 队列声明里多挂了两个死信参数：
     * 消费重试耗尽后（见 yaml 的 listener.simple.retry）消息不再回原队列，
     * 而是被转到 trade.dlx → trade.dlq，等人工或定时任务重放。
     */
    @RabbitListener(bindings = @QueueBinding(
            value = @Queue(value = MQConstants.DELAY_ORDER_QUEUE_NAME,
                    arguments = {
                            @Argument(name = "x-dead-letter-exchange", value = MqDeadLetterConfig.DLX_EXCHANGE),
                            @Argument(name = "x-dead-letter-routing-key", value = MqDeadLetterConfig.DLX_ROUTING_KEY)
                    }),
            exchange = @Exchange(value = MQConstants.DELAY_EXCHANGE_NAME, delayed = "true"),
            key = MQConstants.Delay_ORDER_KEY
    ))
    public void listenOrderDelayMessage(Long orderId) {
        // ① 状态闸门（幂等）：订单不存在 / 已支付 / 已关闭 → 直接退出
        //    消息重复投递、DLQ 重放时都会走到这里
        Order order = orderService.getById(orderId);
        Integer status = order == null ? null : order.getStatus();
        if (status == null || status != 1) {
            log.info("[延迟消息] 订单无需处理, orderId={}, status={}", orderId, status);
            return;
        }

        // ② 回查支付单：以支付域的权威状态为准 —— 兜底"支付成功通知丢失"的情况
        PayOrderDTO payOrderDTO = payClient.queryPayOrderByBizOrderNo(orderId);
        Integer payStatus = payOrderDTO == null ? null : payOrderDTO.getStatus();
        if (payStatus != null && payStatus == 3) {
            orderService.markOrderPaySuccess(orderId);
            log.info("[延迟消息] 回查支付单发现已支付，订单补标记为已付款, orderId={}", orderId);
            return;
        }

        // ③ 确实未支付 → 关单 + 回滚库存（cancelOrder 内部用乐观锁，天然幂等）
        orderService.cancelOrder(orderId);
        log.info("[延迟消息] 订单超时未支付，已关单并回滚库存, orderId={}", orderId);
    }
}
