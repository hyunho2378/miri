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
import { REGION } from '../regions/index.js'
import { withShelterChecks } from '../lib/tripChecks.js'

const DAY = 24 * HOUR
// 지역 설정(regions/). 기본은 동해시이고 실제 공개 자료 파일(donghaeData.js)을 그대로 가리킨다
const { DONG_CENTERS, LTC, TEMP_SHELTERS, VILLAGES } = REGION.data

export const DONGS = REGION.dongs.map((d) => ({ ...d, center: DONG_CENTERS.find((c) => c.dong === d.code) || null }))

// 임시주거시설 27곳(실제). 화면에서 쓰는 이름 그대로
// 리프트 차량 진입, 야간과 휴일 개방 담당은 공개 자료에 없어 null(확인 필요). 시설 확인 뒤 같은 칸에 채움
export const SHELTERS = withShelterChecks(TEMP_SHELTERS)

export const SETTINGS = {
  orgName: import.meta.env?.VITE_ORG_NAME || REGION.org.name,
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
// 명부 마지막 확인 날짜의 기준일: 시드 기준일과 오늘 9시 중 늦은 날(시연 날짜가 지나도 재확인 필요 비율이 그대로)
const PLAN_BASE = Math.max(TODAY, new Date(new Date().setHours(9, 0, 0, 0)).getTime())


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

// 대상자 돌봄과 의사소통 정보(가상). 의사소통 특성은 청각, 인지, 언어. 돌봄 담당자 유형만 두고 이름은 두지 않음
export function careOf(tags, grade, k, ltcGrade) {
  const comm = []
  if (tags.includes('hearing')) comm.push('청각')
  if (tags.includes('dementia')) comm.push('인지')
  if (k % 11 === 0) comm.push('언어')
  // 회신 R37: 돌봄 있음 분기 안에서 유형만 구분. 난수와 연락 여부, 배정 수치는 유지한다
  const caregiverType = tags.includes('guardian') ? '가족' : k % 3 === 0 ? (ltcGrade ? '요양보호사' : '확인 필요') : k % 3 === 1 ? '이웃' : '없음'
  const caregiverReachable = caregiverType === '없음' ? null : k % 7 === 0 ? false : true
  const aids = []
  if (tags.includes('wheelPower')) aids.push('전동 휠체어')
  if (tags.includes('wheelManual')) aids.push('수동 휠체어')
  if (grade === 'bed') aids.push('침대형 이송')
  if (tags.includes('oxygen')) aids.push('산소')
  if (grade === 'assist' && k % 4 === 0) aids.push('보행기')
  return { comm, caregiverType, caregiverReachable, aids }
}

// 탑승 메모(1026 동해시노인종합복지관 주간보호센터 사회복지사 면담: 편마비 쪽과 체격으로 앉을 자리를 정하고 지팡이는 직원이 따로 보관).
// 시연 자료 일부에만 가상 예시 값. 난수를 쓰지 않아 다른 시드 값은 그대로
export function boardingNoteOf(grade, k) {
  if (grade === 'assist' && k % 9 === 0) return k % 2 === 0 ? '왼쪽 편마비: 운전석 뒤 왼쪽 자리, 지팡이는 도우미가 따로 보관' : '오른쪽 편마비: 조수석 뒤 오른쪽 자리, 보행기는 접어서 짐칸'
  if (grade === 'wheelchair' && k % 7 === 0) return '휠체어 고정 뒤 옆자리에 도우미 한 명'
  return ''
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
      // 회신 R17(한국척수장애인협회): 전동과 수동 휠체어 구분, 욕창 확인 필요. 난수 순서를 바꾸지 않도록 k로 정함
      if (grade === 'wheelchair') tags.push(k % 3 === 0 ? 'wheelPower' : 'wheelManual')
      if (grade === 'bed' && k % 2 === 0) tags.push('pressureSore')
      const code = `${v.code}-${String(k).padStart(3, '0')}`
      persons.push({
        code, villageCode: v.code, grade, ltcGrade, tags,
        gradeSource: r() < 0.6 ? 'ai' : 'manual', review: 'confirmed',
        docId: `DOC-${String(docSeq).padStart(4, '0')}`, docPos: k,
        updatedAt: TODAY - intIn(r, 3, 60) * DAY,
        // 회신 R28(최정원): 당사자와 계획 확인 상태와 마지막 확인 날짜, 이동 경로 항목. 모두 가상 값
        // 시연 명부 마지막 확인: 대부분 최근 두 달 안, 12명 중 1명은 기록 없음, 12명 중 1명은 90일 넘음(8회차 교차 점검). 기준일은 오늘(시드 TODAY 이후면 오늘)로 굴려 시연 시점과 무관하게 같은 분포. 난수를 쓰지 않아 다른 시드 값은 그대로
        // 위치 정보 별도 동의(개인정보 보호법 제17조 제1항 제1호, 26회차): 가상 값. 대부분 동의, 8명 중 1명 미동의. 난수를 쓰지 않아 다른 시드 값은 그대로
        locConsent: k % 8 !== 0,
        planCheckedAt: k % 12 === 0 ? null : PLAN_BASE - (k % 12 === 6 ? 95 + (k % 30) : (k * 7) % 60 + 1) * DAY,
        access: {
          floor: k % 5 === 0 ? '3층' : k % 3 === 0 ? '2층' : '1층',
          stairs: k % 5 === 0 ? '계단만 있음' : k % 3 === 0 ? '엘리베이터 있음' : '계단 없음',
          vehicle: k % 2 === 0 ? '대문 앞까지 차량 진입 가능' : '골목 입구에서 하차, 30미터 도보',
          comm: tags.includes('hearing') ? '글로 써서 설명' : tags.includes('dementia') ? '보호자가 먼저 설명' : '말로 설명'
        },
        // 치매 전문 언론 자문 회신: 평소 돌봄 담당자, 의사소통 특성, 보조기구. 모두 가상 값이고 이름은 두지 않음
        // 난수 순서를 바꾸지 않도록 태그와 k로 정함
        care: careOf(tags, grade, k, ltcGrade),
        ...(boardingNoteOf(grade, k) ? { boardingNote: boardingNoteOf(grade, k) } : {})
      })
      privateInfo[code] = {
        address: `${REGION.name} ${v.name} (가상 대상자, 번지 없음)`,
        guardianPhone: `010-0000-${String(intIn(r, 1000, 9999))}`,
        // 현직 소방관 인터뷰(Q6): 동호수와 층이 필요. 가상 값이고 난수를 쓰지 않아 다른 시드 값은 그대로
        unit: k % 5 === 0 || k % 3 === 0 ? `가상 ${101 + (k % 3)}동 ${k % 5 === 0 ? 3 : 2}0${(k % 4) + 1}호` : '가상 단독주택'
      }
    }
    docSeq += 1
  }

  // 회신 R24(김현규): 주야간보호 이용자는 낮에는 집이 아니라 센터에 있다. 이용자 수는 공단 통계(LTC.dayCareUsers 계)를 쓰고,
  // 누가 이용자인지는 가상이라 코드의 고정 해시 순서로 고른다(난수 순서를 바꾸지 않음)
  const dayCareN = LTC.dayCareUsers?.['계'] || 0
  const hash = (str) => { let h = 2166136261; for (let i = 0; i < str.length; i += 1) { h ^= str.charCodeAt(i); h = Math.imul(h, 16777619) } return h >>> 0 }
  ;[...persons].sort((a, b) => hash(a.code) - hash(b.code) || a.code.localeCompare(b.code)).slice(0, dayCareN).forEach((p) => { p.dayCare = true })

  // 판독 확인 대기 8건은 아래 INTAKE_DOCS 결과와 연결
  // 이상 탐지 시연용: 와상 표기된 부축 등급 1건, 같은 서류 같은 위치 중복 1쌍
  const conflict = persons.find((p) => p.villageCode === REGION.demo.conflictVillage && p.grade === 'assist')
  if (conflict) conflict.tags = [...conflict.tags, 'bedridden']
  const dupSrc = persons.find((p) => p.villageCode === REGION.demo.duplicateVillage && p.grade === 'walk')
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
      privateInfo[code] = { address: `${REGION.name} ${VILLAGES.find((v) => v.code === doc.villageCode)?.name} (가상 대상자, 번지 없음)`, guardianPhone: `010-0000-${7100 + i}` }
    })
  }

  // 차량(가정). 구급차 6대는 SOURCE A 5절 수치, 리프트 승합차는 주야간보호기관 9곳(공단 2026. 10. 6.)에 기관당 1대를 둔 가정.
  // 나머지 수량은 기관 조사 후 입력한다. 대기 위치는 소속 동 행정복지센터로 둔다
  const contract = (days) => TODAY + days * DAY
  // 소속 동 배치는 지역 설정 fleet. 차량 번호는 칸 순서대로 붙인다
  const F = REGION.fleet
  const lift = F.liftFacility
  const carBase = F.car
  const no = F.ambulance.length + F.bedVan.length
  const vcode = (n) => `V-${String(n).padStart(2, '0')}`
  const vehicles = [
    ...F.ambulance.map((dong, k) => ({
      code: vcode(k + 1), type: 'ambulance', owner: 'fire', baseDong: dong,
      available: k < F.ambulanceReady, note: k < F.ambulanceReady ? '' : '소방 출동 중(제외)', commitment: 'fire'
    })),
    ...F.bedVan.map((dong, k) => ({ code: vcode(F.ambulance.length + k + 1), type: 'bedVan', owner: 'facility', baseDong: dong, available: true, note: '노인요양시설 차량(가정)', commitment: 'unconfirmed' })),
    ...lift.map((dong, k) => ({ code: vcode(no + 1 + k), type: 'liftVan', owner: 'facility', baseDong: dong, available: true, note: '주야간보호기관 차량(가정)', dayCare: true, commitment: 'unconfirmed' })),
    ...F.liftCity.map((dong, k) => ({ code: vcode(no + lift.length + 1 + k), type: 'liftVan', owner: 'city', baseDong: dong, available: true, note: '', commitment: 'agreed' })),
    ...carBase.map((dong, k) => ({
      code: vcode(no + lift.length + F.liftCity.length + 1 + k), type: 'car', owner: 'contract', baseDong: dong,
      available: true, contractUntil: k === F.carContractSoon ? contract(18) : contract(120 + k * 9), note: '', commitment: 'agreed'
    })),
    ...F.bus.map((dong, k) => ({ code: vcode(no + lift.length + F.liftCity.length + carBase.length + 1 + k), type: 'bus', owner: 'city', baseDong: dong, available: true, note: '', commitment: 'agreed' }))
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
    // 회신 R12, R06, R24: 사전 동의한 사람만 배정 후보. 역할(차량 동행 등), 기본소생술 교육, 봉사 상해보험은 가상 값
    helpers.push({
      code: `H-${String(i + 1).padStart(3, '0')}`, villages: list, grades, channel: 'sms', active: true,
      consent: true, consentAt: TODAY - (30 + (i % 60)) * DAY,
      roles: i % 5 === 0 ? ['ride', 'contact'] : ['ride', 'walk'], bls: i % 3 !== 1, insured: i % 7 !== 3,
      // 회신 R43: 시 지정 1대1 매칭 소속(가상 값, 난수 순서에 영향 없게 번호로 정함)
      affiliation: ['leader', 'disasterCorps', 'civic', 'leader', 'volunteer'][i % 5]
    })
  })

  // 시나리오는 지역 설정에 정의한다(regions/<지역>.js). 마을과 지형만 여기서 붙인다
  const make = { fire: fireScenario, hazard: hazardScenario, citywide: citywideScenario }
  const scenarios = REGION.scenarios.map(({ type, ...spec }) => make[type]({ ...spec, villages, ...(type === 'hazard' ? { terrain: REGION.terrain } : {}) }))

  return {
    dongs: DONGS, shelters: SHELTERS, villages, persons, privateInfo, vehicles, helpers,
    settings: { ...SETTINGS }, scenarios: scenarios.map((sc) => ({ ...sc, builtin: true })), activeScenarioId: REGION.activeScenarioId, intakeDocs: docs,
    records: pastRecords(), today: TODAY
  }
}


