// round49 공공 서비스 문구 정리(2026. 10. 27.): 제목 아래 설명 줄 없음, 우리 사정 문장은 자료 안내 한 곳으로
import { test } from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'

const read = (f) => readFileSync(new URL(f, import.meta.url), 'utf8')
const PAGES = '../src/pages/console/'
const pages = readdirSync(new URL(PAGES, import.meta.url)).filter((f) => f.endsWith('.jsx'))
// 주석을 뺀 화면 문구
const code = (src) => src.replace(/\/\*[\s\S]*?\*\//g, '').replace(/^\s*\/\/.*$/gm, '').replace(/\{\/\*[\s\S]*?\*\/\}/g, '')

test('콘솔 화면 제목 아래 설명 줄(PageShell desc) 없음', () => {
  for (const f of pages) assert.doesNotMatch(read(PAGES + f), /<PageShell[^>]*\sdesc=/, f)
})

test('현황판: 취지 문단과 공공데이터 추가 연계 카드 없음', () => {
  const src = read(PAGES + 'OverviewPage.jsx')
  assert.ok(!src.includes('혼자 대피하기 어려운 주민을 보호하기 위해'))
  assert.ok(!src.includes('<PublicFactsCard'))
})

test('문서함: 카드 아래 서식 설명과 머리 안내 없음, 팀 조사용 서식은 목록에서 뺌', () => {
  const src = read('../src/pages/workspace/WorkspaceHome.jsx')
  assert.ok(!src.includes('{t.desc}'))
  assert.ok(!src.includes('행정업무운영 편람 양식'))
  assert.match(src, /TEAM_ONLY = \{ doc: \['request', 'interview'\]/)
})

test('콘솔 화면 문구에 면담, 자문, 가정값, 협약 후보, 시연용 없음(자료 안내만 예외)', () => {
  for (const f of pages) {
    if (f === 'SettingsPage.jsx') continue
    const s = code(read(PAGES + f))
    for (const w of ['면담', '자문', '가정값', '협약 후보', '시연용']) assert.ok(!s.includes(w), `${f}: ${w}`)
  }
})

test('자료 안내 한 곳: 옮긴 문장을 그대로 담고 설정 화면에서 보임, 시연 표지 삭제', () => {
  const notes = read('../src/lib/dataNotes.js')
  for (const w of ['가상 명부', '협의 전 가정값', '장애인 단체 자문', '경로당 가운데 분포 중심']) assert.ok(notes.includes(w) || read('../src/lib/rosterCount.js').includes(w) || read('../src/lib/shortage.js').includes(w), w)
  assert.match(read(PAGES + 'SettingsPage.jsx'), /title="자료 안내"/)
})

test('출처 줄과 숫자 칩에 가운데점 없음', () => {
  assert.ok(!read('../src/lib/vehicleSummary.js').includes('\u00b7'))
  assert.ok(!read('../src/lib/rosterCount.js').includes('\u00b7'))
  assert.ok(!read('../src/lib/dataNotes.js').includes('\u00b7'))
})
