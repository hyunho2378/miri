// 사무국 안내(2026. 10. 22.): 실시간 AI 호출 스위치가 꺼져 있으면 외부 호출 없이 저장된 결과 안내를 돌려준다
import test from 'node:test'
import assert from 'node:assert/strict'

const mkRes = () => { const r = { code: 0, body: null, status(c) { r.code = c; return r }, json(b) { r.body = b; return r }, setHeader() {} }; return r }
const run = async (mod, body) => {
  delete process.env.AI_LIVE
  let calls = 0
  const orig = globalThis.fetch
  globalThis.fetch = async (...a) => { calls += 1; return orig(...a) }
  try {
    const { default: handler } = await import(mod)
    const res = mkRes()
    await handler({ method: 'POST', headers: {}, body }, res)
    return { res, calls }
  } finally { globalThis.fetch = orig }
}

test('AI_LIVE 꺼짐: 서류 읽기는 외부 호출 0회, STORED_ONLY 안내', async () => {
  const { res, calls } = await run('../api/intake.js', { mimeType: 'image/png', data: 'iVBORw0KGgo=', virtualOnly: true })
  assert.equal(calls, 0)
  assert.equal(res.code, 409)
  assert.equal(res.body.error.code, 'STORED_ONLY')
})

test('AI_LIVE 꺼짐: 현장 소식은 외부 호출 0회, STORED_ONLY 안내', async () => {
  const { res, calls } = await run('../api/note.js', { text: '휠체어를 타고 이동하세요', virtualOnly: true, current: { grade: 'assist', tags: [] } })
  assert.equal(calls, 0)
  assert.equal(res.code, 409)
  assert.equal(res.body.error.code, 'STORED_ONLY')
})

test('AI 정보 창에 시연 방식 한 줄, 80자 이하', async () => {
  const { AI_CARD } = await import('../src/lib/aiCard.js')
  const row = AI_CARD.flatMap((s) => s.rows).find((r) => r.k === '실시간 호출')
  assert.ok(row && /저장된 판독 결과/.test(row.v) && row.v.length <= 80)
})
