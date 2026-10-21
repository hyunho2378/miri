// dispatchSim.js 발령 진행 상태 계산. 가상 시계 기준으로 이송 단계를 결정한다.
// 수동 도우미(도우미 화면을 쓰는 사람)의 대상자는 자동 진행 없이 보고로만 바뀐다.
import { MIN, fmtHM } from './time.js'
import { vnowOfState } from './clock.js'

export const STEPS = ['wait', 'depart', 'arrive', 'board', 'handover']
export const STEP_LABEL = { wait: '대기', depart: '출발', arrive: '도착', board: '탑승', handover: '인계 완료', fail: '실패', handedToFire: '소방 인계' }
export const FAIL_REASONS = { absent: '부재', refuse: '이송 거부', blocked: '진입 불가', worse: '상태 악화', etc: '기타' }
export const DECLINE_REASONS = { far: '거리 멀음', health: '건강 문제', etc: '기타' }

// 입력은 실제 시각만(clock.js)
export const vnowOf = (d, real = Date.now()) => vnowOfState(d, real)

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
  // 시간 경과만으로 완료 처리하는 자동 진행은 훈련 시연에만 쓴다(GPT 검토 S5)
  if (d.kind && d.kind !== 'drill') return 'wait'
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

// 도우미 배정 안내(회신 반영: 수락 전에 재난 종류, 마을, 이송 완료 기한, 만나는 곳, 동승 도우미를 본다)
// result: planDispatch 결과, me: 도우미 코드, scenario: 발령 시나리오, villages: 마을 목록
export function helperBrief({ result, me, scenario, villages = [], hazardLabel }) {
  const a = result?.assignments?.find((x) => x.helperCodes.includes(me))
  if (!a) return null
  const trips = [...a.trips].sort((x, y) => x.index - y.index)
  const label = (code) => result?.ctx?.vmap?.[code]?.label || villages.find((v) => v.code === code)?.label || code
  const villageCodes = [...new Set(trips.map((t) => t.village))]
  const limits = villageCodes.map((c) => result?.ctx?.deadlines?.[c]?.completeBy).filter((x) => Number.isFinite(x))
  return {
    disaster: hazardLabel || (scenario?.kind && scenario.kind !== 'fire' ? scenario.kind : '산불'),
    vehicleCode: a.vehicleCode,
    villages: villageCodes.map(label),
    completeBy: limits.length ? Math.min(...limits) : null,
    meetVillage: trips[0] ? label(trips[0].village) : null,
    firstDepartAt: trips[0]?.departAt ?? null,
    coHelpers: a.helperCodes.filter((c) => c !== me),
    persons: trips.reduce((n, t) => n + t.personCodes.length, 0)
  }
}

// 배정 문자 문안. 90바이트(EUC-KR 기준 한글 2바이트) 이하는 단문, 넘으면 장문
export function smsBytes(text) { let n = 0; for (const ch of text) n += ch.charCodeAt(0) > 127 ? 2 : 1; return n }
export function dispatchSms(brief, { drill = true, link = '' } = {}) {
  if (!brief) return null
  const head = drill ? '[미리 훈련]' : '[미리]'
  const where = brief.villages.slice(0, 2).join(', ') + (brief.villages.length > 2 ? ` 외 ${brief.villages.length - 2}곳` : '')
  const until = brief.completeBy ? ` ${fmtHM(brief.completeBy)}까지 이송 완료` : ''
  const text = `${head} ${brief.disaster} 대피 이송 배정. ${where}, ${brief.persons}명${until}. 링크에서 수락 또는 불가 응답${link ? ' ' + link : ''}`
  const bytes = smsBytes(text)
  return { text, bytes, kind: bytes <= 90 ? '단문' : '장문' }
}

export { MIN }
