// 플랫폼 AI 협업 툴 셀 41(발령 실수 방지 확인창) 검토 반영 시험
import assert from 'node:assert/strict'
import { sendConfirmLines, handoverConfirmLines } from '../src/lib/confirmSummary.js'
let n = 0
const t = (name, fn) => { fn(); n += 1; console.log('ok', name) }
const result = { assignments: [
  { vehicleCode: 'V1', helperCodes: ['H1'], trips: [{ personCodes: ['A', 'B'] }, { personCodes: ['C'] }] },
  { vehicleCode: 'V2', helperCodes: ['H2', 'H1'], trips: [{ personCodes: ['D'] }] }
], unassigned: [{ personCode: 'E' }] }
t('전송 요약: 인원, 차량, 도우미, 미배정', () => {
  const l = sendConfirmLines(result)
  assert.equal(l[0], '배정 4명, 차량 2대, 도우미 2명에게 배정표를 보냅니다.')
  assert.ok(l[1].includes('1명은 소방 인계 목록'))
})
t('전송 요약: 미배정 0명이면 인계 줄 없음', () => {
  const l = sendConfirmLines({ ...result, unassigned: [] })
  assert.equal(l.length, 2)
  assert.ok(!l.join(' ').includes('소방 인계'))
})
t('소방 인계 요약: 선택 인원과 마을별 수, 기준 시각', () => {
  const rows = [{ code: 'A', village: 'MS-05' }, { code: 'B', village: 'MS-05' }, { code: 'C', village: 'BG-01' }, { code: 'D', village: 'BG-01' }]
  const l = handoverConfirmLines(rows, ['A', 'B', 'C'], (v) => (v === 'MS-05' ? '만우동' : '부곡 1'), '15:24')
  assert.equal(l[0], '선택한 구조 대상 3명의 목록을 동해소방서에 넘깁니다.')
  assert.equal(l[1], '마을별: 만우동 2명, 부곡 1 1명')
  assert.equal(l[2], '목록 기준 시각 15:24')
})
t('문구 규칙: 이모지와 과장 문구 없음', () => {
  const all = [...sendConfirmLines(result), ...handoverConfirmLines([{ code: 'A', village: 'X' }], ['A'])].join(' ')
  assert.ok(!/[\u{1F300}-\u{1FAFF}\u2600-\u27BF]/u.test(all))
  assert.ok(!all.includes('긴급 구조 요청') && !all.includes('취소 불가'))
})
console.log(`confirmSummary ${n}개 통과`)
