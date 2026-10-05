// api/law.js Vercel 서버리스 함수. 본문 속 법령 인용(「법령명」 제N조)이 실제로 있는지 확인한다(PRD v2 F6).
// 공개 korean-law-mcp 서버(https://mcp.gomdori.app/law, 스트리머블 HTTP MCP, JSON-RPC 2.0)의 verify_citations 도구를 호출한다.
// POST { text } → { status: 'ok' | 'rate_limited', results: [{ citation, status: 'exists'|'not_found'|'unknown', title, detail }] }
// LAW_OC 환경변수가 있으면 법제처 인증키로 헤더 apikey 에 실어 보낸다(무키 공용 한도를 피한다). 없으면 공용 한도를 쓴다.
// 서버가 세션 없이 도구 호출을 받으므로 initialize 는 생략한다(실측 2026-10-06). 응답은 JSON 또는 SSE 틀을 모두 처리한다.

export const config = { maxDuration: 40 }

const ENDPOINT = process.env.LAW_MCP_URL || 'https://mcp.gomdori.app/law'
const MAX_TEXT = 12000
const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

function parseRpc(raw) {
  const t = String(raw || '').trim()
  if (!t) return null
  if (t.startsWith('{')) { try { return JSON.parse(t) } catch { return null } }
  // SSE 틀: "event: message\ndata: {...}"
  const data = t.split('\n').filter((l) => l.startsWith('data:')).map((l) => l.slice(5).trim()).filter(Boolean)
  for (const d of data.reverse()) { try { const j = JSON.parse(d); if (j && (j.result || j.error)) return j } catch { /* 다음 줄 */ } }
  return null
}

async function rpc(method, params, id, apikey) {
  const headers = { 'Content-Type': 'application/json', Accept: 'application/json, text/event-stream' }
  if (apikey) headers.apikey = apikey
  const r = await fetch(ENDPOINT, { method: 'POST', headers, body: JSON.stringify({ jsonrpc: '2.0', id, method, params }), signal: AbortSignal.timeout(30000) })
  const raw = await r.text()
  return { http: r.status, retryAfter: Number(r.headers.get('retry-after')) || 0, raw, json: parseRpc(raw) }
}

const ARTICLE = /^(.*?제\s*\d+\s*조(?:\s*의\s*\d+)?(?:\s*제\s*\d+\s*항)?(?:\s*제\s*\d+\s*호)?)\s*(?:\(([^)]*)\))?/

// verify_citations 출력 텍스트의 "▶ 법령 인용" 구간에서 줄마다 결과를 뽑는다
export function normalize(text) {
  const out = []
  const body = String(text || '')
  const start = body.indexOf('▶ 법령 인용')
  if (start < 0) return out
  let section = body.slice(start + '▶ 법령 인용'.length)
  const end = section.indexOf('▶ 판례 인용')
  if (end >= 0) section = section.slice(0, end)
  for (const line of section.split('\n')) {
    const m = line.match(/^(✓|✗|⚠|⌛)\s+(.*)$/)
    if (!m) continue
    const mark = m[1]
    const rest = m[2].trim()
    if (mark === '✓') {
      const am = rest.match(ARTICLE)
      out.push({ citation: (am?.[1] || rest).trim(), status: 'exists', title: am?.[2] || '', detail: rest.includes('제목 일치') ? '인용한 조문 제목이 실제와 일치합니다.' : (/제\d+항 실존/.test(rest) ? '항까지 확인했습니다.' : '') })
      continue
    }
    const [left, ...more] = rest.split(' — ')
    const detail = more.join(' — ').replace(/^\[[A-Z_]+\]\s*/, '').trim()
    const am = left.match(ARTICLE)
    const citation = (am?.[1] || left).trim()
    if (mark === '✗') out.push({ citation, status: 'not_found', title: '', detail })
    else out.push({ citation, status: 'unknown', title: '', detail: mark === '⌛' ? (detail || '폐지된 법령입니다.') : detail })
  }
  return out
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { return fail(res, 400, 'BAD_JSON', '요청 형식 오류') } }
  const text = typeof body?.text === 'string' ? body.text.trim() : ''
  if (!text) return fail(res, 400, 'BAD_INPUT', 'text 필요')
  if (text.length > MAX_TEXT) return fail(res, 413, 'TOO_LARGE', `본문 ${MAX_TEXT}자 초과`)
  const apikey = process.env.LAW_OC || ''

  try {
    let r = await rpc('tools/call', { name: 'verify_citations', arguments: { text, maxCitations: 30 } }, 1, apikey)
    if (r.http === 429) return res.status(200).json({ status: 'rate_limited', retryAfter: r.retryAfter, results: [] })
    // 도구가 목록에 없는 서버 버전이면 통합 도구로 한 번 더 시도한다
    const unknownTool = r.json?.error && /unknown|not found|찾을 수 없/i.test(JSON.stringify(r.json.error))
    if (unknownTool) {
      r = await rpc('tools/call', { name: 'legal_analysis', arguments: { mode: 'verify_citations', text, maxCitations: 30 } }, 2, apikey)
      if (r.http === 429) return res.status(200).json({ status: 'rate_limited', retryAfter: r.retryAfter, results: [] })
    }
    if (r.http >= 500 || !r.json) return fail(res, 502, 'UPSTREAM', `법령 서버 응답 오류 ${r.http}`)
    if (r.json.error) {
      if (/429|rate|한도|retry in/i.test(JSON.stringify(r.json.error))) return res.status(200).json({ status: 'rate_limited', retryAfter: r.retryAfter, results: [] })
      return fail(res, 502, 'UPSTREAM', '법령 서버가 요청을 처리하지 못했습니다')
    }
    // 환각 검출 시 서버가 isError 를 true 로 두므로 isError 는 오류로 보지 않고 본문을 읽는다
    const out = (r.json.result?.content || []).map((c) => c.text || '').join('\n')
    if (/rate.?limit|retry in \d+s|429/i.test(out) && !out.includes('▶ 법령 인용')) return res.status(200).json({ status: 'rate_limited', retryAfter: r.retryAfter, results: [] })
    const results = normalize(out)
    res.setHeader('Cache-Control', 'no-store')
    return res.status(200).json({ status: 'ok', results, source: '법제처 국가법령정보 Open API, korean-law-mcp verify_citations' })
  } catch (e) {
    return fail(res, 502, 'NETWORK', `법령 서버 호출 실패: ${e.message}`)
  }
}
