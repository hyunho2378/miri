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
      // 도우미 보고 시각을 발령 가상 시계로 맞추기 위한 기준(GPT 5차 M1). 배속을 바꾸면 다시 저장된다
      clock: { realStart: d.realStart, vStart: d.vStart, speed: d.speed },
      trips: [...a.trips].sort((x, y) => x.index - y.index).map((t) => ({
        index: t.index, village: label(t.village), grade: t.grade, personCodes: t.personCodes,
        departAt: t.departAt, finishAt: t.finishAt, shelters: t.shelters || []
      })),
      personCodes: a.trips.flatMap((t) => t.personCodes)
    }
  }
  return out
}

async function call(method, action, body, query = {}) {
  const qs = new URLSearchParams({ ...(action ? { action } : {}), ...query }).toString()
  const r = await fetch(`${API}${qs ? `?${qs}` : ''}`, {
    method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  const j = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status, code: j?.error?.code })
  return j
}

export const saveRemote = (d, ctx, meta = {}) => call('POST', 'save', { dispatchId: meta.dispatchId ?? d.remote?.dispatchId, rev: meta.rev, state: snapshotOf(d), briefs: briefsOf(d, ctx) })
export const loadRemote = () => call('GET', 'state')
export const clearRemote = (dispatchId) => call('DELETE', '', null, dispatchId ? { dispatchId } : {})

// 발령 ID 는 화면이 정한다(GPT 5차 H4). 서버 형식 /^D[0-9a-z]{6,20}$/
export const newDispatchId = (now = Date.now()) => `D${now.toString(36)}${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}`
// 도우미 화면의 보고 시각. 발령 가상 시계 기준(담당자 화면의 보고와 같은 시간 축)
export const clockNow = (clock, real = Date.now()) => (clock && clock.realStart ? clock.vStart + (real - clock.realStart) * (clock.speed || 1) : real)

// 도우미 링크 쪽
export async function helperGet(token) {
  const r = await fetch(`${API}?action=helper&t=${encodeURIComponent(token)}`, { credentials: 'same-origin' })
  const j = await r.json().catch(() => ({}))
  // GPT 8차 M2: 서버 오류 코드(CLOSED, NO_ASSIGNMENT 등)를 버리지 않는다
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status, code: j?.error?.code || null })
  return j
}

// 전송 결과 분류(GPT 8차 H1). ok: 저장됨(중복 포함) / retry: 다시 보냄(429, 5xx, 네트워크) / reject: 다시 보내도 받지 않음
export function classifySend(status, code) {
  if (status >= 200 && status < 300) return 'ok'
  if (status === 429 || status >= 500 || !status) return 'retry'
  return 'reject'
}
export async function helperSendResult(token, item) {
  let r
  try {
    r = await fetch(`${API}?action=report&t=${encodeURIComponent(token)}`, {
      method: 'POST', credentials: 'same-origin', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(item)
    })
  } catch (e) { return { kind: 'retry', status: 0, code: 'NETWORK', message: e?.message || '연결 실패' } }
  const j = await r.json().catch(() => ({}))
  const code = j?.error?.code || null
  return { kind: classifySend(r.status, code), status: r.status, code, message: j?.error?.message || (r.ok ? '' : `HTTP ${r.status}`) }
}
// 기존 큰 화면 도우미(RemoteHelper)용: 영구 거부는 대기열에서 빼고(true), 재시도 대상은 남긴다(false)
export async function helperSend(token, item) {
  const res = await helperSendResult(token, item)
  if (res.kind === 'retry' && res.code === 'NETWORK') throw Object.assign(new Error(res.message), { status: 0 })
  return res.kind !== 'retry'
}
