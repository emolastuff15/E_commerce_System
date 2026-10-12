import { useEffect, useState } from 'react'
import { Button, Card, Carousel, Col, Empty, Row, Skeleton, Space, Tag, Typography, message } from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { Link, useNavigate } from 'react-router-dom'
import { addToCart, searchItems } from '../../api'
import { errorMessage } from '../../api/http'
import type { Item } from '../../api/types'
import { fenToYuan, parseSpec } from '../../utils/format'
import { isLogin, redirectToLogin } from '../../auth'

/** 首页轮播图（图片在 public/banners 下，取自课程前端自带的 banner） */
const BANNERS = [
  {
    src: '/banners/banner1.jpg',
    title: '黑马商城',
    desc: '微服务版 · React + Ant Design 5（网关 → item / cart / trade / user / pay）',
    action: '去逛逛',
    to: '/search',
  },
  {
    src: '/banners/banner2.jpg',
    title: '热门好物',
    desc: '手机 / 家电 / 数码，一键加入购物车',
    action: '立即选购',
    to: '/search',
  },
  {
    src: '/banners/banner3.jpg',
    title: '我的订单',
    desc: '查看订单状态，待付款订单可继续支付',
    action: '查看订单',
    to: '/orders',
  },
  {
    src: '/banners/banner4.jpg',
    title: '账户余额',
    desc: '充值后即可使用余额秒付',
    action: '我的账户',
    to: '/account',
  },
]

export default function Home() {
  const navigate = useNavigate()
  const [items, setItems] = useState<Item[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    // 首页推荐位：取一页商品（后端 /search/list 支持分页）
    searchItems({ pageNo: 1, pageSize: 12 })
      .then((page) => setItems(page?.list ?? []))
      .catch(() => setItems([]))
      .finally(() => setLoading(false))
  }, [])

  const handleAddToCart = async (item: Item) => {
    if (!isLogin()) {
      redirectToLogin()
      return
    }
    try {
      await addToCart({
        itemId: item.id!,
        name: item.name,
        spec: item.spec,
        price: item.price,
        image: item.image,
      })
      message.success('已加入购物车')
      navigate('/cart')
    } catch (err) {
      message.error(errorMessage(err, '添加购物车失败'))
    }
  }

  return (
    <Space direction="vertical" size={24} style={{ width: '100%' }}>
      <Card styles={{ body: { padding: 0, borderRadius: 8, overflow: 'hidden' } }}>
        <Carousel autoplay autoplaySpeed={4000}>
          {BANNERS.map((b) => (
            <div key={b.src}>
              <div
                style={{
                  height: 340,
                  backgroundImage: `url(${b.src})`,
                  backgroundSize: 'cover',
                  backgroundPosition: 'center',
                  position: 'relative',
                }}
              >
                <div
                  style={{
                    position: 'absolute',
                    inset: 0,
                    background: 'linear-gradient(90deg, rgba(0,0,0,.55), rgba(0,0,0,0))',
                    display: 'flex',
                    flexDirection: 'column',
                    justifyContent: 'center',
                    padding: '0 48px',
                  }}
                >
                  <Typography.Title level={2} style={{ color: '#fff', margin: 0 }}>
                    {b.title}
                  </Typography.Title>
                  <Typography.Paragraph style={{ color: '#ffffffd9', marginBottom: 16 }}>
                    {b.desc}
                  </Typography.Paragraph>
                  <div>
                    <Button size="large" type="primary" onClick={() => navigate(b.to)}>
                      {b.action}
                    </Button>
                  </div>
                </div>
              </div>
            </div>
          ))}
        </Carousel>
      </Card>

      <div>
        <Typography.Title level={4}>热门商品</Typography.Title>
        {loading ? (
          <Skeleton active />
        ) : items.length === 0 ? (
          <Empty description="暂无商品数据（确认 item-service 与网关已启动）" />
        ) : (
          <Row gutter={[16, 16]}>
            {items.map((item) => (
              <Col key={item.id} xs={24} sm={12} md={8} lg={6}>
                <Card
                  className="item-card"
                  hoverable
                  cover={
                    item.image ? (
                      <img alt={item.name} src={item.image} />
                    ) : (
                      <div style={{ height: 200, background: '#fafafa' }} />
                    )
                  }
                  actions={[
                    <Button
                      key="add"
                      type="link"
                      icon={<ShoppingCartOutlined />}
                      onClick={() => handleAddToCart(item)}
                    >
                      加入购物车
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={<Link to={`/search?key=${encodeURIComponent(item.name ?? '')}`}>{item.name}</Link>}
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <span className="price">￥{fenToYuan(item.price)}</span>
                        <span className="spec-line">
                          {Object.entries(parseSpec(item.spec))
                            .map(([k, v]) => `${k}:${v}`)
                            .join(' ')}
                        </span>
                        <Space size={4}>
                          <Tag color="red">销量 {item.sold ?? 0}</Tag>
                          <Tag>库存 {item.stock ?? 0}</Tag>
                        </Space>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </div>
    </Space>
  )
}
