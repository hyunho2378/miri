// 모델 호출 어댑터. 재현성 시험, 채점, 후보 비교(tools/model-bench)가 같은 함수로 모델을 부른다.
// callModel(modelId, { system, user }, opts) → 모델이 낸 JSON 객체(배열이면 { items })
//   HCX-005: 서비스와 같은 요청 본문(hcxBody, maxTokens). HCX-007: 추론 모델이라 maxTokens 를 받지 않고 maxCompletionTokens 와 thinking 을 받는다
//   (2026. 10. 22. 실제 호출에서 maxTokens 를 보내면 40001 Invalid parameter: maxTokens). 채점에는 추론 끔(thinking none)을 쓴다.
// 후보는 국내 HyperCLOVA X 계열만 부른다. 내려받아 쓰는 공개 모델과 해외 API 경로는 쓰지 않기로 해 뺐다(2026. 10. 22.).
import { hcxBody, parseModelJson } from '../../client/api/_ncp.js'

// 측정 전용 괄호 보정: 루브릭 출력에서 HCX-005 가 마지막 닫는 괄호를 빠뜨리는 경우가 관찰됐다(2026. 10. 22.).
// 서비스 해석기(parseModelJson)는 그대로 두고, 시험 도구만 짝을 맞춰 한 번 더 읽고 repaired 로 표시한다. 내용은 고치지 않는다
export function closeBrackets(t) {
  const stack = []; let inStr = false, esc = false
  for (const ch of t) {
    if (inStr) { if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
    if (ch === '"') inStr = true
    else if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') { const o = stack.pop(); if ((ch === '}' && o !== '{') || (ch === ']' && o !== '[')) return null }
  }
  if (inStr || !stack.length || stack.length > 3) return null
  return t + stack.reverse().map((c) => (c === '{' ? '}' : ']')).join('')
}
export function parseWithRepair(content) {
  try { return { out: parseModelJson(content), repaired: false } } catch (e) {
    const text = String(content || '').replace(/```(?:json)?/g, '').trim()
    const st = [text.indexOf('{'), text.indexOf('[')].filter((x) => x >= 0).sort((a, b) => a - b)[0]
    const fixed = st == null ? null : closeBrackets(text.slice(st))
    if (fixed) { const v = JSON.parse(fixed); return { out: Array.isArray(v) ? { items: v } : v, repaired: true } }
    throw e
  }
}

async function hcx005(system, user, opts) {
  const key = process.env.NCP_CLOVASTUDIO_KEY
  if (!key) throw Object.assign(new Error('NCP_CLOVASTUDIO_KEY 없음'), { code: 'NO_KEY' })
  const r = await fetch('https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-005', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(hcxBody(system, user, opts.maxTokens ?? 1600, { model: 'HCX-005', temperature: opts.temperature, topP: opts.topP, seed: opts.seed })) })
  const out = await r.json().catch(() => null)
  if (!r.ok || !out || (out?.status?.code && out.status.code !== '20000')) throw Object.assign(new Error(`HCX-005 오류 ${r.status} ${out?.status?.code || ''}`), { code: 'UPSTREAM' })
  return parseWithRepair(out?.result?.message?.content)
}

async function hcx007(system, user, opts) {
  const key = process.env.NCP_CLOVASTUDIO_KEY
  if (!key) throw Object.assign(new Error('NCP_CLOVASTUDIO_KEY 없음'), { code: 'NO_KEY' })
  const body = {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    thinking: { effort: opts.thinking || 'none' }, maxCompletionTokens: opts.maxTokens ?? 1500,
    temperature: opts.temperature ?? 0.1, topP: opts.topP ?? 0.8, repetitionPenalty: 1.0,
    ...(opts.seed == null ? {} : { seed: opts.seed })
  }
  const r = await fetch('https://clovastudio.stream.ntruss.com/v3/chat-completions/HCX-007', { method: 'POST', headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}` }, body: JSON.stringify(body) })
  const out = await r.json().catch(() => null)
  if (!r.ok || !out || (out?.status?.code && out.status.code !== '20000')) throw Object.assign(new Error(`HCX-007 오류 ${r.status} ${out?.status?.code || ''}`), { code: 'UPSTREAM' })
  return parseWithRepair(out?.result?.message?.content)
}

export async function callModel(modelId, { system, user }, opts = {}) {
  const t0 = Date.now()
  if (!/^HCX-/.test(modelId)) throw Object.assign(new Error(`모르는 모델 ${modelId}`), { code: 'BAD_MODEL' })
  const { out, repaired } = modelId === 'HCX-007' ? await hcx007(system, user, opts) : await hcx005(system, user, opts)
  return { out, repaired, ms: Date.now() - t0 }
}
