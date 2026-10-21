// demoSession.js 시연 계정을 고른 브라우저가 서버 훈련 발령 세션(drill)을 받는다.
// 콘솔과 휴대폰 현장 화면이 같은 브라우저 쿠키로 같은 훈련 발령을 보게 한다. 시연 코드는 화면에 두지 않는다.
// 이미 시연 코드 세션(full)이 있으면 그대로 쓴다. AI 판독과 문서함은 여전히 시연 코드 세션에서만 열린다.
let pending = null

export async function ensureDemoSession(fetchFn = globalThis.fetch) {
  if (pending) return pending
  pending = (async () => {
    try {
      const g = await fetchFn('/api/session', { credentials: 'same-origin' })
      const gb = await g.json().catch(() => ({}))
      if (gb.active || gb.drill) return true
      if (gb.configured === false) return false
      const p = await fetchFn('/api/session', {
        method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ demo: 'drill' })
      })
      const pb = await p.json().catch(() => ({}))
      return Boolean(p.ok && (pb.active || pb.drill))
    } catch { return false }
  })()
  const ok = await pending
  if (!ok) pending = null // 실패하면 다음 요청 때 다시 시도
  return ok
}

// 시험용
export function resetDemoSessionForTest() { pending = null }
