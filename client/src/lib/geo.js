// geo.js 상황판 지도용 순수 함수. 지도 라이브러리에 의존하지 않는다(테스트와 계산 분리).
// 좌표는 [경도, 위도] 순서(GeoJSON 규칙).
// 마을과 차량 위치는 가상이다. 동 경계 안에서 코드로 정해지는 결정적 위치이며 실제 위치가 아니다.
import { CITY_OUTLINE, DONG_GEO, DONGHAE_BBOX } from '../mock/geoDonghae.js'
import { HOUR } from './time.js'

export { DONGHAE_BBOX }

const M_PER_DEG_LAT = 111320
const mPerDegLng = (lat) => M_PER_DEG_LAT * Math.cos((lat * Math.PI) / 180)

export const dongGeo = (code) => DONG_GEO.find((d) => d.code === code)

// 짝수 홀수 규칙 점 포함 판정. 다각형 구멍까지 고려
function inRing(pt, ring) {
  const [x, y] = pt
  let inside = false
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i, i += 1) {
    const [xi, yi] = ring[i]
    const [xj, yj] = ring[j]
    if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside
  }
  return inside
}
export function inDong(pt, dong) {
  return dong.coordinates.some((poly) => inRing(pt, poly[0]) && !poly.slice(1).some((hole) => inRing(pt, hole)))
}

function dongExtent(dong) {
  const ring = dong.coordinates[0][0]
  const xs = ring.map((p) => p[0])
  const ys = ring.map((p) => p[1])
  return { w: Math.max(...xs) - Math.min(...xs), h: Math.max(...ys) - Math.min(...ys) }
}

// 문자열 해시(결정적). 같은 코드면 같은 위치
function hash(str) {
  let h = 2166136261
  for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) }
  return (h >>> 0) / 4294967295
}

// 중심점 둘레에 각도와 반경으로 놓고, 동 경계 밖이면 반경을 줄인다
function placeAround(dong, key, index, count, { arcFrom, arcTo, radiusRatio }) {
  const [cx, cy] = dong.centroid
  const { w, h } = dongExtent(dong)
  const span = arcTo - arcFrom
  const base = count > 1 ? arcFrom + (span * index) / (count - 1) : (arcFrom + arcTo) / 2
  const angle = ((base + (hash(key) - 0.5) * 18) * Math.PI) / 180
  let r = Math.min(w, h) * radiusRatio
  for (let k = 0; k < 8; k += 1) {
    const pt = [cx + Math.cos(angle) * r, cy + Math.sin(angle) * r * 0.8]
    if (inDong(pt, dong)) return [round5(pt[0]), round5(pt[1])]
    r *= 0.7
  }
  return [cx, cy]
}
const round5 = (x) => Math.round(x * 1e5) / 1e5

// 가상 마을 위치. 산림 연접 마을이라 동 중심에서 내륙(서쪽) 방향 호 위에 배치한다
export function placeVillages(villages) {
  const byDong = {}
  for (const v of villages) (byDong[v.dongCode] ||= []).push(v)
  const out = {}
  for (const [code, list] of Object.entries(byDong)) {
    const dong = dongGeo(code)
    if (!dong) continue
    const sorted = [...list].sort((a, b) => a.code.localeCompare(b.code))
    sorted.forEach((v, i) => {
      out[v.code] = placeAround(dong, v.code, i, sorted.length, { arcFrom: 110, arcTo: 250, radiusRatio: 0.3 })
    })
  }
  return out
}

// 가상 차량 위치. 소속 동 중심의 동쪽 호 위에 배치한다(기지 위치를 모르는 가정 표시)
export function placeVehicles(vehicles) {
  const byDong = {}
  for (const v of vehicles) (byDong[v.baseDong] ||= []).push(v)
  const out = {}
  for (const [code, list] of Object.entries(byDong)) {
    const dong = dongGeo(code)
    if (!dong) continue
    const sorted = [...list].sort((a, b) => a.code.localeCompare(b.code))
    sorted.forEach((v, i) => {
      out[v.code] = placeAround(dong, `veh-${v.code}`, i, sorted.length, { arcFrom: -70, arcTo: 70, radiusRatio: 0.16 })
    })
  }
  return out
}

// 부족분 단계. 0 은 부족 없음(중립). 1 이상은 heatDanger 1~4
export const SEVERITY_STEPS = [
  { level: 0, min: 0, max: 0, label: '부족 없음' },
  { level: 1, min: 1, max: 3, label: '1~3명' },
  { level: 2, min: 4, max: 6, label: '4~6명' },
  { level: 3, min: 7, max: 9, label: '7~9명' },
  { level: 4, min: 10, max: Infinity, label: '10명 이상' }
]
export function severityOf(n) {
  if (!n) return 0
  return SEVERITY_STEPS.find((s) => n >= s.min && n <= s.max)?.level ?? 4
}

