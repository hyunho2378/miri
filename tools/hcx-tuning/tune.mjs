// HCX-005 튜닝(PEFT) 실행 도구. 공식 문서 근거(2026. 10. 22. 확인)
//  - 학습 생성 POST https://clovastudio.stream.ntruss.com/tuning/v2/tasks (api.ncloud-docs.com/docs/clovastudio-posttask)
//    body: name, model, tuningType(PEFT), trainEpochs(1~20, 기본 8), learningRate(기본 1.0E-4), validationSplitRatio(0~0.1),
//          loraR(2~8, 기본 8), loraAlpha(2~512, 기본 64), trainingDatasetBucket, trainingDatasetFilePath, trainingDatasetAccessKey, trainingDatasetSecretKey
//  - 학습 조회 GET /tuning/v2/tasks/{taskId}
//  - 튜닝 모델 호출 POST /v3/tasks/{taskId}/chat-completions (clovastudio-chatcompletionsv3)
//  - 토큰 계산 POST /v3/api-tools/chat-tokenize/{modelName} (clovastudio-tokenizerhcxv3)
//  - 학습 요금 HCX-005 1,000 토큰 6.25원, 튜닝 모델 호출 입력 2.5원, 출력 10원(1,000 토큰, VAT 별도, ncloud.com CLOVA Studio 요금)
// 사용(저장소 최상위, 키는 client/.env.local, 값은 출력하지 않는다)
//   set -a; . client/.env.local; set +a
//   node tools/hcx-tuning/tune.mjs tokens [--file train_short.jsonl] [--sample 60]   토큰 수와 예상 학습 비용
//   node tools/hcx-tuning/tune.mjs create --yes [--epochs 4] [--lr 1e-4]               학습 생성(TUNING_BUCKET, TUNING_PATH, TUNING_AK, TUNING_SK 필요)
//   node tools/hcx-tuning/tune.mjs status --id <taskId>
//   node tools/hcx-tuning/tune.mjs eval --id <taskId> [--short] [--runs 3]             홀드아웃2로 기본 HCX-005 와 비교
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { randomUUID } from 'node:crypto'
import { RUBRIC_SYSTEM, RUBRIC_FREE_SYSTEM, rubricItemsOf, rubricPerson, DIM_KEYS } from '../../client/src/lib/rubric.js'
import { parseModelJson } from '../../client/api/_ncp.js'
import { summarize } from '../ai-eval/metrics.mjs'
import { SHORT_SYSTEM, SHORT_FREE_SYSTEM } from './gen.mjs'

const BASE = 'https://clovastudio.stream.ntruss.com'
const PRICE_TRAIN_PER_1K = 6.25 // 원, HCX-005 학습
const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }
const has = (k) => process.argv.includes(k)
const here = (p) => fileURLToPath(new URL(p, import.meta.url))
const key = () => { const k = process.env.NCP_CLOVASTUDIO_KEY; if (!k) { console.error('NCP_CLOVASTUDIO_KEY 없음(공모전/AI검증/실행환경.md)'); process.exit(2) } return k }
const headers = () => ({ 'Content-Type': 'application/json', Authorization: `Bearer ${key()}`, 'X-NCP-CLOVASTUDIO-REQUEST-ID': randomUUID() })

async function api(method, path, body) {
  const r = await fetch(`${BASE}${path}`, { method, headers: headers(), ...(body ? { body: JSON.stringify(body) } : {}) })
  const j = await r.json().catch(() => ({}))
  if (!r.ok || (j.status && j.status.code !== '20000')) throw Object.assign(new Error(`${method} ${path} ${r.status} ${j?.status?.message || ''}`), { code: 'UPSTREAM' })
  return j.result
}

const loadRows = (f) => fs.readFileSync(here(`./data/${f}`), 'utf8').trim().split('\n').map((l) => JSON.parse(l))

// 표본 행의 토큰 수로 전체를 추정한다(학습 1회분 토큰). 에폭 곱 여부는 요금 문서에 적혀 있지 않아 두 경우를 같이 낸다
export function costOf(tokensOnce, epochs) {
  const won = (t) => Math.round((t / 1000) * PRICE_TRAIN_PER_1K)
  return { tokensOnce, wonIfBilledOnce: won(tokensOnce), wonIfBilledPerEpoch: won(tokensOnce * epochs), epochs, vat: '별도' }
}

async function tokens() {
  const file = arg('--file', 'train_short.jsonl'), n = Number(arg('--sample', 60)), epochs = Number(arg('--epochs', 8))
  const rows = loadRows(file)
  const step = Math.max(1, Math.floor(rows.length / n))
  let sum = 0, cnt = 0
  for (let i = 0; i < rows.length && cnt < n; i += step) {
    const x = rows[i]
    const res = await api('POST', '/v3/api-tools/chat-tokenize/HCX-005', { messages: [{ role: 'system', content: x.System_Prompt }, { role: 'user', content: x.Text }, { role: 'assistant', content: x.Completion }] })
    sum += (res.messages || []).reduce((a, m) => a + (m.content?.count ?? m.count ?? 0), 0); cnt++
  }
  const per = sum / cnt
  console.log(JSON.stringify({ file, rows: rows.length, sampled: cnt, tokensPerRow: Math.round(per), ...costOf(Math.round(per * rows.length), epochs) }, null, 1))
}

