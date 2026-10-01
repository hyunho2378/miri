// api/opendata.js Vercel 서버리스 함수. 공공데이터포털 연계(동해시 한정).
// GET ?kind=fire | shelters | ltc | ambulance
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

const KINDS = { fire, shelters, ltc, ambulance }

export default async function handler(req, res) {
  if (req.method !== 'GET') return fail(res, 405, 'METHOD', 'GET 만 허용')
  const key = process.env.DATA_GO_KR_KEY
  if (!key) return fail(res, 503, 'NO_KEY', '공공데이터포털 인증키 미설정')
  const fn = KINDS[req.query?.kind]
  if (!fn) return fail(res, 400, 'KIND', 'kind 는 fire, shelters, ltc, ambulance 중 하나')
  try {
    const data = await fn(key)
    res.setHeader('Cache-Control', 's-maxage=600, stale-while-revalidate=3600')
    return res.status(200).json(data)
  } catch (e) {
    return fail(res, 502, 'UPSTREAM', '공공데이터포털 응답 오류')
  }
}
