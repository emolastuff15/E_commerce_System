import { useEffect, useMemo, useState } from 'react'
import { Alert, Button, Card, Divider, Empty, Radio, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { createOrder, findMyAddresses } from '../../api'
import { errorMessage } from '../../api/http'
import type { Address, CartVO } from '../../api/types'
import { PAY_TYPE } from '../../api/types'
import { SELECTED_CARTS_KEY } from '../../auth'
import RequireLogin from '../../components/RequireLogin'
import { fenToYuan, maskMobile, parseSpec } from '../../utils/format'

function OrderConfirmInner() {
  const navigate = useNavigate()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [addressId, setAddressId] = useState<string>()
  const [paymentType, setPaymentType] = useState<number>(PAY_TYPE.BALANCE)
  const [submitting, setSubmitting] = useState(false)

  // 购物车页选中的商品
  const items = useMemo<CartVO[]>(() => {
    try {
      return JSON.parse(sessionStorage.getItem(SELECTED_CARTS_KEY) ?? '[]') as CartVO[]
    } catch {
      return []
    }
  }, [])

  useEffect(() => {
    if (items.length === 0) {
      message.warning('请先在购物车中选择商品')
      navigate('/cart', { replace: true })
      return
    }
    findMyAddresses()
      .then((list) => {
        const data = list ?? []
        setAddresses(data)
        const preferred = data.find((a) => a.isDefault === 1) ?? data[0]
        if (preferred) setAddressId(preferred.id)
      })
      .catch((err) => message.error(errorMessage(err, '查询收货地址失败')))
  }, [items, navigate])

  const totalFee = items.reduce((sum, i) => sum + (i.newPrice ?? i.price ?? 0) * i.num, 0)

  const submit = async () => {
    if (!addressId) {
      message.warning('请选择收货地址')
      return
    }
    setSubmitting(true)
    try {
      const orderId = await createOrder({
        addressId,
        paymentType,
        details: items.map((i) => ({ itemId: i.itemId, num: i.num })),
      })
      message.success('下单成功')
      navigate(`/pay/${orderId}`)
    } catch (err) {
      message.error(errorMessage(err, '下单失败，请重试'))
    } finally {
      setSubmitting(false)
    }
  }

  const columns: ColumnsType<CartVO> = [
    {
      title: '商品',
      render: (_, item) => (
        <Space>
          {item.image ? (
            <img src={item.image} alt={item.name} style={{ width: 56, height: 56, objectFit: 'contain' }} />
          ) : null}
          <Space direction="vertical" size={2}>
            <span>{item.name}</span>
            <span className="spec-line">
              {Object.entries(parseSpec(item.spec))
                .map(([k, v]) => `${k}:${v}`)
                .join(' ')}
            </span>
          </Space>
        </Space>
      ),
    },
    { title: '单价', width: 120, render: (_, i) => <span className="price">￥{fenToYuan(i.newPrice ?? i.price)}</span> },
    { title: '数量', dataIndex: 'num', width: 80 },
    {
      title: '小计',
      width: 120,
      render: (_, i) => <span className="price">￥{fenToYuan((i.newPrice ?? i.price ?? 0) * i.num)}</span>,
    },
  ]

  if (items.length === 0) {
    return <Empty description="没有待结算的商品" />
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        确认订单
      </Typography.Title>

      <Card
        title="收货地址"
        extra={
          <Button type="link" onClick={() => navigate('/addresses?from=/order-confirm')}>
            新增收货地址
          </Button>
        }
      >
        {addresses.length === 0 ? (
          <Alert
            type="warning"
            showIcon
            message="当前用户没有收货地址"
            description="点右上角「新增收货地址」，用 Google Maps 选点添加一个地址，然后再提交订单。"
            action={
              <Button size="small" type="primary" onClick={() => navigate('/addresses?from=/order-confirm')}>
                去添加
              </Button>
            }
          />
        ) : (
          <Radio.Group value={addressId} onChange={(e) => setAddressId(e.target.value as string)}>
            <Space direction="vertical">
              {addresses.map((addr) => (
                <Radio key={addr.id} value={addr.id}>
                  <Space size={8}>
                    <b>{addr.contact}</b>
                    <span>{maskMobile(addr.mobile)}</span>
                    <span>
                      {addr.province}
                      {addr.city}
                      {addr.town}
                      {addr.street}
                    </span>
                    {addr.isDefault === 1 ? <Typography.Text type="secondary">默认</Typography.Text> : null}
                  </Space>
                </Radio>
              ))}
            </Space>
          </Radio.Group>
        )}
      </Card>

      <Card title="商品清单">
        <Table<CartVO> rowKey="id" columns={columns} dataSource={items} pagination={false} />
        <Divider />
        <div style={{ textAlign: 'right' }}>
          共 <b>{items.length}</b> 件商品，应付金额：<span className="price">￥{fenToYuan(totalFee)}</span>
        </div>
      </Card>

      <Card title="支付方式">
        <Radio.Group value={paymentType} onChange={(e) => setPaymentType(e.target.value as number)}>
          <Space direction="vertical">
            <Radio value={PAY_TYPE.BALANCE}>余额支付（当前 pay-service 只实现了余额支付）</Radio>
            <Radio value={PAY_TYPE.ALI} disabled>
              支付宝（后端暂不支持）
            </Radio>
            <Radio value={PAY_TYPE.WX} disabled>
              微信（后端暂不支持）
            </Radio>
          </Space>
        </Radio.Group>
      </Card>

      <div style={{ textAlign: 'right' }}>
        <Space>
          <Button onClick={() => navigate('/cart')}>返回购物车</Button>
          <Button type="primary" size="large" loading={submitting} disabled={!addressId} onClick={submit}>
            提交订单
          </Button>
        </Space>
      </div>
    </Space>
  )
}

export default function OrderConfirm() {
  return (
    <RequireLogin>
      <OrderConfirmInner />
    </RequireLogin>
  )
}
