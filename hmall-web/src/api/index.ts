import { httpDelete, httpGet, httpPost, httpPut } from './http'
import type {
  Address,
  AddressForm,
  CartForm,
  CartVO,
  Item,
  ItemPageQuery,
  OrderForm,
  OrderVO,
  PageDTO,
  PayApplyForm,
  PayOrderVO,
  UserInfo,
  UserLoginVO,
} from './types'

/* ---------------- 用户 user-service ---------------- */

export const login = (data: { username: string; password: string }) =>
  httpPost<UserLoginVO>('/users/login', data)

export const findMyAddresses = () => httpGet<Address[]>('/addresses')

export const findAddressById = (id: string) => httpGet<Address>(`/addresses/${id}`)

/** 新增收货地址，返回新地址 id（字符串） */
export const saveMyAddress = (form: AddressForm) => httpPost<string>('/addresses', form)

/** 删除收货地址 */
export const deleteMyAddress = (id: string) => httpDelete<void>(`/addresses/${id}`)

/** 查询当前登录用户的账户信息（含余额、状态） */
export const queryMyInfo = () => httpGet<UserInfo>('/users/me')

/** 直接修改余额（单位：分），返回新余额 */
export const setMyBalance = (balance: number) => httpPut<number>(`/users/balance?balance=${balance}`)

/** 充值（在当前余额上增加，单位：分），返回新余额 */
export const rechargeMyBalance = (amount: number) =>
  httpPost<number>(`/users/balance/recharge?amount=${amount}`)

/* ---------------- 商品 item-service ---------------- */

/** 商品分页（管理端用） */
export const pageItems = (query: ItemPageQuery) => httpGet<PageDTO<Item>>('/items/page', query)

/** 商品搜索（用户端用，关键字/分类/品牌/价格区间） */
export const searchItems = (query: ItemPageQuery) => httpGet<PageDTO<Item>>('/search/list', query)

export const queryItemById = (id: string) => httpGet<Item>(`/items/${id}`)

export const saveItem = (item: Item) => httpPost<void>('/items', item)

export const updateItem = (item: Item) => httpPut<void>('/items', item)

export const deleteItem = (id: string) => httpDelete<void>(`/items/${id}`)

/** 上下架：status 1-上架 2-下架 */
export const updateItemStatus = (id: string, status: number) =>
  httpPut<void>(`/items/status/${id}/${status}`)

/* ---------------- 购物车 cart-service ---------------- */

export const addToCart = (form: CartForm) => httpPost<void>('/carts', form)

export const queryMyCarts = () => httpGet<CartVO[]>('/carts')

/** 修改数量（后端 PUT /carts 接收 Cart 实体，只更新非空字段） */
export const updateCartNum = (id: string, num: number) => httpPut<void>('/carts', { id, num })

export const deleteCartItem = (id: string) => httpDelete<void>(`/carts/${id}`)

/* ---------------- 交易 trade-service ---------------- */

/** 下单，返回订单 id（雪花 id，字符串） */
export const createOrder = (form: OrderForm) => httpPost<string>('/orders', form)

export const queryOrderById = (orderId: string) => httpGet<OrderVO>(`/orders/${orderId}`)

/** 分页查询我的订单（可按状态过滤：1待付款 2已付款 3已发货 4已收货 5已关闭 6已评价） */
export const pageMyOrders = (query: { pageNo?: number; pageSize?: number; status?: number }) =>
  httpGet<PageDTO<OrderVO>>('/orders/page', query)

export const markOrderPaid = (orderId: string) => httpPut<void>(`/orders/${orderId}`)

/* ---------------- 支付 pay-service ---------------- */

/** 申请支付单，返回支付单 id（字符串） */
export const applyPayOrder = (form: PayApplyForm) =>
  httpPost<string>('/pay-orders', form, { transformResponse: (data) => data })

/** 余额支付 */
export const payByBalance = (payOrderId: string, pw: string) =>
  httpPost<void>(`/pay-orders/${payOrderId}`, { id: payOrderId, pw })

export const queryPayOrderByBizOrderNo = (orderId: string) =>
  httpGet<PayOrderVO>(`/pay-orders/biz/${orderId}`)

/* ---------------- 管理端：用户分页 ---------------- */

export interface AdminUser {
  id: string
  username: string
  phone?: string
  status?: number
  balance?: number
  createTime?: string
}

/** 注意：当前 user-service 未实现该接口，调用会失败（页面已做友好提示） */
export const pageUsers = (query: { pageNo?: number; pageSize?: number; key?: string }) =>
  httpGet<PageDTO<AdminUser>>('/users/page', query)