async function create() {
  if (!has('--yes')) { console.error('학습은 요금이 생긴다. 비용 확인 뒤 --yes 를 붙여 실행'); process.exit(2) }
  const need = ['TUNING_BUCKET', 'TUNING_PATH', 'TUNING_AK', 'TUNING_SK'].filter((k) => !process.env[k])
  if (need.length) { console.error(`없음: ${need.join(', ')}(Object Storage 버킷과 업로드 전용 서브 계정 키)`); process.exit(2) }
  const result = await api('POST', '/tuning/v2/tasks', {
    name: arg('--name', `miri-rubric-v0-${new Date().toISOString().slice(0, 10)}`), model: 'HCX-005', tuningType: 'PEFT',
    trainEpochs: arg('--epochs', '4'), learningRate: arg('--lr', '1e-4'), validationSplitRatio: 0, loraR: Number(arg('--lora-r', 8)), loraAlpha: Number(arg('--lora-alpha', 64)),
    trainingDatasetBucket: process.env.TUNING_BUCKET, trainingDatasetFilePath: process.env.TUNING_PATH, trainingDatasetAccessKey: process.env.TUNING_AK, trainingDatasetSecretKey: process.env.TUNING_SK
  })
  console.log(JSON.stringify({ id: result.id, status: result.status, model: result.model, trainEpochs: result.trainEpochs, learningRate: result.learningRate }, null, 1))
}

async function status() {
  const r = await api('GET', `/tuning/v2/tasks/${arg('--id')}`)
  const s = r.statusInfo || {}
  console.log(JSON.stringify({ id: r.id, status: r.status, dataRows: s.dataRows, numOfTokens: s.numOfTokens, step: `${s.currStep}/${s.totalTrainSteps}`, epoch: `${s.currEpoch}/${s.totalTrainEpochs}`, trainLoss: s.trainLoss, failureReason: s.failureReason, message: s.message }, null, 1))
}

// 튜닝 모델 또는 기본 모델 호출(같은 지시문, 같은 seed)
async function chat(target, system, user, seed) {
  const path = target.task ? `/v3/tasks/${target.task}/chat-completions` : `/v3/chat-completions/${target.model}`
  const res = await api('POST', path, { messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.1, topP: 0.8, maxTokens: 1600, seed })
  return parseModelJson(res?.message?.content)
}

export function personsOfRubric(doc, out) {
  const items = rubricItemsOf(out)
  if (doc.mode === 'segments') return doc.segments.map((s) => ({ id: s.id, ...rubricPerson(items.find((x) => x.id === s.id), s.text) }))
  return items.map((it, k) => ({ id: `P${k + 1}`, ...rubricPerson(it, doc.transcript) }))
}

async function evaluate() {
  const id = arg('--id'), runs = Number(arg('--runs', 3)), short = has('--short'), SEED = 20261022
  const inputs = JSON.parse(fs.readFileSync(here('../ai-eval/holdout2-inputs.json'), 'utf8'))
  const ansPath = fileURLToPath(new URL('../../../../공모전/반영기록/홀드아웃2/answers_sealed.json', import.meta.url))
  const answers = fs.existsSync(ansPath) ? JSON.parse(fs.readFileSync(ansPath, 'utf8')) : null
  const conds = [
    { id: 'BASE', label: '기본 HCX-005, 루브릭 v0 전체 지시문', target: { model: 'HCX-005' }, short: false },
    { id: 'TUNED', label: `튜닝 HCX-005(${id}), ${short ? '짧은' : '전체'} 지시문`, target: { task: id }, short }
  ]
  const raw = []
  for (const c of conds) for (const doc of inputs.docs) for (let n = 0; n < runs; n++) {
    const seg = doc.mode === 'segments'
    const system = c.short ? (seg ? SHORT_SYSTEM : SHORT_FREE_SYSTEM) : (seg ? RUBRIC_SYSTEM : RUBRIC_FREE_SYSTEM)
    const user = seg ? doc.segments.map((s) => `${s.id}: ${s.text}`).join('\n') : doc.transcript
    const t0 = Date.now()
    try { const out = await chat(c.target, system, user, SEED); raw.push({ cond: c.id, doc: doc.doc, run: n, ms: Date.now() - t0, persons: personsOfRubric(doc, out).map((x) => ({ id: x.id, grade: x.grade, quote: x.quote, dims: Object.fromEntries(DIM_KEYS.map((k) => [k, x.rubric.dims[k].score])) })) }) } catch (e) { raw.push({ cond: c.id, doc: doc.doc, run: n, error: e.code || e.message }) }
  }
  const outDir = fileURLToPath(new URL('../../../../공모전/AI검증/모델설계/학습/', import.meta.url))
  fs.mkdirSync(outDir, { recursive: true })
  fs.writeFileSync(`${outDir}/튜닝비교_원자료_${new Date().toISOString().slice(0, 10)}.json`, JSON.stringify({ task: id, runs, seed: SEED, conds: conds.map(({ target, ...c }) => c), raw }, null, 1))
  console.log(JSON.stringify(summarize(raw, conds, answers), null, 1))
}

const cmd = process.argv[2]
if (fileURLToPath(import.meta.url) === process.argv[1]) {
  const f = { tokens, create, status, eval: evaluate }[cmd]
  if (!f) { console.error('명령: tokens | create | status | eval'); process.exit(2) }
  f().catch((e) => { console.error(e.message); process.exit(1) })
}
