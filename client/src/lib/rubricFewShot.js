// rubricFewShot.js 학습 없이 예시를 넣는 판독(few-shot). 루브릭 v0 지시문 뒤에 가상 예시 6개를 붙인다.
// 모델을 다시 학습시키지 않으므로 학습 비용이 없고, 호출할 때 입력 글자만 늘어난다.
// 예시는 가상 학습 데이터(tools/hcx-tuning/data/train_short.jsonl, 홀드아웃2 누설 검사 0건)에서 등급마다 고른 것이다(tools/hcx-tuning/pick-fewshot.mjs).
// 기본은 꺼짐. 루브릭 방식이 켜진 요청에서 fewshot:true 이거나 환경변수 INTAKE_FEWSHOT=1 일 때만 쓴다.
// 예시의 근거 문구가 실제 서류 판독에 섞여 들어와도 rubric.js 의 차원별 원문 대조가 그 차원 점수를 비운다.
import { FEWSHOT_DATA } from './rubricFewShotData.js'

export const FEWSHOT_VERSION = 'fs-v0'
export const FEWSHOT_EXAMPLES = FEWSHOT_DATA

export function withFewShot(system, examples = FEWSHOT_EXAMPLES) {
  if (!examples.length) return system
  const body = examples.map((e, i) => `예시 ${i + 1}\n입력:\n${e.text}\n출력:\n${e.completion}`).join('\n\n')
  return `${system}\n\n아래는 가상 서류로 만든 예시다. 점수를 매기는 방식과 출력 형식만 참고하고, 예시의 글자를 근거 문구로 쓰지 않는다.\n\n${body}`
}

export const useFewShot = (body, rubricOn) => Boolean(rubricOn) && (body?.fewshot === true || (typeof process !== 'undefined' && process.env?.INTAKE_FEWSHOT === '1'))
