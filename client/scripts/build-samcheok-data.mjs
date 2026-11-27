// build-samcheok-data.mjs 삼척시 실제 공개 자료를 앱 데이터 모듈(src/mock/samcheokData.js)로 바꾼다.
// 실행: node scripts/build-samcheok-data.mjs   (client 폴더에서)
// 원자료는 scripts/data-raw/samcheok 에 둔다(README.md 에 파일마다 출처, 받은 주소, 기준 시점).
// 동해시(build-donghae-data.mjs)와 같은 산출 순서를 쓴다. 개인 단위 자료는 쓰지 않는다.
//
// 산출 순서
//   1) 재가 장기요양 수급자 = 2025 급여이용수급자 - 노인요양시설 - 노인요양공동생활가정(KOSIS DT_35006_N030 삼척시).
//      등급별 값도 같은 방식으로 빼고 합계에 맞춰 최대 잔여 방식으로 나눈다.
//   2) 행정동 배분: 행정동별 75세 이상 주민등록인구 비율(행정안전부 2026년 9월). 원덕읍임원출장소 인구는 원덕읍에 더한다
//      (행정동 경계 자료에 출장소 경계가 따로 없음).
//   3) 마을(법정동, 법정리) 배분: 건축HUB 법정동 건축물 통계를 받지 못해 동해시 스크립트의 대체 규칙인 경로당 수 비례
//      (경로당 없는 마을은 0.5개로 셈)를 그대로 쓴다. 행정동 안 마을이 하나면 그 마을이 전부 받는다.
//   4) 집결지: 같은 마을 경로당 분포의 중심에 가장 가까운 경로당. 경로당이 없는 마을은 OpenStreetMap 마을 기준점.
//   5) 이송 등급 대응(가정)은 동해시와 같다(1등급 침상, 2등급 휠체어, 3과 4등급 부축, 5등급과 인지지원등급 도보).
//   6) 대피소는 국민재난안전포털 이재민 임시주거시설 전부, 주행 시간은 OSRM 공개 서버 도로 주행 시간(가까운 순).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DONG_GEO } from '../src/regions/samcheok.geo.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const RAW = path.join(here, 'data-raw', 'samcheok')
const OUT = path.join(here, '..', 'src', 'mock', 'samcheokData.js')
const FIRE_OUT = path.join(here, '..', 'src', 'data', 'forestFireHistorySamcheok.js')
const read = (f) => JSON.parse(fs.readFileSync(path.join(RAW, f), 'utf8'))
const exists = (f) => fs.existsSync(path.join(RAW, f))

const pop = read('pop_51230.json')
const judged = read('ltc_grades_51230.json')
const users = read('ltc_users_51230.json')
const acmd = read('acmd_51230.json')
const places = read('osm_places_51230.json').rows
const ltcRaw = read('ltc_facilities_51230.json')
const ltcPts = read('ltc_points_51230.json').rows
const centersRaw = read('centers_51230.json')

