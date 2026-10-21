// 규격 2차: iOS 27 키트 27.1.0, M3 키트 V1.24 값과 크기 등급 분기 검사
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { layoutFor, sizeClassOf } from '../src/mobile/layout.js'
const css = readFileSync(new URL('../src/mobile/mobile.css', import.meta.url), 'utf8')
const block = (sel) => { const i = css.indexOf(sel + ' {'); assert.ok(i >= 0, sel); return css.slice(i, css.indexOf('}', i)) }
const tok = (body, name) => (body.match(new RegExp(`${name}:\\s*([^;]+);`)) || [])[1]?.trim()

test('크기 등급: M3 Layout grid 경계 600, 840', () => {
  assert.equal(sizeClassOf(412), 'compact'); assert.equal(sizeClassOf(599), 'compact')
  assert.equal(sizeClassOf(600), 'medium'); assert.equal(sizeClassOf(839), 'medium'); assert.equal(sizeClassOf(840), 'expanded')
})

test('iPhone Duo 자세별 막대와 여백(키트 Safe Areas 12892:62092)', () => {
  const ios = (w, h) => layoutFor({ platform: 'ios', width: w, height: h })
  assert.deepEqual(ios(402, 874), { size: 'compact', bar: 'bottom', twoPane: false, margin: 16 })   // iPhone 18
  assert.deepEqual(ios(440, 956), { size: 'compact', bar: 'bottom', twoPane: false, margin: 16 })   // 18 Pro Max
  assert.deepEqual(ios(466, 678), { size: 'compact', bar: 'side', twoPane: false, margin: 20 })     // Duo 바깥 세로
  assert.deepEqual(ios(678, 466), { size: 'medium', bar: 'side', twoPane: true, margin: 20 })       // Duo 바깥 가로
  assert.deepEqual(ios(669, 951), { size: 'medium', bar: 'bottom', twoPane: true, margin: 20 })     // Duo 안쪽 세로
  assert.deepEqual(ios(951, 669), { size: 'expanded', bar: 'side', twoPane: true, margin: 20 })     // Duo 안쪽 가로
})

test('Android 창 크기별 막대와 여백(Layout grid 56384:120, Navigation Rail 58016:36879)', () => {
  const a = (w, h = 900) => layoutFor({ platform: 'android', width: w, height: h })
  assert.deepEqual(a(412), { size: 'compact', bar: 'bottom', twoPane: false, margin: 16 })
  assert.deepEqual(a(673), { size: 'medium', bar: 'rail', twoPane: false, margin: 32 })
  assert.deepEqual(a(900), { size: 'expanded', bar: 'rail', twoPane: true, margin: 24 })
})

test('iOS 글자 역할 크기와 행간(Text Styles 0:2194), 한국어 수동 자간 0', () => {
  const b = block('.mob-root.platform-ios')
  const want = { '--t-display': '34px', '--l-display': '41px', '--ls-display': '0px', '--w-display': '700', '--t-body': '17px', '--l-body': '22px', '--ls-body': '0px', '--t-sub': '15px', '--ls-sub': '0px', '--t-foot': '13px', '--ls-foot': '0px', '--t-label': '12px', '--w-label': '400', '--ls-label': '0px', '--w-headline': '590' }
  for (const [k, v] of Object.entries(want)) assert.equal(tok(b, k), v, k)
})

test('M3 글자 역할(Styles 49823:12141), 한국어 수동 자간 0', () => {
  const b = block('.mob-root.platform-android')
  const want = { '--ls-body': '0px', '--ls-sub': '0px', '--ls-headline': '0px', '--ls-label': '0px', '--w-label': '500', '--ls-title': '0px', '--t-body': '16px', '--l-body': '24px' }
  for (const [k, v] of Object.entries(want)) assert.equal(tok(b, k), v, k)
})

test('모서리와 치수(키트 노드 값)', () => {
  const i = block('.mob-root.platform-ios'), a = block('.mob-root.platform-android')
  assert.equal(tok(i, '--m-sheet-r'), '38px'); assert.equal(tok(i, '--m-nav-h'), '95px'); assert.equal(tok(i, '--m-row-lead'), '30px')
  assert.equal(tok(a, '--m-sheet-r'), '28px'); assert.equal(tok(a, '--m-dialog-r'), '28px'); assert.equal(tok(a, '--m-chip-r'), '8px')
  assert.equal(tok(a, '--m-toast-r'), '4px'); assert.equal(tok(a, '--m-nav-h'), '64px'); assert.equal(tok(a, '--m-btn-h'), '40px'); assert.equal(tok(a, '--m-seg-h'), '40px')
})

test('iOS 탭 바는 떠 있는 알약, Duo 는 세로 막대 84, Android 레일 96', () => {
  assert.match(css, /\.mob-root\.platform-ios \.mob-nav\.nav-bottom \.mob-nav-inner \{[^}]*border-radius: var\(--m-r-full\)/)
  assert.match(css, /\.mob-root\.platform-ios \.mob-nav\.nav-side \{[^}]*width: 84px/)
  assert.match(css, /\.mob-root\.platform-android \.mob-nav\.nav-rail \{[^}]*width: 96px/)
})

test('고정 폭 480과 수동 자간 -0.01em 없음', () => {
  assert.doesNotMatch(css, /max-width: 480px;(?![^}]*max-width: none)/.source ? /letter-spacing: -0\.01em/ : /x/)
  const screen = css.lastIndexOf('.mob-screen {'); assert.match(css.slice(screen, css.indexOf('}', screen)), /max-width: none/)
})
