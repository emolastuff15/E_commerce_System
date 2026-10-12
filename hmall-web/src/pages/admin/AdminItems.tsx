import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Form,
  Input,
  InputNumber,
  Modal,
  Popconfirm,
  Select,
  Space,
  Table,
  Tag,
  Typography,
  message,
} from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { deleteItem, pageItems, saveItem, updateItem, updateItemStatus } from '../../api'
import { errorMessage } from '../../api/http'
import type { Item } from '../../api/types'
import { fenToYuan } from '../../utils/format'

interface ItemFormValues {
  id?: string
  name: string
  category?: string
  brand?: string
  priceYuan: number
  stock: number
  image?: string
  spec?: string
  status: number
}

export default function AdminItems() {
  const [form] = Form.useForm<ItemFormValues>()
  const [items, setItems] = useState<Item[]>([])
  const [total, setTotal] = useState(0)
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [modalOpen, setModalOpen] = useState(false)
  const [editing, setEditing] = useState<Item | null>(null)
  const [saving, setSaving] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await pageItems({ pageNo, pageSize, key: keyword || undefined })
      setItems(page?.list ?? [])
      setTotal(page?.total ?? 0)
    } catch (err) {
      message.error(errorMessage(err, '查询商品失败'))
    } finally {
      setLoading(false)
    }
  }, [pageNo, pageSize, keyword])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    setEditing(null)
    form.resetFields()
    form.setFieldsValue({ status: 1, stock: 1, priceYuan: 1 })
    setModalOpen(true)
  }

  const openEdit = (item: Item) => {
    setEditing(item)
    form.setFieldsValue({
      id: item.id,
      name: item.name ?? '',
      category: item.category,
      brand: item.brand,
      priceYuan: (item.price ?? 0) / 100,
      stock: item.stock ?? 0,
      image: item.image,
      spec: item.spec,
      status: item.status ?? 1,
    })
    setModalOpen(true)
  }

  const submit = async () => {
    const values = await form.validateFields()
    setSaving(true)
    try {
      const payload: Item = {
        id: editing?.id,
        name: values.name,
        category: values.category,
        brand: values.brand,
        // 页面按"元"填写，提交前转成"分"
        price: Math.round(values.priceYuan * 100),
        stock: values.stock,
        image: values.image,
        spec: values.spec,
        status: values.status,
        sold: editing?.sold ?? 0,
        commentCount: editing?.commentCount ?? 0,
      }
      if (editing?.id) {
        await updateItem(payload)
        message.success('修改成功')
      } else {
        await saveItem(payload)
        message.success('新增成功')
      }
      setModalOpen(false)
      await load()
    } catch (err) {
      message.error(errorMessage(err, '保存失败'))
    } finally {
      setSaving(false)
    }
  }

  const toggleStatus = async (item: Item) => {
    const next = item.status === 1 ? 2 : 1
    try {
      await updateItemStatus(item.id!, next)
      message.success(next === 1 ? '已上架' : '已下架')
      await load()
    } catch (err) {
      message.error(errorMessage(err, '修改状态失败'))
    }
  }

  const remove = async (item: Item) => {
    try {
      await deleteItem(item.id!)
      message.success('删除成功')
      await load()
    } catch (err) {
      message.error(errorMessage(err, '删除失败'))
    }
  }

  const columns: ColumnsType<Item> = [
    { title: 'ID', dataIndex: 'id', width: 180 },
    {
      title: '商品',
      dataIndex: 'name',
      render: (_, item) => (
        <Space>
          {item.image ? (
            <img src={item.image} alt={item.name} style={{ width: 48, height: 48, objectFit: 'contain' }} />
          ) : null}
          <span>{item.name}</span>
        </Space>
      ),
    },
    { title: '分类', dataIndex: 'category', width: 110 },
    { title: '品牌', dataIndex: 'brand', width: 110 },
    {
      title: '价格',
      dataIndex: 'price',
      width: 110,
      render: (_, item) => <span className="price">￥{fenToYuan(item.price)}</span>,
    },
    { title: '库存', dataIndex: 'stock', width: 90 },
    { title: '销量', dataIndex: 'sold', width: 90 },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status?: number) =>
        status === 1 ? <Tag color="green">上架</Tag> : status === 2 ? <Tag>下架</Tag> : <Tag color="red">删除</Tag>,
    },
    {
      title: '操作',
      width: 210,
      render: (_, item) => (
        <Space>
          <Button type="link" onClick={() => openEdit(item)}>
            编辑
          </Button>
          <Button type="link" onClick={() => toggleStatus(item)}>
            {item.status === 1 ? '下架' : '上架'}
          </Button>
          <Popconfirm title="确认删除该商品？" onConfirm={() => remove(item)}>
            <Button type="link" danger>
              删除
            </Button>
          </Popconfirm>
        </Space>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Space>
            <Input.Search
              placeholder="商品名称关键字"
              allowClear
              style={{ width: 240 }}
              onSearch={(value) => {
                setPageNo(1)
                setKeyword(value)
              }}
            />
            <Button onClick={() => void load()}>刷新</Button>
          </Space>
          <Button type="primary" onClick={openCreate}>
            新增商品
          </Button>
        </Space>
      </Card>

      <Card>
        <Table<Item>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={items}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showSizeChanger: true,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => {
              setPageNo(page)
              setPageSize(size)
            },
          }}
        />
      </Card>

      <Modal
        title={editing ? `编辑商品 #${editing.id}` : '新增商品'}
        open={modalOpen}
        onCancel={() => setModalOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        destroyOnClose
        width={560}
      >
        <Form<ItemFormValues> form={form} layout="vertical">
          <Form.Item name="name" label="商品名称" rules={[{ required: true, message: '请输入商品名称' }]}>
            <Input />
          </Form.Item>
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="priceYuan" label="价格（元）" rules={[{ required: true, message: '请输入价格' }]}>
              <InputNumber min={0.01} step={0.01} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="stock" label="库存" rules={[{ required: true, message: '请输入库存' }]}>
              <InputNumber min={0} style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="status" label="状态" rules={[{ required: true }]}>
              <Select
                style={{ width: 140 }}
                options={[
                  { value: 1, label: '上架' },
                  { value: 2, label: '下架' },
                ]}
              />
            </Form.Item>
          </Space>
          <Space size={16} style={{ display: 'flex' }}>
            <Form.Item name="category" label="分类">
              <Input style={{ width: 160 }} />
            </Form.Item>
            <Form.Item name="brand" label="品牌">
              <Input style={{ width: 160 }} />
            </Form.Item>
          </Space>
          <Form.Item name="image" label="图片地址">
            <Input placeholder="http://... 或 /img/xxx.png" />
          </Form.Item>
          <Form.Item name="spec" label="规格（JSON 字符串）">
            <Input placeholder='{"颜色":"黑","内存":"8G"}' />
          </Form.Item>
        </Form>
      </Modal>

      <Typography.Text type="secondary">
        接口：<code>GET /items/page</code>、<code>POST /items</code>、<code>PUT /items</code>、
        <code>PUT /items/status/&#123;id&#125;/&#123;status&#125;</code>、<code>DELETE /items/&#123;id&#125;</code>
      </Typography.Text>
    </Space>
  )
}
