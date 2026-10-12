import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Descriptions,
  Drawer,
  Empty,
  List,
  Pagination,
  Space,
  Spin,
  Tabs,
  Tag,
  Typography,
  message,
} from 'antd'
import { useNavigate } from 'react-router-dom'
import { pageMyOrders } from '../../api'
import { errorMessage } from '../../api/http'
import type { OrderVO } from '../../api/types'
import { ORDER_STATUS_TEXT } from '../../api/types'
import RequireLogin from '../../components/RequireLogin'
import { fenToYuan } from '../../utils/format'

const STATUS_COLOR: Record<number, string> = {
  1: 'orange',
  2: 'green',
  3: 'blue',
  4: 'cyan',
  5: 'default',
  6: 'purple',
}

const PAYMENT_TYPE_TEXT: Record<number, string> = {
  1: '支付宝',
  2: '微信',
  3: '余额',
}

function OrdersInner() {
  const navigate = useNavigate()
  const [status, setStatus] = useState<number | undefined>(undefined)
  const [orders, setOrders] = useState<OrderVO[]>([])
  const [total, setTotal] = useState(0)
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(5)
  const [loading, setLoading] = useState(false)
  const [detail, setDetail] = useState<OrderVO | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await pageMyOrders({ pageNo, pageSize, status })
      setOrders(page?.list ?? [])
      setTotal(page?.total ?? 0)
    } catch (err) {
      message.error(errorMessage(err, '查询订单失败'))
      setOrders([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [pageNo, pageSize, status])

  useEffect(() => {
    void load()
  }, [load])

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        我的订单
      </Typography.Title>

      <Card>
        <Tabs
          activeKey={status === undefined ? 'all' : String(status)}
          onChange={(key) => {
            setPageNo(1)
            setStatus(key === 'all' ? undefined : Number(key))
          }}
          items={[
            { key: 'all', label: '全部' },
            { key: '1', label: '待付款' },
            { key: '2', label: '已付款' },
            { key: '3', label: '已发货' },
            { key: '4', label: '已收货' },
            { key: '5', label: '已关闭' },
            { key: '6', label: '已评价' },
          ]}
        />

        <Spin spinning={loading}>
          {orders.length === 0 && !loading ? (
            <Empty description="还没有订单">
              <Button type="primary" onClick={() => navigate('/search')}>
                去购物
              </Button>
            </Empty>
          ) : (
            <List<OrderVO>
              dataSource={orders}
              rowKey="id"
              renderItem={(order) => (
                <List.Item key={order.id} style={{ display: 'block' }}>
                  <Card
                    size="small"
                    title={
                      <Space size={12} wrap>
                        <span>订单号：{order.id}</span>
                        <Typography.Text type="secondary">
                          {order.createTime ? String(order.createTime).replace('T', ' ') : ''}
                        </Typography.Text>
                        <Tag color={STATUS_COLOR[order.status ?? 0]}>
                          {order.status != null ? ORDER_STATUS_TEXT[order.status] ?? order.status : '-'}
                        </Tag>
                      </Space>
                    }
                    extra={
                      <Space>
                        {(order.details ?? []).length > 0 ? (
                          <Button type="link" onClick={() => setDetail(order)}>
                            查看明细
                          </Button>
                        ) : null}
                        {order.status === 1 ? (
                          <Button type="primary" size="small" onClick={() => navigate(`/pay/${order.id}`)}>
                            去支付
                          </Button>
                        ) : null}
                      </Space>
                    }
                  >
                    <Space direction="vertical" size={8} style={{ width: '100%' }}>
                      {(order.details ?? []).map((d) => (
                        <Space key={`${order.id}-${d.itemId}`} size={12}>
                          {d.image ? (
                            <img
                              src={d.image}
                              alt={d.name}
                              style={{ width: 48, height: 48, objectFit: 'contain' }}
                            />
                          ) : null}
                          <span>{d.name}</span>
                          <Typography.Text type="secondary">× {d.num}</Typography.Text>
                          <span className="price">￥{fenToYuan(d.price)}</span>
                        </Space>
                      ))}
                      <div style={{ textAlign: 'right' }}>
                        共 {(order.details ?? []).reduce((sum, d) => sum + (d.num ?? 0), 0)} 件，合计{' '}
                        <span className="price">￥{fenToYuan(order.totalFee)}</span>
                      </div>
                    </Space>
                  </Card>
                </List.Item>
              )}
            />
          )}
        </Spin>

        {total > 0 ? (
          <div style={{ textAlign: 'right', marginTop: 16 }}>
            <Pagination
              current={pageNo}
              pageSize={pageSize}
              total={total}
              showSizeChanger
              pageSizeOptions={[5, 10, 20]}
              showTotal={(t) => `共 ${t} 个订单`}
              onChange={(page, size) => {
                setPageNo(page)
                setPageSize(size)
              }}
            />
          </div>
        ) : null}
      </Card>

      <Drawer
        title={detail ? `订单明细 #${detail.id}` : '订单明细'}
        width={520}
        open={!!detail}
        onClose={() => setDetail(null)}
      >
        {detail ? (
          <Space direction="vertical" size={16} style={{ width: '100%' }}>
            <Descriptions column={1} size="small">
              <Descriptions.Item label="订单状态">
                <Tag color={STATUS_COLOR[detail.status ?? 0]}>
                  {detail.status != null ? ORDER_STATUS_TEXT[detail.status] ?? detail.status : '-'}
                </Tag>
              </Descriptions.Item>
              <Descriptions.Item label="支付方式">
                {detail.paymentType != null ? PAYMENT_TYPE_TEXT[detail.paymentType] ?? detail.paymentType : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="订单金额">
                <span className="price">￥{fenToYuan(detail.totalFee)}</span>
              </Descriptions.Item>
              <Descriptions.Item label="下单时间">
                {detail.createTime ? String(detail.createTime).replace('T', ' ') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="支付时间">
                {detail.payTime ? String(detail.payTime).replace('T', ' ') : '-'}
              </Descriptions.Item>
              <Descriptions.Item label="关闭时间">
                {detail.closeTime ? String(detail.closeTime).replace('T', ' ') : '-'}
              </Descriptions.Item>
            </Descriptions>
            <List
              dataSource={detail.details ?? []}
              renderItem={(d) => (
                <List.Item key={`d-${d.itemId}`}>
                  <Space>
                    {d.image ? (
                      <img src={d.image} alt={d.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
                    ) : null}
                    <Space direction="vertical" size={2}>
                      <span>{d.name}</span>
                      <Typography.Text type="secondary">× {d.num}</Typography.Text>
                    </Space>
                  </Space>
                  <span className="price">￥{fenToYuan(d.price)}</span>
                </List.Item>
              )}
            />
          </Space>
        ) : null}
      </Drawer>
    </Space>
  )
}

export default function Orders() {
  return (
    <RequireLogin>
      <OrdersInner />
    </RequireLogin>
  )
}
