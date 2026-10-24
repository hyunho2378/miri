// 8회차 교차 점검: 시연 명부 마지막 확인 분포와 도우미 안내 용어(수락, 불가)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { buildSeed } from '../src/mock/seed.js'
import { staleRosterCount } from '../src/lib/handoverRows.js'

test('시연 명부 재확인 필요 인원은 소수(전체의 25% 미만)이고 시연 날짜가 지나도 같은 비율', () => {
  const { persons } = buildSeed()
  const n = persons.length
  const now = Date.now()
  const a = staleRosterCount(persons, now)
  const b = staleRosterCount(persons, now + 30 * 24 * 3600 * 1000 * 0)
  assert.ok(a > 0 && a / n < 0.25, `${a}/${n}`)
  assert.equal(a, b)
})

test('도우미 안내와 힌트에 거절이라는 말을 쓰지 않는다', () => {
  for (const f of ['../src/store/useDispatchStore.js', '../src/pages/console/ResourcesPage.jsx', '../src/lib/docTemplates.js']) {
    const src = readFileSync(new URL(f, import.meta.url), 'utf8')
    assert.ok(!/거절해도/.test(src), f)
  }
})
