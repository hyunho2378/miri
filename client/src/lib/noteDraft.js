// 현장 소식 글만 먼저 저장(33회차, 플랫폼 셀 74). AI 읽기가 실패하거나 끊겨도 쓴 글을 잃지 않게,
// 읽기 결과 없이 '읽기 전' 소식으로 저장하고, 연결되면 확인 화면에서 다시 읽는다. 명부는 담당자 확인 뒤에만 바뀐다.
export function unreadNote({ id, req, now }) {
  return { id, personCode: req.personCode, villageCode: req.villageCode, source: 'dong', status: 'pending', receivedAt: now, current: req.current, mode: 'text', fileName: '', text: req.text, read: null, unread: true, mock: false }
}
export const canSaveTextOnly = (state) => !!state?.req && state.req.mode === 'text' && !!state.req.text && (state.phase === 'error' || state.phase === 'offline')
// 대상자 화면에서 들어올 때 ?p=코드 로 미리 고름
export const prefillCode = (search) => new URLSearchParams(search || '').get('p') || ''
