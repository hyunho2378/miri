// regions/donghae.js 동해시 지역 설정. 앱이 지역마다 달라지는 값은 모두 이 파일 하나에서 읽는다.
// 실제 공개 자료(마을, 임시주거시설, 시설, 인구와 장기요양 통계, 행정동 경계)는 자동 생성 파일(mock/donghaeData.js, mock/geoDonghae.js)을 그대로 가리킨다.
// 차량 배치, 도우미, 개인 명부는 가상 자료다(mock/seed.js 가 이 설정으로 만든다). 숫자를 바꾸면 기준 시나리오 수치가 달라지므로 고치지 않는다.
import { ALLOC, DATA_SOURCES, DONG_CENTERS, DONG_STATS, LTC, LTC_DAYCARE, LTC_RESIDENTIAL, SENIOR_CENTERS, TEMP_SHELTERS, VILLAGES } from '../mock/donghaeData.js'
import { CITY_OUTLINE, DONG_GEO, DONGHAE_BBOX, DONGHAE_CENTER } from '../mock/geoDonghae.js'
import { VILLAGE_TERRAIN } from '../mock/villageTerrain.js'
import { ROAD_ROUTES } from '../data/roadRoutes.js'

// 발화 가정 지점(OpenStreetMap 지명 좌표)
const ORIGIN_NAMYANG = [129.01109, 37.56721]   // 강릉시 옥계면 남양리
const ORIGIN_MUREUNG = [128.985, 37.455]       // 동해시 삼화동 무릉계곡 서쪽 산림(지점 가정)

