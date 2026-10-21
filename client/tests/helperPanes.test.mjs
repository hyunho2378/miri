// 도우미 두 단(medium 이상, iPhone Duo 안쪽): 왼쪽 이송 목록, 오른쪽 선택한 대상자 화면
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { helperPaneOf } from '../src/mobile/helper/flow.js'
import { layoutFor } from '../src/mobile/layout.js'

test('compact 는 한 단: 쌓인 화면이 있으면 그것만, 없으면 목록만', () => {
  assert.deepEqual(helperPaneOf({ twoPane: false, base: 'H3' }), { list: 'H3', detail: null })
  assert.deepEqual(helperPaneOf({ twoPane: false, base: 'H3', view: { name: 'H5', code: 'A' } }), { list: null, detail: { name: 'H5', code: 'A' } })
})

test('두 단: 고른 것이 없으면 지금 차례 대상자의 단계 보고, 고르면 그 화면', () => {
  assert.deepEqual(helperPaneOf({ twoPane: true, base: 'H3', currentCode: 'MS-04-014' }), { list: 'H3', detail: { name: 'H5', code: 'MS-04-014' } })
  assert.deepEqual(helperPaneOf({ twoPane: true, base: 'H3', view: { name: 'H4', code: 'MH-01-080' }, currentCode: 'MS-04-014' }), { list: 'H3', detail: { name: 'H4', code: 'MH-01-080' } })
  assert.deepEqual(helperPaneOf({ twoPane: true, base: 'H3', currentCode: null }), { list: 'H3', detail: null })
})

test('배정 알림, 동의, 종료 화면은 두 단을 쓰지 않음', () => {
  for (const base of ['H0', 'H1', 'H2', 'H9']) assert.deepEqual(helperPaneOf({ twoPane: true, base }), { list: null, detail: null })
})

test('두 단이 켜지는 크기: Duo 안쪽 세로와 가로, Android 840 이상(medium 은 레일과 한 단). iPhone 과 Duo 바깥 세로는 한 단', () => {
  assert.equal(layoutFor({ platform: 'ios', width: 669, height: 951 }).twoPane, true)
  assert.equal(layoutFor({ platform: 'ios', width: 951, height: 669 }).twoPane, true)
  assert.equal(layoutFor({ platform: 'ios', width: 466, height: 678 }).twoPane, false)
  assert.equal(layoutFor({ platform: 'ios', width: 402, height: 874 }).twoPane, false)
  assert.equal(layoutFor({ platform: 'android', width: 673, height: 841 }).twoPane, false)
  assert.equal(layoutFor({ platform: 'android', width: 900, height: 700 }).twoPane, true)
  assert.equal(layoutFor({ platform: 'android', width: 412, height: 915 }).twoPane, false)
})

test('화면 코드: 두 단에서 목록 고르기는 오른쪽만 바꾸고, 목록 아래 고정 버튼은 숨김', () => {
  const src = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
  assert.match(src, /const pick = \(v\) => setStack\(\[v\]\)/)
  assert.match(src, /p\.current && !inPane && <Bottom>/)
  assert.match(src, /<TwoPane\s/)
})

test('키와 값 행: 값은 남은 폭 오른쪽 정렬, 단어 단위 줄바꿈, 행 폭 360 미만이면 값을 아래 줄로', () => {
  const css = readFileSync(new URL('../src/mobile/mobile.css', import.meta.url), 'utf8')
  assert.match(css, /\.mob-row\.kv \.mob-row-trail \{ flex: 1 1 auto;[^}]*justify-content: flex-end;/)
  assert.match(css, /\.mob-h-kv \{[^}]*word-break: keep-all;/)
  assert.match(css, /@container \(max-width: 359px\) \{\s*\.mob-root \.mob-row\.kv \{ flex-direction: column;/)
  const jsx = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
  assert.match(jsx, /className="kv" title=\{r\.label\}/)
})