const clean = (t) => String(t ?? '').replaceAll('시·군·구', '시군구').replaceAll('·', ', ')
const dotDate = (iso) => { const m = String(iso || '').match(/(\d{4})-(\d{2})-(\d{2})/); return m ? `${m[1]}. ${Number(m[2])}. ${Number(m[3])}.` : iso }
const r1 = (x) => Math.round(x * 10) / 10
const r5 = (x) => Math.round(x * 1e5) / 1e5
const M_PER_DEG_LAT = 111320
function distM([lon1, lat1], [lon2, lat2]) {
  const lat = ((lat1 + lat2) / 2) * (Math.PI / 180)
  return Math.hypot((lon2 - lon1) * M_PER_DEG_LAT * Math.cos(lat), (lat2 - lat1) * M_PER_DEG_LAT)
}
// 최대 잔여 방식 정수 배분(동해시 스크립트와 같은 함수)
function apportion(total, weights) {
  const sum = weights.reduce((s, w) => s + w, 0) || 1
  const raw = weights.map((w) => (total * w) / sum)
  const out = raw.map(Math.floor)
  let left = total - out.reduce((s, x) => s + x, 0)
  const order = raw.map((x, i) => [x - Math.floor(x), i]).sort((a, b) => b[0] - a[0])
  for (let k = 0; left > 0; k += 1, left -= 1) out[order[k % order.length][1]] += 1
  return out
}
function parseCsv(text) {
  const rows = []
  for (const line of text.split(/\r?\n/)) {
    if (!line.trim()) continue
    const cells = []
    let cur = ''
    let q = false
    for (const ch of line) {
      if (ch === '"') q = !q
      else if (ch === ',' && !q) { cells.push(cur); cur = '' } else cur += ch
    }
    cells.push(cur)
    rows.push(cells)
  }
  const [head, ...body] = rows
  return body.map((c) => Object.fromEntries(head.map((h, i) => [h.trim(), (c[i] || '').trim()])))
}
// 점이 행정동 경계 안에 있는지(짝홀 규칙)
function inPoly(pt, poly) {
  let c = false
  for (const ring of poly) {
    for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
      const [xi, yi] = ring[i]; const [xj, yj] = ring[j]
      if ((yi > pt[1]) !== (yj > pt[1]) && pt[0] < ((xj - xi) * (pt[1] - yi)) / (yj - yi) + xi) c = !c
    }
  }
  return c
}
const dongAt = (pt) => DONG_GEO.find((d) => d.coordinates.some((poly) => inPoly(pt, poly)))?.code || null

// 행정동 순서와 이름(행정동 경계 자료)
const DONG_ORDER = ['GY', 'NY', 'SN', 'JR', 'DG', 'WD', 'GD', 'HJ', 'NG', 'MR', 'GG', 'SG']
const DONG_NAME = Object.fromEntries(DONG_GEO.map((d) => [d.code, d.name]))
const ADM_TO_DONG = Object.fromEntries(DONG_GEO.map((d) => [d.admCd, d.code]))
// 동 지역 법정동의 행정동. 삼척시청 행정구역 표(법정동 수 남양 5, 성내 15, 교동 5, 정라 2)와
// OpenStreetMap 법정동 기준점의 행정동 경계 포함 여부로 정했다. 읍중동 기준점은 남양동 경계에 걸려 표의 수에 맞춰 성내동에 둔다
const URBAN = {
  NY: ['남양동', '사직동', '오분동', '적노동', '조비동'],
  SN: ['성내동', '성북동', '읍상동', '읍중동', '당저동', '등봉동', '자원동', '평전동', '마평동', '도경동', '오사동', '건지동', '원당동', '성남동', '근산동'],
  GY: ['교동', '갈천동', '증산동', '우지동', '마달동'],
  JR: ['정상동', '정하동']
}

// 0) 법정동과 법정리 목록(국토교통부 전국 법정동, 2026. 7. 29. 파일)
const bjd = parseCsv(fs.readFileSync(path.join(RAW, 'bjd_51230.csv'), 'utf8'))
  .filter((r) => r['읍면동명'] && (r['리명'] || !/[읍면]$/.test(r['읍면동명'])))
  .map((r) => {
    const code = r['법정동코드']
    const name = r['리명'] || r['읍면동명']
    const dong = r['리명'] ? ADM_TO_DONG[`${code.slice(0, 8)}00`] : Object.keys(URBAN).find((k) => URBAN[k].includes(name))
    if (!dong) throw new Error(`행정동 없음: ${name}`)
    return { code, name, emd: r['읍면동명'], dong }
  })

// 1) 재가 장기요양 수급자 추정(2025)
const GR = ['1등급', '2등급', '3등급', '4등급', '5등급', '인지지원등급']
const facOf = (g) => (users['노인요양시설'][g] || 0) + (users['노인요양공동생활가정'][g] || 0)
const homeRaw = Object.fromEntries(GR.map((g) => [g, Math.max(0, users.total[g] - facOf(g))]))
const homeTotal = users.total['계'] - users['노인요양시설']['계'] - users['노인요양공동생활가정']['계']
const homeByGradeArr = apportion(homeTotal, GR.map((g) => homeRaw[g]))
const homeByGrade = Object.fromEntries(GR.map((g, i) => [g, homeByGradeArr[i]]))
const TRANSPORT_OF = { '1등급': 'bed', '2등급': 'wheelchair', '3등급': 'assist', '4등급': 'assist', '5등급': 'walk', 인지지원등급: 'walk' }
const homeByTransport = { bed: 0, wheelchair: 0, assist: 0, walk: 0 }
for (const g of GR) homeByTransport[TRANSPORT_OF[g]] += homeByGrade[g]

