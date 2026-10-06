import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// 개발 중 /api 는 배포된 서버리스 함수로 보낸다(공공데이터 키가 서버에만 있다). 로컬 함수 서버를 띄우면 VITE_API_PROXY 로 바꾼다
export default defineConfig({
  plugins: [react()],
  server: { port: 5173, proxy: { '/api': { target: process.env.VITE_API_PROXY || 'https://miri-indol.vercel.app', changeOrigin: true, secure: true } } }
})
