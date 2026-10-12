package com.hmall.api.config;

import com.hmall.api.client.fallback.ItemClientFactory;
import com.hmall.api.client.fallback.PayClientFallback;
import com.hmall.common.utils.UserContext;
import feign.Logger;
import feign.RequestInterceptor;
import feign.RequestTemplate;
import org.springframework.context.annotation.Bean;

public class DefaultFeignConfig {
    @Bean
    public Logger.Level fullFeignLoggerLevel(){return Logger.Level.FULL;}

    @Bean
    public RequestInterceptor userInfoInterceptor(){
        return new RequestInterceptor() {
            @Override
            public void apply(RequestTemplate requestTemplate) {
                Long userId=UserContext.getUser();
                if (userId!=null) {
                    requestTemplate.header("user-info", userId.toString());
                }
            }
        };
    }

    @Bean
    public ItemClientFactory itemClientFallbackFactory(){
        return  new ItemClientFactory();
    }

    @Bean
    public PayClientFallback payClientFallback(){
        return new PayClientFallback();
    }
}
