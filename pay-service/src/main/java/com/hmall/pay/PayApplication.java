package com.hmall.pay;

import com.hmall.api.client.CartClient;
import com.hmall.api.client.ItemClient;
import com.hmall.api.client.TradeClient;
import com.hmall.api.client.UserClient;
import com.hmall.api.config.DefaultFeignConfig;
import org.mybatis.spring.annotation.MapperScan;
import org.springframework.boot.SpringApplication;
import org.springframework.boot.autoconfigure.SpringBootApplication;
import org.springframework.cloud.openfeign.EnableFeignClients;
import org.springframework.context.annotation.Bean;
import org.springframework.web.client.RestTemplate;

@MapperScan("com.hmall.pay.mapper")
@SpringBootApplication
@EnableFeignClients(clients = {ItemClient.class, CartClient.class, UserClient.class, TradeClient.class}, defaultConfiguration = DefaultFeignConfig.class)
public class PayApplication {
    public static void main(String[] args) {

        SpringApplication.run(PayApplication.class, args);
    }

    @Bean
    public RestTemplate restTemplate(){
        return new RestTemplate();
    }
}