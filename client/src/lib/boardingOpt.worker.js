// 승하차 민감도 추천 배정 계산을 화면 밖에서 돌리는 웹 작업자. 단계마다 끝나는 대로 보낸다
import { boardingRecommended } from './boardingOpt.js'

self.onmessage = (e) => {
  const { input, steps } = e.data
  for (const m of steps) self.postMessage({ m, recommended: boardingRecommended(input, m) })
}
