// 명부 목록에 '마지막 확인' 열: 재확인 필터와 같은 기준(checkedOf)으로 표시해, 걸러진 대상자가 왜 재확인 대상인지 목록에서 바로 보이게
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { checkedOf } from '../src/lib/handoverRows.js'
import { recheckMatch } from '../src/lib/rosterRecheck.js'

const DAY = 86400000
const now = Date.UTC(2026, 9, 24)

test('명부 화면에 마지막 확인 열이 있고 checkedOf 를 쓴다', () => {
  const src = readFileSync(new URL('../src/pages/console/RosterPage.jsx', import.meta.url), 'utf8')
  assert.match(src, /key: 'planCheckedAt', label: '마지막 확인'/)
  assert.match(src, /checkedOf\(p, now\)/)
})

test('재확인 필터에 걸리는 대상자는 마지막 확인 표시가 재확인 필요로 보인다', () => {
  const old = { review: 'confirmed', planCheckedAt: now - 120 * DAY }
  const none = { review: 'confirmed' }
  const fresh = { review: 'confirmed', planCheckedAt: now - 10 * DAY }
  assert.equal(recheckMatch(old, 'stale', now), true)
  assert.equal(checkedOf(old, now).stale, true)
  assert.equal(checkedOf(none, now).text, '확인 기록 없음')
  assert.equal(recheckMatch(fresh, 'stale', now), false)
  assert.equal(checkedOf(fresh, now).stale, false)
})