// 시나리오 정의. type 은 lib/scenario.js 의 만드는 함수(fire, hazard, citywide). 마을과 지형은 seed 가 붙인다
const SCENARIOS = [
  {
    type: 'fire',
    id: 'S-1', name: '옥계 방면 북측 확산',
    origin: ORIGIN_NAMYANG, originLabel: '강릉시 옥계면 남양리', heading: 95, halfWidthKm: 4, speedKmh: 2, leadHours: 0, scopeHours: 3,
    basis: '2022년 3월 5일 01시 20분께 강릉시 옥계면 남양리에서 난 불이 05시 30분께 동해시 망상동까지 번졌습니다(연합뉴스 2022. 3. 5.). 발화점에서 첫 마을까지 5.15km를 4시간 10분에 간 셈이라 같은 경로의 실측은 약 시속 1.2km입니다. 시속 2km는 그보다 빠르게 둔 값이고 동쪽 방향 확산은 2022년 기록을 따랐으며, 발화 확인과 동시에 발령한다고 봅니다. 2025년 경북 산불 시속 8.2km급 확산은 S-3에서 따로 계산합니다. 소방이 산불 진행 방향을 알려 준 뒤 동이 단계별로 대피를 판단하는 흐름은 망상동 행정복지센터 재난 담당 면담(2026. 10. 26.)에서 확인했고, 발령 시점이 달라질 때의 변화는 부족분 계산의 출발 준비 시간 민감도로 봅니다.'
  },
  {
    type: 'fire',
    id: 'S-2', name: '삼화동 서측 산림 발화',
    origin: ORIGIN_MUREUNG, originLabel: '삼화동 무릉계곡 서쪽 산림', heading: 75, halfWidthKm: 3, speedKmh: 1.5, leadHours: 0, scopeHours: 3,
    basis: '두타산과 무릉계곡 산림에서 발화해 동쪽 마을로 번지는 가정입니다. 확산 속도 시속 1.5km는 가정값이며, 발화 확인과 동시에 발령한다고 봅니다.'
  },
  {
    type: 'fire',
    id: 'S-3', name: '옥계 방면 초고속 확산',
    origin: ORIGIN_NAMYANG, originLabel: '강릉시 옥계면 남양리', heading: 110, halfWidthKm: 5, speedKmh: 8.2, leadHours: 3, scopeHours: 1,
    basis: '확산 속도 시속 8.2km는 2025년 3월 경북 의성 산불의 확산 속도로, 국내 관측 이래 가장 빠른 값입니다(국가산림위성정보활용센터 분석, 2025. 3. 27. 발표). 산불 위험 예보에 따라 발화 3시간 전에 사전 발령한다고 봅니다.'
  },
  {
    type: 'hazard',
    id: 'T-1', name: '동해 지진해일 경보', kind: 'tsunami', windowHours: 1.5, prepMinutes: 10,
    pick: (t) => t.elev <= 12 && t.seaKm != null && t.seaKm <= 1.3,
    rule: '해발 12m 이하이면서 바다에서 1.3km 안인 마을',
    basis: '2024년 1월 1일 일본 노토반도 지진(16시 10분) 뒤 묵호에 18시 6분 첫 지진해일이 닿았고 최대 85cm였습니다(연합뉴스 2024. 1. 2.). 1983년 동해 중부 지진해일 때 묵호에 2m 넘는 해일이 들어 1명이 숨졌습니다(조선비즈 2024. 1. 2.). 도달 1시간 30분, 준비 10분, 대상 마을 기준(해발 12m, 해안 1.3km)은 가정입니다. 지형 값은 약 90m 칸 고도라 해안 저지대 오차가 큽니다.'
  },
  {
    type: 'hazard',
    id: 'R-1', name: '태풍 호우 저지대 침수', kind: 'flood', windowHours: 6,
    pick: (t) => t.elev <= 15,
    rule: '해발 15m 이하 마을',
    basis: '2019년 10월 태풍 미탁 때 동해에 367.7mm가 내렸고 동해시 망상동이 특별재난지역으로 선포됐습니다(연합뉴스 2019. 10. 3., 정부 발표 2019. 10. 17.). 호우경보 뒤 6시간 안 사전 대피와 대상 마을 기준(해발 15m)은 가정입니다. 실제 침수흔적도와 하천 범람 구역은 반영하지 않았습니다(진행 예정).'
  },
  {
    type: 'hazard',
    id: 'L-1', name: '집중호우 산사태 우려', kind: 'landslide', windowHours: 2,
    pick: (t) => t.slope >= 25,
    rule: '집결지 둘레 300m 안 최대 경사 25도 이상 마을',
    basis: '2019년 10월 3일 태풍 미탁 폭우로 삼척시 오분동 주택지 사면이 무너져 1명이 숨졌습니다(연합뉴스 2019. 10. 3.). 산사태 경보 뒤 2시간 안 대피와 경사 25도 기준은 가정입니다. 산림청 산사태 위험지도는 반영하지 않았습니다(진행 예정).'
  },
  {
    type: 'hazard',
    id: 'W-1', name: '대설 산간 마을 고립', kind: 'snow', windowHours: 24, travelFactor: 1.8,
    pick: (t) => t.elev >= 100 || (t.seaKm != null && t.seaKm >= 6),
    rule: '해발 100m 이상이거나 바다에서 6km 넘게 떨어진 산간 마을',
    basis: '2014년 2월 6일부터 14일까지 9일 연속 눈이 내려 영동 산간마을 14곳 390여 가구가 고립됐습니다(연합뉴스 2014. 2. 10.). 대설경보 뒤 24시간 안 이송, 눈길 주행 시간 1.8배, 대상 마을 기준은 가정입니다.'
  },
  {
    type: 'citywide',
    id: 'S-4', name: '시 전체 동시 대피', windowHours: 8,
    basis: '모든 마을이 발령 후 8시간에 함께 위험해지는 경우입니다. 차량과 대피소 용량의 상한을 확인할 때 씁니다.'
  },
]

