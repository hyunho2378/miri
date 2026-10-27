// 21회차 휴대폰 화면 크리틱(M4, M5, M6, M10, M12, M13) 검수 반영 회귀 시험
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { scopedOptimized } from '../src/mobile/field/fieldModel.js'

const helper = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
const field = readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
const ui = readFileSync(new URL('../src/mobile/ui.jsx', import.meta.url), 'utf8')

test('M4: 진행 단계는 단계 n/4 로, 사람 수 행은 맡은 대상자 n명 중 n번째로 나눠 씀', () => {
  assert.match(helper, /`단계 \$\{stepIndexOf\(st\)\}\/4, \$\{STEP_NOW\[st\]\}`/)
  assert.ok(!/`\$\{stepIndexOf\(st\)\}\/4 \$\{STEP_NOW\[st\]\}`/.test(helper))
})

test('M5: 지금 차례 화면에도 이송 완료 기한과 남은 시간', () => {
  assert.match(helper, /title=\{`이송 완료 기한 \$\{fmtHM\(m\.completeBy\)\}까지`\}/)
  assert.match(helper, /remainText\(m\.completeBy, m\.now\)\?\.text/)
})

test('M6: 경로 경고는 할 일을 앞에(출발 전 담당자에게 길 확인), 담당자 번호가 있으면 전화', () => {
  assert.match(helper, /'출발 전 담당자에게 길 확인'/)
  // 30회차 검수: 출발 뒤에는 '길이 막히면 담당자에게 전화'
  assert.match(helper, /'길이 막히면 담당자에게 전화'/)
  assert.match(helper, /href=\{telOf\(m\.officerContact\) \|\| undefined\}/)
})

test('M10: 긴급 버튼에 누구 상태인지(대상자)', () => {
  assert.match(ui, /EmergencyButton\(\{ label = '대상자 상태 악화'/)
})

test('M12: 평시 홈 숫자는 기준 배정이라고 적고, 추천 배정 시 값과 계산 시각을 함께', () => {
  assert.match(field, /우리 동 기한 안에 못 옮기는 사람, \$\{scenario\?\.name/)
  assert.ok(!field.includes('추천 배정 시 {opt'))
  assert.match(field, /추천 배정 기준, \{stamp\}/)
  assert.match(field, /calcStamp\(\{ at: now, rosterAt: data\.today \}\)/)
})

test('M12: 추천 배정 시 값은 같은 마을 범위로 더하고, 범위가 전체면 합계 그대로', () => {
  const result = { byVillage: { A: { inScope: true }, B: { inScope: true }, C: { inScope: false } } }
  const byV = { A: 3, B: 5, C: 9 }
  assert.equal(scopedOptimized(result, (c) => c === 'A', byV, 8), 3)
  assert.equal(scopedOptimized(result, () => true, byV, 8), 8)
  assert.equal(scopedOptimized(null, () => true, byV, 8), null)
})

test('M13: 휴대폰 오늘 할 일에 명부 재확인 필요 줄(콘솔과 같은 staleRosterCount, 범위 안만)', () => {
  assert.match(field, /staleRosterCount\(data\.persons\.filter\(\(p\) => p\.review !== 'rejected' && scope\.inScope\(p\.villageCode\)\), now\)/)
  assert.match(field, /명부 재확인 \$\{stale\.toLocaleString\('ko-KR'\)\}명/)
})

test('M12: 추천 배정 마을별 합은 추천 배정 합계(267)와 같음, 기준 배정 마을별 합은 291', async () => {
  const { buildSeed } = await import('../src/mock/seed.js')
  const { computeShortage, optimizedByVillage, optimizedUnserved } = await import('../src/lib/shortageCalc.js')
  const { activeScenario } = await import('../src/store/useMiriStore.js')
  const s = buildSeed()
  const r = computeShortage({ persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario: activeScenario(s), t0: s.today })
  const byV = optimizedByVillage(r)
  assert.equal(Object.values(byV).reduce((a, b) => a + b, 0), optimizedUnserved(r))
  assert.equal(optimizedUnserved(r), 267)
  assert.equal(Object.values(r.byVillage).reduce((a, v) => a + v.total, 0), 291)
})
