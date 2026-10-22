// 학습 없이 쓰는 예시 넣기(few-shot)용 예시 고르기.
// 가상 학습 데이터(tools/hcx-tuning/data/train_short.jsonl, 누설 검사 0건)에서 구간 하나짜리 행만 골라
// 침상, 휠체어, 부축, 도보마다 하나, 이동 근거가 없는 글 하나, 읽을 수 없는 글 하나, 모두 6개를 고른다.
// 네 등급 예시는 근거 있는 차원이 3개 이상이고 차원끼리 등급이 엇갈리지 않는 행(rubric.js 규칙으로 다시 계산해 같은 등급)에서
// 글이 가장 짧은 행을 고른다. 차원 하나만 있는 예시는 6차원을 함께 매기는 형식을 보여 주지 못해서다. 같은 데이터면 같은 결과.
// 사용: node tools/hcx-tuning/pick-fewshot.mjs [--write]  (--write 이면 client/src/lib/rubricFewShotData.js 를 다시 쓴다)
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { check } from './leak-check.mjs'
import { gradeFromScores, rubricItemsOf } from '../../client/src/lib/rubric.js'

const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const ORDER = [
  { grade: 'bed', kind: 'normal', min: 3 },
  { grade: 'wheelchair', kind: 'normal', min: 3 },
  { grade: 'assist', kind: 'normal', min: 3 },
  { grade: 'walk', kind: 'normal', min: 3 },
  { grade: 'unknown', kind: 'normal', min: 1 },
  { grade: 'unknown', kind: 'unreadable', min: 0 }
]

export function pick(rows, meta) {
  const byId = new Map(meta.map((m) => [m.C_ID, m]))
  const out = []
  for (const o of ORDER) {
    const cand = rows
      .filter((r) => {
        const m = byId.get(r.C_ID)
        if (!m || m.mode !== 'segments' || m.people.length !== 1) return false
        const p = m.people[0]
        if (p.kind !== o.kind || p.grade !== o.grade) return false
        if (Object.values(p.dims).filter((v) => v != null).length < o.min) return false
        const g = gradeFromScores(rubricItemsOf(JSON.parse(r.Completion))[0].dims)
        return g.grade === o.grade && !g.conflict
      })
      .sort((a, b) => a.Text.length - b.Text.length || a.C_ID - b.C_ID)
    if (cand[0]) out.push({ grade: o.grade, kind: o.kind, text: cand[0].Text, completion: cand[0].Completion, cId: cand[0].C_ID })
  }
  return out
}

function main() {
  const read = (p) => fs.readFileSync(here(p), 'utf8').trim().split('\n').map((l) => JSON.parse(l))
  const rows = read('./data/train_short.jsonl')
  const meta = read('./data/train_meta.jsonl')
  const shots = pick(rows, meta)
  const inputs = JSON.parse(fs.readFileSync(here('../ai-eval/holdout2-inputs.json'), 'utf8'))
  const leak = check(shots.map((s) => ({ Text: s.text })), inputs)
  console.log(JSON.stringify({ n: shots.length, grades: shots.map((s) => s.grade), leak }, null, 1))
  if (process.argv.includes('--write')) {
    const body = `// 자동 생성: node tools/hcx-tuning/pick-fewshot.mjs --write\n// 가상 학습 데이터(train_short.jsonl)에서 등급마다 하나씩 고른 예시. 홀드아웃2 누설 검사를 통과한 행만 쓴다.\nexport const FEWSHOT_SOURCE = 'tools/hcx-tuning/data/train_short.jsonl'\nexport const FEWSHOT_DATA = ${JSON.stringify(shots.map(({ grade, kind, text, completion, cId }) => ({ grade, kind, text, completion, cId })), null, 1)}\n`
    fs.writeFileSync(here('../../client/src/lib/rubricFewShotData.js'), body)
    console.log('written client/src/lib/rubricFewShotData.js')
  }
}

if (process.argv[1] && fileURLToPath(import.meta.url) === process.argv[1]) main()
