package com.hmall.user.mapper;

import com.baomidou.mybatisplus.core.mapper.BaseMapper;

import com.hmall.user.domain.po.User;
import org.apache.ibatis.annotations.Param;
import org.apache.ibatis.annotations.Update;

/**
 * <p>
 * 用户表 Mapper 接口
 * </p>
 *
 * @author 虎哥
 * @since 2023-05-05
 */
public interface UserMapper extends BaseMapper<User> {

    /**
     * 扣减余额：改成参数占位符 + 余额校验 + 返回影响行数，
     * 这样并发下不会把余额扣成负数（调用方按行数为 0 判断余额不足）。
     */
    @Update("update user set balance = balance - #{totalFee}, update_time = now() " +
            "where id = #{userId} and balance >= #{totalFee}")
    int updateMoney(@Param("userId") Long userId, @Param("totalFee") Integer totalFee);

    /** 直接把余额改成指定值（用户自己在“我的账户”里修改） */
    @Update("update user set balance = #{balance}, update_time = now() where id = #{userId}")
    int updateBalance(@Param("userId") Long userId, @Param("balance") Integer balance);

    /** 充值：在原余额上增加（原子操作） */
    @Update("update user set balance = balance + #{amount}, update_time = now() where id = #{userId}")
    int recharge(@Param("userId") Long userId, @Param("amount") Integer amount);
}
