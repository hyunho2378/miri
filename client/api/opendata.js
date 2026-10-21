// api/opendata.js Vercel 서버리스 함수. 공공데이터포털 연계(동해시 한정).
// GET ?kind=fire | shelters | ltc | ambulance | warning | wind | er | access | alerts
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
async function fire(key) {
  const j = await getJson(`${BASE}/1400377/forestPointV2/forestPointListSigunguSearchV2?serviceKey=${key}&_type=json&pageNo=1&numOfRows=300`)
  const it = asList(j.response?.body?.items?.item).find((x) => x.sigucode === 51170 || (x.sigun === '동해시' && x.upplocalcd === 51))
  if (!it) throw new Error('동해시 항목 없음')
  return { source: '산림청 국립산림과학원 산불위험예보정보', analyzedAt: it.analdate, mean: it.meanavg, max: it.maxi, min: it.mini, std: it.std, grades: { d1: it.d1, d2: it.d2, d3: it.d3, d4: it.d4 } }
}

// 행정안전부 민방위대피시설 조회서비스
async function shelters(key) {
  const j = await getJson(`${BASE}/1741000/civil_defense_shelter_info/info?serviceKey=${key}&pageNo=1&numOfRows=300&type=json&cond%5BLCTN_WHOL_ADDR%3A%3ALIKE%5D=${encodeURIComponent('동해시')}`)
  const items = asList(j.response?.body?.items?.item).filter((x) => x.OPER_STTS === '사용중')
  const list = items.map((x) => ({ name: x.FCLT_NM, address: x.ROAD_NM_WHOL_ADDR || x.LCTN_WHOL_ADDR, capacity: Number(x.MAX_ACTC_PERNE) || 0, kind: x.FCLT_SE, place: x.FCLTLOC_GRND_UDGD, lat: Number(x.LAT_EPSG4326) || null, lon: Number(x.LOT_EPST4326) || null }))
  return { source: '행정안전부 민방위대피시설', count: list.length, capacity: list.reduce((a, b) => a + b.capacity, 0), list }
}

// 국민건강보험공단 장기요양기관 검색. 강원 51, 동해 170
async function ltc(key) {
  const r = await fetch(`${BASE}/B550928/searchLtcInsttService02/getLtcInsttSeachList02?serviceKey=${key}&pageNo=1&numOfRows=300&siDoCd=51&siGunGuCd=170`, { signal: AbortSignal.timeout(9000) })
  const xml = await r.text()
  const list = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)].map((m) => {
    const o = Object.fromEntries([...m[1].matchAll(/<(\w+)>([^<]*)<\/\1>/g)].map((x) => [x[1], x[2]]))
    return { name: o.adminNm, kindCode: o.adminPttnCd, id: o.longTermAdminSym }
  })
  return { source: '국민건강보험공단 장기요양기관 검색', count: list.length, list }
}

