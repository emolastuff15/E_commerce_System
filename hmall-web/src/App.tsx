import { Navigate, Route, Routes } from 'react-router-dom'
import AdminLayout from './layouts/AdminLayout'
import PortalLayout from './layouts/PortalLayout'
import AdminItems from './pages/admin/AdminItems'
import AdminUsers from './pages/admin/AdminUsers'
import Account from './pages/portal/Account'
import AddressBook from './pages/portal/AddressBook'
import Cart from './pages/portal/Cart'
import Home from './pages/portal/Home'
import Login from './pages/portal/Login'
import OrderConfirm from './pages/portal/OrderConfirm'
import Orders from './pages/portal/Orders'
import Pay from './pages/portal/Pay'
import PaySuccess from './pages/portal/PaySuccess'
import Search from './pages/portal/Search'

export default function App() {
  return (
    <Routes>
      {/* 用户端 */}
      <Route element={<PortalLayout />}>
        <Route path="/" element={<Home />} />
        <Route path="/search" element={<Search />} />
        <Route path="/cart" element={<Cart />} />
        <Route path="/account" element={<Account />} />
        <Route path="/orders" element={<Orders />} />
        <Route path="/addresses" element={<AddressBook />} />
        <Route path="/order-confirm" element={<OrderConfirm />} />
        <Route path="/pay/:orderId" element={<Pay />} />
        <Route path="/pay-success" element={<PaySuccess />} />
      </Route>

      {/* 登录 */}
      <Route path="/login" element={<Login />} />

      {/* 管理端 */}
      <Route path="/admin" element={<AdminLayout />}>
        <Route index element={<Navigate to="/admin/items" replace />} />
        <Route path="items" element={<AdminItems />} />
        <Route path="users" element={<AdminUsers />} />
      </Route>

      <Route path="*" element={<Navigate to="/" replace />} />
    </Routes>
  )
}
