// HCX-005 튜닝용 가상 학습 데이터 생성기(루브릭 v0 출력 형식).
// 사용: node tools/hcx-tuning/gen.mjs [--train 1200] [--valid 200] [--out tools/hcx-tuning/data]
// 출력: CLOVA Studio Instruction 데이터셋 JSONL(열 순서 System_Prompt, C_ID, T_ID, Text, Completion, 싱글턴 T_ID=0)
//   train.jsonl, valid.jsonl, 그리고 사람 단위 정답 메타(train_meta.jsonl, valid_meta.jsonl)
// 원칙
// - 모든 문구는 지어낸 것(phrases.mjs). 이름, 주소, 연락처는 [가림] 표시만 쓴다.
// - 시험용 홀드아웃2(tools/ai-eval/holdout2-inputs.json)는 학습에 넣지 않는다. leak-check.mjs 로 겹침을 검사한다.
// - 정답(Completion)은 서비스와 같은 루브릭 v0 형식. 근거 문구는 입력 글자에서 그대로 잘라 쓴다(원문 대조 통과).
// - System_Prompt 는 서비스의 RUBRIC_SYSTEM, RUBRIC_FREE_SYSTEM 과 똑같이 둔다(문서: 인퍼런스에도 같은 지시문 필요).
import fs from 'node:fs'
import { fileURLToPath } from 'node:url'
import { RUBRIC_SYSTEM, RUBRIC_FREE_SYSTEM, DIM_KEYS, rubricPerson } from '../../client/src/lib/rubric.js'
import { LEVEL, AMBIG, DISTRACT, UNREADABLE, MASK, FORMS } from './phrases.mjs'

const arg = (k, d) => { const i = process.argv.indexOf(k); return i > 0 ? process.argv[i + 1] : d }

