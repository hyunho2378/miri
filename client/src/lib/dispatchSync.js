// dispatchSync.js 발령 상태 서버 저장, 복원, 도우미 보고 주기 조회(회신 R34).
// 서버(api/dispatch)는 시연 세션이 있을 때만 쓴다. 세션이나 저장소가 없으면 이 브라우저 안에서만 진행하고 사유를 상태로 남긴다.
import { helperBrief } from './dispatchSim.js'
import { HAZARD_KINDS } from './scenario.js'

const API = '/api/dispatch'
const KEYS = ['status', 'kind', 'speed', 'realStart', 'vStart', 'issuedAt', 'arrivals', 'result', 'confirmedAt', 'sentAt', 'ackPlan', 'ackOverride', 'failPlan', 'events', 'handovers', 'manualHelper', 'smsLog', 'scopeCodes', 'fireRequests']

// JSON 으로 옮길 수 있는 값만. Infinity(무응답 계획)는 null 로 바뀌므로 복원 때 되돌린다
export function snapshotOf(d) {
  const s = {}
  for (const k of KEYS) s[k] = d[k]
  return s
}
export function restoreSnapshot(s) {
  const out = { ...s }
  if (out.ackPlan) {
    out.ackPlan = Object.fromEntries(Object.entries(out.ackPlan).map(([h, p]) => [h, p && p.answer === 'none' && p.at == null ? { ...p, at: Infinity } : p]))
  }
  return out
}

// 도우미마다 서버에 둘 배정 요약. 대상자 코드와 회차만(가상 시연 명부 코드), 이름과 주소는 넣지 않는다
export function briefsOf(d, { scenario, villages = [], officerContact = '' } = {}) {
  if (!d.result) return {}
  const hz = HAZARD_KINDS[scenario?.kind]?.label
  const out = {}
  const helpers = [...new Set(d.result.assignments.flatMap((a) => a.helperCodes))]
  for (const h of helpers) {
    const a = d.result.assignments.find((x) => x.helperCodes.includes(h))
    const label = (c) => d.result?.ctx?.vmap?.[c]?.label || villages.find((v) => v.code === c)?.label || c
    out[h] = {
      ...helperBrief({ result: d.result, me: h, scenario, villages, hazardLabel: hz }),
      drill: d.kind === 'drill', officerContact: officerContact || '발령 담당자, 문자 회신',
      trips: [...a.trips].sort((x, y) => x.index - y.index).map((t) => ({
        index: t.index, village: label(t.village), grade: t.grade, personCodes: t.personCodes,
        departAt: t.departAt, finishAt: t.finishAt, shelters: t.shelters || []
      })),
      personCodes: a.trips.flatMap((t) => t.personCodes)
    }
  }
  return out
}

async function call(method, action, body) {
  const r = await fetch(`${API}${action ? `?action=${action}` : ''}`, {
    method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status, code: j?.error?.code })
  return j
}

export const saveRemote = (d, ctx) => call('POST', 'save', { dispatchId: d.remote?.dispatchId, state: snapshotOf(d), briefs: briefsOf(d, ctx) })
export const loadRemote = () => call('GET', 'state')
export const clearRemote = () => call('DELETE', '')

// 도우미 링크 쪽
export async function helperGet(token) {
  const r = await fetch(`${API}?action=helper&t=${encodeURIComponent(token)}`, { credentials: 'same-origin' })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status })
  return j
}
export async function helperSend(token, item) {
  const r = await fetch(`${API}?action=report&t=${encodeURIComponent(token)}`, {
    method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item)
  })
  if (r.status === 400 || r.status === 401 || r.status === 404) return true // 다시 보내도 받지 않는 보고는 대기열에서 뺀다
  return r.ok
}
