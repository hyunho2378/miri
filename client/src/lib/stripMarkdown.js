// stripMarkdown.js 동해사이 useSovereignChat.js 검증 완료 로직 이식. 수정 금지.
// 모델이 남긴 마크다운 기호를 지우고 볼드 뒤 조사를 받침에 맞게 고친다.

const EMOJI = /[\u{1F000}-\u{1FAFF}\u{2600}-\u{27BF}\u{FE0F}\u{200D}]/gu
export function stripEmoji(text) {
  return (text || '').replace(EMOJI, '')
}

// 한글 마지막 글자의 받침 유무. 반환 null(한글 아님), 0(받침 없음), 8(ㄹ받침), 그 외 양수(받침 있음)
function lastBatchim(word) {
  const ch = (word || '').trimEnd().slice(-1)
  if (!ch) return null
  const code = ch.charCodeAt(0)
  if (code < 0xac00 || code > 0xd7a3) return null
  return (code - 0xac00) % 28
}

function correctJosa(word, josa) {
  const jong = lastBatchim(word)
  if (jong === null) return josa
  const has = jong !== 0
  switch (josa) {
    case '은': case '는': return has ? '은' : '는'
    case '이': case '가': return has ? '이' : '가'
    case '을': case '를': return has ? '을' : '를'
    case '과': case '와': return has ? '과' : '와'
    case '으로': case '로': return (!has || jong === 8) ? '로' : '으로'
    default: return josa
  }
}

// 볼드로 감싼 명사 뒤에 붙은 조사만 교정한다. 범위를 볼드 뒤로 한정해 멀쩡한 문장을 안 깨뜨린다
export function fixJosa(text) {
  return text.replace(/(\*\*[^*\n]+\*\*)(으로|로|은|는|이|가|을|를|과|와)/g,
    (_, bold, josa) => bold + correctJosa(bold.slice(2, -2), josa))
}

export function stripMarkdown(text) {
  let out = stripEmoji(text)
    .replace(/^#{1,6}\s*/gm, '')
    .replace(/^([ \t]*)\*[ \t]+/gm, '$1- ')      // 별표 불릿 → 하이픈 불릿
    .replace(/[#`]/g, '')
    .replace(/\*{3,}/g, '**')
    .replace(/([^\d\s*])\s*:[ \t]+/g, '$1 ')     // 일반 항목 콜론 제거. 볼드 뒤와 시각 10:00 은 유지
  out = out.replace(/(^|[^*])\*([^*\n]+?)\*(?!\*)/g, '$1**$2**')   // 홑별표 강조 → 볼드
  out = out.replace(/(^|[^*])\*(?!\*)/g, '$1')                      // 짝 없는 홑별표 제거
  const marks = out.match(/\*\*/g)
  if (marks && marks.length % 2 === 1) out = out.replace(/\*\*(?=[^*]*$)/, '')  // 스트리밍 중 미완성 볼드 감춤
  return fixJosa(out)
}
