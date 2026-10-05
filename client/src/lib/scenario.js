// scenario.js 산불 시나리오와 시나리오별 마을 범위, 대피소 배정. 순수 함수.
// 도달 시각 모델(가정): 발화 가정 지점에서 확산 방향(heading)으로 뻗은 띠를 둔다.
//   띠 안(옆 거리 halfWidthKm 이내, 앞쪽) 마을만 영향권이다. 도달 시각 = 발령 후 leadHours + 앞쪽 거리 ÷ 확산 속도.
//   leadHours 는 발화 전에 사전 발령한 시간(발화 확인 후 발령이면 0). 지형, 바람 변화, 연료는 반영하지 않는다.
// 대피 대상 구역: 영향권 마을 가운데 첫 도달 뒤 scopeHours 안에 닿는 마을. 시 전체 시나리오는 모든 마을.
// 대피소 배정: 가까운 임시주거시설부터 고르되, 확산 시나리오에서는 대피 대상 구역 안의 시설을 피하고
//   수용 가능 인원을 넘기면 다음으로 가까운 시설로 넘긴다.

const M_PER_DEG_LAT = 111320
export function distKm([lon1, lat1], [lon2, lat2]) {
  const lat = ((lat1 + lat2) / 2) * (Math.PI / 180)
  return Math.hypot((lon2 - lon1) * M_PER_DEG_LAT * Math.cos(lat), (lat2 - lat1) * M_PER_DEG_LAT) / 1000
}
const r2 = (x) => Math.round(x * 100) / 100

// 확산 시나리오 만들기. villages 는 lngLat 이 있는 마을 목록. heading 은 북쪽 0도 기준 시계 방향
export function spreadGeometry(origin, heading, lngLat) {
  const lat = ((origin[1] + lngLat[1]) / 2) * (Math.PI / 180)
  const dx = ((lngLat[0] - origin[0]) * M_PER_DEG_LAT * Math.cos(lat)) / 1000
  const dy = ((lngLat[1] - origin[1]) * M_PER_DEG_LAT) / 1000
  const h = (heading * Math.PI) / 180
  const ux = Math.sin(h)
  const uy = Math.cos(h)
  return { along: dx * ux + dy * uy, lateral: Math.abs(dx * uy - dy * ux) }
}

export function fireScenario({ id, name, origin, originLabel, heading, halfWidthKm = 4, speedKmh, leadHours = 0, scopeHours, villages, basis, prepMinutes = 60 }) {
  const geo = Object.fromEntries(villages.map((v) => [v.code, spreadGeometry(origin, heading, v.lngLat)]))
  const front = villages.filter((v) => geo[v.code].along >= 0 && geo[v.code].lateral <= halfWidthKm)
  const amin = Math.min(...front.map((v) => geo[v.code].along))
  const windowHours = r2(leadHours + amin / speedKmh)
  const offsetHours = {}
  for (const v of villages) {
    const g = geo[v.code]
    // 띠 밖 마을은 도달하지 않는 것으로 보고 화면용으로만 늦은 값을 둔다
    offsetHours[v.code] = r2(Math.max(0, g.along - amin) / speedKmh + (front.includes(v) ? 0 : 24))
  }
  const affected = front.filter((v) => offsetHours[v.code] <= scopeHours).map((v) => v.code)
  return {
    id, name, kind: 'fire', origin, originLabel, heading, halfWidthKm, speedKmh, leadHours, scopeHours, windowHours, prepMinutes,
    completeBeforeHours: 0, extraVehicles: {}, offsetHours, affected,
    alongKm: Object.fromEntries(villages.map((v) => [v.code, r2(geo[v.code].along)])),
    basis, avoidAffectedShelters: true
  }
}

export function citywideScenario({ id, name, villages, windowHours = 8, prepMinutes = 60, basis }) {
  return {
    id, name, kind: 'all', windowHours, prepMinutes, completeBeforeHours: 0, extraVehicles: {},
    offsetHours: Object.fromEntries(villages.map((v) => [v.code, 0])),
    affected: villages.map((v) => v.code), basis, avoidAffectedShelters: false
  }
}

