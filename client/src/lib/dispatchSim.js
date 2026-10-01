// dispatchSim.js 발령 진행 상태 계산. 가상 시계 기준으로 이송 단계를 결정한다.
// 수동 도우미(도우미 화면을 쓰는 사람)의 대상자는 자동 진행 없이 보고로만 바뀐다.
import { MIN } from './time.js'

export const STEPS = ['wait', 'depart', 'arrive', 'board', 'handover']
export const STEP_LABEL = { wait: '대기', depart: '출발', arrive: '도착', board: '탑승', handover: '인계 완료', fail: '실패', handedToFire: '소방 인계' }
export const FAIL_REASONS = { absent: '부재', refuse: '이송 거부', blocked: '진입 불가', worse: '상태 악화', etc: '기타' }
export const DECLINE_REASONS = { far: '거리 멀음', health: '건강 문제', etc: '기타' }

export const vnowOf = (d, real = Date.now()) => (d.realStart ? d.vStart + (real - d.realStart) * d.speed : real)

// 대상자 -> 소속 차량과 회차
export function indexStops(result) {
  const map = {}
  if (!result) return map
  for (const a of result.assignments) {
    for (const tr of a.trips) {
      tr.personCodes.forEach((code, i) => { map[code] = { vehicleCode: a.vehicleCode, helperCodes: a.helperCodes, trip: tr, order: i } })
    }
  }
  return map
}

export function autoStep(stop, vnow) {
  const { trip, order } = stop
  const span = trip.finishAt - trip.departAt
  const arrive = trip.departAt + span * 0.35
  const board = arrive + span * 0.05 * (order + 1)
  if (vnow < trip.departAt) return 'wait'
  if (vnow < arrive) return 'depart'
  if (vnow < board) return 'arrive'
  if (vnow < trip.finishAt) return 'board'
  return 'handover'
}

export function stepOf(d, code, vnow, stops) {
  const ov = d.events[code]
  if (ov) return ov.step
  const stop = stops[code]
  if (!stop) return null
  if (d.status !== 'sent') return 'wait'
  if (stop.helperCodes.includes(d.manualHelper)) return 'wait'
  const fail = d.failPlan[code]
  const s = autoStep(stop, vnow)
  if (fail && STEPS.indexOf(s) >= STEPS.indexOf('arrive')) return 'fail'
  return s
}

export function failReasonOf(d, code) {
  return d.events[code]?.reason || d.failPlan[code]?.reason
}

export function ackOf(d, helper, vnow) {
  if (d.ackOverride[helper]) return d.ackOverride[helper]
  const plan = d.ackPlan[helper]
  if (!plan || helper === d.manualHelper) return { answer: 'none' }
  return vnow >= plan.at ? plan : { answer: 'none' }
}

export function summarize(d, vnow, persons) {
  const stops = indexStops(d.result)
  const counts = { wait: 0, depart: 0, arrive: 0, board: 0, handover: 0, fail: 0, handedToFire: 0, unassigned: 0 }
  for (const p of persons) {
    const s = stepOf(d, p.code, vnow, stops)
    if (s) counts[s] += 1
  }
  counts.unassigned = d.result ? d.result.unassigned.filter((u) => !d.events[u.personCode]).length : 0
  return { counts, stops }
}

export { MIN }
