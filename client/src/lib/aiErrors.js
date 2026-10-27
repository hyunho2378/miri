// aiErrors.js AI 판독 오류를 담당자가 알아듣는 말로 바꾼다
export function aiErrorMessage(e, what = '서류') {
  const code = e?.code
  if (code === 'STORED_ONLY') return { title: '시연은 저장된 읽기 결과로 보여 드립니다', desc: `실시간 AI 호출은 멈춰 두었습니다. 샘플 ${what} 읽기를 골라 주세요.` }
  if (code === 'NO_KEY' || code === 503 || code === 404 || code === 405) return { title: '읽기 서버에 연결되지 않았습니다', desc: `샘플 ${what} 읽기로 화면을 확인해 주십시오.` }
  if (code === 'NEED_SESSION' || code === 401) return { title: '시연 코드가 필요합니다', desc: '로그인 화면에서 시연 코드를 입력하면 AI 서류 읽기를 쓸 수 있습니다. 샘플 읽기는 코드 없이 됩니다.' }
  if (code === 'NO_SESSION_CONFIG') return { title: 'AI 서류 읽기를 닫아 두었습니다', desc: '서버에 시연 코드 설정이 없습니다. 샘플 읽기로 화면을 확인해 주십시오.' }
  if (code === 'PII_REMAINS') return { title: '개인정보로 보이는 글자가 있어 멈췄습니다', desc: `${e.message}` }
  if (code === 'VIRTUAL_ONLY') return { title: '가상 자료 확인이 필요합니다', desc: '시안에서는 가상 자료만 처리합니다. 실제 개인정보가 담긴 자료는 올리지 마십시오.' }
  if (code === 'RATE_LIMIT' || code === 429) return { title: '잠시 뒤 다시 시도해 주십시오', desc: e.message }
  return { title: `${what} 읽기에 실패했습니다`, desc: `${e.message}. 샘플 ${what} 읽기로 화면을 확인해 주십시오.` }
}