// 시나리오 범위 판정. affected 가 없으면(이전 형식) 모든 마을이 범위 안
export function inScopeSet(scenario, villages) {
  return new Set(scenario?.affected?.length ? scenario.affected : villages.map((v) => v.code))
}

// 시나리오별 마을 정보: 범위, 배정 대피소, 왕복 시간.
// v.drive = [[대피소코드, 주행 분, km], ...] 가까운 순. shelters 는 { code, capacity, villageCode }
export function resolveVillages({ villages, persons, scenario, shelters = [], settings = {} }) {
  const scope = inScopeSet(scenario, villages)
  const boarding = settings.boardingMinutes ?? 20
  const smap = Object.fromEntries(shelters.map((s) => [s.code, s]))
  const count = {}
  for (const p of persons || []) if (p.review !== 'rejected') count[p.villageCode] = (count[p.villageCode] || 0) + 1
  const load = {}
  const avoid = scenario?.avoidAffectedShelters
  // 도달이 빠른 마을부터 대피소를 잡는다
  const order = [...villages].sort((a, b) => (scenario?.offsetHours?.[a.code] ?? 0) - (scenario?.offsetHours?.[b.code] ?? 0) || a.code.localeCompare(b.code))
  const out = {}
  for (const v of order) {
    const inScope = scope.has(v.code)
    const base = { ...v, inScope, plannedShelter: v.shelterCode, shelterNote: null }
    if (!inScope || !v.drive?.length) { out[v.code] = base; continue }
    const need = count[v.code] || 0
    const ok = (c) => {
      const s = smap[c]
      if (!s) return false
      if (avoid && s.villageCode && scope.has(s.villageCode)) return false
      return (load[c] || 0) + need <= s.capacity
    }
    const eligible = v.drive.filter(([c]) => smap[c] && !(avoid && smap[c].villageCode && scope.has(smap[c].villageCode)))
    const room = (c) => smap[c].capacity - (load[c] || 0)
    let pick = eligible.find(([c]) => room(c) >= need)
    let note = null
    if (!pick) {
      // 한 곳에 다 못 들어가면 남는 자리가 있는 가장 가까운 시설을 주 시설로 두고 나머지는 다음 시설로 나눈다
      pick = eligible.find(([c]) => room(c) > 0) || eligible[0] || v.drive[0]
      note = eligible.some(([c]) => room(c) > 0) ? 'split' : 'overflow'
    }
    const [code, min] = pick
    if (code !== v.shelterCode && !note) {
      const planned = smap[v.shelterCode]
      note = avoid && planned && scope.has(planned.villageCode) ? 'inFirePath' : 'capacity'
    }
    const parts = []
    if (note === 'split') {
      let left = need
      for (const [c] of eligible) {
        if (left <= 0) break
        const take = Math.min(left, Math.max(0, room(c)))
        if (take > 0) { load[c] = (load[c] || 0) + take; parts.push([c, take]); left -= take }
      }
      if (left > 0) { load[code] = (load[code] || 0) + left; parts.push([code, left]) }
    } else {
      load[code] = (load[code] || 0) + need
      parts.push([code, need])
    }
    out[v.code] = { ...base, shelterCode: code, shelterParts: parts, driveMin: min, roundTripMin: Math.round(2 * min + boarding), shelterNote: note }
  }
  return { villages: villages.map((v) => out[v.code]), shelterLoad: load, scope }
}

export const SHELTER_NOTE = {
  inFirePath: '평시 지정 시설이 대피 대상 구역 안에 있어 구역 밖 시설로 바꿨습니다.',
  capacity: '가까운 시설의 수용 가능 인원이 차서 다음으로 가까운 시설로 넘겼습니다.',
  split: '한 시설에 모두 들어가지 않아 가장 가까운 시설에 먼저 배정하고 남는 인원은 다음 시설로 나눕니다.',
  overflow: '대피 대상 구역 밖 임시주거시설의 수용 가능 인원이 모두 찼습니다. 추가 시설 지정이 필요합니다.'
}
