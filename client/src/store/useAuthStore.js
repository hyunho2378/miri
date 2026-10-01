// useAuthStore.js 인증은 httpOnly 쿠키. 이 스토어는 메모리 상태만 가진다. localStorage 금지.
import { create } from 'zustand'
import { USE_MOCK, get, post } from '../lib/api.js'
import users from '../mock/users.json'

// 심사 데모 자동인증. VITE_USE_MOCK=true 일 때만 store 초기값을 로그인된 상태로 둔다.
// 새로고침해도 초기값으로 돌아오므로 웹스토리지 없이 유지된다.
// VITE_USE_MOCK=false(백엔드 실연동)는 아래 기존 로직을 그대로 탄다
const DEMO_USER = USE_MOCK ? users.find((u) => u.role === 'admin') || null : null

export const useAuthStore = create((set) => ({
  user: DEMO_USER,
  ready: USE_MOCK,
  fetchMe: async () => {
    // mock 의 /api/auth/me 는 항상 401 이라 그대로 두면 데모 인증을 지운다
    if (USE_MOCK) return
    try {
      const data = await get('/api/auth/me')
      set({ user: data.user || data, ready: true })
    } catch {
      set({ user: null, ready: true })
    }
  },
  login: async (email, password) => {
    const data = await post('/api/auth/login', { email, password })
    set({ user: data.user, ready: true })
    return data.user
  },
  logout: async () => {
    // 데모에서는 실수로 눌러도 인증이 풀리지 않는다
    if (USE_MOCK) return
    await post('/api/auth/logout').catch(() => {})
    set({ user: null })
  }
}))

export default useAuthStore
