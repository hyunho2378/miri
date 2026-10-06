// api/open.js 미리 개방 API. 누구나 키 없이 읽는다(CORS 허용, 읽기 전용).
// GET /api/open                      목록과 사용법
// GET /api/open?kind=summary         동해시 기준 수치(인구, 장기요양, 임시주거시설)와 출처
// GET /api/open?kind=villages        마을(법정동) 37곳: 집결지, 추정 대상자 수, 평시 지정 대피소, 왕복 시간
// GET /api/open?kind=shelters        이재민 임시주거시설 27곳
// GET /api/open?kind=facilities      노인요양시설, 주야간보호, 동 행정복지센터
// GET /api/open?kind=scenarios       확산 시나리오 목록
// GET /api/open?kind=scenario&id=S-1 시나리오별 마을 부족분, 대피소 배정, 필요 추가 차량
// 개인 단위 자료는 내보내지 않는다. 마을 단위 집계만 낸다. 차량과 도우미 수량은 가정값이며 응답에 표시한다.
import { DATA_SOURCES, DONG_CENTERS, DONG_STATS, LTC, LTC_DAYCARE, LTC_RESIDENTIAL, TEMP_SHELTERS, VILLAGES } from '../src/mock/donghaeData.js'
import { buildSeed } from '../src/mock/seed.js'
import { computeShortage, requiredExtraVehicles } from '../src/lib/shortageCalc.js'

const VERSION = '2026-10-06'
const NOTICE = '마을, 대피소, 시설, 인구와 장기요양 통계는 실제 공개 자료다. 마을별 대상자 수는 통계를 나눈 추정치이고, 차량과 도우미 수량은 기관 조사 전 가정값이다.'

let seedCache = null
const seed = () => (seedCache ||= buildSeed())

function scenarioResult(id) {
  const d = seed()
  const sc = d.scenarios.find((s) => s.id === id)
  if (!sc) return null
  const input = { persons: d.persons, villages: d.villages, vehicles: d.vehicles, helpers: d.helpers, settings: d.settings, scenario: sc, t0: d.today }
  const r = computeShortage(input)
  const extra = requiredExtraVehicles(input, r)
  const villages = r.villages.filter((v) => v.inScope).map((v) => {
    const row = r.byVillage[v.code]
    return {
      code: v.code, name: v.label, dongCode: v.dongCode,
      arrivalHoursAfterOrder: Math.round((sc.windowHours + (sc.offsetHours[v.code] || 0)) * 100) / 100,
      targets: row.targetTotal, targetsByGrade: row.targets,
      shortage: row.total, shortageByGrade: row.shortage, timeLimited: row.timeOnly || 0,
      shelter: v.shelterCode, shelterParts: v.shelterParts, shelterNote: v.shelterNote,
      driveMinutes: v.driveMin, roundTripMinutes: v.roundTripMin
    }
  })
  return {
    scenario: { id: sc.id, name: sc.name, kind: sc.kind, basis: sc.basis, origin: sc.origin || null, originLabel: sc.originLabel || null, heading: sc.heading ?? null, speedKmh: sc.speedKmh ?? null, leadHours: sc.leadHours ?? null, firstArrivalHours: sc.windowHours, prepMinutes: sc.prepMinutes },
    total: { villages: villages.length, targets: r.scopeTargets, shortage: r.total, timeLimited: r.timeTotal, byGrade: r.byGrade },
    requiredExtraVehicles: extra.map((e) => ({ grade: e.grade, vehicleType: e.type, count: e.count, resolved: e.resolved })),
    shelterLoad: r.shelterLoad,
    villages,
    assumptions: { vehicles: d.vehicles.length, helpers: d.helpers.length, boardingMinutes: d.settings.boardingMinutes, note: '차량과 도우미 수량, 탑승과 하차 시간은 가정값' }
  }
}

const HANDLERS = {
  summary: () => ({ dongs: DONG_STATS, ltc: LTC, shelters: { count: TEMP_SHELTERS.length, capacity: TEMP_SHELTERS.reduce((s, x) => s + x.capacity, 0) }, villages: VILLAGES.length }),
  villages: () => VILLAGES.map((v) => ({
    code: v.code, name: v.name, dongCode: v.dongCode, bdongCode: v.bdongCode, lngLat: v.lngLat, pickup: v.pickup,
    estimatedTargets: v.targets, weightBasis: v.weightBasis,
    nearestShelter: v.drive[0][0], driveMinutes: v.drive[0][1], driveKm: v.drive[0][2]
  })),
  shelters: () => TEMP_SHELTERS,
  facilities: () => ({ residential: LTC_RESIDENTIAL, dayCare: LTC_DAYCARE, dongCenters: DONG_CENTERS }),
  scenarios: () => seed().scenarios.map((s) => ({ id: s.id, name: s.name, kind: s.kind, basis: s.basis, affected: s.affected, firstArrivalHours: s.windowHours })),
  scenario: (q) => scenarioResult(String(q.id || 'S-1'))
}

export default function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Access-Control-Allow-Methods', 'GET, OPTIONS')
  res.setHeader('Cache-Control', 'public, s-maxage=3600, stale-while-revalidate=86400')
  if (req.method === 'OPTIONS') return res.status(204).end()
  if (req.method !== 'GET') return res.status(405).json({ error: { code: 'METHOD', message: 'GET 만 지원합니다' } })
  const kind = req.query?.kind
  if (!kind) {
    return res.status(200).json({
      name: '미리 개방 API', version: VERSION, notice: NOTICE,
      kinds: Object.keys(HANDLERS), example: '/api/open?kind=scenario&id=S-1', license: '코드 MIT, 자료는 각 출처의 이용 조건을 따른다', sources: DATA_SOURCES
    })
  }
  const fn = HANDLERS[kind]
  if (!fn) return res.status(400).json({ error: { code: 'KIND', message: `kind 는 ${Object.keys(HANDLERS).join(', ')} 중 하나입니다` } })
  try {
    const data = fn(req.query || {})
    if (data == null) return res.status(404).json({ error: { code: 'NOT_FOUND', message: '해당 항목이 없습니다' } })
    return res.status(200).json({ version: VERSION, notice: NOTICE, sources: DATA_SOURCES, data })
  } catch (e) {
    return res.status(500).json({ error: { code: 'INTERNAL', message: String(e?.message || e) } })
  }
}