// 시간 축 단순 비례 모델.
// 가정: 마을별 이송 가능 인원(대상자 수 - 부족분)이 준비 완료 시각부터 그 마을 이송 완료 기한까지 같은 속도로 옮겨진다.
// 부족분 인원은 끝까지 대기로 남는다. 실제 배정 순서(침상 우선, 차량 공유)와 다를 수 있다.
export function buildTimeline(result, villages, scenario, settings, t0) {
  const prepH = (scenario?.prepMinutes ?? settings.prepMinutes) / 60
  const rows = villages.map((v) => {
    const row = result.byVillage[v.code] || { targetTotal: 0, total: 0 }
    const dl = result.ctx?.deadlines?.[v.code]
    const deadlineH = dl ? (dl.completeBy - t0) / HOUR : (scenario?.windowHours ?? 8)
    const arrivalH = dl ? (dl.arrival - t0) / HOUR : deadlineH
    return { code: v.code, target: row.targetTotal, shortage: row.total, movable: Math.max(0, row.targetTotal - row.total), deadlineH, arrivalH }
  })
  const endH = Math.max(scenario?.windowHours ?? 8, ...rows.map((r) => r.arrivalH))
  const firstArrivalH = Math.min(...rows.map((r) => r.arrivalH))
  return { prepH, endH, firstArrivalH, rows }
}

export function progressAt(timeline, t) {
  const byCode = {}
  let moved = 0
  let waiting = 0
  for (const r of timeline.rows) {
    const span = Math.max(0.01, r.deadlineH - timeline.prepH)
    const ratio = Math.min(1, Math.max(0, (t - timeline.prepH) / span))
    const m = Math.round(r.movable * ratio)
    const w = r.target - m
    byCode[r.code] = { moved: m, waiting: w }
    moved += m
    waiting += w
  }
  return { byCode, moved, waiting }
}

// 산불 확산 가정 방향. 시나리오 도달 시각 차이(offsetHours)가 있을 때만 만든다.
// 가장 먼저 도달하는 마을 무리의 중심에서 가장 늦게 도달하는 무리의 중심으로 향하는 화살표
export function fireArrow(scenario, villages, positions) {
  const offs = villages.map((v) => ({ v, o: scenario?.offsetHours?.[v.code] ?? 0, p: positions[v.code] })).filter((x) => x.p)
  if (!offs.length) return null
  const min = Math.min(...offs.map((x) => x.o))
  const max = Math.max(...offs.map((x) => x.o))
  if (max - min < 0.01) return null
  const mean = (list) => [list.reduce((s, x) => s + x.p[0], 0) / list.length, list.reduce((s, x) => s + x.p[1], 0) / list.length]
  const from = mean(offs.filter((x) => x.o === min))
  const to = mean(offs.filter((x) => x.o === max))
  // 시작점을 첫 도달 무리 바깥(반대 방향 2.5km)으로 당긴다
  const lat = (from[1] + to[1]) / 2
  const dx = (to[0] - from[0]) * mPerDegLng(lat)
  const dy = (to[1] - from[1]) * M_PER_DEG_LAT
  const len = Math.hypot(dx, dy) || 1
  const ux = dx / len
  const uy = dy / len
  const start = [from[0] - (ux * 2500) / mPerDegLng(lat), from[1] - (uy * 2500) / M_PER_DEG_LAT]
  const head = 900
  const tip = to
  const back = [tip[0] - (ux * head) / mPerDegLng(lat), tip[1] - (uy * head) / M_PER_DEG_LAT]
  const side = (s) => [back[0] + (-uy * s * head * 0.55) / mPerDegLng(lat), back[1] + (ux * s * head * 0.55) / M_PER_DEG_LAT]
  return {
    line: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [start, back] } },
    head: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[tip, side(1), side(-1), tip]] } },
    mid: [(start[0] + back[0]) / 2, (start[1] + back[1]) / 2],
    firstHours: min,
    lastHours: max
  }
}

export function dongFeatures() {
  return {
    type: 'FeatureCollection',
    features: DONG_GEO.map((d) => ({ type: 'Feature', properties: { code: d.code, name: d.name }, geometry: { type: 'MultiPolygon', coordinates: d.coordinates } }))
  }
}
export function dongLabelFeatures() {
  return {
    type: 'FeatureCollection',
    features: DONG_GEO.map((d) => ({ type: 'Feature', properties: { code: d.code, name: d.name }, geometry: { type: 'Point', coordinates: d.centroid } }))
  }
}
export function cityOutlineFeature() {
  return { type: 'Feature', properties: {}, geometry: { type: 'MultiLineString', coordinates: CITY_OUTLINE } }
}

export const featureCollection = (features) => ({ type: 'FeatureCollection', features })
export const pointFeature = (coords, properties) => ({ type: 'Feature', properties, geometry: { type: 'Point', coordinates: coords } })

// 2026. 10. 2. 형식(PRD 4.2 표기)
export function fmtDotDate(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}
// 발령 후 경과 표기
export function fmtElapsed(h) {
  const total = Math.round(h * 60)
  const hh = Math.floor(total / 60)
  const mm = total % 60
  if (!hh) return `${mm}분`
  return mm ? `${hh}시간 ${mm}분` : `${hh}시간`
}
