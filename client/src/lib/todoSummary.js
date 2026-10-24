// 현황판 머리 한 줄 요약(플랫폼 AI 협업 툴 셀 52 검토 반영).
// 셀 52 의 AI 첫 답은 원문을 통째로 이어 붙였고, 되물은 뒤 답도 행동이 끝에 오고 '확인 필요'와 '점검 필요'가 겹치며 월을 01. 처럼 썼다.
// 그래서 행동(확인할 일)을 맨 앞에, 숫자는 입력 그대로, 기준 시각을 끝 괄호에, 월과 일은 10. 24. 식으로 쓴다.
const pad = (n) => String(n).padStart(2, '0')

export function kDateHM(ms) {
  const d = new Date(ms)
  return `${d.getMonth() + 1}. ${d.getDate()}. ${pad(d.getHours())}:${pad(d.getMinutes())}`
}

// items: [{ label, n, unit }] 순서대로(우선순위 높은 것 먼저). n 이 0 인 항목은 뺀다
export function todoSummaryLine(items, at) {
  const parts = items.filter((x) => x && x.n > 0).map((x) => `${x.label} ${x.n.toLocaleString('ko-KR')}${x.unit}`)
  if (!parts.length) return `확인할 일 없음(${kDateHM(at)} 기준)`
  return `확인할 일: ${parts.join(', ')}(${kDateHM(at)} 기준)`
}
