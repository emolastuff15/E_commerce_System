import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Descriptions, Input, Space, Spin, Typography, message } from 'antd'
import { useNavigate, useParams } from 'react-router-dom'
import { applyPayOrder, payByBalance, queryMyInfo, queryOrderById, queryPayOrderByBizOrderNo } from '../../api'
import { errorMessage } from '../../api/http'
import type { OrderVO } from '../../api/types'
import { ORDER_STATUS_TEXT } from '../../api/types'
import RequireLogin from '../../components/RequireLogin'
import { fenToYuan } from '../../utils/format'

function PayInner() {
  const { orderId } = useParams<{ orderId: string }>()
  const navigate = useNavigate()
  const [order, setOrder] = useState<OrderVO>()
  const [payOrderNo, setPayOrderNo] = useState<string>()
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(true)
  const [paying, setPaying] = useState(false)
  const [remainTime, setRemainTime] = useState('')
  /** 当前用户余额（支付时会被扣减） */
  const [balance, setBalance] = useState<number>()

  /** 查询订单 + 获取（或创建）支付单 */
  const init = useCallback(async () => {
    if (!orderId) return
    setLoading(true)
    try {
      // 注意：订单 id 是雪花 id（19 位），必须按字符串传递；转 Number 会丢精度导致“订单不存在”
      const detail = await queryOrderById(orderId)
      setOrder(detail)

      // 顺带查一下当前余额，收银台展示（支付成功后会被扣减）
      queryMyInfo()
        .then((info) => setBalance(info.balance))
        .catch(() => undefined)

      // 后端 applyPayOrder 是幂等的：已存在支付单会直接复用
      try {
        const existing = await queryPayOrderByBizOrderNo(orderId)
        if (existing?.id) {
          setPayOrderNo(existing.id)
        }
      } catch {
        // 查询不到支付单（返回空）时忽略，走下面的新建流程
      }

      try {
        const id = await applyPayOrder({
          bizOrderNo: detail.id,
          amount: detail.totalFee ?? 0,
          payType: 5, // 5 = 余额支付
          payChannelCode: 'balance',
          orderInfo: '黑马商城商品',
        })
        // 后端把支付单 id 以纯文本返回，去掉可能存在的引号
        setPayOrderNo(String(id).replace(/"/g, ''))
      } catch (e) {
        // 例如该订单已存在“支付成功/已关闭”的支付单，此时无法重复申请
        const msg = errorMessage(e, '创建支付单失败')
        message.error(msg.includes('Request failed') ? '该订单已有支付记录，无法重复支付' : msg)
      }
    } catch (err) {
      message.error(errorMessage(err, '查询订单失败'))
    } finally {
      setLoading(false)
    }
  }, [orderId])

  useEffect(() => {
    void init()
  }, [init])

  // 支付倒计时：创建订单后 30 分钟（与后端延迟消息的关单时间对应）
  useEffect(() => {
    if (!order?.createTime) return
    const deadline = new Date(order.createTime).getTime() + 30 * 60 * 1000
    const timer = window.setInterval(() => {
      const remain = deadline - Date.now()
      if (remain <= 0) {
        setRemainTime('已超时')
        window.clearInterval(timer)
        return
      }
      const minutes = Math.floor(remain / 60000)
      const seconds = Math.floor((remain % 60000) / 1000)
      setRemainTime(`${minutes} 分 ${seconds} 秒`)
    }, 1000)
    return () => window.clearInterval(timer)
  }, [order?.createTime])

  const handlePay = async () => {
    if (!payOrderNo) {
      message.warning('支付单号为空，请刷新重试')
      return
    }
    if (!password) {
      message.warning('请输入支付密码')
      return
    }
    setPaying(true)
    try {
      await payByBalance(payOrderNo, password)
      message.success('支付成功')
      navigate(`/pay-success?orderId=${orderId}`)
    } catch (err) {
      message.error(errorMessage(err, '支付失败，请重试'))
    } finally {
      setPaying(false)
    }
  }

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: 64 }}>
        <Spin />
      </div>
    )
  }

  if (!order) {
    return <Alert type="error" showIcon message="订单不存在或查询失败" />
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%', maxWidth: 720, margin: '0 auto' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        收银台
      </Typography.Title>

      <Card>
        <Descriptions column={1} size="small">
          <Descriptions.Item label="订单号">{order.id}</Descriptions.Item>
          <Descriptions.Item label="订单状态">
            {order.status != null ? ORDER_STATUS_TEXT[order.status] ?? order.status : '-'}
          </Descriptions.Item>
          <Descriptions.Item label="应付金额">
            <span className="price" style={{ fontSize: 20 }}>
              ￥{fenToYuan(order.totalFee)}
            </span>
          </Descriptions.Item>
          <Descriptions.Item label="我的余额">
            <span className="price">￥{fenToYuan(balance)}</span>
            {balance != null && order.totalFee != null && balance < order.totalFee ? (
              <Typography.Text type="danger" style={{ marginLeft: 8 }}>
                余额不足，
                <Button type="link" size="small" style={{ padding: 0 }} onClick={() => navigate('/account')}>
                  去充值
                </Button>
              </Typography.Text>
            ) : null}
          </Descriptions.Item>
          <Descriptions.Item label="剩余支付时间">{remainTime || '-'}</Descriptions.Item>
        </Descriptions>
      </Card>

      <Card title="余额支付">
        <Space direction="vertical" style={{ width: '100%' }}>
          <Alert
            type="info"
            showIcon
            message="付款会立即从账户余额中扣除；当前只支持余额支付（pay-service 未实现支付宝/微信渠道）"
          />
          <Input.Password
            placeholder="支付密码（就是登录密码）"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            onPressEnter={handlePay}
          />
          <Space>
            <Button type="primary" size="large" loading={paying} disabled={!payOrderNo} onClick={handlePay}>
              立即支付
            </Button>
            <Button onClick={() => navigate('/')}>取消</Button>
          </Space>
        </Space>
      </Card>
    </Space>
  )
}

export default function Pay() {
  return (
    <RequireLogin>
      <PayInner />
    </RequireLogin>
  )
}
