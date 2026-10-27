// 현황판 확인할 일: 명부 재확인 필요 인원(플랫폼 셀 42 교차 점검 반영)
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { test } from 'node:test'
import { staleRosterCount, STALE_DAYS } from '../src/lib/handoverRows.js'

const DAY = 24 * 60 * 60 * 1000
const now = Date.UTC(2026, 9, 24)

test('기록 없음과 90일 넘음만 센다', () => {
  const ps = [
    { planCheckedAt: null },
    { planCheckedAt: now - 10 * DAY },
    { planCheckedAt: now - (STALE_DAYS + 1) * DAY },
    { planCheckedAt: now - STALE_DAYS * DAY }
  ]
  assert.equal(staleRosterCount(ps, now), 2)
  assert.equal(staleRosterCount([], now), 0)
})

test('현황판은 명부(active) 선언 뒤에 재확인 인원을 계산하고, 인원(명)은 확인할 일 건수 합계와 섞지 않는다', () => {
  const src = readFileSync(new URL('../src/pages/console/OverviewPage.jsx', import.meta.url), 'utf8')
  const iActive = src.indexOf('const active = ')
  const iStale = src.indexOf('const staleRoster = staleRosterCount(active, now)')
  assert.ok(iActive > 0 && iStale > iActive)
  assert.ok(/const todo = pending \+ pc\.notes \+ anomalies\.length/.test(src))
  assert.ok(/명부 재확인 필요/.test(src))
  assert.ok(/\/console\/roster\?recheck=1/.test(src))
})
