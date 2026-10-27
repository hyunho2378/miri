// 17회차: 플랫폼 셀 57, 58, 59 검토 반영과 콘솔 크리틱 반영
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSeed } from '../src/mock/seed.js'
import { vehicleCounts, vehicleSummaryLong, vehicleSummaryShort } from '../src/lib/vehicleSummary.js'
import { handoverPreview } from '../src/lib/handoverPreview.js'
import { calcStamp, peaceBasisText, rosterDateNote } from '../src/lib/basis.js'

const seed = buildSeed()

test('차량 표기: 시드 차량에서 등록, 가용, 약속, 확인 전을 세고 합이 맞음', () => {
  const c = vehicleCounts(seed.vehicles)
  assert.equal(c.total, c.agreed + c.unconfirmed)
  assert.equal(c.usable, c.total - c.fireOff - c.otherOff)
  assert.equal(vehicleSummaryLong(seed.vehicles), `등록 ${c.total}대 중 가용 ${c.usable}대(소방 구급차 ${c.fireOff}대 소방 출동 중 제외), 협약 확정 ${c.agreed}대, 미확정 ${c.unconfirmed}대`)
  assert.equal(vehicleSummaryShort(seed.vehicles), `출동 가능 ${c.usable}대 / 등록 ${c.total}대`)
})

test('차량 표기: 목록이 없으면 기본값 대신 오류', () => {
  assert.throws(() => vehicleCounts(undefined))
})

test('평시 소방 인계 미리보기: 마을 합이 기준 배정과 같고 숫자 기본값 없음', () => {
  const byVillage = { A: { total: 104 }, B: { total: 75 }, C: { total: 0 }, D: { total: 12 } }
  const p = handoverPreview({ baseline: 191, recommended: 170, byVillage, villageName: (c) => `${c}동`, extraLine: '승용차 20대', top: 2 })
  assert.equal(p.line1, '예상 구조 대상 191명(기준 배정), 추천 배정 시 170명')
  assert.equal(p.line2, 'A동 104명, B동 75명, 외 1곳 12명, 승용차 20대 협약 시 0명')
  assert.equal(p.villageSum, 191)
  assert.throws(() => handoverPreview({ byVillage, villageName: (c) => c }))
})

test('계산 시각 꼬리말과 기준일 설명', () => {
  const at = new Date(2026, 9, 25, 0, 20).getTime()
  const rosterAt = new Date(2026, 9, 2).getTime()
  assert.equal(calcStamp({ at, rosterAt }), '10. 25. 00:20 계산, 명부 10. 2. 기준')
  assert.equal(calcStamp({ at }), '')
  assert.match(peaceBasisText({ villages: 12, targets: 848, at, rosterAt }), /^10\. 25\. 00:20 계산, 명부 10\. 2\. 기준, 발령 직후 출발 가정/)
  assert.match(rosterDateNote(rosterAt), /10\. 2\. 기준으로 고정한 자료/)
})

test('화면 연결: 네 화면이 같은 차량 표기 함수, 실제 발령은 앱 안 확인 창', () => {
  const read = (f) => readFileSync(new URL(`../src/pages/console/${f}`, import.meta.url), 'utf8')
  for (const f of ['OverviewPage.jsx', 'ShortagePage.jsx', 'DispatchPage.jsx', 'ResourcesPage.jsx']) assert.match(read(f), /vehicle(Summary(Short|Long)|Chips|Counts)\(vehicles\)/, f)
  const dispatch = read('DispatchPage.jsx')
  assert.match(dispatch, /실제 발령으로 바꿀까요\?/)
  assert.doesNotMatch(dispatch, /window\.confirm/)
  assert.match(read('HandoverPage.jsx'), /handoverPreview\(/)
  assert.match(read('ShortagePage.jsx'), /협약 추진 기안/)
})
