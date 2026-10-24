// 15회차: 플랫폼 AI 협업 툴 셀 53(소방 인계 인쇄), 셀 52(현황판 한 줄 요약) 검토 반영, 동의 화면 용어
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { handoverPrintColumns, paginateHandover, HANDOVER_PRINT_ROWS_PER_PAGE } from '../src/lib/handoverRows.js'
import { todoSummaryLine, kDateHM } from '../src/lib/todoSummary.js'
let n = 0
const t = (name, fn) => { fn(); n += 1; console.log('ok', name) }

t('인쇄 열은 10개, 현장 판단 열 포함', () => {
  const keys = handoverPrintColumns().map((c) => c.key)
  assert.equal(keys.length, 10)
  for (const k of ['code', 'arrival', 'grade', 'address', 'location', 'elevator', 'crew', 'guardianPhone', 'reason']) assert.ok(keys.includes(k), k)
})

t('인쇄 쪽 나누기: 인계 대기 전체, 인계 완료 제외, 쪽 번호', () => {
  const rows = Array.from({ length: 267 }, (_, i) => ({ code: `X-${i}`, status: 'unassigned' })).concat([{ code: 'D-1', status: 'handedToFire' }])
  const pages = paginateHandover(rows)
  assert.equal(pages.length, Math.ceil(267 / HANDOVER_PRINT_ROWS_PER_PAGE))
  assert.equal(pages.reduce((s, p) => s + p.rows.length, 0), 267)
  assert.ok(pages.every((p) => p.total === pages.length))
  assert.equal(pages[pages.length - 1].n, pages.length)
  assert.equal(paginateHandover([{ code: 'D', status: 'handedToFire' }]).length, 0)
})

t('소방 인계 화면이 인쇄 영역을 쓰고, 인쇄 CSS 가 A4 가로 쪽을 둔다', () => {
  const page = readFileSync(new URL('../src/pages/console/HandoverPage.jsx', import.meta.url), 'utf8')
  const comp = readFileSync(new URL('../src/components/miri/HandoverPrint.jsx', import.meta.url), 'utf8')
  const css = readFileSync(new URL('../src/index.css', import.meta.url), 'utf8')
  assert.ok(page.includes('<HandoverPrint rows={rows}'))
  assert.ok(comp.includes('print-area') && comp.includes('쪽 {pg.n} / {pg.total}') && comp.includes('목록 기준 시각'))
  assert.ok(/@page handover \{ size: A4 landscape/.test(css))
})

t('한 줄 요약: 행동 먼저, 0건 제외, 기준 시각, 월 앞자리 0 없음', () => {
  const at = new Date(2026, 9, 24, 22, 45).getTime()
  assert.equal(kDateHM(at), '10. 24. 22:45')
  assert.equal(kDateHM(new Date(2026, 2, 5, 9, 7).getTime()), '3. 5. 09:07')
  assert.equal(todoSummaryLine([{ label: '협약 만료 임박', n: 1, unit: '건' }, { label: '명부 재확인', n: 329, unit: '명' }, { label: '서류', n: 7, unit: '건' }, { label: '현장 소식', n: 0, unit: '건' }], at),
    '확인할 일: 협약 만료 임박 1건, 명부 재확인 329명, 서류 7건(10. 24. 22:45 기준)')
  assert.equal(todoSummaryLine([{ label: '서류', n: 0, unit: '건' }], at), '확인할 일 없음(10. 24. 22:45 기준)')
})

t('동의 화면은 거절 대신 불가', () => {
  const src = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
  assert.ok(!src.includes('거절하거나'))
  assert.ok(src.includes('참여가 불가하거나 나중에 그만둬도 불이익은 없어요.'))
})
console.log(`${n} passed`)
