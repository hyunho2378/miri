// node tests/fixesA.test.mjs 회신 R34(외부 개발자 사용 의견) 화면 간 숫자 통일과 지도 라벨 겹침 회귀 시험
import assert from 'node:assert/strict'
import { runOptimize, planDispatch } from '../src/lib/assign.js'
import { calcTiming, calcVehicles, computeShortage, optimizedUnserved, scenarioArrivals, scopeInput } from '../src/lib/shortageCalc.js'
import { dispatchBasisText, peaceBasisText, pendingCounts } from '../src/lib/basis.js'
import { placeLabels } from '../src/lib/labelLayout.js'
import { seedFieldNotes } from '../src/lib/notes.js'
import { buildSeed } from '../src/mock/seed.js'

let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const MIN = 60000

await ok('A1 추천 배정 효과는 기기 속도와 무관(시간 제한 없이 고정 횟수 탐색), 현황판과 발령 직후 발령 운영이 같은 값', () => {
  const seed = buildSeed(); const sc = seed.scenarios[0]
  const r = computeShortage({ ...seed, scenario: sc, t0: seed.today })
  assert.equal(r.total, 291)
  // 느린 기기를 흉내 내도(시계를 크게 돌려도) 결과가 같다
  const realNow = performance.now.bind(performance)
  let fake = 0
  performance.now = () => (fake += 50)
  const slow = runOptimize(r.ctx).metrics.unserved
  performance.now = realNow
  assert.equal(slow, 267)
  assert.equal(optimizedUnserved(r), 267)
  const sp = scopeInput({ persons: seed.persons, villages: seed.villages, scenario: sc, settings: seed.settings })
  const arrivals = scenarioArrivals(sc, sp.villages, seed.today)
  const p = planDispatch({ persons: sp.persons, villages: sp.villages, vehicles: calcVehicles(seed.vehicles, sc), helpers: seed.helpers, t0: seed.today, arrivals, ...calcTiming(sc, seed.settings) })
  assert.equal(p.baseline.metrics.unserved, 291)
  assert.equal(p.metrics.unserved, 267)
})

await ok('A1 발령 개시 뒤 흐른 시간만큼 값이 달라지며, 기준 문구에 경과 시간을 밝힌다', () => {
  const seed = buildSeed(); const sc = seed.scenarios[0]
  const sp = scopeInput({ persons: seed.persons, villages: seed.villages, scenario: sc, settings: seed.settings })
  const arrivals = scenarioArrivals(sc, sp.villages, seed.today)
  const p = planDispatch({ persons: sp.persons, villages: sp.villages, vehicles: calcVehicles(seed.vehicles, sc), helpers: seed.helpers, t0: seed.today + 10 * MIN, arrivals, ...calcTiming(sc, seed.settings) })
  assert.ok(p.baseline.metrics.unserved > 291)
  const txt = dispatchBasisText({ at: seed.today + 10 * MIN, elapsedMin: 10, targets: 848, villages: 12 })
  assert.match(txt, /발령 개시 10분 경과 기준/)
  assert.match(txt, /12개 마을 848명/)
  assert.match(dispatchBasisText({ at: seed.today, elapsedMin: 0, targets: 848, villages: 12 }), /발령 개시 직후 기준/)
  assert.match(peaceBasisText({ villages: 12, targets: 848 }), /평시 기준, 발령 직후 출발 가정/)
})

await ok('A1 발령 운영 계산 결과에 기준(개시 시각, 경과 분, 범위)이 남고, 배속을 바꿔도 개시 시각은 그대로', async () => {
  const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
  const st = useDispatchStore.getState()
  st.start({ kind: 'drill', speed: 60 })
  const issued = useDispatchStore.getState().issuedAt
  useDispatchStore.getState().setSpeed(1)
  assert.equal(useDispatchStore.getState().issuedAt, issued)
  const res = useDispatchStore.getState().runAssign()
  assert.ok(res.basis)
  assert.equal(res.basis.villages, 12)
  assert.equal(res.basis.targets, 848)
  assert.ok(res.basis.elapsedMin >= 0 && res.basis.elapsedMin < 5)
})

await ok('A2 왕복 시간은 대피 시나리오의 대피소 기준 값을 쓴다(발한동 평시 23분, 시나리오 38분)', () => {
  const seed = buildSeed(); const sc = seed.scenarios[0]
  const r = computeShortage({ ...seed, scenario: sc, t0: seed.today })
  const v = seed.villages.find((x) => x.code === 'BH-01')
  assert.equal(v.roundTripMin, 23)
  assert.equal(r.ctx.vmap['BH-01'].roundTripMin, 38)
})

await ok('A3 확인 대기 건수는 범위별로 나눠 센다(대피 대상 구역 서류 4, 명부 전체 서류 7, 현장 소식 3, 메뉴 배지 합계 10)', () => {
  const seed = buildSeed(); const sc = seed.scenarios[0]
  const r = computeShortage({ ...seed, scenario: sc, t0: seed.today })
  const scopeCodes = new Set(Object.entries(r.byVillage).filter(([, x]) => x.inScope).map(([c]) => c))
  const pc = pendingCounts({ persons: seed.persons, fieldNotes: seedFieldNotes(seed.persons, seed.today), scopeVillageCodes: scopeCodes })
  assert.deepEqual(pc, { docsAll: 7, docsInScope: 4, notes: 3, total: 10 })
  const provisional = Object.values(r.byVillage).filter((x) => x.inScope).reduce((s, x) => s + x.provisional, 0)
  assert.equal(provisional, pc.docsInScope)
})

await ok('A4 지도 라벨: 겹치면 옮기고, 자리가 없으면 숨기되 선택한 마을은 숨기지 않는다', () => {
  const box = (code, x, y, priority) => ({ code, x, y, w: 40, h: 24, priority })
  const two = placeLabels([box('A', 100, 100, 10), box('B', 104, 102, 5)])
  assert.deepEqual(two.A, { dx: 0, dy: 0, hidden: false })
  assert.equal(two.B.hidden, false)
  assert.notDeepEqual([two.B.dx, two.B.dy], [0, 0])
  const many = Array.from({ length: 7 }, (_, i) => box(`V${i}`, 100, 100, 10 - i))
  const out = placeLabels(many)
  assert.ok(Object.values(out).some((p) => p.hidden))
  assert.equal(out.V0.hidden, false)
  const sel = placeLabels(many, { selected: 'V6' })
  assert.equal(sel.V6.hidden, false)
  assert.deepEqual(sel.V6, { dx: 0, dy: 0, hidden: false })
  // 떨어진 라벨은 그대로
  const far = placeLabels([box('A', 0, 0, 1), box('B', 300, 300, 1)])
  assert.deepEqual(far.B, { dx: 0, dy: 0, hidden: false })
})

console.log(`\n${n}개 시험 통과`)
