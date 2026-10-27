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
export const FAIL_REASONS_M = { absent: '부재', refuse: '대피 원하지 않음', support: '지원 부족으로 이동 못 함', blocked: '진입 불가', worse: '상태 악화', etc: '기타' }
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
  // 플랫폼 지정(?platform=ios|android)은 넘겨 준다. 다른 검색값은 버림
  const pf = String(search).match(/[?&]platform=(ios|android)\b/)
  return `/m/h/${encodeURIComponent(token)}${pf ? `?platform=${pf[1]}` : ''}`
}


// 두 단(medium 이상, iPhone Duo 안쪽): 왼쪽 이송 목록(H3), 오른쪽 선택한 화면.
// 고른 것이 없으면 지금 차례 대상자의 단계 보고(H5), 모두 끝났으면 빈 안내. compact 는 쌓인 화면 하나만.
export function helperPaneOf({ twoPane = false, base, view = null, currentCode = null } = {}) {
  if (base !== 'H3') return { list: null, detail: null }
  if (!twoPane) return { list: view ? null : 'H3', detail: view || null }
  const detail = view || (currentCode ? { name: 'H5', code: currentCode } : null)
  return { list: 'H3', detail }
}

// ===== 도우미 화면 재구성(2a): 벤치마크 규칙 2(주 버튼 이름이 곧 지금 단계) =====
// 주 버튼 하나의 이름이 단계에 따라 바뀐다. 남은 단계를 카드로 늘어놓지 않는다
export const STEP_ACTION = { wait: '출발 완료', depart: '도착 완료', arrive: '탑승 완료', board: '인계 완료' }
// 지금 단계 한 줄(진행 n/4 와 함께)
export const STEP_NOW = { wait: '출발 전', depart: '가는 중', arrive: '도착', board: '대피소로 가는 중' }
// 진행 칸: 출발, 도착, 탑승, 인계 네 단계 중 몇 번째를 할 차례인지(1~4). 끝났으면 4
export function stepIndexOf(step = 'wait') {
  const i = STEP_ORDER.indexOf(step)
  return i < 0 ? 4 : Math.min(4, i + 1)
}
// 다음 장소 한 줄. 출발 전과 가는 중은 대상자 댁, 도착하면 차에 타기, 탑승 뒤는 대피소
export function nextPlaceOf(step = 'wait', { village = '', shelter = '' } = {}) {
  if (step === 'wait' || step === 'depart') return `${village ? `${village} ` : ''}대상자 댁`
  if (step === 'arrive') return '차에 타기'
  if (step === 'board') return shelter || '대피소'
  return ''
}
// 회차를 쉬운 말로(진단 8-4 낱말 바꾸기: 회차 → n번째 이동)
export const tripWord = (index) => `${index}번째 이동`
// 출발 전 확인 항목(helperGuidance.js PREDEPARTURE 문장을 한 줄씩). 끝 문장은 시트 아래 한 줄로 그대로 쓴다
export const PREDEPARTURE_ITEMS = ['기존 질환', '거동 불편', '호흡 상태', '비상연락처와 필요한 의료정보']
// 긴 응급 안내 문단(EMERGENCY)을 문장 단위 목록 행으로. 글자는 바꾸지 않는다
export function sentencesOf(text = '') {
  return String(text).split(/(?<=[.다요])\s+(?=\S)/).map((s) => s.trim()).filter(Boolean)
}
// 단계 보고 되돌리기: 누른 뒤 이 시간 동안은 보내지 않고 기다린다(확인 창 대신, 진단 8-3)
export const UNDO_MS = 6000
// 보내기 전 보고를 반영한 단계(화면 표시용)
export function withPending(steps = {}, pending = null) {
  return pending ? { ...steps, [pending.code]: pending.step } : steps
}
// 대상자 코드 대신 '마을 n번째 집'(플랫폼 셀 71 검토 반영). 이름은 쓰지 않는다(cleanBrief 원칙). 배정에 없으면 '대상자'
export function houseOf(trips = [], code) {
  for (const t of trips) {
    const i = (t.personCodes || []).indexOf(code)
    if (i >= 0) return `${t.village} ${i + 1}번째 집`
  }
  return '대상자'
}
