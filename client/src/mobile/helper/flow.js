// 도우미 모바일 화면 흐름 규칙(docs/MOBILE_UI.md 4-2 H0~H9). 화면 부품과 떼어 시험할 수 있게 순수 함수로 둔다.
export const NEXT_STEP = {
  wait: { step: 'depart', label: '출발' },
  depart: { step: 'arrive', label: '도착' },
  arrive: { step: 'board', label: '탑승 완료' },
  board: { step: 'handover', label: '대피소 인계 완료' }
}
export const STEP_LABEL = { wait: '대기', depart: '출발', arrive: '도착', board: '탑승', handover: '인계 완료', fail: '이송 실패', handedToFire: '소방 인계' }
export const STEP_ORDER = ['wait', 'depart', 'arrive', 'board', 'handover']
export const DONE_STEPS = new Set(['handover', 'fail', 'handedToFire'])
export const FAIL_REASONS_M = { absent: '부재', refuse: '이송 거부', blocked: '진입 불가', worse: '상태 악화', etc: '기타' }
export const DECLINE_REASONS_M = { far: '거리 멀음', health: '건강 문제', contact: '연락 불가', etc: '기타' }
export const CONSENT_KEY = 'miri.m.consent.'

// 보고 목록에서 마지막 수락 응답
export function lastAck(reports = []) {
  return [...reports].filter((r) => r && r.type === 'ack').sort((a, b) => (a.at || 0) - (b.at || 0)).pop() || null
}

// 대상자별 현재 단계. 같은 대상은 나중 보고가 이긴다
export function stepsByPerson(codes = [], reports = []) {
  const out = Object.fromEntries(codes.map((c) => [c, 'wait']))
  const sorted = [...reports].filter((r) => r && r.type === 'step').sort((a, b) => (a.at || 0) - (b.at || 0))
  for (const r of sorted) if (r.personCode in out) out[r.personCode] = r.step
  return out
}

export function progressOf(codes = [], steps = {}) {
  const done = codes.filter((c) => steps[c] === 'handover').length
  const failed = codes.filter((c) => steps[c] === 'fail' || steps[c] === 'handedToFire').length
  const current = codes.find((c) => !DONE_STEPS.has(steps[c] || 'wait')) || null
  return { done, failed, total: codes.length, current, finished: codes.length > 0 && !current }
}

// 화면 결정. state: { error, consented, ack, finished, declining }
// error.code: CLOSED, NO_ASSIGNMENT, EXPIRED, BAD_TOKEN, NETWORK
export function screenOf({ error, loading, consented, ack, finished, declining } = {}) {
  if (error) {
    if (error.code === 'CLOSED') return 'closed'
    if (error.code === 'EXPIRED' || error.code === 'BAD_TOKEN' || error.code === 'NO_ASSIGNMENT') return 'expired'
    return 'error'
  }
  if (loading) return 'loading'
  if (!consented) return 'H0'
  if (!ack) return declining ? 'H2' : 'H1'
  if (ack.answer === 'decline') return 'H9'
  if (finished) return 'H9'
  return 'H3'
}

// 남은 시간 표시. 음수면 기한 지남
export function remainText(deadline, now) {
  if (!Number.isFinite(deadline) || !Number.isFinite(now)) return null
  const min = Math.round((deadline - now) / 60000)
  if (min < 0) return { text: `기한 ${Math.abs(min)}분 지남`, over: true, min }
  const h = Math.floor(min / 60)
  return { text: h ? `${h}시간 ${min % 60}분 남음` : `${min}분 남음`, over: false, min }
}

// 오류 응답을 화면 상태 코드로
export function errorCodeOf(e) {
  if (!e) return null
  if (e.code) {
    if (e.code === 'CLOSED') return 'CLOSED'
    if (/EXPIRE/.test(e.code)) return 'EXPIRED'
    if (e.code === 'NO_ASSIGNMENT') return 'NO_ASSIGNMENT'
    if (/TOKEN|SIG/.test(e.code)) return 'BAD_TOKEN'
  }
  if (e.status === 401 || e.status === 403) return 'BAD_TOKEN'
  if (e.status === 404) return 'NO_ASSIGNMENT'
  return 'NETWORK'
}

// 전화 바로가기. 숫자가 없으면 null(번호 없음 상태)
export function telOf(text) {
  const m = String(text || '').match(/0\d{1,2}-?\d{3,4}-?\d{4}|1\d{2}/)
  return m ? `tel:${m[0].replace(/-/g, '')}` : null
}

// 휴대폰 폭(600 이하)은 모바일 화면(/m/h/*)으로 연다. 큰 화면은 기존 화면 유지. ?view=desktop 이면 이동하지 않음
export function mobilePathFor(token, { width, search = '' } = {}) {
  if (!token || width == null || width > 600) return null
  if (/[?&]view=desktop\b/.test(search)) return null
  // GPT 8차 L1: 플랫폼 지정(?platform=ios|android)은 넘겨 준다. 다른 검색값은 버림
  const pf = String(search).match(/[?&]platform=(ios|android)\b/)
  return `/m/h/${encodeURIComponent(token)}${pf ? `?platform=${pf[1]}` : ''}`
}

