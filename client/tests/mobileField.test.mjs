// 현장 담당자 휴대폰 화면(F1~F5)의 파생 값. 콘솔과 같은 함수로 세는지, 범위와 정렬이 맞는지 확인
import assert from 'node:assert/strict'
import { deadlineTag, villageName, fieldSummary, villageProgress, helperResponses, unservedByReason, searchPersons, stepLabel } from '../src/mobile/field/fieldModel.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
const MIN = 60000
const T0 = Date.UTC(2026, 9, 21, 3, 0)
const villages = [{ code: 'A', name: '가마을' }, { code: 'B', name: '나마을' }]
const persons = [
  { code: 'A-1', villageCode: 'A', grade: 'assist' }, { code: 'A-2', villageCode: 'A', grade: 'walk' },
  { code: 'B-1', villageCode: 'B', grade: 'wheelchair' }, { code: 'B-2', villageCode: 'B', grade: 'bed' },
  { code: 'X-1', villageCode: 'X', grade: 'walk' }
]
const trip = { departAt: T0 + 10 * MIN, finishAt: T0 + 50 * MIN, personCodes: ['A-1', 'A-2'] }
const base = {
  status: 'sent', kind: 'drill', issuedAt: T0, realStart: 0, arrivals: { A: T0 + 120 * MIN, B: T0 + 60 * MIN },
  result: { assignments: [{ vehicleCode: 'V-1', helperCodes: ['H-1'], trips: [trip] }, { vehicleCode: 'V-2', helperCodes: ['H-2', 'H-3'], trips: [{ departAt: T0, finishAt: T0 + 30 * MIN, personCodes: ['B-1'] }] }], unassigned: [{ personCode: 'B-2', reason: 'capacity' }] },
  events: {}, ackPlan: { 'H-1': { answer: 'accept', at: T0 + MIN } }, ackOverride: { 'H-2': { answer: 'decline', reason: 'far', at: T0 + 2 * MIN } }, failPlan: {},
  manualHelper: null, smsLog: [{ helper: 'H-3' }], scopeCodes: ['A-1', 'A-2', 'B-1', 'B-2'], fireRequests: []
}

t('발령 요약: 범위 밖 대상자는 세지 않고 완료, 진행, 대기, 미배정을 나눈다', () => {
  const s = fieldSummary(base, persons, villages, T0 + 60 * MIN)
  assert.equal(s.total, 4)
  assert.equal(s.counts.done, 3)
  assert.equal(s.counts.unassigned, 1)
  assert.equal(s.elapsedMin, 60)
})
t('다음 기한 마을: 아직 남은 대상자가 있는 가장 이른 기한', () => {
  const s = fieldSummary(base, persons, villages, T0 + 5 * MIN)
  assert.equal(s.next.code, 'B')
  assert.equal(s.next.name, '나마을')
})
t('마을별 진행은 기한 임박 순이고 차량과 도우미를 모은다', () => {
  const list = villageProgress(base, persons, villages, T0 + 5 * MIN)
  assert.deepEqual(list.map((v) => v.code), ['B', 'A'])
  assert.deepEqual(list[0].vehicles, ['V-2'])
  assert.equal(list[0].issue, 1)
})
t('도우미 응답: 수락, 불가(사유), 무응답(문자 발송 수)', () => {
  const g = helperResponses(base, T0 + 5 * MIN)
  assert.deepEqual(g.accept.map((h) => h.code), ['H-1'])
  assert.equal(g.decline[0].reason, 'far')
  assert.equal(g.none[0].code, 'H-3')
  assert.equal(g.none[0].sms, 1)
})
t('미배정 사유별 인원은 이미 소방 인계한 사람을 빼고 센다', () => {
  assert.equal(unservedByReason(base).total, 1)
  const d2 = { ...base, events: { 'B-2': { step: 'handedToFire' } } }
  assert.equal(unservedByReason(d2).total, 0)
})
t('대상자 검색: 번호와 마을 이름', () => {
  assert.equal(searchPersons(persons, villages, 'b-').length, 2)
  assert.equal(searchPersons(persons, villages, '가마을').length, 2)
  assert.equal(stepLabel('unassigned'), '미배정')
})
t('마을 이름은 store 의 label 을 먼저 쓴다(코드 그대로 보이지 않게)', () => {
  assert.equal(villageName([{ code: 'MH-01', label: '묵호진동' }], 'MH-01'), '묵호진동')
  assert.equal(villageName([], 'ZZ'), 'ZZ')
})
t('마을 기한 표시: 지남, 임박, 없음', () => {
  assert.equal(deadlineTag({ at: T0, total: 3, done: 1, issue: 0 }, T0 + MIN), 'over')
  assert.equal(deadlineTag({ at: T0 + 30 * MIN, total: 3, done: 1, issue: 0 }, T0), 'soon')
  assert.equal(deadlineTag({ at: T0, total: 3, done: 2, issue: 1 }, T0 + MIN), null)
})
console.log(`${n}개 시험 통과`)
