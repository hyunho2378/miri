// node tests/logic.test.mjs 계산 로직 단위 테스트
import assert from 'node:assert/strict'
import { formulaShortage } from '../src/lib/shortage.js'
import { buildContext, runBaseline, runOptimize, planDispatch } from '../src/lib/assign.js'
import { computeShortage, requiredExtraVehicles } from '../src/lib/shortageCalc.js'
import { verifyResult } from '../src/lib/intake.js'
import { detectAnomalies } from '../src/lib/anomaly.js'
import { buildSeed } from '../src/mock/seed.js'

let n = 0
const ok = (name, fn) => { fn(); n += 1; console.log('ok', name) }

ok('원문 예시: 침상 12 차량 2 왕복 120 → 부족 6', () => {
  const f = formulaShortage({ persons: 12, vehicles: 2, roundTripMinutes: 120 })
  assert.equal(f.availableMinutes, 420); assert.equal(f.trips, 3); assert.equal(f.movable, 6); assert.equal(f.shortage, 6)
})

ok('배정 기준선과 최적화가 원문 예시에서 같은 미이송 6', () => {
  const t0 = Date.UTC(2026, 3, 5, 0, 0)
  const persons = Array.from({ length: 12 }, (_, i) => ({ code: `P${String(i).padStart(2, '0')}`, villageCode: 'V1', grade: 'bed' }))
  const input = { persons, villages: [{ code: 'V1', roundTripMin: 120 }], vehicles: [{ code: 'A', type: 'ambulance' }, { code: 'B', type: 'ambulance' }], t0 }
  const ctx = buildContext(input)
  assert.equal(runBaseline(ctx).metrics.unserved, 6)
  assert.equal(runOptimize(ctx).metrics.unserved, 6)
})

const seed = buildSeed()
const scenario = seed.scenarios[0]
const t0 = seed.today
ok('가상 데이터 규모', () => {
  assert.equal(seed.villages.length, 18)
  assert.equal(seed.vehicles.filter((v) => v.type === 'ambulance').length, 6)
  console.log('   대상자', seed.persons.length, '등급', JSON.stringify(seed.persons.reduce((m, p) => (m[p.grade] = (m[p.grade] || 0) + 1, m), {})))
})

let sh
ok('평시 부족분 계산', () => {
  sh = computeShortage({ ...seed, scenario, t0 })
  console.log('   총 부족', sh.total, '등급별', JSON.stringify(sh.byGrade), '잠정', sh.provisional)
  console.log('   공식표', sh.formula.map((f) => `${f.grade} 대상${f.persons} 차${f.vehicles} 왕복${f.roundTrip} 회${f.trips} 가능${f.movable} 부족${f.shortage}`).join(' | '))
})

ok('필요 추가 차량으로 부족분 해소', () => {
  const ex = requiredExtraVehicles({ ...seed, scenario, t0 }, sh)
  console.log('   ', JSON.stringify(ex))
  ex.forEach((e) => assert.equal(e.resolved, true))
})

ok('최적화는 기준선보다 나쁘지 않음 (두 시나리오)', () => {
  for (const sc of seed.scenarios) {
    const arrivals = Object.fromEntries(seed.villages.map((v) => [v.code, t0 + (8 + sc.offsetHours[v.code]) * 3600000]))
    const p = planDispatch({ ...seed, persons: seed.persons, t0, arrivals, prepMinutes: 60, windowHours: 8, completeBeforeHours: 0 })
    console.log('   ', sc.id, '기준선 미이송', p.baseline.metrics.unserved, '가중', p.baseline.metrics.weightedUnserved, '| 최적화', p.metrics.unserved, '가중', p.metrics.weightedUnserved, 'rule', p.rule, p.elapsedMs + 'ms', '차량묶음', p.assignments.length, '도우미경고', p.warnings.length)
    assert.ok(p.metrics.weightedUnserved <= p.baseline.metrics.weightedUnserved)
    for (const a of p.assignments) for (const tr of a.trips) assert.ok(tr.finishAt <= p.ctx.deadlines[tr.village].completeBy)
    const all = new Set(); for (const a of p.assignments) for (const tr of a.trips) for (const c of tr.personCodes) { assert.ok(!all.has(c)); all.add(c) }
    assert.equal(all.size + p.unassigned.length, seed.persons.length)
  }
})

ok('판독 원문 대조: 전사문에 없는 근거 문구는 신뢰도 하', () => {
  const doc = seed.intakeDocs[2]
  const r = verifyResult(doc.transcript, doc.results[1])
  assert.equal(r.quoteMatched, false); assert.equal(r.confidence, 'low')
  const r2 = verifyResult(doc.transcript, doc.results[0])
  assert.equal(r2.quoteMatched, true)
})

ok('이상 탐지 규칙', () => {
  const a = detectAnomalies({ ...seed, now: t0 })
  const rules = a.reduce((m, x) => (m[x.rule] = (m[x.rule] || 0) + 1, m), {})
  console.log('   ', JSON.stringify(rules))
  for (const k of ['pendingLong', 'gradeConflict', 'duplicate', 'contract', 'helperLoad']) assert.ok(rules[k] > 0, k)
})
console.log(`${n} passed`)
