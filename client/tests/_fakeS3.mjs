// 시험용 S3 호환 메모리 서버(네이버 클라우드 Object Storage 대역). 실제 HTTP 로 받고, 서명(SigV4)을 받은 그대로 다시 계산해 맞는지 본다.
// 지원: 객체 GET, PUT(If-Match, If-None-Match: *), DELETE(If-Match), ListObjectsV2(prefix, max-keys, continuation-token)
// delayMs 를 주면 응답마다 늦춰 동시 요청이 서로 끼어들게 만든다. stats 로 412(조건 불일치) 횟수를 센다
import { createServer } from 'node:http'
import { createHash, createHmac } from 'node:crypto'

const sha256 = (d) => createHash('sha256').update(d).digest('hex')
const hmac = (k, d) => createHmac('sha256', k).update(d).digest()
const enc = (s) => encodeURIComponent(s).replace(/[!'()*]/g, (c) => `%${c.charCodeAt(0).toString(16).toUpperCase()}`)

export async function startFakeS3({ bucket = 'test-bucket', accessKey = 'TESTACCESS', secretKey = 'test-secret-key', region = 'kr-standard', delayMs = 0 } = {}) {
  const objects = new Map() // key -> { body, etag }
  const stats = { requests: 0, preconditionFailed: 0, badSignature: 0, puts: 0, gets: 0, deletes: 0, lists: 0 }
  const delay = () => (delayMs ? new Promise((r) => setTimeout(r, Math.random() * delayMs)) : null)

  function checkSignature(req, body) {
    const auth = String(req.headers.authorization || '')
    const m = /^AWS4-HMAC-SHA256 Credential=([^/]+)\/(\d{8})\/([^/]+)\/s3\/aws4_request, SignedHeaders=([^,]+), Signature=([0-9a-f]{64})$/.exec(auth)
    if (!m || m[1] !== accessKey || m[3] !== region) return false
    const [, , day, , signed, sig] = m
    if (req.headers['x-amz-content-sha256'] !== sha256(body)) return false
    const u = new URL(req.url, 'http://x')
    const names = signed.split(';')
    const canonicalHeaders = names.map((k) => `${k}:${String(req.headers[k] ?? '').trim()}\n`).join('')
    const query = [...u.searchParams].map(([k, v]) => [enc(k), enc(v)]).sort((a, b) => (a[0] === b[0] ? (a[1] < b[1] ? -1 : 1) : a[0] < b[0] ? -1 : 1)).map(([k, v]) => `${k}=${v}`).join('&')
    const rawPath = req.url.split('?')[0]
    const canonical = [req.method, rawPath, query, canonicalHeaders, signed, sha256(body)].join('\n')
    const toSign = ['AWS4-HMAC-SHA256', req.headers['x-amz-date'], `${day}/${region}/s3/aws4_request`, sha256(canonical)].join('\n')
    const k = hmac(hmac(hmac(hmac(`AWS4${secretKey}`, day), region), 's3'), 'aws4_request')
    return createHmac('sha256', k).update(toSign).digest('hex') === sig
  }

  const xml = (s) => String(s).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;')
  const server = createServer((req, res) => {
    const chunks = []
    req.on('data', (c) => chunks.push(c))
    req.on('end', async () => {
      stats.requests += 1
      const body = Buffer.concat(chunks)
      if (!checkSignature(req, body)) { stats.badSignature += 1; res.statusCode = 403; return res.end('<Error><Code>SignatureDoesNotMatch</Code></Error>') }
      const u = new URL(req.url, 'http://x')
      const parts = u.pathname.split('/').slice(1)
      if (decodeURIComponent(parts[0]) !== bucket) { res.statusCode = 404; return res.end('<Error><Code>NoSuchBucket</Code></Error>') }
      const key = parts.slice(1).map(decodeURIComponent).join('/')
      await delay()
      if (req.method === 'GET' && !key) {
        stats.lists += 1
        const prefix = u.searchParams.get('prefix') || ''
        const max = Number(u.searchParams.get('max-keys') || 1000)
        const after = u.searchParams.get('continuation-token') || ''
        const all = [...objects.keys()].filter((k) => k.startsWith(prefix)).sort().filter((k) => !after || k > after)
        const page = all.slice(0, max)
        const truncated = all.length > max
        res.setHeader('content-type', 'application/xml')
        return res.end(`<?xml version="1.0"?><ListBucketResult><Name>${xml(bucket)}</Name><Prefix>${xml(prefix)}</Prefix><KeyCount>${page.length}</KeyCount><IsTruncated>${truncated}</IsTruncated>${page.map((k) => `<Contents><Key>${xml(k)}</Key></Contents>`).join('')}${truncated ? `<NextContinuationToken>${xml(page[page.length - 1])}</NextContinuationToken>` : ''}</ListBucketResult>`)
      }
      const cur = objects.get(key)
      if (req.method === 'GET') {
        stats.gets += 1
        if (!cur) { res.statusCode = 404; return res.end('<Error><Code>NoSuchKey</Code></Error>') }
        res.setHeader('etag', cur.etag)
        return res.end(cur.body)
      }
      const ifMatch = req.headers['if-match']
      const ifNone = req.headers['if-none-match']
      const fail412 = () => { stats.preconditionFailed += 1; res.statusCode = 412; res.end('<Error><Code>PreconditionFailed</Code></Error>') }
      if (req.method === 'PUT') {
        stats.puts += 1
        if (ifNone === '*' && cur) return fail412()
        if (ifMatch && (!cur || cur.etag !== ifMatch)) return fail412()
        const etag = `"${createHash('md5').update(body).digest('hex')}"`
        objects.set(key, { body: body.toString('utf8'), etag })
        res.setHeader('etag', etag)
        return res.end()
      }
      if (req.method === 'DELETE') {
        stats.deletes += 1
        if (ifMatch && cur && cur.etag !== ifMatch) return fail412()
        objects.delete(key)
        res.statusCode = 204
        return res.end()
      }
      res.statusCode = 405
      res.end()
    })
  })
  await new Promise((r) => server.listen(0, '127.0.0.1', r))
  const endpoint = `http://127.0.0.1:${server.address().port}`
  return {
    endpoint, objects, stats, bucket,
    env: { NCP_OBJECT_ENDPOINT: endpoint, NCP_OBJECT_BUCKET: bucket, NCP_OBJECT_ACCESS_KEY: accessKey, NCP_OBJECT_SECRET_KEY: secretKey, NCP_OBJECT_REGION: region },
    close: () => new Promise((r) => { server.closeAllConnections?.(); server.close(r) })
  }
}
