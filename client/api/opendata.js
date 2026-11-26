// api/opendata.js Vercel 서버리스 함수. 공공데이터포털 연계(현재 지역 한정, 기본 동해시).
// GET ?kind=fire | shelters | ltc | ambulance | warning | wind | er | access | alerts | ems [&region=<지역 id>]
// 시군 이름과 코드는 지역 설정(client/src/regions/<지역>.js 의 openData)에서 읽는다. 값이 비어 있으면 그 항목은 503 REGION.
import { REGION, REGIONS } from '../src/regions/index.js'
// 모든 응답에 fetchedAt(조회 시각), asOf(자료 기준 시각, ISO), empty(응답 0건 여부)를 붙인다. 지연 판정은 client/src/lib/freshness.js
// DATA_GO_KR_KEY 는 서버 환경변수에만 두고 프론트에 노출하지 않는다. 없으면 503 NO_KEY.
const BASE = 'https://apis.data.go.kr'
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

const asList = (v) => (v == null || v === '' ? [] : Array.isArray(v) ? v : [v])

async function getJson(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}

// 산림청 국립산림과학원 산불위험예보정보. 동해시는 강원특별자치도 51170.
async function fire(key, R) {
  const j = await getJson(`${BASE}/1400377/forestPointV2/forestPointListSigunguSearchV2?serviceKey=${key}&_type=json&pageNo=1&numOfRows=300`)
  const it = asList(j.response?.body?.items?.item).find((x) => x.sigucode === R.fireSigucode || (x.sigun === R.fireSigun && x.upplocalcd === R.fireUpper))
  if (!it) throw new Error(`${R.fireSigun} 항목 없음`)
  return { source: '산림청 국립산림과학원 산불위험예보정보', analyzedAt: it.analdate, mean: it.meanavg, max: it.maxi, min: it.mini, std: it.std, grades: { d1: it.d1, d2: it.d2, d3: it.d3, d4: it.d4 } }
}

// 행정안전부 민방위대피시설 조회서비스
async function shelters(key, R) {
  const j = await getJson(`${BASE}/1741000/civil_defense_shelter_info/info?serviceKey=${key}&pageNo=1&numOfRows=300&type=json&cond%5BLCTN_WHOL_ADDR%3A%3ALIKE%5D=${encodeURIComponent(R.addressLike)}`)
  const items = asList(j.response?.body?.items?.item).filter((x) => x.OPER_STTS === '사용중')
  const list = items.map((x) => ({ name: x.FCLT_NM, address: x.ROAD_NM_WHOL_ADDR || x.LCTN_WHOL_ADDR, capacity: Number(x.MAX_ACTC_PERNE) || 0, kind: x.FCLT_SE, place: x.FCLTLOC_GRND_UDGD, lat: Number(x.LAT_EPSG4326) || null, lon: Number(x.LOT_EPST4326) || null }))
  return { source: '행정안전부 민방위대피시설', count: list.length, capacity: list.reduce((a, b) => a + b.capacity, 0), list }
}

// 국민건강보험공단 장기요양기관 검색. 강원 51, 동해 170
async function ltc(key, R) {
  const r = await fetch(`${BASE}/B550928/searchLtcInsttService02/getLtcInsttSeachList02?serviceKey=${key}&pageNo=1&numOfRows=300&siDoCd=${R.ltc.siDoCd}&siGunGuCd=${R.ltc.siGunGuCd}`, { signal: AbortSignal.timeout(9000) })
  const xml = await r.text()
  const list = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const o = Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map((x) => [x[1], x[2]]))
    return { name: o.adminNm, kindCode: o.adminPttnCd, id: o.longTermAdminSym }
  })
  return { source: '국민건강보험공단 장기요양기관 검색', count: list.length, list }
}

