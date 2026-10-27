import test from 'node:test'
import assert from 'node:assert/strict'
import { OWNERS, VEHICLE_NOTE, commitmentOf, HELPER_AFFILIATIONS, affiliationLabel } from '../src/lib/shortage.js'
import { buildSeed } from '../src/mock/seed.js'

test('R43 교통 부서 요청 차량은 기본 미확인', () => {
  assert.ok(OWNERS.request.includes('교통 부서 요청'))
  assert.equal(commitmentOf({ owner: 'request' }), 'unconfirmed')
  assert.equal(commitmentOf({ owner: 'request', commitment: 'agreed' }), 'agreed')
  assert.equal(commitmentOf({ owner: 'city' }), 'agreed')
  assert.ok(VEHICLE_NOTE.includes('시 공용차량을 먼저'))
})
test('R43 협약 승용차는 제안 항목으로 표기', () => {
  assert.equal(OWNERS.contract, '협약 승용차')
})
test('R43 도우미 소속과 기본값', () => {
  assert.deepEqual(Object.keys(HELPER_AFFILIATIONS).slice(0, 3), ['leader', 'disasterCorps', 'civic'])
  assert.equal(affiliationLabel({}), '소속 확인 필요')
  const seed = buildSeed()
  assert.ok(seed.helpers.every((h) => HELPER_AFFILIATIONS[h.affiliation]))
})
