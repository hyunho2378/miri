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

test('Q3 저장 대기(1.5초) 중 새로고침이나 탭 닫기: 기다리지 않고 바로 저장하고, 떠나는 저장은 역할 맞추기를 기다리지 않음', async () => {
  const s = src('src/store/useDispatchStore.js')
  assert.match(s, /addEventListener\?\.\('pagehide', flushPendingSave\)/)
  assert.match(s, /visibilityState === 'hidden'\) flushPendingSave\(\)/)
  assert.match(s, /syncSave\(\{ leaving: true \}\)/)
  const { saveRemote, setRoleAlign } = await import('../src/lib/dispatchSync.js')
  let aligned = 0
  setRoleAlign(async () => { aligned += 1 })
  const orig = globalThis.fetch
  const sent = []
  globalThis.fetch = async (url, init) => { sent.push(init?.method); return { ok: true, status: 200, json: async () => ({ dispatchId: 'Dqa00001', tokens: {} }) } }
  try {
    const d = { kind: 'drill', status: 'sent', result: null, remote: {} }
    await saveRemote(d, {}, { dispatchId: 'Dqa00001', rev: 2, leaving: true })
    assert.equal(aligned, 0)
    assert.deepEqual(sent, ['POST'])
    await saveRemote(d, {}, { dispatchId: 'Dqa00001', rev: 3 })
    assert.equal(aligned, 1)
  } finally { globalThis.fetch = orig; setRoleAlign(null) }
})

test('Q4 공공데이터 조회 실패: NO_KEY, HTTP 502 같은 내부 코드를 화면에 그대로 보이지 않음', async () => {
  const { openDataErrorText } = await import('../src/lib/openDataError.js')
  assert.equal(openDataErrorText('NO_KEY'), '연계 인증키 미설정')
  assert.equal(openDataErrorText('UPSTREAM'), '기관 서버 응답 오류')
  assert.equal(openDataErrorText('HTTP 502'), '서버 응답 오류')
  assert.equal(openDataErrorText('HTTP 404'), '요청 거부')
  assert.equal(openDataErrorText('Failed to fetch'), '연결 끊김')
  assert.equal(openDataErrorText(''), '사유 미확인')
  for (const code of ['NO_KEY', 'UPSTREAM', 'HTTP 500', 'TypeError: x']) assert.doesNotMatch(openDataErrorText(code), /[A-Z_]{3,}|HTTP/)
  for (const f of ['src/pages/console/OverviewPage.jsx', 'src/components/miri/FireRiskStrip.jsx', 'src/components/miri/PublicFactsCard.jsx', 'src/components/miri/DisasterAlertsCard.jsx']) {
    const s = src(f)
    assert.doesNotMatch(s, /\(\$\{[a-z]+\.error\}\)|\(\{s\.error\}\)|\(\{error\}\)|\$\{s\.error \|\|/, f)
  }
})

test('Q5 상황판, 개인정보 처리방침, 개방 API, 페이지 없음: 이전 화면 탭 제목이 남지 않게 제목을 정하고 상황판에 화면 제목(h1)을 둠', async () => {
  const { pageTitle } = await import('../src/hooks/usePageTitle.js')
  assert.equal(pageTitle('상황판'), '상황판 | 미리')
  for (const [f, t] of [['src/pages/console/MapPage.jsx', '상황판'], ['src/pages/public/PrivacyPage.jsx', '개인정보 처리방침'], ['src/pages/public/OpenApiPage.jsx', '개방 API'], ['src/pages/public/NotFoundPage.jsx', '페이지 없음']]) {
    assert.match(src(f), new RegExp(`usePageTitle\\('${t}'\\)`), f)
  }
  assert.match(src('src/pages/console/MapPage.jsx'), /<h1 className="sr-only">상황판<\/h1>/)
})
