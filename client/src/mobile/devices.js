// 컴퓨터에서 휴대폰 화면을 볼 때 쓰는 기기 목록과 판정. 순수 함수라 node 시험에서 그대로 부른다.
// 크기는 CSS px(포인트, dp). 출처:
// - 아이폰 18 402x874, 아이폰 듀오 바깥 466x678, 안쪽 669x951: iOS 27 키트 기기 틀과 Safe Areas and Margins 12892:62092
// - 갤럭시 S 360x780, 갤럭시 Z 폴드8 바깥 416x657, 안쪽 616x816: 삼성 공식 물리 해상도를 기본 배율로 나눈 추정값(layout.js GALAXY_SIZES, 규격서 7장)
// 화면 모양은 기기에서 정한다. 갤럭시는 Material 3, 아이폰은 iOS.
// frame: 키트 기기 그림(public/device, 2배 그림)과 화면 구멍 위치. 그림 크기와 위치는 키트 노드 값(1배, CSS px).
// - 아이폰: Product Bezels iPhone 17 Black 6316:14199, 그림 450x920 안 화면 402x874 위치 (24, 23)
// - 듀오 세로: iPhone Duo Display=Inner, Star White 12887:20885, 그림 749x1031 안 화면 669x951 위치 (40, 40)
// - 듀오 가로: 같은 변형 Orientation=Landscape 12887:20886, 그림 1031x749 안 화면 951x669 위치 (40, 40)
// - 갤럭시와 폴드: 키트에 기기 그림이 없어 M3 Utilities 'Device frame' 50770:11451(모서리 18, 선 8 바깥)의 값으로 그린다.
export const DEVICES = [
  { id: 'galaxy', label: '갤럭시', platform: 'android', width: 360, height: 780 },
  { id: 'iphone', label: '아이폰', platform: 'ios', width: 402, height: 874, frame: { src: '/device/iphone.png', w: 450, h: 920, x: 24, y: 23 } },
  { id: 'fold', label: '갤럭시 폴드', platform: 'android', width: 616, height: 816 },
  { id: 'duo', label: '아이폰 듀오', platform: 'ios', width: 669, height: 951, frame: { src: '/device/duo-portrait.png', w: 749, h: 1031, x: 40, y: 40 }, frameLandscape: { src: '/device/duo-landscape.png', w: 1031, h: 749, x: 40, y: 40 } }
]
// 기기 선택 목록. 갤럭시와 아이폰은 세로만, 폴드와 듀오는 가로와 세로를 각각 고른다.
export const DEVICE_OPTIONS = [
  { key: 'galaxy', id: 'galaxy', landscape: false, label: '갤럭시' },
  { key: 'iphone', id: 'iphone', landscape: false, label: '아이폰' },
  { key: 'fold-portrait', id: 'fold', landscape: false, label: '갤럭시 폴드 세로' },
  { key: 'fold-landscape', id: 'fold', landscape: true, label: '갤럭시 폴드 가로' },
  { key: 'duo-portrait', id: 'duo', landscape: false, label: '아이폰 듀오 세로' },
  { key: 'duo-landscape', id: 'duo', landscape: true, label: '아이폰 듀오 가로' }
]
export const DEFAULT_DEVICE = 'galaxy'
export const DEVICE_KEY = 'miri.mobile.device'

// 주소에 흔히 쓰는 다른 이름(캡처 파일 이름, 문서 표기)을 정식 이름으로 바꾼다. 모르는 이름은 null(시작 화면 기기 고르기로)
const ALIASES = {
  galaxys: 'galaxy', 'galaxy-s': 'galaxy', galaxy_s: 'galaxy', android: 'galaxy',
  iphone18: 'iphone', 'iphone-18': 'iphone', ios: 'iphone',
  fold_out: 'fold', foldout: 'fold', 'fold-out': 'fold', fold_cover: 'fold', 'fold-cover': 'fold',
  fold_in: 'fold', foldin: 'fold', 'fold-in': 'fold', fold_inner: 'fold', 'fold-inner': 'fold',
  duo_out: 'duo', duoout: 'duo', 'duo-out': 'duo', duo_cover: 'duo', 'duo-cover': 'duo',
  duo_in: 'duo', duoin: 'duo', 'duo-in': 'duo', duo_inner: 'duo', 'duo-inner': 'duo'
}
export function resolveDevice(q) {
  if (!q) return null
  const k = String(q).trim().toLowerCase()
  if (DEVICES.some((d) => d.id === k)) return k
  return ALIASES[k] || null
}

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
