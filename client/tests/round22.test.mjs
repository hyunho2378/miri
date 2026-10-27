// 22회차: 플랫폼 AI 협업 툴 셀 65(서식 차량과 명부 표기), 셀 68(명부 한 줄 칸)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

test('명부 칸 첫 항목과 외 n', async () => {
  const { firstAndMore } = await import('../src/lib/rosterCompact.js')
  assert.deepEqual(firstAndMore([]), { text: '없음', full: '' })
  assert.equal(firstAndMore(['산소']).text, '산소')
  const f = firstAndMore(['산소', false, '반려동물', '욕창'])
  assert.equal(f.text, '산소 외 2')
  assert.equal(f.full, '산소, 반려동물, 욕창')
})

test('서식 변수: 차량 현황은 공용 함수, 명부 현황은 건과 확인 인원', async () => {
  const { buildSeed } = await import('../src/mock/seed.js')
  const { computeVars } = await import('../src/lib/docVars.js')
  const { vehicleSummaryLong } = await import('../src/lib/vehicleSummary.js')
  const s = buildSeed()
  const scenario = s.scenarios?.find((x) => x.id === s.settings?.activeScenarioId) || s.scenarios?.[0]
  const v = computeVars(s, scenario)
  assert.equal(v.vehicleSummaryLong, vehicleSummaryLong(s.vehicles))
  assert.match(v.vehicleSummaryLong, /^등록 42대 중 가용 39대/)
  assert.equal(v.rosterSummary, '명부 2,013건(확인 2,006명, 확인 대기 7건)')
})

test('서식 본문에 등록 대상자 숫자와 옛 차량 문장이 남지 않음', () => {
  const t = readFileSync(new URL('../src/lib/docTemplates.js', import.meta.url), 'utf8')
  assert.equal(t.includes("등록 거동불편자 ${V('targets')}"), false)
  assert.equal(t.includes("보유 차량 ${V('vehicles')}"), false)
  assert.ok((t.match(/V\('vehicleSummaryLong'\)/g) || []).length >= 3)
})

test('명부 마지막 확인 칸은 날짜만, 뜻은 표 설명에', () => {
  const r = readFileSync(new URL('../src/pages/console/RosterPage.jsx', import.meta.url), 'utf8')
  assert.equal(r.includes(", 재확인 필요' : ''"), false)
  // 뜻은 열 머리 도움말과 자료 안내로 옮김(1027 공공 서비스 문구 정리)
  assert.ok(r.includes('90일 경과 또는 기록 없음은 재확인 대상, 빨간 글자로 표시'))
  assert.ok(readFileSync(new URL('../src/lib/dataNotes.js', import.meta.url), 'utf8').includes('마지막 확인이 빨간 글자면 90일이 지났거나 기록이 없어 재확인이 필요합니다'))
})
