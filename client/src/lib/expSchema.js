// 체험 기록(열림, 봉사센터 등 외부 체험) 형식과 집계. 화면, 서버(api/exp.js), 집계 도구(tools/exp-report.mjs)가 함께 쓴다.
// 남기는 것: 무작위 체험 번호, 출처, 기기 종류, 화면 폭 구간, 화면 키와 머문 시각, 정해진 버튼 키.
// 남기지 않는 것: 이름, 연락처, 입력한 글, IP 원문, 기기 고유값. 화면 키와 버튼 키는 정해진 영문 짧은 키만 받는다.

export const EXP_SOURCES = ['yeollim', 'bongsa', 'test']
export const sourceOf = (s) => {
  const v = String(s || '').toLowerCase()
  if (EXP_SOURCES.includes(v)) return v
  return /^[a-z0-9]{1,16}$/.test(v) ? 'etc' : null
}
export const SOURCE_LABEL = { yeollim: '청년공간 열림', bongsa: '한림봉사센터', etc: '기타', test: '시험' }

// 버튼 문구(앞부분) → 버튼 키. 목록에 없는 버튼은 'other' 로만 센다(문구는 남기지 않음)
export const ACTION_LABELS = [
  ['확인했어요, 출발', 'depart_confirm'], ['출발했어요', 'depart'], ['도착했어요', 'arrive'], ['탑승했어요', 'board'], ['인계했어요', 'handover'],
  ['시연 배정 다시 받기', 'demo_restart'], ['시연 배정 받기', 'demo_start'], ['참여 동의하기', 'consent_open'], ['동의하고 시작', 'consent_ok'],
  ['불가 보내기', 'decline_send'], ['수락', 'accept'], ['불가', 'decline'], ['되돌리기', 'undo'], ['실패로 보고', 'fail_send'], ['이송할 수 없어요', 'fail_open'],
  ['상태가 나빠졌어요', 'sos'], ['119에 전화', 'call119'], ['응급 대응 안내', 'guide'], ['말할 때 쓰는 문구', 'phrases'], ['연락', 'contact'],
  ['참여 그만두기', 'quit_open'], ['그만두기', 'quit'], ['인계 기록(선택)', 'care_open'], ['저장', 'care_save'], ['자세히', 'detail'],
  ['개인정보와 그만두는 방법', 'privacy'], ['다시 보내기', 'resend'], ['다시 시도', 'retry'], ['뒤로', 'back'], ['닫기', 'close'], ['취소', 'cancel'],
  ['도우미용', 'start_helper'], ['현장 담당자용', 'start_field'], ['전체 ', 'list']
]
export function actionKeyOf(label) {
  const t = String(label || '').replace(/\s+/g, ' ').trim()
  if (!t) return 'other'
  for (const [p, k] of ACTION_LABELS) if (t === p || t.startsWith(p)) return k
  return 'other'
}

// 경로 → 화면 키(도우미 흐름 안쪽 화면은 화면 부품이 직접 알린다)
export function pathKeyOf(pathname = '') {
  const p = String(pathname).replace(/\/+$/, '') || '/'
  if (p === '/m') return 'start'
  if (p === '/m/kit') return 'kit'
  if (p.startsWith('/m/h/')) return null
  if (p === '/m/f') return 'f.home'
  const m = /^\/m\/f\/(villages|people|helpers|more|fire)(\/[^/]+)?$/.exec(p)
  if (m) return m[2] ? `f.${m[1].replace(/s$/, '')}` : `f.${m[1]}`
  return 'other'
}

// 도우미 흐름 화면 키(flow.js screenOf 결과와 지금 보는 화면)
export function helperKeyOf({ base, view = null, current = null, steps = {}, declined = false } = {}) {
  if (base === 'H9') return declined ? 'H9d' : 'H9'
  if (base !== 'H3') return base || null
  const v = view?.name
  if (v === 'H5' || v === 'H4') return `H5.${steps[view.code] || 'wait'}`
  if (v) return v
  if (current) return `H5.${steps[current] || 'wait'}`
  return 'H3'
}

const KEY_RE = /^[A-Za-z][A-Za-z0-9_.]{0,23}$/
const PII_RE = /\d{3,}|@|010|-/ // 숫자 셋 이상 이어짐, 메일, 전화 앞자리 꼴
const okKey = (k) => typeof k === 'string' && KEY_RE.test(k) && !PII_RE.test(k)
export const EXP_LIMITS = { bodyBytes: 16000, events: 200, batchesPerId: 300, ttlSec: 90 * 24 * 3600, tMax: 6 * 3600 * 1000 }
const TOP = new Set(['id', 'src', 'dev', 'wb', 'seq', 'ev'])
const EV_KEYS = { v: ['y', 's', 't'], a: ['y', 'k', 's', 't'], e: ['y', 's', 't'], h: ['y', 't'], r: ['y', 't'] }

