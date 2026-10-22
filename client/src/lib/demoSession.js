// demoSession.js 시연 계정을 고른 브라우저가 서버 훈련 발령 세션(drill)을 받는다.
// 콘솔과 휴대폰 현장 화면이 같은 브라우저 쿠키로 같은 훈련 발령을 보게 한다. 시연 코드는 화면에 두지 않는다.
// 고른 역할(시 관리자, 동 담당자와 동 코드)은 서버가 서명 안에 담는다. 서버는 이 역할로 조회 범위와 저장 권한을 정한다.
// 이미 시연 코드 세션(full)이 있으면 그대로 쓴다. AI 판독과 문서함은 여전히 시연 코드 세션에서만 열린다.
let pending = null
let pendingKey = ''
let confirmed = '' // 서버가 확인한 역할 표시(city 또는 dong:MS)

const keyOf = ({ role = 'city', dong = null } = {}) => (role === 'dong' && dong ? `dong:${dong}` : 'city')

export async function ensureDemoSession(fetchFn = globalThis.fetch, who = {}) {
  const want = keyOf(who)
  if (confirmed === want) return true
  if (pending && pendingKey === want) return pending
  pendingKey = want
  pending = (async () => {
    try {
      const g = await fetchFn('/api/session', { credentials: 'same-origin' })
      const gb = await g.json().catch(() => ({}))
      if (gb.active) { confirmed = want; return true } // 시연 코드 세션은 역할을 바꾸지 않는다
      if (gb.drill && keyOf({ role: gb.role, dong: gb.dong }) === want) { confirmed = want; return true }
      if (gb.configured === false) return false
      const p = await fetchFn('/api/session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ demo: 'drill', role: who.role === 'dong' ? 'dong' : 'city', ...(who.role === 'dong' ? { dong: who.dong } : {}) })
      })
      const pb = await p.json().catch(() => ({}))
      const ok = Boolean(p.ok && (pb.active || pb.drill))
      if (ok) confirmed = pb.active ? want : keyOf({ role: pb.role, dong: pb.dong })
      return ok
    } catch { return false }
  })()
  const ok = await pending
  pending = null
  return ok
}

// 같은 브라우저의 다른 탭이 역할을 바꿨을 수 있을 때(403 ROLE_READONLY) 확인 기록을 지우고 다시 맞춘다
export function forgetDemoRole() { confirmed = '' }

// 시험용
export function resetDemoSessionForTest() { pending = null; pendingKey = ''; confirmed = '' }
