// 지시문 LLM 어댑터(A, B, C). 모델 호출은 공용 어댑터 tools/ai-eval/model-adapter.mjs 의 callModel 만 쓴다(중복 구현 없음).
//  - HCX-005, HCX-007: CLOVA Studio(국내). NCP_CLOVASTUDIO_KEY 가 있을 때만
//  - openai-compat:<이름>: 내려받아 쓰는 공개 모델을 llama.cpp llama-server 로 띄운 주소(MODEL_BASE_URL), 또는 해외 API(가상 자료 비교 전용)
//  - ollama:<이름>: 로컬 Ollama
// 두 가지 지시문을 같은 입력에 돌린다.
//  - grade: 서비스 판독 지시문(client/api/intake.js SYSTEM)과 같은 등급 정의, 등급을 직접 고름
//  - rubric: 루브릭 v0(client/src/lib/rubric.js RUBRIC_SYSTEM), 모델은 6차원 점수와 근거만, 등급은 코드 규칙(rubricPerson)
// 입력은 이미 가린 글자와 가상 문장뿐이다.
import { callModel } from '../../ai-eval/model-adapter.mjs'
import { RUBRIC_SYSTEM, rubricItemsOf, rubricPerson } from '../../../client/src/lib/rubric.js'

export const GRADE_SYSTEM = `너는 재난취약자 대피 서류의 거동 상태 문구를 이송 등급으로 분류하는 판독 보조기다.
담당자가 최종 확인하므로 추측하지 말고, 문구에 적힌 것만 근거로 쓴다.
이송 등급
- walk(도보): 혼자 걸을 수 있음. 인솔이나 안내가 필요해도 스스로 걷는다면 walk
- assist(부축): 지팡이, 보행기, 부축을 받으면 걸을 수 있고 승용차 탑승 가능
- wheelchair(휠체어): 휠체어에 앉은 채로 이동
- bed(침상): 누운 상태로만 이송 가능(와상, 침대에서 못 일어남)
- unknown: 문구가 없거나, 판독 불가이거나, 등급을 정할 근거가 없음
규칙
1. 입력의 각 구간(S1 …)마다 결과를 하나씩 낸다.
2. quote 에는 판정 근거가 된 부분을 한 글자도 바꾸지 않고 그대로 복사한다.
3. confidence 는 high, mid, low 중 하나.
4. 두 등급 사이에서 애매하면 더 높은 등급을 고르고 confidence 는 low 로 둔다. 낮게 판정하면 차가 가도 태우지 못한다.
5. 출력은 JSON 하나만 쓴다: {"items":[{"id":"S1","grade":"assist","quote":"…","confidence":"mid"}]}`

const GRADES = ['walk', 'assist', 'wheelchair', 'bed', 'unknown']
const user = (text) => `S1: ${text || '(문구 없음)'}`

export function fromGradeOut(out) {
  const it = Array.isArray(out?.items) ? out.items[0] : out
  if (!it || typeof it !== 'object') return { pred: 'unknown', conf: 'low', quote: '', parseError: true }
  return { pred: GRADES.includes(it.grade) ? it.grade : 'unknown', conf: ['high', 'mid', 'low'].includes(it.confidence) ? it.confidence : 'low', quote: typeof it.quote === 'string' ? it.quote : '' }
}

export function fromRubricOut(out, text) {
  let items
  try { items = rubricItemsOf(out) } catch { return { pred: 'unknown', conf: 'low', quote: '', parseError: true } }
  const p = rubricPerson(items[0], `S1: ${text}`)
  return { pred: p.grade, conf: p.confidence, quote: p.quote, dims: p.rubric?.dims }
}

// prompt: 'grade' | 'rubric'
export function llmAdapter({ id, label, kind, model, prompt = 'grade', temperature = 0.1, topP = 0.8, seed = 20261022 }) {
  return {
    id, label, kind, prompt,
    async run(item) {
      const t0 = Date.now()
      if (!String(item.text || '').trim()) return { pred: 'unknown', conf: 'low', quote: '', ms: 0 }
      try {
        const { out } = await callModel(model, { system: prompt === 'rubric' ? RUBRIC_SYSTEM : GRADE_SYSTEM, user: user(item.text) }, { temperature, topP, seed, maxTokens: prompt === 'rubric' ? 900 : 300 })
        return { ...(prompt === 'rubric' ? fromRubricOut(out, item.text) : fromGradeOut(out)), ms: Date.now() - t0 }
      } catch (e) { return { pred: 'unknown', conf: 'low', quote: '', error: String(e.code || e.message || e), ms: Date.now() - t0 } }
    }
  }
}

// 10. 21. 독립 판독 시험(홀드아웃2, 커밋 a9e3c55)에서 실제 HCX-005 가 낸 값을 그대로 읽는다(다시 호출하지 않음).
// final 은 그때 서비스가 배정 계산에 쓴 등급(plan)이다.
export function hcxRecordedAdapter(rowsById) {
  return {
    id: 'hcx-005-rec', label: 'HCX-005(10. 21. 독립 시험 기록, 서비스 지시문, 문서 전체 입력)', kind: 'llm-domestic',
    async run(item) {
      const r = rowsById.get(item.id)
      if (!r) return { pred: 'unknown', conf: 'low', quote: '' }
      if (r.missing) return { pred: 'unknown', conf: 'low', quote: '', final: r.plan || 'wheelchair' }
      return { pred: r.ai || 'unknown', conf: r.unc ? 'low' : 'mid', quote: r.quote || '', final: r.plan }
    }
  }
}
