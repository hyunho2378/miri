// tripChecks.js 배정표와 도우미 화면의 확인 표시. 순수 함수. 배정 계산(부족분, 회차)은 바꾸지 않고 표시만 만든다.
// - 대상자: 평소 돌봄 담당자 동행 연락, 의사소통 유의, 보조기구(치매 전문 언론 자문 회신)
// - 대피소: 리프트 차량 진입, 야간과 휴일 개방 담당(재난문자 지도 서비스 개발자 자문 회신). 값이 없으면 확인 필요
// - 경로: 상업 길찾기를 쓰지 않으므로 마을 집결지와 대피소를 잇는 직선만 본다. 도로 경로 판단이 아님
import { distKm, spreadGeometry } from './scenario.js'

export const UNKNOWN = '확인 필요'
export const ROUTE_NOTE = '직선 기준, 도로 경로 아님'

// 대상자 돌봄과 의사소통 정보. 값이 없는 대상자(판독 확인 대기 등)는 확인 필요로 본다
export function personCare(person) {
  const care = person?.care
  if (!care) return { known: false, companionCall: false, caregiverUnreachable: false, commCaution: false, comm: [], aids: [], caregiverType: UNKNOWN, reachableLabel: UNKNOWN }
  const hasCaregiver = !!care.caregiverType && care.caregiverType !== '없음'
  return {
    known: true,
    companionCall: hasCaregiver && care.caregiverReachable === true,
    caregiverUnreachable: hasCaregiver && care.caregiverReachable === false,
    commCaution: (care.comm || []).length > 0,
    comm: care.comm || [],
    aids: care.aids || [],
    caregiverType: care.caregiverType || UNKNOWN,
    reachableLabel: !hasCaregiver ? '해당 없음' : care.caregiverReachable === true ? '연락 가능' : care.caregiverReachable === false ? '연락 불가' : UNKNOWN
  }
}

// 대피소 확인 항목. true, false, null(미확인)
export function shelterAccess(shelter) {
  const lift = shelter?.liftAccess
  const night = shelter?.nightOpen
  return {
    liftLabel: lift === true ? '진입 가능' : lift === false ? '진입 불가' : UNKNOWN,
    liftUnchecked: lift !== true,
    nightLabel: night ? String(night) : UNKNOWN
  }
}

const NEEDS_LIFT = new Set(['wheelchair', 'bed'])

function sample(a, b, n = 24) {
  const pts = []
  for (let i = 1; i <= n; i += 1) {
    const t = i / n
    pts.push([a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t])
  }
  return pts
}

// 점에서 선분까지 거리(km). 짧은 거리라 평면 근사
function pointSegKm(p, a, b) {
  const lat = (a[1] * Math.PI) / 180
  const kx = 111.32 * Math.cos(lat)
  const ky = 111.32
  const ax = a[0] * kx, ay = a[1] * ky, bx = b[0] * kx, by = b[1] * ky, px = p[0] * kx, py = p[1] * ky
  const dx = bx - ax, dy = by - ay
  const L = dx * dx + dy * dy
  const t = L ? Math.max(0, Math.min(1, ((px - ax) * dx + (py - ay) * dy) / L)) : 0
  return Math.hypot(px - (ax + t * dx), py - (ay + t * dy))
}

// 직선 구간이 산불 영향 범위를 지나는지.
// 확산 시나리오: 확산 띠 안에서 출발 마을보다 발화 가정 지점 쪽으로 0.3km 넘게 들어가는 점이 있거나,
//   도착 대피소가 띠 안 대피 대상 구역 범위(가장 먼 대상 마을까지)에 있으면 경로 확인 필요
// 그 밖의 시나리오: 출발 마을이 아닌 대피 대상 마을 기준점 0.5km 안을 지나면 경로 확인 필요
export function routeCrossesHazard({ from, to, fromVillage, scenario, villages = [] }) {
  if (!from || !to || !scenario) return false
  if (scenario.kind === 'fire' && scenario.origin && Number.isFinite(scenario.heading)) {
    const half = scenario.halfWidthKm ?? 4
    const affected = new Set(scenario.affected || [])
    const alongs = villages.filter((v) => affected.has(v.code)).map((v) => spreadGeometry(scenario.origin, scenario.heading, v.lngLat).along)
    const maxAlong = alongs.length ? Math.max(...alongs) : 0
    const start = spreadGeometry(scenario.origin, scenario.heading, from)
    for (const pt of sample(from, to)) {
      const g = spreadGeometry(scenario.origin, scenario.heading, pt)
      if (g.along >= 0 && g.lateral <= half && g.along < start.along - 0.3) return true
    }
    const end = spreadGeometry(scenario.origin, scenario.heading, to)
    return end.along >= 0 && end.lateral <= half && end.along <= maxAlong
  }
  const affected = new Set(scenario.affected || [])
  return villages.some((v) => v.code !== fromVillage && affected.has(v.code) && v.lngLat && pointSegKm(v.lngLat, from, to) <= 0.5 && distKm(v.lngLat, from) > 0.5)
}

