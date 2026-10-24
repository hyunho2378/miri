// 갤럭시 폴드 크기와 접힘 자세, 현장 담당자 화면 로그인과 동 범위, 도우미 수락 안내 문구
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { layoutFor, postureOf, GALAXY_SIZES } from '../src/mobile/layout.js'
const src = (p) => readFileSync(new URL(`../src/${p}`, import.meta.url), 'utf8')

test('갤럭시 크기별 배치(M3 창 크기 등급)', () => {
  const a = (k) => layoutFor({ platform: 'android', ...GALAXY_SIZES[k] })
  assert.deepEqual(a('s26'), { size: 'compact', bar: 'bottom', twoPane: false, margin: 16 })
  assert.deepEqual(a('foldCover'), { size: 'compact', bar: 'bottom', twoPane: false, margin: 16 })
  assert.deepEqual(a('fold8Cover'), { size: 'compact', bar: 'bottom', twoPane: false, margin: 16 })
  assert.deepEqual(a('foldInner'), { size: 'medium', bar: 'rail', twoPane: false, margin: 32 })
  assert.deepEqual(a('foldInnerLand'), { size: 'medium', bar: 'rail', twoPane: false, margin: 32 })
  assert.deepEqual(a('fold8InnerLand'), { size: 'medium', bar: 'rail', twoPane: false, margin: 32 })
})

test('접힘 자세: 책 자세는 접힘선 기준 두 단, 탁상 자세는 한 단', () => {
  assert.equal(postureOf({}), 'flat')
  assert.equal(postureOf({ hSegments: 2 }), 'book')
  assert.equal(postureOf({ vSegments: 2 }), 'tabletop')
  assert.equal(layoutFor({ platform: 'android', width: 750, height: 832, hSegments: 2 }).twoPane, true)
  assert.equal(layoutFor({ platform: 'android', width: 832, height: 750, vSegments: 2 }).twoPane, false)
  assert.equal(layoutFor({ platform: 'android', width: 832, height: 750, vSegments: 2 }).posture, 'tabletop')
  const css = src('mobile/mobile.css')
  assert.match(css, /@media \(vertical-viewport-segments: 2\)/)
  assert.match(css, /@media \(horizontal-viewport-segments: 2\)/)
})

test('현장 담당자 화면은 로그인한 담당자만(데모도 계정 선택 필수)', () => {
  const s = src('mobile/shells.jsx')
  assert.match(s, /export function FieldShell\(\) \{\s*const ok = useFieldSignedIn\(\)/)
  assert.match(s, /if \(!ok\) return USE_MOCK \? <FieldLogin \/> : <Navigate to="\/console\/login"/)
  const auth = src('store/useAuthStore.js')
  assert.match(auth, /signedIn: USE_MOCK \? !!initialRole : false/)
  assert.match(auth, /setDemoUser: \(role\) => \{ writeSigned\(role\); set\(\{ user: DEMO_USERS\[role\], signedIn: true \}\);/)
})

test('동 담당자는 자기 동 마을과 대상자만', () => {
  const f = src('mobile/field/FieldScreens.jsx')
  assert.match(f, /function useFieldScope\(\)/)
  assert.match(f, /villageProgress\(d, data\.persons, data\.villages, vnow\)\.filter\(\(v\) => scope\.inScope\(v\.code\)\)/)
  assert.match(f, /data\.persons\.filter\(\(p\) => scope\.inScope\(p\.villageCode\)\)/)
  assert.match(f, /x\.code === code && scope\.inScope\(x\.villageCode\)/)
  assert.match(f, /title="담당 구역 밖 마을"/)
})

test('마을 상세 차량과 도우미는 쉼표 줄글 대신 한 줄에 하나', () => {
  const f = src('mobile/field/FieldScreens.jsx')
  assert.doesNotMatch(f, /v\.helpers\.join\(', '\)/)
  assert.match(f, /<List label="배정 차량">/)
  assert.match(f, /<List label="배정 도우미">/)
})

test('도우미 수락 안내는 멘토링(수락 필요)과 한림봉사센터 회신 R12(불가 불이익 없음) 근거 문장 하나로 통일, 버튼 이름(수락, 불가)과 같은 말로(플랫폼 셀 43)', () => {
  const NEW = '수락을 누르면 배정이 확정됩니다. 불가를 눌러도 불이익은 없고, 다른 도우미에게 넘어갑니다.'
  for (const p of ['mobile/helper/HelperScreens.jsx', 'pages/helper/RemoteHelper.jsx', 'pages/helper/HelperPage.jsx']) {
    const s = src(p); assert.ok(s.includes(NEW), p); assert.ok(!s.includes('참여 의무'), p); assert.ok(!s.includes('거절해도 불이익'), p)
  }
  assert.ok(!src('store/useDispatchStore.js').includes('참여 의무'))
})
