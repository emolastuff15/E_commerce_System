import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Col,
  Empty,
  Form,
  Input,
  InputNumber,
  Pagination,
  Row,
  Space,
  Spin,
  Tag,
  message,
} from 'antd'
import { ShoppingCartOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { addToCart, searchItems } from '../../api'
import { errorMessage } from '../../api/http'
import type { Item, ItemPageQuery } from '../../api/types'
import { isLogin, redirectToLogin } from '../../auth'
import { fenToYuan, parseSpec } from '../../utils/format'

interface SearchForm {
  key?: string
  category?: string
  brand?: string
  minYuan?: number
  maxYuan?: number
}

export default function Search() {
  const navigate = useNavigate()
  const [urlParams] = useSearchParams()
  const [form] = Form.useForm<SearchForm>()
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(12)
  const [loading, setLoading] = useState(false)
  const [query, setQuery] = useState<SearchForm>({})

  // 从地址栏 ?key=xxx 进入时自动带上关键字
  useEffect(() => {
    const key = urlParams.get('key') ?? undefined
    setQuery({ key })
    form.setFieldsValue({ key })
  }, [urlParams, form])

  const load = useCallback(async () => {
    setLoading(true)
    try {
      // 后端价格单位是"分"，输入框按"元"填，这里做转换
      const params: ItemPageQuery = {
        pageNo,
        pageSize,
        key: query.key || undefined,
        category: query.category || undefined,
        brand: query.brand || undefined,
        minPrice: query.minYuan != null ? Math.round(query.minYuan * 100) : undefined,
        maxPrice: query.maxYuan != null ? Math.round(query.maxYuan * 100) : undefined,
      }
      const page = await searchItems(params)
      setItems(page?.list ?? [])
      setTotal(page?.total ?? 0)
    } catch (err) {
      message.error(errorMessage(err, '查询商品失败，请确认网关与 item-service 已启动'))
      setItems([])
      setTotal(0)
    } finally {
      setLoading(false)
    }
  }, [pageNo, pageSize, query])

  useEffect(() => {
    void load()
  }, [load])

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
    } catch (err) {
      message.error(errorMessage(err, '添加购物车失败'))
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Form<SearchForm>
          form={form}
          layout="inline"
          initialValues={{}}
          onFinish={(values) => {
            setPageNo(1)
            setQuery(values)
          }}
        >
          <Form.Item name="key" label="关键字">
            <Input placeholder="商品名称" allowClear style={{ width: 180 }} />
          </Form.Item>
          <Form.Item name="category" label="分类">
            <Input placeholder="如 手机" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="brand" label="品牌">
            <Input placeholder="如 华为" allowClear style={{ width: 140 }} />
          </Form.Item>
          <Form.Item name="minYuan" label="价格(元)">
            <InputNumber min={0} placeholder="最低" style={{ width: 100 }} />
          </Form.Item>
          <Form.Item name="maxYuan" label="-">
            <InputNumber min={0} placeholder="最高" style={{ width: 100 }} />
          </Form.Item>
          <Form.Item>
            <Space>
              <Button type="primary" htmlType="submit">
                搜索
              </Button>
              <Button
                onClick={() => {
                  form.resetFields()
                  setPageNo(1)
                  setQuery({})
                }}
              >
                重置
              </Button>
            </Space>
          </Form.Item>
        </Form>
      </Card>

      <Spin spinning={loading}>
        {items.length === 0 ? (
          <Empty description="没有找到商品" />
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
                      disabled={item.status !== 1 || (item.stock ?? 0) <= 0}
                      onClick={() => handleAddToCart(item)}
                    >
                      加入购物车
                    </Button>,
                  ]}
                >
                  <Card.Meta
                    title={item.name}
                    description={
                      <Space direction="vertical" size={4} style={{ width: '100%' }}>
                        <span className="price">￥{fenToYuan(item.price)}</span>
                        <span className="spec-line">
                          {Object.entries(parseSpec(item.spec))
                            .map(([k, v]) => `${k}:${v}`)
                            .join(' ')}
                        </span>
                        <Space size={4} wrap>
                          <Tag color="red">销量 {item.sold ?? 0}</Tag>
                          <Tag color={(item.stock ?? 0) > 0 ? 'green' : 'default'}>库存 {item.stock ?? 0}</Tag>
                          {item.brand ? <Tag>{item.brand}</Tag> : null}
                        </Space>
                      </Space>
                    }
                  />
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <div style={{ textAlign: 'right' }}>
        <Pagination
          current={pageNo}
          pageSize={pageSize}
          total={total}
          showSizeChanger
          pageSizeOptions={[12, 20, 40]}
          showTotal={(t) => `共 ${t} 件商品`}
          onChange={(page, size) => {
            setPageNo(page)
            setPageSize(size)
          }}
        />
      </div>
    </Space>
  )
}
