// aiErrors.js AI 판독 오류를 담당자가 알아듣는 말로 바꾼다
// 화면 단추 이름(예시 서류 읽기, 예시 소식)과 같은 말을 쓴다(2026. 11. 14. 점검: 오류 문구만 '샘플'이라 단추를 찾기 어려움)
export function aiErrorMessage(e, what = '서류') {
  const code = e?.code
  if (code === 'STORED_ONLY') return { title: '저장된 읽기 결과만 사용 가능', desc: `예시 ${what} 읽기 선택` }
  if (code === 'NO_KEY' || code === 503 || code === 404 || code === 405) return { title: '읽기 서버 연결 실패', desc: `예시 ${what} 읽기 선택` }
  if (code === 'NEED_SESSION' || code === 401) return { title: '접속 코드 필요', desc: '로그인 화면에서 접속 코드 입력 시 AI 서류 읽기 사용, 예시 읽기는 코드 없이 가능' }
  if (code === 'NO_SESSION_CONFIG') return { title: 'AI 서류 읽기 사용 불가', desc: '서버에 접속 코드 설정 없음, 예시 읽기 선택' }
  if (code === 'PII_REMAINS') return { title: '개인정보로 보이는 글자가 있어 멈췄습니다', desc: `${e.message}` }
  if (code === 'VIRTUAL_ONLY') return { title: '개인정보 없는 서류만 처리', desc: '실제 개인정보가 담긴 서류 업로드 금지' }
  if (code === 'RATE_LIMIT' || code === 429) return { title: '잠시 뒤 다시 시도', desc: e.message }
  return { title: `${what} 읽기 실패`, desc: `${e.message}. 예시 ${what} 읽기 선택` }
}
