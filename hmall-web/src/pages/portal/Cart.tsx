import { useCallback, useEffect, useState } from 'react'
import { Button, Card, Empty, InputNumber, Popconfirm, Space, Table, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { useNavigate } from 'react-router-dom'
import { deleteCartItem, queryMyCarts, updateCartNum } from '../../api'
import { errorMessage } from '../../api/http'
import type { CartVO } from '../../api/types'
import { SELECTED_CARTS_KEY } from '../../auth'
import RequireLogin from '../../components/RequireLogin'
import { fenToYuan, parseSpec } from '../../utils/format'

function CartInner() {
  const navigate = useNavigate()
  const [carts, setCarts] = useState<CartVO[]>([])
  const [selectedIds, setSelectedIds] = useState<string[]>([])
  const [loading, setLoading] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const list = await queryMyCarts()
      const data = list ?? []
      setCarts(data)
      // 默认选中「已上架且库存足够」的商品
      setSelectedIds(data.filter((c) => c.status === 1 && (c.stock ?? 0) >= c.num).map((c) => c.id))
    } catch (err) {
      message.error(errorMessage(err, '查询购物车失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const changeNum = async (cart: CartVO, num: number) => {
    if (num < 1 || num > (cart.stock ?? 1)) {
      message.warning('数量超出库存上限')
      return
    }
    try {
      await updateCartNum(cart.id, num)
      await load()
    } catch (err) {
      message.error(errorMessage(err, '修改数量失败'))
    }
  }

  const remove = async (cart: CartVO) => {
    try {
      await deleteCartItem(cart.id)
      message.success('已删除')
      await load()
    } catch (err) {
      message.error(errorMessage(err, '删除失败'))
    }
  }

  const toOrderConfirm = () => {
    const selected = carts.filter((c) => selectedIds.includes(c.id))
    if (selected.length === 0) {
      message.warning('请至少选择一件商品')
      return
    }
    sessionStorage.setItem(SELECTED_CARTS_KEY, JSON.stringify(selected))
    navigate('/order-confirm')
  }

  const selectedTotal = carts
    .filter((c) => selectedIds.includes(c.id))
    .reduce((sum, c) => sum + (c.newPrice ?? c.price ?? 0) * c.num, 0)

  const columns: ColumnsType<CartVO> = [
    {
      title: '商品',
      dataIndex: 'name',
      render: (_, cart) => (
        <Space>
          {cart.image ? (
            <img src={cart.image} alt={cart.name} style={{ width: 64, height: 64, objectFit: 'contain' }} />
          ) : null}
          <Space direction="vertical" size={2}>
            <span>{cart.name}</span>
            <span className="spec-line">
              {Object.entries(parseSpec(cart.spec))
                .map(([k, v]) => `${k}:${v}`)
                .join(' ')}
            </span>
          </Space>
        </Space>
      ),
    },
    {
      title: '单价',
      dataIndex: 'price',
      width: 120,
      render: (_, cart) => <span className="price">￥{fenToYuan(cart.newPrice ?? cart.price)}</span>,
    },
    {
      title: '数量',
      dataIndex: 'num',
      width: 160,
      render: (_, cart) => (
        <InputNumber
          min={1}
          max={cart.stock ?? 99}
          value={cart.num}
          onChange={(value) => value != null && changeNum(cart, value)}
        />
      ),
    },
    {
      title: '库存',
      dataIndex: 'stock',
      width: 90,
      render: (_, cart) => cart.stock ?? '-',
    },
    {
      title: '小计',
      width: 120,
      render: (_, cart) => (
        <span className="price">￥{fenToYuan((cart.newPrice ?? cart.price ?? 0) * cart.num)}</span>
      ),
    },
    {
      title: '操作',
      width: 90,
      render: (_, cart) => (
        <Popconfirm title="确认删除该商品？" onConfirm={() => remove(cart)}>
          <Button type="link" danger>
            删除
          </Button>
        </Popconfirm>
      ),
    },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Typography.Title level={4} style={{ margin: 0 }}>
        我的购物车
      </Typography.Title>
      <Card>
        {carts.length === 0 && !loading ? (
          <Empty description="购物车是空的">
            <Button type="primary" onClick={() => navigate('/search')}>
              去逛逛
            </Button>
          </Empty>
        ) : (
          <Table<CartVO>
            rowKey="id"
            loading={loading}
            columns={columns}
            dataSource={carts}
            pagination={false}
            rowSelection={{
              selectedRowKeys: selectedIds,
              onChange: (keys) => setSelectedIds(keys as string[]),
              getCheckboxProps: (cart) => ({
                disabled: cart.status !== 1 || (cart.stock ?? 0) < cart.num,
              }),
            }}
          />
        )}
      </Card>

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Typography.Text>
            已选 <b>{selectedIds.length}</b> 件，合计 <span className="price">￥{fenToYuan(selectedTotal)}</span>
          </Typography.Text>
          <Button type="primary" size="large" disabled={selectedIds.length === 0} onClick={toOrderConfirm}>
            去结算
          </Button>
        </Space>
      </Card>
    </Space>
  )
}

export default function Cart() {
  return (
    <RequireLogin>
      <CartInner />
    </RequireLogin>
  )
}
