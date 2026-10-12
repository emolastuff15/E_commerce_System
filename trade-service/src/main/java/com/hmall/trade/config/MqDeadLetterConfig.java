package com.hmall.trade.config;

import org.springframework.amqp.core.Binding;
import org.springframework.amqp.core.BindingBuilder;
import org.springframework.amqp.core.DirectExchange;
import org.springframework.amqp.core.Queue;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

/**
 * 死信（DLX / DLQ）拓扑声明。
 *
 * <p>工作方式：
 * 业务队列在声明时通过参数 {@code x-dead-letter-exchange} 指定"死信往哪转"，
 * 并统一用 {@code x-dead-letter-routing-key = dead.letter} 指定死信路由键，
 * 这样所有业务队列的失败消息都会汇到同一个 DLQ，便于人工或定时重放。
 *
 * <p>什么消息会变成死信：
 * 1. 消费者重试耗尽后被拒绝，且不再重回原队列（配置 default-requeue-rejected: false）；
 * 2. 消息在队列里过期（TTL）；
 * 3. 队列长度超限被丢弃。
 */
@Configuration
public class MqDeadLetterConfig {

    /** 死信交换机 */
    public static final String DLX_EXCHANGE = "trade.dlx";
    /** 死信队列 */
    public static final String DLQ_QUEUE = "trade.dlq";
    /** 死信统一路由键（业务队列声明的 x-dead-letter-routing-key 用这个值） */
    public static final String DLX_ROUTING_KEY = "dead.letter";

    @Bean
    public DirectExchange tradeDlxExchange() {
        // durable=true, autoDelete=false
        return new DirectExchange(DLX_EXCHANGE, true, false);
    }

    @Bean
    public Queue tradeDlqQueue() {
        return new Queue(DLQ_QUEUE, true, false, false);
    }

    @Bean
    public Binding tradeDlqBinding(Queue tradeDlqQueue, DirectExchange tradeDlxExchange) {
        return BindingBuilder.bind(tradeDlqQueue).to(tradeDlxExchange).with(DLX_ROUTING_KEY);
    }
}
