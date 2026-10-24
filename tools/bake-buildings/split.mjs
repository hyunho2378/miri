#!/usr/bin/env node
// split.mjs 상황판 첫 로딩을 앞당기려고 건물 파일(buildings-nsdi.bin)을 두 개로 나눈다.
//   1) 동해시(51170) 읍면동 경계 안 건물: 먼저 받아 먼저 세운다
//   2) 나머지 접경 시군 건물: 이어서 받는다
// 형식은 원본과 같은 v2(buildingBuild.js readBuildings 가 그대로 읽음). 건물 하나도 빠지거나 겹치지 않는다(합계 시험).
// 쓰는 법: node tools/bake-buildings/split.mjs  (client/public/terrain 의 원본을 읽어 -1, -2 파일을 쓴다)
// 근거: 플랫폼 AI 협업 툴 셀 86(2026. 10. 25. 공개 링크 측정, 건물 5,520KB, 응답 약 24초, 첫 화면 자료의 68%)
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { DEM_META, REGION_PIECES } from '../../client/src/mock/geoRegion.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const dir = path.join(here, '../../client/public/terrain')
const src = fs.readFileSync(path.join(dir, 'buildings-nsdi.bin'))
const buf = src.buffer.slice(src.byteOffset, src.byteOffset + src.byteLength)
const dv = new DataView(buf)
if (dv.getUint32(0, true) !== 2) throw new Error('v2 파일만 나눌 수 있음')
let p = 4
const n = dv.getUint32(p, true); p += 4
const nPts = dv.getUint32(p, true); p += 4
const counts = new Uint16Array(buf.slice(p, p + n * 2)); p += n * 2
const floors = new Uint8Array(buf.slice(p, p + n)); p += n
const heights = new Uint16Array(buf.slice(p, p + n * 2)); p += n * 2
const uses = new Uint8Array(buf.slice(p, p + n)); p += n
p += (4 - (p % 4)) % 4
const xy = new Uint16Array(buf.slice(p, p + nPts * 4))
const [w, s, e, nn] = DEM_META.bbox
const lon = (u) => w + (u / 65535) * (e - w)
const lat = (v) => s + (v / 65535) * (nn - s)

const inRing = (x, y, r) => { let inside = false; for (let i = 0, j = r.length - 1; i < r.length; j = i++) { const [xi, yi] = r[i], [xj, yj] = r[j]; if ((yi > y) !== (yj > y) && x < ((xj - xi) * (y - yi)) / (yj - yi) + xi) inside = !inside } return inside }
const dong = REGION_PIECES.filter((q) => q.sgg === '51170').map((q) => {
  let b = [180, 90, -180, -90]
  for (const poly of q.coordinates) for (const [x, y] of poly[0]) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]
  return { coordinates: q.coordinates, bbox: b }
})
const inDong = (cx, cy) => dong.some((q) => cx >= q.bbox[0] && cx <= q.bbox[2] && cy >= q.bbox[1] && cy <= q.bbox[3] && q.coordinates.some((poly) => inRing(cx, cy, poly[0]) && !poly.slice(1).some((h) => inRing(cx, cy, h))))

const parts = [[], []]
let o = 0
for (let i = 0; i < n; i++) {
  const m = counts[i]
  let cx = 0, cy = 0
  for (let k = 0; k < m; k++) { cx += xy[o + k * 2]; cy += xy[o + k * 2 + 1] }
  parts[inDong(lon(cx / m), lat(cy / m)) ? 0 : 1].push({ i, o, m })
  o += m * 2
}

function write(list, file) {
  const bn = list.length, bp = list.reduce((a, b) => a + b.m, 0)
  let head = 12 + bn * 2 + bn + bn * 2 + bn
  const pad = (4 - (head % 4)) % 4
  const out = new ArrayBuffer(head + pad + bp * 4)
  const v = new DataView(out)
  v.setUint32(0, 2, true); v.setUint32(4, bn, true); v.setUint32(8, bp, true)
  let q = 12
  for (const b of list) { v.setUint16(q, counts[b.i], true); q += 2 }
  for (const b of list) { v.setUint8(q, floors[b.i]); q += 1 }
  for (const b of list) { v.setUint16(q, heights[b.i], true); q += 2 }
  for (const b of list) { v.setUint8(q, uses[b.i]); q += 1 }
  q += pad
  for (const b of list) for (let k = 0; k < b.m * 2; k++) { v.setUint16(q, xy[b.o + k], true); q += 2 }
  fs.writeFileSync(path.join(dir, file), Buffer.from(out))
  return { file, buildings: bn, points: bp, bytes: out.byteLength }
}
const r1 = write(parts[0], 'buildings-nsdi-1.bin')
const r2 = write(parts[1], 'buildings-nsdi-2.bin')
console.log(JSON.stringify({ total: n, first: r1, rest: r2, sum: r1.buildings + r2.buildings }, null, 1))
