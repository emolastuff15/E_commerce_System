import axios, { type AxiosError, type AxiosRequestConfig } from 'axios'
import { clearAuth, getToken, redirectToLogin } from '../auth'

/**
 * 与旧前端（hmall-portal/js/common.js）保持一致：
 *  - baseURL 为 /api，由 vite 代理去掉 /api 前缀后转发到网关 8080
 *  - 请求头带 authorization（值为登录返回的 JWT）
 *  - 响应拦截器直接返回 response.data（业务层拿到的就是数据本身）
 *  - 401 时清空登录态并跳登录页
 */
const instance = axios.create({
  baseURL: '/api',
  timeout: 10000,
})

instance.interceptors.request.use((config) => {
  const token = getToken()
  if (token) {
    config.headers.set('authorization', token)
  }
  return config
})

instance.interceptors.response.use(
  (response) => response.data,
  (error: AxiosError<{ msg?: string }>) => {
    if (error.response?.status === 401) {
      clearAuth()
      redirectToLogin()
    }
    return Promise.reject(error)
  },
)

/** 从后端错误响应里取出可读信息（CommonExceptionAdvice 返回 { msg }） */
export const errorMessage = (error: unknown, fallback = '请求失败，请稍后重试'): string => {
  const err = error as AxiosError<{ msg?: string }>
  return err?.response?.data?.msg || err?.message || fallback
}

export const httpGet = <T>(url: string, params?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  instance.get(url, { params, ...config }) as unknown as Promise<T>

export const httpPost = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  instance.post(url, data, config) as unknown as Promise<T>

export const httpPut = <T>(url: string, data?: unknown, config?: AxiosRequestConfig): Promise<T> =>
  instance.put(url, data, config) as unknown as Promise<T>

export const httpDelete = <T>(url: string, config?: AxiosRequestConfig): Promise<T> =>
  instance.delete(url, config) as unknown as Promise<T>
