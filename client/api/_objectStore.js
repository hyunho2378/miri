// 네이버 클라우드 Object Storage(S3 호환) 위에 핸들러가 쓰는 Redis 명령을 흉내 내는 저장소. MIRI_STORE=ncpobject 로 고른다.
// Cache(Redis) 요금 없이 이미 쓰는 Object Storage 하나로 발령 상태, 호출 횟수, 문서함, 체험 기록을 둔다.
//
// 저장 모양
//   키 하나가 객체 하나: <접두어>d/<encodeURIComponent(키)>
//   본문 JSON { t: 'string'|'list'|'hash'|'set', v: 값, e: 만료 시각(ms) 또는 null }
//   값은 Redis 처럼 문자열로 둔다(문자열은 그대로, 그 밖의 값은 JSON 문자열). 읽을 때는 표준 Redis 어댑터와 같은 규칙(Upstash 결과 모양)으로 해석
//   만료는 읽을 때 판정한다(지난 객체는 없는 키로 본다)
// 동시 저장
//   키 하나짜리 명령: 읽은 ETag 로 조건부 쓰기(If-Match, 없던 키는 If-None-Match: *). 412 가 오면 다시 읽고 다시 계산(최대 MAX_RETRY 번)
//   eval(APPEND_LUA, SAVE_LUA, CLOSE_LUA): 스크립트가 다루는 키마다 잠금 객체(<접두어>l/<키>)를 If-None-Match: * 로 한꺼번에 만든다.
//     하나라도 실패하면 잡은 잠금을 풀고 잠시 뒤 다시 시도(잡은 채 기다리지 않아 교착 없음). 잠금은 LOCK_MS 뒤 만료되어 죽은 요청이 남긴 잠금은 넘겨받는다.
//     잠금을 잡은 뒤 키를 읽고, Lua 와 같은 순서로 계산한 다음 바뀐 키만 쓴다. eval 끼리는 서로 끼어들지 않는다.
//     같은 키를 eval 밖의 한 키 명령이 동시에 고치는 경우는 잠금을 보지 않는다(지금 핸들러에서 겹치는 키는 발령 종료 뒤 K.owner 삭제뿐이라 영향 없음)
// 환경 변수(값은 기록하지 않는다)
//   NCP_OBJECT_BUCKET        버킷 이름(필수)
//   NCP_OBJECT_ACCESS_KEY    접근 키(필수). NCP_ACCESS_KEY 도 받는다
//   NCP_OBJECT_SECRET_KEY    비밀 키(필수). NCP_SECRET_KEY 도 받는다
//   NCP_OBJECT_ENDPOINT      기본 https://kr.object.ncloudstorage.com
//   NCP_OBJECT_REGION        기본 kr-standard
//   MIRI_OBJECT_PREFIX       기본 _miri-store/ (이미 쓰는 버킷의 다른 파일과 섞이지 않게)
import { createHash, createHmac, randomBytes } from 'node:crypto'
import { parseValue, serialize, hashOf } from './_storeShared.js'

const MAX_RETRY = 12
const LOCK_MS = 10000
const LOCK_WAIT_MS = 8000

export function objectConfig(env = process.env) {
  const bucket = env.NCP_OBJECT_BUCKET
  const accessKey = env.NCP_OBJECT_ACCESS_KEY || env.NCP_ACCESS_KEY
  const secretKey = env.NCP_OBJECT_SECRET_KEY || env.NCP_SECRET_KEY
  if (!bucket || !accessKey || !secretKey) return null
  let prefix = env.MIRI_OBJECT_PREFIX ?? '_miri-store/'
  if (prefix && !prefix.endsWith('/')) prefix += '/'
  return {
    bucket, accessKey, secretKey, prefix,
    endpoint: String(env.NCP_OBJECT_ENDPOINT || 'https://kr.object.ncloudstorage.com').replace(/\/+$/, ''),
    region: env.NCP_OBJECT_REGION || 'kr-standard'
  }
}

// ---------- S3 서명(AWS Signature Version 4, node:crypto 만 사용) ----------
const sha256 = (data) => createHash('sha256').update(data).digest('hex')
const hmac = (key, data) => createHmac('sha256', key).update(data).digest()
// RFC 3986 방식 인코딩(S3 서명 규칙)
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)
const encPath = (p) => p.split('/').map(enc).join('/')

