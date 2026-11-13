// dispatchSync.js 발령 상태 서버 저장, 복원, 도우미 보고 주기 조회(회신 R34).
// 서버(api/dispatch)는 시연 세션이 있을 때만 쓴다. 세션이나 저장소가 없으면 이 브라우저 안에서만 진행하고 사유를 상태로 남긴다.
import { locationsForHelpers } from './locationDisclosure.js'
import { helperBrief } from './dispatchSim.js'
import { HAZARD_KINDS } from './scenario.js'
import { virtualAt } from './clock.js'
import { mergeChecks, tripCheckNotes, tripChecks } from './tripChecks.js'

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
export function briefsOf(d, { scenario, villages = [], officerContact = '', persons = null, shelters = null } = {}) {
  if (!d.result) return {}
  const hz = HAZARD_KINDS[scenario?.kind]?.label
  const out = {}
  const helpers = [...new Set(d.result.assignments.flatMap((a) => a.helperCodes))]
  for (const h of helpers) {
    const a = d.result.assignments.find((x) => x.helperCodes.includes(h))
    const label = (c) => d.result?.ctx?.vmap?.[c]?.label || villages.find((v) => v.code === c)?.label || c
    // 확인할 점(동행 연락, 리프트, 경로): 인원 수와 시설명만 담는다. 이름, 주소, 건강 정보는 넣지 않는다(실서버 흐름 확인 5번)
    let checks = null
    if (persons && shelters) {
      const pBy = Object.fromEntries(persons.map((p) => [p.code, p]))
      const sBy = Object.fromEntries(shelters.map((x) => [x.code, x]))
      const vShelter = (c) => villages.find((v) => v.code === c)?.shelterCode
      checks = Object.fromEntries(a.trips.map((t) => [t.index, tripChecks({ trip: t, persons: pBy, shelters: sBy, villages, scenario, villageShelter: vShelter })]))
    }
    out[h] = {
      ...helperBrief({ result: d.result, me: h, scenario, villages, hazardLabel: hz }),
      notes: checks ? tripCheckNotes(mergeChecks(Object.values(checks))).map((n) => n.text) : [],
      drill: d.kind === 'drill', officerContact: officerContact || '발령 담당자, 문자 회신',
      // 도우미 보고 시각을 발령 가상 시계로 맞추기 위한 기준. 배속을 바꾸면 다시 저장된다
      clock: { realStart: d.realStart, vStart: d.vStart, speed: d.speed },
      trips: [...a.trips].sort((x, y) => x.index - y.index).map((t) => ({
        index: t.index, village: label(t.village), grade: t.grade, personCodes: t.personCodes,
        // 회차마다 그 마을의 이송 완료 기한. 머리의 기한은 가장 이른 마을 기준이라 뒤 회차 완료 시각이 그보다 늦어 보일 수 있다
        completeBy: d.result?.ctx?.deadlines?.[t.village]?.completeBy ?? null,
        departAt: t.departAt, finishAt: t.finishAt, shelters: t.shelters || [], routeCheck: !!checks?.[t.index]?.routeCheck, routeBasis: checks?.[t.index]?.routeBasis === 'road' ? 'road' : 'line'
      })),
      personCodes: a.trips.flatMap((t) => t.personCodes)
    }
  }
  return out
}

// 세션이 없을 때(401 NEED_SESSION) 한 번 세션을 받아 다시 보낼 함수. 시연 모드에서만 앱이 등록한다(useAuthStore)
let recoverSession = null
export function setSessionRecover(fn) { recoverSession = typeof fn === 'function' ? fn : null }
// 요청 전에 이 탭의 역할로 서버 세션을 맞출 함수(시연 모드). 실패해도 요청은 그대로 보낸다
let alignRole = null
export function setRoleAlign(fn) { alignRole = typeof fn === 'function' ? fn : null }

