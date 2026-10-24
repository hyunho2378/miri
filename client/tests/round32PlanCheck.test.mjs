// 32회차 반영(플랫폼 셀 83 후속, 명부 갱신 흐름): 당사자와 계획 확인 완료를 눌러야 마지막 확인 날짜가 바뀌고
// 명부 재확인 필요 인원이 줄어든다. 편집 저장과 서류 읽기 확정은 '함께 기록'을 켰을 때만, 현장 메모 반영과 제외는 바꾸지 않는다.
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { applyPlanCheck, canConfirmPlan, lastPlanCheck } from '../src/lib/planCheck.js'
import { checkedOf, staleRosterCount } from '../src/lib/handoverRows.js'

const g = globalThis
g.window = g.window || { location: { pathname: '/console/roster' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const { useMiriStore } = await import('../src/store/useMiriStore.js')
const seedPersons = useMiriStore.getState().persons.map((p) => ({ ...p }))
const reset = () => useMiriStore.setState({ persons: seedPersons.map((p) => ({ ...p })) })
const by = { role: 'city', name: '시 재난부서 관리자' }

test('확인 완료를 누르면 마지막 확인이 오늘이 되고 재확인 필요 인원이 하나 준다(계산 숫자와 무관)', () => {
  reset()
  const now = Date.now()
  const before = staleRosterCount(useMiriStore.getState().persons, now)
  const stale = useMiriStore.getState().persons.find((p) => checkedOf(p, now).stale)
  useMiriStore.getState().confirmPlanCheck(stale.code, { by })
  const after = useMiriStore.getState().persons
  assert.equal(staleRosterCount(after, Date.now()), before - 1)
  const p = after.find((x) => x.code === stale.code)
  assert.equal(checkedOf(p, Date.now()).stale, false)
  assert.equal(lastPlanCheck(p).by.name, '시 재난부서 관리자')
  assert.equal(lastPlanCheck(p).via, 'manual')
  assert.equal(after.length, seedPersons.length)
})

test('편집 저장은 함께 기록을 켰을 때만 마지막 확인을 바꾼다', () => {
  reset()
  const now = Date.now()
  const stale = useMiriStore.getState().persons.filter((p) => checkedOf(p, now).stale)
  useMiriStore.getState().updatePerson(stale[0].code, { tags: stale[0].tags })
  assert.equal(useMiriStore.getState().persons.find((p) => p.code === stale[0].code).planCheckedAt, stale[0].planCheckedAt)
  useMiriStore.getState().updatePerson(stale[1].code, { tags: stale[1].tags }, { by, via: 'edit' })
  const p = useMiriStore.getState().persons.find((x) => x.code === stale[1].code)
  assert.equal(checkedOf(p, Date.now()).stale, false)
  assert.equal(lastPlanCheck(p).via, 'edit')
})

test('서류 읽기 확정은 함께 기록을 켰을 때만, 제외는 켜도 기록하지 않는다', () => {
  reset()
  const s = useMiriStore.getState()
  const doc = s.intakeDocs.find((d) => d.results?.length >= 2)
  assert.ok(doc, '시드에 판독 결과가 둘 이상인 서류')
  const [r1, r2] = doc.results
  const p1Before = s.persons.find((p) => p.code === r1.personCode)
  s.reviewResult(doc.id, r1.personCode, 'reject', {}, { by })
  assert.equal(useMiriStore.getState().persons.find((p) => p.code === r1.personCode).planCheckedAt, p1Before?.planCheckedAt)
  s.reviewResult(doc.id, r2.personCode, 'confirm', {}, { by })
  const p2 = useMiriStore.getState().persons.find((p) => p.code === r2.personCode)
  assert.equal(lastPlanCheck(p2).via, 'intake')
  assert.equal(checkedOf(p2, Date.now()).stale, false)
})

test('현장 메모 반영은 당사자 확인이 아니므로 마지막 확인을 바꾸지 않는다', () => {
  reset()
  const s = useMiriStore.getState()
  const note = s.fieldNotes.find((n) => n.personCode && s.persons.some((p) => p.code === n.personCode))
  if (!note) return
  const before = s.persons.find((p) => p.code === note.personCode).planCheckedAt
  s.reviewFieldNote(note.id, 'apply', { grade: 'assist', tags: [] })
  assert.equal(useMiriStore.getState().persons.find((p) => p.code === note.personCode).planCheckedAt, before)
})

test('동 담당자는 자기 동 대상자만 확인 완료를 기록할 수 있다', () => {
  const dongOf = (c) => c.split('-')[0]
  assert.equal(canConfirmPlan({ role: 'dong', dong: 'MS' }, { villageCode: 'MS-01' }, dongOf), true)
  assert.equal(canConfirmPlan({ role: 'dong', dong: 'MS' }, { villageCode: 'BH-01' }, dongOf), false)
  assert.equal(canConfirmPlan({ role: 'city' }, { villageCode: 'BH-01' }, dongOf), true)
  assert.equal(canConfirmPlan(null, { villageCode: 'BH-01' }, dongOf), false)
  const p = applyPlanCheck({ code: 'X', planChecks: [{ at: 1, via: 'manual' }] }, { at: 2, by, via: 'edit' })
  assert.equal(p.planChecks.length, 2)
  assert.equal(p.planCheckedAt, 2)
})

test('명부 화면: 확인 완료는 앱 안 확인 창, 저장 때 함께 기록 선택은 기본 꺼짐', () => {
  const src = readFileSync(new URL('../src/pages/console/RosterPage.jsx', import.meta.url), 'utf8')
  assert.match(src, /<Modal[\s\S]*당사자와 계획 확인 완료/)
  assert.match(src, /useState\(false\)[\s\S]*checkOnSave/)
  assert.doesNotMatch(src, /window\.confirm\(/)
  const intake = readFileSync(new URL('../src/pages/console/IntakePage.jsx', import.meta.url), 'utf8')
  assert.match(intake, /checkOnConfirm, setCheckOnConfirm\] = useState\(false\)/)
})
