package com.hmall.common.config;

import lombok.extern.slf4j.Slf4j;
import org.springframework.amqp.rabbit.connection.CorrelationData;
import org.springframework.amqp.rabbit.core.RabbitTemplate;
import org.springframework.amqp.support.converter.Jackson2JsonMessageConverter;
import org.springframework.amqp.support.converter.MessageConverter;
import org.springframework.beans.factory.config.BeanPostProcessor;
import org.springframework.boot.autoconfigure.condition.ConditionalOnClass;
import org.springframework.context.annotation.Bean;
import org.springframework.context.annotation.Configuration;

import java.nio.charset.StandardCharsets;

/**
 * MQ 公共配置：通过 hm-common 的 META-INF/spring.factories 自动装配，
 * 所有引入 spring-boot-starter-amqp 的服务（trade / pay）都会生效。
 *
 * <p>这里做两件事：
 * 1. 消息体使用 JSON 序列化；
 * 2. 给 RabbitTemplate 挂上「生产者确认」的两个回调：
 *    - ConfirmCallback：消息有没有到达交换机（ack / nack）
 *    - ReturnsCallback：消息到了交换机、但没有路由到任何队列（需配合 template.mandatory=true）
 */
@Slf4j
@Configuration
@ConditionalOnClass(RabbitTemplate.class)
public class Mqconfig {

    @Bean
    public MessageConverter messageConverter() {
        return new Jackson2JsonMessageConverter();
    }

    /**
     * 用「静态 @Bean 的 BeanPostProcessor」给 RabbitTemplate 挂回调，原因：
     * 1. 静态 @Bean 会在普通 Bean 之前创建，避免配置类被提前实例化、导致 RabbitTemplate 提前创建而错过 MessageConverter；
     * 2. 不依赖具体 Spring Boot 版本的 Customizer 接口（2.7 的 amqp 自动配置里并没有 RabbitTemplateCustomizer），
     *    直接对 RabbitTemplate 实例做后置处理，任何 2.x 版本都适用；
     * 3. 只有真正存在 RabbitTemplate 的地方（引了 amqp 的服务）才会进入 if 分支。
     *
     * <p>注意：这两个回调只有在 yaml 里打开了开关才会触发：
     * <pre>
     * spring.rabbitmq.publisher-confirm-type: correlated   # 打开 confirm（不配则 ack/nack 根本不会回调）
     * spring.rabbitmq.publisher-returns: true              # 打开 return 回调
     * spring.rabbitmq.template.mandatory: true             # 发消息时带 mandatory 标志（不配则路由失败不退回）
     * </pre>
     */
    @Bean
    public static BeanPostProcessor rabbitTemplateCallbackPostProcessor() {
        return new BeanPostProcessor() {
            @Override
            public Object postProcessAfterInitialization(Object bean, String beanName) {
                if (bean instanceof RabbitTemplate) {
                    registerCallbacks((RabbitTemplate) bean);
                }
                return bean;
            }
        };
    }

    /** 给模板挂生产者确认回调 */
    static void registerCallbacks(RabbitTemplate rabbitTemplate) {
        // ① 生产者 → 交换机：Broker 是否接管了这条消息
        rabbitTemplate.setConfirmCallback((correlationData, ack, cause) -> {
            String bizId = bizId(correlationData);
            if (ack) {
                log.debug("[MQ-Confirm] 消息已到达交换机, bizId={}", bizId);
                // TODO 生产级做法：把本地消息表里的这条记录改成「已投递」
            } else {
                log.error("[MQ-Confirm] 消息未到达交换机! bizId={}, cause={}", bizId, cause);
                // TODO 生产级做法：本地消息表标记「投递失败」→ 定时任务重发 + 告警
            }
        });

        // ② 交换机 → 队列：路由不到任何队列时，Broker 会把消息退回来
        rabbitTemplate.setReturnsCallback(returned -> log.error(
                "[MQ-Return] 消息路由失败! replyCode={}, replyText={}, exchange={}, routingKey={}, body={}",
                returned.getReplyCode(),
                returned.getReplyText(),
                returned.getExchange(),
                returned.getRoutingKey(),
                new String(returned.getMessage().getBody(), StandardCharsets.UTF_8)));

        log.info("[MQ] 已为 RabbitTemplate 注册生产者确认回调（confirm + return）");
    }

    /** 取业务标识（发送方用 new CorrelationData(bizId) 传进来，便于定位是哪条业务消息） */
    private static String bizId(CorrelationData correlationData) {
        return correlationData == null ? "N/A" : correlationData.getId();
    }
}