export function signRequest({ method, url, headers = {}, body = '', accessKey, secretKey, region, now = new Date() }) {
  const u = new URL(url)
  const amzDate = now.toISOString().replace(/[:-]|\.\d{3}/g, '')
  const day = amzDate.slice(0, 8)
  const payloadHash = sha256(body)
  const h = { ...Object.fromEntries(Object.entries(headers).map(([k, v]) => [k.toLowerCase(), String(v).trim()])), host: u.host, 'x-amz-date': amzDate, 'x-amz-content-sha256': payloadHash }
  const names = Object.keys(h).sort()
  const canonicalHeaders = names.map((k) => `${k}:${h[k]}\n`).join('')
  const signedHeaders = names.join(';')
  const query = [...u.searchParams].map(([k, v]) => [enc(k), enc(v)]).sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&')
  const canonical = [method, u.pathname, query, canonicalHeaders, signedHeaders, payloadHash].join('\n')
  const scope = `${day}/${region}/s3/aws4_request`
  const toSign = ['AWS4-HMAC-SHA256', amzDate, scope, sha256(canonical)].join('\n')
  const kSign = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), region), 's3'), 'aws4_request')
  const signature = createHmac('sha256', kSign).update(toSign).digest('hex')
  h.authorization = `AWS4-HMAC-SHA256 Credential=${accessKey}/${scope}, SignedHeaders=${signedHeaders}, Signature=${signature}`
  delete h.host
  return h
}

// 아주 작은 S3 클라이언트: 객체 읽기, 조건부 쓰기, 지우기, 목록
export class S3Lite {
  constructor(cfg, fetchImpl = globalThis.fetch) { this.cfg = cfg; this.fetch = fetchImpl }
  url(objectKey, query = '') { return `${this.cfg.endpoint}/${enc(this.cfg.bucket)}/${encPath(objectKey)}${query}` }
  async send(method, url, { headers = {}, body = '' } = {}) {
    const signed = signRequest({ method, url, headers, body, accessKey: this.cfg.accessKey, secretKey: this.cfg.secretKey, region: this.cfg.region })
    const res = await this.fetch(url, { method, headers: signed, body: method === 'PUT' ? body : undefined })
    return res
  }
  // 반환 { body, etag } 또는 null(없음)
  async getObject(key) {
    const res = await this.send('GET', this.url(key))
    if (res.status === 404) { await res.arrayBuffer().catch(() => {}); return null }
    if (!res.ok) throw storeError(`저장소 읽기 오류 ${res.status}`, res)
    return { body: await res.text(), etag: res.headers.get('etag') }
  }
  // cond: { ifMatch } 또는 { ifNoneMatch: '*' }. 반환 { ok: true, etag } 또는 { ok: false }(조건 불일치)
  async putObject(key, body, cond = {}) {
    const headers = { 'content-type': 'application/json', 'x-amz-acl': 'private' }
    if (cond.ifMatch) headers['if-match'] = cond.ifMatch
    if (cond.ifNoneMatch) headers['if-none-match'] = cond.ifNoneMatch
    const res = await this.send('PUT', this.url(key), { headers, body })
    await res.arrayBuffer().catch(() => {})
    if (res.status === 412 || res.status === 409) return { ok: false }
    if (!res.ok) throw storeError(`저장소 쓰기 오류 ${res.status}`, res)
    return { ok: true, etag: res.headers.get('etag') }
  }
  async deleteObject(key, cond = {}) {
    const headers = {}
    if (cond.ifMatch) headers['if-match'] = cond.ifMatch
    const res = await this.send('DELETE', this.url(key), { headers })
    await res.arrayBuffer().catch(() => {})
    if (res.status === 412) return { ok: false }
    if (!res.ok && res.status !== 404) throw storeError(`저장소 삭제 오류 ${res.status}`, res)
    return { ok: true }
  }
  // ListObjectsV2. 반환 { keys, next }(next 가 없으면 끝)
  async list(prefix, token = '', max = 1000) {
    const q = new URLSearchParams({ 'list-type': '2', prefix, 'max-keys': String(max) })
    if (token) q.set('continuation-token', token)
    const res = await this.send('GET', `${this.cfg.endpoint}/${enc(this.cfg.bucket)}?${q}`)
    const xml = await res.text()
    if (!res.ok) throw storeError(`저장소 목록 오류 ${res.status}`, res)
    const keys = [...xml.matchAll(/<Key>([^<]*)<\/Key>/g)].map((m) => xmlText(m[1]))
    const truncated = /<IsTruncated>true<\/IsTruncated>/.test(xml)
    const next = truncated ? xmlText((/<NextContinuationToken>([^<]*)<\/NextContinuationToken>/.exec(xml) || [])[1] || '') : ''
    return { keys, next }
  }
}
const xmlText = (s) => s.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&apos;/g, "'").replace(/&amp;/g, '&')
// 오류 메시지에 주소나 서명 값을 넣지 않는다
const storeError = (message, res) => Object.assign(new Error(message), { code: 'STORE', status: res?.status })

