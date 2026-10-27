// 45회차 1026 인터뷰 반영(동해시노인종합복지관 주간보호센터, 망상동 행정복지센터 재난 담당) 회귀 시험
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { buildSeed, boardingNoteOf } from '../src/mock/seed.js'
import { computeShortage, optimizedUnserved } from '../src/lib/shortageCalc.js'
import { personCare } from '../src/lib/tripChecks.js'
import { HELPER_AFFILIATIONS, VEHICLE_NOTE } from '../src/lib/shortage.js'
import { applyPlanCheck, PLAN_CHECK_WITH, planWithLabel } from '../src/lib/planCheck.js'
import { FOLLOW_UPS, followUpKindFor, lastFollowUp, needsFollowUp } from '../src/lib/noAckFollowUp.js'

const read = (p) => readFileSync(new URL(p, import.meta.url), 'utf8')

test('R45 숫자 산식 그대로: 기준 291, 추천 267, 대상 848', () => {
  const seed = buildSeed()
  const r = computeShortage({ ...seed, scenario: seed.scenarios[0], t0: seed.today })
  assert.equal(r.total, 291)
  assert.equal(optimizedUnserved(r), 267)
  assert.equal(r.scopeTargets, 848)
})

test('R45 탑승 메모: 시연 일부에만 값, 돌봄 정보가 없어도 메모는 보이고 이름은 없음', () => {
  const seed = buildSeed()
  const withNote = seed.persons.filter((p) => p.boardingNote)
  assert.ok(withNote.length > 0 && withNote.length < seed.persons.length / 5)
  for (const p of withNote) assert.equal(p.boardingNote, boardingNoteOf(p.grade, Number(p.code.split('-').pop())))
  assert.equal(personCare({ boardingNote: '왼쪽 편마비' }).boardingNote, '왼쪽 편마비')
  assert.equal(personCare({ care: { aids: [] } }).boardingNote, '')
  assert.ok(withNote.every((p) => !/[0-9]{3}-[0-9]{4}/.test(p.boardingNote)))
})

test('R45 탑승 메모는 도우미 화면에서 수락한 경우에만 보임', () => {
  const src = read('../src/mobile/helper/HelperScreens.jsx')
  assert.match(src, /m\.accepted && d\?\.care\?\.boardingNote/)
  assert.match(src, /m\.accepted && <Kv label="탑승 메모"/)
  assert.match(read('../src/pages/public/PrivacyPage.jsx'), /탑승 메모\(앉을 자리와 보조기구 보관\)는 이름 없이 수락한 도우미에게만/)
})

test('R45 도우미 소속에 생활지원사와 요양보호사 자격 보유자, 기존 소속 그대로', () => {
  assert.equal(HELPER_AFFILIATIONS.careWorker, '생활지원사(유케어센터)')
  assert.equal(HELPER_AFFILIATIONS.licensedCare, '요양보호사 자격 보유자')
  for (const k of ['leader', 'disasterCorps', 'civic', 'officer', 'volunteer', 'other']) assert.ok(HELPER_AFFILIATIONS[k])
})

test('R45 당사자와 확인한 사람: 담당 공무원 직접, 통장, 반장을 기록에 남김', () => {
  assert.deepEqual(Object.values(PLAN_CHECK_WITH), ['담당 공무원 직접', '통장', '반장'])
  const p = applyPlanCheck({ code: 'X' }, { at: 1, by: { role: 'dong', name: '동 담당자' }, via: 'manual', with: 'tongjang' })
  assert.equal(planWithLabel(p.planChecks[0]), '통장')
  assert.equal(planWithLabel(applyPlanCheck({}, { at: 1 }).planChecks[0]), '')
  assert.match(read('../src/lib/docTemplates.js'), /설명 담당자  □ 담당 공무원  □ 통장  □ 반장/)
})

test('R45 차량 문구: 장기요양 민간 기관 차량은 확인 전, 해군과 기업 통근 버스는 협약 후보', () => {
  assert.match(VEHICLE_NOTE, /장기요양 민간 기관 차량은 낮에는 이용 어르신이 먼저이고 근무 시간 밖에는 쓰기 어려워 확인 전 차량/)
  assert.match(VEHICLE_NOTE, /해군과 기업 통근 버스는 협약 후보/)
})

test('R45 S-1 설명에 발령 시점 가정과 실제 판단 순서', () => {
  const s1 = buildSeed().scenarios[0]
  assert.match(s1.basis, /발화 확인과 동시에 발령한다고 봅니다/)
  assert.match(s1.basis, /소방이 산불 진행 방향을 알려 준 뒤 동이 단계별로 대피를 판단/)
  assert.match(s1.basis, /출발 준비 시간 민감도/)
})

test('R45 무응답 다음 할 일: 세 가지, 동 담당자의 소방 인계는 시 관리자 요청으로', () => {
  assert.deepEqual(FOLLOW_UPS.map((f) => f.key), ['officerCall', 'broadcast', 'fire'])
  assert.equal(followUpKindFor('fire', 'city'), 'fire')
  assert.equal(followUpKindFor('fire', 'dong'), 'fireAsk')
  assert.equal(followUpKindFor('broadcast', 'dong'), 'broadcast')
  assert.equal(needsFollowUp({ code: 'H-1', answer: 'noack', replaced: 'H-2' }, new Set()), true)
  assert.equal(needsFollowUp({ code: 'H-1', answer: 'noack' }, new Set(['H-1'])), true)
  assert.equal(needsFollowUp({ code: 'H-1', answer: 'noack' }, new Set()), false)
  assert.equal(needsFollowUp({ code: 'H-1', answer: 'accept', replaced: 'H-2' }, new Set()), false)
  assert.equal(lastFollowUp([{ helper: 'H-1', kind: 'broadcast' }, { helper: 'H-1', kind: 'fire' }], 'H-1').kind, 'fire')
})

test('R45 무응답 다음 할 일 기록과 소방 인계 넘기기는 기존 소방 지원 요청 흐름을 씀', async () => {
  const { useDispatchStore } = await import('../src/store/useDispatchStore.js')
  const D = useDispatchStore
  D.getState().start({ kind: 'drill', speed: 60 })
  D.getState().runAssign()
  D.getState().confirmAndSend()
  const a = D.getState().result.assignments.find((x) => x.helperCodes.length)
  const h = a.helperCodes[0]
  const people = a.trips.flatMap((t) => t.personCodes)
  assert.equal(D.getState().followUp(h, 'broadcast', { role: 'city', name: '시 관리자' }), true)
  assert.equal(D.getState().fireRequests.length, 0)
  D.getState().followUp(h, 'fire', { role: 'city', name: '시 관리자' })
  const st = D.getState()
  assert.deepEqual(st.followUps.map((f) => f.kind), ['broadcast', 'fire'])
  assert.ok(!st.result.assignments.some((x) => x.helperCodes.includes(h)))
  for (const c of people) assert.equal(st.events[c]?.step, 'handedToFire')
  assert.equal(st.fireRequests.length, 1)
  D.getState().reset()
  assert.deepEqual(D.getState().followUps, [])
})
