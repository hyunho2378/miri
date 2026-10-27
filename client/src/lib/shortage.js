// shortage.js 이송 등급, 차종, 부족분 공식. API_CONTRACT 3절, PLAN 3.1과 3.2.
// 등급 상수와 정렬 순서의 단일 출처. 다른 파일에서 등급 배열을 다시 정의하지 않는다.

export const GRADES = [
  { key: 'bed', label: '침상', weight: 4, helpers: 0, target: '누운 상태로만 이송 가능', need: '구급차 또는 침상 승합차와 구급대원' },
  { key: 'wheelchair', label: '휠체어', weight: 3, helpers: 2, target: '휠체어에 앉은 채로 이동', need: '리프트 승합차와 도우미 2명' },
  { key: 'assist', label: '부축', weight: 2, helpers: 1, target: '부축을 받으면 승용차 탑승 가능', need: '승용차와 도우미 1명' },
  { key: 'walk', label: '도보', weight: 1, helpers: 1, target: '안내만 받으면 스스로 이동', need: '마을 버스 또는 승용차와 인솔 1명' }
]
export const GRADE_KEYS = GRADES.map((g) => g.key)
export const GRADE_RANK = Object.fromEntries(GRADES.map((g, i) => [g.key, i]))
export const gradeOf = (key) => GRADES.find((g) => g.key === key)
export const emptyByGrade = () => Object.fromEntries(GRADE_KEYS.map((k) => [k, 0]))

// 차종별 회차당 탑승 정원. 동해소방서와 요양시설 자문 전 가정값(PLAN 6절 2)
export const VEHICLE_TYPES = [
  { key: 'ambulance', label: '구급차', capacity: { bed: 1 } },
  { key: 'bedVan', label: '침상 승합차', capacity: { bed: 2 } },
  { key: 'liftVan', label: '리프트 승합차', capacity: { wheelchair: 3 } },
  { key: 'car', label: '승용차', capacity: { assist: 3, walk: 4 } },
  { key: 'bus', label: '마을버스', capacity: { walk: 20 } }
]
export const typeOf = (key) => VEHICLE_TYPES.find((t) => t.key === key)
export const capOf = (vehicle, grade) => typeOf(vehicle.type)?.capacity?.[grade] || 0

// 부족분 해소용 추가 협약 차종 우선순위
export const EXTRA_TYPE = { bed: 'bedVan', wheelchair: 'liftVan', assist: 'car', walk: 'bus' }

// 차량 소속(회신 R43, 지자체 재난안전 부서 서면 답변 2026. 10. 22.): 재난 때 시 공용차량(버스, 승합차)을 먼저 투입하고 택시와 버스는 교통 담당 부서가 그때 업체에 요청한다.
// 요청 차량(request)은 사전 약속이 없어 기본 가용 확실성을 미확인으로 둔다. 협약 승용차(contract)는 부족분 근거로 사전 협약 규모를 제안하는 시나리오 항목이다.
export const OWNERS = { fire: '소방 구급차(가용분만 계산)', city: '시 공용차량', facility: '기관(요양시설, 주야간보호기관)', request: '교통 부서 요청(택시, 버스 회사)', contract: '협약 승용차(제안)' }
export const VEHICLE_NOTE = '개인 차량은 등록하지 않습니다. 재난 때는 시 공용차량을 먼저 쓰고, 택시와 버스는 교통 부서가 업체에 요청합니다(확인 전 차량으로 따로 셉니다). 협약 승용차는 부족분을 근거로 미리 협약을 맺도록 제안합니다. 장기요양 민간 기관 차량은 낮에는 이용 어르신이 먼저이고 근무 시간 밖에는 쓰기 어려워 확인 전 차량으로 둡니다(동해시노인종합복지관 주간보호센터 면담, 2026. 10. 26.). 해군과 기업 통근 버스는 협약 후보로 둡니다'
export const vehicleLabel = (v) => `${v.code} ${OWNERS[v.owner] || '소속 확인 필요'}, ${COMMITMENTS[commitmentOf(v)]}`

// 차량 가용 확실성(회신 R01): 소방 구급차는 지자체 가용 차량과 따로 보고, 협약이나 소유로 약속된 차량과 아직 확인하지 않은 차량을 나눈다
export const COMMITMENTS = { agreed: '협약 확정', unconfirmed: '미확정', fire: '소방 운용' }
export const commitmentOf = (v) => v?.commitment || (v?.owner === 'fire' ? 'fire' : (v?.owner === 'facility' || v?.owner === 'request') ? 'unconfirmed' : 'agreed')

// 도우미 역할(회신 R12)
export const HELPER_ROLES = { ride: '차량 동행', walk: '도보 지원', contact: '연락 지원', supply: '물품 전달' }
// 도우미 소속(회신 R43): 시가 통반장, 자율방재단, 사회단체 인력을 거동불편자와 1대1로 지정한다. 지정만으로는 실제 인원을 알 수 없어 미리는 지정 짝을 기본 후보로 두고 수락해야 배정한다.
// careWorker, licensedCare: 1026 복지관 면담과 유케어센터 통화(생활지원사, 쉬고 있는 요양보호사 자격 보유자를 도울 사람으로). 계산에 쓰는 도우미 수는 그대로
export const HELPER_AFFILIATIONS = { leader: '통반장', disasterCorps: '자율방재단', civic: '사회단체', officer: '대피담당공무원', careWorker: '생활지원사(유케어센터)', licensedCare: '요양보호사 자격 보유자', volunteer: '봉사자', other: '기타' }
export const affiliationLabel = (h) => HELPER_AFFILIATIONS[h?.affiliation] || '소속 확인 필요'

// 원문 공식(SOURCE B). 왕복 가능 횟수는 소수 버림
export function tripsPossible(availableMinutes, roundTripMinutes) {
  if (!roundTripMinutes || roundTripMinutes <= 0) return 0
  return Math.max(0, Math.floor(availableMinutes / roundTripMinutes))
}

export function formulaShortage({ persons, vehicles, capacity = 1, windowHours = 8, prepMinutes = 60, completeBeforeHours = 0, roundTripMinutes }) {
  const availableMinutes = (windowHours - completeBeforeHours) * 60 - prepMinutes
  const trips = tripsPossible(availableMinutes, roundTripMinutes)
  const movable = Math.floor(vehicles * trips * capacity)
  return { availableMinutes, trips, movable, shortage: Math.max(0, persons - movable) }
}
