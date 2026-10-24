// 19회차: 플랫폼 셀 61, 62 검토 반영(단위와 쉼표, 서류 읽기 단계 카드, 시연 속도 표기)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { countText, speedText } from '../src/lib/unitText.js'

const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('countText: 천 단위 쉼표와 단위', () => {
  assert.equal(countText(2013, '명'), '2,013명')
  assert.equal(countText(7, '건'), '7건')
  assert.equal(countText(0, '곳'), '0곳')
})

test('speedText: 기호 없이 글자로 풀어 씀', () => {
  assert.equal(speedText(1), '실제 시간(1배)')
  assert.equal(speedText(60), '1시간을 1분으로(60배)')
  assert.equal(speedText(240), '1시간을 15초로(240배)')
})

test('명부와 상황판은 쉼표 없는 인원 표기를 쓰지 않음', () => {
  const roster = src('pages/console/RosterPage.jsx')
  assert.ok(!roster.includes('${rows.length}명'))
  assert.ok(roster.includes("countText(rows.length, '건')"))
  const summary = src('components/map/SummaryPanel.jsx')
  assert.ok(!summary.includes('${result.scopeTargets}명'))
})

test('서류 읽기 단계 카드: 무엇을 세는지 숫자 앞에, 메뉴 배지 내역 한 줄', () => {
  const intake = src('pages/console/IntakePage.jsx')
  assert.ok(intake.includes("count={`서류 ${countText(docs.length, '건')}`}"))
  assert.ok(intake.includes("count={`대상자 ${countText(readPeople, '명')}`}"))
  assert.ok(intake.includes("count={`확인 대기 ${countText(queue.length, '건')}`}"))
  assert.ok(intake.includes('현장 소식'))
})

test('발령 운영 기본 속도는 60배를 유지하고 표기만 풀어 씀', () => {
  const dispatch = src('pages/console/DispatchPage.jsx')
  assert.ok(dispatch.includes('useState(60)'))
  assert.ok(dispatch.includes('speedText(v)'))
  assert.ok(!dispatch.includes("label: '60배'"))
})
