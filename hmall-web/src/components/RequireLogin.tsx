import type { ReactElement } from 'react'
import { Navigate, useLocation } from 'react-router-dom'
import { isLogin } from '../auth'

/** 需要登录的页面用它包一层：未登录跳登录页，并带上 returnUrl */
export default function RequireLogin({ children }: { children: ReactElement }) {
  const location = useLocation()
  if (!isLogin()) {
    const returnUrl = encodeURIComponent(location.pathname + location.search)
    return <Navigate to={`/login?returnUrl=${returnUrl}`} replace />
  }
  return children
}
