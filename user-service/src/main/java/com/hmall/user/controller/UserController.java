package com.hmall.user.controller;


import com.hmall.user.domain.dto.LoginFormDTO;
import com.hmall.user.domain.vo.UserLoginVO;
import com.hmall.user.domain.vo.UserVO;
import com.hmall.user.service.IUserService;
import io.swagger.annotations.Api;
import io.swagger.annotations.ApiImplicitParam;
import io.swagger.annotations.ApiImplicitParams;
import io.swagger.annotations.ApiOperation;
import lombok.RequiredArgsConstructor;
import org.springframework.validation.annotation.Validated;
import org.springframework.web.bind.annotation.*;

@Api(tags = "用户相关接口")
@RestController
@RequestMapping("/users")
@RequiredArgsConstructor
public class UserController {

    private final IUserService userService;

    @ApiOperation("用户登录接口")
    @PostMapping("login")
    public UserLoginVO login(@RequestBody @Validated LoginFormDTO loginFormDTO){
        return userService.login(loginFormDTO);
    }

    @ApiOperation("查询当前登录用户的账户信息（含余额、状态）")
    @GetMapping("/me")
    public UserVO queryMyInfo() {
        return userService.queryMyInfo();
    }

    @ApiOperation("修改当前用户余额（直接设置）")
    @ApiImplicitParam(name = "balance", value = "要设置的余额，单位：分")
    @PutMapping("/balance")
    public Integer updateMyBalance(@RequestParam("balance") Integer balance) {
        return userService.updateMyBalance(balance);
    }

    @ApiOperation("充值（在当前余额上增加）")
    @ApiImplicitParam(name = "amount", value = "充值金额，单位：分")
    @PostMapping("/balance/recharge")
    public Integer rechargeMyBalance(@RequestParam("amount") Integer amount) {
        return userService.rechargeMyBalance(amount);
    }

    @ApiOperation("扣减余额（支付时由 pay-service 调用）")
    @ApiImplicitParams({
            @ApiImplicitParam(name = "pw", value = "支付密码"),
            @ApiImplicitParam(name = "amount", value = "支付金额")
    })
    @PutMapping("/money/deduct")
    public void deductMoney(@RequestParam("pw") String pw,@RequestParam("amount") Integer amount){
        userService.deductMoney(pw, amount);
    }
}
