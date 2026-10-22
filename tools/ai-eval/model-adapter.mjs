// 모델 호출 어댑터. 재현성 시험, 채점, 다른 모델 비교(tools/model-bench)가 같은 함수로 모델을 부른다.
// callModel(modelId, { system, user }, opts) → 모델이 낸 JSON 객체(배열이면 { items })
//   HCX-005, HCX-007: 네이버 클라우드 CLOVA Studio(환경변수 NCP_CLOVASTUDIO_KEY). opts: temperature, topP, seed(null 이면 보내지 않음), maxTokens
//   ollama:<모델 이름>: 내려받아 쓰는 공개 모델(로컬 Ollama, OLLAMA_URL 기본 http://localhost:11434). 네트워크 밖으로 글자가 나가지 않는다
//   openai-compat:<모델 이름>: OpenAI 호환 서버(MODEL_BASE_URL, MODEL_API_KEY). vLLM 같은 자체 서버용
// HCX-007 은 추론 모델이라 요청 인자(추론 길이 등)가 HCX-005 와 다를 수 있다. 문서 확인 전에는 HCX-005 와 같은 인자로 보낸다(확인 필요).
import { hcxJson, parseModelJson } from '../../client/api/_ncp.js'

export async function callModel(modelId, { system, user }, opts = {}) {
  const t0 = Date.now()
  let out
  if (/^HCX-/.test(modelId)) {
    out = await hcxJson(system, user, opts.maxTokens ?? 1600, { model: modelId, temperature: opts.temperature, topP: opts.topP, seed: opts.seed })
  } else if (modelId.startsWith('ollama:')) {
    const base = process.env.OLLAMA_URL || 'http://localhost:11434'
    const r = await fetch(`${base}/api/chat`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ model: modelId.slice(7), stream: false, format: 'json', messages: [{ role: 'system', content: system }, { role: 'user', content: user }], options: { temperature: opts.temperature ?? 0.1, top_p: opts.topP ?? 0.8, ...(opts.seed == null ? {} : { seed: opts.seed }) } }) })
    if (!r.ok) throw Object.assign(new Error(`ollama ${r.status}`), { code: 'UPSTREAM' })
    out = parseModelJson((await r.json())?.message?.content)
  } else if (modelId.startsWith('openai-compat:')) {
    const base = process.env.MODEL_BASE_URL
    if (!base) throw Object.assign(new Error('MODEL_BASE_URL 없음'), { code: 'NO_KEY' })
    const r = await fetch(`${base.replace(/\/$/, '')}/chat/completions`, { method: 'POST', headers: { 'Content-Type': 'application/json', ...(process.env.MODEL_API_KEY ? { Authorization: `Bearer ${process.env.MODEL_API_KEY}` } : {}) }, body: JSON.stringify({ model: modelId.slice(14), messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: opts.temperature ?? 0.1, top_p: opts.topP ?? 0.8, ...(opts.seed == null ? {} : { seed: opts.seed }), response_format: { type: 'json_object' } }) })
    if (!r.ok) throw Object.assign(new Error(`openai-compat ${r.status}`), { code: 'UPSTREAM' })
    out = parseModelJson((await r.json())?.choices?.[0]?.message?.content)
  } else {
    throw Object.assign(new Error(`모르는 모델 ${modelId}`), { code: 'BAD_MODEL' })
  }
  return { out, ms: Date.now() - t0 }
}
