// node tests/fixes4.test.mjs 화면 문구와 숫자 범위 통일(2026. 10. 20.) 회귀 시험
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { computeShortage, scopeSummary } from '../src/lib/shortageCalc.js'
import { buildSeed } from '../src/mock/seed.js'

let n = 0
const ok = (name, fn) => { fn(); n += 1; console.log('ok', name) }
const seed = buildSeed()
const sc = seed.scenarios[0]

ok('발령 기준 칸은 대피 대상 구역 대상자(848명)와 명부 전체(2,013건)를 나눠 센다', () => {
  const s = scopeSummary({ persons: seed.persons, villages: seed.villages, scenario: sc, settings: seed.settings })
  assert.equal(s.targets, 848); assert.equal(s.villages, 12); assert.equal(s.roster, 2013)
  assert.equal(s.pending, 4); assert.equal(s.rosterPending, 7)
})

ok('현황판과 부족분 화면의 확인 대기 잠정값은 같은 범위(대피 대상 구역)로 센다', () => {
  const r = computeShortage({ ...seed, scenario: sc, t0: seed.today })
  const inScope = Object.values(r.byVillage).filter((x) => x.inScope).reduce((a, x) => a + x.provisional, 0)
  assert.equal(inScope, r.provisional)
  const src = readFileSync(new URL('../src/pages/console/OverviewPage.jsx', import.meta.url), 'utf8')
  assert.match(src, /scope\.filter\(\(x\) => x\.r\.inScope\)\.reduce\(\(s, x\) => s \+ x\.r\.provisional, 0\)/)
})

ok('부족분 계산은 도우미 수를 조건으로 쓴다(화면 설명과 일치)', () => {
  const a = computeShortage({ ...seed, scenario: sc, t0: seed.today })
  const b = computeShortage({ ...seed, helpers: [], scenario: sc, t0: seed.today })
  assert.ok(b.total > a.total)
  const src = readFileSync(new URL('../src/pages/console/ShortagePage.jsx', import.meta.url), 'utf8')
  assert.ok(!src.includes('도우미 수는 미이송 계산에 들어가지 않고'))
})

console.log(`\n${n}개 시험 통과`)
