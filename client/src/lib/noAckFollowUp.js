// 지정 도우미와 대체 도우미가 모두 응답하지 않을 때 담당자가 고르는 다음 할 일(45회차, 1026 인터뷰 반영).
// 근거: 망상동 행정복지센터 재난 담당 면담(2026. 10. 26.) "만약에 연락이 안되면 더 이상 할 방도가 없죠",
// 동해시 안전과 서면 답변(R43) "대피지원단 인원이 실제 상황 발생 시 상이할 것으로 판단됨".
// 배정 계산과 숫자는 바꾸지 않는다. 소방 인계는 기존 소방 지원 요청 흐름을 그대로 쓴다.

export const FOLLOW_UPS = [
  { key: 'officerCall', label: '담당 공무원이 직접 확인', desc: '동 담당 공무원이 대상자 댁에 전화하거나 찾아가 상태를 확인합니다.' },
  { key: 'broadcast', label: '마을 방송 요청', desc: '마을 방송과 이장, 통장 연락으로 이웃의 도움을 요청합니다.' },
  { key: 'fire', label: '소방 인계 목록으로 넘기기', desc: '이 도우미가 맡은 대상자를 소방 인계 목록에 넣고 지원을 요청합니다.' }
]

export const FOLLOW_UP_TITLE = '도우미 응답이 없을 때 다음 할 일'
export const FOLLOW_UP_BASIS = '지정 도우미와 대체 도우미가 모두 응답하지 않으면 담당자가 고르는 단계입니다.'

export const followUpOf = (key) => FOLLOW_UPS.find((f) => f.key === key) || null

// 동 담당자는 소방 요청을 직접 하지 않고 시 관리자에게 올린다(현장 휴대폰 규칙과 같음)
export function followUpKindFor(key, role) {
  if (key === 'fire' && role !== 'city') return 'fireAsk'
  return key
}

export const FOLLOW_UP_DONE = {
  officerCall: '담당 공무원 직접 확인 기록',
  broadcast: '마을 방송 요청 기록',
  fire: '소방 인계 목록으로 넘김',
  fireAsk: '시 관리자에게 소방 인계 요청'
}

// 이 도우미에게 남긴 마지막 다음 할 일
export function lastFollowUp(list, helper) {
  const mine = (list || []).filter((f) => f.helper === helper)
  return mine.length ? mine[mine.length - 1] : null
}

// 다음 할 일을 보여 줄 도우미인지: 무응답이나 불가인데 대체가 이미 요청됐거나 대체 배정이 실패한 경우
export function needsFollowUp(row, failedReplace) {
  if (!row || !['noack', 'decline'].includes(row.answer)) return false
  return !!row.replaced || !!failedReplace?.has?.(row.code)
}
