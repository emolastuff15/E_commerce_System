import { useCallback, useEffect, useState } from 'react'
import {
  Button,
  Card,
  Checkbox,
  Col,
  Empty,
  Form,
  Input,
  Modal,
  Popconfirm,
  Row,
  Space,
  Spin,
  Tag,
  Typography,
  message,
} from 'antd'
import { EnvironmentOutlined, PlusOutlined } from '@ant-design/icons'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { deleteMyAddress, findMyAddresses, saveMyAddress } from '../../api'
import { errorMessage } from '../../api/http'
import type { Address, PlaceMeta } from '../../api/types'
import RequireLogin from '../../components/RequireLogin'
import PlacePicker, { type PlaceSelection } from '../../components/PlacePicker'
import { maskMobile } from '../../utils/format'

interface AddressFormValues {
  contact: string
  mobile: string
  province?: string
  city?: string
  town?: string
  street: string
  isDefault?: boolean
}

function AddressBookInner() {
  const navigate = useNavigate()
  const [params] = useSearchParams()
  const fromCheckout = params.get('from') === '/order-confirm'

  const [form] = Form.useForm<AddressFormValues>()
  const [addresses, setAddresses] = useState<Address[]>([])
  const [loading, setLoading] = useState(false)
  const [open, setOpen] = useState(false)
  const [saving, setSaving] = useState(false)
  const [place, setPlace] = useState<PlaceSelection | null>(null)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      setAddresses((await findMyAddresses()) ?? [])
    } catch (err) {
      message.error(errorMessage(err, '查询收货地址失败'))
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const openCreate = () => {
    form.resetFields()
    form.setFieldsValue({ isDefault: false } as AddressFormValues)
    setPlace(null)
    setOpen(true)
  }

  /** Google Maps 选点后自动回填省/市/区/街道 */
  const onPlaceChange = (selection: PlaceSelection) => {
    setPlace(selection)
    form.setFieldsValue({
      province: selection.province ?? form.getFieldValue('province'),
      city: selection.city ?? form.getFieldValue('city'),
      town: selection.town ?? form.getFieldValue('town'),
      street: selection.text ?? form.getFieldValue('street'),
    })
  }

  const submit = async () => {
    const values = await form.validateFields()
    // hmall 的 address 表没有 place_id 字段，把 Google 地点信息存进 notes（JSON）
    const meta: PlaceMeta = {
      placeId: place?.placeId ?? null,
      lat: place?.location?.lat ?? null,
      lng: place?.location?.lng ?? null,
      formattedAddress: place?.text ?? values.street,
    }
    setSaving(true)
    try {
      await saveMyAddress({
        contact: values.contact,
        mobile: values.mobile,
        province: values.province,
        city: values.city,
        town: values.town,
        street: values.street,
        isDefault: values.isDefault ? 1 : 0,
        notes: JSON.stringify(meta),
      })
      message.success('地址已保存')
      setOpen(false)
      await load()
      if (fromCheckout) {
        navigate('/order-confirm')
      }
    } catch (err) {
      message.error(errorMessage(err, '保存地址失败'))
    } finally {
      setSaving(false)
    }
  }

  const remove = async (address: Address) => {
    try {
      await deleteMyAddress(address.id)
      message.success('已删除')
      await load()
    } catch (err) {
      message.error(errorMessage(err, '删除失败'))
    }
  }

  return (
    <Space direction="vertical" size={16} style={{ width: '100%' }}>
      <Space style={{ width: '100%', justifyContent: 'space-between' }}>
        <Typography.Title level={4} style={{ margin: 0 }}>
          收货地址
        </Typography.Title>
        <Space>
          {fromCheckout ? <Button onClick={() => navigate('/order-confirm')}>返回结算</Button> : null}
          <Button type="primary" icon={<PlusOutlined />} onClick={openCreate}>
            新增收货地址
          </Button>
        </Space>
      </Space>

      <Spin spinning={loading}>
        {addresses.length === 0 ? (
          <Empty description="还没有收货地址">
            <Button type="primary" onClick={openCreate}>
              新增收货地址
            </Button>
          </Empty>
        ) : (
          <Row gutter={[16, 16]}>
            {addresses.map((addr) => (
              <Col key={addr.id} xs={24} md={12}>
                <Card
                  title={
                    <Space>
                      <span>{addr.contact}</span>
                      <Typography.Text type="secondary">{maskMobile(addr.mobile)}</Typography.Text>
                      {addr.isDefault === 1 ? <Tag color="red">默认</Tag> : null}
                    </Space>
                  }
                  extra={
                    <Popconfirm title="确认删除该地址？" onConfirm={() => remove(addr)}>
                      <Button type="link" danger>
                        删除
                      </Button>
                    </Popconfirm>
                  }
                >
                  <Space direction="vertical" size={4}>
                    <span>
                      <EnvironmentOutlined /> {addr.province}
                      {addr.city}
                      {addr.town}
                      {addr.street}
                    </span>
                    {addr.notes && addr.notes.startsWith('{') ? (
                      <Typography.Text type="secondary" style={{ fontSize: 12 }}>
                        Place ID：{safePlaceMeta(addr.notes)?.placeId ?? '-'}
                      </Typography.Text>
                    ) : null}
                  </Space>
                </Card>
              </Col>
            ))}
          </Row>
        )}
      </Spin>

      <Modal
        title="新增收货地址"
        open={open}
        width={720}
        onCancel={() => setOpen(false)}
        onOk={submit}
        confirmLoading={saving}
        okText="保存"
        destroyOnClose
      >
        <Space direction="vertical" size={12} style={{ width: '100%' }}>
          <PlacePicker onPlaceChange={onPlaceChange} />
          <Form<AddressFormValues> form={form} layout="vertical">
            <Row gutter={16}>
              <Col span={12}>
                <Form.Item name="contact" label="联系人" rules={[{ required: true, message: '请输入联系人' }]}>
                  <Input placeholder="收件人姓名" />
                </Form.Item>
              </Col>
              <Col span={12}>
                <Form.Item
                  name="mobile"
                  label="手机号"
                  rules={[
                    { required: true, message: '请输入手机号' },
                    { pattern: /^\d{11}$/, message: '请输入 11 位手机号' },
                  ]}
                >
                  <Input placeholder="11 位手机号" maxLength={11} />
                </Form.Item>
              </Col>
            </Row>
            <Row gutter={16}>
              <Col span={8}>
                <Form.Item name="province" label="省">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="city" label="市">
                  <Input />
                </Form.Item>
              </Col>
              <Col span={8}>
                <Form.Item name="town" label="区/县">
                  <Input />
                </Form.Item>
              </Col>
            </Row>
            <Form.Item
              name="street"
              label="详细地址"
              rules={[{ required: true, message: '请在地图上选择地点（或手动填写）' }]}
            >
              <Input.TextArea rows={3} placeholder="在地图上选点后自动填入完整地址，也可以手动修改" />
            </Form.Item>
            <Form.Item name="isDefault" valuePropName="checked">
              <Checkbox>设为默认地址（第一个地址会自动成为默认）</Checkbox>
            </Form.Item>
          </Form>
        </Space>
      </Modal>
    </Space>
  )
}

/** notes 里可能不是 JSON（比如用户手填的备注），解析失败返回 null */
function safePlaceMeta(notes: string): PlaceMeta | null {
  try {
    return JSON.parse(notes) as PlaceMeta
  } catch {
    return null
  }
}

export default function AddressBook() {
  return (
    <RequireLogin>
      <AddressBookInner />
    </RequireLogin>
  )
}
