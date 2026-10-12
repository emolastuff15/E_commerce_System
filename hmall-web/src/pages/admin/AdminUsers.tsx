import { useCallback, useEffect, useState } from 'react'
import { Alert, Button, Card, Input, Space, Table, Tag, Typography, message } from 'antd'
import type { ColumnsType } from 'antd/es/table'
import { pageUsers, type AdminUser } from '../../api'
import { errorMessage } from '../../api/http'
import { fenToYuan } from '../../utils/format'

export default function AdminUsers() {
  const [users, setUsers] = useState<AdminUser[]>([])
  const [total, setTotal] = useState(0)
  const [pageNo, setPageNo] = useState(1)
  const [pageSize, setPageSize] = useState(10)
  const [keyword, setKeyword] = useState('')
  const [loading, setLoading] = useState(false)
  const [apiMissing, setApiMissing] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const page = await pageUsers({ pageNo, pageSize, key: keyword || undefined })
      setUsers(page?.list ?? [])
      setTotal(page?.total ?? 0)
      setApiMissing(false)
    } catch (err) {
      setUsers([])
      setTotal(0)
      setApiMissing(true)
      message.error(errorMessage(err, '查询用户失败'))
    } finally {
      setLoading(false)
    }
  }, [pageNo, pageSize, keyword])

  useEffect(() => {
    void load()
  }, [load])

  const columns: ColumnsType<AdminUser> = [
    { title: 'ID', dataIndex: 'id', width: 220 },
    { title: '用户名', dataIndex: 'username' },
    { title: '手机号', dataIndex: 'phone' },
    {
      title: '余额',
      dataIndex: 'balance',
      width: 140,
      render: (value?: number) => <span className="price">￥{fenToYuan(value)}</span>,
    },
    {
      title: '状态',
      dataIndex: 'status',
      width: 100,
      render: (status?: number) => (status === 1 ? <Tag color="green">正常</Tag> : <Tag>禁用</Tag>),
    },
    { title: '注册时间', dataIndex: 'createTime', width: 200 },
  ]

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      {apiMissing ? (
        <Alert
          type="warning"
          showIcon
          message="后端暂未提供该接口"
          description={
            <span>
              当前 <code>user-service</code> 只实现了 <code>POST /users/login</code>、
              <code>PUT /users/money/deduct</code>、<code>GET /addresses</code>，
              并没有 <code>GET /users/page</code>，所以这里查询会失败。
              想看到数据需要先在 user-service 里补一个分页接口（可直接用 MyBatis-Plus 的 <code>page()</code>）。
            </span>
          }
        />
      ) : null}

      <Card>
        <Space style={{ width: '100%', justifyContent: 'space-between' }}>
          <Input.Search
            placeholder="用户名关键字"
            allowClear
            style={{ width: 240 }}
            onSearch={(value) => {
              setPageNo(1)
              setKeyword(value)
            }}
          />
          <Button onClick={() => void load()}>刷新</Button>
        </Space>
      </Card>

      <Card>
        <Table<AdminUser>
          rowKey="id"
          loading={loading}
          columns={columns}
          dataSource={users}
          pagination={{
            current: pageNo,
            pageSize,
            total,
            showTotal: (t) => `共 ${t} 条`,
            onChange: (page, size) => {
              setPageNo(page)
              setPageSize(size)
            },
          }}
        />
      </Card>

      <Typography.Text type="secondary">
        旧版 <code>hmall-admin/users.html</code> 用的就是这个接口，所以它在课程原版里同样是查不出数据的。
      </Typography.Text>
    </Space>
  )
}
