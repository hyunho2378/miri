// seed.js 가상 데이터 생성기. 고정 시드라 매번 같은 결과. 실제 개인정보 없음.
// 생성 규칙
// - 동 10개는 동해시 실제 행정동 이름. 마을은 "가상마을 N" 표기로 실제 마을명 사용 안 함
// - 산림 연접 마을 18개(SOURCE A 5절 수치). 대상자 수와 등급 분포는 가상 값
// - 구급차 6대(SOURCE A 5절 수치) 중 3대는 응급 출동 대기로 대피 이송 불가 가정
// - 이름 주소 연락처는 지자체 서버 보관 전제. 이 파일에서는 privateInfo 로 분리하고 도우미 화면에서만 사용
import { intIn, mulberry32, pickOne } from '../lib/rng.js'
import { HOUR, MIN } from '../lib/time.js'

const DAY = 24 * HOUR

export const DONGS = [
  { code: 'CG', name: '천곡동' }, { code: 'SJ', name: '송정동' }, { code: 'BS', name: '북삼동' },
  { code: 'BG', name: '부곡동' }, { code: 'DH', name: '동호동' }, { code: 'BH', name: '발한동' },
  { code: 'MH', name: '묵호동' }, { code: 'BP', name: '북평동' }, { code: 'MS', name: '망상동' },
  { code: 'SH', name: '삼화동' }
]

export const SHELTERS = [
  { code: 'SH-01', name: '가상 대피소 1 (망상)', dongCode: 'MS' },
  { code: 'SH-02', name: '가상 대피소 2 (북삼)', dongCode: 'BS' },
  { code: 'SH-03', name: '가상 대피소 3 (천곡)', dongCode: 'CG' },
  { code: 'SH-04', name: '가상 대피소 4 (북평)', dongCode: 'BP' },
  { code: 'SH-05', name: '가상 대피소 5 (삼화)', dongCode: 'SH' }
]

// 산불 확산 방향 가정: 북쪽(강릉 옥계 방향)에서 남쪽으로. offset 은 기본 시나리오 도달 시각 차이(시간)
const VILLAGE_PLAN = [
  ['MS', 4, 'SH-01', [55, 70, 85, 100], 0],
  ['BS', 3, 'SH-02', [45, 60, 75], 1],
  ['MH', 2, 'SH-03', [40, 50], 1.5],
  ['BG', 2, 'SH-03', [50, 65], 2],
  ['BP', 3, 'SH-04', [45, 60, 80], 2.5],
  ['SH', 4, 'SH-05', [60, 75, 90, 110], 3]
]

export const SETTINGS = {
  orgName: import.meta.env?.VITE_ORG_NAME || '동해시',
  prepMinutes: 60,
  windowHours: 8,
  completeBeforeHours: 0,
  pendingDays: 14,
  contractWarnDays: 30,
  helperLoadMax: 40,
  noAckMinutes: 10
}

const TODAY = new Date(2026, 9, 2, 9, 0).getTime()

