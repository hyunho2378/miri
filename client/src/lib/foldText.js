// 긴 설명은 첫 문장만 보이고 나머지는 '가정 보기'로 접는다. 내용은 지우지 않는다.
export function splitDesc(desc) {
  if (typeof desc !== 'string' || desc.length <= 60) return [desc, '']
  const m = desc.match(/^(.+?다\.)\s+(.+)$/s)
  return m ? [m[1], m[2]] : [desc, '']
}
