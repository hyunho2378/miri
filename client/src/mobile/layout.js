// 화면 크기 등급과 이동 막대 위치 판정. 기기 종류가 아니라 화면 크기로만 정한다(HIG Layout, M3 window size classes).
// 근거(피그마 키트 노드):
// - M3 Examples/Layout grid 56384:120: compact 0~599, medium 600~839, expanded 840 이상. 여백 compact 16, medium 32, expanded 24
// - iOS 27 키트 Safe Areas and Margins 12892:62092: iPhone Duo 바깥 세로 466x678, 바깥 가로 678x466, 안쪽 가로 951x669 는
//   옆 세로 막대(84 폭), 안쪽 세로 669x951 과 iPhone(402x874, 440x956)은 아래 탭 바(95). 세로 막대 자세는 모두 높이 678 이하,
//   아래 막대 자세는 모두 높이 874 이상이라 높이 760 을 경계로 둔다. Duo 여백 20(Layout Margin 20pt), iPhone 16
export const SIZE_MEDIUM = 600
export const SIZE_EXPANDED = 840
export const IOS_SIDE_BAR_MAX_H = 760

export function sizeClassOf(width) {
  if (width >= SIZE_EXPANDED) return 'expanded'
  if (width >= SIZE_MEDIUM) return 'medium'
  return 'compact'
}

// 갤럭시 Z 폴드와 일반 갤럭시 시험 크기(CSS px). 삼성 공식 사양의 물리 해상도를 기본 배율로 나눈 추정값이다.
// 삼성은 dp 값을 공개하지 않으므로 공모전/모바일UI/규격서_iOS27_M3_20261021.md 9장에 사양 출처와 배율 가정을 함께 적었다.
// - Z Fold8 Ultra(2026), Z Fold7(2025) 바깥 1080x2520 / 2.625 = 412x960
// - Z Fold7 안쪽 1968x2184 / 2.625 = 750x832, 가로 832x750 (medium)
// - Z Fold8(2026) 바깥 1248x1972 / 3 = 416x657, 안쪽 1848x2448 가로 / 3 = 816x616 (medium)
// - Galaxy S26 1080x2340 / 3 = 360x780 (compact)
export const GALAXY_SIZES = {
  foldCover: { width: 412, height: 960 },
  fold8Cover: { width: 416, height: 657 },
  foldInner: { width: 750, height: 832 },
  foldInnerLand: { width: 832, height: 750 },
  fold8InnerLand: { width: 816, height: 616 },
  s26: { width: 360, height: 780 }
}

// 접힘 자세(웹: CSS viewport segments, Device Posture API).
// - 가로로 두 구획(horizontal-viewport-segments: 2) = 책처럼 반쯤 편 자세: 접힘선을 경계로 두 단(목록과 상세)
// - 세로로 두 구획(vertical-viewport-segments: 2) = 탁상 자세: 위 구획은 내용, 아래 구획은 조작. 두 단을 쓰지 않음
export function postureOf({ hSegments = 1, vSegments = 1 } = {}) {
  if (hSegments >= 2) return 'book'
  if (vSegments >= 2) return 'tabletop'
  return 'flat'
}

export function layoutFor({ platform = 'ios', width = 402, height = 874, hSegments = 1, vSegments = 1 } = {}) {
  const size = sizeClassOf(width)
  const posture = postureOf({ hSegments, vSegments })
  const extra = posture === 'flat' ? {} : { posture }
  if (platform === 'android') {
    // M3 canonical list-detail: compact 와 medium 은 한 단(레일만), expanded 부터 두 단.
    // 반쯤 편 책 자세는 접힘선이 화면을 나누므로 medium 이어도 두 단, 탁상 자세는 한 단
    const bar = size === 'compact' ? 'bottom' : 'rail'
    const margin = size === 'compact' ? 16 : size === 'medium' ? 32 : 24
    const twoPane = posture === 'book' ? true : posture === 'tabletop' ? false : size === 'expanded'
    return { size, bar, twoPane, margin, ...extra }
  }
  const twoPane = posture === 'tabletop' ? false : posture === 'book' ? true : size !== 'compact'
  const bar = height < IOS_SIDE_BAR_MAX_H ? 'side' : 'bottom'
  const margin = bar === 'side' || twoPane ? 20 : 16
  return { size, bar, twoPane, margin, ...extra }
}
