// model-bench/run.mjs 이송 등급 판정 후보 모델을 같은 입력, 같은 지표로 비교한다.
// 실행(저장소 최상위): set -a; . client/.env.local; set +a; MODEL_BASE_URL=http://127.0.0.1:8089/v1 node tools/model-bench/run.mjs [--repeat 3]
//   NCP_CLOVASTUDIO_KEY 가 있으면 HCX-005 를 실시간으로 부르고, 없으면 10. 21. 시험 기록값만 쓴다.
//   MODEL_BASE_URL 이 살아 있으면 내려받아 쓰는 공개 모델(llama.cpp llama-server)을 부른다. LOCAL_MODEL_NAME 으로 표에 쓸 이름을 준다.
// 입력 묶음
//  - ho2: 독립 판독 시험 홀드아웃2(가상 서류 15장 40명, 정답 봉인). 사람 단위 글은 10. 21. 시험 기록의 근거 구간(가린 글자)이다.
//    근거 구간은 그 시험에서 HCX-005 가 고른 부분이라 다른 후보에게 유리하게 기울 수 있고, HCX 가 빠뜨린 5명은 빈 글이다.
//    문서 전체 입력(tools/ai-eval/holdout2-inputs.json) 비교는 대상자 나누기까지 함께 재는 다음 단계다.
//  - syn-test: 벤치 전용 가상 문장(학습용과 표현 묶음 분리). 정답은 생성 규칙이다(전문가 검증 전).
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'
import { score, repro, quoteMatchRate } from './metrics.mjs'
import { makeSet } from './synth.mjs'
import { ruleAdapter } from './adapters/rule.mjs'
import { clfAdapter } from './adapters/clf.mjs'
import { llmAdapter, hcxRecordedAdapter } from './adapters/llm.mjs'

const here = path.dirname(fileURLToPath(import.meta.url))
const ROOT = path.resolve(here, '../../../../')
const HO2 = path.join(ROOT, '공모전/반영기록/홀드아웃2')
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const REPEAT = Number(arg('--repeat', 3))
const OUT = arg('--out', path.join(ROOT, '공모전/AI검증/모델설계/결과'))

export function loadHO2(dir = HO2) {
  const rows = JSON.parse(fs.readFileSync(path.join(dir, '채점.json'), 'utf8')).rows
  return rows.map((r) => ({ id: `${r.doc}#${r.idx}`, set: 'ho2', doc: r.doc, text: r.missing ? '' : (r.quote || ''), truth: r.truth, det: r.det, _row: r }))
}

async function pool(items, n, fn) {
  const out = new Array(items.length); let i = 0
  await Promise.all(Array.from({ length: n }, async () => { while (i < items.length) { const k = i++; out[k] = await fn(items[k]) } }))
  return out
}

async function alive(base) {
  if (!base) return false
  try { const r = await fetch(base.replace(/\/v1\/?$/, '') + '/health', { signal: AbortSignal.timeout(2000) }); return r.ok } catch { return false }
}

async function main() {
  const ho2 = loadHO2()
  const synTrain = makeSet('train', 400, 3)
  const synTest = makeSet('test', 120, 7)
  const sets = { ho2, 'syn-test': synTest }
  const recRows = new Map(ho2.map((it) => [it.id, it._row]))

  const models = [
    { a: ruleAdapter, sets: ['ho2', 'syn-test'], repeat: 2, conc: 8 },
    { a: clfAdapter(synTrain), sets: ['ho2', 'syn-test'], repeat: 2, conc: 8 },
    { a: hcxRecordedAdapter(recRows), sets: ['ho2'], repeat: 1, conc: 8 }
  ]
  const notRun = []
  const localName = process.env.LOCAL_MODEL_NAME || 'local'
  if (await alive(process.env.MODEL_BASE_URL)) {
    for (const prompt of ['grade', 'rubric']) models.push({ a: llmAdapter({ id: `local-${localName}-${prompt}`, label: `${localName}(내려받아 쓰는 공개 모델, ${prompt === 'rubric' ? '루브릭 v0' : '등급 지시문'})`, kind: 'llm-local', model: `openai-compat:${localName}`, prompt }), sets: prompt === 'grade' ? ['ho2', 'syn-test'] : ['ho2'], repeat: REPEAT, conc: 4 })
  } else notRun.push({ id: 'local', why: 'MODEL_BASE_URL 이 없거나 응답 없음' })
  if (process.env.NCP_CLOVASTUDIO_KEY) {
    for (const prompt of ['grade', 'rubric']) models.push({ a: llmAdapter({ id: `hcx-005-live-${prompt}`, label: `HCX-005(실시간, seed 고정, ${prompt === 'rubric' ? '루브릭 v0' : '등급 지시문'})`, kind: 'llm-domestic', model: 'HCX-005', prompt }), sets: prompt === 'grade' ? ['ho2', 'syn-test'] : ['ho2'], repeat: REPEAT, conc: 2 })
  } else notRun.push({ id: 'hcx-005-live', why: 'NCP_CLOVASTUDIO_KEY 없음(client/.env.local 미작성, 공모전/AI검증/실행환경.md). 기록값 hcx-005-rec 로 대신함' })
  if (process.env.FOREIGN_MODEL_ID) models.push({ a: llmAdapter({ id: 'foreign', label: '해외 API(가상 자료 비교 전용, 서비스 배포 대상 아님)', kind: 'llm-foreign', model: process.env.FOREIGN_MODEL_ID }), sets: ['ho2', 'syn-test'], repeat: REPEAT, conc: 4 })
  else notRun.push({ id: 'foreign', why: '해외 API 설정 없음' })

  const results = []
  for (const m of models) {
    for (const s of m.sets) {
      const items = sets[s]
      const runs = []
      let ms = 0
      for (let k = 0; k < m.repeat; k++) {
        const t0 = Date.now()
        runs.push(await pool(items, m.conc, (it) => m.a.run(it)))
        ms += Date.now() - t0
      }
      const first = runs[0]
      const rows = items.map((it, i) => ({ id: it.id, truth: it.truth, det: it.det, text: it.text, pred: first[i].pred, conf: first[i].conf, quote: first[i].quote, final: first[i].final }))
      const r = {
        model: m.a.id, label: m.a.label, kind: m.a.kind, set: s, repeat: m.repeat,
        score: score(rows), repro: repro(runs.map((x) => x.map((o) => `${o.pred}/${o.conf}`))),
        reproGrade: repro(runs.map((x) => x.map((o) => o.pred))),
        quote: m.a.kind.startsWith('llm') ? quoteMatchRate(rows) : null,
        msPerItem: Math.round(ms / (m.repeat * items.length)),
        errors: first.filter((o) => o.error || o.parseError).length,
        rows: rows.map(({ text, ...x }) => x)
      }
      results.push(r)
      console.log(`${r.model} ${s}: 최종 일치 ${r.score.final.exactPct}% 낮게 ${r.score.final.underPct}% 등급 재현 ${r.reproGrade?.allSamePct}% 오류 ${r.errors}`)
    }
  }
  fs.mkdirSync(OUT, { recursive: true })
  fs.writeFileSync(path.join(OUT, 'bench_result.json'), JSON.stringify({ runAt: new Date().toISOString(), sets: { ho2: ho2.length, 'syn-train': synTrain.length, 'syn-test': synTest.length }, notRun, results }, null, 2))
  console.log('notRun', JSON.stringify(notRun))
}

if (process.argv[1] && fileURLToPath(import.meta.url) === path.resolve(process.argv[1])) main()
