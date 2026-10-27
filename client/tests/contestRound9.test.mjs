import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { recheckMatch } from '../src/lib/rosterRecheck.js'
import { evidenceQuoteIndex } from '../src/lib/evidenceQuote.js'
import { STALE_DAYS } from '../src/lib/handoverRows.js'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 9, 24)
const read = (path) => readFileSync(new URL(path, import.meta.url), 'utf8')

test('재확인 필요 필터는 기록 없음과 90일 초과만 남기고 제외 대상자는 뺀다', () => {
  assert.equal(recheckMatch({ planCheckedAt: null, review: 'confirmed' }, 'stale', now), true)
  assert.equal(recheckMatch({ planCheckedAt: now - (STALE_DAYS + 1) * DAY, review: 'confirmed' }, 'stale', now), true)
  assert.equal(recheckMatch({ planCheckedAt: now - STALE_DAYS * DAY, review: 'confirmed' }, 'stale', now), false)
  assert.equal(recheckMatch({ planCheckedAt: null, review: 'rejected' }, 'stale', now), false)
  assert.equal(recheckMatch({ planCheckedAt: now, review: 'confirmed' }, 'all', now), true)
})

test('현황판에서 재확인 필터로 이동하고 선택 칩을 누르면 주소 필터도 해제한다', () => {
  const overview = read('../src/pages/console/OverviewPage.jsx')
  const roster = read('../src/pages/console/RosterPage.jsx')
  assert.match(overview, /to="\/console\/roster\?recheck=1"/)
  assert.match(roster, /params\.get\('recheck'\) === '1'/)
  assert.match(roster, /재확인 필요 \{staleCount/)
  assert.match(roster, /aria-label="재확인 필요 필터 해제"/)
  assert.match(roster, /n\.delete\('recheck'\)/)
})

test('근거 위치는 같은 문장의 시작점을 찾고 빈 값과 불일치는 찾지 않는다', () => {
  assert.equal(evidenceQuoteIndex('앞 문장. 지팡이를 짚고 걸음. 뒤 문장.', '지팡이를 짚고 걸음'), 6)
  assert.equal(evidenceQuoteIndex('원문', '없는 문장'), -1)
  assert.equal(evidenceQuoteIndex('원문', ''), -1)
})

test('근거 문구 클릭은 원문을 열고 같은 문장을 강조한 뒤 그 위치로 이동한다', () => {
  const evidence = read('../src/components/miri/EvidencePanel.jsx')
  const disclosure = read('../src/components/ui/Disclosure.jsx')
  assert.match(evidence, /onClick=\{showInOriginal\}/)
  assert.match(evidence, /detailsRef\.current\.open = true/)
  assert.match(evidence, /scrollIntoView/)
  assert.match(evidence, /<mark ref=\{markRef\}/)
  assert.match(disclosure, /<details ref=\{detailsRef\}/)
})