// 받은 묶음 검사. 허용 칸 밖이나 개인정보 꼴이 보이면 통째로 거부
export function validateBatch(b) {
  if (!b || typeof b !== 'object' || Array.isArray(b)) return { ok: false, why: 'shape' }
  for (const k of Object.keys(b)) if (!TOP.has(k)) return { ok: false, why: `field:${k}` }
  if (typeof b.id !== 'string' || !/^[a-z0-9]{12,24}$/.test(b.id)) return { ok: false, why: 'id' }
  const src = sourceOf(b.src)
  if (!src) return { ok: false, why: 'src' }
  if (!['ios', 'android', 'other'].includes(b.dev)) return { ok: false, why: 'dev' }
  if (!['s', 'm', 'l'].includes(b.wb)) return { ok: false, why: 'wb' }
  if (!Number.isInteger(b.seq) || b.seq < 0 || b.seq > 10000) return { ok: false, why: 'seq' }
  if (!Array.isArray(b.ev) || b.ev.length === 0 || b.ev.length > EXP_LIMITS.events) return { ok: false, why: 'ev' }
  const ev = []
  for (const e of b.ev) {
    if (!e || typeof e !== 'object' || !EV_KEYS[e.y]) return { ok: false, why: 'ev.type' }
    for (const k of Object.keys(e)) if (!EV_KEYS[e.y].includes(k)) return { ok: false, why: `ev.field:${k}` }
    if (!Number.isInteger(e.t) || e.t < 0 || e.t > EXP_LIMITS.tMax) return { ok: false, why: 'ev.t' }
    if ((e.y === 'v' || e.y === 'e') && !okKey(e.s)) return { ok: false, why: 'ev.s' }
    if (e.y === 'a' && (!okKey(e.k) || (e.s != null && !okKey(e.s)))) return { ok: false, why: 'ev.k' }
    ev.push({ ...e })
  }
  return { ok: true, batch: { id: b.id, src, dev: b.dev, wb: b.wb, seq: b.seq, ev } }
}

// ===== 집계 =====
// 깔때기 단계: 화면 키나 버튼 키 중 하나라도 나오면 그 단계에 닿은 것으로 본다
export const FUNNEL = [
  { key: 'enter', label: '들어옴', hit: () => true },
  { key: 'alert', label: '배정 알림 봄', views: ['H1'] },
  { key: 'accept', label: '수락', actions: ['accept'], viewPrefix: 'H5.' },
  { key: 'depart', label: '출발 보고', actions: ['depart', 'depart_confirm'], views: ['H5.depart', 'H5.arrive', 'H5.board', 'H5.handover'] },
  { key: 'arrive', label: '도착 보고', actions: ['arrive'], views: ['H5.arrive', 'H5.board', 'H5.handover'] },
  { key: 'board', label: '탑승 보고', actions: ['board'], views: ['H5.board', 'H5.handover'] },
  { key: 'handover', label: '인계 보고', actions: ['handover'] },
  { key: 'done', label: '이송 끝 화면', views: ['H9'] }
]
export const SCREEN_LABEL = {
  start: '시작 화면(누가 쓰는지 고르기)', idle: '도우미 첫 화면', 'idle.consent': '참여 동의(평시)', preparing: '배정 준비 중', H0: '참여 동의', H1: '배정 알림', H2: '불가 사유',
  H3: '이송 목록', list: '전체 대상자 목록', 'H5.wait': '이송: 출발 전', 'H5.depart': '이송: 가는 중', 'H5.arrive': '이송: 도착', 'H5.board': '이송: 대피소로 가는 중', 'H5.handover': '이송: 인계 끝',
  'H5.fail': '이송: 실패 보고', H6: '이송 실패 사유', H7: '연락', H8: '전송 대기', H9: '이송 끝', H9d: '불가 응답 끝', closed: '발령 끝', none: '배정 없음',
  'f.home': '현장 담당자 홈', 'f.village': '마을 상세', 'f.villages': '마을 목록', 'f.helpers': '도우미 목록', 'f.more': '더보기', 'f.fire': '소방 인계', 'f.people': '대상자 목록', 'f.person': '대상자 상세',
  'err.closed': '끝난 링크', 'err.expired': '만료 링크', 'err.network': '연결 오류', other: '기타 화면', kit: '부품 화면'
}
export const screenLabel = (k) => SCREEN_LABEL[k] || k

