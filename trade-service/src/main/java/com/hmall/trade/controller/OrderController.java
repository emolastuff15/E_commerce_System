package com.hmall.trade.controller;

import com.hmall.common.domain.PageDTO;
import com.hmall.common.domain.PageQuery;

import com.hmall.api.dto.OrderFormDTO;
import com.hmall.trade.domain.vo.OrderVO;
import com.hmall.trade.service.IOrderService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiOperation;
import io.swagger.annotations.ApiParam;
import lombok.RequiredArgsConstructor;
import org.springframework.web.bind.annotation.*;

@Api(tags = "订单管理接口")
@RestController
@RequestMapping("/orders")
@RequiredArgsConstructor
public class OrderController {
    private final IOrderService orderService;

    @ApiOperation("分页查询我的订单")
    @GetMapping("/page")
    public PageDTO<OrderVO> queryMyOrders(
            PageQuery query,
            @ApiParam("订单状态，1未付款 2已付款 3已发货 4已收货 5已关闭 6已评价；不传为全部")
            @RequestParam(value = "status", required = false) Integer status) {
        return orderService.queryMyOrders(query, status);
    }

    @ApiOperation("根据id查询订单（含明细，只能查自己的）")
    @GetMapping("{id}")
    public OrderVO queryOrderById(@ApiParam("订单id") @PathVariable("id") Long orderId) {
        return orderService.queryMyOrderDetail(orderId);
    }

    @ApiOperation("创建订单")
    @PostMapping
    public Long createOrder(@RequestBody OrderFormDTO orderFormDTO){
        return orderService.createOrder(orderFormDTO);
    }

    @ApiOperation("标记订单已支付")
    @ApiImplicitParam(name = "orderId", value = "订单id", paramType = "path")
    @PutMapping("/{orderId}")
    public void markOrderPaySuccess(@PathVariable("orderId") Long orderId) {
        orderService.markOrderPaySuccess(orderId);
    }
}
