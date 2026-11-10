// node tests/ncpAction.test.mjs  네이버 클라우드 Cloud Functions 진입점: 액션 하나(server/ncpAction.cjs 의 main)가 /api/<이름> 경로로
// client/api 핸들러 12개와 상태 확인을 모두 부른다. 저장소는 메모리 S3 와 MIRI_STORE=ncpobject(server/action-smoke.mjs)
import assert from 'node:assert/strict'
import { dirname, join } from 'node:path'
import { fileURLToPath } from 'node:url'
const g = globalThis
g.window = g.window || { location: { pathname: '/console/roster' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
const root = join(dirname(fileURLToPath(import.meta.url)), '..', '..')
const { smokeWithFakeStore, HANDLERS } = await import('../../server/action-smoke.mjs')
const seen = await smokeWithFakeStore(root)
assert.equal(HANDLERS.length, 12)
for (const h of [...HANDLERS, 'health']) assert.ok(h in seen, h)
console.log('ok Cloud Functions 액션 하나로 핸들러 12개와 상태 확인', JSON.stringify(seen))
