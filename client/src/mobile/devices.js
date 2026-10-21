// 컴퓨터에서 휴대폰 화면을 볼 때 쓰는 기기 목록과 판정. 순수 함수라 node 시험에서 그대로 부른다.
// 크기는 CSS px(포인트, dp). 출처:
// - 아이폰 18 402x874, 아이폰 듀오 바깥 466x678, 안쪽 669x951: iOS 27 키트 기기 틀과 Safe Areas and Margins 12892:62092
// - 갤럭시 S 360x780, 갤럭시 Z 폴드8 바깥 416x657, 안쪽 616x816: 삼성 공식 물리 해상도를 기본 배율로 나눈 추정값(layout.js GALAXY_SIZES, 규격서 7장)
// 화면 모양은 기기에서 정한다. 갤럭시는 Material 3, 아이폰은 iOS.
export const DEVICES = [
  { id: 'galaxy', label: '갤럭시 S', platform: 'android', width: 360, height: 780 },
  { id: 'iphone', label: '아이폰', platform: 'ios', width: 402, height: 874 },
  { id: 'fold-cover', label: '갤럭시 Z 폴드 바깥', platform: 'android', width: 416, height: 657 },
  { id: 'fold-inner', label: '갤럭시 Z 폴드 안쪽', platform: 'android', width: 616, height: 816 },
  { id: 'duo-cover', label: '아이폰 듀오 바깥', platform: 'ios', width: 466, height: 678 },
  { id: 'duo-inner', label: '아이폰 듀오 안쪽', platform: 'ios', width: 669, height: 951 }
]
export const DEFAULT_DEVICE = 'galaxy'
export const DEVICE_KEY = 'miri.mobile.device'

export function deviceById(id) {
  return DEVICES.find((d) => d.id === id) || DEVICES.find((d) => d.id === DEFAULT_DEVICE)
}

// 가로 전환이면 폭과 높이를 바꾼다.
export function deviceSize(device, landscape = false) {
  return landscape ? { width: device.height, height: device.width } : { width: device.width, height: device.height }
}

// 휴대폰 틀을 보여 줄지. 실제 휴대폰(굵은 포인터)과 틀 안(iframe)에서는 틀 없이 그 화면을 그대로 쓴다.
// ?frame=0 은 틀을 끈다(캡처와 시험), ?frame=1 은 켠다.
export function shouldUseFrame({ inFrame = false, coarse = false, width = 0, search = '' } = {}) {
  let q = null
  try { q = new URLSearchParams(search).get('frame') } catch { q = null }
  if (inFrame) return false
  if (q === '0') return false
  if (q === '1') return true
  if (coarse) return false
  return width >= 720
}

// 틀 안 iframe 주소. 화면 모양(platform)과 틀 끔(frame=0)을 붙이고, 원래 주소의 다른 값은 그대로 둔다.
export function frameSrc(pathname = '/m', search = '', device) {
  const params = new URLSearchParams(search)
  params.delete('frame'); params.delete('platform'); params.delete('device')
  params.set('platform', device.platform)
  params.set('frame', '0')
  return `${pathname}?${params.toString()}`
}

// 틀이 창에 들어가지 않으면 줄인다. 틀 안 CSS 폭은 그대로라 배치(크기 등급, 레일, 두 단)는 기기 크기 기준이다.
export function fitScale({ width, height }, { availWidth, availHeight }, bezel = 24) {
  const s = Math.min(1, availWidth / (width + bezel), availHeight / (height + bezel))
  return Math.max(0.3, Math.round(s * 100) / 100)
}
