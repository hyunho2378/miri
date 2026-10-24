// 이송 진행 카드 묶음의 분모 줄(33회차, 플랫폼 셀 74): 카드 합이 무엇의 합인지와 배정 인원을 함께 보여 준다.
// counts 는 DispatchPage 의 단계별 인원(제외 서류를 뺀 대상자마다 한 단계), assigned 는 배정표에 든 인원.
import { countText } from './unitText.js'

export function progressTotal(counts = {}) {
  return Object.values(counts).reduce((s, n) => s + (Number(n) || 0), 0)
}

export function progressBasisLine(counts, assigned) {
  return `카드 합: 대상 ${countText(progressTotal(counts), '명')} 기준, 이 가운데 배정표에 든 인원 ${countText(assigned, '명')}`
}
