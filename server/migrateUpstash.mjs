// Upstash(현재 저장소)의 키를 표준 Redis(네이버 클라우드 Cloud DB for Redis)로 복사한다.
// 기본은 드라이런: 키 묶음별 개수와 종류만 출력하고 값은 출력하지 않는다.
// 실행(client 폴더의 node_modules 를 쓴다):
//   node server/migrateUpstash.mjs                 드라이런
//   node server/migrateUpstash.mjs --apply         실제 복사(대상 REDIS_URL 필요, 같은 키가 있으면 건너뜀)
//   node server/migrateUpstash.mjs --apply --overwrite   같은 키도 덮어씀
// 원본: UPSTASH_REDIS_REST_URL/TOKEN(또는 KV_REST_API_URL/TOKEN), 대상: REDIS_URL 또는 REDIS_HOST/PORT/PASSWORD/TLS
import { createRequire } from 'node:module'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'

const req = createRequire(join(dirname(fileURLToPath(import.meta.url)), '..', 'client', 'package.json'))
const { Redis: Upstash } = req('@upstash/redis')
const apply = process.argv.includes('--apply')
const overwrite = process.argv.includes('--overwrite')
const match = (process.argv.find((a) => a.startsWith('--match=')) || '--match=*').slice(8)

const url = process.env.UPSTASH_REDIS_REST_URL || process.env.KV_REST_API_URL
const token = process.env.UPSTASH_REDIS_REST_TOKEN || process.env.KV_REST_API_TOKEN
if (!url || !token) { console.error('원본 Upstash 주소와 토큰이 없습니다'); process.exit(2) }
const src = new Upstash({ url, token, automaticDeserialization: false })

let dst = null
if (apply) {
  if (!process.env.REDIS_URL && !process.env.REDIS_HOST) { console.error('대상 REDIS_URL(또는 REDIS_HOST)이 없습니다'); process.exit(2) }
  const IORedis = req('ioredis')
  const tls = (process.env.REDIS_URL || '').startsWith('rediss://') || process.env.REDIS_TLS === '1' ? {} : undefined
  dst = process.env.REDIS_URL
    ? new IORedis(process.env.REDIS_URL, { tls, maxRetriesPerRequest: 2 })
    : new IORedis({ host: process.env.REDIS_HOST, port: Number(process.env.REDIS_PORT || 6379), password: process.env.REDIS_PASSWORD || undefined, tls, maxRetriesPerRequest: 2 })
}

// 키 묶음 이름: 앞 두 마디(예: miri:ws, miri:rl). 값과 전체 키 이름은 출력하지 않는다
const groupOf = (k) => k.split(':').slice(0, 2).join(':')
const stat = new Map()
let copied = 0; let skipped = 0; let unsupported = 0
let cursor = '0'
do {
  const [next, keys] = await src.scan(cursor, { match, count: 500 })
  cursor = String(next)
  for (const k of keys) {
    const type = await src.type(k)
    const g = `${groupOf(k)} (${type})`
    stat.set(g, (stat.get(g) || 0) + 1)
    if (!apply) continue
    if (!overwrite && (await dst.exists(k))) { skipped += 1; continue }
    const ttl = Number(await src.pttl(k))
    const multi = dst.multi().del(k)
    if (type === 'string') multi.set(k, await src.get(k))
    else if (type === 'list') { const v = await src.lrange(k, 0, -1); if (v.length) multi.rpush(k, ...v) }
    else if (type === 'hash') { const v = await src.hgetall(k); const flat = Array.isArray(v) ? v : Object.entries(v || {}).flat(); if (flat.length) multi.hset(k, ...flat) }
    else if (type === 'set') { const v = await src.smembers(k); if (v.length) multi.sadd(k, ...v) }
    else { unsupported += 1; continue }
    if (ttl > 0) multi.pexpire(k, ttl)
    await multi.exec()
    copied += 1
  }
} while (cursor !== '0')

console.log(JSON.stringify({ mode: apply ? 'apply' : 'dry-run', match, groups: Object.fromEntries([...stat].sort()), total: [...stat.values()].reduce((a, b) => a + b, 0), copied, skipped, unsupported }, null, 2))
if (dst) await dst.quit()
