// 공공데이터 조회 실패 사유를 담당자가 읽는 말로 바꾼다. 화면에 NO_KEY, HTTP 502 같은 내부 코드를 그대로 보이지 않는다
const TEXT = {
  NO_KEY: '연계 인증키 미설정',
  UPSTREAM: '기관 서버 응답 오류',
  EMPTY: '조회 결과 없음',
  KIND: '요청 형식 오류',
  METHOD: '요청 형식 오류'
}
export function openDataErrorText(code) {
  const c = String(code || '')
  if (!c) return '사유 미확인'
  if (TEXT[c]) return TEXT[c]
  const m = c.match(/^HTTP (\d{3})$/)
  if (m) return Number(m[1]) >= 500 ? '서버 응답 오류' : '요청 거부'
  if (/fetch|network|load failed/i.test(c)) return '연결 끊김'
  return '잠시 후 다시 조회'
}
