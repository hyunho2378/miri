// 공유 저장소 어댑터. 발령 상태, 호출 횟수, 문서함, 체험 기록이 같은 저장소를 쓴다.
//
// 고르는 순서
//   1. MIRI_STORE=redis 이거나 REDIS_URL(또는 REDIS_HOST)만 있으면 표준 Redis(ioredis). 네이버 클라우드 Cloud DB for Redis 용
//   2. MIRI_STORE=upstash 이거나 Upstash REST 주소와 토큰이 있으면 Upstash REST
//   3. 둘 다 없으면 null(호출하는 쪽이 인스턴스 메모리나 '저장소 없음'으로 처리)
//
// 표준 Redis 쪽은 Upstash 클라이언트와 같은 결과 모양을 돌려준다(키 구조와 핸들러 코드는 그대로).
//   - 값 쓰기: 문자열은 그대로, 그 밖의 값은 JSON 문자열로 저장
//   - 값 읽기: JSON 으로 읽히면 해석한 값, 아니면 문자열(큰 정수는 문자열 유지)
//   - hgetall: 빈 해시는 null
//   - eval: 결과 배열 안의 문자열도 같은 규칙으로 해석
// 환경 변수(값은 기록하지 않는다)
//   REDIS_URL            redis:// 또는 rediss://(TLS) 주소. 비밀번호 포함 가능
//   REDIS_HOST, REDIS_PORT, REDIS_PASSWORD, REDIS_TLS=1   주소를 나눠 줄 때
//   REDIS_KEY_PREFIX     키 앞에 붙일 접두어(기본 없음. Upstash 와 같은 키를 쓰려면 비워 둔다)
import { createRequire } from 'node:module'
import { Redis as UpstashRedis } from '@upstash/redis'

const require = createRequire(import.meta.url)

let cached = null
let cachedKey = ''

export function storeKind(env = process.env) {
  const forced = String(env.MIRI_STORE || '').toLowerCase()
  const hasRedis = Boolean(env.REDIS_URL || env.REDIS_HOST)
  const hasUpstash = Boolean((env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL) && (env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN))
  if (forced === 'redis') return hasRedis ? 'redis' : null
  if (forced === 'upstash') return hasUpstash ? 'upstash' : null
  if (forced === 'none') return null
  if (hasRedis) return 'redis'
  if (hasUpstash) return 'upstash'
  return null
}

const configKey = (env) => [env.MIRI_STORE, env.REDIS_URL, env.REDIS_HOST, env.REDIS_PORT, env.REDIS_PASSWORD, env.REDIS_TLS, env.REDIS_KEY_PREFIX,
  env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN].join('|')

// 공유 저장소 하나를 돌려준다. 설정이 바뀌면 새로 만든다
export function getStore(env = process.env) {
  const kind = storeKind(env)
  if (!kind) return null
  const k = configKey(env)
  if (cached && cachedKey === k) return cached
  if (kind === 'upstash') {
    cached = new UpstashRedis({ url: env.UPSTASH_REDIS_REST_URL || env.KV_REST_API_URL, token: env.UPSTASH_REDIS_REST_TOKEN || env.KV_REST_API_TOKEN })
  } else {
    cached = new StandardStore(env)
  }
  cachedKey = k
  return cached
}

// 시험에서 만든 연결을 닫는다
export async function closeStore() {
  if (cached && typeof cached.quit === 'function') await cached.quit()
  cached = null
  cachedKey = ''
}

// Upstash 의 기본 해석 규칙과 같게 맞춘다(pkg/util.ts parseRecursive)
export function parseValue(v) {
  if (Array.isArray(v)) return v.map(parseValue)
  if (typeof v !== 'string') return v
  try {
    const p = JSON.parse(v)
    if (typeof p === 'number' && p.toString() !== v) return v
    return p
  } catch { return v }
}
export const serialize = (v) => (typeof v === 'string' ? v : JSON.stringify(v))

function hashOf(arr) {
  if (!arr || !arr.length) return null
  const out = {}
  for (let i = 0; i < arr.length; i += 2) {
    const v = arr[i + 1]
    const unsafe = !Number.isNaN(Number(v)) && !Number.isSafeInteger(Number(v))
    if (unsafe) { out[arr[i]] = v; continue }
    try { out[arr[i]] = JSON.parse(v) } catch { out[arr[i]] = v }
  }
  return out
}

// 표준 Redis 를 Upstash 클라이언트 모양으로 감싼다. 핸들러가 쓰는 명령만 둔다
export class StandardStore {
  constructor(env = process.env, client = null) {
    this.client = client || StandardStore.connect(env)
  }

  static connect(env) {
    // ioredis 는 표준 Redis 를 쓸 때만 불러온다
    const IORedis = StandardStore.IORedis || (StandardStore.IORedis = require('ioredis'))
    const common = { lazyConnect: false, maxRetriesPerRequest: 2, enableReadyCheck: true, keyPrefix: env.REDIS_KEY_PREFIX || undefined, connectTimeout: 5000 }
    if (env.REDIS_URL) {
      const tls = env.REDIS_URL.startsWith('rediss://') || env.REDIS_TLS === '1' ? {} : undefined
      return new IORedis(env.REDIS_URL, { ...common, tls })
    }
    return new IORedis({ ...common, host: env.REDIS_HOST, port: Number(env.REDIS_PORT || 6379), password: env.REDIS_PASSWORD || undefined, tls: env.REDIS_TLS === '1' ? {} : undefined })
  }

  async get(key) { return parseValue(await this.client.get(key)) }
  async mget(...keys) { return keys.length ? (await this.client.mget(...keys)).map(parseValue) : [] }
  async set(key, value, opts) {
    const args = [key, serialize(value)]
    if (opts?.nx) args.push('NX')
    else if (opts?.xx) args.push('XX')
    if (opts?.ex) args.push('EX', String(opts.ex))
    else if (opts?.px) args.push('PX', String(opts.px))
    return this.client.set(...args) // 'OK' 또는 null(NX 실패)
  }
  async incr(key) { return Number(await this.client.incr(key)) }
  async expire(key, sec) { return Number(await this.client.expire(key, sec)) }
  async del(...keys) { return keys.length ? Number(await this.client.del(...keys)) : 0 }
  async rpush(key, ...vals) { return Number(await this.client.rpush(key, ...vals.map(serialize))) }
  async lrange(key, start, stop) { return (await this.client.lrange(key, start, stop)).map(parseValue) }
  async hgetall(key) {
    const obj = await this.client.hgetall(key) // ioredis 는 객체로 돌려준다
    return hashOf(Object.entries(obj || {}).flat())
  }
  async hset(key, obj) {
    const flat = Object.entries(obj).flatMap(([f, v]) => [f, serialize(v)])
    return flat.length ? Number(await this.client.hset(key, ...flat)) : 0
  }
  async exists(...keys) { return Number(await this.client.exists(...keys)) }
  async eval(script, keys = [], args = []) {
    const out = await this.client.eval(script, keys.length, ...keys, ...args.map(serialize))
    return parseValue(out)
  }
  async ping() { return this.client.ping() }
  async scan(cursor, opts = {}) {
    const a = [String(cursor)]
    if (opts.match) a.push('MATCH', opts.match)
    if (opts.count) a.push('COUNT', String(opts.count))
    const [next, keys] = await this.client.scan(...a)
    return [next, keys]
  }
  async type(key) { return this.client.type(key) }
  async ttl(key) { return Number(await this.client.ttl(key)) }
  async quit() { try { await this.client.quit() } catch { /* 이미 닫힘 */ } }
}
