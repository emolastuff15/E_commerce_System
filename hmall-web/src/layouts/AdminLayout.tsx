import { Layout, Menu, Space, Typography } from 'antd'
import { AppstoreOutlined, ShoppingOutlined, TeamOutlined } from '@ant-design/icons'
import { Link, Outlet, useLocation, useNavigate } from 'react-router-dom'
import { clearAuth, getUser } from '../auth'
import RequireLogin from '../components/RequireLogin'

const { Header, Sider, Content } = Layout

export default function AdminLayout() {
  const navigate = useNavigate()
  const location = useLocation()
  const user = getUser()

  const selectedKey = location.pathname.startsWith('/admin/users') ? '/admin/users' : '/admin/items'

  return (
    <RequireLogin>
      <Layout style={{ minHeight: '100%' }}>
        <Header style={{ background: '#001529', display: 'flex', alignItems: 'center', gap: 16 }}>
          <Typography.Title level={4} style={{ color: '#fff', margin: 0 }}>
            黑马商城管理后台
          </Typography.Title>
          <Space style={{ marginLeft: 'auto', color: '#fff' }}>
            <span>{user?.username ?? '管理员'}</span>
            <a
              style={{ color: '#fff' }}
              onClick={() => {
                clearAuth()
                navigate('/login')
              }}
            >
              退出
            </a>
            <Link to="/" style={{ color: '#fff' }}>
              返回商城
            </Link>
          </Space>
        </Header>
        <Layout>
          <Sider width={200} theme="light">
            <Menu
              mode="inline"
              selectedKeys={[selectedKey]}
              style={{ height: '100%' }}
              items={[
                { key: '/admin/items', icon: <ShoppingOutlined />, label: <Link to="/admin/items">商品管理</Link> },
                { key: '/admin/users', icon: <TeamOutlined />, label: <Link to="/admin/users">用户管理</Link> },
              ]}
            />
          </Sider>
          <Content style={{ padding: 24, background: '#f5f5f5' }}>
            <Outlet />
          </Content>
        </Layout>
      </Layout>
    </RequireLogin>
  )
}
