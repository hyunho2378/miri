// useDispatchStore.js 발령 상태 머신. 평시 → 실행대기 발령 → 배정 → 전송 → 종료.
// 가상 시계: 훈련 발령은 배속으로 진행해 8시간 창을 몇 분 안에 시연한다.
import { create } from 'zustand'
import { planDispatch } from '../lib/assign.js'
import { capOf } from '../lib/shortage.js'
import { scenarioArrivals, scopeInput } from '../lib/shortageCalc.js'
import { indexStops, stepOf, vnowOf } from '../lib/dispatchSim.js'
import { MIN } from '../lib/time.js'
import { activeScenario, useMiriStore } from './useMiriStore.js'

const EMPTY = {
  status: 'idle', kind: 'drill', speed: 60, realStart: 0, vStart: 0, arrivals: {},
  result: null, confirmedAt: null, sentAt: null, ackPlan: {}, ackOverride: {}, failPlan: {}, events: {},
  handovers: [], manualHelper: null, smsLog: [], closedRecordId: null
}

export const useDispatchStore = create((set, get) => ({
  ...EMPTY,

  start: ({ kind = 'drill', speed = 60 } = {}) => {
    const data = useMiriStore.getState()
    const sc = activeScenario(data)
    const now = Date.now()
    // 대피 대상 구역 마을만 도달 시각을 둔다
    const sp = scopeInput({ persons: data.persons, villages: data.villages, scenario: sc, settings: data.settings })
    set({
      ...EMPTY, status: 'standby', kind, speed, realStart: now, vStart: now,
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
    const result = planDispatch({
      persons: sp.persons.filter((p) => codes.has(p.villageCode)), villages: sp.villages.filter((v) => codes.has(v.code)),
      vehicles: data.vehicles, helpers: data.helpers, t0: vnowOf(d), arrivals: d.arrivals,
      prepMinutes: sc?.prepMinutes ?? data.settings.prepMinutes, windowHours: sc?.windowHours ?? data.settings.windowHours,
      completeBeforeHours: data.settings.completeBeforeHours
    })
    set({ result, status: 'assigned' })
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
    const smsLog = helpers.map((h) => ({ helper: h, at: vnow, text: `[미리] ${h} 배정 도착. 링크에서 수락 또는 불가 응답` }))
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
    const grades = [...new Set(a.trips.map((t) => t.grade))]
    const next = data.helpers.find((h) => !used.has(h.code) && grades.some((g) => h.grades.includes(g)))
    if (!next) return null
    const result = structuredClone(d.result)
    const ra = result.assignments.find((x) => x.vehicleCode === a.vehicleCode)
    ra.helperCodes = ra.helperCodes.map((c) => (c === oldCode ? next.code : c))
    const vnow = vnowOf(d)
    set({
      result,
      ackOverride: { ...d.ackOverride, [next.code]: { answer: 'accept', at: vnow, replaced: oldCode } },
      smsLog: [...d.smsLog, { helper: next.code, at: vnow, text: `[미리] ${next.code} 대체 배정 도착` }]
    })
    return next.code
  },

  // 실패 대상자 재배정: 지금 이후 가장 빨리 비는 호환 차량에 새 회차 추가
  reassign: (code) => {
    const d = get()
    const data = useMiriStore.getState()
    const person = data.persons.find((p) => p.code === code)
    const village = data.villages.find((v) => v.code === person.villageCode)
    const vnow = vnowOf(d)
    const completeBy = d.arrivals[village.code] - data.settings.completeBeforeHours * 60 * MIN
    const result = structuredClone(d.result)
    let best = null
    // 같은 등급을 태울 수 있는 가용 차량 전체에서, 지금 이후 가장 빨리 비는 차량
    for (const vehicle of data.vehicles) {
      if (vehicle.available === false || capOf(vehicle, person.grade) === 0) continue
      const a = result.assignments.find((x) => x.vehicleCode === vehicle.code)
      const free = Math.max(vnow, ...(a ? a.trips.map((t) => t.finishAt) : []))
      const finish = free + village.roundTripMin * MIN
      if (finish <= completeBy && (!best || finish < best.finish)) best = { a, vehicle, free, finish }
    }
    if (!best) return false
    for (const a of result.assignments) for (const tr of a.trips) tr.personCodes = tr.personCodes.filter((c) => c !== code)
    result.unassigned = result.unassigned.filter((u) => u.personCode !== code)
    if (!best.a) {
      best.a = { vehicleCode: best.vehicle.code, trips: [], helperCodes: [], reasons: ['실패 대상자 재배정용 추가 차량'] }
      result.assignments.push(best.a)
    }
    best.a.trips.push({ index: best.a.trips.length + 1, vehicle: best.a.vehicleCode, village: village.code, grade: person.grade, personCodes: [code], departAt: best.free, finishAt: best.finish, added: true })
    const events = { ...d.events }
    delete events[code]
    const failPlan = { ...d.failPlan }
    delete failPlan[code]
    set({ result, events, failPlan })
    return best.a.vehicleCode
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
    for (const p of data.persons) {
      if (p.review === 'rejected') continue
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
      id, kind: d.kind, startedAt: d.vStart, closedAt: vnow, counts, byVillage,
      metrics: d.result?.metrics, baseline: d.result?.baseline?.metrics, handovers: d.handovers,
      helpers: d.result ? d.result.assignments.flatMap((a) => a.helperCodes).length : 0
    })
    set({ ...EMPTY, status: 'closed', closedRecordId: id })
  },
  reset: () => set({ ...EMPTY })
}))

export default useDispatchStore