// 행정안전부 건강 응급환자이송업 조회서비스. 동해시 개방자치단체코드 4211000
async function ambulance(key, R) {
  const j = await getJson(`${BASE}/1741000/emergency_patient_transport/info?serviceKey=${key}&pageNo=1&numOfRows=100&type=json&cond%5BOPN_ATMY_GRP_CD%3A%3AEQ%5D=${R.ambulanceOrg}`)
  const list = asList(j.response?.body?.items?.item).filter((x) => x.SALS_STTS_NM?.startsWith('영업')).map((x) => ({ name: x.BPLC_NM, general: Number(x.ABLNC_GNRL) || 0, special: Number(x.ABLNC_SPCL) || 0, address: x.ROAD_NM_ADDR || x.LOTNO_ADDR }))
  return { source: '행정안전부 응급환자이송업', count: list.length, list }
}

// 한국 시간 기준 날짜와 시각 문자열
function kst(offsetMin = 0) {
  const d = new Date(Date.now() + 9 * 3600000 + offsetMin * 60000)
  const p = (n) => String(n).padStart(2, '0')
  return { ymd: `${d.getUTCFullYear()}${p(d.getUTCMonth() + 1)}${p(d.getUTCDate())}`, hh: d.getUTCHours(), mm: d.getUTCMinutes(), p }
}

// 기상청 기상특보 조회서비스 특보현황(최근 7일). 동해시가 들어간 특보 줄만 고른다
async function warning(key, R) {
  const j = await getJson(`${BASE}/1360000/WthrWrnInfoService/getPwnStatus?serviceKey=${key}&pageNo=1&numOfRows=10&dataType=JSON`)
  const it = asList(j.response?.body?.items?.item)[0]
  if (!it) return { source: '기상청 기상특보', issuedAt: null, active: [], text: '' }
  const text = String(it.t6 || '')
  const active = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^o\s/.test(l) && l.includes(R.warningWord))
    .map((l) => l.replace(/^o\s*/, '').split(':')[0].trim())
  return { source: '기상청 기상특보 조회서비스', issuedAt: String(it.tmFc || ''), active, related: active.filter((x) => /건조|강풍/.test(x)) }
}

// 위경도 → 기상청 격자(Lambert Conformal Conic, 기상청 공개 변환식)
function toGrid(lat, lon) {
  const RE = 6371.00877, GRID = 5.0, SLAT1 = 30.0, SLAT2 = 60.0, OLON = 126.0, OLAT = 38.0, XO = 43, YO = 136
  const DEG = Math.PI / 180
  const re = RE / GRID, s1 = SLAT1 * DEG, s2 = SLAT2 * DEG, olon = OLON * DEG, olat = OLAT * DEG
  let sn = Math.tan(Math.PI * 0.25 + s2 * 0.5) / Math.tan(Math.PI * 0.25 + s1 * 0.5)
  sn = Math.log(Math.cos(s1) / Math.cos(s2)) / Math.log(sn)
  let sf = Math.tan(Math.PI * 0.25 + s1 * 0.5); sf = (Math.pow(sf, sn) * Math.cos(s1)) / sn
  let ro = Math.tan(Math.PI * 0.25 + olat * 0.5); ro = (re * sf) / Math.pow(ro, sn)
  let ra = Math.tan(Math.PI * 0.25 + lat * DEG * 0.5); ra = (re * sf) / Math.pow(ra, sn)
  let theta = lon * DEG - olon
  if (theta > Math.PI) theta -= 2 * Math.PI
  if (theta < -Math.PI) theta += 2 * Math.PI
  theta *= sn
  return { nx: Math.floor(ra * Math.sin(theta) + XO + 0.5), ny: Math.floor(ro - ra * Math.cos(theta) + YO + 0.5) }
}

