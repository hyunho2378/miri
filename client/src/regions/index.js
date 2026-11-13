// regions/index.js 지역 설정 등록부. 앱은 지역마다 달라지는 값을 여기서 고른 REGION 하나만 읽는다.
// 지역 고르기 순서: 주소 인자 ?region=<id>(탭 단위로 기억) > 저장된 탭 값 > 환경 변수(VITE_REGION, 서버와 시험은 MIRI_REGION) > 동해시.
// 새 시군은 이 폴더에 <id>.js 하나를 만들고 아래 REGIONS 에 한 줄 더한다. 절차는 docs/REGION_GUIDE.md.
import donghae from './donghae.js'
import samcheok from './samcheok.js'

export const REGIONS = { donghae, samcheok }
export const DEFAULT_REGION_ID = 'donghae'
const STORE_KEY = 'miri:region'

// 필수 항목. 하나라도 빠지면 validateRegion 이 이름을 돌려준다
const REQUIRED = [
  'id', 'name', 'shortName', 'province', 'codes.sgg', 'codes.sido', 'codes.sigungu',
  'org.name', 'org.head', 'org.dept', 'org.office', 'org.fire',
  'map.bbox', 'map.center', 'map.outline', 'map.dongGeo', 'map.weatherPoint',
  'dongs', 'data.DATA_SOURCES', 'data.DONG_STATS', 'data.LTC', 'data.VILLAGES', 'data.TEMP_SHELTERS',
  'data.LTC_RESIDENTIAL', 'data.LTC_DAYCARE', 'data.DONG_CENTERS', 'data.SENIOR_CENTERS',
  'terrain', 'roads', 'fireHistory', 'fleet', 'scenarios', 'activeScenarioId', 'intakeDocs', 'drills', 'demo.dongUser', 'openData'
]
const get = (o, path) => path.split('.').reduce((a, k) => (a == null ? a : a[k]), o)

// 설정 검사. 빈 배열은 허용하지 않는 칸(dongs, VILLAGES, TEMP_SHELTERS, scenarios)만 따로 본다.
// 마을, 대피소, 차량 소속 동이 이 지역 동 목록 안에 있는지와 코드 중복도 본다(지역 간 섞임 방지)
export function validateRegion(r) {
  const errors = []
  if (!r || typeof r !== 'object') return ['설정 없음']
  for (const p of REQUIRED) { const v = get(r, p); if (v == null || v === '') errors.push(`필수 항목 없음: ${p}`) }
  if (errors.length) return errors
  if (!/^\d{5}$/.test(String(r.codes.sgg))) errors.push('codes.sgg 는 시군구 코드 5자리')
  if (String(r.codes.sido) + String(r.codes.sigungu) !== String(r.codes.sgg)) errors.push('codes.sido + codes.sigungu 가 codes.sgg 와 다름')
  const b = r.map.bbox
  if (!Array.isArray(b) || b.length !== 4 || !(b[0] < b[2] && b[1] < b[3])) errors.push('map.bbox 는 [서, 남, 동, 북]')
  for (const k of ['dongs', 'data.VILLAGES', 'data.TEMP_SHELTERS', 'scenarios']) if (!get(r, k).length) errors.push(`비어 있음: ${k}`)
  const dongCodes = new Set(r.dongs.map((d) => d.code))
  if (dongCodes.size !== r.dongs.length) errors.push('동 코드 중복')
  for (const d of r.dongs) if (!/^[A-Z]{2}$/.test(d.code)) errors.push(`동 코드는 영문 대문자 2자: ${d.code}`)
  const vCodes = new Set()
  for (const v of r.data.VILLAGES) {
    if (!dongCodes.has(v.dongCode)) errors.push(`마을 ${v.code} 의 동 ${v.dongCode} 가 동 목록에 없음`)
    if (!String(v.code).startsWith(`${v.dongCode}-`)) errors.push(`마을 코드는 동 코드로 시작: ${v.code}`)
    if (vCodes.has(v.code)) errors.push(`마을 코드 중복: ${v.code}`)
    vCodes.add(v.code)
  }
  const sCodes = new Set(r.data.TEMP_SHELTERS.map((s) => s.code))
  for (const v of r.data.VILLAGES) for (const [s] of v.drive || []) if (!sCodes.has(s)) errors.push(`마을 ${v.code} 의 대피소 ${s} 가 대피소 목록에 없음`)
  for (const [k, list] of Object.entries(r.fleet)) if (Array.isArray(list)) for (const d of list) if (!dongCodes.has(d)) errors.push(`차량 ${k} 소속 동 ${d} 가 동 목록에 없음`)
  if (!dongCodes.has(r.demo.dongUser.dong)) errors.push('demo.dongUser.dong 이 동 목록에 없음')
  if (!r.scenarios.some((s) => s.id === r.activeScenarioId)) errors.push('activeScenarioId 가 시나리오 목록에 없음')
  return errors
}

// 지역 이름표 고르기. 순수 함수(시험용)
export function resolveRegionId({ search = '', stored = null, env = null } = {}) {
  const q = new URLSearchParams(search).get('region')
  for (const id of [q, stored, env]) if (id && REGIONS[id]) return id
  return DEFAULT_REGION_ID
}

function detect() {
  const env = (typeof process !== 'undefined' && process.env?.MIRI_REGION) || import.meta.env?.VITE_REGION || null
  if (typeof window === 'undefined') return resolveRegionId({ env })
  let stored = null
  try { stored = window.sessionStorage.getItem(STORE_KEY) } catch { /* 저장 불가 브라우저 */ }
  const id = resolveRegionId({ search: window.location?.search || '', stored, env })
  try { if (new URLSearchParams(window.location?.search || '').get('region')) window.sessionStorage.setItem(STORE_KEY, id) } catch { /* 메모리만 */ }
  return id
}

export const regionById = (id) => REGIONS[id] || null
export const REGION_ID = detect()
export const REGION = REGIONS[REGION_ID]
