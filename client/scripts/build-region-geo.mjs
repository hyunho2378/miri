// build-region-geo.mjs 새 시군의 행정동 경계 파일을 만든다(지역 설정용).
// 원본: src/mock/geoRegion.js 의 REGION_PIECES(vuski/admdongkor ver20230701, 통계청 행정구역 경계 가공본).
// 이 원본은 동해시와 접경 시군(강릉, 삼척, 정선, 태백)만 담고 있다. 다른 시군은 같은 원본 GeoJSON 에서 시군 코드로 거른다.
// 사용: node scripts/build-region-geo.mjs <시군구 코드 5자리> <출력 파일> <행정동코드=영문2자,...>
// 예: node scripts/build-region-geo.mjs 51230 src/regions/samcheok.geo.js 5123051000=NY,...
import { writeFileSync } from 'node:fs'
import { REGION_PIECES } from '../src/mock/geoRegion.js'

const [sgg, out, mapArg] = process.argv.slice(2)
const codeOf = Object.fromEntries((mapArg || '').split(',').filter(Boolean).map((p) => p.split('=')))
const r4 = (x) => Math.round(x * 1e4) / 1e4
const pieces = REGION_PIECES.filter((p) => p.sgg === sgg)
if (!pieces.length) { console.error(`시군 ${sgg} 경계 없음`); process.exit(1) }
const dongGeo = pieces.map((p) => {
  if (!codeOf[p.code]) { console.error(`영문 코드 없음: ${p.code} ${p.name}`); process.exit(1) }
  return { code: codeOf[p.code], name: p.name, admCd: p.code, centroid: p.centroid.map(r4), coordinates: p.coordinates.map((poly) => poly.map((ring) => ring.map(([x, y]) => [r4(x), r4(y)]))) }
})
const xs = [], ys = []
for (const d of dongGeo) for (const poly of d.coordinates) for (const [x, y] of poly[0]) { xs.push(x); ys.push(y) }
const bbox = [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)].map(r4)
// 시 경계선: 동 경계 바깥 고리를 모두 그린다(맞닿은 변은 겹쳐 그려진다)
const outline = dongGeo.flatMap((d) => d.coordinates.map((poly) => poly[0]))
const head = `// 자동 생성 파일. scripts/build-region-geo.mjs ${sgg} 로 만든다. 직접 고치지 않는다.\n// 출처: vuski/admdongkor 행정동 경계 GeoJSON ver20230701(통계청 행정구역 경계 기반 가공본). 좌표는 소수 넷째 자리\n`
writeFileSync(out, `${head}export const BBOX = ${JSON.stringify(bbox)}\nexport const DONG_GEO = ${JSON.stringify(dongGeo)}\nexport const OUTLINE = ${JSON.stringify(outline)}\n`)
console.log(out, dongGeo.length, bbox)
