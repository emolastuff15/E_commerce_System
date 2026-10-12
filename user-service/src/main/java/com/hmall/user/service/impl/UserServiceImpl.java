package com.hmall.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;
import com.hmall.common.exception.BadRequestException;
import com.hmall.common.exception.BizIllegalException;
import com.hmall.common.exception.ForbiddenException;
import com.hmall.common.utils.UserContext;
import com.hmall.user.mapper.UserMapper;
import com.hmall.user.config.JwtProperties;
import com.hmall.user.domain.dto.LoginFormDTO;
import com.hmall.user.domain.po.User;
import com.hmall.user.domain.vo.UserLoginVO;
import com.hmall.user.domain.vo.UserVO;
import com.hmall.user.enums.UserStatus;
import com.hmall.user.service.IUserService;
import com.hmall.user.utils.JwtTool;
import lombok.RequiredArgsConstructor;
import lombok.extern.slf4j.Slf4j;
import org.springframework.security.crypto.password.PasswordEncoder;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import org.springframework.util.Assert;

/**
 * <p>
 * 用户表 服务实现类
 * </p>
 *
 * @author 虎哥
 */
@Slf4j
@Service
@RequiredArgsConstructor
public class UserServiceImpl extends ServiceImpl<UserMapper, User> implements IUserService {

    private final PasswordEncoder passwordEncoder;

    private final JwtTool jwtTool;

    private final JwtProperties jwtProperties;

    @Override
    public UserLoginVO login(LoginFormDTO loginDTO) {
        // 1.数据校验
        String username = loginDTO.getUsername();
        String password = loginDTO.getPassword();
        // 2.根据用户名或手机号查询
        User user = lambdaQuery().eq(User::getUsername, username).one();
        Assert.notNull(user, "用户名错误");
        // 3.校验是否禁用
        if (user.getStatus() == UserStatus.FROZEN) {
            throw new ForbiddenException("用户被冻结");
        }
        // 4.校验密码
        if (!passwordEncoder.matches(password, user.getPassword())) {
            throw new BadRequestException("用户名或密码错误");
        }
        // 5.生成TOKEN
        String token = jwtTool.createToken(user.getId(), jwtProperties.getTokenTTL());
        // 6.封装VO返回
        UserLoginVO vo = new UserLoginVO();
        vo.setUserId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setBalance(user.getBalance());
        vo.setToken(token);
        return vo;
    }

    @Override
    public void deductMoney(String pw, Integer totalFee) {
        log.info("开始扣款");
        if (totalFee == null || totalFee <= 0) {
            throw new BizIllegalException("扣款金额必须为正数");
        }
        // 1.校验密码
        Long userId = UserContext.getUser();
        User user = getById(userId);
        if (user == null || !passwordEncoder.matches(pw, user.getPassword())) {
            // 密码错误
            throw new BizIllegalException("用户密码错误");
        }

        // 2.扣款：SQL 里带了 balance >= 金额 的条件，返回 0 行说明余额不足
        int rows = baseMapper.updateMoney(userId, totalFee);
        if (rows == 0) {
            throw new BizIllegalException("余额不足，扣款失败");
        }
        log.info("扣款成功，用户={}，金额={}", userId, totalFee);
    }

    @Override
    public UserVO queryMyInfo() {
        User user = getById(UserContext.getUser());
        if (user == null) {
            throw new BadRequestException("用户不存在");
        }
        UserVO vo = new UserVO();
        vo.setId(user.getId());
        vo.setUsername(user.getUsername());
        vo.setPhone(user.getPhone());
        vo.setBalance(user.getBalance());
        vo.setCreateTime(user.getCreateTime());
        if (user.getStatus() != null) {
            vo.setStatus(user.getStatus().getValue());
            vo.setStatusDesc(user.getStatus().getDesc());
        }
        return vo;
    }

    @Override
    @Transactional
    public Integer updateMyBalance(Integer balance) {
        if (balance == null || balance < 0) {
            throw new BizIllegalException("余额不能为负数");
        }
        Long userId = UserContext.getUser();
        baseMapper.updateBalance(userId, balance);
        log.info("用户 {} 余额被设置为 {}", userId, balance);
        return balance;
    }

    @Override
    @Transactional
    public Integer rechargeMyBalance(Integer amount) {
        if (amount == null || amount == 0) {
            throw new BizIllegalException("充值金额不能为 0");
        }
        Long userId = UserContext.getUser();
        baseMapper.recharge(userId, amount);
        User user = getById(userId);
        Integer newBalance = user == null ? null : user.getBalance();
        log.info("用户 {} 充值 {}，余额变为 {}", userId, amount, newBalance);
        return newBalance;
    }
}
