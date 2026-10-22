// safeguard.js 낮게 판정 막는 사후 검사(모델 판정 뒤 코드가 한 번 더 본다).
// 근거: 공모전/AI검증/오류분석_20261022.md. 홀드아웃2 반복 판독 300회에서 낮게 판정된 사례는
// (1) 근거 문구는 "걷는 것이 안 됨"인데 점수 방향을 반대로 매긴 경우, (2) 침상 단서가 있는 대상자를 빠뜨려 unknown 이 된 경우였다.
// 규칙: 원문에 더 높은 등급 단서가 있으면 등급을 그 단서로 올리고 확인 필요(cueUpgrade)로 넘긴다. 등급을 내리는 일은 하지 않는다.
// 단서 표현은 판정 기준표 v0 차원 문구(rubric.js)와 장기요양인정조사표 항목 표현에서 골랐고, 가상 학습 데이터로 과적합을 점검했다.

const RANK = { walk: 1, assist: 2, wheelchair: 3, bed: 4, unknown: 3 }
const one = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// 침상: 누운 채로만 옮길 수 있음
const BED = /눕힌\s*채|눕혀\s*(?:서\s*)?(?:옮|이송|이동)|누운\s*(?:자세|상태|채)|누워\s*(?:서\s*)?(?:이송|이동|운송|가야)|침대\s*째|들것|와상|앉(?:기|을|힐)\s*(?:가|를|는)?\s*(?:수\s*)?(?:없|못|불가)|앉기\s*(?:가|를)?\s*(?:불가|유지\s*(?:하지\s*)?못|안\s*됨)|앉은\s*자세\s*(?:유지\s*)?(?:어렵|불가|못)|등을\s*세우지\s*못/
// 휠체어: 걷지 못하고 앉은 채 이동
const WHEEL = /휠체어\s*째|휠체어\s*로\s*만|휠체어\s*(?:가\s*)?(?:필요|로\s*이동|에\s*앉은|탑승|를?\s*.{0,10}써야)|보행\s*(?:이\s*)?불가|걷기\s*(?:는|가)?\s*불가|디뎌\s*걷는\s*것이\s*안|(?<!없이는\s?)(?<!혼자\s?)걷지\s*못|(?<!혼자\s?)걸을\s*수\s*없|휠체어.{0,6}리프트|리프트\s*(?:차량)?\s*(?:로|으로)?\s*(?:이동|태|필요)/
// 부축: 사람이나 기구 도움으로 걸음
const ASSIST = /부축|(?:붙잡|붙들)\S*\s*줘야|보행기|지팡이|팔을\s*(?:받쳐|잡아)|혼자\s*걷기\s*(?:는|가)?\s*(?:안|어려|불가)|독립\s*보행\s*(?:이\s*)?(?:안|불가)/

// 글에서 가장 높은 등급 단서와 그 문구
// 단서 바로 뒤가 부정(쓰지 않음, 필요 없음)이면 단서로 보지 않는다. 산소와 인공호흡기는 등급이 아니라 특이사항 태그로 본다
const NEG = /^.{0,8}?(?:쓰지\s*않|사용하지\s*않|필요\s*(?:는\s*)?없|안\s*씀|없이\s*(?:생활|걸|이동))/
export function cueOf(text) {
  const t = one(text)
  for (const [grade, re] of [['bed', BED], ['wheelchair', WHEEL], ['assist', ASSIST]]) {
    for (const m of t.matchAll(new RegExp(re.source, 'g'))) {
      if (NEG.test(t.slice(m.index + m[0].length))) continue
      return { grade, cue: m[0] }
    }
  }
  return null
}

// 한 사람: 근거 글(구간 글자 또는 근거 문구들)에서 더 높은 단서가 보이면 올린다
export function upgradePerson(p, evidence) {
  const c = cueOf(evidence)
  if (!c || RANK[c.grade] <= RANK[p.grade || 'unknown'] && !(p.grade === 'unknown' && c.grade === 'bed')) return p
  if (p.grade === 'unknown' && c.grade !== 'bed') return p // unknown 은 이미 휠체어로 계산
  return { ...p, modelGrade: p.grade, grade: c.grade, confidence: 'low', reason: 'cueUpgrade', cue: c.cue }
}

// 자유 서술 문서를 번호(1, 1), 2 …)로 대상자 단위로 나눈다. 번호가 1부터 차례로 이어질 때만 쓴다
export function personChunks(transcript = '') {
  const t = one(transcript)
  const re = /(?:^|\s)(\d{1,2})\s*\)?\s+(?=(?:대상자\s+|성명\s*[:：]\s*)?\[(?:이름|주소)?\s*가림\])/g
  const marks = []
  for (const m of t.matchAll(re)) if (Number(m[1]) === marks.length + 1) marks.push(m.index + m[0].match(/^\s*/)[0].length)
  return marks.map((st, k) => t.slice(st, marks[k + 1] ?? t.length))
}

const evidenceOf = (p) => [p.quote, p.context, ...Object.values(p.rubric?.dims || {}).map((d) => d?.quote)].filter(Boolean).join(' ')

// 문서 전체: 침상 단서 문장마다 그 문장을 근거로 침상 판정된 사람이 없으면, 근거 없는 unknown 대상자를 침상 가능성으로 올린다
export function applySafeguard(persons, transcript = '') {
  const chunks = personChunks(transcript)
  const aligned = chunks.length > 1 && chunks.length === persons.length && persons.every((p) => !p.context)
  let out = persons.map((p, i) => upgradePerson(p, aligned ? `${evidenceOf(p)} ${chunks[i]}` : evidenceOf(p)))
  if (aligned) return out
  const t = one(transcript)
  // 같은 문장 안의 단서는 하나로 센다(40자 안에 붙은 단서 묶기)
  const bedCues = []
  for (const m of t.matchAll(new RegExp(BED.source, 'g'))) { const last = bedCues[bedCues.length - 1]; if (last && m.index - (last.index + last[0].length) < 40) continue; bedCues.push(m) }
  const covered = (m) => out.some((p) => p.grade === 'bed' && evidenceOf(p) && (() => { const e = one(evidenceOf(p)); const w = t.slice(Math.max(0, m.index - 60), m.index + m[0].length + 60); return e.split(/[.。]/).some((s) => s.trim().length > 3 && w.includes(s.trim().slice(0, 12))) })())
  const missing = bedCues.filter((m) => !covered(m)).length
  let k = missing
  out = out.map((p) => {
    if (k > 0 && p.grade === 'unknown' && (!one(p.quote) || /^\(?빈칸\)?$/.test(one(p.quote)) || p.reason === 'unreadable')) { k--; return { ...p, modelGrade: 'unknown', grade: 'bed', confidence: 'low', reason: 'cueUpgradeDoc' } }
    return p
  })
  return out
}
