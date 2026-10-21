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

// 옅은 색조 채움 금지: 밝기 85% 이상이면서 색차(최대 채널과 최소 채널 차이) 0.05 이상인 유채색은 화면 어디에도 쓰지 않는다. iOS 회색(#F2F2F7, #E5E5EA)은 색차 0.02로 무채색
const tint = (hex) => { const [r, g, b] = norm(hex).slice(1).match(/../g).map((x) => parseInt(x, 16) / 255); const mx = Math.max(r, g, b), mn = Math.min(r, g, b); return { c: mx - mn, l: (mx + mn) / 2 } }
const paleTint = (hex) => { const { c, l } = tint(hex); return l >= 0.85 && c >= 0.05 && norm(hex) !== '#FFCC00' }
test('옅은 색조 채움 금지(생성 토큰, 실제로 참조하는 키트 값, 리터럴)', () => {
  const bad = []
  const tokCss = readFileSync(join(SRC, 'mobile/tokens.css'), 'utf8')
  for (const m of tokCss.matchAll(HEX)) if (paleTint(m[0])) bad.push(`mobile/tokens.css ${m[0]}`)
  for (const f of files) {
    if (/kitTokens\.js$|three\/localBasemap\.js$|three\/Region3D\.js$/.test(f)) continue
    const s = strip(readFileSync(f, 'utf8'))
    for (const m of s.matchAll(/\b(ios|m3)\.([A-Za-z0-9]+)/g)) { const v = (m[1] === 'ios' ? ios : m3)[m[2]]; if (typeof v === 'string' && v.startsWith('#') && paleTint(v)) bad.push(`${relative(SRC, f)} ${m[0]} ${v}`) }
    for (const m of s.matchAll(HEX)) { const pre = s.slice(Math.max(0, m.index - 12), m.index); if (/&$|href=|url\(|id=|#$/.test(pre)) continue; if (paleTint(m[0])) bad.push(`${relative(SRC, f)} ${m[0]}`) }
  }
  assert.deepEqual(bad, [], bad.join('\n'))
})
test('iOS 큰 제목은 키트 Toolbars Title 34/41 Bold', () => {
  const css = readFileSync(join(SRC, 'mobile/mobile.css'), 'utf8')
  assert.match(css, /--t-display: 34px; --l-display: 41px; --w-display: 700;/)
})
test('색 글자 대비: iOS 파랑과 빨강은 흰 면에서 4.5:1, Android primary와 error는 회색 채움에서 4.5:1', () => {
  assert.ok(contrast(ios.blueAccessible, ios.white) >= 4.5)
  assert.ok(contrast(ios.redAccessible, ios.white) >= 4.5)
  assert.ok(contrast(m3.primary, ios.fill) >= 4.5, String(contrast(m3.primary, ios.fill)))
  assert.ok(contrast(m3.error, ios.fill) >= 4.5, String(contrast(m3.error, ios.fill)))
})

// GPT 11차 M2, M3: 실제로 쓰는 조합(문서함 종류 배지 흰 글자, iOS 달력 요일 글자)을 합성 색까지 계산해 검사
test('문서함 종류 배지 흰 글자 4.5:1(파랑, 초록, 보라)', async () => {
  const { colors } = await import('../src/tokens.js')
  const kind = colors.kind
  assert.ok(kind, 'kind 토큰')
  for (const k of ['doc', 'sheet', 'form']) assert.ok(contrast(kind[k], ios.white) >= 4.5, `${k} ${kind[k]} ${contrast(kind[k], ios.white)}`)
})
test('iOS 달력 요일 글자는 흰 달력 면에서 4.5:1(30% 회색 합성 금지)', () => {
  const css = readFileSync(new URL('../src/mobile/mobile.css', import.meta.url), 'utf8')
  const rule = css.match(/\.mob-ios-cal-week span\s*\{([^}]*)\}/)?.[1] || ''
  assert.ok(!/rgba\(/.test(rule), rule)
  const tok = readFileSync(new URL('../src/mobile/tokens.css', import.meta.url), 'utf8')
  const varName = rule.match(/color:\s*var\((--[\w-]+)/)?.[1]
  assert.ok(varName, rule)
  const val = tok.match(new RegExp(`${varName}:\\s*(#[0-9A-Fa-f]{6})`))?.[1]
  assert.ok(val && contrast(val, ios.white) >= 4.5, `${varName} ${val}`)
})
test('달력 방향키 이동: 하루, 한 주, 주의 처음과 끝, 달 이동(말일 보정)', async () => {
  const src = readFileSync(new URL('../src/mobile/ui.jsx', import.meta.url), 'utf8')
  const body = src.slice(src.indexOf('export function calendarKeyMove'), src.indexOf('function IosInlineCalendar'))
  const calendarKeyMove = new Function(`${body.replace('export function', 'function')}; return calendarKeyMove`)()
  const d = new Date(2026, 9, 31) // 10월 31일 토요일
  const ymd = (x) => `${x.getMonth() + 1}/${x.getDate()}`
  assert.equal(ymd(calendarKeyMove(d, 'ArrowRight')), '11/1')
  assert.equal(ymd(calendarKeyMove(d, 'ArrowLeft')), '10/30')
  assert.equal(ymd(calendarKeyMove(d, 'ArrowUp')), '10/24')
  assert.equal(ymd(calendarKeyMove(d, 'ArrowDown')), '11/7')
  assert.equal(ymd(calendarKeyMove(d, 'Home')), '10/25')
  assert.equal(ymd(calendarKeyMove(d, 'End')), '10/31')
  assert.equal(ymd(calendarKeyMove(d, 'PageDown')), '11/30')
  assert.equal(ymd(calendarKeyMove(d, 'PageUp')), '9/30')
  assert.equal(calendarKeyMove(d, 'a'), null)
  assert.ok(/role="row"/.test(src) && /tabIndex=\{d === focus\.getDate\(\) \? 0 : -1\}/.test(src), '행 구조와 이동 가능한 칸 하나')
})