// 시연용 대피계획서와 대피카드(가상 서식, 실제 법정동 이름). 전사문과 판독 결과(모의 AI 응답)
function intakeDocs(at, DAY) {
  return [
    {
      id: 'DOC-0001', kind: 'plan', name: '심곡동 대피계획서', villageCode: 'MS-02',
      image: '/images/intake/plan-ms02.jpg', uploadedAt: at, status: 'pending',
      transcript: '망상동 심곡동 재난취약자 대피계획서 순번 1 거동 상태 누워서만 생활함 산소발생기 사용 보호자 동행 필요 순번 2 거동 상태 휠체어 사용 혼자 이동 어려움 순번 3 거동 상태 지팡이 짚고 부축 받으면 이동 가능 순번 4 거동 상태 혼자 걸을 수 있음 청력 약함',
      results: [
        { personCode: 'MS-02-901', grade: 'bed', tags: ['bedridden', 'oxygen', 'guardian'], quote: '누워서만 생활함 산소발생기 사용', confidence: 'high', box: [22, 33, 40, 10] },
        { personCode: 'MS-02-902', grade: 'wheelchair', tags: [], quote: '휠체어 사용 혼자 이동 어려움', confidence: 'high', box: [24, 49, 38, 9.5] },
        { personCode: 'MS-02-903', grade: 'assist', tags: [], quote: '지팡이 짚고 부축 받으면 이동 가능', confidence: 'mid', box: [24, 65, 43, 9.5] },
        { personCode: 'MS-02-904', grade: 'walk', tags: ['hearing'], quote: '혼자 걸을 수 있음 청력 약함', confidence: 'high', box: [24, 81, 40, 10] }
      ]
    },
    {
      id: 'DOC-0002', kind: 'card', name: '지흥동 대피카드', villageCode: 'BS-01',
      image: '/images/intake/card-bs01.jpg', uploadedAt: at, status: 'pending',
      transcript: '대피카드 북삼동 지흥동 거동 상태 침대에서 거의 못 일어나심 기저귀 사용 딸 연락 필요',
      results: [
        { personCode: 'BS-01-901', grade: 'bed', tags: ['bedridden', 'guardian'], quote: '침대에서 거의 못 일어나심', confidence: 'low', box: [9, 50, 79, 15] }
      ]
    },
    {
      id: 'DOC-0003', kind: 'plan', name: '이로동 대피계획서', villageCode: 'SH-03',
      image: '/images/intake/plan-sh03.jpg', uploadedAt: at - 20 * DAY, status: 'pending',
      transcript: '삼화동 이로동 대피계획서 순번 1 거동 상태 보행기 이용 천천히 이동 순번 2 거동 상태 판독 불가',
      results: [
        { personCode: 'SH-03-901', grade: 'assist', tags: [], quote: '보행기 이용 천천히 이동', confidence: 'mid', box: [22, 41, 48, 7] },
        // 근거 문구가 전사문에 없는 결과. 원문 대조에서 신뢰도 하로 떨어지는 사례
        { personCode: 'SH-03-902', grade: 'wheelchair', tags: [], quote: '휠체어로 이동', confidence: 'high', box: [22, 50, 36, 8] }
      ]
    }
  ]
}

// 샘플 업로드용 서류. 판독 실행 시 이 응답을 모의 AI 결과로 사용
const SAMPLE_UPLOAD = {
  kind: 'card', name: '어달동 대피카드', villageCode: 'MH-02', image: '/images/intake/card-mh02.jpg',
  transcript: '대피카드 묵호동 어달동 거동 상태 휠체어 타고 계심 계단 있음 혼자 사심 거동 상태 걸을 수 있으나 치매 증상 있음 인솔 필요',
  results: [
    { personCode: 'MH-02-911', grade: 'wheelchair', tags: [], quote: '휠체어 타고 계심 계단 있음', confidence: 'high', box: [10, 40, 80, 10] },
    { personCode: 'MH-02-912', grade: 'walk', tags: ['dementia'], quote: '걸을 수 있으나 치매 증상 있음 인솔 필요', confidence: 'mid', box: [12, 55.5, 81, 16.5] }
  ]
}

// 지난 훈련 발령 기록 8건(마을 몇 곳씩 나눠 한 훈련). 기준 시나리오(848명)와 별개의 소규모 훈련이다.
// [월, 일, 시, 분, 걸린 분, 도우미 수, [[마을 코드, 대상자, 인계 완료, 소방 인계], ...]]

// 지난 훈련 발령 기록 8건(마을 몇 곳씩 나눠 한 훈련). 기준 시나리오(848명)와 별개의 소규모 훈련이다.
// [월, 일, 시, 분, 걸린 분, 도우미 수, [[마을 코드, 대상자, 인계 완료, 소방 인계], ...]]
const PAST_DRILLS = [
  [8, 27, 14, 0, 52, 14, [['MS-04', 38, 36, 0], ['MS-05', 29, 27, 1], ['MS-02', 31, 31, 0]]],
  [9, 3, 10, 30, 48, 12, [['BH-01', 44, 41, 1], ['MH-01', 36, 36, 0], ['MH-02', 18, 17, 0]]],
  [9, 10, 15, 10, 61, 16, [['CG-01', 52, 46, 2], ['CG-02', 33, 30, 1], ['BG-01', 27, 27, 0]]],
  [9, 17, 9, 40, 44, 11, [['SJ-01', 24, 24, 0], ['SJ-02', 19, 18, 0], ['BS-01', 22, 21, 0]]],
  [9, 24, 19, 20, 57, 15, [['SH-03', 41, 37, 2], ['SH-02', 28, 28, 0], ['SH-01', 35, 33, 1]]],
  [10, 1, 14, 20, 46, 13, [['MS-01', 33, 33, 0], ['MS-03', 21, 20, 0], ['MS-04', 30, 29, 0]]],
  [10, 8, 20, 0, 63, 17, [['BH-01', 46, 40, 3], ['MH-03', 25, 23, 1], ['MH-01', 34, 32, 1]]],
  [10, 15, 10, 0, 50, 14, [['CG-01', 50, 48, 1], ['BG-01', 29, 29, 0], ['CG-02', 31, 29, 1]]]
]

