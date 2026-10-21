// node tests/clockSpeed.test.mjs GPT 10차 확인: 배속을 바꾸면 콘솔 발령 띠의 경과 시간이 0분으로 돌아가던 결함 회귀 시험
import assert from 'node:assert/strict'
import { elapsedMinOf, elapsedMsOf, virtualAt, withSpeed } from '../src/lib/clock.js'
import { vnowOf } from '../src/lib/dispatchSim.js'
import { clockNow } from '../src/lib/dispatchSync.js'

let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const MIN = 60000
const T0 = Date.UTC(2026, 9, 21, 5, 0)

// 화면별 경과 분 계산: 콘솔 발령 띠, 현장 휴대폰 F1, 도우미 휴대폰(서버 배정 요약 시계)
const bannerMin = (d, real) => Math.floor(elapsedMsOf(d, vnowOf(d, real)) / MIN)
const fieldMin = (d, real) => elapsedMinOf(d, vnowOf(d, real))
const helperVnow = (d, real) => clockNow({ realStart: d.realStart, vStart: d.vStart, speed: d.speed }, real)

await ok('S1 옛 발령 띠 계산(now - vStart)은 배속 변경 직후 0분으로 돌아감을 재현', () => {
  const d = { realStart: T0, vStart: T0, issuedAt: T0, speed: 60 }
  const real = T0 + MIN // 실제 1분, 가상 60분
  assert.equal(Math.floor((vnowOf(d, real) - d.vStart) / MIN), 60)
  const after = { ...d, ...withSpeed(d, 10, real) }
  assert.equal(Math.floor((vnowOf(after, real) - after.vStart) / MIN), 0) // 결함 재현
  assert.equal(bannerMin(after, real), 60) // 새 계산은 그대로 60분
})

await ok('S2 배속 1, 60, 1 로 바꿔도 가상 시계와 경과 시간이 끊기지 않고 줄지 않는다(콘솔, 현장, 도우미 일치)', () => {
  let d = { realStart: T0, vStart: T0, issuedAt: T0, speed: 1 }
  const plan = [[0, 1], [5 * MIN, 60], [7 * MIN, 1], [9 * MIN, 60]]
  let prevV = -Infinity; let prevE = -1
  for (const [at, sp] of plan) {
    const real = T0 + at
    const before = vnowOf(d, real)
    d = { ...d, ...withSpeed(d, sp, real) }
    assert.equal(vnowOf(d, real), before, '배속 변경 순간 가상 시각 동일')
    for (let s = 0; s <= 120; s += 15) {
      const r = real + s * 1000
      const v = vnowOf(d, r)
      assert.ok(v >= prevV, '가상 시각 역행 없음'); prevV = v
      const e = bannerMin(d, r)
      assert.ok(e >= prevE, `경과 ${e} < ${prevE}`); prevE = e
      assert.equal(Math.round(helperVnow(d, r)), Math.round(v), '도우미 시계 = 담당자 시계')
      assert.ok(Math.abs(fieldMin(d, r) - e) <= 1, '현장 F1 과 콘솔 발령 띠 차이 1분 이내(반올림 차)')
    }
  }
  // 1배속 5분 + 60배속 2분(120분) + 1배속 2분 = 127분, 마지막 60배속 구간 시작 시점
  assert.equal(elapsedMinOf(d, vnowOf(d, T0 + 9 * MIN)), 127)
})

await ok('S3 store.setSpeed 는 실제 시각 하나로 기준점을 옮기고 개시 시각을 지킨다', async () => {
  const realNow = Date.now
  let fake = T0
  Date.now = () => fake
  try {
    const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
    useDispatchStore.getState().start({ kind: 'drill', speed: 60 })
    fake = T0 + MIN
    const d0 = useDispatchStore.getState()
    const v0 = vnowOf(d0, fake)
    assert.equal(bannerMin(d0, fake), 60)
    useDispatchStore.getState().setSpeed(10)
    const d1 = useDispatchStore.getState()
    assert.equal(d1.issuedAt, T0)
    assert.equal(d1.realStart, fake)
    assert.equal(d1.vStart, v0)
    assert.equal(bannerMin(d1, fake), 60)
    fake = T0 + 2 * MIN
    assert.equal(bannerMin(useDispatchStore.getState(), fake), 70)
    useDispatchStore.getState().setSpeed(1)
    fake = T0 + 3 * MIN
    assert.equal(bannerMin(useDispatchStore.getState(), fake), 71)
    assert.equal(virtualAt({ realStart: d1.realStart, vStart: d1.vStart, speed: 10 }, T0 + 2 * MIN), T0 + 70 * MIN)
  } finally { Date.now = realNow }
})


console.log(`\n${n}개 시험 통과`)
