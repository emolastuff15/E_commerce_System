/** 价格：后端以"分"存储，展示时转成"元" */
export const fenToYuan = (fen?: number | null): string => {
  if (fen === null || fen === undefined) return '0.00'
  return (fen / 100).toFixed(2)
}

/** 手机号脱敏：13301212233 -> 1330****233 */
export const maskMobile = (mobile?: string): string => {
  if (!mobile || mobile.length < 11) return mobile ?? ''
  return `${mobile.slice(0, 4)}****${mobile.slice(7)}`
}

/** spec 是 JSON 字符串，解析失败时返回空对象 */
export const parseSpec = (spec?: string): Record<string, string> => {
  if (!spec) return {}
  try {
    return JSON.parse(spec) as Record<string, string>
  } catch {
    return {}
  }
}

export const toIntOrDefault = (value: unknown, fallback: number): number => {
  const n = Number(value)
  return Number.isFinite(n) && n > 0 ? Math.floor(n) : fallback
}
