import { useEffect, useState } from 'react'
import { Button, Card, Descriptions, Result, Space, Spin, Typography } from 'antd'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { queryOrderById } from '../../api'
import type { OrderVO } from '../../api/types'
import { ORDER_STATUS_TEXT } from '../../api/types'
import { fenToYuan } from '../../utils/format'

export default function PaySuccess() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const orderId = params.get('orderId')
  const [order, setOrder] = useState<OrderVO>()
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!orderId) {
      setLoading(false)
      return
    }
    queryOrderById(orderId)
      .then(setOrder)
      .catch(() => setOrder(undefined))
      .finally(() => setLoading(false))
  }, [orderId])

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin />
      </div>
    )
  }

  return (
    <Card style={{ maxWidth: 720, margin: '0 auto' }}>
      <Result
        status="success"
        title="支付成功"
        subTitle="支付结果已通过消息通知交易服务（订单状态可能稍有延迟）"
        extra={[
          <Button type="primary" key="home" onClick={() => navigate('/')}>
            继续购物
          </Button>,
        ]}
      />
      {order ? (
        <Descriptions column={1} size="small" style={{ marginTop: 8 }}>
          <Descriptions.Item label="订单号">{order.id}</Descriptions.Item>
          <Descriptions.Item label="支付金额">
            <span className="price">￥{fenToYuan(order.totalFee)}</span>
          </Descriptions.Item>
          <Descriptions.Item label="订单状态">
            {order.status != null ? ORDER_STATUS_TEXT[order.status] ?? order.status : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="支付时间">{order.payTime ?? '（等待消息处理）'}</Descriptions.Item>
        </Descriptions>
      ) : (
        <Space>
          <Typography.Text type="secondary">未获取到订单信息（orderId 缺失或查询失败）</Typography.Text>
        </Space>
      )}
    </Card>
  )
}
