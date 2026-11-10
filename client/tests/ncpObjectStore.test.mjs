// node tests/ncpObjectStore.test.mjs  비용 0원 방침: 네이버 클라우드 Object Storage(S3 호환) 저장소가 Upstash, 표준 Redis 와 같은 결과를 내야 한다.
// 실제 Object Storage 대신 메모리 S3 서버(tests/_fakeS3.mjs, 실제 HTTP 와 서명 검사)를 쓴다.
// Lua 세 개(APPEND_LUA, SAVE_LUA, CLOSE_LUA)는 ioredis-mock 의 실제 Lua 실행 결과와 한 줄씩 비교한다
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
process.env.MIRI_SESSION_SECRET = 'test-secret-0123456789abcdef'
process.env.MIRI_DEMO_CODE = 'demo-code'
process.env.MIRI_ACCESS_LOG = '0'
const g = globalThis
g.window = { location: { pathname: '/console/roster' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }

const require = createRequire(import.meta.url)
const Mock = require('ioredis-mock')
const { startFakeS3 } = await import('./_fakeS3.mjs')
const S = await import('../api/_store.js')
const O = await import('../api/_objectStore.js')
const { ObjectStore, objectConfig, signRequest, globToRegExp } = O
const { APPEND_LUA, SAVE_LUA, CLOSE_LUA } = await import('../api/dispatch.js')

const s3 = await startFakeS3()
const slow = await startFakeS3({ delayMs: 15 })
let seq = 0
// 시험마다 다른 접두어를 써서 서로 섞이지 않게 한다
const objStore = (srv = s3) => new ObjectStore({ ...srv.env, MIRI_OBJECT_PREFIX: `t${++seq}/` })

try {
  await ok('저장소 고르기: MIRI_STORE=ncpobject 는 버킷과 키가 있을 때만, 미설정이면 기존 순서(Upstash) 그대로', async () => {
    const full = { NCP_OBJECT_BUCKET: 'b', NCP_OBJECT_ACCESS_KEY: 'a', NCP_OBJECT_SECRET_KEY: 's' }
    assert.equal(S.storeKind({ MIRI_STORE: 'ncpobject', ...full }), 'ncpobject')
    assert.equal(S.storeKind({ MIRI_STORE: 'ncpobject', NCP_OBJECT_BUCKET: 'b' }), null, '키가 없으면 저장소 없음')
    assert.equal(S.storeKind({ ...full, UPSTASH_REDIS_REST_URL: 'https://u', UPSTASH_REDIS_REST_TOKEN: 't' }), 'upstash', '강제 지정 없으면 Object Storage 를 고르지 않는다')
    assert.equal(S.storeKind(full), null)
    const c = objectConfig(full)
    assert.equal(c.endpoint, 'https://kr.object.ncloudstorage.com')
    assert.equal(c.region, 'kr-standard')
    assert.equal(c.prefix, '_miri-store/', '이미 쓰는 버킷의 파일과 다른 접두어')
    assert.equal(objectConfig({ ...full, MIRI_OBJECT_PREFIX: 'x' }).prefix, 'x/')
    assert.ok(S.getStore({ MIRI_STORE: 'ncpobject', ...full }) instanceof ObjectStore)
    await S.closeStore()
  })

  await ok('SigV4 서명: AWS 공개 예시(GET /test.txt, Range)와 같은 서명값', async () => {
    const h = signRequest({
      method: 'GET', url: 'https://examplebucket.s3.amazonaws.com/test.txt', headers: { range: 'bytes=0-9' }, body: '',
      accessKey: 'AKIAIOSFODNN7EXAMPLE', secretKey: 'wJalrXUtnFEMI/K7MDENG/bPxRfiCYEXAMPLEKEY', region: 'us-east-1', now: new Date('2013-05-24T00:00:00Z')
    })
    assert.equal(h.authorization, 'AWS4-HMAC-SHA256 Credential=AKIAIOSFODNN7EXAMPLE/20130524/us-east-1/s3/aws4_request, SignedHeaders=host;range;x-amz-content-sha256;x-amz-date, Signature=f0e8bdb87c964420e857bd35b5d6ed310bd44f0170aba48dd91039c6036bdb41')
  })

  await ok('명령 전체: get set(NX EX) mget incr expire ttl del rpush lrange llen hset hgetall sadd smembers scard srem exists type scan', async () => {
    const r = objStore()
    assert.equal(await r.set('k1', { kind: 'doc', n: 1 }), 'OK')
    assert.deepEqual(await r.get('k1'), { kind: 'doc', n: 1 })
    assert.equal(await r.set('k1', 'x', { nx: true }), null, 'NX 실패는 null')
    assert.equal(await r.set('k2', 0, { nx: true, ex: 60 }), 'OK')
    const t = await r.ttl('k2'); assert.ok(t > 0 && t <= 60)
    assert.equal(await r.ttl('k1'), -1); assert.equal(await r.ttl('none'), -2)
    assert.equal(await r.incr('k2'), 1)
    assert.ok((await r.ttl('k2')) > 0, 'INCR 은 남은 만료를 유지')
    assert.equal(await r.incr('fresh'), 1)
    assert.equal(await r.expire('fresh', 30), 1); assert.equal(await r.expire('none', 30), 0)
    assert.deepEqual(await r.mget('k1', 'none'), [{ kind: 'doc', n: 1 }, null])
    assert.equal(await r.set('big', '12345678901234567890'), 'OK')
    assert.equal(await r.get('big'), '12345678901234567890', '큰 정수는 문자열')
    assert.equal(await r.rpush('L', JSON.stringify({ a: 1 }), 'plain'), 2)
    assert.equal(await r.rpush('L', 3), 3)
    assert.deepEqual(await r.lrange('L', 0, -1), [{ a: 1 }, 'plain', 3])
    assert.deepEqual(await r.lrange('L', 1, 1), ['plain'])
    assert.deepEqual(await r.lrange('L', -2, -1), ['plain', 3])
    assert.equal(await r.llen('L'), 3); assert.equal(await r.llen('none'), 0)
    assert.equal(await r.hgetall('H'), null, '빈 해시는 null')
    assert.equal(await r.hset('H', { a: '1', b: { x: 1 } }), 2)
    assert.equal(await r.hset('H', { a: '2' }), 0)
    assert.deepEqual(await r.hgetall('H'), { a: 2, b: { x: 1 } })
    assert.equal(await r.sadd('SET', 'i1', 'i2'), 2); assert.equal(await r.sadd('SET', 'i1'), 0)
    assert.deepEqual((await r.smembers('SET')).sort(), ['i1', 'i2'])
    assert.deepEqual(await r.smembers('none'), [])
    assert.equal(await r.scard('SET'), 2); assert.equal(await r.scard('none'), 0)
    assert.equal(await r.srem('SET', 'i1', 'zz'), 1); assert.equal(await r.srem('SET', 'i2'), 1)
    assert.equal(await r.exists('SET'), 0, '빈 집합은 지워진다')
    await r.sadd('SET', 'i1', 'i2')
    assert.equal(await r.exists('k1', 'L', 'none'), 2)
    assert.equal(await r.type('L'), 'list'); assert.equal(await r.type('H'), 'hash'); assert.equal(await r.type('none'), 'none')
    await assert.rejects(() => r.incr('L'), /WRONGTYPE/)
    await assert.rejects(() => r.incr('k1'), /not an integer/)
    assert.equal(await r.set('miri:ws:a', 1), 'OK'); assert.equal(await r.set('miri:ws:b', 1), 'OK'); assert.equal(await r.set('miri:rl:c', 1), 'OK')
    const [cur, keys] = await r.scan('0', { match: 'miri:ws:*', count: 100 })
    assert.equal(cur, '0'); assert.deepEqual(keys.sort(), ['miri:ws:a', 'miri:ws:b'])
    // 여러 쪽으로 나뉜 목록도 커서로 끝까지 돈다
    const seen = []; let c2 = '0'
    do { const [nx, ks] = await r.scan(c2, { count: 2 }); seen.push(...ks); c2 = nx } while (c2 !== '0')
    assert.equal(seen.length, 10, "k1 k2 fresh big L H SET 와 miri 키 셋")
    assert.equal(await r.del('k1', 'k2', 'L', 'none'), 3)
    assert.equal(await r.get('k1'), null)
    assert.equal(await r.ping(), 'PONG')
    assert.equal(s3.stats.badSignature, 0, '서명 검사 통과')
  })

  await ok('표준 Redis 어댑터에도 문서함이 쓰는 llen, sadd, smembers, scard, srem 이 있고 Object Storage 와 같은 결과', async () => {
    const red = new S.StandardStore({}, new Mock())
    const obj = objStore()
    for (const r of [red, obj]) {
      assert.equal(await r.rpush('resp', '{"a":1}', '{"a":2}'), 2)
      assert.equal(await r.llen('resp'), 2)
      assert.equal(await r.sadd('idx', 'w1', 'w2', 'w1'), 2)
      assert.deepEqual((await r.smembers('idx')).sort(), ['w1', 'w2'])
      assert.equal(await r.scard('idx'), 2)
      assert.equal(await r.srem('idx', 'w1'), 1)
      assert.deepEqual(await r.smembers('idx'), ['w2'])
    }
    await red.quit()
  })

  await ok('만료: 지난 키는 없는 키로 보고, 다시 쓰면 새 값', async () => {
    const r = objStore()
    let clock = Date.now(); r.now = () => clock
    await r.set('e', 'v', { ex: 5 })
    await r.rpush('el', 'a'); await r.expire('el', 5)
    clock += 6000
    assert.equal(await r.get('e'), null)
    assert.equal(await r.exists('e', 'el'), 0)
    assert.equal(await r.ttl('e'), -2)
    assert.equal(await r.set('e', 'new', { nx: true }), 'OK', '만료된 키에는 NX 저장이 된다')
    assert.equal(await r.rpush('el', 'b'), 1, '만료된 목록은 새로 시작')
    assert.equal(globToRegExp('miri:[ab]?:*').test('miri:ax:1'), true)
  })

  await ok('동시 저장 충돌: 조건부 쓰기와 재시도로 INCR 30번, RPUSH 20번, SET NX 10번이 하나도 빠지거나 겹치지 않는다', async () => {
    const r = objStore(slow)
    const before = slow.stats.preconditionFailed
    const ns = await Promise.all(Array.from({ length: 30 }, () => r.incr('cnt')))
    assert.deepEqual([...ns].sort((a, b) => a - b), Array.from({ length: 30 }, (_, i) => i + 1))
    assert.equal(await r.get('cnt'), 30)
    const lens = await Promise.all(Array.from({ length: 20 }, (_, i) => r.rpush('list', `v${i}`)))
    assert.deepEqual([...lens].sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1))
    assert.equal((await r.lrange('list', 0, -1)).length, 20)
    const nx = await Promise.all(Array.from({ length: 10 }, (_, i) => r.set('once', `w${i}`, { nx: true, ex: 60 })))
    assert.equal(nx.filter((x) => x === 'OK').length, 1, 'NX 는 하나만 성공')
    assert.ok(slow.stats.preconditionFailed > before, `조건 불일치(412)가 실제로 일어나고 재시도로 풀렸다(${slow.stats.preconditionFailed - before}회)`)
  })

  // Lua 의미 비교: 같은 명령 순서를 ioredis-mock(실제 Lua 실행)과 Object Storage 에 똑같이 보내고 결과를 비교
  await ok('Lua 세 개(APPEND, SAVE, CLOSE)의 결과와 남은 값이 표준 Redis(실제 Lua 실행)와 같다', async () => {
    const red = new S.StandardStore({}, new Mock())
    const obj = objStore()
    const d = 'Dpar000001'
    const K = { closed: `c:${d}`, idOwner: `io:${d}`, rev: `rv:${d}`, state: `st:${d}`, assign: `as:${d}`, owner: 'ow:s1', members: `mb:${d}`, reports: `rp:${d}`, pref: 'pf:s1', prefSeq: 'ps:s1' }
    const saveKeys = [K.closed, K.idOwner, K.rev, K.state, K.assign, K.owner, K.members]
    const save = (sid, rev, members = ['H1', ',P-1,P-2,', 'H2', ',P-3,']) => [SAVE_LUA, saveKeys, [sid, String(rev), JSON.stringify({ status: 'sent', rev }), JSON.stringify({ rev }), d, '600', ...members]]
    const appendKeys = (h, key) => [`k:${d}:${h}:${key}`, K.reports, K.members, K.closed, K.pref, K.prefSeq]
    const append = (h, key, hash, person = '', pref = '') => [APPEND_LUA, appendKeys(h, key), [JSON.stringify({ key, h }), hash, '600', '3', h, person, pref, '900']]
    const close = [CLOSE_LUA, [K.closed, K.state, K.assign, K.members, K.reports, K.rev], ['600']]
    const steps = [
      save('s1', 1), save('s1', 1), save('s2', 2), save('s1', 2, ['H1', ',P-1,']),
      append('H1', 'a1', 'h1', 'P-1'), append('H1', 'a1', 'h1', 'P-1'), append('H1', 'a1', 'hX', 'P-1'),
      append('H1', 'a2', 'h2', 'P-9'), append('H9', 'a3', 'h3'),
      append('H1', 'p1', 'hp1', '', JSON.stringify({ consent: true })), append('H1', 'p2', 'hp2', '', JSON.stringify({ consent: false })),
      append('H1', 'a4', 'h4', 'P-1'), append('H1', 'a5', 'h5', 'P-1'), append('H1', 'a6', '12345', 'P-1'), append('H1', 'a6', '12345', 'P-1'),
      save('s1', 3, []), append('H1', 'a7', 'h7', 'P-1'),
      save('s1', 4), close, append('H1', 'a8', 'h8', 'P-1'), save('s1', 5)
    ]
    for (const [i, [script, keys, args]] of steps.entries()) {
      const a = await red.eval(script, keys, args)
      const b = await obj.eval(script, keys, args)
      assert.deepEqual(b, a, `단계 ${i + 1} 결과`)
      for (const k of [K.closed, K.idOwner, K.rev, K.state, K.assign, K.owner, K.prefSeq]) assert.deepEqual(await obj.get(k), await red.get(k), `단계 ${i + 1} ${k}`)
      assert.deepEqual(await obj.lrange(K.reports, 0, -1), await red.lrange(K.reports, 0, -1), `단계 ${i + 1} 보고 목록`)
      assert.deepEqual(await obj.hgetall(K.members), await red.hgetall(K.members), `단계 ${i + 1} 대상자 해시`)
      // ioredis-mock 은 Lua 5.3(fengari)이라 INCR 결과를 이어 붙이면 '1.0|' 이 된다. 실제 Redis(Lua 5.1)는 '1|' 이므로 기대값만 실제 Redis 모양으로 바꿔 비교
      const redPref = await red.hgetall(K.pref)
      const realPref = redPref && Object.fromEntries(Object.entries(redPref).map(([f, v]) => [f, String(v).replace(/^(\d+)\.0\|/, '$1|')]))
      assert.deepEqual(await obj.hgetall(K.pref), realPref, `단계 ${i + 1} 동의 해시`)
      for (const k of [K.closed, K.reports, K.members, K.pref, K.prefSeq, K.rev]) assert.equal((await obj.ttl(k)) > 0, (await red.ttl(k)) > 0, `단계 ${i + 1} ${k} 만료 유무`)
    }
    await red.quit()
  })

  await ok('동시 eval: 서로 다른 보고 20건을 한꺼번에 넣어도 목록과 동의 순번이 빠지지 않고, 죽은 잠금은 넘겨받는다', async () => {
    const r = objStore(slow)
    const d = 'Dcon000001'
    const keys = (i) => [`k:${d}:H1:${i}`, `rp:${d}`, `mb:${d}`, `c:${d}`, 'pf:s1', 'ps:s1']
    await r.eval(SAVE_LUA, [`c:${d}`, `io:${d}`, `rv:${d}`, `st:${d}`, `as:${d}`, 'ow:s1', `mb:${d}`], ['s1', '1', '{}', '{}', d, '600', 'H1', ',P-1,'])
    const outs = await Promise.all(Array.from({ length: 20 }, (_, i) => r.eval(APPEND_LUA, keys(i), [JSON.stringify({ i }), `h${i}`, '600', '100', 'H1', '', JSON.stringify({ i }), '900'])))
    assert.deepEqual(outs.map((o) => o[1]).sort((a, b) => a - b), Array.from({ length: 20 }, (_, i) => i + 1))
    assert.equal((await r.lrange(`rp:${d}`, 0, -1)).length, 20)
    assert.equal(await r.get('ps:s1'), 20)
    // 다른 요청이 잠금을 남기고 죽은 상황: 만료 시각이 지난 잠금 객체
    await r.s3.putObject(r.lockKey(`c:${d}`), JSON.stringify({ o: 'dead', until: Date.now() - 1 }), { ifNoneMatch: '*' })
    assert.equal(await r.eval(CLOSE_LUA, [`c:${d}`, `st:${d}`, `as:${d}`, `mb:${d}`, `rp:${d}`, `rv:${d}`], ['600']), 1)
    assert.equal(await r.get(`c:${d}`), 1)
    const left = [...slow.objects.keys()].filter((k) => k.startsWith(`${r.prefix}l/`))
    assert.deepEqual(left, [], '잠금 객체가 남지 않는다')
  })

  // 기존 fakeRedis 시험과 같은 발령 시나리오(저장, 판 번호 거부, 조회, 보고와 중복 보고, 종료, 종료 뒤 보고 거부)
  const { setStoreForTest, issueToken, COOKIE } = await import('../api/_guard.js')
  const { default: dispatch } = await import('../api/dispatch.js')
  const { useMiriStore } = await import('../src/store/useMiriStore.js')
  const { crewEligible } = await import('../src/lib/assign.js')
  const [A] = useMiriStore.getState().helpers.filter((h) => crewEligible(h)).map((h) => h.code)
  const T0 = Date.UTC(2026, 9, 24, 5, 0)
  const sent = { status: 'sent', kind: 'drill', speed: 60, realStart: T0, vStart: T0, issuedAt: T0, arrivals: {}, result: { assignments: [], unassigned: [] }, events: {}, ackOverride: {}, handovers: [], fireRequests: [] }
  const mkRes = () => { const r = { code: 0, body: null, headers: {} }; r.status = (c) => { r.code = c; return r }; r.json = (b) => { r.body = b; return r }; r.setHeader = (k, v) => { r.headers[k] = v }; return r }
  const call = async (req) => { const res = mkRes(); await dispatch({ ...req, headers: { host: 'miri.test', origin: 'https://miri.test', ...(req.headers || {}) } }, res); return res }

  await ok('발령 흐름(저장, 조회, 보고, 중복 보고, 종료, 종료 뒤 보고)이 Object Storage 저장소에서 Upstash 와 같은 결과', async () => {
    setStoreForTest(objStore())
    const cookie = `${COOKIE}=${issueToken()}`
    const saved = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dobj000001', rev: 1, briefs: { [A]: { personCodes: ['P-1'] } } } })
    assert.equal(saved.code, 200, JSON.stringify(saved.body))
    assert.equal(saved.body.rev, 1)
    const stale = await call({ method: 'POST', query: { action: 'save' }, headers: { cookie }, body: { state: sent, dispatchId: 'Dobj000001', rev: 1, briefs: {} } })
    assert.equal(stale.code, 409, '같은 판 번호 재저장은 거부')
    const st = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
    assert.equal(st.code, 200); assert.equal(st.body.state.status, 'sent'); assert.equal(st.body.rev, 1)
    const body = { key: 'kobj000001', type: 'preference', consent: true, roles: ['ride'], at: T0 + 1 }
    const r1 = await call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[A] }, body })
    assert.equal(r1.code, 200); assert.equal(r1.body.duplicate, false)
    const r2 = await call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[A] }, body })
    assert.equal(r2.code, 200); assert.equal(r2.body.duplicate, true)
    const st2 = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
    assert.equal(st2.body.prefs[A].consent, true); assert.equal(st2.body.prefs[A].seq, 1)
    assert.equal(st2.body.reports.length, 1)
    const del = await call({ method: 'DELETE', query: {}, headers: { cookie } })
    assert.equal(del.code, 200)
    const st3 = await call({ method: 'GET', query: { action: 'state' }, headers: { cookie } })
    assert.equal(st3.body.state, null)
    const late = await call({ method: 'POST', query: { action: 'report', t: saved.body.tokens[A] }, body: { ...body, key: 'kobj000002' } })
    assert.notEqual(late.code, 200, '종료 뒤 보고는 받지 않음')
    setStoreForTest(null)
  })

  await ok('독립 서버(MIRI_STORE=ncpobject, 메모리 S3): 상태 확인, 시연 코드 세션, 발령 저장과 조회, 종료를 실제 HTTP 로', async () => {
    Object.assign(process.env, s3.env, { MIRI_STORE: 'ncpobject', MIRI_OBJECT_PREFIX: 'srv/', MIRI_RUNTIME: 'ncp-object-test' })
    delete process.env.REDIS_URL
    const { createApiServer } = await import('../../server/index.mjs')
    const server = createApiServer()
    await new Promise((r) => server.listen(0, '127.0.0.1', r))
    const base = `http://127.0.0.1:${server.address().port}`
    const H = { origin: base, 'content-type': 'application/json' }
    try {
      const h = await fetch(`${base}/api/health`).then((x) => x.json())
      assert.equal(h.ok, true); assert.equal(h.runtime, 'ncp-object-test'); assert.equal(h.store.kind, 'ncpobject'); assert.equal(h.store.ok, true)
      assert.ok(!JSON.stringify(h).includes(s3.env.NCP_OBJECT_SECRET_KEY), '비밀 값을 돌려주지 않는다')
      const login = await fetch(`${base}/api/session`, { method: 'POST', headers: H, body: JSON.stringify({ code: 'demo-code' }) })
      assert.equal(login.status, 200)
      const cookie = String(login.headers.get('set-cookie') || '').split(';')[0]
      const saved = await fetch(`${base}/api/dispatch?action=save`, { method: 'POST', headers: { ...H, cookie }, body: JSON.stringify({ state: sent, dispatchId: 'Dobj000002', rev: 1, briefs: { [A]: { personCodes: ['P-1'] } } }) })
      assert.equal(saved.status, 200)
      const st = await fetch(`${base}/api/dispatch?action=state`, { headers: { cookie } }).then((x) => x.json())
      assert.equal(st.state.status, 'sent'); assert.equal(st.rev, 1)
      assert.ok([...s3.objects.keys()].some((k) => k.startsWith('srv/d/')), '접두어 아래에 저장된다')
      // 문서함(workspace): 저장, 목록(sadd, smembers, mget), 삭제(srem)
      const put = await fetch(`${base}/api/workspace`, { method: 'PUT', headers: { ...H, cookie }, body: JSON.stringify({ item: { id: 'wobj01', kind: 'doc', title: '시험 문서', body: '본문' } }) })
      assert.equal(put.status, 200, await put.clone().text())
      const list = await fetch(`${base}/api/workspace`, { headers: { cookie } }).then((x) => x.json())
      assert.deepEqual(list.items.map((x) => x.id), ['wobj01'])
      const rm = await fetch(`${base}/api/workspace?id=wobj01`, { method: 'DELETE', headers: { origin: base, cookie } })
      assert.equal(rm.status, 200)
      assert.deepEqual((await fetch(`${base}/api/workspace`, { headers: { cookie } }).then((x) => x.json())).items, [])
      const closed = await fetch(`${base}/api/dispatch`, { method: 'DELETE', headers: { origin: base, cookie } })
      assert.equal(closed.status, 200)
      const st2 = await fetch(`${base}/api/dispatch?action=state`, { headers: { cookie } }).then((x) => x.json())
      assert.equal(st2.state, null)
    } finally {
      await new Promise((r) => { server.closeAllConnections?.(); server.close(r) })
      await S.closeStore()
      for (const k of ['MIRI_STORE', 'MIRI_OBJECT_PREFIX', 'MIRI_RUNTIME', ...Object.keys(s3.env)]) delete process.env[k]
    }
  })
} finally {
  await s3.close()
  await slow.close()
}

console.log(`ncpObjectStore: ${n}개 통과`)
