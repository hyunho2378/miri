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

export function layoutFor({ platform = 'ios', width = 402, height = 874 } = {}) {
  const size = sizeClassOf(width)
  const twoPane = size !== 'compact'
  if (platform === 'android') {
    const bar = size === 'compact' ? 'bottom' : 'rail'
    const margin = size === 'compact' ? 16 : size === 'medium' ? 32 : 24
    return { size, bar, twoPane, margin }
  }
  const bar = height < IOS_SIDE_BAR_MAX_H ? 'side' : 'bottom'
  const margin = bar === 'side' || twoPane ? 20 : 16
  return { size, bar, twoPane, margin }
}
