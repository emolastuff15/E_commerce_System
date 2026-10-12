import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

/**
 * 开发代理与线上 nginx 行为保持一致：
 *   浏览器请求 /api/xxx  ->  vite 去掉 /api 前缀  ->  网关 http://localhost:8080/xxx
 * 生产环境由 nginx 做同样的 rewrite + 反代（见 hmall-nginx/conf/nginx.conf）。
 */
export default defineConfig({
  plugins: [react()],
  server: {
    port: 5173,
    host: true,
    watch: {
      // 编辑器/工具做“原子替换”时会生成临时文件，忽略掉可避免 watcher 因 EBUSY 崩溃
      ignored: ['**/.*.tmpdir/**', '**/*.tmp', '**/.tmp/**'],
    },
    proxy: {
      '/api': {
        target: 'http://localhost:8080',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, ''),
      },
    },
  },
})