const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const backoff = (i) => sleep(Math.min(400, 10 * 2 ** i) * (0.5 + Math.random()))

// Redis 글롭(*, ?, [abc]) 을 정규식으로
export function globToRegExp(glob) {
  let s = ''
  for (let i = 0; i < glob.length; i++) {
    const c = glob[i]
    if (c === '*') s += '.*'
    else if (c === '?') s += '.'
    else if (c === '[') { const j = glob.indexOf(']', i + 1); if (j > i) { s += `[${glob.slice(i + 1, j).replace(/\\/g, '\\\\')}]`; i = j } else s += '\\[' }
    else if (c === '\\' && i + 1 < glob.length) { s += glob[++i].replace(/[.*+?^${}()|[\]\\]/g, '\\$&') }
    else s += c.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
  }
  return new RegExp(`^${s}$`)
}

const WRONGTYPE = () => Object.assign(new Error('WRONGTYPE Operation against a key holding the wrong kind of value'), { code: 'WRONGTYPE' })
const NOT_INT = () => Object.assign(new Error('ERR value is not an integer or out of range'), { code: 'NOT_INT' })

// 레코드(메모리 안의 값) 위에서 Redis 명령 의미를 계산하는 순수 함수들. 키 하나짜리 명령과 eval 이 같은 함수를 쓴다
const alive = (rec, now) => (rec && (rec.e == null || rec.e > now) ? rec : null)
const ops = {
  get(rec) { if (!rec) return null; if (rec.t !== 'string') throw WRONGTYPE(); return rec.v },
  // 반환 [새 레코드 또는 undefined(바꾸지 않음), 결과]
  set(rec, value, opts = {}, now) {
    if (opts.nx && rec) return [undefined, null]
    if (opts.xx && !rec) return [undefined, null]
    const e = opts.ex ? now + Number(opts.ex) * 1000 : opts.px ? now + Number(opts.px) : null
    return [{ t: 'string', v: value, e }, 'OK']
  },
  incr(rec) {
    if (rec && rec.t !== 'string') throw WRONGTYPE()
    const cur = rec ? rec.v : '0'
    if (!/^-?\d+$/.test(String(cur))) throw NOT_INT()
    const n = Number(cur) + 1
    if (!Number.isSafeInteger(n)) throw NOT_INT()
    return [{ t: 'string', v: String(n), e: rec ? rec.e : null }, n]
  },
  expire(rec, sec, now) { if (!rec) return [undefined, 0]; return [{ ...rec, e: now + Number(sec) * 1000 }, 1] },
  rpush(rec, vals) {
    if (rec && rec.t !== 'list') throw WRONGTYPE()
    const v = [...(rec ? rec.v : []), ...vals]
    return [{ t: 'list', v, e: rec ? rec.e : null }, v.length]
  },
  lrange(rec, start, stop) {
    if (!rec) return []
    if (rec.t !== 'list') throw WRONGTYPE()
    const n = rec.v.length
    let a = Number(start); let b = Number(stop)
    if (a < 0) a = Math.max(0, n + a)
    if (b < 0) b = n + b
    if (b >= n) b = n - 1
    return a > b ? [] : rec.v.slice(a, b + 1)
  },
  ltrim(rec, start, stop) {
    if (!rec) return [undefined, 'OK']
    if (rec.t !== 'list') throw WRONGTYPE()
    const v = ops.lrange(rec, start, stop)
    return [v.length ? { ...rec, v } : null, 'OK']
  },
  llen(rec) { if (!rec) return 0; if (rec.t !== 'list') throw WRONGTYPE(); return rec.v.length },
  hset(rec, pairs) {
    if (rec && rec.t !== 'hash') throw WRONGTYPE()
    const v = { ...(rec ? rec.v : {}) }
    let added = 0
    for (const [f, x] of pairs) { if (!(f in v)) added += 1; v[f] = x }
    return [{ t: 'hash', v, e: rec ? rec.e : null }, added]
  },
  hget(rec, f) { if (!rec) return null; if (rec.t !== 'hash') throw WRONGTYPE(); return f in rec.v ? rec.v[f] : null },
  sadd(rec, members) {
    if (rec && rec.t !== 'set') throw WRONGTYPE()
    const v = [...(rec ? rec.v : [])]
    let added = 0
    for (const m of members) if (!v.includes(m)) { v.push(m); added += 1 }
    return [{ t: 'set', v, e: rec ? rec.e : null }, added]
  },
  srem(rec, members) {
    if (!rec) return [undefined, 0]
    if (rec.t !== 'set') throw WRONGTYPE()
    const v = rec.v.filter((m) => !members.includes(m))
    const removed = rec.v.length - v.length
    if (!removed) return [undefined, 0]
    return [v.length ? { ...rec, v } : null, removed]
  },
  ttl(rec, now) { if (!rec) return -2; if (rec.e == null) return -1; return Math.max(0, Math.round((rec.e - now) / 1000)) }
}

