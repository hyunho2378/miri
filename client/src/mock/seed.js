// seed.js 시연 데이터 생성기. 고정 시드라 매번 같은 결과. 실제 개인정보 없음.
// 실제 자료(donghaeData.js, 출처는 DATA_SOURCES)
// - 마을은 동해시 법정동 36곳과 동호동 일대. 위치는 마을 집결지로 정한 실제 경로당 좌표
// - 대피소는 국민재난안전포털 이재민 임시주거시설 27곳. 왕복 시간은 OSRM 도로 주행 시간으로 계산
// - 마을별 대상자 수는 2025 장기요양 재가 수급자 추정치를 75세 이상 인구와 주거 규모로 나눈 값
// 가상 자료
// - 개인(코드, 태그, 보호자 연락처)은 모두 가상. 주소는 법정동까지만 쓰고 번지는 만들지 않는다
// - 차량과 도우미 수는 기관 조사 전 가정값
// - 이름 주소 연락처는 지자체 서버 보관 전제. 이 파일에서는 privateInfo 로 분리하고 도우미 화면에서만 사용
import { intIn, mulberry32 } from '../lib/rng.js'
import { HOUR, MIN } from '../lib/time.js'
import { citywideScenario, hazardScenario, fireScenario } from '../lib/scenario.js'
import { DONG_CENTERS, LTC, TEMP_SHELTERS, VILLAGES } from './donghaeData.js'
import { VILLAGE_TERRAIN } from './villageTerrain.js'

const DAY = 24 * HOUR

export const DONGS = [
  { code: 'CG', name: '천곡동' }, { code: 'SJ', name: '송정동' }, { code: 'BS', name: '북삼동' },
  { code: 'BG', name: '부곡동' }, { code: 'DH', name: '동호동' }, { code: 'BH', name: '발한동' },
  { code: 'MH', name: '묵호동' }, { code: 'BP', name: '북평동' }, { code: 'MS', name: '망상동' },
  { code: 'SH', name: '삼화동' }
].map((d) => ({ ...d, center: DONG_CENTERS.find((c) => c.dong === d.code) || null }))

// 임시주거시설 27곳(실제). 화면에서 쓰는 이름 그대로
export const SHELTERS = TEMP_SHELTERS

export const SETTINGS = {
  orgName: import.meta.env?.VITE_ORG_NAME || '동해시',
  prepMinutes: 60,
  windowHours: 8,
  completeBeforeHours: 0,
  boardingMinutes: 20,
  pendingDays: 14,
  contractWarnDays: 30,
  helperLoadMax: 40,
  noAckMinutes: 10
}

const TODAY = new Date(2026, 9, 2, 9, 0).getTime()

// 발화 가정 지점(OpenStreetMap 지명 좌표)
const ORIGIN_NAMYANG = [129.01109, 37.56721]   // 강릉시 옥계면 남양리
const ORIGIN_MUREUNG = [128.985, 37.455]       // 동해시 삼화동 무릉계곡 서쪽 산림(지점 가정)

// 대상자 등급 칸. 시 전체 재가 수급자 추정 등급 분포를 그대로 쓰고 순서만 섞는다
function gradeSlots(r) {
  const slots = []
  for (const [ltc, n] of Object.entries(LTC.homeByGrade)) for (let i = 0; i < n; i += 1) slots.push(ltc)
  for (let i = slots.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[slots[i], slots[j]] = [slots[j], slots[i]]
  }
  return slots
}