export function mulberry32(a) { return () => { a |= 0; a = (a + 0x6d2b79f5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 } }

// 문구가 다른 차원도 함께 말하는 경우(지팡이, 보행기, 휠체어). 부정 표현이면 넣지 않는다
export function crossOf(text) {
  if (/않|없이/.test(text)) return {}
  const x = {}
  if (/지팡이/.test(text)) Object.assign(x, { D1: 3, D3: 2 })
  if (/보행기|실버카|보행 보조/.test(text)) Object.assign(x, { D1: 3, D3: 3 })
  if (/휠체어/.test(text)) x.D3 = 4
  return x
}

const TYPO = [['휠체어', '횔체어'], ['부축', '부측'], ['보행', '보헹'], ['걸음', '겉음'], ['지팡이', '지팽이']]

export function makeGen(seed) {
  const r = mulberry32(seed)
  const pick = (a) => a[Math.floor(r() * a.length)]
  const chance = (p) => r() < p

  // 손글씨와 글자 인식 흔적: 띄어쓰기 빠짐, 비슷한 글자 오인식, 끝맺음 차이
  const noisy = (t) => {
    let s = t
    if (chance(0.12)) s = s.replace(/ /g, '')
    if (chance(0.06)) { const [a, b] = pick(TYPO); s = s.replace(a, b) }
    return s
  }
  const end = () => pick(['.', '.', ',', ''])

  // 한 사람 구간 만들기. dims: 정답 점수와 근거 문구
  function person() {
    if (chance(0.06)) { const t = pick(UNREADABLE); return { text: t, dims: Object.fromEntries(DIM_KEYS.map((k) => [k, { score: null, quote: '' }])), kind: 'unreadable' } }
    const dims = Object.fromEntries(DIM_KEYS.map((k) => [k, { score: null, quote: '' }]))
    const parts = []
    // 이동 차원(D1~D3) 중 1~2개, 그 밖 차원(D4~D6) 0~2개. 4%는 이동 근거 없이 그 밖 차원만(등급 unknown)
    const move = chance(0.04) ? [] : ['D1', 'D2', 'D3'].sort(() => r() - 0.5).slice(0, chance(0.55) ? 1 : 2)
    // D2 는 5점(와상)만 등급을 정하므로, D2 하나만 뽑히면 대부분 D1 이나 D3 을 더한다(등급 미정 비율 조절)
    if (move.length === 1 && move[0] === 'D2' && chance(0.7)) move.push(chance(0.5) ? 'D1' : 'D3')
    const other = ['D4', 'D5', 'D6'].sort(() => r() - 0.5).slice(0, Math.floor(r() * 3))
    for (const k of [...move, ...other]) {
      if (dims[k].score != null) continue
      let text, score
      const amb = AMBIG.filter((a) => a[0] === k)
      if (amb.length && chance(0.15)) { const a = pick(amb); text = a[2]; score = a[1] + 1 } else { score = 1 + Math.floor(r() * 5); text = pick(LEVEL[k][score]) }
      const cross = crossOf(text)
      if (Object.keys(cross).some((c) => c !== k && dims[c].score != null)) continue // 이미 정한 차원과 겹치면 건너뜀
      const shown = noisy(text)
      parts.push(shown + end())
      dims[k] = { score, quote: shown }
      for (const [c, v] of Object.entries(cross)) if (c !== k) dims[c] = { score: v, quote: shown }
    }
    if (chance(0.35)) parts.splice(Math.floor(r() * (parts.length + 1)), 0, pick(DISTRACT) + end())
    if (chance(0.2)) parts.unshift(pick(MASK))
    const text = parts.join(' ').replace(/\s+/g, ' ').trim() || pick(UNREADABLE)
    return { text, dims, kind: 'normal' }
  }

  const completionOf = (items) => JSON.stringify({ items: items.map((p) => ({ id: p.id, dims: Object.fromEntries(DIM_KEYS.map((k) => [k, { score: p.dims[k].score, quote: p.dims[k].quote }])) })) })

  // 구간 모드(대피계획서 S1, S2 …)와 자유 서술 모드(P1, P2 …)
  function example() {
    const n = 1 + Math.floor(r() * 4)
    const people = Array.from({ length: n }, person)
    if (chance(0.8)) {
      const items = people.map((p, i) => ({ id: `S${i + 1}`, ...p }))
      return { mode: 'segments', system: RUBRIC_SYSTEM, text: items.map((p) => `${p.id}: ${p.text}`).join('\n'), items, completion: completionOf(items) }
    }
    const f = pick(FORMS)
    const readable = people.filter((p) => p.kind === 'normal')
    const use = readable.length ? readable : [person()]
    const items = use.map((p, i) => ({ id: `P${i + 1}`, ...p }))
    const body = items.map((p, i) => `${f.person(i + 1)} 거동 상태 ${p.text}`).join(' ')
    return { mode: 'free', system: RUBRIC_FREE_SYSTEM, text: `${f.head} ${body} ${f.tail}`, items, completion: completionOf(items) }
  }
  return { example }
}

// 정답 자체 검사: 근거 문구가 입력에 그대로 있고, 서비스 판정 함수로 등급이 나와야 한다
export function selfCheck(ex) {
  for (const p of ex.items) {
    const src = ex.mode === 'segments' ? p.text : ex.text
    const out = rubricPerson({ id: p.id, dims: p.dims }, src)
    for (const k of DIM_KEYS) if (p.dims[k].score != null && out.rubric.dims[k].score !== p.dims[k].score) return `${p.id} ${k} 근거 문구 원문 대조 실패`
    p.grade = out.grade
  }
  if (ex.system.length + ex.text.length + ex.completion.length > 8000) return '한 행 8,000자 초과'
  return null
}

// 짧은 지시문 판(학습 토큰 절감용). 튜닝 모델을 이 판으로 학습하면 호출 때도 같은 짧은 지시문을 보내야 한다(CLOVA Studio 데이터셋 문서)
export const SHORT_SYSTEM = '재난취약자 거동 문구를 이송 루브릭 v0 6개 차원(D1~D6) 1~5점과 원문 그대로의 근거 문구로 옮긴다. 근거 없으면 null과 빈 글자, 애매하면 높은 점수, 판독 불가는 전부 null. 구간(S1…)마다 하나씩, JSON만.'
export const SHORT_FREE_SYSTEM = SHORT_SYSTEM.replace('구간(S1…)마다 하나씩', '대상자마다 P1…로 하나씩')

export function build(nTrain, nValid, seedTrain = 20261022, seedValid = 20261023) {
  const seen = new Set()
  const make = (n, seed) => {
    const g = makeGen(seed)
    const rows = [], meta = []
    let guard = 0
    while (rows.length < n && guard++ < n * 20) {
      const ex = g.example()
      if (seen.has(ex.text)) continue
      const bad = selfCheck(ex)
      if (bad) throw new Error(bad)
      seen.add(ex.text)
      rows.push({ System_Prompt: ex.system, C_ID: rows.length, T_ID: 0, Text: ex.text, Completion: ex.completion })
      meta.push({ C_ID: rows.length - 1, mode: ex.mode, people: ex.items.map((p) => ({ id: p.id, grade: p.grade, kind: p.kind, dims: Object.fromEntries(DIM_KEYS.map((k) => [k, p.dims[k].score])) })) })
    }
    return { rows, meta }
  }
  return { train: make(nTrain, seedTrain), valid: make(nValid, seedValid) }
}

function main() {
  const OUT = arg('--out', fileURLToPath(new URL('./data', import.meta.url)))
  const { train, valid } = build(Number(arg('--train', 1200)), Number(arg('--valid', 200)))
  fs.mkdirSync(OUT, { recursive: true })
  const jl = (a) => a.map((x) => JSON.stringify(x)).join('\n') + '\n'
  fs.writeFileSync(`${OUT}/train.jsonl`, jl(train.rows))
  fs.writeFileSync(`${OUT}/valid.jsonl`, jl(valid.rows))
  fs.writeFileSync(`${OUT}/train_meta.jsonl`, jl(train.meta))
  fs.writeFileSync(`${OUT}/valid_meta.jsonl`, jl(valid.meta))
  const short = (rows) => rows.map((x) => ({ ...x, System_Prompt: x.System_Prompt === RUBRIC_SYSTEM ? SHORT_SYSTEM : SHORT_FREE_SYSTEM }))
  fs.writeFileSync(`${OUT}/train_short.jsonl`, jl(short(train.rows)))
  fs.writeFileSync(`${OUT}/valid_short.jsonl`, jl(short(valid.rows)))
  console.log(`train ${train.rows.length}행, valid ${valid.rows.length}행 → ${OUT}`)
}
if (fileURLToPath(import.meta.url) === process.argv[1]) main()
