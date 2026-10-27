// 화면 2차 정리 마무리(2026. 10. 27.): 명부 재확인 칩, 차량 미확정 첫 줄, 상황판 숫자 표, 구급차 표기, 휴대폰 탭
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('명부: 재확인 필요 인원 칩을 숫자와 함께 보이고 누르면 거른다', () => {
  const s = read('../src/pages/console/RosterPage.jsx')
  assert.match(s, /staleCount/)
  assert.match(s, /onClick=\{\(\) => changeRecheck\('stale'\)\}/)
})

test('차량: 협약 미확정 차량 수와 협약 확인 단추, 미확정 먼저 정렬', () => {
  const s = read('../src/pages/console/ResourcesPage.jsx')
  assert.match(s, /협약 미확정 차량/)
  assert.match(s, /'협약 확인'/)
  assert.match(s, /commitmentOf\(a\) === 'unconfirmed' \? 0 : 1/)
})

test('상황판 요약: 등급별 인원은 문장 나열 대신 표, 결론 아래 부족분 계산 열기', () => {
  const s = read('../src/components/map/SummaryPanel.jsx')
  assert.doesNotMatch(s, /join\(', '\)/)
  assert.match(s, /function GradeGrid/)
  assert.match(s, /to="\/console\/shortage"[^>]*>부족분 계산 열기/)
  assert.match(s, /label="기한 안에 못 옮기는 사람"/)
})

test('구급차 제외 표기는 소방 출동 중', async () => {
  const { vehicleSummaryLong } = await import('../src/lib/vehicleSummary.js')
  const { buildSeed } = await import('../src/mock/seed.js')
  const seed = buildSeed()
  assert.match(vehicleSummaryLong(seed.vehicles), /소방 출동 중 제외/)
  assert.doesNotMatch(read('../src/lib/vehicleSummary.js') + read('../src/mock/seed.js'), /응급 출동 대기/)
})

test('휴대폰: 마을에서 대상자로 들어가면 마을 탭이 켜진 채 유지', () => {
  assert.match(read('../src/mobile/field/FieldScreens.jsx'), /navigate\(`\/m\/f\/people\/\$\{r\.person\.code\}`, \{ state: \{ tab: 'villages' \} \}\)/)
  assert.match(read('../src/mobile/shells.jsx'), /const current = fromTab \|\| byPath/)
})

test('도우미 카드 주소는 화면 표시 함수로 줄여 보인다', () => {
  assert.match(read('../src/components/miri/HelperAssignmentCard.jsx'), /addressText\(info\?\.address\)/)
})

test('마무리: 업무 화면 문구에 공모전, 시연용, 실제 판독 사례 없음', async () => {
  const fs = await import('node:fs')
  const up = fs.readFileSync(new URL('../src/components/miri/IntakeUploader.jsx', import.meta.url), 'utf8')
  assert.ok(!/공모전 시연용/.test(up) && !/>실제 판독 사례</.test(up) && /읽기 예시/.test(up))
  const ws = fs.readFileSync(new URL('../src/pages/workspace/WorkspaceHome.jsx', import.meta.url), 'utf8')
  assert.ok(/이 기기에만 저장됩니다/.test(ws) && !/시연용으로 이 창에만/.test(ws))
  const fsx = fs.readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
  assert.ok(!/시연용으로 미리 써 둔 결과/.test(fsx))
  const hd = fs.readFileSync(new URL('../src/lib/handoverDoc.js', import.meta.url), 'utf8')
  assert.ok(!/AI·디지털/.test(hd))
})
