// useDispatchStore.js 발령 상태 머신. 평시 → 실행대기 발령 → 배정 → 전송 → 종료.
// 가상 시계: 훈련 발령은 배속으로 진행해 8시간 창을 몇 분 안에 시연한다.
import { create } from 'zustand'
import { helperDeclined, helperQualifies, planDispatch, reassignBlock, scorePlan } from '../lib/assign.js'
import { capOf, gradeOf } from '../lib/shortage.js'
import { calcTiming, calcVehicles, scenarioArrivals, scopeInput } from '../lib/shortageCalc.js'
import { dispatchSms, helperBrief, indexStops, stepOf, vnowOf } from '../lib/dispatchSim.js'
import { HAZARD_KINDS } from '../lib/scenario.js'
import { MIN } from '../lib/time.js'
import { clearRemote, loadRemote, restoreSnapshot, saveRemote, snapshotOf } from '../lib/dispatchSync.js'
import { mergeReports } from '../lib/reportQueue.js'
import { activeScenario, useMiriStore } from './useMiriStore.js'

const EMPTY = {
  status: 'idle', kind: 'drill', speed: 60, realStart: 0, vStart: 0, issuedAt: 0, arrivals: {},
  result: null, confirmedAt: null, sentAt: null, ackPlan: {}, ackOverride: {}, failPlan: {}, events: {},
  handovers: [], manualHelper: null, smsLog: [], closedRecordId: null, scopeCodes: [], blocked: null,
  fireRequests: [], remote: { state: 'local', dispatchId: null, tokens: {}, reason: null, savedAt: null, polledAt: null }
}

