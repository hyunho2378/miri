// 모델 호출 어댑터. 재현성 시험, 채점, 후보 비교(tools/model-bench)가 같은 함수로 모델을 부른다.
// callModel(modelId, { system, user }, opts) → 모델이 낸 JSON 객체(배열이면 { items })
//   HCX-005, HCX-007: 네이버 클라우드 CLOVA Studio(환경변수 NCP_CLOVASTUDIO_KEY). opts: temperature, topP, seed(null 이면 보내지 않음), maxTokens
// 후보는 국내 HyperCLOVA X 계열만 부른다. 내려받아 쓰는 공개 모델과 해외 API 경로는 쓰지 않기로 해 뺐다(2026. 10. 22.).
// HCX-007 은 추론 모델이라 요청 인자(추론 길이 등)가 HCX-005 와 다를 수 있다. 문서 확인 전에는 HCX-005 와 같은 인자로 보낸다(확인 필요).
import { hcxJson } from '../../client/api/_ncp.js'

export async function callModel(modelId, { system, user }, opts = {}) {
  const t0 = Date.now()
  if (!/^HCX-/.test(modelId)) throw Object.assign(new Error(`모르는 모델 ${modelId}`), { code: 'BAD_MODEL' })
  const out = await hcxJson(system, user, opts.maxTokens ?? 1600, { model: modelId, temperature: opts.temperature, topP: opts.topP, seed: opts.seed })
  return { out, ms: Date.now() - t0 }
}
