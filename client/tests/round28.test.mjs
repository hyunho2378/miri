// 28회차 반영: 대피소 승강기 확인(플랫폼 셀 77), 무응답 알림 기준을 대체 배정과 같은 요청 시각으로
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { shelterLiftRows, shelterAccess, tripCheckNotes } from '../src/lib/tripChecks.js'
import { detectAnomalies } from '../src/lib/anomaly.js'

const shelters = [
  { code: 'TS-01', name: '가 대피소', capacity: 170, liftAccess: null },
  { code: 'TS-02', name: '나 대피소', capacity: 312, liftAccess: true, liftCheckedAt: 1 },
  { code: 'TS-03', name: '다 대피소', capacity: 106, liftAccess: false }
]
const villages = [{ code: 'A', shelterCode: 'TS-01' }, { code: 'B', shelterCode: 'TS-02' }, { code: 'C', shelterCode: 'TS-03' }]
const persons = [
  { code: 'p1', villageCode: 'A', grade: 'wheelchair' }, { code: 'p2', villageCode: 'A', grade: 'assist' },
  { code: 'p3', villageCode: 'B', grade: 'bed' }, { code: 'p4', villageCode: 'C', grade: 'walk' }
]

test('셀 77: 휠체어와 침상 대상자가 가는 대피소 중 승강기 미확인과 없음만 확인 필요', () => {
  const rows = shelterLiftRows(shelters, villages, persons)
  const by = Object.fromEntries(rows.map((r) => [r.code, r]))
  assert.equal(by['TS-01'].liftNeed, 1)
  assert.equal(by['TS-01'].liftAlert, true)
  assert.equal(by['TS-02'].liftAlert, false)
  assert.equal(by['TS-03'].liftNeed, 0)
  assert.equal(by['TS-03'].liftAlert, false)
  assert.equal(rows[0].code, 'TS-01')
})

test('셀 77: 확인 기록이 들어가면 배정표 확인 표시가 사라짐, 문구는 승강기와 진입로', () => {
  assert.equal(shelterAccess({ liftAccess: true }).liftUnchecked, false)
  const notes = tripCheckNotes({ companionCall: [], caregiverUnreachable: [], commCaution: [], liftUnchecked: ['가 대피소'], routeCheck: false })
  assert.match(notes[0].text, /대피소 확인: 가 대피소\(승강기, 진입로\)/)
  const store = readFileSync(new URL('../src/store/useMiriStore.js', import.meta.url), 'utf8')
  assert.match(store, /updateShelter:/)
  assert.match(store, /liftCheckedAt: s\.today/)
})

test('무응답 알림: 대체 도우미는 요청 시각 기준, 처음 도우미는 전송 시각 기준', () => {
  const MIN = 60000
  const base = { persons: [], vehicles: [], helpers: [], villages: [], settings: { noAckMinutes: 10, helperLoadMax: 99, pendingDays: 99, contractWarnDays: 0 }, now: 0 }
  const dispatch = { result: { unassigned: [], assignments: [] }, sentAt: 1 * MIN, now: 16 * MIN, acks: { H1: { answer: 'none' }, H2: { answer: 'none', requestedAt: 8 * MIN } } }
  const out = detectAnomalies({ ...base, dispatch }).filter((a) => a.rule === 'noAck')
  assert.deepEqual(out.map((a) => a.target), ['H1'])
  assert.match(out[0].value, /전송 후 15분 무응답/)
  const later = detectAnomalies({ ...base, dispatch: { ...dispatch, now: 20 * MIN } }).filter((a) => a.rule === 'noAck')
  assert.equal(later.find((a) => a.target === 'H2').value, '대체 요청 후 12분 무응답')
})