async function call(method, action, body, query = {}, retried = false, opts = {}) {
  if (alignRole && !retried && !opts.skipAlign) { try { await alignRole() } catch { /* 맞추기 실패는 무시 */ } }
  const qs = new URLSearchParams({ ...(action ? { action } : {}), ...query }).toString()
  const r = await fetch(`${API}${qs ? `?${qs}` : ''}`, {
    method, credentials: 'same-origin', headers: body ? { 'Content-Type': 'application/json' } : undefined,
    body: body ? JSON.stringify(body) : undefined
  })
  const j = await r.json().catch(() => ({}))
  const roleMismatch = r.status === 403 && j?.error?.code === 'ROLE_READONLY'
  if (((r.status === 401 && j?.error?.code === 'NEED_SESSION') || roleMismatch) && !retried && recoverSession && (await recoverSession())) {
    return call(method, action, body, query, true)
  }
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status, code: j?.error?.code })
  return j
}

export const saveRemote = (d, ctx, meta = {}) => {
  const briefs = briefsOf(d, ctx)
  // 위치 공개 후보는 배정 요약과 따로 보낸다. 서버는 도우미가 수락했을 때만 그 도우미에게 돌려준다(locationDisclosure.js)
  const locations = ctx?.persons && ctx?.privateInfo ? locationsForHelpers({ kind: d.kind, briefs, persons: ctx.persons, privateInfo: ctx.privateInfo }) : {}
  // 화면을 떠나는 순간의 저장(meta.leaving)은 역할 맞추기 요청을 기다리지 않고 바로 보낸다(문서가 내려가기 전에 본문 전송)
  return call('POST', 'save', { dispatchId: meta.dispatchId ?? d.remote?.dispatchId, rev: meta.rev, state: snapshotOf(d), briefs, locations }, {}, false, { skipAlign: !!meta.leaving })
}
export const loadRemote = () => call('GET', 'state')
export const clearRemote = (dispatchId) => call('DELETE', '', null, dispatchId ? { dispatchId } : {})

// 발령 ID 는 화면이 정한다. 서버 형식 /^D[0-9a-z]{6,20}$/
export const newDispatchId = (now = Date.now()) => `D${now.toString(36)}${Math.random().toString(16).slice(2, 8).padEnd(6, '0')}`
// 도우미 화면의 보고 시각. 발령 가상 시계 기준(담당자 화면의 보고와 같은 시간 축)
export const clockNow = (clock, real = Date.now()) => virtualAt(clock, real)

// 도우미 링크 쪽
export async function helperGet(token) {
  const r = await fetch(`${API}?action=helper&t=${encodeURIComponent(token)}`, { credentials: 'same-origin' })
  const j = await r.json().catch(() => ({}))
  // 서버 오류 코드(CLOSED, NO_ASSIGNMENT 등)를 버리지 않는다
  if (!r.ok) throw Object.assign(new Error(j?.error?.message || `HTTP ${r.status}`), { status: r.status, code: j?.error?.code || null })
  return j
}

// 전송 결과 분류. ok: 저장됨(중복 포함) / retry: 다시 보냄(429, 5xx, 네트워크) / reject: 다시 보내도 받지 않음
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
// 큰 화면 도우미(RemoteHelper)의 보고 결과 처리. ok: 저장됨 / retry: 대기열에 남김 / end: 배정 종료, 교체, 만료라 안내 화면으로 / reject: 보내지 못한 보고로 옮김
const END_CODES = new Set(['CLOSED', 'NO_ASSIGNMENT', 'EXPIRED', 'BAD_TOKEN'])
export function remoteSendOutcome(res) {
  if (!res || res.kind === 'ok') return res ? 'ok' : 'retry'
  if (res.kind === 'retry') return 'retry'
  const code = String(res.code || '')
  if (END_CODES.has(code) || /EXPIRE/.test(code) || /TOKEN|SIG/.test(code) || res.status === 401 || res.status === 403 || res.status === 404 || res.status === 410) return 'end'
  return 'reject'
}
// 이전 큰 화면 도우미용: 영구 거부는 대기열에서 빼고(true), 재시도 대상은 남긴다(false)
export async function helperSend(token, item) {
  const res = await helperSendResult(token, item)
  if (res.kind === 'retry' && res.code === 'NETWORK') throw Object.assign(new Error(res.message), { status: 0 })
  return res.kind !== 'retry'
}
