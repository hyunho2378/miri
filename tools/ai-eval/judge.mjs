// 채점 모델(LLM-as-a-judge) 도구. 루브릭 판독 결과의 차원 점수와 근거가 원문에 맞는지 다른 모델이 채점한다.
// 채점 모델은 등급을 새로 고르지 않고 근거와 점수의 대응만 본다(같은 계열끼리의 자기 강화 편향을 줄이기 위함, 검증기획서 7장).
// 사용: NCP_CLOVASTUDIO_KEY=… node tools/ai-eval/judge.mjs <재현성시험_원자료.json> [--model HCX-007] [--answers answers_sealed.json]
// 결과: 차원별 예/부분/아니오 비율, 그리고 judge 의 '등급이 원문에 맞음' 판정과 정답 일치 여부의 일치도
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callModel } from './model-adapter.mjs'
import { DIMENSIONS, RUBRIC_VERSION } from '../../client/src/lib/rubric.js'
import { answerKey } from './metrics.mjs'

const rubricText = DIMENSIONS.map((d) => `- ${d.key} ${d.name}: ${d.levels.map((l, i) => `${i + 1}=${l}`).join(' / ')}`).join('\n')
export const JUDGE_SYSTEM = `너는 판독 결과를 채점하는 검토자다. 등급을 새로 고르지 않는다.
루브릭(${RUBRIC_VERSION}, 1: 도움 없음, 5: 완전 의존)
${rubricText}
입력은 원문 글자와 판독 결과(차원 점수, 근거 문구, 계산된 등급)다.
1. 차원마다 근거 문구가 그 점수를 뒷받침하는지 yes, partial, no 중 하나와 이유 한 줄을 낸다. 점수가 null 이면 원문에 그 차원 근거가 정말 없는지 본다(없으면 yes).
2. 계산된 등급이 원문과 어긋나지 않는지 gradeSupported 를 yes 또는 no 로 낸다.
3. 출력은 JSON 하나만: {"dims":{"D1":{"verdict":"yes","why":"…"}},"gradeSupported":"yes"}`

export const judgeUser = (source, p) => `원문: ${source}\n판독 결과: ${JSON.stringify({ dims: p.dims, quote: p.quote, grade: p.grade })}`

async function main() {
  const file = process.argv[2]
  const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
  const MODEL = arg('--model', 'HCX-007')
  if (!file) { console.error('재현성시험 원자료 json 경로 필요'); process.exit(2) }
  const data = JSON.parse(fs.readFileSync(file, 'utf8'))
  const inputs = JSON.parse(fs.readFileSync(new URL('./holdout2-inputs.json', import.meta.url), 'utf8'))
  const answers = JSON.parse(fs.readFileSync(arg('--answers', fileURLToPath(new URL('../../../../공모전/반영기록/홀드아웃2/answers_sealed.json', import.meta.url))), 'utf8'))
  const key = answerKey(answers)
  const COND = arg('--cond', 'C')
  const rows = data.raw.filter((r) => r.cond === COND && r.run === 0 && !r.error)
  const out = []
  for (const r of rows) {
    const doc = inputs.docs.find((d) => d.doc === r.doc)
    for (const [i, p] of r.persons.entries()) {
      const src = doc.mode === 'segments' ? doc.segments.find((s) => s.id === p.id)?.text : doc.transcript
      try {
        await new Promise((r) => setTimeout(r, 1200))
        let res
        try { res = await callModel(MODEL, { system: JUDGE_SYSTEM, user: judgeUser(src, p) }, { seed: 20261022 }) } catch (e1) { await new Promise((r) => setTimeout(r, 15000)); res = await callModel(MODEL, { system: JUDGE_SYSTEM, user: judgeUser(src, p) }, { seed: 20261022 }) }
        const j = res.out
        const truth = key[r.doc]?.[i]
        out.push({ doc: r.doc, id: p.id, grade: p.grade, judge: j, truth: truth?.grade, readerCorrect: truth?.determinable ? p.grade === truth.grade : null })
      } catch (e) { out.push({ doc: r.doc, id: p.id, error: e.code || e.message }) }
    }
  }
  const ok = out.filter((x) => !x.error && x.readerCorrect != null)
  const agree = ok.filter((x) => (x.judge?.gradeSupported === 'yes') === x.readerCorrect).length
  console.log(JSON.stringify({ model: MODEL, cond: COND, judged: out.length, errors: out.filter((x) => x.error).length, judgeVsAnswerAgreement: `${agree}/${ok.length}` }, null, 1))
  fs.writeFileSync(file.replace(/\.json$/, `_judge_${COND}_${MODEL}.json`), JSON.stringify(out, null, 1))
}
// 경로에 한글과 띄어쓰기가 있으면 import.meta.url 이 퍼센트 부호로 바뀌므로 파일 경로끼리 비교한다
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