// 2) 행정동 배분: 75세 이상 인구 비율. 원덕읍임원출장소는 원덕읍에 합친다
const popOf = (name) => {
  const d = pop.dongs[name]
  if (name !== '원덕읍') return d
  const o = pop.dongs['원덕읍임원출장소']
  return { ...d, total: d.total + o.total, age65: d.age65 + o.age65, age75: d.age75 + o.age75, age85: d.age85 + o.age85, merged: '원덕읍임원출장소' }
}
const dongStats = Object.fromEntries(DONG_ORDER.map((c) => {
  const d = popOf(DONG_NAME[c])
  const admCode = DONG_GEO.find((g) => g.code === c).admCd
  return [c, { name: DONG_NAME[c], admCode, total: d.total, age65: d.age65, age75: d.age75, age85: d.age85, agingRate: r1((d.age65 / d.total) * 100), ...(d.merged ? { merged: d.merged } : {}) }]
}))
const dongTargets = apportion(homeTotal, DONG_ORDER.map((c) => dongStats[c].age75))
DONG_ORDER.forEach((c, i) => { dongStats[c].targets = dongTargets[i] })

// 마을 기준점(OpenStreetMap place 노드, geoPlaces.js 에서 삼척시 경계 안만 고른 표)
const placeOf = (b) => places.find((p) => p.k === 'p' && p.name === b.name && (p.dong === b.dong || URBAN[b.dong]?.includes(b.name)))

// 경로당(삼척시 마을회관및경로당 표준데이터). 지번주소가 비어 있어 시설명의 마을 이름으로 마을을 찾고,
// 이름으로 못 찾으면 같은 행정동 안 가장 가까운 마을 기준점의 마을로 둔다
const seniorRows = parseCsv(fs.readFileSync(path.join(RAW, 'kyungro_51230.csv'), 'utf8'))
const seniorDate = seniorRows[0]?.['데이터기준일자']
const nameKeys = (facility) => {
  const base = facility.replace(/\s*(경로당|마을회관)\s*$/, '').replace(/\s+/g, '')
  const parts = [base.replace(/\(.*\)/, ''), ...(base.match(/\(([^)]*)\)/)?.[1] || '').split(/[,\s]/)].filter(Boolean)
  const keys = []
  for (const p of parts) {
    const stem = p.replace(/\d+(리|통)$/, '').replace(/(리|동)$/, '').replace(/\d+$/, '')
    if (stem) keys.push(`${stem}리`, `${stem}동`, stem)
  }
  return keys
}
const SENIOR = []
for (const r of seniorRows) {
  const lngLat = [r5(Number(r['경도'])), r5(Number(r['위도']))]
  if (!Number.isFinite(lngLat[0]) || lngLat[0] <= 0) continue
  const dong = dongAt(lngLat)
  if (!dong) continue
  const pool = bjd.filter((b) => b.dong === dong)
  let hit = null
  let how = 'name'
  for (const k of nameKeys(r['시설명'])) { hit = pool.find((b) => b.name === k); if (hit) break }
  if (!hit) {
    how = 'nearest'
    let best = Infinity
    for (const b of pool) { const p = placeOf(b); if (!p) continue; const d = distM(lngLat, [p.lon, p.lat]); if (d < best) { best = d; hit = b } }
  }
  SENIOR.push({
    name: r['시설명'].replace(/\s+/g, ' ').trim(), road: r['소재지도로명주소'].replace('강원특별자치도 ', ''), bdong: hit?.name || null, dong, match: how,
    tel: r['전화번호'] || null, lngLat, areaM2: Number(r['건물면적']) || null
  })
}

