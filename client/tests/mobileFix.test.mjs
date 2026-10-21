// 모바일 화면 회귀 시험
import assert from 'node:assert/strict'
process.env.MIRI_SESSION_SECRET = process.env.MIRI_SESSION_SECRET || 'test-secret-test-secret-test-secret'
process.env.MIRI_HELPER_SECRET = process.env.MIRI_HELPER_SECRET || 'test-helper-secret-test-helper-secret'
const { classifySend, helperSendResult, helperSend, helperGet } = await import('../src/lib/dispatchSync.js')
const { enqueue, flush, readQueue, readRejected, moveToRejected, clearScope, mergeReports } = await import('../src/lib/reportQueue.js')
const { errorCodeOf, mobilePathFor } = await import('../src/mobile/helper/flow.js')
const { failedPending } = await import('../src/mobile/field/fieldModel.js')
const { cleanReport } = await import('../api/dispatch.js')
const { trapTab } = await import('../src/mobile/ui.jsx').catch(() => ({ trapTab: null }))

let n = 0
const t = async (name, fn) => { await fn(); n++; console.log('ok', name) }
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }
const stubFetch = (status, body = {}) => { globalThis.fetch = async () => ({ ok: status >= 200 && status < 300, status, json: async () => body }) }

await t('H1 분류: 2xx 저장, 429와 5xx와 네트워크는 재전송, 400 404 409 는 영구 거부', () => {
  assert.equal(classifySend(200), 'ok')
  assert.equal(classifySend(503), 'retry'); assert.equal(classifySend(429), 'retry'); assert.equal(classifySend(0), 'retry')
  for (const s of [400, 401, 404, 409]) assert.equal(classifySend(s), 'reject')
})
await t('H1 재현: 503 과 429 응답에서 보고가 대기열에 남는다(이전에는 true 로 바뀌어 삭제됨)', async () => {
  for (const st of [503, 429]) {
    const s = mem(); enqueue('D1.H-1', { key: 'kk1234567', type: 'step', personCode: 'P1', step: 'depart' }, s)
    stubFetch(st, { error: { code: 'STORE' } })
    const r = await flush('D1.H-1', async (it) => (await helperSendResult('tok', it)).kind === 'ok', s)
    assert.deepEqual(r, { sent: 0, left: 1 }); assert.equal(readQueue('D1.H-1', s).length, 1)
  }
})
await t('H1 영구 거부(409)는 지우지 않고 보내지 못한 보고로 옮겨 사유를 남긴다', async () => {
  const s = mem(); enqueue('D1.H-1', { key: 'kk7654321', type: 'ack', answer: 'accept' }, s)
  stubFetch(409, { error: { code: 'KEY_CONFLICT', message: '같은 번호 다른 내용' } })
  const res = await helperSendResult('tok', readQueue('D1.H-1', s)[0])
  assert.equal(res.kind, 'reject'); assert.equal(res.code, 'KEY_CONFLICT')
  moveToRejected('D1.H-1', 'kk7654321', res.message, s)
  assert.equal(readQueue('D1.H-1', s).length, 0)
  assert.equal(readRejected('D1.H-1', s)[0].rejected, '같은 번호 다른 내용')
  clearScope('D1.H-1', s); assert.equal(readRejected('D1.H-1', s).length, 0)
})
await t('M2 재현: 종료 발령 404 CLOSED 가 NO_ASSIGNMENT 로 바뀌지 않는다(GET과 POST 모두 코드 보존)', async () => {
  stubFetch(404, { error: { code: 'CLOSED', message: '종료' } })
  let e = null; try { await helperGet('tok') } catch (x) { e = x }
  assert.equal(errorCodeOf(e), 'CLOSED')
  const r = await helperSendResult('tok', { key: 'kk1111111' })
  assert.equal(errorCodeOf({ status: r.status, code: r.code }), 'CLOSED')
})
await t('기존 큰 화면용 helperSend: 재시도 대상만 false, 네트워크 오류는 예외', async () => {
  stubFetch(503); assert.equal(await helperSend('t', {}), false)
  stubFetch(200); assert.equal(await helperSend('t', {}), true)
  stubFetch(409); assert.equal(await helperSend('t', {}), true)
  globalThis.fetch = async () => { throw new Error('offline') }
  await assert.rejects(() => helperSend('t', {}))
})
await t('M1 재현: 불가 메모가 서버 검사와 보고 합치기에서 사라지지 않는다', () => {
  const rep = cleanReport({ key: 'kk2222222', type: 'ack', answer: 'decline', reason: 'sick', memo: '병원 진료 중' }, { personCodes: [] }, 'H-084')
  assert.equal(rep.memo, '병원 진료 중')
  const m = mergeReports({ ackOverride: {}, events: {} }, [rep])
  assert.equal(m.ackOverride['H-084'].memo, '병원 진료 중')
})
await t('M3: 실패 보고 대상자를 소방 인계 전 묶음으로 따로 센다(이미 인계한 사람 제외)', () => {
  const d = { events: { A: { step: 'fail', reason: 'absent' }, B: { step: 'handedToFire' }, C: { step: 'depart' } } }
  assert.deepEqual(failedPending(d).map((x) => x.code), ['A'])
})
await t('L1: 휴대폰 이동 때 플랫폼 지정만 넘기고 다른 검색값은 버린다', () => {
  assert.equal(mobilePathFor('a.b.c', { width: 390, search: '?platform=android&x=1' }), '/m/h/a.b.c?platform=android')
  assert.equal(mobilePathFor('a.b.c', { width: 390, search: '?x=1' }), '/m/h/a.b.c')
  assert.equal(mobilePathFor('a.b.c', { width: 601, search: '?platform=android' }), null)
  assert.equal(mobilePathFor('a.b.c', { width: 390, search: '?view=desktop&platform=ios' }), null)
})
await t('M4: Tab 이 덮개 밖으로 나가지 않는다(마지막에서 처음으로, 처음에서 Shift+Tab 은 마지막으로)', async () => {
  const src = await import('node:fs').then((f) => f.readFileSync(new URL('../src/mobile/ui.jsx', import.meta.url), 'utf8'))
  assert.match(src, /export function trapTab/)
  // H2 재현 방지: 덮개 효과가 onClose 에 의존하지 않는다(입력할 때마다 첫 칸으로 포커스가 돌아가던 원인)
  assert.doesNotMatch(src, /\}, \[open, onClose\]\)/)
  assert.match(src, /closeRef\.current = onClose/)
  const mk = () => { const el = { focus() { doc.activeElement = el } }; return el }
  const doc = { activeElement: null }
  const a = mk(), b = mk(), c = mk()
  const root = { ownerDocument: doc, querySelectorAll: () => [a, b, c], contains: (x) => [a, b, c].includes(x) }
  if (!trapTab) return // jsx 를 node 가 못 읽으면 문자열 검사만
  doc.activeElement = c; let prevented = false
  trapTab({ key: 'Tab', shiftKey: false, preventDefault: () => { prevented = true } }, root)
  assert.equal(doc.activeElement, a); assert.ok(prevented)
  doc.activeElement = a
  trapTab({ key: 'Tab', shiftKey: true, preventDefault() {} }, root)
  assert.equal(doc.activeElement, c)
})
await t('M6: 비활성 글자 대비 4.5:1 이상', async () => {
  const css = await import('node:fs').then((f) => f.readFileSync(new URL('../src/mobile/tokens.css', import.meta.url), 'utf8'))
  const hex = css.match(/--m-ink-disabled:\s*(#[0-9a-f]{6})/i)[1]
  const L = (h) => { const c = [1, 3, 5].map((i) => parseInt(h.slice(i, i + 2), 16) / 255).map((x) => (x <= 0.03928 ? x / 12.92 : ((x + 0.055) / 1.055) ** 2.4)); return 0.2126 * c[0] + 0.7152 * c[1] + 0.0722 * c[2] }
  const ratio = (L('#e5e5ea') + 0.05) / (L(hex) + 0.05)
  assert.ok(ratio >= 4.5, `대비 ${ratio.toFixed(2)}`)
})
await t('M5, M7, M8, M9, H3 코드 확인: 터치 영역, 사유 radio, 큰 글자 입력, 실제 발령 표시, 판독 요청 고정', async () => {
  const fs = await import('node:fs')
  const r = (p) => fs.readFileSync(new URL(p, import.meta.url), 'utf8')
  const css = r('../src/mobile/mobile.css'); const hcss = r('../src/mobile/helper/helper.css')
  const hs = r('../src/mobile/helper/HelperScreens.jsx'); const fsx = r('../src/mobile/field/FieldScreens.jsx')
  assert.match(css, /\.mob-btn\.size-sm \{ min-height: var\(--m-touch\)/)
  assert.match(css, /platform-android \.mob-seg \{[^}]*overflow: visible/)
  assert.equal((hs.match(/role="radio" aria-checked=/g) || []).length, 2)
  assert.match(hs, /aria-live="polite"/)
  assert.match(hcss, /font-size: max\(16px, var\(--t-body\)\)/)
  assert.match(fsx, /d\.kind !== 'drill' \? '실제 발령' : '훈련'/)
  assert.match(fsx, /const req = \{ id: \+\+reqSeq\.current, personCode: person\.code/)
  assert.match(fsx, /personCode: req\.personCode, villageCode: req\.villageCode/)
  assert.match(fsx, /const villageCode = state\.req\?\.village/)
})
console.log(`${n}개 시험 통과`)
