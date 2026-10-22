import test from 'node:test'
import assert from 'node:assert/strict'
import { buildSeed } from '../src/mock/seed.js'
import { bottleneck, computeShortage, objectiveCompare, optimizedUnserved } from '../src/lib/shortageCalc.js'
const s = buildSeed(), sc = s.scenarios[0]
const inp = (patch = {}) => ({ ...s, scenario: { ...sc, ...patch }, t0: s.today })
test('병목 확인: 기준 시나리오는 차량이 병목(차량 1대 18명 감소, 도우미 1명 0명)', () => {
  const b = bottleneck(inp())
  assert.equal(b.base, 291); assert.equal(b.vehicleType, 'car'); assert.equal(b.plusVehicle, 273); assert.equal(b.plusHelper, 291); assert.equal(b.limit, 'vehicle')
  assert.deepEqual(b.reasons, { capacity: 291 })
  assert.deepEqual(bottleneck(inp()), b)
})
test('병목 확인은 기준 숫자를 바꾸지 않음', () => {
  const r = computeShortage(inp()); assert.equal(r.total, 291); assert.equal(optimizedUnserved(r), 267)
})
test('목적 비교: 등급 가중과 이송 인원 최대, 기준 시나리오는 같은 267명', () => {
  const o = objectiveCompare(inp())
  assert.equal(o.weighted.unserved, 267); assert.equal(o.count.unserved, 267)
})
