// 33회차 반영(플랫폼 셀 74): 서류 읽기 확인할 곳, 이송 진행 카드 분모 줄, 현장 소식 글만 먼저 저장과 대상자 미리 선택.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { REVIEW_REASON, REVIEW_WHERE, reviewReasons } from '../src/lib/aiCard.js'
import { progressBasisLine, progressTotal } from '../src/lib/progressBasis.js'
import { unreadNote, canSaveTextOnly, prefillCode } from '../src/lib/noteDraft.js'
import { indexStops } from '../src/lib/dispatchSim.js'

const g = globalThis
g.window = g.window || { location: { pathname: '/console' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }

test('확인 사유마다 확인할 곳이 있고, 이동 대상은 quote 나 image 다', () => {
  for (const k of Object.keys(REVIEW_REASON)) {
    assert.ok(REVIEW_WHERE[k]?.text, `${k} 확인할 곳 없음`)
    assert.ok(['quote', 'image'].includes(REVIEW_WHERE[k].target))
  }
  const rs = reviewReasons({ aiGrade: 'walk', grade: 'walk', quote: '보행기 잡고 천천히 걸음', quoteMatched: true })
  assert.ok(rs.length >= 1)
  assert.ok(rs.every((r) => r.where && r.target))
})

test('이송 진행 카드 분모 줄: 카드 합과 배정 인원을 천 단위 쉼표로', () => {
  const counts = { done: 300, moving: 100, wait: 181, fail: 0, handedToFire: 0, unassigned: 267 }
  assert.equal(progressTotal(counts), 848)
  assert.equal(progressBasisLine(counts, 581), '대상 848명, 배정 581명')
  assert.equal(progressBasisLine({ a: 1000 }, 0), '대상 1,000명, 배정 0명')
})

test('기준 시나리오 추천 배정에서 배정표 인원과 미배정 인원을 더하면 대상 848명(카드 합과 같은 분모)', async () => {
  const { planDispatch } = await import('../src/lib/assign.js')
  const { calcTiming, calcVehicles, scenarioArrivals, scopeInput } = await import('../src/lib/shortageCalc.js')
  const { buildSeed } = await import('../src/mock/seed.js')
  const seed = buildSeed()
  const sc = seed.scenarios[0]
  const sp = scopeInput({ persons: seed.persons, villages: seed.villages, scenario: sc, settings: seed.settings })
  const p = planDispatch({ persons: sp.persons, villages: sp.villages, vehicles: calcVehicles(seed.vehicles, sc), helpers: seed.helpers, t0: seed.today, arrivals: scenarioArrivals(sc, sp.villages, seed.today), ...calcTiming(sc, seed.settings) })
  const assigned = Object.keys(indexStops(p)).length
  assert.equal(assigned + p.unassigned.length, 848)
  assert.equal(p.unassigned.length, 267)
  assert.equal(p.baseline.metrics.unserved, 291)
})

test('현장 소식: 읽기 실패나 끊김이면 글만 먼저 저장할 수 있고, 저장본은 읽기 전 표시와 원문을 가진다', () => {
  const req = { personCode: 'MS-05-001', villageCode: 'MS-05', current: { grade: 'assist', tags: [] }, mode: 'text', text: '보행기 없이 걷기 어려움' }
  assert.equal(canSaveTextOnly({ phase: 'error', req }), true)
  assert.equal(canSaveTextOnly({ phase: 'offline', req }), true)
  assert.equal(canSaveTextOnly({ phase: 'loading', req }), false)
  assert.equal(canSaveTextOnly({ phase: 'error', req: { ...req, mode: 'voice' } }), false)
  const n = unreadNote({ id: 'NOTE-9999', req, now: 1 })
  assert.equal(n.read, null); assert.equal(n.unread, true); assert.equal(n.text, req.text); assert.equal(n.status, 'pending')
})

test('현장 소식: 대상자 화면에서 ?p= 로 들어오면 대상자를 미리 고름', () => {
  assert.equal(prefillCode('?p=MS-05-001'), 'MS-05-001')
  assert.equal(prefillCode(''), '')
  const src = readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
  assert.ok(src.includes('/m/f/note?p='))
  assert.ok(src.includes('글 저장 완료'))
})

test('나중에 읽기: setNoteRead 는 읽은 결과를 붙이고 명부는 바꾸지 않음', async () => {
  const { useMiriStore } = await import('../src/store/useMiriStore.js')
  const before = JSON.stringify(useMiriStore.getState().persons.slice(0, 3))
  useMiriStore.getState().addFieldNote({ id: 'NOTE-T33', personCode: 'X', villageCode: 'Y', status: 'pending', text: 'a', read: null, unread: true })
  useMiriStore.getState().setNoteRead('NOTE-T33', { transcript: 'a', diff: { gradeChanged: false } })
  const n = useMiriStore.getState().fieldNotes.find((x) => x.id === 'NOTE-T33')
  assert.equal(n.unread, false); assert.ok(n.read)
  assert.equal(JSON.stringify(useMiriStore.getState().persons.slice(0, 3)), before)
})

test('검수 반영: 동의서 서식에 &nbsp; 같은 HTML 이름이 글자로 보이지 않음', () => {
  const src = readFileSync(new URL('../src/lib/docTemplates.js', import.meta.url), 'utf8')
  assert.equal(src.includes('&nbsp;'), false)
})

test('검수 반영: 끊김 검사와 글만 저장 버튼은 현장 소식 화면(FieldNotePage) 안에만 있음', () => {
  const src = readFileSync(new URL('../src/mobile/field/FieldScreens.jsx', import.meta.url), 'utf8')
  const start = src.indexOf('export function FieldNotePage')
  const end = src.indexOf('\nfunction ', start + 10) > 0 ? src.indexOf('\nfunction ', start + 10) : src.length
  const body = src.slice(start, end)
  assert.ok(body.includes('navigator.onLine === false'))
  assert.ok(body.includes('saveNow({ req, read: null })'))
  assert.equal(src.split('navigator.onLine === false').length - 1, 1)
  assert.equal(src.split('const saveNow').length - 1, 1)
})