export class ObjectStore {
  constructor(env = process.env, s3 = null) {
    const cfg = env && env.bucket ? env : objectConfig(env)
    if (!cfg && !s3) throw new Error('Object Storage 설정(NCP_OBJECT_BUCKET, NCP_OBJECT_ACCESS_KEY, NCP_OBJECT_SECRET_KEY)이 없습니다')
    this.prefix = cfg?.prefix ?? '_miri-store/'
    this.s3 = s3 || new S3Lite(cfg)
    this.owner = randomBytes(8).toString('hex')
    this.now = () => Date.now()
  }

  dataKey(key) { return `${this.prefix}d/${encodeURIComponent(String(key))}` }
  lockKey(key) { return `${this.prefix}l/${encodeURIComponent(String(key))}` }

  // 반환 { rec(살아 있는 레코드 또는 null), etag(객체가 있으면, 만료된 것 포함) }
  async read(key) {
    const o = await this.s3.getObject(this.dataKey(key))
    if (!o) return { rec: null, etag: null }
    let rec = null
    try { rec = JSON.parse(o.body) } catch { rec = null }
    return { rec: alive(rec, this.now()), etag: o.etag }
  }

  // 새 레코드 쓰기(null 이면 지우기). 읽을 때의 ETag 로 조건을 건다
  async write(key, rec, etag) {
    if (rec === null) {
      if (!etag) return true
      return (await this.s3.deleteObject(this.dataKey(key), { ifMatch: etag })).ok
    }
    const cond = etag ? { ifMatch: etag } : { ifNoneMatch: '*' }
    return (await this.s3.putObject(this.dataKey(key), JSON.stringify(rec), cond)).ok
  }

  // 키 하나를 읽고, 계산하고, 조건부로 쓴다. 다른 요청이 먼저 썼으면(412) 다시 읽고 다시 계산
  async update(key, fn) {
    for (let i = 0; i < MAX_RETRY; i++) {
      const { rec, etag } = await this.read(key)
      const [next, result] = fn(rec, this.now())
      if (next === undefined) return result
      if (await this.write(key, next, etag)) return result
      await backoff(i)
    }
    throw Object.assign(new Error('저장 충돌이 계속되어 저장하지 못했습니다'), { code: 'CONFLICT' })
  }

