// useAuthStore.js 인증은 httpOnly 쿠키 전제. 메모리 상태만. localStorage 금지.
// 데모(mock)는 시 관리자로 시작하고 로그인 화면에서 역할을 바꿀 수 있다.
import { create } from 'zustand'
import { USE_MOCK } from '../lib/api.js'

export const DEMO_USERS = {
  city: { id: 'U-1', name: '시 재난부서 관리자', role: 'city', dong: null },
  dong: { id: 'U-2', name: '망상동 재난 담당자', role: 'dong', dong: 'MS' }
}

export const ROLE_LABEL = { city: '시 관리자', dong: '동 담당자' }

// 현장 담당자 모바일 화면(/m/f)은 데모에서도 계정을 고른 뒤에만 열린다(차량, 도우미, 대상자 정보 보호).
// 고른 데모 역할만 탭 단위 sessionStorage 에 둔다. 인증 정보나 개인정보는 저장하지 않는다.
const SIGN_KEY = 'miri:demo-role'
const readSigned = () => {
  if (!USE_MOCK || typeof sessionStorage === 'undefined') return null
  try { const r = sessionStorage.getItem(SIGN_KEY); return DEMO_USERS[r] ? r : null } catch { return null }
}
const writeSigned = (role) => {
  if (!USE_MOCK || typeof sessionStorage === 'undefined') return
  try { role ? sessionStorage.setItem(SIGN_KEY, role) : sessionStorage.removeItem(SIGN_KEY) } catch { /* 저장 불가 브라우저는 메모리만 */ }
}
const initialRole = readSigned()

export const useAuthStore = create((set, get) => ({
  user: USE_MOCK ? DEMO_USERS[initialRole || 'city'] : null,
  // 담당자가 직접 계정을 골랐는지. 실서버는 세션 사용자가 있으면 참
  signedIn: USE_MOCK ? !!initialRole : false,
  ready: true,
  setDemoUser: (role) => { writeSigned(role); set({ user: DEMO_USERS[role], signedIn: true }) },
  logout: () => { writeSigned(null); set({ user: USE_MOCK ? DEMO_USERS.city : null, signedIn: false }) },
  // 편집 권한. 비권한이면 편집 UI 를 렌더하지 않는다(dah EditControls 원칙)
  canEdit: (resource) => {
    const role = get().user?.role
    if (!role) return false
    if (role === 'city') return true
    return ['persons', 'intake', 'vehicles', 'helpers', 'scenarios'].includes(resource)
  }
}))

export default useAuthStore
