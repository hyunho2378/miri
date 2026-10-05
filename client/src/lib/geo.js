// geo.js 상황판 지도용 순수 함수. 지도 라이브러리에 의존하지 않는다(테스트와 계산 분리).
// 좌표는 [경도, 위도] 순서(GeoJSON 규칙).
// 마을 위치는 실제 마을 집결지(경로당) 좌표다(donghaeData.js). 좌표가 없는 마을만 동 경계 안 결정적 위치로 둔다.
// 차량 위치는 가정이다. 소속 동 행정복지센터 둘레에 둔다.
import { CITY_OUTLINE, DONG_GEO, DONGHAE_BBOX } from '../mock/geoDonghae.js'
import { DONG_CENTERS, DONG_STATS } from '../mock/donghaeData.js'
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

// 마을 위치. 실제 좌표가 있으면 그대로 쓰고, 없으면 동 중심 둘레에 결정적으로 둔다
export function placeVillages(villages) {
  const out = {}
  const byDong = {}
  for (const v of villages) {
    if (Array.isArray(v.lngLat)) out[v.code] = v.lngLat
    else (byDong[v.dongCode] ||= []).push(v)
  }
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

// 차량 위치(가정). 소속 동 행정복지센터 둘레 300m 안에 둔다. 센터 좌표가 없으면 동 중심 둘레
export function placeVehicles(vehicles) {
  const byDong = {}
  for (const v of vehicles) (byDong[v.baseDong] ||= []).push(v)
  const out = {}
  for (const [code, list] of Object.entries(byDong)) {
    const center = DONG_CENTERS.find((c) => c.dong === code)?.lngLat
    const dong = dongGeo(code)
    const sorted = [...list].sort((a, b) => a.code.localeCompare(b.code))
    sorted.forEach((v, i) => {
      if (center) {
        const ang = ((i / Math.max(1, sorted.length)) * 360 + hash(v.code) * 20) * (Math.PI / 180)
        const rM = 120 + (i % 3) * 90
        out[v.code] = [round5(center[0] + (Math.cos(ang) * rM) / mPerDegLng(center[1])), round5(center[1] + (Math.sin(ang) * rM) / M_PER_DEG_LAT)]
      } else if (dong) {
        out[v.code] = placeAround(dong, `veh-${v.code}`, i, sorted.length, { arcFrom: -70, arcTo: 70, radiusRatio: 0.16 })
      }
    })
  }
  return out
}

// 부족분 단계. 0 은 부족 없음(중립). 1 이상은 heatDanger 1~4
export const SEVERITY_STEPS = [
  { level: 0, min: 0, max: 0, label: '부족 없음' },
  { level: 1, min: 1, max: 9, label: '1~9명' },
  { level: 2, min: 10, max: 29, label: '10~29명' },
  { level: 3, min: 30, max: 79, label: '30~79명' },
  { level: 4, min: 80, max: Infinity, label: '80명 이상' }
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
    const raw = result.byVillage[v.code] || { targetTotal: 0, total: 0 }
    // 대피 대상 구역 밖 마을은 이송 대상이 아니므로 시간 축에서 뺀다
    const row = raw.inScope === false ? { targetTotal: 0, total: 0 } : raw
    const dl = result.ctx?.deadlines?.[v.code]
    const deadlineH = dl ? (dl.completeBy - t0) / HOUR : (scenario?.windowHours ?? 8)
    const arrivalH = dl ? (dl.arrival - t0) / HOUR : deadlineH
    return { code: v.code, target: row.targetTotal, shortage: row.total, movable: Math.max(0, row.targetTotal - row.total), deadlineH, arrivalH }
  })
  const live = rows.filter((r) => r.target > 0)
  const endH = Math.max(scenario?.windowHours ?? 8, ...live.map((r) => r.arrivalH))
  const firstArrivalH = live.length ? Math.min(...live.map((r) => r.arrivalH)) : (scenario?.windowHours ?? 8)
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

// 산불 확산 가정 구역. 발화 가정 지점에서 확산 방향으로 뻗은 띠(대피 대상 구역 끝까지)와 화살표.
// 시 전체 시나리오처럼 발화 지점이 없으면 null
export function fireArrow(scenario, villages) {
  if (!scenario?.origin || scenario.heading == null) return null
  const o = scenario.origin
  const h = (scenario.heading * Math.PI) / 180
  const ux = Math.sin(h)
  const uy = Math.cos(h)
  const lat = o[1]
  const at = (alongKm, sideKm) => [
    o[0] + ((ux * alongKm + uy * sideKm) * 1000) / mPerDegLng(lat),
    o[1] + ((uy * alongKm - ux * sideKm) * 1000) / M_PER_DEG_LAT
  ]
  const scoped = new Set(scenario.affected || [])
  const alongs = villages.filter((v) => scoped.has(v.code)).map((v) => scenario.alongKm?.[v.code]).filter((x) => x != null)
  const far = (alongs.length ? Math.max(...alongs) : 8) + 1.2
  const w = scenario.halfWidthKm ?? 4
  const zone = { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[at(0, -w * 0.35), at(0, w * 0.35), at(far, w), at(far, -w), at(0, -w * 0.35)]] } }
  const headLen = 0.9
  const tip = at(far - 0.4, 0)
  const back = at(far - 0.4 - headLen, 0)
  return {
    zone,
    line: { type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [at(0.3, 0), back] } },
    head: { type: 'Feature', properties: {}, geometry: { type: 'Polygon', coordinates: [[tip, at(far - 0.4 - headLen, 0.5), at(far - 0.4 - headLen, -0.5), tip]] } },
    origin: o,
    mid: at(far * 0.45, 0),
    firstHours: scenario.windowHours,
    lastHours: scenario.windowHours + Math.max(0, ...(scenario.affected || []).map((c) => scenario.offsetHours?.[c] ?? 0)),
    label: `${scenario.originLabel} 발화 가정`
  }
}

export function dongFeatures() {
  return {
    type: 'FeatureCollection',
    features: DONG_GEO.map((d) => ({ type: 'Feature', properties: { code: d.code, name: d.name, aging: DONG_STATS[d.code]?.agingRate ?? 0 }, geometry: { type: 'MultiPolygon', coordinates: d.coordinates } }))
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
