// Cloud Functions 액션 점검: 액션 하나(main)에 OpenWhisk 웹 액션 모양 요청을 보내 client/api 핸들러 12개와 상태 확인이 모두 불리는지 본다.
// 저장소는 메모리 S3(client/tests/_fakeS3.mjs)와 MIRI_STORE=ncpobject. 외부 AI, 법령, 공공데이터 서버는 부르지 않는 요청만 보낸다.
//
// 실행
//   node server/action-smoke.mjs                       저장소 원본(server/ncpAction.cjs)으로 점검
//   node server/action-smoke.mjs <풀어 놓은 묶음 폴더>   build-action.mjs 가 만든 zip 을 푼 폴더로 점검(묶음에 빠진 파일이나 패키지가 있으면 실패)
// 시험(tests/ncpAction.test.mjs)도 이 파일의 runSmoke 를 쓴다
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const HANDLERS = ['dispatch', 'exp', 'hwpx', 'intake', 'law', 'lint', 'note', 'open', 'opendata', 'parse', 'session', 'workspace']

const json = (r) => { try { return JSON.parse(r.body) } catch { return null } }
// 어댑터가 낸 응답(없는 API, 서버 오류)이 아니라 핸들러가 직접 낸 응답인지
const fromHandler = (r) => {
  const b = json(r)
  if (r.statusCode === 404 && b?.error?.message === '없는 API') return false
  if (r.statusCode === 500 && b?.error?.code === 'SERVER') return false
  if (r.statusCode === 504 && b?.error?.code === 'TIMEOUT') return false
  return true
}

