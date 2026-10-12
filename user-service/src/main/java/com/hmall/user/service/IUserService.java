package com.hmall.user.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmall.user.domain.dto.LoginFormDTO;
import com.hmall.user.domain.po.User;
import com.hmall.user.domain.vo.UserLoginVO;
import com.hmall.user.domain.vo.UserVO;


/**
 * <p>
 * 用户表 服务类
 * </p>
 *
 * @author 虎哥
 * @since 2023-05-05
 */
public interface IUserService extends IService<User> {

    UserLoginVO login(LoginFormDTO loginFormDTO);

    void deductMoney(String pw, Integer totalFee);

    /** 查询当前登录用户的账户信息（含余额、状态） */
    UserVO queryMyInfo();

    /** 直接把当前用户余额改成指定值，返回新余额 */
    Integer updateMyBalance(Integer balance);

    /** 给当前用户充值（在原余额上增加），返回新余额 */
    Integer rechargeMyBalance(Integer amount);
}