  async get(key) { const { rec } = await this.read(key); return parseValue(ops.get(rec)) }
  async mget(...keys) { return Promise.all(keys.map((k) => this.get(k))) }
  async set(key, value, opts) { return this.update(key, (rec, now) => ops.set(rec, serialize(value), opts, now)) }
  async incr(key) { return this.update(key, (rec) => ops.incr(rec)) }
  async expire(key, sec) { return this.update(key, (rec, now) => ops.expire(rec, sec, now)) }
  async del(...keys) {
    const out = await Promise.all(keys.map((k) => this.update(k, (rec) => (rec ? [null, 1] : [undefined, 0]))))
    return out.reduce((a, b) => a + b, 0)
  }
  async rpush(key, ...vals) { return this.update(key, (rec) => ops.rpush(rec, vals.map(serialize))) }
  async lrange(key, start, stop) { const { rec } = await this.read(key); return ops.lrange(rec, start, stop).map(parseValue) }
  async llen(key) { const { rec } = await this.read(key); return ops.llen(rec) }
  async hgetall(key) {
    const { rec } = await this.read(key)
    if (rec && rec.t !== 'hash') throw WRONGTYPE()
    return hashOf(rec ? Object.entries(rec.v).flat() : [])
  }
  async hset(key, obj) {
    const pairs = Object.entries(obj).map(([f, v]) => [f, serialize(v)])
    if (!pairs.length) return 0
    return this.update(key, (rec) => ops.hset(rec, pairs))
  }
  async sadd(key, ...members) { return this.update(key, (rec) => ops.sadd(rec, members.map(serialize))) }
  async smembers(key) {
    const { rec } = await this.read(key)
    if (!rec) return []
    if (rec.t !== 'set') throw WRONGTYPE()
    return rec.v.map(parseValue)
  }
  async scard(key) {
    const { rec } = await this.read(key)
    if (!rec) return 0
    if (rec.t !== 'set') throw WRONGTYPE()
    return rec.v.length
  }
  async srem(key, ...members) { return this.update(key, (rec) => ops.srem(rec, members.map(serialize))) }
  async exists(...keys) {
    const out = await Promise.all(keys.map((k) => this.read(k)))
    return out.filter((x) => x.rec).length
  }
  async ttl(key) { const { rec } = await this.read(key); return ops.ttl(rec, this.now()) }
  async type(key) { const { rec } = await this.read(key); return rec ? rec.t : 'none' }
  async ping() { await this.s3.getObject(this.dataKey('miri:health:probe')); return 'PONG' }
  // 커서는 목록 이어받기 표지(처음과 끝은 '0'). 만료 판정 없이 객체가 있는 키를 돌려준다
  async scan(cursor, opts = {}) {
    const re = opts.match ? globToRegExp(opts.match) : null
    const base = `${this.prefix}d/`
    const { keys, next } = await this.s3.list(base, String(cursor) === '0' ? '' : String(cursor), Math.min(1000, Number(opts.count) || 1000))
    const names = keys.map((k) => { try { return decodeURIComponent(k.slice(base.length)) } catch { return null } }).filter((k) => k !== null && (!re || re.test(k)))
    return [next || '0', names]
  }
  async quit() {}

  // ---------- 잠금 ----------
  async lockOne(key) {
    const lk = this.lockKey(key)
    const body = JSON.stringify({ o: this.owner, until: this.now() + LOCK_MS })
    const put = await this.s3.putObject(lk, body, { ifNoneMatch: '*' })
    if (put.ok) return true
    // 남이 잡은 잠금이 만료되었으면 지우고 다음 시도에서 잡는다(지울 때 ETag 를 확인해 그사이 새로 잡힌 잠금은 지우지 않음)
    const cur = await this.s3.getObject(lk)
    if (!cur) return false
    let info = null
    try { info = JSON.parse(cur.body) } catch { info = null }
    if (!info || Number(info.until) < this.now()) await this.s3.deleteObject(lk, { ifMatch: cur.etag })
    return false
  }
  async unlock(keys) { await Promise.all(keys.map((k) => this.s3.deleteObject(this.lockKey(k)).catch(() => {}))) }
  async withLocks(keys, fn) {
    const uniq = [...new Set(keys.map(String))].sort()
    const start = this.now()
    for (let i = 0; ; i++) {
      const got = await Promise.all(uniq.map((k) => this.lockOne(k).catch(() => false)))
      if (got.every(Boolean)) break
      await this.unlock(uniq.filter((_, j) => got[j]))
      if (this.now() - start > LOCK_WAIT_MS) throw Object.assign(new Error('저장소 잠금을 얻지 못했습니다'), { code: 'LOCKED' })
      await backoff(i)
    }
    try { return await fn() } finally { await this.unlock(uniq) }
  }

  // ---------- eval: dispatch.js 의 Lua 세 개를 같은 의미로 실행 ----------
  async eval(script, keys = [], args = []) {
    const { APPEND_LUA, SAVE_LUA, CLOSE_LUA } = await import('./dispatch.js')
    const kind = script === APPEND_LUA ? 'append' : script === SAVE_LUA ? 'save' : script === CLOSE_LUA ? 'close' : null
    if (!kind) throw new Error('지원하지 않는 스크립트입니다')
    const A = args.map(serialize)
    return this.withLocks(keys, async () => {
      const tx = new Tx(this, keys)
      await tx.load()
      const out = runScript(kind, tx, keys, A, this.now())
      await tx.commit()
      return parseValue(out)
    })
  }
}

