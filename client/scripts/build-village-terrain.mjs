// build-village-terrain.mjs 마을 집결지의 고도, 바다까지 거리, 둘레 300m 최대 경사를 계산해 지형 값 파일을 만든다.
// 지형: public/terrain/region-dem.png(AWS Terrain Tiles z11, 경위도 격자). 바다는 고도 0 칸.
// 실행: node scripts/build-village-terrain.mjs            동해시(src/mock/villageTerrain.js)
//       node scripts/build-village-terrain.mjs samcheok   삼척시(src/mock/samcheokTerrain.js)
// pngjs 가 있으면 쓰고, 없으면 node 내장 zlib 로 PNG(8비트 RGB, RGBA)를 직접 푼다. 두 방법의 결과는 같다.
import fs from 'fs'
import zlib from 'zlib'
import { createRequire } from 'module'
const require = createRequire(import.meta.url)
const TARGETS = {
  donghae: { data: '../src/mock/donghaeData.js', out: '../src/mock/villageTerrain.js' },
  samcheok: { data: '../src/mock/samcheokData.js', out: '../src/mock/samcheokTerrain.js' }
}
const regionId = process.argv[2] || 'donghae'
const T = TARGETS[regionId]
if (!T) throw new Error(`모르는 지역: ${regionId}`)
function decodePng(buf) {
  let pngjs = null
  try { pngjs = require(process.env.PNGJS || 'pngjs') } catch { /* 내장 해독기로 */ }
  if (pngjs) return pngjs.PNG.sync.read(buf)
  let p = 8; let width = 0; let height = 0; let ctype = 0; const idat = []
  while (p < buf.length) {
    const len = buf.readUInt32BE(p); const type = buf.toString('ascii', p + 4, p + 8); const body = buf.subarray(p + 8, p + 8 + len)
    if (type === 'IHDR') { width = body.readUInt32BE(0); height = body.readUInt32BE(4); if (body[8] !== 8 || body[12] !== 0) throw new Error('8비트 비월 없음 PNG만'); ctype = body[9] }
    if (type === 'IDAT') idat.push(body)
    p += 12 + len
  }
  const bpp = { 2: 3, 6: 4 }[ctype]
  if (!bpp) throw new Error(`색 형식 ${ctype} 미지원`)
  const raw = zlib.inflateSync(Buffer.concat(idat)); const stride = width * bpp
  const px = Buffer.alloc(stride * height); const data = Buffer.alloc(width * height * 4)
  for (let y = 0; y < height; y++) {
    const f = raw[y * (stride + 1)]; const src = y * (stride + 1) + 1; const dst = y * stride
    for (let x = 0; x < stride; x++) {
      const a = x >= bpp ? px[dst + x - bpp] : 0; const b = y ? px[dst - stride + x] : 0; const c = x >= bpp && y ? px[dst - stride + x - bpp] : 0
      let v = raw[src + x]
      if (f === 1) v += a; else if (f === 2) v += b; else if (f === 3) v += (a + b) >> 1
      else if (f === 4) { const pp = a + b - c; const pa = Math.abs(pp - a); const pb = Math.abs(pp - b); const pc = Math.abs(pp - c); v += pa <= pb && pa <= pc ? a : pb <= pc ? b : c }
      px[dst + x] = v & 255
    }
  }
  for (let i = 0; i < width * height; i++) { for (let k = 0; k < 3; k++) data[i * 4 + k] = px[i * bpp + k]; data[i * 4 + 3] = bpp === 4 ? px[i * bpp + 3] : 255 }
  return { width, height, data }
}
const { DEM_META } = await import('../src/mock/geoRegion.js')
const { VILLAGES } = await import(T.data)
const png = decodePng(fs.readFileSync(new URL('../public/terrain/region-dem.png', import.meta.url)))
const { cols, rows, bbox: [w, s, e, n] } = DEM_META
const at = (c, r) => { const i = (r * cols + c) * 4; return (png.data[i] * 256 + png.data[i + 1]) / 10 }
const cr = (lon, lat) => [Math.round(((lon - w) / (e - w)) * (cols - 1)), Math.round(((n - lat) / (n - s)) * (rows - 1))]
const mLon = (e - w) / (cols - 1) * 111320 * Math.cos(37.5 * Math.PI / 180), mLat = (n - s) / (rows - 1) * 110574
const out = {}
for (const v of VILLAGES) {
  const [lon, lat] = v.lngLat
  const [c, r] = cr(lon, lat)
  const elev = at(c, r)
  // 바다까지 거리: 반경을 넓혀 가며 고도 0 칸을 찾는다(최대 15km)
  let sea = null
  for (let R = 1; R < 200 && sea == null; R++) {
    for (let dc = -R; dc <= R && sea == null; dc++) for (const dr of [-R, R]) { if (at(c + dc, r + dr) === 0) sea = Math.hypot(dc * mLon, dr * mLat) }
    for (let dr = -R; dr <= R && sea == null; dr++) for (const dc of [-R, R]) { if (at(c + dc, r + dr) === 0) sea = Math.hypot(dc * mLon, dr * mLat) }
  }
  // 둘레 300m 안 최대 경사(도)
  let slope = 0
  const k = Math.ceil(300 / mLon)
  for (let dr = -k; dr <= k; dr++) for (let dc = -k; dc <= k; dc++) {
    if (Math.hypot(dc * mLon, dr * mLat) > 300) continue
    const x = c + dc, y = r + dr
    const gx = (at(x + 1, y) - at(x - 1, y)) / (2 * mLon), gy = (at(x, y + 1) - at(x, y - 1)) / (2 * mLat)
    slope = Math.max(slope, Math.atan(Math.hypot(gx, gy)) * 180 / Math.PI)
  }
  out[v.code] = { elev: Math.round(elev), seaKm: sea == null ? null : Math.round(sea) / 1000, slope: Math.round(slope) }
}
const head = regionId === 'donghae'
  ? `// villageTerrain.js 마을 집결지 지형 값. scripts/build-village-terrain.mjs 가 만든다(직접 고치지 않는다).
// 고도(m), 바다까지 거리(km), 둘레 300m 최대 경사(도). 지형 출처 AWS Terrain Tiles(Mapzen) z11, 칸 약 90m 라 해안 저지대는 오차가 크다.
`
  : `// ${T.out.split('/').pop()} ${regionId} 마을 집결지 지형 값. scripts/build-village-terrain.mjs ${regionId} 가 만든다(직접 고치지 않는다).
// 고도(m), 바다까지 거리(km), 둘레 300m 최대 경사(도). 지형 출처 AWS Terrain Tiles(Mapzen) z11, 칸 약 90m 라 해안 저지대는 오차가 크다.
`
fs.writeFileSync(new URL(T.out, import.meta.url), head + 'export const VILLAGE_TERRAIN = ' + JSON.stringify(out) + '\n')
console.log(Object.entries(out).map(([k, x]) => `${k} ${VILLAGES.find((v) => v.code === k).name} 고도${x.elev} 바다${x.seaKm} 경사${x.slope}`).join('\n'))
