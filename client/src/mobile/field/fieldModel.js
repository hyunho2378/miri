// fieldModel.js 현장 담당자 휴대폰 화면(F1~F7)의 파생 값. 순수 함수. 콘솔과 같은 store 값을 같은 함수로 센다.
import { STEP_LABEL, ackOf, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { UNSERVED_REASON } from '../../lib/assign.js'
import { elapsedMinOf } from '../../lib/clock.js'

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
  const elapsedMin = elapsedMinOf(d, vnow)
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
      groups[key].push({ code: h, vehicle: a.vehicleCode, trips: a.trips.length, reason: ack.reason || null, memo: ack.memo || null, at: ack.at || null, sms: (d.smsLog || []).filter((s) => (s.helper || s.to) === h).length })
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

// 배정됐지만 실패로 보고된 대상자(아직 소방 인계 전). 미배정 요청과 따로 묶는다
// F1 과 같은 기준: 보고된 실패와 훈련 진행상 실패(failPlan)를 모두 센다(persons, vnow 를 주면 F1 집계와 같은 함수)
export function failedPending(d, persons = null, vnow = null) {
  const ev = d?.events || {}
  if (!persons) return Object.entries(ev).filter(([, e]) => e?.step === 'fail').map(([code, e]) => ({ code, reason: e.reason || null, memo: e.memo || null, at: e.at || null }))
  return personSteps(d, persons, vnow).filter((r) => r.step === 'fail').map((r) => {
    const e = ev[r.person.code] || {}
    const p = d.failPlan?.[r.person.code] || {}
    return { code: r.person.code, reason: e.reason || p.reason || null, memo: e.memo || null, at: e.at || p.at || null }
  })
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

// 동 담당자는 상태, 도우미, 소방 화면도 자기 동 마을 기준으로 센다(마을, 대상자 화면과 같은 범위).
// 화면 범위 제한이며 서버 강제가 아니다. 실서버는 서버 세션에 역할과 동을 담아 조회 응답에서 거르는 단계가 필요하다.
export function scopeDispatch(d, persons, codes) {
  if (!codes || !d?.result) return { d, persons: codes ? persons.filter((p) => codes.has(p.villageCode)) : persons }
  const villageOf = Object.fromEntries(persons.map((p) => [p.code, p.villageCode]))
  const result = {
    ...d.result,
    // 여러 마을을 도는 차량은 담당 동 회차만 남긴다(회차 수가 범위 밖 정보를 담지 않게)
    assignments: d.result.assignments
      .map((a) => ({ ...a, trips: a.trips.filter((tr) => codes.has(tr.village)) }))
      .filter((a) => a.trips.length),
    unassigned: d.result.unassigned.filter((u) => codes.has(villageOf[u.personCode]))
  }
  const arrivals = Object.fromEntries(Object.entries(d.arrivals || {}).filter(([c]) => codes.has(c)))
  // 소방 요청 기록은 담당 동 마을 인원만 남긴다
  const fireRequests = (d.fireRequests || []).map((q) => {
    const villages = Object.fromEntries(Object.entries(q.villages || {}).filter(([c]) => codes.has(c)))
    return { ...q, villages, count: Object.values(villages).reduce((a, b) => a + b, 0) }
  }).filter((q) => q.count > 0)
  return { d: { ...d, result, arrivals, fireRequests }, persons: persons.filter((p) => codes.has(p.villageCode)) }
}

// ===== 재설계 2b(공모전/모바일UI/퍼소나_사용성진단_20261022.md 8-3, 벤치마크_20261022.md) =====
// 평시 홈의 큰 숫자: 담당 범위 미이송 예상. 시 관리자는 시 전체(콘솔 현황판과 같은 computeShortage 결과 그대로),
// 동 담당자는 결과의 마을별 값(byVillage)을 담당 동 마을만 더한다. 숫자를 새로 계산하지 않는다.
export function scopedShortage(result, inScope) {
  if (!result) return { unserved: null, targets: 0, villages: 0 }
  const rows = Object.entries(result.byVillage || {}).filter(([code, v]) => v.inScope && inScope(code))
  if (rows.length === Object.values(result.byVillage || {}).filter((v) => v.inScope).length) {
    return { unserved: result.total, targets: result.scopeTargets ?? 0, villages: result.scopeVillages ?? rows.length }
  }
  return { unserved: rows.reduce((s, [, v]) => s + v.total, 0), targets: rows.reduce((s, [, v]) => s + v.targetTotal, 0), villages: rows.length }
}

// 평시 홈의 추천 배정 시 값: scopedShortage 와 같은 마을 범위로 추천 배정 계획의 마을별 미이송을 더한다(시 전체면 추천 배정 합계)
export function scopedOptimized(result, inScope, byVillage, total) {
  if (!result) return null
  const rows = Object.entries(result.byVillage || {}).filter(([code, v]) => v.inScope && inScope(code))
  if (rows.length === Object.values(result.byVillage || {}).filter((v) => v.inScope).length) return total
  return rows.reduce((s, [code]) => s + (byVillage[code] || 0), 0)
}

// 발령 홈의 늦는 마을: 아직 남은 사람이 있는 마을을 기한 순으로. 남은 사람 = 전체 - 완료
export function lateVillages(list, vnow, limit = 3) {
  return list.filter((v) => v.total - v.done > 0)
    .map((v) => ({ ...v, left: v.total - v.done, tag: deadlineTag(v, vnow) }))
    .slice(0, limit)
}

// 확인할 서류: 판독 확인 대기(review pending) 대상자를 서류 결과와 묶는다. 홈의 건수와 같은 기준(scopeCodes: 대피 대상 구역)
export function docQueue(docs, persons, inScope, scopeCodes) {
  const byCode = Object.fromEntries(persons.map((p) => [p.code, p]))
  const out = []
  for (const doc of docs || []) {
    (doc.results || []).forEach((r, i) => {
      const p = byCode[r.personCode]
      if (!p || p.review !== 'pending' || !inScope(p.villageCode)) return
      if (scopeCodes && !scopeCodes.has(p.villageCode)) return
      out.push({ doc, result: r, person: p, pos: i + 1 })
    })
  }
  return out.sort((a, b) => a.person.code.localeCompare(b.person.code))
}

// 확인할 현장 소식: 대기 중인 소식만, 담당 범위 안
export function noteQueue(notes, inScope) {
  return (notes || []).filter((n) => n.status === 'pending' && inScope(n.villageCode)).sort((a, b) => (b.receivedAt || 0) - (a.receivedAt || 0))
}