const median = (a) => { if (!a.length) return null; const s = [...a].sort((x, y) => x - y); const m = s.length >> 1; return s.length % 2 ? s[m] : (s[m - 1] + s[m]) / 2 }

// 한 사람(체험 번호)의 묶음들을 시간순 사건으로 펴고 화면별 머문 시간을 잰다
export function sessionOf(batches = []) {
  const head = batches[0] || {}
  const ev = batches.flatMap((b) => b.ev || []).sort((a, b) => a.t - b.t)
  const dwell = [] // { s, ms }
  let cur = null
  const views = []; const actions = []; let errors = 0
  for (const e of ev) {
    if (e.y === 'v') {
      if (cur && cur.s !== e.s) dwell.push({ s: cur.s, ms: e.t - cur.t })
      if (!cur || cur.s !== e.s) { cur = { s: e.s, t: e.t }; views.push(e.s) }
    } else if (e.y === 'h') {
      if (cur) { dwell.push({ s: cur.s, ms: e.t - cur.t }); cur = { s: cur.s, t: null } }
    } else if (e.y === 'r') {
      if (cur && cur.t == null) cur.t = e.t
    } else if (e.y === 'a') actions.push(e.k)
    else if (e.y === 'e') errors += 1
  }
  if (cur && cur.t != null && ev.length) { const last = ev[ev.length - 1].t; if (last > cur.t) dwell.push({ s: cur.s, ms: last - cur.t }) }
  const total = ev.length ? ev[ev.length - 1].t - ev[0].t : 0
  const done = views.includes('H9')
  const lastView = views[views.length - 1] || null
  return { id: head.id, src: head.src, dev: head.dev, wb: head.wb, views, actions, dwell: dwell.filter((d) => d.ms >= 0), errors, done, declined: views.includes('H9d'), lastView, totalMs: total }
}

export function reachOf(sess, step) {
  if (step.hit) return step.hit(sess)
  if (step.views?.some((v) => sess.views.includes(v))) return true
  if (step.viewPrefix && sess.views.some((v) => v.startsWith(step.viewPrefix))) return true
  if (step.actions?.some((a) => sess.actions.includes(a))) return true
  return false
}

// 출처별 집계. includeTest=false 면 시험 출처는 뺀다
export function aggregate(sessions = [], { includeTest = false } = {}) {
  const list = sessions.filter((s) => s && s.views && (includeTest || s.src !== 'test'))
  const groups = { 전체: list }
  for (const s of list) (groups[s.src] ||= []).push(s)
  const out = {}
  for (const [g, ss] of Object.entries(groups)) {
    const n = ss.length
    const funnel = FUNNEL.map((st) => { const reached = ss.filter((s) => reachOf(s, st)).length; return { key: st.key, label: st.label, reached, rate: n ? reached / n : 0 } })
    const byScreen = {}
    for (const s of ss) for (const d of s.dwell) (byScreen[d.s] ||= []).push(d.ms / 1000)
    const dwell = Object.entries(byScreen).map(([k, a]) => ({ screen: k, label: screenLabel(k), n: a.length, medianSec: Math.round(median(a) * 10) / 10, maxSec: Math.round(Math.max(...a) * 10) / 10 })).sort((a, b) => b.medianSec - a.medianSec)
    const drop = {}
    for (const s of ss) if (!s.done && !s.declined && s.lastView) drop[s.lastView] = (drop[s.lastView] || 0) + 1
    const dropoff = Object.entries(drop).map(([k, c]) => ({ screen: k, label: screenLabel(k), n: c })).sort((a, b) => b.n - a.n)
    const actionCount = {}
    for (const s of ss) for (const a of s.actions) actionCount[a] = (actionCount[a] || 0) + 1
    const done = ss.filter((s) => s.done).length
    out[g] = {
      label: SOURCE_LABEL[g] || g, participants: n, completed: done, completionRate: n ? done / n : 0, declined: ss.filter((s) => s.declined).length,
      medianTotalSec: n ? Math.round(median(ss.map((s) => s.totalMs / 1000))) : null, withErrors: ss.filter((s) => s.errors > 0).length,
      funnel, dwell, dropoff, actions: Object.entries(actionCount).map(([k, c]) => ({ key: k, n: c })).sort((a, b) => b.n - a.n)
    }
  }
  return out
}
