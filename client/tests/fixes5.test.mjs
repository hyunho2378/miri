// 회신 R30~R35 반영 회귀 시험: 도우미 배정 안내, 배정 문자, 기준 시각 형식
import assert from 'node:assert/strict'
import { dispatchSms, helperBrief, smsBytes } from '../src/lib/dispatchSim.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
const MIN = 60000
const result = {
  ctx: { vmap: { MS: { label: '망상동' }, BH: { label: '발한동' } }, deadlines: { MS: { completeBy: Date.UTC(2026, 9, 21, 5, 30) }, BH: { completeBy: Date.UTC(2026, 9, 21, 4, 10) } } },
  assignments: [{ vehicleCode: 'V-09', helperCodes: ['H-084', 'H-012'], trips: [
    { index: 2, village: 'BH', personCodes: ['P2', 'P3'], departAt: 2 * MIN },
    { index: 1, village: 'MS', personCodes: ['P1'], departAt: MIN }
  ] }]
}

t('도우미 안내: 재난 종류, 가장 이른 완료 기한, 첫 회차 마을, 동승 도우미, 인원', () => {
  const b = helperBrief({ result, me: 'H-084', scenario: { kind: 'fire' } })
  assert.equal(b.disaster, '산불')
  assert.equal(b.completeBy, Date.UTC(2026, 9, 21, 4, 10))
  assert.equal(b.meetVillage, '망상동')
  assert.deepEqual(b.villages, ['망상동', '발한동'])
  assert.deepEqual(b.coHelpers, ['H-012'])
  assert.equal(b.persons, 3)
})

t('도우미 안내: 배정 없는 도우미는 null', () => {
  assert.equal(helperBrief({ result, me: 'H-999' }), null)
})

t('배정 문자: 훈련 표시, 재난 종류, 마을, 인원, 완료 기한 포함, 바이트와 단문 장문 구분', () => {
  const b = helperBrief({ result, me: 'H-084', scenario: { kind: 'fire' }, hazardLabel: '산불' })
  const sms = dispatchSms(b, { drill: true })
  assert.match(sms.text, /^\[미리 훈련\] 산불 대피 이송 배정입니다\. 망상동, 발한동, 3명 \d\d:\d\d까지 이송 완료\./)
  assert.equal(sms.bytes, smsBytes(sms.text))
  assert.equal(sms.kind, sms.bytes <= 90 ? '단문' : '장문')
})

t('문자 바이트: 한글 2, 영숫자 1', () => {
  assert.equal(smsBytes('가a1'), 4)
})

console.log(`\n${n}개 시험 통과`)
