// 모바일 재설계 1단계: 부품표, 입구, 기기 틀, 글자 기준
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync, readdirSync } from 'node:fs'
import { KIT_PARTS, UI_UTILITIES, SCREEN_RULES } from '../src/mobile/kitParts.js'
import { DEVICES, DEFAULT_DEVICE, deviceById, deviceSize, shouldUseFrame, frameSrc, fitScale } from '../src/mobile/devices.js'
import { layoutFor } from '../src/mobile/layout.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')
const ui = read('../src/mobile/ui.jsx')
const uiExports = [...ui.matchAll(/^export (?:function|const) (\w+)/gm)].map((m) => m[1])

test('ui.jsx 의 모든 부품은 부품표(kitParts.js)에 키트 노드와 함께 있다', () => {
  const missing = uiExports.filter((n) => !KIT_PARTS[n] && !UI_UTILITIES.includes(n))
  assert.deepEqual(missing, [], `부품표에 없는 부품: ${missing.join(', ')}`)
  for (const [name, p] of Object.entries(KIT_PARTS)) {
    assert.ok(['kit', 'combo', 'replace'].includes(p.status), name)
    if (p.status !== 'replace') assert.ok(p.ios.length + p.android.length > 0, `${name} 키트 노드 없음`)
    for (const n of [...p.ios, ...p.android]) assert.match(n, /^\d+:\d+ /, `${name} 노드 형식 ${n}`)
  }
})

test('화면 파일은 부품표에 있는 ui.jsx 부품만 가져온다', () => {
  const dirs = ['../src/mobile/field/', '../src/mobile/helper/']
  const files = dirs.flatMap((d) => readdirSync(new URL(d, import.meta.url)).filter((f) => f.endsWith('.jsx')).map((f) => d + f)).concat(['../src/mobile/shells.jsx'])
  const bad = []
  for (const f of files) {
    const s = read(f)
    for (const m of s.matchAll(/import \{([^}]+)\} from '\.{1,2}\/(?:\.\.\/)?ui\.jsx'/g)) {
      for (const name of m[1].split(',').map((x) => x.trim()).filter(Boolean)) if (!KIT_PARTS[name] && !UI_UTILITIES.includes(name)) bad.push(`${f} ${name}`)
    }
    // 날 입력 요소는 숨긴 파일 고르기만 허용(촬영과 녹음). 체크 상자 1곳은 2단계 화면 재구성에서 키트 부품으로 바꿈
    const raw = [...s.matchAll(/<(button|select|textarea|input)\b[^>]*>/g)].map((x) => x[0]).filter((t) => !(t.startsWith('<input') && /type="file"/.test(t) && /hidden/.test(t)) && !/className="mob-check"/.test(t))
    for (const t of raw) bad.push(`${f} ${t.slice(0, 40)}`)
  }
  assert.deepEqual(bad, [], bad.join('\n'))
})

test('기기 목록: 갤럭시 기본, 갤럭시는 M3, 아이폰은 iOS, 폴드와 듀오 안팎', () => {
  assert.equal(DEFAULT_DEVICE, 'galaxy')
  assert.deepEqual(DEVICES.map((d) => d.id), ['galaxy', 'iphone', 'fold-cover', 'fold-inner', 'duo-cover', 'duo-inner'])
  for (const d of DEVICES) assert.equal(d.platform, d.id.startsWith('galaxy') || d.id.startsWith('fold') ? 'android' : 'ios', d.id)
  assert.deepEqual(deviceSize(deviceById('duo-inner'), true), { width: 951, height: 669 })
  assert.equal(deviceById('없음').id, 'galaxy')
})

test('틀 안 배치는 기기 크기로 정한다(창 크기가 아님)', () => {
  const at = (id, land = false) => { const d = deviceById(id); const s = deviceSize(d, land); return layoutFor({ platform: d.platform, ...s }) }
  assert.equal(at('galaxy').bar, 'bottom'); assert.equal(at('galaxy').twoPane, false)
  assert.equal(at('fold-cover').bar, 'bottom')
  assert.equal(at('fold-inner').bar, 'rail'); assert.equal(at('fold-inner').twoPane, false)
  assert.equal(at('fold-inner', true).bar, 'rail')
  assert.equal(at('iphone').bar, 'bottom')
  assert.equal(at('duo-cover').bar, 'side')
  assert.equal(at('duo-inner').bar, 'bottom'); assert.equal(at('duo-inner').twoPane, true)
  assert.equal(at('duo-inner', true).bar, 'side')
})

