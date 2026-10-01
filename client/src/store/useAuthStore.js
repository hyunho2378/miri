// useAuthStore.js 인증은 httpOnly 쿠키 전제. 메모리 상태만. localStorage 금지.
// 데모(mock)는 시 관리자로 시작하고 로그인 화면에서 역할을 바꿀 수 있다.
import { create } from 'zustand'
import { USE_MOCK } from '../lib/api.js'

export const DEMO_USERS = {
  city: { id: 'U-1', name: '시 재난부서 관리자', role: 'city', dong: null },
  dong: { id: 'U-2', name: '망상동 재난 담당자', role: 'dong', dong: 'MS' }
}

export const ROLE_LABEL = { city: '시 관리자', dong: '동 담당자' }

export const useAuthStore = create((set, get) => ({
  user: USE_MOCK ? DEMO_USERS.city : null,
  ready: true,
  setDemoUser: (role) => set({ user: DEMO_USERS[role] }),
  logout: () => set({ user: USE_MOCK ? DEMO_USERS.city : null }),
  // 편집 권한. 비권한이면 편집 UI 를 렌더하지 않는다(dah EditControls 원칙)
  canEdit: (resource) => {
    const role = get().user?.role
    if (!role) return false
    if (role === 'city') return true
    return ['persons', 'intake', 'vehicles', 'helpers', 'scenarios'].includes(resource)
  }
}))

export default useAuthStore