// 3) 마을 배분: 경로당 수 비례(건축물 통계 미수신, 동해시 스크립트의 대체 규칙)
const villages = []
const skipped = []
for (const dong of DONG_ORDER) {
  const list = bjd.filter((b) => b.dong === dong).filter((b) => {
    const ok = placeOf(b) || SENIOR.some((s) => s.dong === dong && s.bdong === b.name)
    if (!ok) skipped.push(b.name)
    return ok
  })
  const seniorCount = (b) => SENIOR.filter((s) => s.dong === dong && s.bdong === b.name).length
  const single = list.length === 1
  const weights = single ? [1] : list.map((b) => Math.max(0.5, seniorCount(b)))
  const basis = single ? '행정동 전체' : '경로당 수 비례(건축물 통계 미수신)'
  const counts = apportion(dongStats[dong].targets, weights)
  list.forEach((b, i) => {
    const code = `${dong}-${String(i + 1).padStart(2, '0')}`
    const pool = SENIOR.filter((s) => s.dong === dong && s.bdong === b.name)
    const p = placeOf(b)
    const mid = pool.length ? [pool.reduce((t, s) => t + s.lngLat[0], 0) / pool.length, pool.reduce((t, s) => t + s.lngLat[1], 0) / pool.length] : [p.lon, p.lat]
    const pickup = pool.length ? pool.reduce((best, s) => (distM(s.lngLat, mid) < distM(best.lngLat, mid) ? s : best)) : null
    const center = p ? [r5(p.lon), r5(p.lat)] : [r5(mid[0]), r5(mid[1])]
    villages.push({
      code, dongCode: dong, name: b.name, bdongCode: b.code,
      lngLat: pickup ? pickup.lngLat : center, center,
      centerBasis: p ? 'OpenStreetMap 마을 기준점' : '경로당 위치 평균',
      pickup: pickup ? { name: pickup.name, road: pickup.road, tel: pickup.tel } : null,
      targets: counts[i], weight: r1(weights[i]), weightBasis: basis, housing: null, seniorCenters: pool.length
    })
  })
}

// 4) 임시주거시설(국민재난안전포털 안전지도, 이재민 임시주거시설과 지진겸용 임시주거시설 표)
const quakeBy = new Map(acmd['지진겸용임시주거시설'].map((q) => [q.vtAcmdfcltyNm.trim(), q]))
const bjdName = (code) => bjd.find((b) => b.code === code)?.name || null
const shelters = acmd['이재민임시주거시설'].map((s, i) => {
  const name = s.title.trim()
  const q = quakeBy.get(name)
  const lngLat = [r5(Number(s.lo)), r5(Number(s.la))]
  const dong = dongAt(lngLat)
  let bd = q ? bjdName(q.bdongCd) : null
  if (!bd) {
    let best = Infinity
    for (const v of villages.filter((x) => x.dongCode === dong)) { const d = distM(lngLat, v.center); if (d < best) { best = d; bd = v.name } }
  }
  // 주소: 지진겸용 표에만 지번이 있다. 읍면 마을은 읍면 이름을 앞에 붙이고, 이재민 표에만 있는 시설은 마을까지만 적는다
  const emd = /[읍면]$/.test(DONG_NAME[dong]) ? `${DONG_NAME[dong]} ` : ''
  const address = q && q.dtlAdres ? `삼척시 ${emd}${bd} ${String(q.dtlAdres).replace(/-0$/, '')}` : `삼척시 ${emd}${bd} (번지 미제공)`
  return {
    code: `SC-${String(i + 1).padStart(2, '0')}`, name, kind: clean(s.acmdfcltySeNm), address,
    capacity: s.vtAcmdPsblNmpr, areaM2: s.fcltyAr, quake: q ? q.erthqkShuntAt === 'Y' : false, tel: s.telno || null,
    lngLat, coordApprox: false, bdong: bd, dong,
    villageCode: villages.find((v) => v.name === bd && v.dongCode === dong)?.code || null
  }
})