// 잠금 안에서 쓰는 작은 트랜잭션: 키를 한 번 읽어 두고, 바뀐 키만 마지막에 쓴다
class Tx {
  constructor(store, keys) { this.store = store; this.keys = [...new Set(keys.map(String))]; this.recs = new Map(); this.etags = new Map(); this.dirty = new Set() }
  async load() {
    await Promise.all(this.keys.map(async (k) => { const { rec, etag } = await this.store.read(k); this.recs.set(k, rec); this.etags.set(k, etag) }))
  }
  rec(k) { return this.recs.get(String(k)) ?? null }
  put(k, rec) { if (rec === undefined) return; this.recs.set(String(k), rec); this.dirty.add(String(k)) }
  async commit() {
    await Promise.all([...this.dirty].map(async (k) => {
      const ok = await this.store.write(k, this.recs.get(k), this.etags.get(k))
      // 잠금을 잡은 상태라 eval 끼리는 충돌하지 않는다. 잠금을 보지 않는 한 키 명령이 끼어든 경우만 여기로 온다: 덮어쓴다
      if (!ok) {
        const { etag } = await this.store.read(k)
        if (!(await this.store.write(k, this.recs.get(k), etag))) throw Object.assign(new Error('저장 충돌'), { code: 'CONFLICT' })
      }
    }))
  }
}

// Lua 스크립트와 같은 순서와 결과. A 는 문자열 인자(ARGV), 반환값은 Lua 표를 배열로 바꾼 모양
function runScript(kind, tx, K, A, now) {
  const exists = (k) => Boolean(tx.rec(k))
  const setEx = (k, v, sec) => tx.put(k, ops.set(tx.rec(k), v, { ex: sec }, now)[0])
  const del = (k) => { if (tx.rec(k)) tx.put(k, null) }
  if (kind === 'append') {
    if (exists(K[3])) return [0, 'closed']
    const m = ops.hget(tx.rec(K[2]), A[4])
    if (m == null) return [0, 'gone']
    if (A[5] !== '' && !String(m).includes(`,${A[5]},`)) return [0, 'gone']
    const [setRec, ok] = ops.set(tx.rec(K[0]), A[1], { nx: true, ex: A[2] }, now)
    if (ok) {
      tx.put(K[0], setRec)
      let [list, n] = ops.rpush(tx.rec(K[1]), [A[0]])
      if (n === 1) list = ops.expire(list, A[2], now)[0]
      const max = Number(A[3])
      if (n > max) list = ops.ltrim(list, -max, -1)[0]
      tx.put(K[1], list)
      if (A[6] !== '') {
        const [seqRec, s] = ops.incr(tx.rec(K[5]))
        tx.put(K[5], seqRec)
        tx.put(K[4], ops.hset(tx.rec(K[4]), [[A[4], `${s}|${A[6]}`]])[0])
        tx.put(K[4], ops.expire(tx.rec(K[4]), A[7], now)[0])
        tx.put(K[5], ops.expire(tx.rec(K[5]), A[7], now)[0])
      }
      return [1, n]
    }
    return [0, ops.get(tx.rec(K[0]))]
  }
  if (kind === 'save') {
    if (exists(K[0])) return [0, 'closed']
    const o = ops.get(tx.rec(K[1]))
    if (o != null && o !== A[0]) return [0, 'owner']
    const cur = ops.get(tx.rec(K[2]))
    if (cur != null && Number(cur) >= Number(A[1])) return [0, 'stale']
    setEx(K[1], A[0], A[5])
    setEx(K[2], A[1], A[5])
    setEx(K[3], A[2], A[5])
    setEx(K[4], A[3], A[5])
    setEx(K[5], A[4], A[5])
    del(K[6])
    const pairs = []
    for (let i = 6; i + 1 < A.length; i += 2) pairs.push([A[i], A[i + 1]])
    if (pairs.length) {
      let h = ops.hset(null, pairs)[0]
      if (A.length >= 8) h = ops.expire(h, A[5], now)[0]
      tx.put(K[6], h)
    }
    return [1, 'ok']
  }
  // close
  setEx(K[0], '1', A[0])
  for (const k of K.slice(1, 6)) del(k)
  return 1
}
