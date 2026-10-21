// 모바일 플랫폼 결정 규칙(docs/MOBILE_UI.md 5장): 주소 값 → 저장값 → User-Agent → 기본 iOS
import assert from 'node:assert/strict'
import { resolvePlatform, normalizePlatform, bodyClassFor } from '../src/mobile/platform.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
const AND = 'Mozilla/5.0 (Linux; Android 14; SM-S921N) AppleWebKit/537.36 Chrome/129 Mobile Safari/537.36'
const IPH = 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148'

t('주소 값이 가장 먼저: 안드로이드 휴대폰에서도 ?platform=ios 면 iOS', () => {
  assert.deepEqual(resolvePlatform({ search: '?platform=ios', stored: 'android', userAgent: AND }), { platform: 'ios', source: 'query' })
})
t('주소 값이 없으면 저장값(수동 전환)', () => {
  assert.deepEqual(resolvePlatform({ search: '', stored: 'android', userAgent: IPH }), { platform: 'android', source: 'stored' })
})
t('저장값도 없으면 User-Agent 의 Android 감지', () => {
  assert.deepEqual(resolvePlatform({ search: '?x=1', stored: null, userAgent: AND }), { platform: 'android', source: 'userAgent' })
})
t('아무 근거가 없으면 기본 iOS', () => {
  assert.deepEqual(resolvePlatform({ userAgent: IPH }), { platform: 'ios', source: 'default' })
  assert.deepEqual(resolvePlatform(), { platform: 'ios', source: 'default' })
})
t('잘못된 값은 무시하고 다음 순서로', () => {
  assert.equal(resolvePlatform({ search: '?platform=windows', stored: 'zzz', userAgent: AND }).platform, 'android')
  assert.equal(normalizePlatform('M3'), 'android')
  assert.equal(normalizePlatform(' iPhone '), 'ios')
  assert.equal(normalizePlatform(''), null)
})
t('body 클래스: 플랫폼과 글자 크기', () => {
  assert.deepEqual(bodyClassFor('android', true), ['mobile-ui', 'platform-android', 'text-large'])
  assert.deepEqual(bodyClassFor('bogus'), ['mobile-ui', 'platform-ios', 'text-regular'])
})
console.log(`${n}개 시험 통과`)
