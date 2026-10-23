// 플랫폼 AI 코딩 검토 지적 반영: 경로 정보 없음, 필요 차종 없음 사유 구분. 기준 숫자 불변
import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSeed } from '../src/mock/seed.js'
import { buildContext, runBaseline, runOptimize, UNSERVED_REASON } from '../src/lib/assign.js'
import { computeShortage, optimizedUnserved } from '../src/lib/shortageCalc.js'
import { resolveVillages } from '../src/lib/scenario.js'

const t0 = Date.UTC(2026, 9, 23, 0, 0)
const s = buildSeed(), sc = s.scenarios[0]
const inp = (patch = {}) => ({ ...s, scenario: { ...sc, ...patch }, t0: s.today })

test('경로 자료가 없는 마을은 noRoute(경로 정보 없음)로 따로 센다', () => {
  const villages = [{ code: 'V', shelterCode: 'S1', roundTripMin: null }]
  const persons = [{ code: 'a', villageCode: 'V', grade: 'walk' }]
  const plan = runBaseline(buildContext({ persons, villages, vehicles: [{ code: 'B', type: 'bus' }], helpers: [{ code: 'H', grades: ['walk'], villages: [] }], t0 }))
  assert.equal(plan.unserved.length, 1)
  assert.equal(plan.unserved[0].reason, 'noRoute')
  assert.equal(UNSERVED_REASON.noRoute, '경로 정보 없음')
})

test('구역 밖 안전한 대피소가 없으면 그대로 noShelter', () => {
  const shelters = [{ code: 'S1', capacity: 10, villageCode: 'V' }]
  const villages = [{ code: 'V', shelterCode: 'S1', drive: [['S1', 5, 3]] }]
  const persons = [{ code: 'a', villageCode: 'V', grade: 'walk' }]
  const r = resolveVillages({ villages, persons, scenario: { affected: ['V'], avoidAffectedShelters: true }, shelters })
  const plan = runBaseline(buildContext({ persons, villages: r.villages, vehicles: [{ code: 'B', type: 'bus' }], helpers: [{ code: 'H', grades: ['walk'], villages: [] }], t0 }))
  assert.equal(plan.unserved[0].reason, 'noShelter')
})

test('태울 차종이 없는 등급은 noCompatibleVehicle(필요 차종 없음), 기준선과 추천 배정 모두', () => {
  const villages = [{ code: 'V', shelterCode: 'S1', roundTripMin: 30 }]
  const persons = [{ code: 'a', villageCode: 'V', grade: 'bed' }, { code: 'b', villageCode: 'V', grade: 'walk' }]
  const ctx = buildContext({ persons, villages, vehicles: [{ code: 'B', type: 'bus' }], helpers: [{ code: 'H', grades: ['walk'], villages: [] }], t0 })
  for (const plan of [runBaseline(ctx), runOptimize(ctx)]) {
    assert.deepEqual(plan.unserved.map((u) => [u.personCode, u.reason]), [['a', 'noCompatibleVehicle']])
  }
  assert.equal(UNSERVED_REASON.noCompatibleVehicle, '필요 차종 없음')
})

test('기준 시나리오: 경고 목록은 비어 있고 숫자는 그대로(291/267, 평일 낮 216/200)', () => {
  const r = computeShortage(inp())
  assert.equal(r.total, 291); assert.equal(optimizedUnserved(r), 267)
  assert.deepEqual(r.routeMissing, [])
  assert.equal(Object.values(r.noVehicleType).reduce((a, b) => a + b, 0), 0)
  assert.deepEqual(r.unservedReasons, { capacity: 291 })
  const day = computeShortage(inp({ timeBand: 'day' }))
  assert.equal(day.total, 216); assert.equal(optimizedUnserved(day), 200)
  assert.equal(r.scopeTargets, 848)
})
