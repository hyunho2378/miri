// 미리 API 독립 서버(네이버 클라우드 Server 또는 다른 Node 환경용).
// client/api/*.js 의 Vercel 함수를 그대로 불러 /api/<이름> 으로 연다. 의존성은 Node 기본 모듈뿐이다.
//
// 실행: node server/index.mjs            (client 폴더에서 npm install 을 먼저 해 둔다)
// 환경 변수
//   PORT(기본 8787), HOST(기본 0.0.0.0)
//   MIRI_RUNTIME            상태 확인에 보일 실행 위치 이름(예: ncp-server)
//   MIRI_STATIC_DIR         값이 있으면 그 폴더(예: client/dist)의 화면도 같이 내보낸다(로컬 확인용)
//   MIRI_ALLOWED_ORIGINS    Vercel 에서 넘겨받을 때 원래 주소(예: https://miri-indol.vercel.app)
//   MIRI_TRUST_FORWARDED_HOST=1  프록시가 붙인 X-Forwarded-Host 를 host 로 쓴다
//   그 밖의 키(MIRI_DEMO_CODE, MIRI_SESSION_SECRET, NCP_*, REDIS_URL 등)는 Vercel 과 같은 이름
import { createServer } from 'node:http'
import { createReadStream, existsSync, statSync } from 'node:fs'
import { extname, join, normalize, resolve, sep } from 'node:path'
import { createRequire } from 'node:module'
import { MAX_BODY, adjustHeaders, decorateResponse, loadHandler, parseBody, queryOf, routeOf, runHandler } from './adapter.mjs'

// 로컬 확인 전용: Redis 서버가 없을 때 ioredis-mock(개발 의존성)으로 표준 Redis 경로를 돌린다. 배포에서는 켜지 않는다
if (process.env.MIRI_DEV_REDIS_MOCK === '1') {
  if (process.env.NODE_ENV === 'production') throw new Error('MIRI_DEV_REDIS_MOCK 는 배포에서 쓸 수 없습니다')
  const req = createRequire(new URL('../client/package.json', import.meta.url))
  const { StandardStore } = await import('../client/api/_store.js')
  const Mock = req('ioredis-mock')
  StandardStore.IORedis = class extends Mock { constructor(a, b) { super(typeof a === 'object' ? a : b) } }
  process.env.MIRI_STORE = 'redis'
  process.env.REDIS_URL = process.env.REDIS_URL || 'redis://mock'
}

const PORT = Number(process.env.PORT || 8787)
const HOST = process.env.HOST || '0.0.0.0'
const STATIC = process.env.MIRI_STATIC_DIR ? resolve(process.env.MIRI_STATIC_DIR) : null
const TYPES = { '.html': 'text/html; charset=utf-8', '.js': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.json': 'application/json', '.svg': 'image/svg+xml', '.png': 'image/png', '.jpg': 'image/jpeg', '.webp': 'image/webp', '.woff2': 'font/woff2', '.ico': 'image/x-icon', '.pbf': 'application/x-protobuf', '.geojson': 'application/geo+json', '.txt': 'text/plain; charset=utf-8' }

function readBody(req) {
  return new Promise((ok, bad) => {
    const chunks = []
    let size = 0
    req.on('data', (c) => {
      size += c.length
      if (size > MAX_BODY) { bad(Object.assign(new Error('too large'), { code: 'TOO_LARGE' })); req.destroy(); return }
      chunks.push(c)
    })
    req.on('end', () => ok(Buffer.concat(chunks)))
    req.on('error', bad)
  })
}

function serveStatic(pathname, res) {
  const rel = normalize(decodeURIComponent(pathname)).replace(/^([/\\])+/, '')
  let file = join(STATIC, rel)
  if (!file.startsWith(STATIC + sep) && file !== STATIC) { res.statusCode = 403; res.end(); return }
  if (!existsSync(file) || statSync(file).isDirectory()) file = join(STATIC, 'index.html') // 화면 경로는 index.html 로
  res.setHeader('Content-Type', TYPES[extname(file)] || 'application/octet-stream')
  createReadStream(file).pipe(res)
}

export function createApiServer() {
  return createServer(async (req, res) => {
    decorateResponse(res)
    const url = new URL(req.url, 'http://localhost')
    const name = routeOf(url.pathname)
    if (!name) {
      if (STATIC && (req.method === 'GET' || req.method === 'HEAD')) return serveStatic(url.pathname, res)
      return res.status(404).json({ error: { code: 'NOT_FOUND', message: '없는 주소' } })
    }
    const entry = await loadHandler(name).catch(() => null)
    if (!entry || typeof entry.handler !== 'function') return res.status(404).json({ error: { code: 'NOT_FOUND', message: '없는 API' } })
    adjustHeaders(req.headers)
    req.query = queryOf(url.searchParams)
    if (!['GET', 'HEAD'].includes(req.method)) {
      try {
        req.body = parseBody(await readBody(req), req.headers['content-type'])
      } catch (e) {
        if (e.code === 'TOO_LARGE') return res.status(413).json({ error: { code: 'TOO_LARGE', message: '본문이 너무 큽니다' } })
        return res.status(400).json({ error: { code: 'BODY', message: '본문을 읽지 못했습니다' } })
      }
    }
    await runHandler(entry, req, res)
  })
}

if (import.meta.url === `file://${process.argv[1]}` || process.argv[1]?.endsWith('server/index.mjs')) {
  const server = createApiServer()
  server.listen(PORT, HOST, () => console.log(JSON.stringify({ at: new Date().toISOString(), level: 'info', message: 'miri api listening', port: PORT, static: Boolean(STATIC) })))
  const stop = () => server.close(() => process.exit(0))
  process.on('SIGTERM', stop)
  process.on('SIGINT', stop)
}
