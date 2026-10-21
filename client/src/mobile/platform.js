// 모바일 플랫폼 결정. docs/MOBILE_UI.md 5장 순서를 따른다.
// 1) 주소 값 ?platform=ios|android  2) sessionStorage 저장값(수동 전환 포함)  3) User-Agent 의 Android 감지  4) 기본 iOS
// 순수 함수라 node 시험에서 그대로 부른다.
export const PLATFORMS = ['ios', 'android']
export const STORAGE_KEY = 'miri.mobile.platform'
export const LARGE_TEXT_KEY = 'miri.mobile.largeText'

export function normalizePlatform(value) {
  const v = String(value || '').trim().toLowerCase()
  if (v === 'ios' || v === 'iphone' || v === 'ipad') return 'ios'
  if (v === 'android' || v === 'aos' || v === 'm3') return 'android'
  return null
}

export function detectFromUserAgent(ua) {
  return /android/i.test(String(ua || '')) ? 'android' : null
}

export function resolvePlatform({ search = '', stored = null, userAgent = '' } = {}) {
  let fromQuery = null
  try { fromQuery = normalizePlatform(new URLSearchParams(search).get('platform')) } catch { fromQuery = null }
  if (fromQuery) return { platform: fromQuery, source: 'query' }
  const fromStore = normalizePlatform(stored)
  if (fromStore) return { platform: fromStore, source: 'stored' }
  const fromUa = detectFromUserAgent(userAgent)
  if (fromUa) return { platform: fromUa, source: 'userAgent' }
  return { platform: 'ios', source: 'default' }
}

export function bodyClassFor(platform, largeText = false) {
  const p = normalizePlatform(platform) || 'ios'
  return ['mobile-ui', `platform-${p}`, largeText ? 'text-large' : 'text-regular']
}
