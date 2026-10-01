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

export const OWNERS = { fire: '소방', city: '시청', facility: '요양시설', contract: '민간 협약' }

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