// 시연용 대피계획서와 대피카드. 지역 설정의 서식 목록(가상 서식, 실제 법정동 이름)을 그대로 쓴다
function intakeDocs() {
  return REGION.intakeDocs(TODAY - 2 * DAY, DAY)
}

// 샘플 업로드용 서류. 판독 실행 시 이 응답을 모의 AI 결과로 사용
export const SAMPLE_UPLOAD = REGION.sampleUpload

export { TODAY, MIN }

// 지난 훈련 발령 기록(지역 설정 drills). [월, 일, 시, 분, 걸린 분, 도우미 수, [[마을 코드, 대상자, 인계 완료, 소방 인계], ...]]
function pastRecords() {
  return REGION.drills.map(([mo, d, h, mi, dur, helpers, rows]) => {
    const startedAt = new Date(2026, mo - 1, d, h, mi).getTime()
    const closedAt = startedAt + dur * 60000
    const byVillage = {}
    let done = 0, fire = 0, total = 0
    for (const [code, t, ok, f] of rows) { byVillage[code] = { total: t, done: ok, failed: t - ok - f, fire: f }; done += ok; fire += f; total += t }
    const open = total - done - fire
    const counts = { handover: done }
    if (fire) counts.handedToFire = fire
    if (open) counts.fail = open
    return {
      id: `R-${startedAt}`, kind: 'drill', startedAt, closedAt, counts, byVillage, targets: total, helpers,
      handovers: [], metrics: { unserved: open + fire, weightedUnserved: (open + fire) * 2, lastFinishAt: closedAt },
      baseline: { unserved: open + fire + Math.max(2, Math.round(total * 0.05)), weightedUnserved: (open + fire) * 2 + 9, lastFinishAt: closedAt + 6 * 60000 }
    }
  }).reverse()
}