export default {
  id: 'donghae',
  name: '동해시',
  shortName: '동해',
  province: '강원특별자치도',
  sample: false,
  // 행정 코드. sgg 는 행정안전부 시군구 코드(5자리), sido와 sigungu 는 장기요양기관 검색 인자, openGov 는 행정안전부 개방자치단체코드
  codes: { sgg: '51170', sido: '51', sigungu: '170', openGov: '4211000' },
  org: {
    name: '동해시', head: '동해시장', dept: '안전과', office: '동해시청', fire: '동해소방서',
    zip: '25745', address: '강원특별자치도 동해시 천곡로 77(천곡동)'
  },
  // 지도. bbox 는 [서, 남, 동, 북], weatherPoint 는 기상청 격자를 구할 [위도, 경도](시청 부근)
  map: { bbox: DONGHAE_BBOX, center: DONGHAE_CENTER, outline: CITY_OUTLINE, dongGeo: DONG_GEO, weatherPoint: [37.5247, 129.1143] },
  dongs: [
    { code: 'CG', name: '천곡동' }, { code: 'SJ', name: '송정동' }, { code: 'BS', name: '북삼동' },
    { code: 'BG', name: '부곡동' }, { code: 'DH', name: '동호동' }, { code: 'BH', name: '발한동' },
    { code: 'MH', name: '묵호동' }, { code: 'BP', name: '북평동' }, { code: 'MS', name: '망상동' },
    { code: 'SH', name: '삼화동' }
  ],
  data: { DATA_SOURCES, DONG_STATS, LTC, VILLAGES, TEMP_SHELTERS, LTC_RESIDENTIAL, LTC_DAYCARE, DONG_CENTERS, SENIOR_CENTERS, ALLOC },
  terrain: VILLAGE_TERRAIN,
  roads: ROAD_ROUTES,
  // 차량 기본값(가정). 구급차 6대는 SOURCE A 5절 수치, 리프트 승합차는 주야간보호기관 9곳(공단 2026. 10. 6.)에 기관당 1대를 둔 가정.
  // 칸마다 소속 동 코드 목록이고 대기 위치는 그 동 행정복지센터다
  fleet: {
    ambulance: ['CG', 'BP', 'MH', 'CG', 'BP', 'SH'], ambulanceReady: 3,
    bedVan: ['BG', 'BP'],
    liftFacility: ['CG', 'BH', 'BS', 'BS', 'BS', 'CG', 'CG', 'SJ', 'BH'],
    liftCity: ['CG'],
    car: ['CG', 'CG', 'CG', 'BS', 'BS', 'BS', 'BG', 'BH', 'DH', 'MH', 'MH', 'BP', 'BP', 'BP', 'MS', 'MS', 'SH', 'SH'], carContractSoon: 2,
    bus: ['CG', 'BS', 'BP', 'MH', 'MS', 'SH']
  },
  scenarios: SCENARIOS,
  activeScenarioId: 'S-1',
  intakeDocs,
  sampleUpload: SAMPLE_UPLOAD,
  drills: PAST_DRILLS,
  // 이상 탐지 시연에 쓰는 마을(와상 표기된 부축 등급, 같은 서류 중복)
  demo: { conflictVillage: 'BS-02', duplicateVillage: 'MH-01', dongUser: { dong: 'MS', name: '망상동 재난 담당자' } },
  // 공공데이터 호출 인자(api/opendata.js). 값이 없으면 그 항목은 지역 미설정 오류로 돌려준다
  openData: {
    fireSigucode: 51170, fireSigun: '동해시', fireUpper: 51,
    addressLike: '동해시', erStage2: '동해시', accessCgg: '동해시', alertRegion: '동해시', warningWord: '동해',
    ltc: { siDoCd: '51', siGunGuCd: '170' }, ambulanceOrg: '4211000', weatherPoint: [37.5247, 129.1143]
  }
}