// 회차 하나의 확인 표시. shelterCodes 는 회차 목적지(분산이면 여럿), 없으면 마을 기본 대피소
export function tripChecks({ trip, persons = {}, shelters = {}, villages = [], scenario, villageShelter }) {
  const vmap = Object.fromEntries(villages.map((v) => [v.code, v]))
  const village = vmap[trip.village]
  const destCodes = trip.shelters?.length ? trip.shelters : [villageShelter?.(trip.village)].filter(Boolean)
  const dests = destCodes.map((c) => shelters[c]).filter(Boolean)
  const cares = trip.personCodes.map((c) => ({ code: c, ...personCare(persons[c]) }))
  const liftUnchecked = NEEDS_LIFT.has(trip.grade) ? dests.filter((s) => shelterAccess(s).liftUnchecked).map((s) => s.name) : []
  const routeCheck = dests.some((s) => routeCrossesHazard({ from: village?.lngLat, to: s.lngLat, fromVillage: trip.village, scenario, villages }))
  return {
    companionCall: cares.filter((c) => c.companionCall).map((c) => c.code),
    caregiverUnreachable: cares.filter((c) => c.caregiverUnreachable).map((c) => c.code),
    commCaution: cares.filter((c) => c.commCaution).map((c) => c.code),
    liftUnchecked,
    routeCheck
  }
}

// 대피소 목록에 확인 칸을 붙인다(값이 없으면 null). 자료가 들어오면 같은 이름으로 채운다
export function withShelterChecks(list) {
  return list.map((s) => ({ ...s, liftAccess: s.liftAccess ?? null, nightOpen: s.nightOpen ?? null }))
}

// 회차 확인 결과를 화면 문구로(담당자 배정표, 도우미 화면, 서버 배정 요약 공통). 인원 수와 시설명만, 개인정보 없음
export function tripCheckNotes(checks) {
  if (!checks) return []
  const notes = []
  if (checks.companionCall.length) notes.push({ tone: 'primary', text: `동행 연락 필요 ${checks.companionCall.length}명(평소 돌봄 담당자)` })
  if (checks.caregiverUnreachable.length) notes.push({ tone: 'warning', text: `돌봄 담당자 연락 불가 ${checks.caregiverUnreachable.length}명` })
  if (checks.commCaution.length) notes.push({ tone: 'primary', text: `의사소통 유의 ${checks.commCaution.length}명` })
  if (checks.liftUnchecked.length) notes.push({ tone: 'warning', text: `리프트 차량 진입 확인 필요: ${checks.liftUnchecked.join(', ')}` })
  if (checks.routeCheck) notes.push({ tone: 'warning', text: '경로 확인 필요(직선 기준, 도로 경로 아님)' })
  return notes
}

// 여러 회차 확인 결과 합치기
export function mergeChecks(list) {
  return list.reduce((m, c) => ({
    companionCall: [...m.companionCall, ...c.companionCall], caregiverUnreachable: [...m.caregiverUnreachable, ...c.caregiverUnreachable],
    commCaution: [...m.commCaution, ...c.commCaution], liftUnchecked: [...new Set([...m.liftUnchecked, ...c.liftUnchecked])], routeCheck: m.routeCheck || c.routeCheck
  }), { companionCall: [], caregiverUnreachable: [], commCaution: [], liftUnchecked: [], routeCheck: false })
}
