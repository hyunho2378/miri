// clock.js 발령 시간 기준 하나(실서버 흐름 확인, 2026. 10. 21.).
// 모든 화면(담당자 콘솔, 현장 휴대폰 F, 도우미 휴대폰 H)은 실제 시각 하나를 받아 이 함수들로 발령 가상 시각을 계산한다.
// 가상 시각을 다시 가상 시각 함수에 넣으면 배속이 두 번 곱해지므로(F1 경과 시간 폭증 원인), 입력은 항상 실제 시각(Date.now)이다.
export const MIN_MS = 60000

// 발령 상태(d)의 시계: realStart(실제 기준점), vStart(그때의 가상 시각), speed(배속)
export function clockOf(d) {
  if (!d || !d.realStart) return null
  return { realStart: d.realStart, vStart: d.vStart, speed: d.speed || 1 }
}
export function virtualAt(clock, real = Date.now()) {
  if (!clock || !clock.realStart) return real
  return clock.vStart + (real - clock.realStart) * (clock.speed || 1)
}
export const vnowOfState = (d, real = Date.now()) => virtualAt(clockOf(d), real)
// 발령 개시 뒤 경과 분(가상 시계 기준). issuedAt 이 없으면 0
export function elapsedMinOf(d, vnow) {
  const start = d?.issuedAt || d?.vStart
  if (!start) return 0
  return Math.max(0, Math.round((vnow - start) / MIN_MS))
}
// 기한까지 남은 분(음수면 지남)
export const minutesLeft = (deadline, vnow) => (deadline == null ? null : Math.round((deadline - vnow) / MIN_MS))
