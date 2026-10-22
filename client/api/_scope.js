// _scope.js 서버 쪽 동 범위 거르기. 동 담당자 세션(서명 안 role=dong, dong=MS 등)에는 발령 상태와 보고를
// 담당 동 마을만 남겨 돌려준다. 마을 코드와 대상자 코드는 동 코드로 시작한다(MS-01, MS-04-001).
// 화면의 scopeDispatch 와 같은 규칙이고, 서버가 기준이다(화면 범위는 표시용).
const inDong = (dong) => (code) => typeof code === 'string' && code.startsWith(`${dong}-`)

export function scopeState(state, dong) {
  if (!state || typeof state !== 'object' || !dong) return state
  const ok = inDong(dong)
  const out = { ...state }
  const res = state.result
  if (res && typeof res === 'object') {
    out.result = {
      ...res,
      assignments: (Array.isArray(res.assignments) ? res.assignments : [])
        .map((a) => ({ ...a, trips: (a.trips || []).filter((t) => ok(t.village)) }))
        .filter((a) => a.trips.length),
      unassigned: (Array.isArray(res.unassigned) ? res.unassigned : []).filter((u) => ok(u.personCode) || ok(u.village))
    }
    if (res.byVillage && typeof res.byVillage === 'object') out.result.byVillage = Object.fromEntries(Object.entries(res.byVillage).filter(([c]) => ok(c)))
    if (res.ctx && typeof res.ctx === 'object') {
      // 계산 맥락 가운데 마을 코드로 묶인 칸(vmap, deadlines, dest 등)은 담당 동 마을만 남긴다
      const ctx = { ...res.ctx }
      for (const [k, v] of Object.entries(ctx)) {
        if (v && typeof v === 'object' && !Array.isArray(v)) {
          const keys = Object.keys(v)
          if (keys.length && keys.every((c) => /^[A-Z]{2}-\d/.test(c))) ctx[k] = Object.fromEntries(Object.entries(v).filter(([c]) => ok(c)))
        }
      }
      out.result.ctx = ctx
    }
  }
  if (state.arrivals && typeof state.arrivals === 'object') out.arrivals = Object.fromEntries(Object.entries(state.arrivals).filter(([c]) => ok(c)))
  if (Array.isArray(state.fireRequests)) {
    out.fireRequests = state.fireRequests.map((q) => {
      const villages = Object.fromEntries(Object.entries(q?.villages || {}).filter(([c]) => ok(c)))
      return { ...q, villages, count: Object.values(villages).reduce((a, b) => a + (Number(b) || 0), 0) }
    }).filter((q) => q.count > 0)
  }
  for (const k of ['failPlan', 'ackOverride']) {
    if (state[k] && typeof state[k] === 'object' && !Array.isArray(state[k])) out[k] = Object.fromEntries(Object.entries(state[k]).filter(([c]) => ok(c)))
  }
  if (Array.isArray(state.events)) out.events = state.events.filter((e) => !e?.personCode || ok(e.personCode))
  if (Array.isArray(state.handovers)) out.handovers = state.handovers.filter((e) => !e?.personCode || ok(e.personCode))
  return out
}

// 보고: 단계 보고는 대상자 코드로, 수락과 동의 보고는 범위 안 배정에 든 도우미만 남긴다
export function scopeReports(reports, state, dong) {
  if (!dong || !Array.isArray(reports)) return reports
  const ok = inDong(dong)
  const helpers = new Set((state?.result?.assignments || []).flatMap((a) => (a.trips || []).some((t) => ok(t.village)) ? (a.helperCodes || []) : []))
  return reports.filter((r) => (r?.personCode ? ok(r.personCode) : helpers.has(r?.helper)))
}
