// regions/samcheok.js 삼척시 지역 설정. 동해시와 같은 방식으로 실제 공개 자료를 만들어 가리킨다.
// 실제 공개 자료(자동 생성 파일, scripts/build-samcheok-data.mjs 와 build-village-terrain.mjs samcheok 가 만든다)
//   mock/samcheokData.js   마을(법정동 27곳, 법정리 101곳), 임시주거시설 22곳, 경로당 240곳, 장기요양기관, 행정복지센터 12곳,
//                          행정동 인구(행정안전부 2026년 9월), 장기요양 등급 판정과 급여이용(국민건강보험공단 2025년)
//   mock/samcheokTerrain.js 마을 집결지 고도, 바다 거리, 경사(동해시와 같은 수치표고 자료)
//   data/forestFireHistorySamcheok.js 산림청 산불통계데이터 삼척 행
//   samcheok.geo.js        행정동 12곳 경계(vuski/admdongkor ver20230701)
// 대상자 수는 재가 장기요양 수급자 추정치(1,647명)를 행정동 75세 이상 인구 비율과 마을 경로당 수로 나눈 추정이다.
// 가정값: 차량 배치(fleet), 시나리오의 확산 속도와 방향, 준비 시간. 기관 조사 전이라 화면에 가정으로 표시한다.
// 도로 경로 선(카카오모빌리티)은 받지 않았다. 주행 시간은 OSRM 도로 주행 시간을 쓰고, 지도 경로는 직선으로 보인다.
import { BBOX, DONG_GEO, OUTLINE } from './samcheok.geo.js'
import { ALLOC, DATA_SOURCES, DONG_CENTERS, DONG_STATS, LTC, LTC_DAYCARE, LTC_RESIDENTIAL, SENIOR_CENTERS, TEMP_SHELTERS, VILLAGES } from '../mock/samcheokData.js'
import { VILLAGE_TERRAIN } from '../mock/samcheokTerrain.js'
import { FOREST_FIRE_ROWS, FOREST_FIRE_SOURCE } from '../data/forestFireHistorySamcheok.js'

const CITY_HALL = [129.16518, 37.44989] // OpenStreetMap 삼척시청 지점(geoPlaces.js)
const dongs = DONG_GEO.map((d) => ({ code: d.code, name: d.name }))

// 발화와 확산 지점. 고포 경로당은 삼척시 마을회관및경로당 표준데이터 좌표(원덕읍 월천리 고포마을)
const ORIGIN_GOPO = SENIOR_CENTERS.find((s) => s.name === '고포 경로당').lngLat

// 시나리오. type 은 lib/scenario.js 의 만드는 함수(fire, hazard, citywide). 근거 보도와 기관 자료는 2026. 11. 27. 원문을 열어 확인했다
const SCENARIOS = [
  {
    type: 'fire',
    id: 'F-1', name: '울진 방면 원덕 남부 확산',
    origin: ORIGIN_GOPO, originLabel: '원덕읍 월천리 고포마을', heading: 265, halfWidthKm: 4, speedKmh: 1.5, leadHours: 0, scopeHours: 6,
    basis: '2022년 3월 4일 11시 17분 울진군 북면 두천리에서 난 불이 6시간 뒤 17시 30분께 삼척 원덕읍까지 번졌습니다(연합뉴스 2022. 3. 5.). 20시 30분에는 월천리와 산양2리, 노경리, 사곡리 일대로 번지는 중이었고(뉴스1 2022. 3. 4.), 월천리, 산양리, 노경리, 사곡리, 기곡리 주민 111명과 월천리, 산양리 요양원 환자와 시설 관계자 91명이 대피했습니다(연합뉴스 2022. 3. 4.). 고포마을에서 산양2리 경로당까지 4.5km를 3시간에 간 셈이라 시속 1.5km로 둡니다. 서쪽 방향, 띠 폭 4km, 첫 도달 뒤 6시간 범위는 이 기록의 대피 마을 다섯 곳이 들어가게 정한 가정입니다. 2022년처럼 불이 고포마을에 닿은 때 발령한다고 봅니다.'
  },
  {
    type: 'fire',
    id: 'F-2', name: '가곡천 넘어 호산 방면 북상',
    origin: ORIGIN_GOPO, originLabel: '원덕읍 월천리 고포마을', heading: 345, halfWidthKm: 3, speedKmh: 1.5, leadHours: 0, scopeHours: 4,
    basis: '2022년 3월 4일 밤 당국은 가곡천을 중심으로 방어선을 쳤고, 불이 가곡천을 넘으면 곧장 호산리 LNG 생산기지가 있다고 보도됐습니다(연합뉴스 2022. 3. 4.). 그날 불은 가곡천을 넘지 않았습니다. 이 시나리오는 불이 가곡천을 넘어 호산리와 옥원리, 임원리 쪽으로 북상하는 경우를 둔 가정이고, 속도 시속 1.5km는 F-1과 같은 기록 기반 값이고 북북서 방향, 띠 폭 3km, 4시간 범위는 가정입니다. 불이 고포마을에 닿은 때 발령한다고 봅니다.'
  },
  {
    type: 'hazard',
    id: 'T-1', name: '동해 지진해일 경보', kind: 'tsunami', windowHours: 1.5, prepMinutes: 10,
    pick: (t) => t.elev <= 12 && t.seaKm != null && t.seaKm <= 1.3,
    rule: '해발 12m 이하이면서 바다에서 1.3km 안인 마을',
    basis: '1983년 5월 26일 11시 59분 일본 아키다현 서쪽 바다 지진(규모 7.7) 뒤 삼척시 원덕읍 임원항에 파고 3.6m에서 4m의 지진해일이 들었고, 우리나라에서 사망 1명, 실종 2명, 부상 2명, 이재민 405명이 났습니다(국토안전관리원 지진정보관, 출처 기상청). 첫 파는 지진 77분 뒤 울릉도, 묵호에는 96분 뒤 닿았습니다(기상청 동해안 지진해일 분석보고서 2024). 2024년 1월 1일 노토반도 지진 때 임원 첫 파는 18시 12분, 최대 25cm였습니다(같은 보고서). 도달 1시간 30분, 준비 10분, 대상 마을 기준(해발 12m, 해안 1.3km)은 동해시와 같은 가정입니다. 지형 값은 약 90m 칸 고도라 해안 저지대 오차가 큽니다.'
  },
  {
    type: 'citywide',
    id: 'S-4', name: '시 전체 동시 대피', windowHours: 8,
    basis: '모든 마을이 발령 후 8시간에 함께 위험해지는 경우입니다. 차량과 대피소 용량의 상한을 확인할 때 씁니다.'
  }
]

