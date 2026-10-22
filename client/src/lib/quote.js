// quote.js 근거 문구 원문 대조. 글자 인식이 줄을 바꾸며 낱말 중간에 넣은 띄어쓰기("휠체어 에", "가 능")와
// 모델이 앞뒤에 붙인 말줄임표(…, ...)만 무시하고, 나머지 글자는 한 글자도 다르면 안 된다(환각 차단 유지).
// 근거: 공모전/AI검증/오류분석_20261022.md(기존 지시문 반복 판독 150회에서 근거가 있는데 unknown 이 된 118건 중 74건이 띄어쓰기 차이)
const squash = (s = '') => String(s).replace(/^[\s.…·]+|[\s.…·]+$/g, '').replace(/\s+/g, '')
export function quoteIn(source, quote) {
  const q = squash(quote)
  return q.length >= 2 && squash(source).includes(q)
}
