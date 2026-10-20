// node tests/fixes.test.mjs GPT 코드 검토(2026. 10. 20.) 지적 수정의 회귀 시험
import assert from 'node:assert/strict'
import { buildContext, runBaseline, planDispatch } from '../src/lib/assign.js'
import { calcTiming, calcVehicles, computeShortage, scenarioArrivals, scopeInput } from '../src/lib/shortageCalc.js'
import { inScopeSet, resolveVillages } from '../src/lib/scenario.js'
import { stepOf } from '../src/lib/dispatchSim.js'
import { readNote } from '../src/lib/notes.js'
import { buildSeed } from '../src/mock/seed.js'

let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const t0 = Date.UTC(2026, 3, 5, 0, 0)

await ok('S1 평일 낮 발령 기준선이 평시 부족분과 같다(차량 시간대 통일)', () => {
  const seed = buildSeed()
  const sc = { ...seed.scenarios[0], timeBand: 'day' }
  const sh = computeShortage({ ...seed, scenario: sc, t0: seed.today })
  const sp = scopeInput({ persons: seed.persons, villages: seed.villages, scenario: sc, settings: seed.settings })
  const arrivals = scenarioArrivals(sc, sp.villages, seed.today)
  const p = planDispatch({ persons: sp.persons, villages: sp.villages, vehicles: calcVehicles(seed.vehicles, sc), helpers: seed.helpers, t0: seed.today, arrivals, ...calcTiming(sc, seed.settings) })
  assert.equal(p.baseline.metrics.unserved, sh.total)
  assert.equal(sh.total, 216)
  assert.equal(p.ctx.vehicles.length, 30)
})

await ok('S1 가용률 0이면 발령에도 차량이 없다', () => {
  const vs = [{ code: 'A', type: 'car' }, { code: 'B', type: 'car' }]
  assert.equal(calcVehicles(vs, { availability: 0 }).length, 0)
  assert.equal(calcVehicles(vs, { extraVehicles: { car: 2 } }).length, 4)
})

await ok('S2 도우미가 없으면 휠체어 대상은 미이송(도우미 부족)', () => {
  const input = { persons: [{ code: 'P1', villageCode: 'V1', grade: 'wheelchair' }], villages: [{ code: 'V1', roundTripMin: 60 }], vehicles: [{ code: 'L', type: 'liftVan' }], t0 }
  const none = runBaseline(buildContext({ ...input, helpers: [] }))
  assert.equal(none.unserved.length, 1)
  assert.equal(none.unserved[0].reason, 'noHelper')
  const two = planDispatch({ ...input, helpers: [{ code: 'H1', grades: ['wheelchair'], villages: ['V1'] }, { code: 'H2', grades: ['wheelchair'], villages: [] }] })
  assert.equal(two.unassigned.length, 0)
  assert.deepEqual(two.assignments[0].helperCodes.sort(), ['H1', 'H2'])
  assert.equal(two.warnings.length, 0)
  // 지원 등급이 다른 도우미만 있으면 배정하지 않는다
  const wrong = runBaseline(buildContext({ ...input, helpers: [{ code: 'H1', grades: ['assist'], villages: [] }, { code: 'H2', grades: ['assist'], villages: [] }] }))
  assert.equal(wrong.unserved.length, 1)
  // helpers 를 넘기지 않으면 이전처럼 차량만 본다(원문 공식 예시와 같은 조건)
  assert.equal(runBaseline(buildContext(input)).unserved.length, 0)
})

await ok('S3 나눠 보내면 가장 먼 대피소 시간으로 왕복을 계산한다', () => {
  const shelters = [{ code: 'S1', capacity: 1, villageCode: 'X' }, { code: 'S2', capacity: 2, villageCode: 'Y' }]
  const villages = [{ code: 'V', shelterCode: 'S1', drive: [['S1', 1, 1], ['S2', 50, 40]] }]
  const persons = ['a', 'b', 'c'].map((c) => ({ code: c, villageCode: 'V', grade: 'walk' }))
  const r = resolveVillages({ villages, persons, scenario: { affected: ['V'] }, shelters, settings: { boardingMinutes: 20 } })
  const v = r.villages[0]
  assert.equal(v.shelterNote, 'split')
  assert.equal(v.roundTripMin, 2 * 50 + 20)
})

