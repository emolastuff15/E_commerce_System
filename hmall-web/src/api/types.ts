/** 与后端 DTO/VO 一一对应的类型定义 */

export interface PageDTO<T> {
  total: number
  pages: number
  list: T[]
}

/** com.hmall.api.dto.ItemDTO */
export interface Item {
  /** 雪花 id：后端以字符串返回，前端必须当字符串用（转 number 会丢精度） */
  id?: string
  name?: string
  /** 价格，单位：分 */
  price?: number
  stock?: number
  image?: string
  category?: string
  brand?: string
  spec?: string
  sold?: number
  commentCount?: number
  isAD?: boolean
  /** 1-正常，2-下架，3-删除 */
  status?: number
}

/** com.hmall.common.domain.PageQuery + item-service 的 ItemPageQuery */
export interface ItemPageQuery {
  pageNo?: number
  pageSize?: number
  sortBy?: string
  isAsc?: boolean
  /** 搜索关键字 */
  key?: string
  category?: string
  brand?: string
  minPrice?: number
  maxPrice?: number
}

/** cart-service 的 CartVO */
export interface CartVO {
  id: string
  itemId: string
  num: number
  name?: string
  spec?: string
  price?: number
  newPrice?: number
  status?: number
  stock?: number
  image?: string
  createTime?: string
}

/** com.hamll.cart.domain.dto.CartFormDTO */
export interface CartForm {
  itemId: string
  name?: string
  spec?: string
  price?: number
  image?: string
}

/** user-service 的 AddressDTO */
export interface Address {
  /** 地址 id（后端以字符串返回） */
  id: string
  province?: string
  city?: string
  town?: string
  mobile?: string
  street?: string
  contact?: string
  /** 1 默认 0 否 */
  isDefault?: number
  notes?: string
}

/** user-service 的 UserLoginVO */
export interface UserLoginVO {
  token: string
  userId: number
  username: string
  balance: number
}

/** user-service 的 UserVO（当前登录用户的账户信息） */
export interface UserInfo {
  id: number
  username?: string
  phone?: string
  /** 余额，单位：分 */
  balance?: number
  /** 0 禁止使用 1 已激活 */
  status?: number
  statusDesc?: string
  createTime?: string
}

/** com.hmall.trade.domain.po.OrderDetail（订单明细/商品快照） */
export interface OrderDetail {
  id?: string
  orderId?: string
  itemId?: string
  num?: number
  name?: string
  spec?: string
  /** 价格，单位：分 */
  price?: number
  image?: string
}

/** 新增收货地址的表单（userId 由后端从登录态取） */
export interface AddressForm {
  contact?: string
  mobile?: string
  province?: string
  city?: string
  town?: string
  street?: string
  /** 1 默认 0 否 */
  isDefault?: number
  /** 备注：本前端把 Google Place ID / 经纬度以 JSON 存在这里（hmall 表无 place_id 字段） */
  notes?: string
}

/** 存在 address.notes 里的 Google 地点元数据 */
export interface PlaceMeta {
  placeId?: string | null
  lat?: number | null
  lng?: number | null
  formattedAddress?: string | null
}

/** trade-service 的 OrderVO */
export interface OrderVO {
  /** 订单 id（雪花 id，后端以字符串返回，前端不要转 number） */
  id: string
  totalFee?: number
  paymentType?: number
  userId?: number
  status?: number
  createTime?: string
  payTime?: string
  consignTime?: string
  endTime?: string
  closeTime?: string
  commentTime?: string
  updateTime?: string
  /** 订单明细（/orders/page 与 /orders/{id} 都会返回） */
  details?: OrderDetail[]
}

/** pay-service 的 PayOrderVO */
export interface PayOrderVO {
  id?: string
  /** 业务订单号：雪花 id，字符串 */
  bizOrderNo?: string
  payOrderNo?: string
  bizUserId?: number
  payChannelCode?: string
  amount?: number
  payType?: number
  /** 0待提交 1待支付 2超时/取消 3成功 */
  status?: number
  paySuccessTime?: string
  payOverTime?: string
  createTime?: string
}

/** POST /orders 的请求体（com.hmall.api.dto.OrderFormDTO） */
export interface OrderForm {
  addressId: string
  paymentType: number
  details: Array<{ itemId: string; num: number }>
}

/** POST /pay-orders 的请求体 */
export interface PayApplyForm {
  /** 业务订单号：雪花 id，必须用字符串传递 */
  bizOrderNo: string
  amount: number
  payType: number
  payChannelCode: string
  orderInfo: string
}

/** 订单状态：1未付款 2已付款 3已发货 4确认收货 5交易取消 6已评价 */
export const ORDER_STATUS_TEXT: Record<number, string> = {
  1: '待付款',
  2: '已付款',
  3: '已发货',
  4: '已收货',
  5: '已关闭',
  6: '已评价',
}

/** 支付方式：1支付宝 2微信 3余额（对应后端的 paymentType / payType） */
export const PAY_TYPE = {
  ALI: 1,
  WX: 2,
  BALANCE: 3,
} as const