// 차량 기본값(가정). 기관 조사 전이라 동해시와 같은 규칙으로 둔 값이다.
// 리프트 승합차는 주야간보호기관 3곳(공단 장기요양기관 찾기 2026. 11. 27.)에 기관당 1대, 침상 이송차는 노인요양시설이 몰린 근덕면과 원덕읍에 1대씩,
// 구급차 4대(시내 2, 도계, 원덕)와 출동 가능 2대, 승용차는 행정동마다 1대에 시내 2동 1대씩 더, 버스는 6대로 둔 가정이다. 대기 위치는 소속 동 행정복지센터
const FLEET = {
  ambulance: ['GY', 'NY', 'DG', 'WD'], ambulanceReady: 2,
  bedVan: ['GD', 'WD'],
  liftFacility: ['NY', 'GD', 'DG'],
  liftCity: ['GY'],
  car: ['GY', 'GY', 'NY', 'NY', 'SN', 'JR', 'DG', 'WD', 'GD', 'HJ', 'NG', 'MR', 'GG', 'SG'], carContractSoon: 1,
  bus: ['GY', 'DG', 'WD', 'GD', 'MR', 'HJ']
}

export default {
  id: 'samcheok',
  name: '삼척시',
  shortName: '삼척',
  province: '강원특별자치도',
  sample: false,
  // 행정 코드. sgg 는 시군구 코드(국토교통부 법정동 코드 앞 5자리), openGov 는 지자체 기관코드(국가법령정보 지자체코드 목록 4241000)
  codes: { sgg: '51230', sido: '51', sigungu: '230', openGov: '4241000' },
  // 시청 주소와 전화 앞자리: 삼척시청 누리집. 담당 부서는 시청 조직 안내의 재난안전과
  org: { name: '삼척시', head: '삼척시장', dept: '재난안전과', office: '삼척시청', fire: '삼척소방서', telMask: '033-570-○○○○', zip: '25914', address: '강원특별자치도 삼척시 중앙로 296' },
  map: { bbox: BBOX, center: CITY_HALL, outline: OUTLINE, dongGeo: DONG_GEO, weatherPoint: [CITY_HALL[1], CITY_HALL[0]] },
  dongs,
  data: { DATA_SOURCES, DONG_STATS, LTC, VILLAGES, TEMP_SHELTERS, LTC_RESIDENTIAL, LTC_DAYCARE, DONG_CENTERS, SENIOR_CENTERS, ALLOC },
  terrain: VILLAGE_TERRAIN,
  fireHistory: { source: FOREST_FIRE_SOURCE, rows: FOREST_FIRE_ROWS },
  roads: { source: { label: '도로 경로', org: '받지 않음(주행 시간은 OSRM 도로 주행 시간, 지도 경로는 직선)' }, routes: {} },
  fleet: FLEET,
  fleetAssumed: true,
  fleetNote: '차량 배치는 기관 조사 전 가정값(동해시와 같은 규칙)',
  scenarios: SCENARIOS,
  villageNote: '(동 지역 법정동 27곳, 읍면 법정리 101곳)',
  activeScenarioId: 'F-1',
  intakeDocs: () => [],
  sampleUpload: null,
  drills: [],
  demo: { conflictVillage: null, duplicateVillage: null, dongUser: { dong: 'WD', name: '원덕읍 재난 담당자' } },
  openData: {
    fireSigucode: 51230, fireSigun: '삼척시', fireUpper: 51,
    addressLike: '삼척시', erStage2: '삼척시', accessCgg: '삼척시', alertRegion: '삼척시', warningWord: '삼척',
    ltc: { siDoCd: '51', siGunGuCd: '230' }, ambulanceOrg: '4241000', weatherPoint: [CITY_HALL[1], CITY_HALL[0]],
    ems: { sido: '강원소방본부', station: '삼척소방서', sidoShort: '강원', sigun: '삼척' }
  }
}