// 5) 도로 주행 시간(OSRM 공개 서버). 마을 집결지에서 임시주거시설 전부까지, 가까운 순.
//    공개 서버는 한 번에 좌표 100개까지라 마을을 나눠 묻는다. 좌표가 같으면 저장해 둔 결과를 다시 쓴다
const OSRM_FILE = 'osrm_village_shelter_51230.json'
const key = JSON.stringify([villages.map((v) => [v.code, v.lngLat]), shelters.map((s) => s.lngLat)])
let osrm = exists(OSRM_FILE) ? read(OSRM_FILE) : null
if (!osrm || osrm.key !== key) {
  const CHUNK = 60
  const durations = []
  const distances = []
  try {
    for (let a = 0; a < villages.length; a += CHUNK) {
      const vs = villages.slice(a, a + CHUNK)
      const coords = [...vs.map((v) => v.lngLat), ...shelters.map((s) => s.lngLat)].map(([x, y]) => `${x},${y}`).join(';')
      const url = `https://router.project-osrm.org/table/v1/driving/${coords}?sources=${vs.map((_, i) => i).join(';')}&destinations=${shelters.map((_, j) => vs.length + j).join(';')}&annotations=duration,distance`
      const d = await (await fetch(url, { headers: { 'User-Agent': 'miri-data-build/1.0' } })).json()
      if (d.code !== 'Ok') throw new Error(`OSRM ${d.code}`)
      durations.push(...d.durations); distances.push(...d.distances)
    }
  } catch (e) {
    fs.writeFileSync(path.join(RAW, 'osrm_request_51230.json'), JSON.stringify({ key, villages: villages.map((v) => [v.code, v.lngLat]), shelters: shelters.map((s) => s.lngLat) }))
    throw new Error(`OSRM 조회 실패(${e.message}). osrm_request_51230.json 의 좌표로 브라우저에서 받아 ${OSRM_FILE} 로 저장한 뒤 다시 실행`)
  }
  osrm = { key, source: 'router.project-osrm.org table, driving, OpenStreetMap', fetchedAt: new Date().toISOString(), villages: villages.map((v) => v.code), durations, distances }
  fs.writeFileSync(path.join(RAW, OSRM_FILE), JSON.stringify(osrm))
}
for (const [i, v] of villages.entries()) {
  if (osrm.villages[i] !== v.code) throw new Error(`OSRM 순서 불일치 ${osrm.villages[i]} ${v.code}`)
  v.drive = osrm.durations[i].map((sec, j) => [shelters[j].code, r1(sec / 60), r1(osrm.distances[i][j] / 1000)]).sort((a, b) => a[1] - b[1])
}

// 6) 장기요양기관(국민건강보험공단 장기요양기관 찾기 엑셀과 지도 표식 좌표)
const ptOf = (name, addr) => ltcPts.find((p) => p.name === name && p.addr.replace(/\s+/g, '') === addr.replace(/\s+/g, '')) || ltcPts.find((p) => p.name === name)
const bdongOf = (addr) => (addr.match(/\(([^,)]+?)(?:,[^)]*)?\)\s*$/) || [])[1] || null
const facRow = (r) => {
  const p = ptOf(r.name, r.addr)
  if (!p) throw new Error(`좌표 없음 ${r.name}`)
  const addr = r.addr.replace('강원특별자치도 삼척시 ', '').replace(/\s+/g, ' ').trim()
  return { id: p.sym, name: r.name, kind: r.kind, addr, bdong: bdongOf(r.addr), tel: r.tel, capacity: r.capacity, current: r.current, lngLat: [p.lon, p.lat] }
}
const RESIDENTIAL = ltcRaw.rows.filter((r) => /^노인요양시설|노인요양공동생활가정/.test(r.kind)).map(facRow)
const DAYCARE = ltcRaw.rows.filter((r) => r.kind === '주야간보호').map(facRow)

// 7) 행정복지센터(삼척시청 누리집 행정기관주소 읍면동 표). 좌표는 OpenStreetMap 시설 지점, 없으면 읍면동 기준점(근사)
const CENTERS = centersRaw.rows.map((c) => {
  const th = places.find((p) => p.k === 'i' && p.v === 'townhall' && c.osm && p.name === c.osm)
  const town = places.find((p) => p.k === 'p' && p.name === DONG_NAME[c.dong])
  const at = th || town
  return { dong: c.dong, name: c.name, addr: c.addr.replace('강원특별자치도 삼척시 ', ''), tel: c.tel, lngLat: [at.lon, at.lat], coordApprox: !th, coordBasis: th ? `OpenStreetMap 시설 지점(${th.name})` : `OpenStreetMap ${DONG_NAME[c.dong]} 기준점(근사)` }
})