export function buildSeed() {
  const r = mulberry32(20260405)
  const villages = VILLAGES.map((v) => {
    const [shelterCode, driveMin] = v.drive[0]
    return {
      code: v.code, dongCode: v.dongCode, label: v.name, bdongCode: v.bdongCode,
      lngLat: v.lngLat, pickup: v.pickup, drive: v.drive, estTargets: v.targets, weightBasis: v.weightBasis,
      shelterCode, driveMin, roundTripMin: Math.round(2 * driveMin + SETTINGS.boardingMinutes)
    }
  })

  const persons = []
  const privateInfo = {}
  const slots = gradeSlots(r)
  let slot = 0
  let docSeq = 10
  for (const v of VILLAGES) {
    for (let k = 1; k <= v.targets; k += 1) {
      const ltcGrade = slots[slot]
      slot += 1
      const grade = LTC.transportOf[ltcGrade]
      const tags = []
      if (grade === 'bed') { tags.push('bedridden'); if (r() < 0.4) tags.push('oxygen') }
      if (grade === 'walk') tags.push('dementia')
      if (r() < 0.3) tags.push('guardian')
      if (r() < 0.1) tags.push('hearing')
      if (r() < 0.2) tags.push('medication')
      if (r() < 0.12) tags.push('pet')
      const code = `${v.code}-${String(k).padStart(3, '0')}`
      persons.push({
        code, villageCode: v.code, grade, ltcGrade, tags,
        gradeSource: r() < 0.6 ? 'ai' : 'manual', review: 'confirmed',
        docId: `DOC-${String(docSeq).padStart(4, '0')}`, docPos: k,
        updatedAt: TODAY - intIn(r, 3, 60) * DAY
      })
      privateInfo[code] = {
        address: `동해시 ${v.name} (가상 대상자, 번지 없음)`,
        guardianPhone: `010-0000-${String(intIn(r, 1000, 9999))}`
      }
    }
    docSeq += 1
  }

  // 판독 확인 대기 8건은 아래 INTAKE_DOCS 결과와 연결
  // 이상 탐지 시연용: 와상 표기된 부축 등급 1건, 같은 서류 같은 위치 중복 1쌍
  const conflict = persons.find((p) => p.villageCode === 'BS-02' && p.grade === 'assist')
  if (conflict) conflict.tags = [...conflict.tags, 'bedridden']
  const dupSrc = persons.find((p) => p.villageCode === 'MH-01' && p.grade === 'walk')
  if (dupSrc) {
    const code = `${dupSrc.villageCode}-990`
    persons.push({ ...dupSrc, code, tags: [...dupSrc.tags], updatedAt: TODAY - 2 * DAY })
    privateInfo[code] = { ...privateInfo[dupSrc.code] }
  }

  const docs = intakeDocs()
  for (const doc of docs) {
    doc.results.forEach((res, i) => {
      const code = res.personCode
      persons.push({
        code, villageCode: doc.villageCode, grade: res.grade, tags: res.tags,
        gradeSource: 'ai', review: 'pending', docId: doc.id, docPos: i + 1,
        updatedAt: doc.uploadedAt
      })
      privateInfo[code] = { address: `동해시 ${VILLAGES.find((v) => v.code === doc.villageCode)?.name} (가상 대상자, 번지 없음)`, guardianPhone: `010-0000-${7100 + i}` }
    })
  }

  // 차량(가정). 구급차 6대는 SOURCE A 5절 수치, 리프트 승합차는 주야간보호기관 9곳(공단 2026. 10. 6.)에 기관당 1대를 둔 가정.
  // 나머지 수량은 기관 조사 후 입력한다. 대기 위치는 소속 동 행정복지센터로 둔다
  const contract = (days) => TODAY + days * DAY
  const lift = ['CG', 'BH', 'BS', 'BS', 'BS', 'CG', 'CG', 'SJ', 'BH']
  const carBase = ['CG', 'CG', 'CG', 'BS', 'BS', 'BS', 'BG', 'BH', 'DH', 'MH', 'MH', 'BP', 'BP', 'BP', 'MS', 'MS', 'SH', 'SH']
  const vehicles = [
    ...[1, 2, 3, 4, 5, 6].map((i) => ({
      code: `V-0${i}`, type: 'ambulance', owner: 'fire', baseDong: ['CG', 'BP', 'MH', 'CG', 'BP', 'SH'][i - 1],
      available: i <= 3, note: i <= 3 ? '' : '응급 출동 대기'
    })),
    { code: 'V-07', type: 'bedVan', owner: 'facility', baseDong: 'BG', available: true, note: '노인요양시설 차량(가정)' },
    { code: 'V-08', type: 'bedVan', owner: 'facility', baseDong: 'BP', available: true, note: '노인요양시설 차량(가정)' },
    ...lift.map((dong, k) => ({ code: `V-${String(9 + k).padStart(2, '0')}`, type: 'liftVan', owner: 'facility', baseDong: dong, available: true, note: '주야간보호기관 차량(가정)' })),
    { code: 'V-18', type: 'liftVan', owner: 'city', baseDong: 'CG', available: true, note: '' },
    ...carBase.map((dong, k) => ({
      code: `V-${19 + k}`, type: 'car', owner: 'contract', baseDong: dong,
      available: true, contractUntil: k === 2 ? contract(18) : contract(120 + k * 9), note: ''
    })),
    ...['CG', 'BS', 'BP', 'MH', 'MS', 'SH'].map((dong, k) => ({ code: `V-${37 + k}`, type: 'bus', owner: 'city', baseDong: dong, available: true, note: '' }))
  ]

  // 도우미(가정). 마을 대상자 30명당 1명, 마을마다 1명 이상
  const helpers = []
  const helperVillages = []
  for (const v of VILLAGES) {
    const n = Math.max(1, Math.ceil(v.targets / 30))
    for (let i = 0; i < n; i += 1) helperVillages.push([v.code])
  }
  helperVillages.forEach((vs, i) => {
    const extra = VILLAGES[(i * 7 + 3) % VILLAGES.length].code
    const list = r() < 0.3 && !vs.includes(extra) ? [...vs, extra] : vs
    const grades = i % 4 === 0 ? ['wheelchair', 'assist', 'walk'] : i % 3 === 0 ? ['assist', 'walk'] : ['wheelchair', 'assist', 'walk']
    helpers.push({ code: `H-${String(i + 1).padStart(3, '0')}`, villages: list, grades, channel: 'sms', active: true })
  })

  const scenarios = [
    fireScenario({
      id: 'S-1', name: '옥계 방면 북측 확산', villages,
      origin: ORIGIN_NAMYANG, originLabel: '강릉시 옥계면 남양리', heading: 95, halfWidthKm: 4, speedKmh: 2, leadHours: 0, scopeHours: 3,
      basis: '2022년 3월 5일 01시 20분께 강릉시 옥계면 남양리에서 난 불이 05시 30분께 동해시 망상동까지 번졌습니다(연합뉴스 2022. 3. 5.). 확산 속도 시속 2km와 동쪽 방향 확산은 이 기록을 참고한 가정값이며, 발화 확인과 동시에 발령한다고 봅니다.'
    }),
    fireScenario({
      id: 'S-2', name: '삼화동 서측 산림 발화', villages,
      origin: ORIGIN_MUREUNG, originLabel: '삼화동 무릉계곡 서쪽 산림', heading: 75, halfWidthKm: 3, speedKmh: 1.5, leadHours: 0, scopeHours: 3,
      basis: '두타산과 무릉계곡 산림에서 발화해 동쪽 마을로 번지는 가정입니다. 확산 속도 시속 1.5km는 가정값이며, 발화 확인과 동시에 발령한다고 봅니다.'
    }),
    fireScenario({
      id: 'S-3', name: '옥계 방면 초고속 확산', villages,
      origin: ORIGIN_NAMYANG, originLabel: '강릉시 옥계면 남양리', heading: 110, halfWidthKm: 5, speedKmh: 8.2, leadHours: 3, scopeHours: 1,
      basis: '확산 속도 시속 8.2km는 2025년 3월 경북 의성 산불의 확산 속도로, 국내 관측 이래 가장 빠른 값입니다(국가산림위성정보활용센터 분석, 2025. 3. 27. 발표). 산불 위험 예보에 따라 발화 3시간 전에 사전 발령한다고 봅니다.'
    }),
    hazardScenario({
      id: 'T-1', name: '동해 지진해일 경보', kind: 'tsunami', villages, terrain: VILLAGE_TERRAIN, windowHours: 1.5, prepMinutes: 10,
      pick: (t) => t.elev <= 12 && t.seaKm != null && t.seaKm <= 1.3,
      rule: '해발 12m 이하이면서 바다에서 1.3km 안인 마을',
      basis: '2024년 1월 1일 일본 노토반도 지진(16시 10분) 뒤 묵호에 18시 6분 첫 지진해일이 닿았고 최대 85cm였습니다(연합뉴스 2024. 1. 2.). 1983년 동해 중부 지진해일 때 묵호에 2m 넘는 해일이 들어 1명이 숨졌습니다(조선비즈 2024. 1. 2.). 도달 1시간 30분, 준비 10분, 대상 마을 기준(해발 12m, 해안 1.3km)은 가정입니다. 지형 값은 약 90m 칸 고도라 해안 저지대 오차가 큽니다.'
    }),
    hazardScenario({
      id: 'R-1', name: '태풍 호우 저지대 침수', kind: 'flood', villages, terrain: VILLAGE_TERRAIN, windowHours: 6,
      pick: (t) => t.elev <= 15,
      rule: '해발 15m 이하 마을',
      basis: '2019년 10월 태풍 미탁 때 동해에 367.7mm가 내렸고 동해시 망상동이 특별재난지역으로 선포됐습니다(연합뉴스 2019. 10. 3., 정부 발표 2019. 10. 17.). 호우경보 뒤 6시간 안 사전 대피와 대상 마을 기준(해발 15m)은 가정입니다. 실제 침수흔적도와 하천 범람 구역은 반영하지 않았습니다(진행 예정).'
    }),
    hazardScenario({
      id: 'L-1', name: '집중호우 산사태 우려', kind: 'landslide', villages, terrain: VILLAGE_TERRAIN, windowHours: 2,
      pick: (t) => t.slope >= 25,
      rule: '집결지 둘레 300m 안 최대 경사 25도 이상 마을',
      basis: '2019년 10월 3일 태풍 미탁 폭우로 삼척시 오분동 주택지 사면이 무너져 1명이 숨졌습니다(연합뉴스 2019. 10. 3.). 산사태 경보 뒤 2시간 안 대피와 경사 25도 기준은 가정입니다. 산림청 산사태 위험지도는 반영하지 않았습니다(진행 예정).'
    }),
    hazardScenario({
      id: 'W-1', name: '대설 산간 마을 고립', kind: 'snow', villages, terrain: VILLAGE_TERRAIN, windowHours: 24, travelFactor: 1.8,
      pick: (t) => t.elev >= 100 || (t.seaKm != null && t.seaKm >= 6),
      rule: '해발 100m 이상이거나 바다에서 6km 넘게 떨어진 산간 마을',
      basis: '2014년 2월 6일부터 14일까지 9일 연속 눈이 내려 영동 산간마을 14곳 390여 가구가 고립됐습니다(연합뉴스 2014. 2. 10.). 대설경보 뒤 24시간 안 이송, 눈길 주행 시간 1.8배, 대상 마을 기준은 가정입니다.'
    }),
    citywideScenario({
      id: 'S-4', name: '시 전체 동시 대피', villages, windowHours: 8,
      basis: '모든 마을이 발령 후 8시간에 함께 위험해지는 경우입니다. 차량과 대피소 용량의 상한을 확인할 때 씁니다.'
    })
  ]

  return {
    dongs: DONGS, shelters: SHELTERS, villages, persons, privateInfo, vehicles, helpers,
    settings: { ...SETTINGS }, scenarios, activeScenarioId: 'S-1', intakeDocs: docs,
    records: [], today: TODAY
  }
}