export function buildSeed() {
  const r = mulberry32(20260405)
  const villages = []
  for (const [dong, n, shelter, rts, offset] of VILLAGE_PLAN) {
    for (let i = 1; i <= n; i += 1) {
      const dongName = DONGS.find((d) => d.code === dong).name
      villages.push({
        code: `${dong}-${String(i).padStart(2, '0')}`, dongCode: dong,
        label: `${dongName} 가상마을 ${i}`, forestAdjacent: true,
        shelterCode: shelter, roundTripMin: rts[i - 1], offsetHours: offset
      })
    }
  }

  const persons = []
  const privateInfo = {}
  const pickGrade = () => {
    const x = r()
    if (x < 0.17) return 'bed'
    if (x < 0.37) return 'wheelchair'
    if (x < 0.70) return 'assist'
    return 'walk'
  }
  let docSeq = 10
  for (const v of villages) {
    const n = intIn(r, 13, 24)
    for (let k = 1; k <= n; k += 1) {
      const grade = pickGrade()
      const tags = []
      if (grade === 'bed') { tags.push('bedridden'); if (r() < 0.4) tags.push('oxygen') }
      if (r() < 0.3) tags.push('guardian')
      if (r() < 0.15) tags.push('dementia')
      if (r() < 0.1) tags.push('hearing')
      if (r() < 0.2) tags.push('medication')
      const code = `${v.code}-${String(k).padStart(3, '0')}`
      persons.push({
        code, villageCode: v.code, grade, tags,
        gradeSource: r() < 0.6 ? 'ai' : 'manual', review: 'confirmed',
        docId: `DOC-${String(docSeq).padStart(4, '0')}`, docPos: k,
        updatedAt: TODAY - intIn(r, 3, 60) * DAY
      })
      privateInfo[code] = {
        address: `동해시 ${DONGS.find((d) => d.code === v.dongCode).name} 가상로 ${intIn(r, 1, 120)}`,
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
    const code = `${dupSrc.villageCode}-${String(90).padStart(3, '0')}`
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
      privateInfo[code] = { address: `동해시 ${DONGS.find((d) => d.code === doc.villageCode.slice(0, 2)).name} 가상로 ${50 + i}`, guardianPhone: `010-0000-${7100 + i}` }
    })
  }

  const contract = (days) => TODAY + days * DAY
  const vehicles = [
    ...[1, 2, 3, 4, 5, 6].map((i) => ({
      code: `V-0${i}`, type: 'ambulance', owner: 'fire', baseDong: ['CG', 'BP', 'MH', 'CG', 'BP', 'SH'][i - 1],
      available: i <= 3, note: i <= 3 ? '' : '응급 출동 대기'
    })),
    { code: 'V-07', type: 'bedVan', owner: 'facility', baseDong: 'BS', available: true, note: '가상 요양원 차량' },
    { code: 'V-08', type: 'liftVan', owner: 'city', baseDong: 'CG', available: true, note: '' },
    { code: 'V-09', type: 'liftVan', owner: 'facility', baseDong: 'BP', available: true, note: '가상 주간보호센터 차량' },
    ...[10, 11, 12, 13, 14, 15, 16, 17].map((i, k) => ({
      code: `V-${i}`, type: 'car', owner: 'contract', baseDong: pickOne(r, ['MS', 'BS', 'MH', 'BG', 'BP', 'SH']),
      available: true, contractUntil: k === 2 ? contract(18) : contract(120 + k * 15), note: ''
    })),
    ...[18, 19, 20].map((i) => ({ code: `V-${i}`, type: 'bus', owner: 'city', baseDong: ['MS', 'BP', 'SH'][i - 18], available: true, note: '' }))
  ]

  const helpers = []
  for (let i = 1; i <= 28; i += 1) {
    const vs = [villages[(i * 3) % villages.length].code]
    if (r() < 0.4) vs.push(villages[(i * 7) % villages.length].code)
    const grades = i % 4 === 0 ? ['wheelchair', 'assist', 'walk'] : i % 3 === 0 ? ['assist', 'walk'] : ['wheelchair', 'assist', 'walk']
    helpers.push({ code: `H-${String(i).padStart(3, '0')}`, villages: vs, grades, channel: 'sms', active: true })
  }
  // 과다 담당 시연용
  helpers[4].villages = ['MS-01', 'MS-02', 'MS-03', 'MS-04']

  const scenarios = [
    {
      id: 'S-1', name: '기본: 북측 확산 (망상 기준 발령 후 8시간 도달)',
      windowHours: 8, prepMinutes: 60, completeBeforeHours: 0, extraVehicles: {},
      offsetHours: Object.fromEntries(villages.map((v) => [v.code, v.offsetHours]))
    },
    {
      id: 'S-2', name: '동시 확산 (전 마을 발령 후 8시간 도달)',
      windowHours: 8, prepMinutes: 60, completeBeforeHours: 0, extraVehicles: {},
      offsetHours: Object.fromEntries(villages.map((v) => [v.code, 0]))
    }
  ]

  return {
    dongs: DONGS, shelters: SHELTERS, villages, persons, privateInfo, vehicles, helpers,
    settings: { ...SETTINGS }, scenarios, activeScenarioId: 'S-1', intakeDocs: docs,
    records: [], today: TODAY
  }
}