// 8) 산불 이력: 산림청 산불통계데이터에서 발생지가 삼척인 행 전부와, 발생지는 울진이지만 삼척 원덕읍까지 번진 2022년 울진 산불 행
const fireRows = parseCsv(fs.readFileSync(path.join(RAW, 'forest_fire_51230.csv'), 'utf8')).map((r) => {
  const t = (y, m, d, hm) => `${y}-${m}-${d} ${hm}`
  const cause = r['발생원인_기타'] && r['발생원인_세부원인'] === '기타(직접입력)' ? r['발생원인_기타'] : r['발생원인_세부원인'] || r['발생원인_기타']
  const row = {
    start: t(r['발생일시_년'], r['발생일시_월'], r['발생일시_일'], r['발생일시_시간']),
    end: t(r['진화종료시간_년'], r['진화종료시간_월'], r['진화종료시간_일'], r['진화종료시간_시간']),
    place: [r['발생장소_시군구'], r['발생장소_읍면'], r['발생장소_동리']].filter(Boolean).join(' '), cause, areaHa: Number(r['피해면적_합계'])
  }
  if (r['발생장소_시군구'] === '울진') row.note = '발생지는 울진 북면 두천리, 2022. 3. 4. 17시 30분께 삼척 원덕읍까지 번짐(연합뉴스 2022. 3. 5.)'
  return row
}).sort((a, b) => b.start.localeCompare(a.start))

const SOURCES = {
  population: { label: '주민등록인구', org: '행정안전부 주민등록 인구통계', table: clean(pop.table), period: pop.period },
  ltcJudged: { label: '장기요양 등급 판정', org: '국민건강보험공단(KOSIS)', table: clean(judged.table), period: `${judged.period}년` },
  ltcUsers: { label: '장기요양 급여이용수급자', org: '국민건강보험공단(KOSIS)', table: clean(users.table), period: `${users.period}년` },
  ltcFacilities: { label: '장기요양기관 정원과 현원', org: '국민건강보험공단 장기요양기관 검색', table: ltcRaw.source, period: dotDate(ltcRaw.fetchedAt) },
  shelters: { label: '이재민 임시주거시설', org: '행정안전부 국민재난안전포털', table: '안전지도 이재민 임시주거시설, 지진겸용 임시주거시설(시군구 51230)', period: `${dotDate(acmd.fetchedAt)} 조회` },
  seniorCenters: { label: '마을회관과 경로당', org: '삼척시(공공데이터포털 표준데이터 15114136)', table: '강원특별자치도 삼척시 마을회관및경로당', period: dotDate(seniorDate) },
  centers: { label: '읍면동 행정복지센터', org: '삼척시청 누리집', table: centersRaw.source, period: `${dotDate(centersRaw.fetchedAt)} 조회` },
  legalDongs: { label: '법정동과 법정리', org: '국토교통부(공공데이터포털 15063424)', table: '국토교통부 전국 법정동(20260729 파일)', period: '2026. 7. 29.' },
  boundaries: { label: '행정동 경계', org: 'vuski/admdongkor', table: 'ver20230701', period: '2023. 7. 1.' },
  roads: { label: '도로 주행 시간', org: 'OSRM 공개 서버(OpenStreetMap)', table: osrm.source, period: `${osrm.fetchedAt.slice(0, 10).replaceAll('-', '. ')}. 계산` },
  places: { label: '마을 기준점', org: 'OpenStreetMap', table: 'OpenFreeMap 벡터 타일 지명(ODbL), geoPlaces.js', period: '2026. 10. 7. 수집' }
}

