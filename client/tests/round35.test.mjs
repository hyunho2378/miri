// 35회차: 플랫폼 AI 협업 툴 셀 85(공공데이터 갱신 기준 근거), 셀 86(상황판 첫 로딩)
import assert from 'node:assert/strict'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { MAX_LAG_MIN, freshness } from '../src/lib/freshness.js'
import { BUILDINGS, DEM_META } from '../src/mock/geoRegion.js'

const here = path.dirname(fileURLToPath(import.meta.url))
const pub = path.join(here, '../public')

// 셀 85: 산불위험예보는 공식 3시간 주기 + 여유 3시간, 출처를 기준 문구에
assert.equal(MAX_LAG_MIN.fire.min, 360)
assert.match(MAX_LAG_MIN.fire.basis, /15084817/)
assert.match(MAX_LAG_MIN.fire.basis, /3시간 주기/)
// 근거가 확인되지 않은 자료는 팀 기준 그대로
assert.match(MAX_LAG_MIN.er.basis, /^팀 기준/)
assert.match(MAX_LAG_MIN.warning.basis, /^팀 기준/)
const now = Date.parse('2026-10-25T12:00:00+09:00')
const at = (h) => new Date(now - h * 3600000).toISOString()
assert.equal(freshness('fire', { asOf: at(5) }, now).state, 'ok')
assert.equal(freshness('fire', { asOf: at(7) }, now).state, 'stale')

// 셀 86: 건물 파일을 동해시(1)와 나머지(2)로 나눠도 건물과 꼭짓점이 원본과 같다
const head = (f) => { const b = fs.readFileSync(path.join(pub, f)); return { v: b.readUInt32LE(0), n: b.readUInt32LE(4), pts: b.readUInt32LE(8), bytes: b.length } }
assert.equal(BUILDINGS.parts.length, 2)
const [p1, p2] = BUILDINGS.parts.map(head)
const all = head(BUILDINGS.url)
assert.equal(p1.v, 2); assert.equal(p2.v, 2)
assert.equal(p1.n + p2.n, all.n)
assert.equal(p1.n + p2.n, BUILDINGS.count)
assert.equal(p1.pts + p2.pts, all.pts)
assert.ok(p1.bytes < all.bytes / 3, '첫 파일이 원본의 1/3 미만')
assert.deepEqual(BUILDINGS.bbox, DEM_META.bbox)
console.log('round35 ok', { first: p1.n, rest: p2.n, firstKB: Math.round(p1.bytes / 1024) })
