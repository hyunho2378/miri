import assert from 'node:assert/strict'
import { buildSeed } from '../src/mock/seed.js'
import { computeShortage } from '../src/lib/shortageCalc.js'
import { agreedOnlyPlan } from '../src/lib/agreedPlan.js'

let n = 0
const t = async (name, fn) => { try { await fn(); n++; console.log('ok', name) } catch (e) { console.error('FAIL', name, e.message); process.exitCode = 1 } }
const seed = buildSeed()
const sc = seed.scenarios[0]
const input = { ...seed, scenario: sc, t0: seed.today }

await t('기준 시나리오 291명은 그대로', async () => {
  assert.equal(computeShortage(input).total, 291)
})
await t('약속된 차량만: 358명, 협약 승용차 20대 리프트 승합차 4대 침상 승합차 2대로 0명', async () => {
  const p = agreedOnlyPlan(input)
  assert.equal(p.alone, 358)
  assert.deepEqual({ car: p.extra.car, liftVan: p.extra.liftVan, bedVan: p.extra.bedVan }, { car: 20, liftVan: 4, bedVan: 2 })
  assert.equal(p.total, 0)
})
await t('하나씩 줄이면 리프트 3대 13명, 침상 1대 2명, 승용차 19대 2명', async () => {
  const m = Object.fromEntries(agreedOnlyPlan(input).lessOne.map((x) => [x.type, x.left]))
  assert.equal(m.liftVan, 13)
  assert.equal(m.bedVan, 2)
  assert.equal(m.car, 2)
})
await t('승용차 20대만 더하면 67명(침상 11, 휠체어 56), 확인 전 차량은 11대', async () => {
  const { commitmentOf } = await import('../src/lib/shortage.js')
  const agreed = input.vehicles.filter((v) => commitmentOf(v) !== 'unconfirmed')
  const r = computeShortage({ ...input, vehicles: agreed, scenario: { ...sc, extraVehicles: { car: 20 } } })
  assert.equal(r.total, 67)
  assert.equal(r.byGrade.bed, 11)
  assert.equal(r.byGrade.wheelchair, 56)
  assert.equal(input.vehicles.length - agreed.length, 11)
})
console.log('round47', n)