test('틀을 쓰는 때: 컴퓨터 창만. 휴대폰, 틀 안, frame=0 은 틀 없음', () => {
  assert.equal(shouldUseFrame({ width: 1440 }), true)
  assert.equal(shouldUseFrame({ width: 1440, inFrame: true }), false)
  assert.equal(shouldUseFrame({ width: 1440, coarse: true }), false)
  assert.equal(shouldUseFrame({ width: 412, coarse: true }), false)
  assert.equal(shouldUseFrame({ width: 1440, search: '?frame=0' }), false)
  assert.equal(shouldUseFrame({ width: 500, search: '?frame=1' }), true)
  assert.equal(frameSrc('/m/f', '?device=iphone&x=1', deviceById('fold-inner')), '/m/f?x=1&platform=android&frame=0')
  assert.equal(fitScale({ width: 402, height: 874 }, { availWidth: 1400, availHeight: 1200 }), 1)
  assert.ok(fitScale({ width: 669, height: 951 }, { availWidth: 1400, availHeight: 700 }) < 1)
})

test('입구: /m 은 시작 화면, 부품 견본 링크 없음, 콘솔에 휴대폰 화면 입구', () => {
  const app = read('../src/App.jsx')
  assert.match(app, /<Route index element=\{<MobileStart \/>\} \/>/)
  assert.doesNotMatch(app, /Navigate to="\/m\/kit"/)
  const shells = read('../src/mobile/shells.jsx')
  assert.match(shells, /현장 담당자용/); assert.match(shells, /도우미용/)
  const nav = read('../src/components/layout/navConfig.js')
  assert.match(nav, /key: 'mobile', href: '\/m', label: '휴대폰 화면'/)
  const linksToKit = [...readdirSync(new URL('../src/mobile/', import.meta.url)).filter((f) => f.endsWith('.jsx') && f !== 'KitPage.jsx')].filter((f) => /['"]\/m\/kit/.test(read(`../src/mobile/${f}`)))
  assert.deepEqual(linksToKit, [])
})

test('글자: 한국어 수동 자간 0, 안드로이드 글꼴 Roboto 와 Noto Sans KR 먼저', () => {
  const css = read('../src/mobile/mobile.css')
  const ls = [...css.matchAll(/letter-spacing:\s*([^;}]+)/g)].map((m) => m[1].trim()).filter((v) => v !== '0' && !v.startsWith('var('))
  assert.deepEqual(ls, [])
  const vars = [...css.matchAll(/--ls-[\w-]+:\s*([^;]+);/g)].map((m) => m[1].trim()).filter((v) => v !== '0px')
  assert.deepEqual(vars, [])
  const a = css.slice(css.indexOf('.mob-root.platform-android {'))
  assert.match(a.slice(0, 200), /--m-font: Roboto, 'Noto Sans KR'/)
  assert.doesNotMatch(css.slice(css.indexOf('.mob-root {'), css.indexOf('.mob-root {') + 600), /Roboto/)
})

test('화면 규칙 값(벤치마크): 채움 버튼 하나, 글 덩어리 80자, 글자 단계 4', () => {
  assert.deepEqual(SCREEN_RULES, { maxFilledButtons: 1, maxParagraphChars: 80, maxTextLevels: 4, mainButtonInView: true })
  const tool = readFileSync(new URL('../../tools/measure-mobile-screen.js', import.meta.url), 'utf8')
  assert.match(tool, /export function measureMobileScreen/)
})

test('화면 설정에 화면 모양 전환 없음(기기에서 정함), 시작 화면 글 80자 이하', () => {
  const disp = ui.slice(ui.indexOf('export function DisplaySettings'), ui.indexOf('export function FilledInput'))
  assert.doesNotMatch(disp, /화면 모양|setPlatform/)
  const start = read('../src/mobile/shells.jsx')
  const body = start.slice(start.indexOf('export function MobileStart'), start.indexOf('export function HelperShell'))
  for (const t of body.matchAll(/(?:title|subtitle)="([^"]+)"|>([^<>{}]+)</g)) assert.ok((t[1] || t[2]).trim().length <= 80)
})

test('아이콘 교체: 기한은 시계, 소방 요청은 전화 발신, 대상자 상세는 사람 하나, 도우미 첫 화면은 손과 하트', () => {
  const f = read('../src/mobile/field/FieldScreens.jsx'), h = read('../src/mobile/helper/HelperScreens.jsx')
  assert.match(f, /<ListRow key=\{v\.code\} lead=\{<Clock size=\{22\} \/>\}/)
  assert.match(f, /<ListRow lead=\{<PhoneOutgoing size=\{22\} \/>\} title=\{scope\.isDong \? '이동 불가 인원' : '소방 지원 요청'\}/)
  // 도우미(재구성 2a): 대상자 정보 행은 사람 하나, 평시 첫 화면 설명 행은 손과 하트, 목록 위 글자 버튼 '연락'
  assert.match(h, /<InfoSheet lead=\{<User size=\{20\} \/>\} title="대상자 정보"/)
  assert.match(h, /<Button variant="plain" size="sm" onClick=\{\(\) => go\(\{ name: 'H7' \}\)\}>연락<\/Button>/)
})
