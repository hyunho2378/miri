// 승하차 시간 민감도(회신 R47, R48). 부족분 계산 화면 표와 시험이 같은 단계와 같은 이름을 쓴다.
export const BOARDING_STEPS = [10, 15, 20, 25, 30, 40]

// 지금 조건의 1.25배, 1.5배, 2배에 해당하는 시간에는 배수를 함께 적는다
export const boardingLabel = (m, now) => {
  const x = m / now
  const tag = [1.25, 1.5, 2].find((k) => Math.abs(x - k) < 1e-9)
  return `${m}분${m === now ? ' (지금 조건)' : tag ? ` (지금의 ${tag}배)` : ''}`
}
