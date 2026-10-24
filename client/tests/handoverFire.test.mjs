// 소방 인계 목록(현직 소방관 인터뷰 반영): 기준 시각, 급한 순 정렬, 상세 위치와 엘리베이터와 보호자 연락처, 명부 마지막 확인, 소방 용어
import assert from 'node:assert/strict'
import { buildHandoverRows, handoverCsvColumns, elevatorOf, checkedOf, sortUrgent, STALE_DAYS, DAY } from '../src/lib/handoverRows.js'
import { buildSeed } from '../src/mock/seed.js'

// ExportButton.toCsv 와 같은 규칙(머리줄 BOM, 값 이스케이프)
const esc = (v) => { const x = v == null ? '' : String(v); return /[",\n]/.test(x) ? `"${x.replace(/"/g, '""')}"` : x }
const toCsv = (cols, rows) => `\uFEFF${cols.map((c) => esc(c.label)).join(',')}\n${rows.map((r) => cols.map((c) => esc(c.value ? c.value(r) : r[c.key])).join(',')).join('\n')}`
let n = 0
const t = (name, fn) => { fn(); n += 1; console.log('ok', name) }
const now = Date.UTC(2026, 9, 24, 0, 0)

t('급한 순: 인계 대기 먼저, 도달 빠른 마을, 무거운 등급', () => {
  const rows = sortUrgent([
    { code: 'A', arrival: 300, grade: 'assist', status: 'unassigned' },
    { code: 'B', arrival: 100, grade: 'assist', status: 'unassigned' },
    { code: 'C', arrival: 100, grade: 'bed', status: 'fail' },
    { code: 'D', arrival: 50, grade: 'bed', status: 'handedToFire' }
  ])
  assert.deepEqual(rows.map((r) => r.code), ['C', 'B', 'A', 'D'])
})

t('엘리베이터와 명부 확인 표시', () => {
  assert.equal(elevatorOf({ stairs: '엘리베이터 있음' }), '있음')
  assert.equal(elevatorOf({ stairs: '계단만 있음' }), '없음(계단만)')
  assert.equal(elevatorOf(null), '명부에 없음')
  assert.equal(checkedOf({ planCheckedAt: null }, now).text, '확인 기록 없음')
  assert.equal(checkedOf({ planCheckedAt: now - 10 * DAY }, now).stale, false)
  assert.equal(checkedOf({ planCheckedAt: now - (STALE_DAYS + 1) * DAY }, now).stale, true)
})

t('시드 명부로 목록과 CSV: 위치, 엘리베이터, 보호자, 기준 시각 열', () => {
  const seed = buildSeed()
  const ps = seed.persons.slice(0, 6)
  const entries = ps.map((p, i) => ({ code: p.code, reason: '차량 부족', status: i === 0 ? 'fail' : 'unassigned' }))
  const arrivals = Object.fromEntries(ps.map((p, i) => [p.villageCode, now + (6 - i) * 60000]))
  const rows = buildHandoverRows({ entries, persons: seed.persons, villages: seed.villages, privateInfo: seed.privateInfo, arrivals, now: seed.today })
  assert.equal(rows.length, 6)
  for (const r of rows) {
    assert.match(r.location, /층/)
    assert.match(r.guardianPhone, /^010-0000-\d{4}$/)
    assert.ok(r.elevator)
    assert.ok(r.gradeTerm.length > 0)
  }
  for (let i = 1; i < rows.length; i += 1) assert.ok((rows[i - 1].arrival ?? Infinity) <= (rows[i].arrival ?? Infinity))
  const base = now + 5 * 60000
  const csv = toCsv(handoverCsvColumns(base), rows).split('\n')
  assert.match(csv[0], /^\uFEFF목록 기준 시각,/)
  assert.match(csv[0], /상세 위치\(동호수, 층\)/)
  assert.match(csv[0], /엘리베이터/)
  assert.match(csv[0], /보호자 연락처/)
  assert.match(csv[0], /명부 마지막 확인/)
  assert.match(csv[0], /기한 안 미이송 사유/)
  assert.ok(csv.slice(1).every((line) => line.startsWith('2026.')))
})

t('시드 가상 동호수는 층과 맞음, 다른 시드 값은 그대로', () => {
  const seed = buildSeed()
  for (const p of seed.persons) {
    const u = seed.privateInfo[p.code]?.unit
    if (!u || !p.access) continue
    if (u === '가상 단독주택') { assert.equal(p.access.floor, '1층'); continue }
    assert.equal(u.match(/ (\d)0\d호$/)[1] + '층', p.access.floor)
  }
})

console.log(`handoverFire: ${n} passed`)
