// unitText.js 같은 대상은 같은 단위로, 천 단위 쉼표를 붙여 센다(플랫폼 셀 61, 62 검토 반영)
// 명부 기록은 건, 사람은 명, 마을은 곳, 서류와 판독 결과는 건
export const countText = (n, unit) => `${Number(n || 0).toLocaleString('ko-KR')}${unit}`

// 시연 속도 표기. 기호 대신 글자로 풀어 쓴다(셀 62)
export const SPEED_LABEL = {
  1: '실제 시간(1배)',
  60: '1시간을 1분으로(60배)',
  240: '1시간을 15초로(240배)'
}
export const speedText = (v) => SPEED_LABEL[v] || `${v}배`