export const useDispatchStore = create((set, get) => ({
  ...EMPTY,

  start: ({ kind = 'drill', speed = 60 } = {}) => {
    // 실제 발령은 도우미 휴대폰 보고를 받는 서버 연결 전까지 열지 않는다. 자동 진행은 훈련 시연에만 쓴다(GPT 검토 S5)
    if (kind !== 'drill') {
      set({ blocked: '실제 발령은 도우미 보고 서버 연결 뒤 엽니다. 지금은 훈련 발령만 진행합니다.' })
      return false
    }
    const data = useMiriStore.getState()
    const sc = activeScenario(data)
    const now = Date.now()
    // 대피 대상 구역 마을만 도달 시각을 둔다
    const sp = scopeInput({ persons: data.persons, villages: data.villages, scenario: sc, settings: data.settings })
    set({
      ...EMPTY, status: 'standby', kind, speed, realStart: now, vStart: now, issuedAt: now,
      arrivals: scenarioArrivals(sc, sp.villages, now)
    })
  },
  setSpeed: (speed) => {
    const d = get()
    const vnow = vnowOf(d)
    set({ speed, realStart: Date.now(), vStart: vnow })
  },
  setArrival: (village, ms) => set((s) => ({ arrivals: { ...s.arrivals, [village]: ms }, result: s.status === 'assigned' ? null : s.result, status: s.status === 'assigned' ? 'standby' : s.status })),

  runAssign: () => {
    const d = get()
    const data = useMiriStore.getState()
    const sc = activeScenario(data)
    // 시나리오 범위와 시나리오별 대피소(왕복 시간)를 적용한 마을과 대상자만 배정한다
    const sp = scopeInput({ persons: data.persons, villages: data.villages, scenario: sc, settings: data.settings })
    const codes = new Set(Object.keys(d.arrivals))
    const persons = sp.persons.filter((p) => codes.has(p.villageCode))
    // 평시 부족분 계산과 같은 차량 목록(시간대, 가용률, 추가 협약)과 시간 조건을 쓴다(GPT 검토 S1)
    const result = planDispatch({
      persons, villages: sp.villages.filter((v) => codes.has(v.code)),
      vehicles: calcVehicles(data.vehicles, sc), helpers: data.helpers, t0: vnowOf(d), arrivals: d.arrivals,
      ...calcTiming(sc, data.settings)
    })
    // 처음 추천 지표는 따로 보관하고, 재배정 뒤에는 현재 계획 지표를 다시 계산한다(GPT 검토 M6)
    result.initialMetrics = { ...result.metrics }
    // 계산 기준(회신 R34): 발령 운영 값은 발령 개시 뒤 흐른 시간만큼 남은 시간이 줄어 평시 값과 다르다. 화면에 기준을 함께 보인다
    const at = vnowOf(d)
    result.basis = { at, elapsedMin: Math.max(0, Math.round((at - (d.issuedAt || d.vStart)) / MIN)), targets: persons.length, villages: codes.size }
    set({ result, status: 'assigned', scopeCodes: persons.map((p) => p.code) })
    return result
  },

  // 같은 등급, 정원 여유가 있는 다른 회차로 대상자 이동. 회차 시간은 마을 왕복이라 바뀌지 않는다
  movePerson: (code, toVehicle, toTripIndex) => set((s) => {
    const result = structuredClone(s.result)
    let moved = false
    for (const a of result.assignments) for (const tr of a.trips) {
      const i = tr.personCodes.indexOf(code)
      if (i >= 0) tr.personCodes.splice(i, 1)
    }
    const target = result.assignments.find((a) => a.vehicleCode === toVehicle)?.trips.find((t) => t.index === toTripIndex)
    if (target) { target.personCodes.push(code); moved = true }
    result.assignments.forEach((a) => { a.trips = a.trips.filter((t) => t.personCodes.length) })
    result.manualEdits = (result.manualEdits || 0) + (moved ? 1 : 0)
    return { result }
  }),

  confirmAndSend: () => {
    const d = get()
    const vnow = vnowOf(d)
    const helpers = [...new Set(d.result.assignments.flatMap((a) => a.helperCodes))]
    if (d.kind !== 'drill') return
    // 응답 계획: 대부분 1~4분 안에 수락, 1명 불가, 1명 무응답. 첫 도우미는 도우미 화면 시연용 수동 응답
    const manualHelper = helpers[0] || null
    const ackPlan = {}
    helpers.forEach((h, i) => {
      if (h === manualHelper) return
      if (i === 3) ackPlan[h] = { answer: 'decline', reason: 'health', at: vnow + 3 * MIN }
      else if (i === 6) ackPlan[h] = { answer: 'none', at: Infinity }
      else ackPlan[h] = { answer: 'accept', at: vnow + (1 + (i % 4)) * MIN }
    })
    // 이송 실패 시연용 2건: 휠체어 1건 부재, 침상 1건 진입 불가
    const failPlan = {}
    const stops = indexStops(d.result)
    const pickFail = (grade, reason) => {
      const a = d.result.assignments.find((x) => !x.helperCodes.includes(manualHelper) && x.trips.some((t) => t.grade === grade && t.index === 1))
      const code = a?.trips.find((t) => t.grade === grade && t.index === 1)?.personCodes[0]
      if (code && stops[code]) failPlan[code] = { reason }
    }
    pickFail('wheelchair', 'absent')
    pickFail('bed', 'blocked')
    const data = useMiriStore.getState()
    const sc = activeScenario(data)
    const hz = HAZARD_KINDS[sc?.kind]?.label
    const smsLog = helpers.map((h) => {
      const sms = dispatchSms(helperBrief({ result: d.result, me: h, scenario: sc, villages: data.villages, hazardLabel: hz }), { drill: d.kind === 'drill' })
      return { helper: h, at: vnow, text: sms?.text || `[미리] ${h} 배정 도착. 링크에서 수락 또는 불가 응답`, bytes: sms?.bytes, smsKind: sms?.kind }
    })
    set({ status: 'sent', confirmedAt: vnow, sentAt: vnow, ackPlan, failPlan, manualHelper, smsLog })
  },

  // 도우미 화면 보고
  helperAck: (helper, answer, reason) => set((s) => ({ ackOverride: { ...s.ackOverride, [helper]: { answer, reason, at: vnowOf(s) } } })),
  report: (code, step, reason, memo) => set((s) => ({ events: { ...s.events, [code]: { step, reason, memo, at: vnowOf(s) } } })),

  // 불가 또는 무응답 도우미 교체
  replaceHelper: (oldCode) => {
    const d = get()
    const data = useMiriStore.getState()
    const used = new Set(d.result.assignments.flatMap((a) => a.helperCodes))
    const a = d.result.assignments.find((x) => x.helperCodes.includes(oldCode))
    if (!a) return null
    // 도우미가 필요한 회차의 모든 등급을 지원하고 활성 상태이며, 이미 불가로 답한 사람은 아닌 도우미만(GPT 재검토 R7)
    const grades = [...new Set(a.trips.map((t) => t.grade))].filter((g) => gradeOf(g).helpers > 0)
    const declined = (c) => helperDeclined(c, d.ackOverride, d.ackPlan)
    const next = data.helpers.find((h) => h.code !== oldCode && !used.has(h.code) && !declined(h.code) && helperQualifies(h, grades))
    if (!next) return null
    const result = structuredClone(d.result)
    const ra = result.assignments.find((x) => x.vehicleCode === a.vehicleCode)
    ra.helperCodes = ra.helperCodes.map((c) => (c === oldCode ? next.code : c))
    const vnow = vnowOf(d)
    set({
      result,
      ackOverride: { ...d.ackOverride, [next.code]: { answer: 'accept', at: vnow, replaced: oldCode } },
      smsLog: [...d.smsLog, { helper: next.code, at: vnow, text: `${d.kind === 'drill' ? '[미리 훈련]' : '[미리]'} 대체 배정 도착(${next.code}). 기존 배정을 이어받아 링크에서 확인` }]
    })
    return next.code
  },

  // 실패 대상자 재배정: 지금 이후 가장 빨리 비는 호환 차량에 새 회차 추가
  // 발령 때 확정한 계산 문맥(시나리오 대피소와 왕복 시간, 시간대 차량, 완료 기한)을 그대로 쓰고 도우미까지 다시 확인한다(GPT 검토 S4)
  reassign: (code) => {
    const d = get()
    const data = useMiriStore.getState()
    const ctx = d.result?.ctx
    const person = data.persons.find((p) => p.code === code)
    const village = ctx?.vmap?.[person?.villageCode]
    if (!person || !village || !Number.isFinite(village.roundTripMin)) return false
    // 대피소 자리가 없어 뺀 사람, 목적지가 없는 사람은 재배정하지 않는다(GPT 3차 확인 R6)
    if (reassignBlock(code, ctx)) return false
    const destCode = ctx.dest[code]
    const declined = (c) => helperDeclined(c, d.ackOverride, d.ackPlan)
    const vnow = vnowOf(d)
    const completeBy = ctx.deadlines[village.code].completeBy
    const result = structuredClone(d.result)
    const need = gradeOf(person.grade).helpers
    const usedHelpers = new Set(result.assignments.flatMap((a) => a.helperCodes))
    let best = null
    for (const vehicle of ctx.vehicles) {
      if (capOf(vehicle, person.grade) === 0) continue
      const a = result.assignments.find((x) => x.vehicleCode === vehicle.code)
      // 이미 쓰는 차량은 동승 도우미가 이 등급을 지원해야 하고, 새 차량은 남은 도우미로 채울 수 있어야 한다
      let crew = null
      if (need) {
        if (a) {
          const hs = a.helperCodes.map((c) => data.helpers.find((h) => h.code === c)).filter(Boolean)
          // 불가로 답한 도우미가 탄 차량은 후보에서 뺀다(GPT 3차 확인 R7)
          if (a.helperCodes.some(declined)) continue
          if (hs.length < need || !hs.every((h) => helperQualifies(h, [person.grade]))) continue
        } else {
          crew = data.helpers.filter((h) => !usedHelpers.has(h.code) && !declined(h.code) && helperQualifies(h, [person.grade])).slice(0, need)
          if (crew.length < need) continue
        }
      }
      const free = Math.max(vnow, ...(a ? a.trips.map((t) => t.finishAt) : []))
      const finish = free + village.roundTripMin * MIN
      if (finish <= completeBy && (!best || finish < best.finish)) best = { a, vehicle, free, finish, crew }
    }
    if (!best) return false
    for (const a of result.assignments) for (const tr of a.trips) tr.personCodes = tr.personCodes.filter((c) => c !== code)
    result.unassigned = result.unassigned.filter((u) => u.personCode !== code)
    if (!best.a) {
      best.a = { vehicleCode: best.vehicle.code, trips: [], helperCodes: (best.crew || []).map((h) => h.code), reasons: ['실패 대상자 재배정용 추가 차량'] }
      result.assignments.push(best.a)
    }
    best.a.trips.push({ index: best.a.trips.length + 1, vehicle: best.a.vehicleCode, village: village.code, grade: person.grade, personCodes: [code], departAt: best.free, finishAt: best.finish, added: true, shelters: [destCode] })
    result.assignments.forEach((a) => { a.trips = a.trips.filter((t) => t.personCodes.length) })
    result.assignments = result.assignments.filter((a) => a.trips.length)
    const m = scorePlan({ trips: result.assignments.flatMap((a) => a.trips), unserved: result.unassigned })
    result.metrics = { ...result.metrics, ...m }
    const events = { ...d.events }
    delete events[code]
    const failPlan = { ...d.failPlan }
    delete failPlan[code]
    set({ result, events, failPlan })
    return best.a.vehicleCode
  },


  // 서버 저장(회신 R34). 실패하면 이 브라우저 안에서만 진행하고 사유를 남긴다
  syncSave: async () => {
    const d = get()
    if (d.kind !== 'drill' || !['standby', 'assigned', 'sent'].includes(d.status)) return null
    const data = useMiriStore.getState()
    try {
      const r = await saveRemote(d, { scenario: activeScenario(data), villages: data.villages })
      set((s) => ({ remote: { ...s.remote, state: 'saved', dispatchId: r.dispatchId, tokens: { ...s.remote.tokens, ...r.tokens }, reason: null, savedAt: Date.now() } }))
      return r
    } catch (e) {
      set((s) => ({ remote: { ...s.remote, state: 'error', reason: e.message } }))
      return null
    }
  },
  // 새로고침 뒤 복원. 평시 상태일 때만 서버의 발령을 불러온다
  restoreRemote: async () => {
    if (get().status !== 'idle') return false
    try {
      const r = await loadRemote()
      if (!r?.state || get().status !== 'idle') return false
      const st = restoreSnapshot(r.state)
      const merged = mergeReports(st, r.reports)
      set({ ...EMPTY, ...st, ...merged, remote: { ...EMPTY.remote, state: 'saved', dispatchId: r.dispatchId, savedAt: Date.now(), polledAt: Date.now() } })
      return true
    } catch (e) {
      set((s) => ({ remote: { ...s.remote, state: 'error', reason: e.message } }))
      return false
    }
  },
  // 도우미 보고 주기 조회(담당자 화면 10초)
  pollReports: async () => {
    const d = get()
    if (d.status !== 'sent' || d.remote.state !== 'saved') return 0
    try {
      const r = await loadRemote()
      if (!r || r.dispatchId !== d.remote.dispatchId) return 0
      const merged = mergeReports(get(), r.reports)
      set((s) => ({ ...merged, remote: { ...s.remote, polledAt: Date.now() } }))
      return (r.reports || []).length
    } catch (e) {
      set((s) => ({ remote: { ...s.remote, reason: e.message } }))
      return 0
    }
  },
  // 차량 부족, 도우미 부족, 대피소 정원 부족 미배정자를 기한까지 기다리지 않고 소방에 지원 요청(회신 R34)
  requestFireSupport: () => {
    const d = get()
    if (!d.result) return null
    const done = new Set(Object.entries(d.events).filter(([, e]) => e.step === 'handedToFire').map(([c]) => c))
    const rows = d.result.unassigned.filter((u) => !done.has(u.personCode))
    if (!rows.length) return null
    const data = useMiriStore.getState()
    const pmap = new Map(data.persons.map((p) => [p.code, p]))
    const reasons = {}
    const villages = {}
    for (const u of rows) {
      reasons[u.reason] = (reasons[u.reason] || 0) + 1
      const v = pmap.get(u.personCode)?.villageCode
      if (v) villages[v] = (villages[v] || 0) + 1
    }
    const vnow = vnowOf(d)
    const codes = rows.map((u) => u.personCode)
    const events = { ...d.events }
    for (const u of rows) events[u.personCode] = { step: 'handedToFire', reason: u.reason, at: vnow }
    const req = { at: vnow, count: codes.length, reasons, villages, codes }
    set({ events, fireRequests: [...d.fireRequests, req], handovers: [...d.handovers, { at: vnow, codes, receiver: '동해소방서 지원 요청(미배정)', kind: 'support', reasons }] })
    return req
  },

  handover: (codes) => {
    const d = get()
    const vnow = vnowOf(d)
    const events = { ...d.events }
    codes.forEach((c) => { events[c] = { step: 'handedToFire', reason: d.events[c]?.reason || d.failPlan[c]?.reason || 'capacity', at: vnow } })
    set({ events, handovers: [...d.handovers, { at: vnow, codes, receiver: '동해소방서' }] })
  },

  close: () => {
    const d = get()
    const data = useMiriStore.getState()
    const vnow = vnowOf(d)
    const stops = indexStops(d.result)
    const counts = {}
    const byVillage = {}
    // 이번 발령 대상(배정 때 고정한 명단)만 집계한다. 구역 밖 주민을 미배정으로 세지 않는다(GPT 검토 M1)
    const scope = new Set(d.scopeCodes || [])
    for (const p of data.persons) {
      if (p.review === 'rejected' || !scope.has(p.code)) continue
      let s = stepOf(d, p.code, vnow, stops)
      if (!s) s = d.events[p.code]?.step || 'unassigned'
      counts[s] = (counts[s] || 0) + 1
      const row = byVillage[p.villageCode] || (byVillage[p.villageCode] = { total: 0, done: 0, failed: 0, fire: 0 })
      row.total += 1
      if (s === 'handover') row.done += 1
      else if (s === 'handedToFire') row.fire += 1
      else row.failed += 1
    }
    const id = `R-${new Date(d.realStart).getTime()}`
    data.addRecord({
      id, kind: d.kind, startedAt: d.issuedAt || d.vStart, closedAt: vnow, counts, byVillage,
      metrics: d.result?.metrics, initialMetrics: d.result?.initialMetrics, baseline: d.result?.baseline?.metrics, handovers: d.handovers, targets: scope.size,
      helpers: d.result ? d.result.assignments.flatMap((a) => a.helperCodes).length : 0
    })
    clearRemote().catch(() => {})
    set({ ...EMPTY, status: 'closed', closedRecordId: id })
  },
  reset: () => set({ ...EMPTY })
}))

// 발령 상태가 바뀌면 1.5초 뒤 서버에 저장(브라우저에서만)
if (typeof window !== 'undefined') {
  let timer = null
  const WATCH = ['status', 'result', 'confirmedAt', 'ackOverride', 'events', 'handovers', 'arrivals']
  useDispatchStore.subscribe((s, prev) => {
    if (!WATCH.some((k) => s[k] !== prev[k])) return
    if (s.kind !== 'drill' || !['standby', 'assigned', 'sent'].includes(s.status)) return
    clearTimeout(timer)
    timer = setTimeout(() => { useDispatchStore.getState().syncSave() }, 1500)
  })
}

export { snapshotOf }
export default useDispatchStore
