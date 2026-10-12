const TOKEN_KEY = 'hmall-token'
const USER_KEY = 'hmall-user'
export const SELECTED_CARTS_KEY = 'hmall-selected-carts'

export interface LoginUser {
  userId?: number
  username?: string
  balance?: number
}

export const getToken = (): string | null => localStorage.getItem(TOKEN_KEY)

export const setToken = (token: string): void => localStorage.setItem(TOKEN_KEY, token)

export const getUser = (): LoginUser | null => {
  const raw = localStorage.getItem(USER_KEY)
  if (!raw) return null
  try {
    return JSON.parse(raw) as LoginUser
  } catch {
    return null
  }
}

export const setUser = (user: LoginUser): void => localStorage.setItem(USER_KEY, JSON.stringify(user))

export const clearAuth = (): void => {
  localStorage.removeItem(TOKEN_KEY)
  localStorage.removeItem(USER_KEY)
  sessionStorage.removeItem(SELECTED_CARTS_KEY)
}

export const isLogin = (): boolean => !!getToken()

/** 未登录时跳登录页，并记住回来时的地址 */
export const redirectToLogin = (): void => {
  const current = window.location.pathname + window.location.search
  if (current.startsWith('/login')) return
  window.location.href = `/login?returnUrl=${encodeURIComponent(current)}`
}
