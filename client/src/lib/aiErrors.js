// aiErrors.js AI 판독 오류를 담당자가 알아듣는 말로 바꾼다
export function aiErrorMessage(e, what = '서류') {
  const code = e?.code
  if (code === 'STORED_ONLY') return { title: '저장된 읽기 결과만 사용 가능', desc: `샘플 ${what} 읽기 선택` }
  if (code === 'NO_KEY' || code === 503 || code === 404 || code === 405) return { title: '읽기 서버 연결 실패', desc: `샘플 ${what} 읽기 선택` }
  if (code === 'NEED_SESSION' || code === 401) return { title: '접속 코드 필요', desc: '로그인 화면에서 접속 코드 입력 시 AI 서류 읽기 사용, 샘플 읽기는 코드 없이 가능' }
  if (code === 'NO_SESSION_CONFIG') return { title: 'AI 서류 읽기 사용 불가', desc: '서버에 접속 코드 설정 없음, 샘플 읽기 선택' }
  if (code === 'PII_REMAINS') return { title: '개인정보로 보이는 글자가 있어 멈췄습니다', desc: `${e.message}` }
  if (code === 'VIRTUAL_ONLY') return { title: '개인정보 없는 서류만 처리', desc: '실제 개인정보가 담긴 서류 업로드 금지' }
  if (code === 'RATE_LIMIT' || code === 429) return { title: '잠시 뒤 다시 시도', desc: e.message }
  return { title: `${what} 읽기 실패`, desc: `${e.message}. 샘플 ${what} 읽기 선택` }
}
