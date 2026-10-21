// fieldModel.js 현장 담당자 휴대폰 화면(F1~F7)의 파생 값. 순수 함수. 콘솔과 같은 store 값을 같은 함수로 센다.
import { STEP_LABEL, ackOf, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { UNSERVED_REASON } from '../../lib/assign.js'

export const ACTIVE = new Set(['standby', 'assigned', 'sent'])
export const STATUS_LABEL = { idle: '평시', standby: '발령 개시, 배정 전', assigned: '배정 계산 완료, 전송 전', sent: '배정 전송, 이송 진행', closed: '발령 종료' }
export const DONE = new Set(['handover'])
export const MOVING = new Set(['depart', 'arrive', 'board'])
export const ISSUE = new Set(['fail', 'handedToFire', 'unassigned'])

export const villageName = (villages, code) => { const v = villages.find((x) => x.code === code); return v?.label || v?.name || code }

// 대상자별 현재 단계. 미배정은 unassigned, 소방 인계는 handedToFire
export function personSteps(d, persons, vnow) {
  const stops = indexStops(d.result)
  const unassigned = new Map((d.result?.unassigned || []).map((u) => [u.personCode, u]))
  const scope = new Set(d.scopeCodes || [])
  const rows = []
  for (const p of persons) {
    if (scope.size && !scope.has(p.code)) continue
    let step = stepOf(d, p.code, vnow, stops)
    if (!step && unassigned.has(p.code)) step = 'unassigned'
    if (!step) continue
    rows.push({ person: p, step, stop: stops[p.code] || null, unserved: unassigned.get(p.code) || null })
  }
  return rows
}

// F1 발령 상태 요약
export function fieldSummary(d, persons, villages, vnow) {
  const rows = personSteps(d, persons, vnow)
  const counts = { done: 0, moving: 0, wait: 0, fail: 0, handedToFire: 0, unassigned: 0 }
  for (const r of rows) {
    if (DONE.has(r.step)) counts.done += 1
    else if (MOVING.has(r.step)) counts.moving += 1
    else if (r.step === 'wait') counts.wait += 1
    else counts[r.step] += 1
  }
  const total = rows.length
  const elapsedMin = d.issuedAt ? Math.max(0, Math.round((vnow - d.issuedAt) / 60000)) : 0
  const upcoming = Object.entries(d.arrivals || {})
    .map(([code, at]) => ({ code, name: villageName(villages, code), at, left: rows.filter((r) => r.person.villageCode === code && !DONE.has(r.step) && r.step !== 'handedToFire').length }))
    .filter((x) => x.at > vnow && x.left > 0)
    .sort((a, b) => a.at - b.at)
  return { total, counts, elapsedMin, next: upcoming[0] || null, rows }
}

// F2 마을별 진행. 기한 임박 순
export function villageProgress(d, persons, villages, vnow) {
  const rows = personSteps(d, persons, vnow)
  const by = {}
  for (const r of rows) {
    const k = r.person.villageCode
    by[k] ||= { code: k, name: villageName(villages, k), at: d.arrivals?.[k] ?? null, total: 0, done: 0, moving: 0, wait: 0, issue: 0, people: [], helpers: new Set(), vehicles: new Set() }
    const v = by[k]
    v.total += 1
    if (DONE.has(r.step)) v.done += 1
    else if (MOVING.has(r.step)) v.moving += 1
    else if (r.step === 'wait') v.wait += 1
    else v.issue += 1
    v.people.push(r)
    if (r.stop) { r.stop.helperCodes.forEach((h) => v.helpers.add(h)); v.vehicles.add(r.stop.vehicleCode) }
  }
  return Object.values(by).map((v) => ({ ...v, helpers: [...v.helpers], vehicles: [...v.vehicles] }))
    .sort((a, b) => (a.at ?? Infinity) - (b.at ?? Infinity))
}

// F3 도우미 응답 묶음
export function helperResponses(d, vnow) {
  const groups = { accept: [], decline: [], none: [] }
  if (!d.result) return groups
  const seen = new Set()
  for (const a of d.result.assignments) {
    for (const h of a.helperCodes) {
      if (seen.has(h)) continue
      seen.add(h)
      const ack = ackOf(d, h, vnow)
      const key = ack.answer === 'accept' ? 'accept' : ack.answer === 'decline' ? 'decline' : 'none'
      groups[key].push({ code: h, vehicle: a.vehicleCode, trips: a.trips.length, reason: ack.reason || null, at: ack.at || null, sms: (d.smsLog || []).filter((s) => (s.helper || s.to) === h).length })
    }
  }
  return groups
}

// F4 미배정 사유별 인원(아직 소방 요청 전)
export function unservedByReason(d) {
  const out = {}
  if (!d.result) return { total: 0, reasons: [] }
  const rows = d.result.unassigned.filter((u) => d.events?.[u.personCode]?.step !== 'handedToFire')
  for (const u of rows) out[u.reason] = (out[u.reason] || 0) + 1
  return { total: rows.length, reasons: Object.entries(out).map(([k, n]) => ({ key: k, label: UNSERVED_REASON[k] || k, n })).sort((a, b) => b.n - a.n) }
}

// F5 대상자 검색. 이름은 없으므로 대상자 번호와 마을 이름으로 찾는다
export function searchPersons(persons, villages, q, limit = 50) {
  const s = (q || '').trim().toLowerCase()
  const list = s ? persons.filter((p) => p.code.toLowerCase().includes(s) || villageName(villages, p.villageCode).includes(s)) : persons
  return list.slice(0, limit)
}

// 마을 기한 표시: 남은 대상자가 있는데 기한이 지났으면 지남, 60분 안이면 임박
export function deadlineTag(v, vnow) {
  if (!v.at || v.done + v.issue >= v.total) return null
  if (v.at <= vnow) return 'over'
  if (v.at - vnow < 60 * 60000) return 'soon'
  return null
}

export const stepLabel = (s) => STEP_LABEL[s] || (s === 'unassigned' ? '미배정' : s)
export const hm = (ms) => { if (!ms) return '-'; const t = new Date(ms); return `${String(t.getHours()).padStart(2, '0')}:${String(t.getMinutes()).padStart(2, '0')}` }
