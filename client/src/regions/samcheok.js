// regions/samcheok.js 삼척시 지역 설정. 두 번째 지역을 설정 파일 하나로 켤 수 있는지 확인하는 견본이다.
// 확인한 공개 자료만 실제 값으로 둔다.
//   행정동 12곳의 이름, 행정동 코드, 경계: vuski/admdongkor ver20230701(통계청 행정구역 경계 가공본) → samcheok.geo.js
//   시군구 코드 51230(같은 경계 자료의 시군 코드), 삼척시청 위치: OpenStreetMap 시설 지점(mock/geoPlaces.js, 2026. 10. 7. 수집)
// 나머지(마을, 대피소, 대상자 수, 장기요양 통계, 차량, 시나리오, 서류, 훈련 기록)는 모두 "시험용 가상 자료"다.
// 실제 운영 전에 docs/REGION_GUIDE.md 의 자료 목록대로 공개 자료를 받아 build 스크립트로 바꿔 넣는다.
import { BBOX, DONG_GEO, OUTLINE } from './samcheok.geo.js'

const SAMPLE = '시험용 가상 자료'
const CITY_HALL = [129.16518, 37.44989] // OpenStreetMap 삼척시청 지점

const dongs = DONG_GEO.map((d) => ({ code: d.code, name: d.name }))
const centroidOf = (code) => DONG_GEO.find((d) => d.code === code).centroid

// 직선 거리(km). 가상 주행 시간은 직선 거리 1.3배를 시속 40km로 달린다고 두고 계산한다(가정)
const km = ([a, b], [c, d]) => {
  const R = 6371, rad = Math.PI / 180
  const x = (c - a) * rad * Math.cos(((b + d) / 2) * rad), y = (d - b) * rad
  return Math.round(Math.sqrt(x * x + y * y) * R * 10) / 10
}

// 시험용 가상 대피소 2곳. 위치는 행정동 경계 중심점이고 실제 시설이 아니다
const TEMP_SHELTERS = [
  { code: 'SS-01', name: '시험용 가상 대피소 1(교동)', kind: SAMPLE, address: '삼척시 교동 (가상)', capacity: 40, areaM2: null, quake: null, tel: null, lngLat: centroidOf('GY'), coordApprox: true, bdong: '교동', villageCode: 'GY-01', sample: true },
  { code: 'SS-02', name: '시험용 가상 대피소 2(남양동)', kind: SAMPLE, address: '삼척시 남양동 (가상)', capacity: 30, areaM2: null, quake: null, tel: null, lngLat: centroidOf('NY'), coordApprox: true, bdong: '남양동', villageCode: 'NY-01', sample: true }
]

// 시험용 가상 마을 3곳. 집결지 위치는 행정동 경계 중심점, 대상자 수는 가상
const villageOf = (dongCode, code, targets) => {
  const lngLat = centroidOf(dongCode)
  const name = DONG_GEO.find((d) => d.code === dongCode).name
  const drive = TEMP_SHELTERS.map((s) => { const k = Math.round(km(lngLat, s.lngLat) * 1.3 * 10) / 10; return [s.code, Math.max(1, Math.round((k / 40) * 60 * 10) / 10), k] })
    .sort((a, b) => a[1] - b[1])
  return {
    code, dongCode, name, bdongCode: null, lngLat, center: lngLat,
    pickup: { name: `${name} 가상 집결지`, road: `삼척시 ${name} (가상)`, tel: null },
    targets, weight: null, weightBasis: SAMPLE, housing: null, seniorCenters: null, drive, sample: true
  }
}
const VILLAGES = [villageOf('GY', 'GY-01', 12), villageOf('NY', 'NY-01', 8), villageOf('JR', 'JR-01', 6)]

// 장기요양 등급 분포(가상). 이동 유형 대응(transportOf)은 동해시와 같은 규칙이다
const homeByGrade = { '1등급': 2, '2등급': 4, '3등급': 8, '4등급': 7, '5등급': 4, '인지지원등급': 1 }
const LTC = {
  period: SAMPLE, sample: true,
  judged: { '계': 0 }, users: { '계': 0 }, facilityUsers: { '계': 0 }, dayCareUsers: { '계': 0 },
  homeTotal: Object.values(homeByGrade).reduce((a, b) => a + b, 0), homeByGrade,
  transportOf: { '1등급': 'bed', '2등급': 'wheelchair', '3등급': 'assist', '4등급': 'assist', '5등급': 'walk', '인지지원등급': 'walk' }
}

