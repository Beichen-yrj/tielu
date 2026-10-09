import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig(({ command }) => ({
  // 构建产物使用相对路径，便于直接双击 index.html 打开离线演示包
  base: command === 'build' ? './' : '/',
  plugins: [react()],
  server: {
    proxy: {
      '/api': 'http://127.0.0.1:8000',
    },
  },
}))