// 가상 대피계획서와 대피카드. 전사문과 판독 결과(모의 AI 응답)
function intakeDocs() {
  const at = TODAY - 2 * DAY
  return [
    {
      id: 'DOC-0001', kind: 'plan', name: '망상동 가상마을 2 대피계획서', villageCode: 'MS-02',
      image: '/images/intake/plan-ms02.svg', uploadedAt: at, status: 'pending',
      transcript: '망상동 가상마을 2 재난취약자 대피계획서 순번 1 거동 상태 누워서만 생활함 산소발생기 사용 보호자 동행 필요 순번 2 거동 상태 휠체어 사용 혼자 이동 어려움 순번 3 거동 상태 지팡이 짚고 부축 받으면 이동 가능 순번 4 거동 상태 혼자 걸을 수 있음 청력 약함',
      results: [
        { personCode: 'MS-02-201', grade: 'bed', tags: ['bedridden', 'oxygen', 'guardian'], quote: '누워서만 생활함 산소발생기 사용', confidence: 'high', box: [6, 30, 88, 12] },
        { personCode: 'MS-02-202', grade: 'wheelchair', tags: [], quote: '휠체어 사용 혼자 이동 어려움', confidence: 'high', box: [6, 44, 88, 12] },
        { personCode: 'MS-02-203', grade: 'assist', tags: [], quote: '지팡이 짚고 부축 받으면 이동 가능', confidence: 'mid', box: [6, 58, 88, 12] },
        { personCode: 'MS-02-204', grade: 'walk', tags: ['hearing'], quote: '혼자 걸을 수 있음 청력 약함', confidence: 'high', box: [6, 72, 88, 12] }
      ]
    },
    {
      id: 'DOC-0002', kind: 'card', name: '북삼동 가상마을 1 대피카드', villageCode: 'BS-01',
      image: '/images/intake/card-bs01.svg', uploadedAt: at, status: 'pending',
      transcript: '대피카드 북삼동 가상마을 1 거동 상태 침대에서 거의 못 일어나심 기저귀 사용 딸 연락 필요',
      results: [
        { personCode: 'BS-01-201', grade: 'bed', tags: ['bedridden', 'guardian'], quote: '침대에서 거의 못 일어나심', confidence: 'mid', box: [8, 40, 84, 22] }
      ]
    },
    {
      id: 'DOC-0003', kind: 'plan', name: '삼화동 가상마을 3 대피계획서 (흐린 사본)', villageCode: 'SH-03',
      image: '/images/intake/plan-sh03.svg', uploadedAt: at - 20 * DAY, status: 'pending',
      transcript: '삼화동 가상마을 3 대피계획서 순번 1 거동 상태 보행기 이용 천천히 이동 순번 2 거동 상태 판독 불가',
      results: [
        { personCode: 'SH-03-201', grade: 'assist', tags: [], quote: '보행기 이용 천천히 이동', confidence: 'mid', box: [6, 36, 88, 14] },
        // 근거 문구가 전사문에 없는 결과. 원문 대조에서 신뢰도 하로 떨어지는 사례
        { personCode: 'SH-03-202', grade: 'wheelchair', tags: [], quote: '휠체어로 이동', confidence: 'high', box: [6, 54, 88, 14] }
      ]
    }
  ]
}

// 샘플 업로드용 서류. 판독 실행 시 이 응답을 모의 AI 결과로 사용
export const SAMPLE_UPLOAD = {
  kind: 'card', name: '묵호동 가상마을 2 대피카드', villageCode: 'MH-02', image: '/images/intake/card-mh02.svg',
  transcript: '대피카드 묵호동 가상마을 2 거동 상태 휠체어 타고 계심 계단 있음 혼자 사심 거동 상태 걸을 수 있으나 치매 증상 있음 인솔 필요',
  results: [
    { personCode: 'MH-02-301', grade: 'wheelchair', tags: [], quote: '휠체어 타고 계심 계단 있음', confidence: 'high', box: [8, 34, 84, 18] },
    { personCode: 'MH-02-302', grade: 'walk', tags: ['dementia'], quote: '걸을 수 있으나 치매 증상 있음 인솔 필요', confidence: 'mid', box: [8, 58, 84, 18] }
  ]
}

export { TODAY, MIN }