// 기상청 단기예보. 동해시청 부근 격자의 풍향, 풍속, 습도를 앞으로 12시간 받는다
async function wind(key, R) {
  const { nx, ny } = toGrid(R.weatherPoint[0], R.weatherPoint[1])
  const now = kst(-15)
  const bases = [2, 5, 8, 11, 14, 17, 20, 23]
  let baseH = [...bases].reverse().find((h) => now.hh >= h)
  let ymd = now.ymd
  if (baseH == null) { const y = kst(-15 - 24 * 60); ymd = y.ymd; baseH = 23 }
  const baseTime = `${String(baseH).padStart(2, '0')}00`
  const j = await getJson(`${BASE}/1360000/VilageFcstInfoService_2.0/getVilageFcst?serviceKey=${key}&pageNo=1&numOfRows=300&dataType=JSON&base_date=${ymd}&base_time=${baseTime}&nx=${nx}&ny=${ny}`)
  const items = asList(j.response?.body?.items?.item)
  const byTime = {}
  for (const it of items) {
    if (!['VEC', 'WSD', 'REH'].includes(it.category)) continue
    const k = `${it.fcstDate}${it.fcstTime}`
    ;(byTime[k] ||= { at: k })[it.category] = Number(it.fcstValue)
  }
  const hours = Object.values(byTime).sort((a, b) => a.at.localeCompare(b.at)).slice(0, 12)
    .map((h) => ({ at: h.at, fromDeg: h.VEC, speed: h.WSD, humidity: h.REH, toDeg: h.VEC == null ? null : (h.VEC + 180) % 360 }))
  return { source: '기상청 단기예보 조회서비스', base: `${ymd} ${baseTime}`, grid: { nx, ny }, hours }
}