// 시연용 대피계획서와 대피카드(가상 서식, 실제 법정동 이름). 전사문과 판독 결과(모의 AI 응답)
function intakeDocs() {
  const at = TODAY - 2 * DAY
  return [
    {
      id: 'DOC-0001', kind: 'plan', name: '망상동 심곡동 대피계획서', villageCode: 'MS-02',
      image: '/images/intake/plan-ms02.svg', uploadedAt: at, status: 'pending',
      transcript: '망상동 심곡동 재난취약자 대피계획서 순번 1 거동 상태 누워서만 생활함 산소발생기 사용 보호자 동행 필요 순번 2 거동 상태 휠체어 사용 혼자 이동 어려움 순번 3 거동 상태 지팡이 짚고 부축 받으면 이동 가능 순번 4 거동 상태 혼자 걸을 수 있음 청력 약함',
      results: [
        { personCode: 'MS-02-901', grade: 'bed', tags: ['bedridden', 'oxygen', 'guardian'], quote: '누워서만 생활함 산소발생기 사용', confidence: 'high', box: [6, 30, 88, 12] },
        { personCode: 'MS-02-902', grade: 'wheelchair', tags: [], quote: '휠체어 사용 혼자 이동 어려움', confidence: 'high', box: [6, 44, 88, 12] },
        { personCode: 'MS-02-903', grade: 'assist', tags: [], quote: '지팡이 짚고 부축 받으면 이동 가능', confidence: 'mid', box: [6, 58, 88, 12] },
        { personCode: 'MS-02-904', grade: 'walk', tags: ['hearing'], quote: '혼자 걸을 수 있음 청력 약함', confidence: 'high', box: [6, 72, 88, 12] }
      ]
    },
    {
      id: 'DOC-0002', kind: 'card', name: '북삼동 지흥동 대피카드', villageCode: 'BS-01',
      image: '/images/intake/card-bs01.svg', uploadedAt: at, status: 'pending',
      transcript: '대피카드 북삼동 지흥동 거동 상태 침대에서 거의 못 일어나심 기저귀 사용 딸 연락 필요',
      results: [
        { personCode: 'BS-01-901', grade: 'bed', tags: ['bedridden', 'guardian'], quote: '침대에서 거의 못 일어나심', confidence: 'mid', box: [8, 40, 84, 22] }
      ]
    },
    {
      id: 'DOC-0003', kind: 'plan', name: '삼화동 이로동 대피계획서 (흐린 사본)', villageCode: 'SH-03',
      image: '/images/intake/plan-sh03.svg', uploadedAt: at - 20 * DAY, status: 'pending',
      transcript: '삼화동 이로동 대피계획서 순번 1 거동 상태 보행기 이용 천천히 이동 순번 2 거동 상태 판독 불가',
      results: [
        { personCode: 'SH-03-901', grade: 'assist', tags: [], quote: '보행기 이용 천천히 이동', confidence: 'mid', box: [6, 36, 88, 14] },
        // 근거 문구가 전사문에 없는 결과. 원문 대조에서 신뢰도 하로 떨어지는 사례
        { personCode: 'SH-03-902', grade: 'wheelchair', tags: [], quote: '휠체어로 이동', confidence: 'high', box: [6, 54, 88, 14] }
      ]
    }
  ]
}

// 샘플 업로드용 서류. 판독 실행 시 이 응답을 모의 AI 결과로 사용
export const SAMPLE_UPLOAD = {
  kind: 'card', name: '묵호동 어달동 대피카드', villageCode: 'MH-02', image: '/images/intake/card-mh02.svg',
  transcript: '대피카드 묵호동 어달동 거동 상태 휠체어 타고 계심 계단 있음 혼자 사심 거동 상태 걸을 수 있으나 치매 증상 있음 인솔 필요',
  results: [
    { personCode: 'MH-02-911', grade: 'wheelchair', tags: [], quote: '휠체어 타고 계심 계단 있음', confidence: 'high', box: [8, 34, 84, 18] },
    { personCode: 'MH-02-912', grade: 'walk', tags: ['dementia'], quote: '걸을 수 있으나 치매 증상 있음 인솔 필요', confidence: 'mid', box: [8, 58, 84, 18] }
  ]
}

export { TODAY, MIN }
