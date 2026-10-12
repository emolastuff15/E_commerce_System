import { useEffect, useRef, useState } from 'react'
import { Alert, Space, Tag, Typography } from 'antd'
import { EnvironmentOutlined } from '@ant-design/icons'

/**
 * Google Maps 选点组件（技术方案与 sky-web 的 PlacePicker 保持一致）
 *  - 通过 Maps JavaScript API 的 importLibrary 动态加载 maps / marker / places
 *  - 用 PlaceAutocompleteElement（Web Component）做地点联想
 *  - 选中后取到 Place ID、格式化地址、经纬度、地址组成（省/市/区/街道）
 *  - 地图上用 AdvancedMarkerElement 标记（需要 mapId，这里用 'DEMO_MAP_ID'）
 *
 * API Key 配置在 hmall-web/.env：VITE_GOOGLE_MAPS_API_KEY=...
 * 需要开启：Maps JavaScript API、Places API (New)
 */
const MAPS_API_KEY = (import.meta.env.VITE_GOOGLE_MAPS_API_KEY as string | undefined) || ''

export interface PlaceSelection {
  /** Google Place ID */
  placeId: string | null
  /** 格式化后的完整地址 */
  text: string | null
  /** 经纬度 */
  location: { lat: number; lng: number } | null
  /** 从 addressComponents 解析出来的行政区划 */
  province?: string
  city?: string
  town?: string
  street?: string
}

/** 全局只加载一次 Google Maps JS API */
function loadGoogleMaps(apiKey: string): Promise<any> {
  const w = window as any
  if (w.__hmallMapsLoading) return w.__hmallMapsLoading

  w.__hmallMapsLoading = new Promise((resolve, reject) => {
    if (w.google?.maps?.importLibrary) {
      resolve(w.google)
      return
    }
    if (!apiKey) {
      reject(new Error('未配置 Google Maps API Key（VITE_GOOGLE_MAPS_API_KEY）'))
      return
    }
    w.google = w.google || {}
    w.google.maps = w.google.maps || {}
    w.google.maps.__ib__ = () => resolve(w.google)

    const params = new URLSearchParams({
      key: apiKey,
      v: 'weekly',
      libraries: 'maps,marker,places',
      callback: 'google.maps.__ib__',
      language: 'zh-CN',
    })
    const script = document.createElement('script')
    script.src = `https://maps.googleapis.com/maps/api/js?${params.toString()}`
    script.async = true
    script.onerror = () => reject(new Error('Google Maps JS API 加载失败（检查网络 / API Key 限制）'))
    document.head.appendChild(script)
  })
  return w.__hmallMapsLoading
}

/** 从 addressComponents 里按类型取值（省 / 市 / 区 / 街道） */
function pickComponent(components: any[], type: string): string | undefined {
  const hit = components?.find((c: any) => (c.types ?? []).includes(type))
  return hit?.longText ?? hit?.shortText ?? undefined
}

interface Props {
  /** 选中地点后回调 */
  onPlaceChange?: (selection: PlaceSelection) => void
  /** 地图高度 */
  height?: number
}

export default function PlacePicker({ onPlaceChange, height = 300 }: Props) {
  const mapRef = useRef<HTMLDivElement>(null)
  const inputRef = useRef<HTMLDivElement>(null)
  const markerRef = useRef<any>(null)
  const [error, setError] = useState<string | null>(null)
  const [place, setPlace] = useState<PlaceSelection>({ placeId: null, text: null, location: null })

  useEffect(() => {
    let disposed = false

    async function setup() {
      try {
        const google = await loadGoogleMaps(MAPS_API_KEY)
        if (disposed || !mapRef.current || !inputRef.current) return

        const [{ Map }, { AdvancedMarkerElement }, { PlaceAutocompleteElement }] = await Promise.all([
          google.maps.importLibrary('maps'),
          google.maps.importLibrary('marker'),
          google.maps.importLibrary('places'),
        ])
        if (disposed) return

        const map = new Map(mapRef.current, {
          center: { lat: 39.9042, lng: 116.4074 },
          zoom: 11,
          mapId: 'DEMO_MAP_ID', // AdvancedMarkerElement 需要 mapId
        })

        // StrictMode 下 effect 会跑两次，避免重复挂载联想输入框
        if (inputRef.current.childElementCount === 0) {
          const autocomplete = new PlaceAutocompleteElement({ name: 'place_location' })
          inputRef.current.appendChild(autocomplete)

          autocomplete.addEventListener('gmp-select', async (event: any) => {
            const prediction = event.placePrediction
            const placeId: string | null = prediction?.placeId ?? null
            const p = prediction.toPlace()
            // 比 sky-web 多取 addressComponents，便于自动填省/市/区/街道
            await p.fetchFields({ fields: ['location', 'addressComponents', 'formattedAddress'] })

            const components = p.addressComponents ?? []
            const location = p.location ? { lat: p.location.lat(), lng: p.location.lng() } : null
            const selection: PlaceSelection = {
              placeId,
              text: p.formattedAddress ?? prediction?.text?.text ?? null,
              location,
              province: pickComponent(components, 'administrative_area_level_1'),
              city: pickComponent(components, 'locality') ?? pickComponent(components, 'administrative_area_level_2'),
              town:
                pickComponent(components, 'sublocality_level_1') ??
                pickComponent(components, 'administrative_area_level_3'),
              street:
                [pickComponent(components, 'route'), pickComponent(components, 'street_number')]
                  .filter(Boolean)
                  .join(' ') || undefined,
            }
            setPlace(selection)
            onPlaceChange?.(selection)

            if (location) {
              if (markerRef.current) {
                markerRef.current.position = location
              } else {
                markerRef.current = new AdvancedMarkerElement({ map, position: location })
              }
              map.setCenter(location)
              map.setZoom(16)
            }
          })
        }
      } catch (e: any) {
        if (!disposed) setError(e?.message ?? String(e))
      }
    }

    void setup()
    return () => {
      disposed = true
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return (
    <div>
      {error && (
        <Alert
          type="warning"
          showIcon
          style={{ marginBottom: 12 }}
          message="地图组件未能加载"
          description={
            <span>
              {error}
              <br />
              请在 <code>hmall-web/.env</code> 配置 <code>VITE_GOOGLE_MAPS_API_KEY</code>
              （需开启 Maps JavaScript API、Places API (New)），然后重启 <code>npm run dev</code>。
            </span>
          }
        />
      )}
      <Space direction="vertical" size={8} style={{ width: '100%' }}>
        <div>
          <Typography.Text strong>
            <EnvironmentOutlined /> 搜索地点
          </Typography.Text>
          <div ref={inputRef} style={{ marginTop: 4 }} />
        </div>
        {place.placeId && (
          <Tag color="green">
            已获取 Place ID：{place.placeId}
            {place.location ? `（${place.location.lat.toFixed(6)}, ${place.location.lng.toFixed(6)}）` : ''}
          </Tag>
        )}
        <div
          ref={mapRef}
          style={{
            width: '100%',
            height,
            borderRadius: 8,
            border: '1px solid #eee',
            background: '#fafafa',
          }}
        />
      </Space>
    </div>
  )
}
