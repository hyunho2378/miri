// 완성도 점검(2026. 11. 14.)에서 실제 브라우저로 재현한 오류의 회귀 시험
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { enqueue, flush, moveToRejected, readQueue, readRejected } from '../src/lib/reportQueue.js'
import { remoteSendOutcome } from '../src/lib/dispatchSync.js'

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }

test('Q1 큰 화면 도우미 링크: 교체된 도우미의 보고(404 NO_ASSIGNMENT)는 성공으로 지우지 않고 종료 안내로 바뀜', async () => {
  assert.equal(remoteSendOutcome({ kind: 'ok', status: 200 }), 'ok')
  assert.equal(remoteSendOutcome({ kind: 'retry', status: 503 }), 'retry')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 404, code: 'NO_ASSIGNMENT' }), 'end')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 404, code: 'CLOSED' }), 'end')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 401, code: 'BAD_SIG' }), 'end')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 409, code: 'CONFLICT' }), 'reject')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 400, code: 'BAD_REPORT' }), 'reject')
  // 대기열: 종료 응답이면 보고가 남아 있고, 영구 거부는 '보내지 못한 보고'로 옮겨 남음
  const st = mem()
  enqueue('D1.H1', { key: 'k1', type: 'ack', answer: 'accept' }, st)
  const r = await flush('D1.H1', async () => false, st)
  assert.equal(r.left, 1)
  moveToRejected('D1.H1', 'k1', '형식 오류', st)
  assert.equal(readQueue('D1.H1', st).length, 0)
  assert.equal(readRejected('D1.H1', st)[0].rejected, '형식 오류')
})

test('Q1 RemoteHelper 는 거부 응답을 성공으로 처리하던 helperSend 를 쓰지 않고 결과별로 처리', () => {
  const s = src('src/pages/helper/RemoteHelper.jsx')
  assert.ok(!/helperSend\b(?!Result)/.test(s.replace(/helperSendResult/g, '')))
  assert.match(s, /remoteSendOutcome\(res\)/)
  assert.match(s, /moveToRejected\(scope/)
  assert.match(s, /보내지 못한 보고/)
  // 보낼 보고가 없어도 주기적으로 배정을 다시 받아 교체와 종료를 알아챔
  assert.match(s, /readQueue\(scope\)\.length\) send\(\); else load\(\)/)
})

test('Q2 도우미 링크 화면: 바깥 레이아웃 main 안에 main 을 다시 두지 않음, 서명 링크에는 이 기기의 평시 표시를 숨김', () => {
  const s = src('src/pages/helper/RemoteHelper.jsx')
  assert.equal((s.match(/<main/g) || []).length, 0)
  const l = src('src/components/layout/HelperLayout.jsx')
  assert.match(l, /<main id="main"/)
  assert.match(l, /showLocalDispatchPill\(pathname\) && <DispatchStatusPill/)
  const re = new RegExp(l.match(/showLocalDispatchPill = \(pathname\) => \/(.+)\/\.test/)[1])
  assert.ok(re.test('/h/demo'))
  assert.ok(!re.test('/h/Dabc123.H-084.1794631434.sig'))
})
