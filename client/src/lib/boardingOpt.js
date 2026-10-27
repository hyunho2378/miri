// 승하차 시간 민감도의 추천 배정 미이송. 추천 배정 탐색(runOptimize)은 한 번에 1초 안팎이 걸려
// 화면을 그리는 동안 일곱 번 돌리면 발령 준비 화면이 몇 초씩 멈춘다. 계산은 같은 함수로 하되
// 웹 작업자나 쉬는 틈에 나눠 돌리고, 같은 입력은 다시 계산하지 않는다. 결과 숫자는 바뀌지 않는다.
import { computeShortage, optimizedUnserved } from './shortageCalc.js'

export function boardingRecommended(input, m) {
  return optimizedUnserved(computeShortage({ ...input, settings: { ...input.settings, boardingMinutes: m } }))
}
