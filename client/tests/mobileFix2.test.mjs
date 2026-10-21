// 실서버 흐름 확인(2026. 10. 21.)에서 찾은 시계, 실패 수, 확인할 점, 링크 재발송, 소방 인계 메모 문제의 행동 시험
import assert from 'node:assert/strict'
import { virtualAt, vnowOfState, elapsedMinOf, minutesLeft } from '../src/lib/clock.js'
import { vnowOf } from '../src/lib/dispatchSim.js'
import { clockNow, briefsOf } from '../src/lib/dispatchSync.js'
import { mergeReports } from '../src/lib/reportQueue.js'
import { failedPending, fieldSummary } from '../src/mobile/field/fieldModel.js'

let n = 0
const t = (name, fn) => { fn(); n += 1; console.log('ok', name) }
const MIN = 60000
const T0 = Date.UTC(2026, 9, 21, 5, 0)

t('C1 경과 시간은 실제 시간에 대해 배속만큼 한 번만 늘고 줄지 않는다', () => {
  const d = { realStart: T0, vStart: T0, issuedAt: T0, speed: 60 }
  let prev = -1
  for (let s = 0; s <= 600; s += 30) {
    const v = vnowOf(d, T0 + s * 1000)
    const e = elapsedMinOf(d, v)
    assert.ok(e >= prev, `경과 ${e} < ${prev}`)
    prev = e
  }
  // 실제 10분, 배속 60 이면 가상 600분
  assert.equal(elapsedMinOf(d, vnowOf(d, T0 + 10 * MIN)), 600)
})

t('C1 옛 방식(가상 시각을 다시 가상 시각 함수에 넣음)은 배속이 두 번 곱해짐을 재현하고 새 방식은 아님', () => {
  const d = { realStart: T0, vStart: T0, issuedAt: T0, speed: 60 }
  const real = T0 + 5 * MIN
  const once = vnowOf(d, real)
  const twice = vnowOf(d, vnowOf(d, real)) // 이전 FieldScreens 계산
  assert.equal(elapsedMinOf(d, once), 300)
  assert.ok(elapsedMinOf(d, twice) > 10000) // 보고된 17384분 같은 폭증
})

t('C1 교체 저장과 보고 병합은 시계 값을 바꾸지 않는다', () => {
  const d = { realStart: T0, vStart: T0, issuedAt: T0, speed: 60, ackOverride: {}, events: {} }
  const m = mergeReports(d, [{ type: 'ack', helper: 'H-084', answer: 'accept', at: T0 + 60 * MIN }, { type: 'step', personCode: 'P1', step: 'depart', at: T0 + 70 * MIN }])
  const after = { ...d, ...m }
  assert.equal(after.realStart, d.realStart); assert.equal(after.vStart, d.vStart); assert.equal(after.speed, d.speed)
  assert.equal(vnowOf(after, T0 + MIN), vnowOf(d, T0 + MIN))
})

t('C2 도우미 남은 시간과 담당자 기한이 같은 실제 시각에서 일치', () => {
  const d = { realStart: T0, vStart: T0, issuedAt: T0, speed: 60 }
  const clock = { realStart: d.realStart, vStart: d.vStart, speed: d.speed }
  const deadline = T0 + 8 * 60 * MIN
  for (const s of [0, 60, 240, 470]) {
    const real = T0 + s * 1000
    assert.equal(minutesLeft(deadline, clockNow(clock, real)), minutesLeft(deadline, vnowOfState(d, real)))
  }
  // 실제 1초마다 가상 1분, 갑자기 건너뛰지 않음
  const a = minutesLeft(deadline, virtualAt(clock, T0 + 100 * 1000))
  const b = minutesLeft(deadline, virtualAt(clock, T0 + 101 * 1000))
  assert.equal(a - b, 1)
})

const persons = [{ code: 'P1', villageCode: 'V1' }, { code: 'P2', villageCode: 'V1' }, { code: 'P3', villageCode: 'V1' }]
const trip = { index: 1, village: 'V1', grade: 'G1', personCodes: ['P1', 'P2', 'P3'], departAt: T0, finishAt: T0 + 60 * MIN }
const dState = {
  status: 'sent', realStart: T0, vStart: T0, issuedAt: T0, speed: 60, scopeCodes: ['P1', 'P2', 'P3'], arrivals: { V1: T0 + 8 * 60 * MIN },
  result: { assignments: [{ vehicleCode: 'V-09', helperCodes: ['H-084'], trips: [trip] }], unassigned: [] },
  events: { P1: { step: 'fail', reason: 'absent', memo: '문 잠김', at: T0 + 30 * MIN } }, failPlan: { P2: { reason: 'refuse', at: T0 + 20 * MIN } },
  ackPlan: {}, ackOverride: {}
}

t('C3 F4 실패 대상자 수는 F1 실패 수와 같은 기준', () => {
  const vnow = T0 + 2 * 60 * MIN
  const s = fieldSummary(dState, persons, [{ code: 'V1', label: '괴란동' }], vnow)
  const f = failedPending(dState, persons, vnow)
  assert.equal(f.length, s.counts.fail)
  assert.equal(f.find((x) => x.code === 'P1')?.memo, '문 잠김')
})

t('C5 서버 배정 요약에 확인할 점 문구와 회차 경로 확인이 들어가고 이름은 없다', () => {
  const villages = [{ code: 'V1', label: '괴란동', shelterCode: 'S1', lat: 37.5, lon: 129.1 }]
  const ps = persons.map((p, i) => ({ ...p, name: `홍길동${i}`, care: i === 0 ? { companion: 'family', reachable: false } : null }))
  const shelters = [{ code: 'S1', name: '중앙초등학교', lat: 37.51, lon: 129.11 }]
  const briefs = briefsOf(dState, { scenario: { kind: 'fire' }, villages, persons: ps, shelters })
  const b = briefs['H-084']
  assert.ok(Array.isArray(b.notes))
  assert.ok(b.trips.every((x) => typeof x.routeCheck === 'boolean'))
  assert.ok(!JSON.stringify(b).includes('홍길동'))
})

const { default: useDispatchStore } = await import('../src/store/useDispatchStore.js')
t('추가 소방 인계 때 실패 메모와 인계 기록 보존', () => {
  useDispatchStore.setState({ ...dState, handovers: [], fireRequests: [], smsLog: [] })
  useDispatchStore.getState().handover(['P1'])
  const e = useDispatchStore.getState().events.P1
  assert.equal(e.step, 'handedToFire'); assert.equal(e.memo, '문 잠김'); assert.equal(e.reason, 'absent')
})
t('C4 도우미 링크 문자 재발송은 기록만 남김', () => {
  useDispatchStore.setState({ ...dState, smsLog: [] })
  assert.equal(useDispatchStore.getState().resendLink('H-084'), true)
  assert.equal(useDispatchStore.getState().resendLink('H-999'), false)
  assert.equal(useDispatchStore.getState().smsLog.length, 1)
})

console.log(`${n}개 시험 통과`)
