import { useEffect, useState } from 'react'
import { Badge, Button, Dropdown, Input, Layout, Space, Typography, message } from 'antd'
import { ShoppingCartOutlined, UserOutlined } from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { queryMyCarts } from '../api'
import { clearAuth, getUser, isLogin } from '../auth'

const { Header, Content, Footer } = Layout

export default function PortalLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const [cartCount, setCartCount] = useState(0)
  const [keyword, setKeyword] = useState('')
  const user = getUser()
  const logged = isLogin()

  // 顶部购物车角标：登录后查询购物车数量
  useEffect(() => {
    if (!logged) {
      setCartCount(0)
      return
    }
    queryMyCarts()
      .then((carts) => setCartCount(carts?.length ?? 0))
      .catch(() => setCartCount(0))
  }, [logged, location.pathname])

  const onSearch = () => {
    navigate(`/search?key=${encodeURIComponent(keyword)}`)
  }

  const logout = () => {
    clearAuth()
    message.success('已退出登录')
    navigate('/')
  }

  return (
    <Layout style={{ minHeight: '100%' }}>
      <Header style={{ background: '#fff', borderBottom: '1px solid #eee', padding: '0 16px' }}>
        <div className="page-container" style={{ display: 'flex', alignItems: 'center', gap: 24 }}>
          <Link to="/" style={{ fontSize: 20, fontWeight: 700, color: '#e1251b', whiteSpace: 'nowrap' }}>
            黑马商城
          </Link>
          <Input.Search
            placeholder="搜索商品"
            allowClear
            value={keyword}
            onChange={(e) => setKeyword(e.target.value)}
            onSearch={onSearch}
            style={{ maxWidth: 420 }}
          />
          <Space size="large" style={{ marginLeft: 'auto' }}>
            <Link to="/account">我的账户</Link>
            <Link to="/orders">我的订单</Link>
            <Link to="/addresses">收货地址</Link>
            <Link to="/cart">
              <Badge count={cartCount} size="small">
                <Space>
                  <ShoppingCartOutlined />
                  购物车
                </Space>
              </Badge>
            </Link>
            {logged ? (
              <Dropdown
                menu={{
                  items: [
                    { key: 'account', label: '我的账户', onClick: () => navigate('/account') },
                    { key: 'orders', label: '我的订单', onClick: () => navigate('/orders') },
                    { key: 'addresses', label: '收货地址', onClick: () => navigate('/addresses') },
                    { key: 'admin', label: '管理后台', onClick: () => navigate('/admin/items') },
                    { key: 'logout', label: '退出登录', onClick: logout },
                  ],
                }}
              >
                <Space style={{ cursor: 'pointer' }}>
                  <UserOutlined />
                  {user?.username ?? '已登录'}
                </Space>
              </Dropdown>
            ) : (
              <Button type="link" onClick={() => navigate('/login')}>
                登录
              </Button>
            )}
          </Space>
        </div>
      </Header>

      <Content style={{ padding: '24px 0' }}>
        <div className="page-container">
          <Outlet />
        </div>
      </Content>

      <Footer style={{ textAlign: 'center', color: '#999' }}>
        <Typography.Text type="secondary">
          黑马商城 · React + Ant Design 5 版（后端：Spring Cloud 微服务）
        </Typography.Text>
      </Footer>
    </Layout>
  )
}