const LTC = {
  period: users.period,
  judged: judged.values,
  users: users.total,
  facilityUsers: Object.fromEntries(['계', ...GR].map((g) => [g, (users['노인요양시설'][g] || 0) + (users['노인요양공동생활가정'][g] || 0)])),
  dayCareUsers: users['주야간보호'],
  homeTotal, homeByGrade, homeByTransport, transportOf: TRANSPORT_OF,
  facilityCounts: `국민건강보험공단 장기요양기관 찾기(${dotDate(ltcRaw.fetchedAt)}): 노인요양시설 ${RESIDENTIAL.filter((f) => f.kind.startsWith('노인요양시설')).length}곳 정원 ${RESIDENTIAL.filter((f) => f.kind.startsWith('노인요양시설')).reduce((t, f) => t + f.capacity, 0)}, 노인요양공동생활가정 ${RESIDENTIAL.filter((f) => f.kind === '노인요양공동생활가정').length}곳 정원 ${RESIDENTIAL.filter((f) => f.kind === '노인요양공동생활가정').reduce((t, f) => t + f.capacity, 0)}, 주야간보호 ${DAYCARE.length}곳 정원 ${DAYCARE.reduce((t, f) => t + f.capacity, 0)}`
}

const banner = `// samcheokData.js 자동 생성 파일. client/scripts/build-samcheok-data.mjs 로 만든다. 직접 고치지 않는다.
// 마을(법정동, 법정리), 임시주거시설, 경로당, 장기요양기관, 행정복지센터는 실제 공개 자료다. 출처와 기준 시점은 DATA_SOURCES.
// 마을별 대상자 수(targets)는 통계를 나눈 추정치다. 개인 단위 자료는 없다. 산출 순서는 생성 스크립트 머리 주석.
`
const js = (name, v) => `export const ${name} = ${JSON.stringify(v)}\n`
fs.writeFileSync(OUT, banner
  + js('DATA_SOURCES', SOURCES)
  + js('DONG_STATS', dongStats)
  + js('LTC', LTC)
  + js('VILLAGES', villages)
  + js('TEMP_SHELTERS', shelters)
  + js('LTC_RESIDENTIAL', RESIDENTIAL)
  + js('LTC_DAYCARE', DAYCARE)
  + js('DONG_CENTERS', CENTERS)
  + js('SENIOR_CENTERS', SENIOR)
  + js('ALLOC', { rule: '재가 수급자 추정치를 행정동별 75세 이상 인구 비율로 나누고, 마을(법정동, 법정리)은 경로당 수 비례로 나눈다(건축물 통계 미수신)', skippedVillages: skipped })
)
fs.writeFileSync(FIRE_OUT, `// 산림청 산불통계데이터(공공데이터포털 15121380) 스냅샷. 파일 산불발생통계(20251110).csv, 포털 수정일 2026-09-15.
// 발생지가 삼척인 행 전부와, 발생지는 울진이지만 삼척 원덕읍까지 번진 2022년 울진 산불 행을 옮긴다. scripts/build-samcheok-data.mjs 가 만든다.
export const FOREST_FIRE_SOURCE = ${JSON.stringify({ name: '산림청 산불통계데이터', portalId: '15121380', file: '산불발생통계(20251110).csv', portalUpdated: '2026-09-15', range: '2022년부터 2025년까지 전국 2,020건' })}

export const FOREST_FIRE_ROWS = ${JSON.stringify(fireRows, null, 1)}
`)
const sum = villages.reduce((s, v) => s + v.targets, 0)
console.log(`villages ${villages.length}, targets ${sum} (home ${homeTotal}), shelters ${shelters.length} cap ${shelters.reduce((t, s) => t + s.capacity, 0)}, senior ${SENIOR.length} (name ${SENIOR.filter((s) => s.match === 'name').length}), skipped ${skipped.join(',') || '-'}`)
console.log('byGrade', JSON.stringify(homeByGrade), 'byTransport', JSON.stringify(homeByTransport))
console.log('dongTargets', DONG_ORDER.map((c) => `${c}${dongStats[c].targets}`).join(' '))
console.log('residential', RESIDENTIAL.length, 'daycare', DAYCARE.length, 'centers', CENTERS.length, 'fire rows', fireRows.length)