// XML 응답의 item 목록을 객체 배열로 바꾼다
function xmlItems(xml, tag = 'item') {
  return [...String(xml).matchAll(new RegExp(`<${tag}>([\\s\\S]*?)</${tag}>`, 'g'))].map((m) =>
    Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map((x) => [x[1], x[2].trim()])))
}
async function getText(url) {
  const r = await fetch(url, { signal: AbortSignal.timeout(9000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  const t = await r.text()
  const code = t.match(/<resultCode>([^<]*)<\/resultCode>/)?.[1] || t.match(/<returnReasonCode>([^<]*)</)?.[1]
  if (code && !['00', '0000', '0'].includes(code)) throw new Error(`결과코드 ${code}`)
  return t
}

// 국립중앙의료원 전국 응급의료기관 정보 조회 서비스(15000563). 응급실 실시간 가용병상.
// 시도 이름이 바뀐 뒤 두 표기가 섞여 있어 강원특별자치도와 강원도를 차례로 묻는다.
async function er(key, R) {
  let items = []
  for (const stage1 of ['강원특별자치도', '강원도']) {
    const xml = await getText(`${BASE}/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire?serviceKey=${key}&STAGE1=${encodeURIComponent(stage1)}&STAGE2=${encodeURIComponent(R.erStage2)}&pageNo=1&numOfRows=20`)
    items = xmlItems(xml)
    if (items.length) break
  }
  const list = items.map((o) => ({ name: o.dutyName, erBeds: o.hvec == null || String(o.hvec).trim() === '' || Number.isNaN(Number(o.hvec)) ? null : Number(o.hvec), tel: o.dutyTel3 || null, updatedAt: o.hvidate || null }))
  return { source: '국립중앙의료원 전국 응급의료기관 정보 조회 서비스', area: `${R.province} ${R.erStage2}`, count: list.length, list, fetchedAt: new Date().toISOString() }
}

// 한국사회보장정보원 장애인편의시설 현황(15092317). 동해시 시설 목록과 좌표.
async function access(key, R) {
  // 전체 건수는 totalCount로 읽고, 목록은 1,000건씩 최대 5쪽까지 모은다. 시도 표기가 섞여 있어 강원도도 묻는다.
  let items = [], total = null
  for (const siDo of ['강원특별자치도', '강원도']) {
    items = []; total = null
    for (let page = 1; page <= 5; page++) {
      const xml = await getText(`${BASE}/B554287/DisabledPersonConvenientFacility/getDisConvFaclList?serviceKey=${key}&pageNo=${page}&numOfRows=1000&siDoNm=${encodeURIComponent(siDo)}&cggNm=${encodeURIComponent(R.accessCgg)}`)
      if (total == null) { const m = xml.match(/<totalCount>\s*(\d+)\s*<\/totalCount>/); total = m ? Number(m[1]) : null }
      let got = xmlItems(xml, 'servList')
      if (!got.length) got = xmlItems(xml)
      items.push(...got)
      if (got.length < 1000 || total == null || items.length >= total) break
    }
    if (items.length) break
  }
  if (!items.length) throw Object.assign(new Error(`${R.accessCgg} 장애인편의시설 조회 결과가 없습니다`), { code: 'EMPTY' })
  const list = items.map((o) => ({ id: o.wfcltId, name: o.faclNm, kind: o.faclTyCd || o.faclInfId || null, address: o.lcMnad || null, lat: Number(o.faclLat) || null, lon: Number(o.faclLng) || null }))
  return { source: '한국사회보장정보원 장애인편의시설 현황', area: `${R.province} ${R.accessCgg}`, count: total ?? list.length, listed: list.length, list, fetchedAt: new Date().toISOString() }
}

// 'YYYYMMDDHHmm(ss)', 'YYYY-MM-DD HH(:mm)', 'YYYY/MM/DD HH:mm:ss' 를 한국 시간 ISO 로 바꾼다. 못 읽으면 null
export function kstIso(v) {
  const s = String(v ?? '').trim()
  const m = s.match(/^(\d{4})[-/.]?(\d{2})[-/.]?(\d{2})[\sT]*(\d{2})?:?(\d{2})?:?(\d{2})?/)
  if (!m) return null
  const [, y, mo, d, h = '00', mi = '00', se = '00'] = m
  const t = Date.parse(`${y}-${mo}-${d}T${h}:${mi}:${se}+09:00`)
  return Number.isNaN(t) ? null : new Date(t).toISOString()
}

// 자료 기준 시각을 고른다. 실시간 자료는 기관 입력이나 발표 시각, 목록형 자료는 조회 시각.
// 실시간 자료에 기준 시각이 없으면 조회 시각으로 채우지 않고 비워 둔다(화면은 '기준 시각 없음'으로 표시).
// 응급실은 병원마다 입력 시각이 달라 가장 오래된 입력을 대표 시각으로 쓰고 병원별 시각도 함께 둔다.
const REALTIME = new Set(['fire', 'warning', 'wind', 'er', 'alerts'])
function stamp(kind, d) {
  const fetchedAt = d.fetchedAt || new Date().toISOString()
  let asOf = null, basis = '조회 시각', extra = {}
  if (kind === 'fire') { asOf = kstIso(d.analyzedAt); basis = '분석 시각' }
  else if (kind === 'warning') { asOf = kstIso(d.issuedAt); basis = '발표 시각' }
  else if (kind === 'wind') { asOf = kstIso(String(d.base || '').replace(' ', '')); basis = '예보 발표 시각' }
  else if (kind === 'er') {
    const list = (d.list || []).map((x) => ({ ...x, asOf: kstIso(x.updatedAt) }))
    const ts = list.map((x) => x.asOf).filter(Boolean).sort()
    asOf = ts[0] || null; basis = '가장 오래된 기관 입력 시각'
    extra = { list, latestAt: ts.at(-1) || null, missingAsOf: list.filter((x) => !x.asOf).length }
  } else if (kind === 'alerts') { asOf = d.list?.[0]?.at || null; basis = '최근 문자 발송 시각' }
  const empty = kind === 'ems' ? !d.total && !d.platform : kind === 'alerts' ? false : kind === 'warning' ? !d.issuedAt : kind === 'wind' ? !(d.hours || []).length : Array.isArray(d.list) ? d.list.length === 0 : false
  if (REALTIME.has(kind)) return { ...d, ...extra, fetchedAt, asOf, asOfBasis: basis, empty }
  return { ...d, ...extra, fetchedAt, asOf: fetchedAt, asOfBasis: '조회 시각', empty }
}

// 행정안전부 긴급재난문자(재난안전데이터공유플랫폼 dataSn 228, 오픈API DSSP-IF-00247).
// 출력 항목(공개 명세 기준, 승인 뒤 실제 응답으로 다시 확인): SN 일련번호, CRT_DT 생성일시, MSG_CN 내용,
// RCPTN_RGN_NM 수신지역, EMRG_STEP_NM 긴급단계, DST_SE_NM 재해구분. 위험도는 판단하지 않고 공식 단계를 그대로 쓴다.
export const ALERTS_APPLIED = '2026. 10. 20.'
// 응답 구조가 다르면 '문자 없음'으로 숨기지 않고 오류로 알린다. 최근 7일 범위를 파서에서도 확인하고,
// 발송 시각을 읽지 못한 문자는 맨 뒤에 두고 표시한다.
export function alertRows(j) {
  const cands = [j?.body, j?.body?.items?.item, j?.response?.body?.items?.item, j?.body?.item]
  for (const c of cands) { if (Array.isArray(c)) return c; if (c && typeof c === 'object' && (c.SN ?? c.sn) != null) return [c] }
  if (j?.body == null && j?.response == null) throw new Error('응답 구조 확인 필요(본문 없음)')
  if (j?.body && typeof j.body === 'object' && Object.keys(j.body).length === 0) return []
  throw new Error('응답 구조 확인 필요(행 배열 아님)')
}
export function parseAlerts(rows, region = '동해시', now = Date.now(), days = 7) {
  const seen = new Set(), out = []
  const list = asList(rows)
  let withId = 0
  const from = now - days * 24 * 3600 * 1000
  for (const r of list) {
    const id = String(r.SN ?? r.sn ?? r.MD101_SN ?? '')
    if (id) withId += 1
    const regionText = String(r.RCPTN_RGN_NM ?? r.rcptnRgnNm ?? r.RCV_AREA_NM ?? '')
    if (!id || seen.has(id) || !regionText.includes(region)) continue
    const at = kstIso(r.CRT_DT ?? r.crtDt ?? r.CREAT_DT)
    const t = at ? Date.parse(at) : NaN
    if (!Number.isNaN(t) && (t < from || t > now + 10 * 60 * 1000)) continue
    seen.add(id)
    out.push({ id, at, atUnknown: !at, region: regionText, kind: String(r.DST_SE_NM ?? r.dstSeNm ?? '') || null, step: String(r.EMRG_STEP_NM ?? r.emrgStepNm ?? '') || null, text: String(r.MSG_CN ?? r.msgCn ?? '') })
  }
  if (list.length && !withId) throw new Error('응답 항목 확인 필요(일련번호 없음)')
  return out.sort((a, b) => (a.at && b.at ? b.at.localeCompare(a.at) : a.at ? -1 : b.at ? 1 : 0))
}
async function alerts(_key, R = openDataOf(REGION)) {
  const key = process.env.SAFETYDATA_KEY
  const source = '행정안전부 긴급재난문자(재난안전데이터공유플랫폼)'
  if (!key) return { source, status: 'pending', appliedAt: ALERTS_APPLIED, list: [], fetchedAt: new Date().toISOString() }
  const ymd = kst(-7 * 24 * 60).ymd
  const rows = []
  // 한 쪽 100행씩 최대 5쪽. 기간 검색 인자(crtDt)의 해석은 승인 뒤 실제 응답으로 확인
  for (let page = 1; page <= 5; page++) {
    const j = await getJson(`https://www.safetydata.go.kr/V2/api/DSSP-IF-00247?serviceKey=${encodeURIComponent(key)}&returnType=json&pageNo=${page}&numOfRows=100&crtDt=${ymd}&rgnNm=${encodeURIComponent(R.alertRegion)}`)
    const code = j?.header?.resultCode
    if (code && !['00', '0', '0000'].includes(String(code))) throw new Error(`결과코드 ${code}`)
    const got = alertRows(j)
    rows.push(...got)
    if (got.length < 100) break
  }
  const list = parseAlerts(rows, R.alertRegion)
  return { source, status: 'ok', list: list.slice(0, 20), fetchedAt: new Date().toISOString() }
}

// 소방청 구급통계서비스(공공데이터포털 15099428). 관할 소방서의 한 해 이송환자를 사고 장소, 연령, 병력으로 모아 평시 구급 수요의 구성을 본다.
// 개인정보 없는 월별 집계 자료다. 자료는 연 단위로 늦게 올라와 올해 값이 비면 지난해, 그것도 비면 그 전 해를 쓴다.
const EMS = 'EmergencyStatisticsService'
export function emsSummary(place, age, hist) {
  const sum = (o) => Object.values(o).reduce((a, b) => a + b, 0)
  const total = sum(place)
  const share = (n) => (total ? Math.round((n / total) * 1000) / 10 : 0)
  const home = place['집'] || 0
  const a80 = age['80세 이상'] || 0
  const a70 = (age['70~79세'] || 0) + a80
  const top = Object.entries(hist).filter(([k]) => !['없음', '미상', '기타'].includes(k)).sort((x, y) => y[1] - x[1]).slice(0, 3).map(([name, count]) => ({ name, count }))
  return { total, home: { count: home, share: share(home) }, age80: { count: a80, share: share(a80) }, age70: { count: a70, share: share(a70) }, historyTop: top }
}
async function emsMonth(key, R, op, ym) {
  const q = new URLSearchParams({ serviceKey: key, pageNo: '1', numOfRows: '200', resultType: 'json', sidoHqOgidNm: R.ems.sido, rsacGutFsttOgidNm: R.ems.station, rcptYm: ym })
  let j
  try { j = await getJson(`${BASE}/1661000/${EMS}/${op}?${q.toString()}`) } catch (e) {
    if (!String(e.message).includes('429')) throw e
    await new Promise((r) => setTimeout(r, 1200))
    j = await getJson(`${BASE}/1661000/${EMS}/${op}?${q.toString()}`)
  }
  return asList(j?.body?.items)
}
async function emsYear(key, R, year) {
  const months = Array.from({ length: 12 }, (_, i) => `${year}${String(i + 1).padStart(2, '0')}`)
  const add = (acc, k, n) => { if (k != null) acc[k] = (acc[k] || 0) + (Number(n) || 0) }
  const place = {}, age = {}, hist = {}
  // 상류가 초당 호출 수를 막아(HTTP 429) 한 건씩 차례로 부른다
  const rows = []
  for (const m of months) {
    const a = await emsMonth(key, R, 'getTrasferPatientByPlaceStats', m)
    const b = await emsMonth(key, R, 'getTrasferPatientByAgeGroupStats', m)
    const c = await emsMonth(key, R, 'getTrasferPatientByCaseHistoryStats', m)
    rows.push([a, b, c])
  }
  for (const [p, a, h] of rows) { p.forEach((x) => add(place, x.ruptOccrPlcCdNm, x.trnfPcnt)); a.forEach((x) => add(age, x.ageScov, x.trnfPcnt)); h.forEach((x) => add(hist, x.mpwrCdNm, x.trnfPcnt)) }
  return { place, age, hist }
}
// 소방안전 빅데이터 플랫폼 구급현황 API(승인키 X-API-KEY, 환경변수 BIGDATA_119_KEY). 구급 출동 보고서를 건수로 집계해 같은 해 값을 함께 보인다.
const BD119 = 'https://www.bigdata-119.kr/fsdpApi/rest/v1/ems-incidents'
async function bdPost(key, R, year, extra) {
  const q = new URLSearchParams({ page: '1', size: '60', ctpvNm: R.ems.sidoShort, sggNm: R.ems.sigun, dclrYmdFrom: `${year}0101`, dclrYmdTo: `${year}1231`, ...extra })
  const r = await fetch(`${BD119}?${q.toString()}`, { method: 'POST', headers: { 'X-API-KEY': key, Accept: 'application/json' }, signal: AbortSignal.timeout(9000) })
  if (!r.ok) throw new Error(`HTTP ${r.status}`)
  return r.json()
}
export function platformSummary(total, seasons, symptoms) {
  const rows = (o) => asList(o?.items)
  const season = rows(seasons).filter((x) => x.seasnNm).map((x) => ({ name: x.seasnNm, count: Number(x.rowCount) || 0 }))
  const top = rows(symptoms).filter((x) => x.ptnSymSeNm && !['기타', '미상'].includes(x.ptnSymSeNm)).map((x) => ({ name: x.ptnSymSeNm, count: Number(x.rowCount) || 0 })).sort((a, b) => b.count - a.count).slice(0, 3)
  return { total: Number(total) || 0, seasons: season, symptomsTop: top }
}
// 119 신고접수 건별 기록에서 출동 지령부터 현장 도착까지의 평시 소요 시간을 읍면동별로 구한다.
// 센터 이름이 비어 있거나 지령과 도착이 같은 시각(0분)으로 적힌 건은 시간이 입력되지 않은 기록이라 뺀다.
const stampMs = (s) => { const m = String(s || '').match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})/); return m ? Date.UTC(+m[1], +m[2] - 1, +m[3], +m[4], +m[5], +m[6]) : null }
const pctl = (arr, q) => { const a = [...arr].sort((x, y) => x - y); return a.length ? a[Math.min(a.length - 1, Math.floor(a.length * q))] : null }
const r1 = (n) => (n == null ? null : Math.round(n * 10) / 10)
export function arrivalStats(rows, minN = 30) {
  const list = asList(rows)
  const usable = []
  for (const r of list) {
    if (!r.cntrNm) continue
    const a = stampMs(r.dsptDrtvDt), b = stampMs(r.grndsArvlDt)
    if (a == null || b == null) continue
    const m = (b - a) / 60000
    if (m > 0 && m < 120) usable.push({ emd: String(r.emdNm || '').trim(), m, hosp: stampMs(r.hsptlArvlDt) == null ? null : (stampMs(r.hsptlArvlDt) - b) / 60000 })
  }
  const by = {}
  usable.forEach((x) => { if (x.emd) (by[x.emd] ||= []).push(x.m) })
  const byEmd = Object.entries(by).filter(([, v]) => v.length >= minN).map(([name, v]) => ({ name, n: v.length, median: r1(pctl(v, 0.5)), p90: r1(pctl(v, 0.9)) })).sort((x, y) => y.median - x.median)
  const hosp = usable.map((x) => x.hosp).filter((h) => h != null && h > 0 && h < 180)
  return { totalRows: list.length, usedRows: usable.length, city: { median: r1(pctl(usable.map((x) => x.m), 0.5)), p90: r1(pctl(usable.map((x) => x.m), 0.9)) }, byEmd, hospital: hosp.length ? { n: hosp.length, median: r1(pctl(hosp, 0.5)), p90: r1(pctl(hosp, 0.9)) } : null }
}
export async function platformEms(R, year) {
  const key = process.env.BIGDATA_119_KEY
  if (!key || !R.ems.sidoShort) return null
  try {
    const tot = await bdPost(key, R, year, { includeTotal: 'true', size: '1' })
    const seasons = await bdPost(key, R, year, { groupBy: 'seasnNm', aggregation: 'count' })
    const symptoms = await bdPost(key, R, year, { groupBy: 'ptnSymSeNm', aggregation: 'count' })
    let arrival = null
    try {
      const q = new URLSearchParams({ page: '1', size: '10000', sggNm: R.ems.sigun, dclrYmdFrom: `${year}0101`, dclrYmdTo: `${year}1231` })
      const r = await fetch(`https://www.bigdata-119.kr/fsdpApi/rest/v1/call-receipts?${q.toString()}`, { method: 'POST', headers: { 'X-API-KEY': key, Accept: 'application/json' }, signal: AbortSignal.timeout(20000) })
      if (r.ok) arrival = arrivalStats((await r.json()).items)
    } catch { arrival = null }
    return { source: '소방안전 빅데이터 플랫폼 구급현황, 119 신고접수 API', year, ...platformSummary(tot.total, seasons, symptoms), arrival }
  } catch { return null }
}
const emsCache = new Map() // 지역 id -> { at, data }. 연 단위 자료라 하루 보관
async function ems(key, R) {
  const hit = emsCache.get(R.regionId)
  if (hit && Date.now() - hit.at < 24 * 3600000) return hit.data
  const data = await emsFetch(key, R)
  if (data.total || data.platform) emsCache.set(R.regionId, { at: Date.now(), data })
  return data
}
async function emsFetch(key, R) {
  if (!key) {
    // 공공데이터포털 인증키가 없는 서버(네이버 서버)에서는 플랫폼 승인키로 받은 값만 돌려준다
    const year = Number(kst().ymd.slice(0, 4)) - 1
    const platform = await platformEms(R, year)
    return { source: '소방안전 빅데이터 플랫폼', station: `${R.ems.sido} ${R.ems.station}`, year, total: 0, platform, list: platform ? [1] : [], fetchedAt: new Date().toISOString() }
  }
  const thisYear = Number(kst().ymd.slice(0, 4))
  for (const year of [thisYear - 1, thisYear - 2]) {
    const { place, age, hist } = await emsYear(key, R, year)
    const s = emsSummary(place, age, hist)
    if (s.total > 0) return { source: '소방청 구급통계서비스(공공데이터포털 15099428)', station: `${R.ems.sido} ${R.ems.station}`, year, ...s, platform: await platformEms(R, year), fetchedAt: new Date().toISOString() }
  }
  return { source: '소방청 구급통계서비스(공공데이터포털 15099428)', station: `${R.ems.sido} ${R.ems.station}`, year: null, total: 0, list: [], fetchedAt: new Date().toISOString() }
}

