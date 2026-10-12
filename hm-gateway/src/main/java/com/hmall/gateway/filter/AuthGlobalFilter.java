package com.hmall.gateway.filter;

import cn.hutool.core.text.AntPathMatcher;
import com.hmall.common.exception.UnauthorizedException;
import com.hmall.gateway.config.AuthProperties;
import com.hmall.gateway.util.JwtTool;
import lombok.RequiredArgsConstructor;
import org.springframework.cloud.gateway.filter.GatewayFilterChain;
import org.springframework.cloud.gateway.filter.GlobalFilter;
import org.springframework.core.Ordered;
import org.springframework.core.annotation.Order;
import org.springframework.http.HttpStatus;
import org.springframework.http.server.reactive.ServerHttpRequest;
import org.springframework.http.server.reactive.ServerHttpResponse;
import org.springframework.stereotype.Component;
import org.springframework.web.server.ServerWebExchange;
import reactor.core.publisher.Mono;

import java.util.List;

@Component
@RequiredArgsConstructor
public class AuthGlobalFilter implements GlobalFilter, Ordered {

    private final AuthProperties authProperties;

    private final JwtTool jwtTool;

    private final AntPathMatcher antPathMatcher = new AntPathMatcher();

    @Override
    public Mono<Void> filter(ServerWebExchange exchange, GatewayFilterChain chain) {
        ServerHttpRequest request = exchange.getRequest();
        //校验网址是include还是exclude
        if(isExclude(request.getPath().toString())){
            return chain.filter(exchange);
        }
        //获得请求头并判定不为空
        String token=null;
        List<String> headers = request.getHeaders().get("authorization");
        if(headers !=null && !headers.isEmpty()){
            token=headers.get(0);
        }
        //从请求头获得用户id
        Long userId=null;
        try {
            userId = jwtTool.parseToken(token);
        }catch (UnauthorizedException e){
            ServerHttpResponse response = exchange.getResponse();
            response.setStatusCode(HttpStatus.UNAUTHORIZED);
            return response.setComplete();
        }
        //修改exchange，把用户注入请求头
        String userInfo=userId.toString();
        ServerWebExchange swe= exchange.mutate()
                .request(builder -> builder.header("user-info",userInfo))
                .build();
        return chain.filter(swe);
    }

    private boolean isExclude(String path) {
        for (String Pathpattern : authProperties.getExcludePaths()) {
            if(antPathMatcher.match(Pathpattern,path)){
                return true;
            }

        }
        return false;
    }

    @Override
    public int getOrder() {
        return 0;
    }
}
