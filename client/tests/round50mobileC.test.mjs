// 화면 2차 정리 C(휴대폰): 공무원 시점 전 화면 검수(공모전/점검/문구검수_20261027/공무원시점_전화면검수.md 1-15~1-18)
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const f = read('../src/mobile/field/FieldScreens.jsx')
const sh = read('../src/mobile/shells.jsx')
const h = read('../src/mobile/helper/HelperScreens.jsx')
const body = (name) => { const i = f.indexOf(`function ${name}`); return f.slice(i, f.indexOf('\n}\n', i)) }

test('동 담당자 평시 홈: 숫자 한 갈래(발령 때 보내는 추천 배정), 기준 배정 값과 문장 속 숫자 나열 없음, 할 일 먼저', () => {
  const p = body('PeaceHome')
  assert.ok(!p.includes('추천 배정 시'))
  assert.ok(!p.includes('개 마을'))
  assert.ok(p.indexOf('label={`확인할 일') < p.indexOf('<Figure'), '할 일 목록이 숫자보다 위')
})

test('휴대폰 화면에 시 관리자 몫 문구와 누구 화면 줄 없음', () => {
  assert.ok(!f.includes('발령 종료는 시 관리자가 합니다'))
  assert.ok(!f.includes('시 관리자 계정에서 시 전체 미배정 인원으로 보냄'))
  assert.ok(!f.includes('시 관리자가 동해소방서에 지원 요청'))
  assert.ok(!f.includes('미리 현장 담당자,'))
  assert.ok(!f.includes('function Who('))
})

test('발령 홈과 소방 화면: 숫자 이름 하나씩(대피소에 아직 못 간 사람, 차량 배정 없음), 동 담당자는 우리 동', () => {
  assert.match(f, /`\$\{scope\.isDong \? '우리 동 ' : ''\}대피소에 아직 못 간 사람`/)
  assert.match(f, /title=\{`이동 불가 인원 \$\{u\.total\}명`\}/)
  assert.match(f, /label=\{`\$\{scope\.isDong \? '우리 동 ' : ''\}이동 불가 인원`\}/)
  assert.ok(!f.includes('차량이나 도우미가 없는 사람'))
})

test('대상자 상세: 지금 상태(결론) 다음 할 일, 그다음 동행과 소통(근거)', () => {
  const p = f.slice(f.indexOf('export function FieldPersonPage'), f.indexOf('function VillagePicker'))
  assert.ok(p.indexOf('<Figure') < p.indexOf('label="할 일"'))
  assert.ok(p.indexOf('label="할 일"') < p.indexOf('label="동행과 소통"'))
  assert.ok(!p.includes('경로 확인 기준'))
})

test('시작 화면, 계정 고르기, 도우미 첫 화면: 제목 아래 설명 줄과 가상 자료 문장 없음', () => {
  for (const t of ['누가 쓰는 화면인지 고릅니다', '마을과 시설은 실제 공개 자료', '미리 현장 담당자 화면입니다']) assert.ok(!sh.includes(t), t)
  assert.ok(!h.includes('이웃 대피를 돕는 화면'))
  assert.ok(!f.includes('AI 초안') && !f.includes('보내고 읽기'))
})

test('하단 탭과 로그아웃은 실제 동작 함수에 연결됨(탭은 navigate, 로그아웃은 logout)', () => {
  assert.match(sh, /onClick: \(\) => navigate\(t\.path\)/)
  assert.match(f, /<Button size="sm" variant="plain" onClick=\{account\.logout\}>로그아웃<\/Button>/)
})

test('평시 홈 숫자: 동 담당자는 우리 동 추천 배정 기준, 시 관리자는 콘솔 현황판처럼 동해시 전체 기준 배정과 추천 배정 적용 시 한 줄', () => {
  const p = body('PeaceHome')
  const dong = p.slice(p.indexOf('scope.isDong ? ('), p.indexOf(') : ('))
  const city = p.slice(p.indexOf(') : ('))
  assert.match(dong, /label="우리 동 이동 불가 인원"/)
  assert.match(dong, /value=\{opt \?\? '-'\}/)
  assert.match(dong, /추천 배정 기준, \{stamp\}/)
  assert.ok(!dong.includes('동해시 전체'))
  assert.match(city, /label=\{`동해시 전체 이동 불가 인원/)
  assert.match(city, /value=\{sh\.unserved \?\? '-'\}/)
  assert.match(city, /추천 배정 적용 시 \{opt \?\? '-'\}명/)
  assert.ok(!city.includes('우리 동'))
  assert.ok(city.indexOf('value={sh.unserved') < city.indexOf('추천 배정 적용 시'))
})

test('시 관리자 숫자는 콘솔 현황판과 같은 값: 기준 배정 291명, 추천 배정 적용 시 267명', async () => {
  const { buildSeed } = await import('../src/mock/seed.js')
  const { computeShortage, optimizedByVillage, optimizedUnserved } = await import('../src/lib/shortageCalc.js')
  const { activeScenario } = await import('../src/store/useMiriStore.js')
  const { scopedShortage, scopedOptimized } = await import('../src/mobile/field/fieldModel.js')
  const s = buildSeed()
  const r = computeShortage({ persons: s.persons, villages: s.villages, vehicles: s.vehicles, helpers: s.helpers, settings: s.settings, scenario: activeScenario(s), t0: s.today })
  assert.equal(scopedShortage(r, () => true).unserved, 291)
  assert.equal(scopedOptimized(r, () => true, optimizedByVillage(r), optimizedUnserved(r)), 267)
})
