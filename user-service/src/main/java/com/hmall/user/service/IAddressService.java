package com.hmall.user.service;

import com.baomidou.mybatisplus.extension.service.IService;
import com.hmall.user.domain.dto.AddressDTO;
import com.hmall.user.domain.po.Address;


/**
 * <p>
 *  服务类
 * </p>
 *
 * @author 虎哥
 * @since 2023-05-05
 */
public interface IAddressService extends IService<Address> {

    /** 新增收货地址，返回新地址id */
    Long saveAddress(AddressDTO dto);

    /** 删除收货地址（校验归属） */
    void removeAddress(Long id);
}
