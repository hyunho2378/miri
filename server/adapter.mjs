// Vercel 함수(client/api/*.js)를 Vercel 밖에서 그대로 돌리기 위한 얇은 어댑터.
// 핸들러 코드는 바꾸지 않는다. Vercel 이 주던 req.query, req.body, res.status().json(), res.send() 를 여기서 채운다.
// 쓰는 곳: server/index.mjs(독립 Node 서버), server/ncpAction.mjs(네이버 클라우드 Cloud Functions 웹 액션)
import { existsSync } from 'node:fs'
import { dirname, join } from 'node:path'
import { fileURLToPath, pathToFileURL } from 'node:url'

const here = dirname(fileURLToPath(import.meta.url))
export const API_DIR = process.env.MIRI_API_DIR || join(here, '..', 'client', 'api')
export const MAX_BODY = 6 * 1024 * 1024 // Vercel 본문 상한(4.5MB)보다 조금 넉넉하게
const NAME_RE = /^[a-z][a-z0-9-]{0,40}$/

const cache = new Map()
// /api/<이름> 을 client/api/<이름>.js 로. 밑줄로 시작하는 공용 파일과 경로 탈출은 막는다
export async function loadHandler(name) {
  if (!NAME_RE.test(name)) return null
  if (cache.has(name)) return cache.get(name)
  const file = join(API_DIR, `${name}.js`)
  if (!existsSync(file)) { cache.set(name, null); return null }
  const mod = await import(pathToFileURL(file).href)
  const entry = { handler: mod.default, config: mod.config || {} }
  cache.set(name, entry)
  return entry
}

export function routeOf(pathname) {
  const m = /^\/api\/([^/]+)\/?$/.exec(pathname)
  return m ? m[1] : null
}

// Vercel 의 본문 해석과 같게: JSON 은 객체, text/* 는 문자열, 폼은 객체, 나머지는 Buffer
export function parseBody(buf, contentType = '') {
  if (!buf || !buf.length) return undefined
  const ct = String(contentType).split(';')[0].trim().toLowerCase()
  if (ct === 'application/json' || ct.endsWith('+json')) {
    try { return JSON.parse(buf.toString('utf8')) } catch { return buf.toString('utf8') }
  }
  if (ct.startsWith('text/')) return buf.toString('utf8')
  if (ct === 'application/x-www-form-urlencoded') return Object.fromEntries(new URLSearchParams(buf.toString('utf8')))
  return buf
}

export function queryOf(searchParams) {
  const q = {}
  for (const [k, v] of searchParams) {
    if (k in q) q[k] = [].concat(q[k], v)
    else q[k] = v
  }
  return q
}

// Vercel 응답 도우미를 Node 응답 객체에 붙인다
export function decorateResponse(res) {
  res.status = (code) => { res.statusCode = code; return res }
  res.json = (obj) => {
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/json; charset=utf-8')
    res.end(JSON.stringify(obj))
    return res
  }
  res.send = (body) => {
    if (body === undefined || body === null) { res.end(); return res }
    if (Buffer.isBuffer(body) || body instanceof Uint8Array) {
      if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'application/octet-stream')
      res.end(body)
      return res
    }
    if (typeof body === 'object') return res.json(body)
    if (!res.getHeader('Content-Type')) res.setHeader('Content-Type', 'text/html; charset=utf-8')
    res.end(String(body))
    return res
  }
  res.redirect = (a, b) => {
    const [code, loc] = typeof a === 'number' ? [a, b] : [307, a]
    res.statusCode = code
    res.setHeader('Location', loc)
    res.end()
    return res
  }
  return res
}

// 프록시(Vercel rewrites) 뒤에서 원래 host 를 쓰고 싶을 때만 켠다. 기본은 MIRI_ALLOWED_ORIGINS 로 허용
export function adjustHeaders(headers, env = process.env) {
  if (env.MIRI_TRUST_FORWARDED_HOST === '1' && headers['x-forwarded-host']) {
    headers.host = String(headers['x-forwarded-host']).split(',')[0].trim()
  }
  return headers
}

// 핸들러 하나를 실행한다. 제한 시간(config.maxDuration, 기본 15초)을 넘기면 504
export async function runHandler(entry, req, res) {
  const limitMs = (Number(entry.config?.maxDuration) || 15) * 1000 + 2000
  let timer
  const timeout = new Promise((resolve) => {
    timer = setTimeout(() => {
      if (!res.headersSent && !res.writableEnded) res.status(504).json({ error: { code: 'TIMEOUT', message: '서버 처리 시간 초과' } })
      resolve()
    }, limitMs)
  })
  try {
    await Promise.race([Promise.resolve(entry.handler(req, res)), timeout])
  } catch (e) {
    if (!res.headersSent && !res.writableEnded) res.status(500).json({ error: { code: 'SERVER', message: '서버 오류' } })
    console.error(JSON.stringify({ at: new Date().toISOString(), level: 'error', path: req.url, message: String(e?.message || e) }))
  } finally {
    clearTimeout(timer)
  }
}
