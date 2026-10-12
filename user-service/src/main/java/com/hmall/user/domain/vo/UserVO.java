package com.hmall.user.domain.vo;

import io.swagger.annotations.ApiModel;
import io.swagger.annotations.ApiModelProperty;
import lombok.Data;

import java.time.LocalDateTime;

/**
 * 当前登录用户的账户信息（不含密码）
 */
@Data
@ApiModel(description = "用户账户信息")
public class UserVO {
    @ApiModelProperty("用户id")
    private Long id;
    @ApiModelProperty("用户名")
    private String username;
    @ApiModelProperty("注册手机号")
    private String phone;
    @ApiModelProperty("账户余额，单位：分")
    private Integer balance;
    @ApiModelProperty("使用状态 0禁止使用 1已激活")
    private Integer status;
    @ApiModelProperty("状态说明")
    private String statusDesc;
    @ApiModelProperty("注册时间")
    private LocalDateTime createTime;
}