export async function runSmoke(main, { host = 'miri.test' } = {}) {
  const origin = `https://${host}`
  const base = { host, origin, 'x-real-ip': '203.0.113.7' }
  let cookie = ''
  const call = async (method, path, { query = '', body, type = 'application/json', headers = {} } = {}) => {
    const h = { ...base, ...(cookie ? { cookie } : {}), ...headers }
    const p = { __ow_method: method.toLowerCase(), __ow_path: path, __ow_query: query, __ow_headers: h }
    if (body !== undefined) {
      h['content-type'] = type
      p.__ow_body = Buffer.isBuffer(body) ? body.toString('base64') : typeof body === 'string' ? body : JSON.stringify(body)
    }
    return main(p)
  }
  const seen = {}
  const note = (name, r) => { assert.ok(fromHandler(r), `${name}: 핸들러까지 가지 못함 ${r.statusCode} ${r.body}`); seen[name] = r.statusCode; return r }

  // 상태 확인
  const health = await call('GET', '/api/health')
  assert.equal(health.statusCode, 200, health.body)
  assert.equal(json(health).store.kind, 'ncpobject')
  seen.health = 200
  // 없는 주소와 공용 파일은 막는다
  assert.equal((await call('GET', '/api/_guard')).statusCode, 404)
  assert.equal((await call('GET', '/api/nothing')).statusCode, 404)

  // session: 경로 앞의 /api 를 빼고 보내도(웹 액션 경로 모양) 같은 함수로 간다
  assert.equal(note('session', await call('POST', '/session', { body: { code: 'wrong' } })).statusCode, 401)
  const login = note('session', await call('POST', '/api/session', { body: { code: process.env.MIRI_DEMO_CODE } }))
  assert.equal(login.statusCode, 200, login.body)
  cookie = String(login.headers['set-cookie'] || '').split(';')[0]
  assert.ok(cookie.includes('='), '세션 쿠키')

  // dispatch: 저장, 조회, 종료
  const T0 = Date.UTC(2026, 9, 24, 5, 0)
  const state = { status: 'standby', kind: 'drill', speed: 60, realStart: T0, vStart: T0, issuedAt: T0, arrivals: {}, result: { assignments: [], unassigned: [] }, events: {}, ackOverride: {}, handovers: [], fireRequests: [] }
  const saved = note('dispatch', await call('POST', '/api/dispatch', { query: 'action=save', body: { state, dispatchId: 'Dact000001', rev: 1, briefs: {} } }))
  assert.equal(saved.statusCode, 200, saved.body)
  const st = note('dispatch', await call('GET', '/api/dispatch', { query: 'action=state' }))
  assert.equal(json(st).state.status, 'standby')
  assert.equal(note('dispatch', await call('DELETE', '/api/dispatch')).statusCode, 200)

  // workspace: 저장과 목록
  assert.equal(note('workspace', await call('PUT', '/api/workspace', { body: { item: { id: 'wact01', kind: 'doc', title: '점검', body: '본문' } } })).statusCode, 200)
  assert.deepEqual(json(note('workspace', await call('GET', '/api/workspace'))).items.map((x) => x.id), ['wact01'])

  // exp: 관리 조회(시연 코드 세션)
  const exp = note('exp', await call('GET', '/api/exp'))
  assert.ok([200, 401, 403].includes(exp.statusCode), exp.body)

  // lint, hwpx, parse: kordoc 이 묶음 안에서 실제로 돈다
  const lint = note('lint', await call('POST', '/api/lint', { body: { text: '1. 목적\n가. 이 계획은 시험임.', preset: '보고서' } }))
  assert.equal(lint.statusCode, 200, lint.body)
  assert.ok(Array.isArray(json(lint).gongmun))
  const hwpx = note('hwpx', await call('POST', '/api/hwpx', { body: { title: '점검 문서', markdown: '# 점검 문서\n\n본문 한 줄입니다.', preset: '보고서' } }))
  assert.equal(hwpx.statusCode, 200, String(hwpx.body).slice(0, 300))
  const file = Buffer.from(hwpx.body, 'base64')
  assert.equal(file.subarray(0, 2).toString(), 'PK', '이진 응답은 base64 로 돌려준다')
  const parsed = note('parse', await call('POST', '/api/parse', { query: 'name=check.hwpx', body: file, type: 'application/octet-stream' }))
  assert.equal(parsed.statusCode, 200, parsed.body)
  assert.ok(json(parsed).markdown.includes('본문 한 줄'), '만든 한글 문서를 다시 읽는다')

  // 외부 서버를 부르기 전에 끝나는 요청만 보낸다
  assert.equal(note('open', await call('GET', '/api/open')).statusCode, 200)
  note('opendata', await call('GET', '/api/opendata'))
  assert.equal(note('law', await call('POST', '/api/law', { body: {} })).statusCode, 400)
  note('intake', await call('POST', '/api/intake', { body: {} }))
  note('note', await call('POST', '/api/note', { body: {} }))

  for (const h of HANDLERS) assert.ok(h in seen, `${h} 를 부르지 않음`)
  return seen
}

// 메모리 S3 와 환경 변수를 준비하고 점검한다. 비밀 값은 시험용 가짜 값만 쓴다
export async function smokeWithFakeStore(actionDir) {
  const { startFakeS3 } = await import(pathToFileURL(join(here, '..', 'client', 'tests', '_fakeS3.mjs')).href)
  const s3 = await startFakeS3()
  const keep = { ...process.env }
  Object.assign(process.env, s3.env, { MIRI_STORE: 'ncpobject', MIRI_OBJECT_PREFIX: 'smoke/', MIRI_RUNTIME: 'ncp-action-smoke', MIRI_SESSION_SECRET: 'smoke-secret-0123456789abcdef', MIRI_DEMO_CODE: 'smoke-code', MIRI_ACCESS_LOG: '0' })
  delete process.env.REDIS_URL; delete process.env.REDIS_HOST; delete process.env.AI_LIVE
  try {
    const req = createRequire(join(actionDir, 'package.json'))
    const { main } = req(join(actionDir, 'server', 'ncpAction.cjs'))
    return await runSmoke(main)
  } finally {
    await s3.close()
    for (const k of Object.keys(process.env)) if (!(k in keep)) delete process.env[k]
    Object.assign(process.env, keep)
  }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  const dir = resolve(process.argv[2] || join(here, '..'))
  const seen = await smokeWithFakeStore(dir)
  console.log(JSON.stringify({ actionDir: dir, statusByHandler: seen, handlers: Object.keys(seen).length }, null, 2))
  process.exit(0)
}
