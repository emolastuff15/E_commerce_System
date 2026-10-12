import { useState } from 'react'
import { Button, Card, Form, Input, Typography, message } from 'antd'
import { LockOutlined, UserOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { login } from '../../api'
import { errorMessage } from '../../api/http'
import { setToken, setUser } from '../../auth'

interface LoginForm {
  username: string
  password: string
}

export default function Login() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const [loading, setLoading] = useState(false)

  const onFinish = async (values: LoginForm) => {
    setLoading(true)
    try {
      const resp = await login(values)
      setToken(resp.token)
      setUser({ userId: resp.userId, username: resp.username, balance: resp.balance })
      message.success(`欢迎回来，${resp.username}`)
      const returnUrl = params.get('returnUrl')
      navigate(returnUrl ? decodeURIComponent(returnUrl) : '/', { replace: true })
    } catch (err) {
      message.error(errorMessage(err, '登录失败，请检查用户名或密码'))
    } finally {
      setLoading(false)
    }
  }

  return (
    <div
      style={{
        minHeight: '100%',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        background: 'linear-gradient(135deg,#e1251b22,#ffffff)',
      }}
    >
      <Card style={{ width: 380 }} title="黑马商城 · 登录">
        <Form<LoginForm>
          layout="vertical"
          initialValues={{ username: 'Jack', password: '123' }}
          onFinish={onFinish}
        >
          <Form.Item name="username" label="用户名" rules={[{ required: true, message: '请输入用户名' }]}>
            <Input prefix={<UserOutlined />} placeholder="Jack" autoComplete="username" />
          </Form.Item>
          <Form.Item name="password" label="密码" rules={[{ required: true, message: '请输入密码' }]}>
            <Input.Password prefix={<LockOutlined />} placeholder="123" autoComplete="current-password" />
          </Form.Item>
          <Button type="primary" htmlType="submit" block loading={loading}>
            登录
          </Button>
        </Form>
        <Typography.Paragraph type="secondary" style={{ marginTop: 16, marginBottom: 0, fontSize: 12 }}>
          测试账号：Jack / 123（还有 Rose、Hope，密码相同）
        </Typography.Paragraph>
      </Card>
    </div>
  )
}
