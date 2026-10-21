// 도우미 모바일 화면 흐름(H0~H9), 전송 대기열 연동, 플랫폼 분기
import assert from 'node:assert/strict'
import { screenOf, stepsByPerson, progressOf, lastAck, remainText, errorCodeOf, telOf, mobilePathFor, NEXT_STEP } from '../src/mobile/helper/flow.js'
import { enqueue, flush, readQueue } from '../src/lib/reportQueue.js'
import { resolvePlatform, bodyClassFor } from '../src/mobile/platform.js'

let n = 0
const t = async (name, fn) => { await fn(); n++; console.log('ok', name) }
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }

await t('화면 전이: 동의 전 H0, 응답 전 H1, 불가 선택 중 H2, 수락 뒤 H3, 끝나면 H9', () => {
  assert.equal(screenOf({ consented: false }), 'H0')
  assert.equal(screenOf({ consented: true, ack: null }), 'H1')
  assert.equal(screenOf({ consented: true, ack: null, declining: true }), 'H2')
  assert.equal(screenOf({ consented: true, ack: { answer: 'accept' } }), 'H3')
  assert.equal(screenOf({ consented: true, ack: { answer: 'accept' }, finished: true }), 'H9')
  assert.equal(screenOf({ consented: true, ack: { answer: 'decline' } }), 'H9')
})
await t('오류 상태: 종료 발령, 만료와 교체 링크, 연결 실패', () => {
  assert.equal(screenOf({ error: { code: 'CLOSED' } }), 'closed')
  assert.equal(screenOf({ error: { code: 'NO_ASSIGNMENT' } }), 'expired')
  assert.equal(screenOf({ error: { code: 'EXPIRED' } }), 'expired')
  assert.equal(screenOf({ error: { code: 'NETWORK' } }), 'error')
  assert.equal(errorCodeOf({ status: 404, code: 'CLOSED' }), 'CLOSED')
  assert.equal(errorCodeOf({ status: 404 }), 'NO_ASSIGNMENT')
  assert.equal(errorCodeOf({ status: 401 }), 'BAD_TOKEN')
  assert.equal(errorCodeOf(new TypeError('fetch failed')), 'NETWORK')
})
await t('단계 계산: 나중 보고가 이기고, 진행과 현재 대상자', () => {
  const codes = ['A', 'B', 'C']
  const reports = [
    { type: 'step', personCode: 'A', step: 'depart', at: 1 }, { type: 'step', personCode: 'A', step: 'handover', at: 5 },
    { type: 'step', personCode: 'B', step: 'fail', at: 6 }, { type: 'ack', answer: 'accept', at: 0 }, { type: 'step', personCode: 'Z', step: 'depart', at: 2 }
  ]
  const s = stepsByPerson(codes, reports)
  assert.deepEqual(s, { A: 'handover', B: 'fail', C: 'wait' })
  const p = progressOf(codes, s)
  assert.deepEqual([p.done, p.failed, p.current, p.finished], [1, 1, 'C', false])
  assert.equal(progressOf(codes, { A: 'handover', B: 'fail', C: 'handover' }).finished, true)
  assert.equal(lastAck(reports).answer, 'accept')
  assert.equal(NEXT_STEP.wait.step, 'depart'); assert.equal(NEXT_STEP.board.step, 'handover'); assert.equal(NEXT_STEP.handover, undefined)
})
await t('기한 표시: 남은 시간과 지남', () => {
  const now = 1_000_000_000_000
  assert.equal(remainText(now + 95 * 60000, now).text, '1시간 35분 남음')
  assert.equal(remainText(now + 20 * 60000, now).text, '20분 남음')
  const o = remainText(now - 7 * 60000, now); assert.equal(o.over, true); assert.equal(o.text, '기한 7분 지남')
  assert.equal(remainText(null, now), null)
})
await t('대기열 연동: 화면 보고는 대기열에 먼저, 끊기면 남고 연결되면 한 번씩 전송', async () => {
  const st = mem(); const scope = 'd1.H-084'
  enqueue(scope, { type: 'ack', answer: 'accept' }, st)
  enqueue(scope, { type: 'step', personCode: 'P1', step: 'depart' }, st)
  let r = await flush(scope, async () => false, st)
  assert.equal(r.left, 2)
  const sent = []
  r = await flush(scope, async (it) => { sent.push(it.type); return true }, st)
  assert.deepEqual([r.sent, r.left], [2, 0]); assert.deepEqual(sent, ['ack', 'step']); assert.equal(readQueue(scope, st).length, 0)
})
await t('휴대폰 폭이면 /m/h 로, 큰 화면과 view=desktop 은 그대로', () => {
  assert.equal(mobilePathFor('demo', { width: 390 }), '/m/h/demo')
  assert.equal(mobilePathFor('ab.cd.ef', { width: 600 }), '/m/h/ab.cd.ef')
  assert.equal(mobilePathFor('demo', { width: 1024 }), null)
  assert.equal(mobilePathFor('demo', { width: 390, search: '?view=desktop' }), null)
  assert.equal(mobilePathFor('', { width: 390 }), null)
})
await t('플랫폼 분기: 안드로이드 휴대폰은 M3, 아이폰은 iOS, 큰 글자 클래스', () => {
  assert.equal(resolvePlatform({ userAgent: 'Mozilla/5.0 (Linux; Android 14)' }).platform, 'android')
  assert.equal(resolvePlatform({ userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 18_0)' }).platform, 'ios')
  assert.ok(bodyClassFor('ios', true).includes('text-large'))
})
await t('전화 바로가기: 번호가 있을 때만', () => {
  assert.equal(telOf('발령 담당자 033-530-2000'), 'tel:0335302000')
  assert.equal(telOf('발령 담당자, 문자 회신'), null)
})
console.log(`\n${n}개 시험 통과`)
