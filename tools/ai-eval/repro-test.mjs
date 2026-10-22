// 재현성 시험. 홀드아웃2 가린 글자 입력 묶음(holdout2-inputs.json)을 조건마다 N회 판독해 일치율을 잰다.
// 조건 A 기존 지시문 seed 없음, B 기존 지시문 seed 고정, C 루브릭 v0 seed 고정, D 루브릭 v0 + 가상 예시 6개(학습 없음) seed 고정(모두 temperature 0.1, topP 0.8)
// 사용: NCP_CLOVASTUDIO_KEY=… node tools/ai-eval/repro-test.mjs [--runs 5] [--model HCX-005] [--answers <answers_sealed.json>] [--out <폴더>]
// 호출 수 = 서류 15 × 회수 × 조건 4(기본 300회). 서버 판독 상한(하루 400회)과 별개로 키 사용량에 들어간다.
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { callModel } from './model-adapter.mjs'
import { SYSTEM, FREE_SYSTEM, itemsOf, judge } from '../../client/api/intake.js'
import { RUBRIC_SYSTEM, RUBRIC_FREE_SYSTEM, rubricItemsOf, rubricPerson, DIM_KEYS } from '../../client/src/lib/rubric.js'
import { withFewShot } from '../../client/src/lib/rubricFewShot.js'
import { summarize } from './metrics.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const RUNS = Number(arg('--runs', 5))
const MODEL = arg('--model', 'HCX-005')
const ANS = arg('--answers', fileURLToPath(new URL('../../../../공모전/반영기록/홀드아웃2/answers_sealed.json', import.meta.url)))
const OUT = arg('--out', fileURLToPath(new URL('../../../../공모전/AI검증/', import.meta.url)))
const SEED = 20261022
const GAP_MS = Number(arg('--gap', 1200))
const ONLY = arg('--cond', null)
const sleep = (ms) => new Promise((r) => setTimeout(r, ms))
const inputs = JSON.parse(fs.readFileSync(new URL('./holdout2-inputs.json', import.meta.url), 'utf8'))

export const CONDITIONS = [
  { id: 'A', label: '기존 지시문, seed 없음', rubric: false, seed: null },
  { id: 'B', label: '기존 지시문, seed 고정', rubric: false, seed: SEED },
  { id: 'C', label: '루브릭 v0, seed 고정', rubric: true, seed: SEED },
  { id: 'D', label: '루브릭 v0 + 가상 예시 6개(학습 없음), seed 고정', rubric: true, fewshot: true, seed: SEED }
]

export function promptOf(doc, rubric, fewshot = false) {
  const seg = doc.mode === 'segments'
  const base = rubric ? (seg ? RUBRIC_SYSTEM : RUBRIC_FREE_SYSTEM) : (seg ? SYSTEM : FREE_SYSTEM)
  return { system: rubric && fewshot ? withFewShot(base) : base, user: seg ? doc.segments.map((s) => `${s.id}: ${s.text}`).join('\n') : doc.transcript }
}

// 모델 출력 → 대상자 목록(서비스와 같은 판정 함수)
export function personsOf(doc, out, rubric) {
  const seg = doc.mode === 'segments'
  if (rubric) {
    const items = rubricItemsOf(out)
    if (seg) return doc.segments.map((s) => ({ id: s.id, ...rubricPerson(items.find((x) => x.id === s.id), s.text) }))
    return items.map((it, k) => ({ id: `P${k + 1}`, ...rubricPerson(it, doc.transcript) }))
  }
  const items = itemsOf(out)
  if (seg) return doc.segments.map((s) => ({ id: s.id, ...judge(items.find((x) => x.id === s.id), s.text, s.id, null) }))
  return items.map((it, k) => ({ id: `P${k + 1}`, ...judge(it, doc.transcript, `P${k + 1}`, null, true) }))
}

async function main() {
  if (!process.env.NCP_CLOVASTUDIO_KEY && /^HCX-/.test(MODEL)) { console.error('NCP_CLOVASTUDIO_KEY 가 없어 실행하지 않음'); process.exit(2) }
  const raw = []
  let errRun = 0
  const conds = ONLY ? CONDITIONS.filter((c) => ONLY.split(',').includes(c.id)) : CONDITIONS
  outer: for (const c of conds) for (const doc of inputs.docs) for (let n = 0; n < RUNS; n++) {
    const p = promptOf(doc, c.rubric, c.fewshot)
    await sleep(GAP_MS)
    try {
      let res
      try { res = await callModel(MODEL, p, { seed: c.seed, temperature: 0.1, topP: 0.8 }) } catch (e1) { process.stderr.write(`retry after ${e1.code || e1.message}\n`); await sleep(15000); res = await callModel(MODEL, p, { seed: c.seed, temperature: 0.1, topP: 0.8 }) }
      const { out, ms } = res
      errRun = 0
      process.stderr.write(`${c.id} ${doc.doc} ${n} ok\n`)
      raw.push({ cond: c.id, doc: doc.doc, run: n, ms, persons: personsOf(doc, out, c.rubric).map((x) => ({ id: x.id, grade: x.grade, quote: x.quote, dims: x.rubric ? Object.fromEntries(DIM_KEYS.map((k) => [k, x.rubric.dims[k].score])) : undefined })) })
    } catch (e) {
      raw.push({ cond: c.id, doc: doc.doc, run: n, error: e.code || e.message })
      process.stderr.write(`${c.id} ${doc.doc} ${n} ERR ${e.code || e.message}\n`)
      if (++errRun >= 3) { process.stderr.write('연속 오류 3회, 중단\n'); break outer }
    }
  }
  const answers = fs.existsSync(ANS) ? JSON.parse(fs.readFileSync(ANS, 'utf8')) : null
  const summary = summarize(raw, CONDITIONS, answers)
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(`${OUT}/재현성시험_원자료_${new Date().toISOString().slice(0, 10)}${ONLY ? '_' + ONLY.replace(/,/g, '') : ''}.json`, JSON.stringify({ model: MODEL, runs: RUNS, seed: SEED, conditions: CONDITIONS, raw }, null, 1))
  console.log(JSON.stringify(summary, null, 1))
}
// 경로에 한글과 띄어쓰기가 있으면 import.meta.url 이 퍼센트 부호로 바뀌므로 파일 경로끼리 비교한다
if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
