import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Descriptions,
  Divider,
  InputNumber,
  Row,
  Space,
  Spin,
  Statistic,
  Tag,
  Typography,
  message,
} from 'antd'
import { ReloadOutlined, WalletOutlined } from '@ant-design/icons'
import { useNavigate } from 'react-router-dom'
import { queryMyInfo, rechargeMyBalance, setMyBalance } from '../../api'
import { errorMessage } from '../../api/http'
import type { UserInfo } from '../../api/types'
import { getUser, setUser } from '../../auth'
import RequireLogin from '../../components/RequireLogin'
import { fenToYuan } from '../../utils/format'

function AccountInner() {
  const navigate = useNavigate()
  const [info, setInfo] = useState<UserInfo | null>(null)
  const [loading, setLoading] = useState(false)
  const [rechargeYuan, setRechargeYuan] = useState<number>(100)
  const [setYuan, setSetYuan] = useState<number | null>(null)
  const [busy, setBusy] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const data = await queryMyInfo()
      setInfo(data)
      // 同步到本地登录态，顶部/收银台显示的都是最新余额
      const cached = getUser()
      setUser({ ...cached, userId: data.id, username: data.username, balance: data.balance })
    } catch (err) {
      message.error(errorMessage(err, '查询账户信息失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const doRecharge = async () => {
    if (!rechargeYuan || rechargeYuan <= 0) {
      message.warning('请输入大于 0 的充值金额')
      return
    }
    setBusy(true)
    try {
      const balance = await rechargeMyBalance(Math.round(rechargeYuan * 100))
      message.success(`充值成功，当前余额 ￥${fenToYuan(balance)}`)
      await load()
    } catch (err) {
      message.error(errorMessage(err, '充值失败'))
    } finally {
      setBusy(false)
    }
  }

  const doSetBalance = async () => {
    if (setYuan === null || setYuan < 0) {
      message.warning('请输入不小于 0 的余额')
      return
    }
    setBusy(true)
    try {
      const balance = await setMyBalance(Math.round(setYuan * 100))
      message.success(`余额已修改为 ￥${fenToYuan(balance)}`)
      await load()
    } catch (err) {
      message.error(errorMessage(err, '修改余额失败'))
    } finally {
      setBusy(false)
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          我的账户
        </Typography.Title>
        <Button icon={<ReloadOutlined />} onClick={() => void load()} loading={loading}>
          刷新
        </Button>
      </Space>

      <Spin spinning={loading}>
        <Row gutter={[16, 16]}>
          <Col xs={24} md={10}>
            <Card>
              <Statistic
                title="账户余额"
                value={fenToYuan(info?.balance)}
                prefix="￥"
                valueStyle={{ color: '#e1251b' }}
              />
              <Divider />
              <Space>
                <Button type="primary" onClick={() => navigate('/search')}>
                  去购物
                </Button>
                <Button onClick={() => navigate('/orders')}>我的订单</Button>
                <Button onClick={() => navigate('/addresses')}>收货地址</Button>
              </Space>
            </Card>
          </Col>
          <Col xs={24} md={14}>
            <Card title="用户状态">
              <Descriptions column={1} size="small">
                <Descriptions.Item label="用户 ID">{info?.id ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="用户名">{info?.username ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="手机号">{info?.phone ?? '-'}</Descriptions.Item>
                <Descriptions.Item label="账户状态">
                  {info?.status === 1 ? (
                    <Tag color="green">{info.statusDesc ?? '已激活'}</Tag>
                  ) : info?.status === 0 ? (
                    <Tag color="red">{info.statusDesc ?? '禁止使用'}</Tag>
                  ) : (
                    '-'
                  )}
                </Descriptions.Item>
                <Descriptions.Item label="注册时间">
                  {info?.createTime ? String(info.createTime).replace('T', ' ') : '-'}
                </Descriptions.Item>
              </Descriptions>
            </Card>
          </Col>
        </Row>
      </Spin>

      <Row gutter={[16, 16]}>
        <Col xs={24} md={12}>
          <Card title={<><WalletOutlined /> 充值（在现有余额上增加）</>}>
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space wrap>
                {[50, 100, 500, 1000].map((v) => (
                  <Button key={v} onClick={() => setRechargeYuan(v)}>
                    ￥{v}
                  </Button>
                ))}
              </Space>
              <Space>
                <InputNumber
                  min={0.01}
                  step={1}
                  value={rechargeYuan}
                  onChange={(v) => setRechargeYuan(v ?? 0)}
                  addonBefore="￥"
                  style={{ width: 160 }}
                />
                <Button type="primary" loading={busy} onClick={doRecharge}>
                  立即充值
                </Button>
              </Space>
              <Typography.Text type="secondary">充值后可直接用余额支付订单。</Typography.Text>
            </Space>
          </Card>
        </Col>
        <Col xs={24} md={12}>
          <Card title="直接修改余额（练习用）">
            <Space direction="vertical" style={{ width: '100%' }}>
              <Space>
                <InputNumber
                  min={0}
                  step={10}
                  value={setYuan}
                  placeholder={`当前 ${fenToYuan(info?.balance)}`}
                  onChange={(v) => setSetYuan(v ?? null)}
                  addonBefore="￥"
                  style={{ width: 180 }}
                />
                <Button loading={busy} onClick={doSetBalance}>
                  保存
                </Button>
              </Space>
              <Typography.Text type="secondary">
                直接把余额改成输入值（后端 <code>PUT /users/balance</code>）。真实项目里应该只允许充值/退款走账，不开放此接口。
              </Typography.Text>
            </Space>
          </Card>
        </Col>
      </Row>
    </Space>
  )
}

export default function Account() {
  return (
    <RequireLogin>
      <AccountInner />
    </RequireLogin>
  )
}
