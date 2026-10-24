// 명부 표 한 칸에 한 줄만 쓰기(플랫폼 AI 협업 툴 셀 68 검토 반영).
// 여러 항목은 첫 항목과 '외 n'으로 줄이고, 전체는 상세 서랍에서 본다.
export function firstAndMore(items, empty = '없음') {
  const list = (items || []).filter(Boolean)
  if (!list.length) return { text: empty, full: '' }
  return { text: list.length > 1 ? `${list[0]} 외 ${list.length - 1}` : list[0], full: list.join(', ') }
}