await ok('S3 구역 밖 안전한 대피소가 없으면 배정하지 않는다', () => {
  const shelters = [{ code: 'S1', capacity: 10, villageCode: 'V' }]
  const villages = [{ code: 'V', shelterCode: 'S1', drive: [['S1', 5, 3]] }]
  const persons = [{ code: 'a', villageCode: 'V', grade: 'walk' }]
  const r = resolveVillages({ villages, persons, scenario: { affected: ['V'], avoidAffectedShelters: true }, shelters })
  assert.equal(r.villages[0].shelterNote, 'noSafeShelter')
  assert.equal(r.villages[0].roundTripMin, null)
  const plan = runBaseline(buildContext({ persons, villages: r.villages, vehicles: [{ code: 'B', type: 'bus' }], helpers: [{ code: 'H', grades: ['walk'], villages: [] }], t0 }))
  assert.equal(plan.unserved.length, 1)
  assert.equal(plan.unserved[0].reason, 'noShelter')
})

await ok('S5 실제 발령은 시간 경과로 자동 완료되지 않는다', () => {
  const stops = { P: { helperCodes: ['H'], trip: { departAt: 0, finishAt: 10 }, order: 0 } }
  const d = { events: {}, status: 'sent', manualHelper: null, failPlan: {}, kind: 'real' }
  assert.equal(stepOf(d, 'P', 100, stops), 'wait')
  assert.equal(stepOf({ ...d, kind: 'drill' }, 'P', 100, stops), 'handover')
})

await ok('M5 영향 마을이 빈 배열이면 0곳, 없으면 전체', () => {
  const vs = [{ code: 'V' }, { code: 'W' }]
  assert.equal(inScopeSet({ affected: [] }, vs).size, 0)
  assert.equal(inScopeSet({}, vs).size, 2)
})

await ok('M2 글 소식은 입력 원문으로 근거를 대조한다', async () => {
  const orig = globalThis.fetch
  globalThis.fetch = async () => ({ ok: true, json: async () => ({ transcript: '어르신이 휠체어를 쓰십니다', quote: '휠체어를 쓰십니다', grade: 'wheelchair', confidence: 'high' }) })
  try {
    const r = await readNote({ text: '오늘 산책을 다녀오셨습니다', current: { grade: 'walk', tags: [] } })
    assert.equal(r.quoteMatched, false)
    assert.equal(r.confidence, 'low')
  } finally { globalThis.fetch = orig }
})

await ok('S5, M1, M6 발령 저장소: 실제 발령 차단, 종료 집계는 발령 대상만, 지표 갱신', async () => {
  const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
  const { useMiriStore } = await import('../src/store/useMiriStore.js')
  const D = useDispatchStore
  assert.equal(D.getState().start({ kind: 'real' }), false)
  D.getState().start({ kind: 'drill', speed: 60 })
  const r = D.getState().runAssign()
  assert.equal(D.getState().scopeCodes.length, 848)
  assert.equal(r.initialMetrics.unserved, r.metrics.unserved)
  D.getState().confirmAndSend()
  const code = r.unassigned[0]?.personCode
  if (code) D.getState().reassign(code)
  assert.equal(D.getState().result.metrics.unserved, D.getState().result.unassigned.length)
  D.getState().close()
  const recs = useMiriStore.getState().records || []
  const rec = recs.find((x) => x.id === D.getState().closedRecordId)
  assert.equal(rec.targets, 848)
  assert.equal(Object.values(rec.counts).reduce((a, b) => a + b, 0), 848)
})

console.log(`\n${n}개 시험 통과`)
