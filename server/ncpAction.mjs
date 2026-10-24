// 네이버 클라우드 Cloud Functions(Apache OpenWhisk 방식) 웹 액션 진입점.
// 액션 하나가 /api/<이름> 전부를 받는다(API Gateway 에서 /api/{name} 경로를 이 액션으로 연결, raw HTTP 사용).
// OpenWhisk 가 주는 __ow_method, __ow_headers, __ow_path, __ow_query, __ow_body 로 Vercel 모양 요청을 만들어
// client/api/*.js 핸들러를 그대로 부른다. 묶을 때 client/api, client/src/lib, client/node_modules 를 함께 넣는다.
import { adjustHeaders, decorateResponse, loadHandler, parseBody, queryOf, routeOf, runHandler } from './adapter.mjs'

const TEXT_RE = /^(text\/|application\/(json|javascript|xml)|.*\+json)/i

function fakeResponse() {
  const headers = {}
  const chunks = []
  const res = {
    statusCode: 200,
    headersSent: false,
    writableEnded: false,
    setHeader(k, v) { headers[String(k).toLowerCase()] = v; return res },
    getHeader(k) { return headers[String(k).toLowerCase()] },
    removeHeader(k) { delete headers[String(k).toLowerCase()] },
    write(c) { res.headersSent = true; chunks.push(Buffer.isBuffer(c) ? c : Buffer.from(String(c))); return true },
    end(c) { if (c !== undefined && c !== null) res.write(c); res.headersSent = true; res.writableEnded = true; return res }
  }
  decorateResponse(res)
  res.result = () => {
    const body = Buffer.concat(chunks)
    const type = String(headers['content-type'] || '')
    const textual = !type || TEXT_RE.test(type)
    return { statusCode: res.statusCode, headers, body: textual ? body.toString('utf8') : body.toString('base64') }
  }
  return res
}

export async function main(params = {}) {
  const method = String(params.__ow_method || 'get').toUpperCase()
  const path = String(params.__ow_path || params.path || '')
  const pathname = path.startsWith('/api/') ? path : `/api/${path.replace(/^\/+/, '')}`
  const name = routeOf(pathname)
  const res = fakeResponse()
  const entry = name ? await loadHandler(name).catch(() => null) : null
  if (!entry || typeof entry.handler !== 'function') return res.status(404).json({ error: { code: 'NOT_FOUND', message: '없는 API' } }).result()
  const headers = adjustHeaders({ ...(params.__ow_headers || {}) })
  const rawQuery = typeof params.__ow_query === 'string' ? params.__ow_query : ''
  const req = {
    method,
    url: `${pathname}${rawQuery ? `?${rawQuery}` : ''}`,
    headers,
    query: queryOf(new URLSearchParams(rawQuery)),
    socket: { remoteAddress: headers['x-real-ip'] || '' },
    readableEnded: true
  }
  if (!['GET', 'HEAD'].includes(method) && params.__ow_body) {
    const b = params.__ow_body
    const ct = String(headers['content-type'] || '')
    const buf = TEXT_RE.test(ct) || ct.startsWith('application/x-www-form-urlencoded') ? Buffer.from(String(b), 'utf8') : Buffer.from(String(b), 'base64')
    req.body = parseBody(buf, ct)
  }
  await runHandler(entry, req, res)
  return res.result()
}
