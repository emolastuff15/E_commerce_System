package com.hmall.user.service.impl;

import com.baomidou.mybatisplus.extension.service.impl.ServiceImpl;

import com.hmall.common.exception.BadRequestException;
import com.hmall.common.utils.BeanUtils;
import com.hmall.common.utils.UserContext;
import com.hmall.user.domain.dto.AddressDTO;
import com.hmall.user.domain.po.Address;
import com.hmall.user.service.IAddressService;
import org.springframework.stereotype.Service;
import org.springframework.transaction.annotation.Transactional;
import com.hmall.user.mapper.AddressMapper;

/**
 * <p>
 *  服务实现类
 * </p>
 *
 * @author 虎哥
 * @since 2023-05-05
 */
@Service
public class AddressServiceImpl extends ServiceImpl<AddressMapper, Address> implements IAddressService {

    /**
     * 新增收货地址：
     * 1) 强制归属当前登录用户（不信任前端传来的 userId）
     * 2) 第一个地址自动设为默认；显式传 isDefault=1 时清掉旧的默认地址
     */
    @Override
    @Transactional
    public Long saveAddress(AddressDTO dto) {
        Long userId = UserContext.getUser();
        Address address = BeanUtils.copyBean(dto, Address.class);
        // id 必须由数据库生成，避免前端伪造 id 覆盖别人的地址
        address.setId(null);
        address.setUserId(userId);

        long count = lambdaQuery().eq(Address::getUserId, userId).count();
        boolean first = count == 0;
        if (first || Integer.valueOf(1).equals(dto.getIsDefault())) {
            // 清掉该用户其它默认地址
            lambdaUpdate()
                    .set(Address::getIsDefault, 0)
                    .eq(Address::getUserId, userId)
                    .update();
            address.setIsDefault(1);
        } else {
            address.setIsDefault(0);
        }

        save(address);
        return address.getId();
    }

    @Override
    public void removeAddress(Long id) {
        Address address = getById(id);
        if (address == null || !address.getUserId().equals(UserContext.getUser())) {
            throw new BadRequestException("地址不存在或不属于当前用户");
        }
        removeById(id);
    }
}
