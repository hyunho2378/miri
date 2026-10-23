// 카카오모빌리티 자동차 길찾기로 마을 집결지와 가까운 대피소 사이 도로 경로를 미리 계산해 정적 JS 모듈(src/data/roadRoutes.js)로 저장한다.
// 실행: KAKAO_MOBILITY_KEY 를 .env.local 에 두고 node tools/kakao-routes.mjs
// 키는 이 스크립트 실행에만 쓰고 화면 번들에는 넣지 않는다. 결과는 경로 좌표와 소요 시간만 담는다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { VILLAGES, TEMP_SHELTERS } from '../src/mock/donghaeData.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const root = path.join(here, '..')
function readKey() {
  if (process.env.KAKAO_MOBILITY_KEY) return process.env.KAKAO_MOBILITY_KEY
  const f = path.join(root, '.env.local')
  if (!fs.existsSync(f)) return ''
  const line = fs.readFileSync(f, 'utf8').split('\n').find((l) => l.startsWith('KAKAO_MOBILITY_KEY='))
  return line ? line.slice('KAKAO_MOBILITY_KEY='.length).trim() : ''
}
const KEY = readKey()
if (!KEY) { console.error('KAKAO_MOBILITY_KEY 없음'); process.exit(1) }

const PER_VILLAGE = Number(process.env.ROUTES_PER_VILLAGE || 5)
const shelters = Object.fromEntries(TEMP_SHELTERS.map((s) => [s.code, s]))
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))

// 가까운 점 생략(약 30m)과 소수 5자리 반올림으로 크기를 줄인다
function simplify(points) {
  const out = []
  let last = null
  for (const [x, y] of points) {
    const p = [Math.round(x * 1e5) / 1e5, Math.round(y * 1e5) / 1e5]
    if (last && Math.hypot((p[0] - last[0]) * 88, (p[1] - last[1]) * 111) < 0.03) continue
    out.push(p); last = p
  }
  const end = points[points.length - 1]
  if (end) { const e = [Math.round(end[0] * 1e5) / 1e5, Math.round(end[1] * 1e5) / 1e5]; if (!last || last[0] !== e[0] || last[1] !== e[1]) out.push(e) }
  return out
}

async function route(from, to) {
  const url = `https://apis-navi.kakaomobility.com/v1/directions?origin=${from[0]},${from[1]}&destination=${to[0]},${to[1]}&priority=RECOMMEND`
  const res = await fetch(url, { headers: { Authorization: `KakaoAK ${KEY}` } })
  if (!res.ok) throw new Error(`HTTP ${res.status}`)
  const j = await res.json()
  const r = j.routes?.[0]
  if (!r || r.result_code !== 0) return { ok: false, msg: r?.result_msg || 'no route' }
  const pts = []
  for (const sec of r.sections || []) for (const road of sec.roads || []) {
    const v = road.vertexes || []
    for (let i = 0; i + 1 < v.length; i += 2) pts.push([v[i], v[i + 1]])
  }
  return { ok: true, durationSec: r.summary.duration, distanceM: r.summary.distance, path: simplify(pts) }
}

// 이미 계산한 경로는 다시 부르지 않는다(무료 이용량 절약). --used 를 주면 시드 시나리오 배정이 실제로 쓰는 마을과 대피소 짝을 더한다
const outFile = path.join(root, 'src/data/roadRoutes.js')
const prev = process.argv.includes('--fresh') ? {} : await import(outFile + '?t=' + Date.now()).then((m) => m.ROAD_ROUTES.routes).catch(() => ({}))
const routes = { ...prev }
const wanted = []
for (const v of VILLAGES) for (const [code, osrmMin] of v.drive.slice(0, PER_VILLAGE)) wanted.push([v.code, code])
if (process.argv.includes('--used')) {
  const { usedPairs } = await import('./used-pairs.mjs')
  for (const k of usedPairs()) { const [a, b] = k.split('>'); wanted.push([a, b]) }
}
const vBy = Object.fromEntries(VILLAGES.map((v) => [v.code, v]))
// 집결지 좌표 주변에 길이 없으면 둘레 점(약 150m, 300m)을 차례로 시도한다. 성공한 출발점은 기록하지 않고 경로 좌표만 남긴다
const RINGS = [[0, 0], ...[0.0015, 0.003].flatMap((d) => [[d, 0], [-d, 0], [0, d], [0, -d], [d, d], [-d, -d], [d, -d], [-d, d]])]
let calls = 0, fails = 0, added = 0
for (const [vc, code] of wanted) {
  const key = `${vc}>${code}`
  if (routes[key]) continue
  const v = vBy[vc]; const s = shelters[code]
  if (!s?.lngLat || !v?.lngLat) continue
  const osrmMin = (v.drive.find((d) => d[0] === code) || [])[1] ?? null
  let done = false
  for (const [dx, dy] of RINGS) {
    calls += 1
    try {
      const r = await route([v.lngLat[0] + dx, v.lngLat[1] + dy], s.lngLat)
      if (r.ok) { routes[key] = { min: Math.round(r.durationSec / 6) / 10, km: Math.round(r.distanceM / 100) / 10, osrmMin, path: r.path }; added += 1; done = true; break }
    } catch (e) { console.log('실패', key, e.message) }
    await sleep(120)
  }
  if (!done) { fails += 1; console.log('경로 없음', key) }
}
const out = {
  source: { label: '도로 경로', org: '카카오모빌리티 길찾기 API(자동차, 추천 경로)', from: '마을 집결지 기준점', to: '가까운 임시주거시설 최대 ' + PER_VILLAGE + '곳과 시나리오 배정이 쓰는 대피소', computed: new Date().toISOString().slice(0, 10) },
  routes
}
fs.writeFileSync(outFile, '// 카카오모빌리티 길찾기로 미리 계산한 도로 경로(tools/kakao-routes.mjs 가 만든다). 직접 고치지 않는다\nexport const ROAD_ROUTES = ' + JSON.stringify(out) + '\n')
console.log(JSON.stringify({ calls, added, total: Object.keys(routes).length, fails, bytes: fs.statSync(outFile).size }))