const KINDS = { fire, shelters, ltc, ambulance, warning, wind, er, access, alerts, ems }

// 지역 설정의 공공데이터 인자. 시도 이름(province)을 함께 넘긴다
export const openDataOf = (region) => ({ ...region.openData, province: region.province, regionId: region.id })
// 항목마다 꼭 있어야 하는 지역 인자. 비어 있으면 상류를 부르지 않고 503 REGION 으로 돌려준다(엉뚱한 시군 자료 방지)
const NEEDS = { fire: ['fireSigucode', 'fireSigun'], shelters: ['addressLike'], ltc: ['ltc'], ambulance: ['ambulanceOrg'], warning: ['warningWord'], wind: ['weatherPoint'], er: ['erStage2'], access: ['accessCgg'], alerts: ['alertRegion'], ems: ['ems'] }

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'METHOD', 'GET 만 허용')
  const kind = req.query?.kind
  const fn = KINDS[kind]
  if (!fn) return fail(res, 400, 'KIND', 'kind 는 fire, shelters, ltc, ambulance, warning, wind, er, access, alerts, ems 중 하나')
  const regionId = req.query?.region
  if (regionId && !REGIONS[regionId]) return fail(res, 400, 'REGION', '등록되지 않은 지역')
  const R = openDataOf(regionId ? REGIONS[regionId] : REGION)
  const missing = NEEDS[kind].filter((k) => R[k] == null || R[k] === '')
  if (missing.length) return fail(res, 503, 'REGION', `지역 설정에 공공데이터 인자 없음: ${missing.join(', ')}`)
  const key = process.env.DATA_GO_KR_KEY
  if (!key && kind !== 'alerts' && !(kind === 'ems' && process.env.BIGDATA_119_KEY)) return fail(res, 503, 'NO_KEY', '공공데이터포털 인증키 미설정')
  try {
    // 응답에 지역 이름표를 붙여 화면이 다른 시군 자료를 받았는지 가릴 수 있게 한다
    const data = { ...stamp(kind, await fn(key, R)), region: R.regionId }
    res.setHeader('Cache-Control', kind === 'ems' ? 's-maxage=86400, stale-while-revalidate=604800' : 's-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch (e) {
    return fail(res, 502, 'UPSTREAM', `공공데이터포털 응답 오류: ${String(e.message || '').slice(0, 80)}`)
  }
}