// 행정동 통계. 이름과 행정동 코드만 실제, 인구 칸은 자료를 받기 전이라 0
const DONG_STATS = Object.fromEntries(DONG_GEO.map((d) => [d.code, {
  name: d.name, admCode: d.admCd, total: 0, age65: 0, age75: 0, age85: 0, agingRate: 0,
  targets: VILLAGES.filter((v) => v.dongCode === d.code).reduce((a, v) => a + v.targets, 0), sample: true
}]))

const DATA_SOURCES = {
  population: { label: '주민등록인구', org: SAMPLE, table: '자료 받기 전', period: SAMPLE },
  shelters: { label: '이재민 임시주거시설', org: SAMPLE, table: '자료 받기 전', period: SAMPLE },
  seniorCenters: { label: '마을회관과 경로당', org: SAMPLE, table: '자료 받기 전', period: SAMPLE },
  boundaries: { label: '행정동 경계', org: 'vuski/admdongkor', table: 'ver20230701', period: '2023. 7. 1.' }
}

// 행정복지센터 위치(가상). 차량 대기 위치 계산에만 쓴다. 시청은 OpenStreetMap 지점
const DONG_CENTERS = dongs.map((d) => ({ dong: d.code, name: `${d.name} (가상 위치)`, addr: null, tel: null, lngLat: d.code === 'GY' ? CITY_HALL : centroidOf(d.code), sample: true }))

export default {
  id: 'samcheok',
  name: '삼척시',
  shortName: '삼척',
  province: '강원특별자치도',
  sample: true,
  sampleLabel: SAMPLE,
  // 행정안전부 개방자치단체코드는 확인 전이라 비워 둔다(응급환자이송업 조회는 지역 미설정으로 응답)
  codes: { sgg: '51230', sido: '51', sigungu: '230', openGov: null },
  org: { name: '삼척시', head: '삼척시장', dept: '재난 담당 부서', office: '삼척시청', fire: '삼척소방서', zip: null, address: null },
  map: { bbox: BBOX, center: CITY_HALL, outline: OUTLINE, dongGeo: DONG_GEO, weatherPoint: [CITY_HALL[1], CITY_HALL[0]] },
  dongs,
  data: { DATA_SOURCES, DONG_STATS, LTC, VILLAGES, TEMP_SHELTERS, LTC_RESIDENTIAL: [], LTC_DAYCARE: [], DONG_CENTERS, SENIOR_CENTERS: [], ALLOC: null },
  terrain: {},
  roads: { source: { label: '도로 경로', org: SAMPLE }, routes: {} },
  fleet: { ambulance: ['GY', 'NY'], ambulanceReady: 1, bedVan: ['GY'], liftFacility: ['NY'], liftCity: ['GY'], car: ['GY', 'NY', 'JR'], carContractSoon: 0, bus: ['GY'] },
  scenarios: [
    { type: 'citywide', id: 'S-4', name: '시 전체 동시 대피', windowHours: 8, basis: `모든 마을이 발령 후 8시간에 함께 위험해지는 경우입니다. ${SAMPLE}로 계산합니다.` }
  ],
  activeScenarioId: 'S-4',
  intakeDocs: () => [],
  sampleUpload: null,
  drills: [],
  demo: { conflictVillage: null, duplicateVillage: null, dongUser: { dong: 'GY', name: '교동 재난 담당자' } },
  openData: {
    fireSigucode: 51230, fireSigun: '삼척시', fireUpper: 51,
    addressLike: '삼척시', erStage2: '삼척시', accessCgg: '삼척시', alertRegion: '삼척시', warningWord: '삼척',
    ltc: { siDoCd: '51', siGunGuCd: '230' }, ambulanceOrg: null, weatherPoint: [CITY_HALL[1], CITY_HALL[0]]
  }
}