// 행정안전부 건강 응급환자이송업 조회서비스. 동해시 개방자치단체코드 4211000
async function ambulance(key) {
  const j = await getJson(`${BASE}/1741000/emergency_patient_transport/info?serviceKey=${key}&pageNo=1&numOfRows=100&type=json&cond%5BOPN_ATMY_GRP_CD%3A%3AEQ%5D=4211000`)
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
async function warning(key) {
  const j = await getJson(`${BASE}/1360000/WthrWrnInfoService/getPwnStatus?serviceKey=${key}&pageNo=1&numOfRows=10&dataType=JSON`)
  const it = asList(j.response?.body?.items?.item)[0]
  if (!it) return { source: '기상청 기상특보', issuedAt: null, active: [], text: '' }
  const text = String(it.t6 || '')
  const active = text.split(/\r?\n/).map((l) => l.trim()).filter((l) => /^o\s/.test(l) && l.includes('동해'))
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
async function wind(key) {
  const { nx, ny } = toGrid(37.5247, 129.1143)
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
async function er(key) {
  let items = []
  for (const stage1 of ['강원특별자치도', '강원도']) {
    const xml = await getText(`${BASE}/B552657/ErmctInfoInqireService/getEmrrmRltmUsefulSckbdInfoInqire?serviceKey=${key}&STAGE1=${encodeURIComponent(stage1)}&STAGE2=${encodeURIComponent('동해시')}&pageNo=1&numOfRows=20`)
    items = xmlItems(xml)
    if (items.length) break
  }
  const list = items.map((o) => ({ name: o.dutyName, erBeds: o.hvec == null || String(o.hvec).trim() === '' || Number.isNaN(Number(o.hvec)) ? null : Number(o.hvec), tel: o.dutyTel3 || null, updatedAt: o.hvidate || null }))
  return { source: '국립중앙의료원 전국 응급의료기관 정보 조회 서비스', area: '강원특별자치도 동해시', count: list.length, list, fetchedAt: new Date().toISOString() }
}

// 한국사회보장정보원 장애인편의시설 현황(15092317). 동해시 시설 목록과 좌표.
async function access(key) {
  // 전체 건수는 totalCount로 읽고, 목록은 1,000건씩 최대 5쪽까지 모은다. 시도 표기가 섞여 있어 강원도도 묻는다.
  let items = [], total = null
  for (const siDo of ['강원특별자치도', '강원도']) {
    items = []; total = null
    for (let page = 1; page <= 5; page++) {
      const xml = await getText(`${BASE}/B554287/DisabledPersonConvenientFacility/getDisConvFaclList?serviceKey=${key}&pageNo=${page}&numOfRows=1000&siDoNm=${encodeURIComponent(siDo)}&cggNm=${encodeURIComponent('동해시')}`)
      if (total == null) { const m = xml.match(/<totalCount>\s*(\d+)\s*<\/totalCount>/); total = m ? Number(m[1]) : null }
      let got = xmlItems(xml, 'servList')
      if (!got.length) got = xmlItems(xml)
      items.push(...got)
      if (got.length < 1000 || total == null || items.length >= total) break
    }
    if (items.length) break
  }
  if (!items.length) throw Object.assign(new Error('동해시 장애인편의시설 조회 결과가 없습니다'), { code: 'EMPTY' })
  const list = items.map((o) => ({ id: o.wfcltId, name: o.faclNm, kind: o.faclTyCd || o.faclInfId || null, address: o.lcMnad || null, lat: Number(o.faclLat) || null, lon: Number(o.faclLng) || null }))
  return { source: '한국사회보장정보원 장애인편의시설 현황', area: '강원특별자치도 동해시', count: total ?? list.length, listed: list.length, list, fetchedAt: new Date().toISOString() }
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

// 자료 기준 시각을 고른다. 실시간 자료는 기관 입력이나 발표 시각, 목록형 자료는 조회 시각
function stamp(kind, d) {
  const fetchedAt = d.fetchedAt || new Date().toISOString()
  let asOf = null, basis = '조회 시각'
  if (kind === 'fire') { asOf = kstIso(d.analyzedAt); basis = '분석 시각' }
  else if (kind === 'warning') { asOf = kstIso(d.issuedAt); basis = '발표 시각' }
  else if (kind === 'wind') { asOf = kstIso(String(d.base || '').replace(' ', '')); basis = '예보 발표 시각' }
  else if (kind === 'er') { const ts = (d.list || []).map((x) => kstIso(x.updatedAt)).filter(Boolean).sort(); asOf = ts.at(-1) || null; basis = '기관 입력 시각' }
  else if (kind === 'alerts') { asOf = d.list?.[0]?.at || null; basis = '최근 문자 발송 시각' }
  const empty = kind === 'alerts' ? false : kind === 'warning' ? !d.issuedAt : kind === 'wind' ? !(d.hours || []).length : Array.isArray(d.list) ? d.list.length === 0 : false
  return { ...d, fetchedAt, asOf: asOf || (kind === 'alerts' ? null : fetchedAt), asOfBasis: asOf ? basis : (kind === 'alerts' ? basis : '조회 시각'), empty }
}

// 행정안전부 긴급재난문자(재난안전데이터공유플랫폼 dataSn 228, 오픈API DSSP-IF-00247).
// 출력 항목(공개 명세 기준, 승인 뒤 실제 응답으로 다시 확인): SN 일련번호, CRT_DT 생성일시, MSG_CN 내용,
// RCPTN_RGN_NM 수신지역, EMRG_STEP_NM 긴급단계, DST_SE_NM 재해구분. 위험도는 판단하지 않고 공식 단계를 그대로 쓴다.
export const ALERTS_APPLIED = '2026. 10. 20.'
export function parseAlerts(rows, region = '동해시') {
  const seen = new Set(), out = []
  for (const r of asList(rows)) {
    const id = String(r.SN ?? r.sn ?? r.MD101_SN ?? '')
    const regionText = String(r.RCPTN_RGN_NM ?? r.rcptnRgnNm ?? r.RCV_AREA_NM ?? '')
    if (!id || seen.has(id) || !regionText.includes(region)) continue
    seen.add(id)
    out.push({ id, at: kstIso(r.CRT_DT ?? r.crtDt ?? r.CREAT_DT), region: regionText, kind: String(r.DST_SE_NM ?? r.dstSeNm ?? '') || null, step: String(r.EMRG_STEP_NM ?? r.emrgStepNm ?? '') || null, text: String(r.MSG_CN ?? r.msgCn ?? '') })
  }
  return out.sort((a, b) => String(b.at).localeCompare(String(a.at)))
}
async function alerts() {
  const key = process.env.SAFETYDATA_KEY
  const source = '행정안전부 긴급재난문자(재난안전데이터공유플랫폼)'
  if (!key) return { source, status: 'pending', appliedAt: ALERTS_APPLIED, list: [], fetchedAt: new Date().toISOString() }
  const ymd = kst(-7 * 24 * 60).ymd
  const j = await getJson(`https://www.safetydata.go.kr/V2/api/DSSP-IF-00247?serviceKey=${encodeURIComponent(key)}&returnType=json&pageNo=1&numOfRows=100&crtDt=${ymd}&rgnNm=${encodeURIComponent('동해시')}`)
  const code = j?.header?.resultCode
  if (code && !['00', '0', '0000'].includes(String(code))) throw new Error(`결과코드 ${code}`)
  const list = parseAlerts(j?.body ?? j?.response?.body?.items?.item ?? [])
  return { source, status: 'ok', list: list.slice(0, 20), fetchedAt: new Date().toISOString() }
}

const KINDS = { fire, shelters, ltc, ambulance, warning, wind, er, access, alerts }

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'METHOD', 'GET 만 허용')
  const kind = req.query?.kind
  const fn = KINDS[kind]
  if (!fn) return fail(res, 400, 'KIND', 'kind 는 fire, shelters, ltc, ambulance, warning, wind, er, access, alerts 중 하나')
  const key = process.env.DATA_GO_KR_KEY
  if (!key && kind !== 'alerts') return fail(res, 503, 'NO_KEY', '공공데이터포털 인증키 미설정')
  try {
    const data = stamp(kind, await fn(key))
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch (e) {
    return fail(res, 502, 'UPSTREAM', `공공데이터포털 응답 오류: ${String(e.message || '').slice(0, 80)}`)
  }
}
