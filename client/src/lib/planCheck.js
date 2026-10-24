// 당사자와 계획 확인(마지막 확인 날짜) 기록. 31회차 플랫폼 셀 83 후속 교차 점검:
// 명부 편집 저장, 서류 읽기 확정, 현장 메모 반영이 갱신일(updatedAt)만 바꾸고 마지막 확인 날짜(planCheckedAt)는
// 시드에서만 정해져, 담당자가 확인해도 '명부 재확인 필요' 인원이 줄지 않았다.
// 담당자가 '확인 완료'를 누르거나 저장 때 '확인 완료로 함께 기록'을 켠 경우에만 마지막 확인 날짜를 바꾼다.
// 현장 메모 반영은 당사자 확인이 아니므로 바꾸지 않는다.

export const PLAN_CHECK_VIA = { manual: '명부 확인 완료', edit: '명부 수정 저장', intake: '서류 읽기 확인' }

// 시 담당자는 전체, 동 담당자는 자기 동 대상자만
export function canConfirmPlan(user, person, dongOf) {
  if (!user || !person) return false
  if (user.role === 'city') return true
  if (user.role === 'dong') return !!user.dong && dongOf(person.villageCode) === user.dong
  return false
}

// 누가(역할과 이름), 언제, 어떤 화면에서 확인했는지 남긴다
export function applyPlanCheck(person, { at, by, via }) {
  const entry = { at, by: by || null, via: via || 'manual' }
  return { ...person, planCheckedAt: at, planChecks: [...(person.planChecks || []), entry] }
}

export function lastPlanCheck(person) {
  const list = person?.planChecks || []
  return list.length ? list[list.length - 1] : null
}

export function checkerOf(user) {
  if (!user) return null
  return { role: user.role, name: user.name }
}
