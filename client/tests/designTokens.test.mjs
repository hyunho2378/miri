import test from 'node:test'
import assert from 'node:assert/strict'
import {ios,m3} from '../src/kitTokens.js'
const L = hex => {const c=hex.replace('#','').match(/../g).map(x=>parseInt(x,16)/255).map(x=>x<=.04045?x/12.92:((x+.055)/1.055)**2.4);return .2126*c[0]+.7152*c[1]+.0722*c[2]}
const contrast=(a,b)=>(Math.max(L(a),L(b))+.05)/(Math.min(L(a),L(b))+.05)
test('공용 부품 on-color 대비 4.5:1',()=>{for(const [a,b] of [[ios.blueAccessible,ios.white],[ios.redAccessible,ios.white],[m3.primary,m3.onPrimary],[m3.error,m3.onError],[ios.fill,ios.secondaryText],[ios.grouped,ios.secondaryText]])assert.ok(contrast(a,b)>=4.5,`${a}/${b}: ${contrast(a,b)}`)})
test('정확한 iOS 시스템 색상과 M3 HCT 결과',()=>{assert.equal(ios.blue,'#0088FF');assert.equal(ios.red,'#FF383C');assert.equal(m3.primary,'#005bc1')})

// 색 출처 검사: 화면과 문서 코드의 색은 kitTokens.js 값만 쓴다
import { readFileSync, readdirSync, statSync } from 'node:fs'
import { join, relative } from 'node:path'
import { fileURLToPath } from 'node:url'
const SRC = fileURLToPath(new URL('../src/', import.meta.url))
const walk = (d) => readdirSync(d).flatMap((n) => { const p = join(d, n); return statSync(p).isDirectory() ? walk(p) : [p] })
const files = walk(SRC).filter((p) => /\.(jsx?|css)$/.test(p))
const norm = (v) => { let h = v.replace('#', '').toUpperCase(); if (h.length === 3) h = h.split('').map((c) => c + c).join(''); return '#' + h }
const KIT = new Set([...Object.values(ios), ...Object.values(m3)].filter((v) => v.startsWith('#')).map(norm).concat(['#FFFFFF', '#000000', '#1C1C1E', '#FFCC00']))
// 예외: 색 원본과 생성 파일, 지도 바탕과 3D 지형(지도 타일 색), 문서 본문 렌더(인쇄 종이 흰색과 검정만 쓰는지 아래에서 따로 확인)
const EXEMPT = [/kitTokens\.js$/, /mobile\/tokens\.css$/, /\/tokens\.js$/, /three\/localBasemap\.js$/, /three\/Region3D\.js$/]
const HEX = /#[0-9A-Fa-f]{6}\b|#[0-9A-Fa-f]{3}\b(?![0-9A-Fa-f])/g
const strip = (s) => s.replace(/\/\*[\s\S]*?\*\//g, '').replace(/(^|[^:'"`])\/\/.*$/gm, '$1')
test('키트 밖 색 리터럴 0건(지도 바탕 예외)', () => {
  const bad = []
  for (const f of files) {
    if (EXEMPT.some((r) => r.test(f))) continue
    const s = strip(readFileSync(f, 'utf8'))
    for (const m of s.matchAll(HEX)) {
      const pre = s.slice(Math.max(0, m.index - 12), m.index)
      if (/&$|href=|url\(|id=|#$/.test(pre)) continue
      if (!KIT.has(norm(m[0]))) bad.push(`${relative(SRC, f)} ${m[0]}`)
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'))
})
test('rgba는 무채색 그림자와 키트 회색 글자만', () => {
  const bad = []
  for (const f of files) {
    if (EXEMPT.some((r) => r.test(f))) continue
    const s = strip(readFileSync(f, 'utf8'))
    for (const m of s.matchAll(/rgba?\(([^)]*)\)/g)) {
      const [r, g, b] = m[1].split(',').map((x) => parseFloat(x))
      const neutral = r === g && g === b && (r === 0 || r === 255)
      const label = r === 60 && g === 60 && b === 67
      if (!neutral && !label && !Number.isNaN(r)) bad.push(`${relative(SRC, f)} ${m[0]}`)
    }
  }
  assert.deepEqual(bad, [], bad.join('\n'))
})
test('모바일 화면 파일은 색을 직접 쓰지 않고 ui.jsx 부품과 토큰만 거친다', () => {
  const screens = files.filter((f) => /\/mobile\/(field|helper)\/.*\.jsx$|\/mobile\/(shells|KitPage)\.jsx$/.test(f))
  const bad = []
  for (const f of screens) {
    const s = strip(readFileSync(f, 'utf8'))
    if (HEX.test(s)) bad.push(`${relative(SRC, f)} 색 리터럴`)
    HEX.lastIndex = 0
    if (/rgba?\(/.test(s)) bad.push(`${relative(SRC, f)} rgba`)
    if (/style=\{\{[^}]*\b(color|background|backgroundColor|fill|stroke)\s*:/.test(s)) bad.push(`${relative(SRC, f)} 인라인 색`)
    if (/\b(bg|text|fill|stroke)-\[#/.test(s)) bad.push(`${relative(SRC, f)} 임의 색 class`)
  }
  assert.deepEqual(bad, [], bad.join('\n'))
})
