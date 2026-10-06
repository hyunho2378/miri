// api/opendata.js Vercel 서버리스 함수. 공공데이터포털 연계(동해시 한정).
// GET ?kind=fire | shelters | ltc | ambulance | warning | wind
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

const KINDS = { fire, shelters, ltc, ambulance, warning, wind }

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'METHOD', 'GET 만 허용')
  const key = process.env.DATA_GO_KR_KEY
  if (!key) return fail(res, 503, 'NO_KEY', '공공데이터포털 인증키 미설정')
  const fn = KINDS[req.query?.kind]
  if (!fn) return fail(res, 400, 'KIND', 'kind 는 fire, shelters, ltc, ambulance, warning, wind 중 하나')
  try {
    const data = await fn(key)
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch (e) {
    return fail(res, 502, 'UPSTREAM', '공공데이터포털 응답 오류')
  }
}
