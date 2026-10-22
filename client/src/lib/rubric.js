// rubric.js 이송 등급 루브릭 v0(전문가 내용 타당도 검증 전 초안).
// 근거: 공모전/AI검증/AI판독_검증기획서_20261022.md 3장(차원은 장기요양인정조사표와 HHS ASPR CMIST 틀에서 골랐고, 1~5점 문구와 등급 규칙은 미리 초안).
// 언어 모델은 차원별 점수와 근거 문구(원문 그대로)만 낸다. 네 등급은 이 파일의 규칙으로 코드가 계산한다.
// 같은 지시문과 출력 형식을 다른 모델 비교(tools/model-bench)에서도 그대로 쓴다. 출력 형식은 공모전/AI검증/판독출력형식_v1.md.

export const RUBRIC_VERSION = 'v0-draft'
export const RUBRIC_STATUS = '전문가 검증 전 초안'

export const DIMENSIONS = [
  { key: 'D1', name: '걷기와 집 밖 이동', levels: ['혼자 걸어 집 밖까지 나옴', '느리지만 혼자 걸음, 안내만 필요', '지팡이나 보행기로 걸음', '다른 사람이 부축해야 몇 걸음 걸음', '걷지 못함'] },
  { key: 'D2', name: '앉기와 자세 바꾸기', levels: ['혼자 일어나 앉고 옮겨 앉음', '시간이 걸리나 혼자 함', '일어나 앉을 때 부분 도움', '앉은 자세 유지는 되나 옮겨 앉기는 완전 도움', '앉은 자세 유지 어려움, 누운 상태로만 이동(와상)'] },
  { key: 'D3', name: '이동 보조기구', levels: ['없음', '지팡이', '보행기', '휠체어', '침대, 들것'] },
  { key: 'D4', name: '의사소통과 지시 이해', levels: ['지시를 이해하고 말함', '천천히 반복하면 이해', '청력이나 시력 저하로 보조 필요', '지시 이해가 일관되지 않음(인지 저하)', '의사 표현과 이해가 어려움'] },
  { key: 'D5', name: '의료기기와 건강 유지', levels: ['없음', '상시 복약', '이동 중 지켜볼 증상 있음', '산소 등 장비를 가지고 이동', '전원이나 장비 없이 이동 불가'] },
  { key: 'D6', name: '동행과 돌봄', levels: ['혼자 출발 가능', '연락만 필요', '보호자나 돌봄 담당자 동행이 좋음', '보호자나 돌봄 담당자 동행 필요', '전문 인력 동행 필요'] }
]
export const DIM_KEYS = DIMENSIONS.map((d) => d.key)

const table = DIMENSIONS.map((d) => `- ${d.key} ${d.name}: ${d.levels.map((l, i) => `${i + 1}=${l}`).join(' / ')}`).join('\n')

// 구간 입력(S1, S2 …)용 지시문. 자유 서술 문서용은 RUBRIC_FREE_SYSTEM
export const RUBRIC_SYSTEM = `너는 지자체 재난취약자 대피계획서와 대피카드의 거동 상태 문구를 루브릭 차원별 점수로 옮기는 판독 보조기다.
담당자가 최종 확인하므로 추측하지 말고, 문구에 적힌 것만 근거로 쓴다. 등급은 고르지 않는다. 점수만 낸다.

루브릭(1: 도움 없음, 5: 완전 의존)
${table}

규칙
1. 입력의 각 구간(S1, S2 …)마다 결과를 하나씩 반드시 낸다. 구간을 빼거나 합치지 않는다.
2. 차원마다 score(1~5 정수)와 quote 를 낸다. quote 는 그 구간 글자에서 점수 근거가 된 부분을 한 글자도 바꾸지 않고 그대로 복사한다.
3. 문구에 그 차원의 근거가 없으면 score 는 null, quote 는 빈 글자로 둔다. 근거 없이 1점을 주지 않는다.
4. 두 단계 사이에서 애매하면 더 높은 점수를 고른다. 낮게 매기면 차가 가도 태우지 못한다.
5. "판독 불가", 얼룩, 빈칸처럼 읽을 수 없으면 모든 차원을 null 로 둔다.
6. [가림] 표시는 개인정보를 가린 자리다. 추측해서 채우지 않는다.
7. 출력은 아래 JSON 하나만 쓴다. 다른 글은 쓰지 않는다.
{"items":[{"id":"S1","dims":{"D1":{"score":3,"quote":"…"},"D2":{"score":null,"quote":""},"D3":{"score":3,"quote":"…"},"D4":{"score":null,"quote":""},"D5":{"score":null,"quote":""},"D6":{"score":null,"quote":""}}}]}`

export const RUBRIC_FREE_SYSTEM = RUBRIC_SYSTEM.replace('입력의 각 구간(S1, S2 …)마다 결과를 하나씩 반드시 낸다. 구간을 빼거나 합치지 않는다.', '문서 전체에서 대상자별 거동 상태 문구를 찾아 대상자마다 결과를 하나씩 낸다. id 는 P1, P2 … 로 붙인다.')

const one = (s) => String(s || '').replace(/\s+/g, ' ').trim()
const intScore = (v) => (Number.isInteger(v) && v >= 1 && v <= 5 ? v : (typeof v === 'string' && /^[1-5]$/.test(v.trim()) ? Number(v) : null))

// 모델 응답 검사. items 배열이 아니면 형식 오류. 차원 형식이 틀리면 그 차원은 근거 없음으로 본다
export function rubricItemsOf(out) {
  if (!out || typeof out !== 'object' || !Array.isArray(out.items)) throw Object.assign(new Error('루브릭 결과 형식 오류'), { code: 'BAD_MODEL_OUTPUT' })
  return out.items.filter((x) => x && typeof x === 'object' && !Array.isArray(x)).map((x) => {
    const src = x.dims && typeof x.dims === 'object' && !Array.isArray(x.dims) ? x.dims : {}
    const dims = {}
    for (const k of DIM_KEYS) {
      const d = src[k] && typeof src[k] === 'object' ? src[k] : {}
      dims[k] = { score: intScore(d.score), quote: typeof d.quote === 'string' ? d.quote : '' }
    }
    return { id: typeof x.id === 'string' ? x.id.trim() : '', dims }
  })
}

// 차원별 원문 대조. 근거 문구가 원문에 그대로 없으면 그 차원 점수를 비운다
export function verifyDims(dims, sourceText) {
  const src = one(sourceText)
  const out = {}
  for (const k of DIM_KEYS) {
    const d = dims?.[k] || {}
    const quote = one(d.quote)
    const score = intScore(d.score)
    if (score == null) { out[k] = { score: null, quote: '', verified: false, reason: 'noEvidence' }; continue }
    if (!quote || !src.includes(quote)) { out[k] = { score: null, quote, proposedScore: score, verified: false, reason: 'quoteMismatch' }; continue }
    out[k] = { score, quote, verified: true }
  }
  return out
}

const RANK = { walk: 1, assist: 2, wheelchair: 3, bed: 4 }
// 차원 하나가 가리키는 등급(없으면 null)
export function impliedGrades(dims) {
  const s = (k) => dims?.[k]?.score ?? null
  const g = []
  const d1 = s('D1'), d2 = s('D2'), d3 = s('D3')
  if (d2 === 5) g.push({ key: 'D2', grade: 'bed' })
  if (d3 === 5) g.push({ key: 'D3', grade: 'bed' })
  else if (d3 === 4) g.push({ key: 'D3', grade: 'wheelchair' })
  else if (d3 === 2 || d3 === 3) g.push({ key: 'D3', grade: 'assist' })
  if (d1 === 5) g.push({ key: 'D1', grade: 'wheelchair' })
  else if (d1 === 3 || d1 === 4) g.push({ key: 'D1', grade: 'assist' })
  else if (d1 === 1 || d1 === 2) g.push({ key: 'D1', grade: 'walk' })
  return g
}

// 등급 규칙(기획서 3.3). 서로 다른 등급을 가리키면 높은 쪽, 근거가 하나도 없으면 unknown(계산은 휠체어, 확인 필요)
export function gradeFromScores(dims) {
  const g = impliedGrades(dims)
  if (!g.length) return { grade: 'unknown', decidedBy: [], conflict: false }
  const top = g.reduce((a, b) => (RANK[b.grade] > RANK[a.grade] ? b : a))
  const conflict = new Set(g.map((x) => x.grade)).size > 1
  return { grade: top.grade, decidedBy: g.filter((x) => x.grade === top.grade).map((x) => x.key), conflict }
}

// 태그 규칙(기획서 3.3). 태그는 등급을 바꾸지 않는다
const HEAR = /청력|난청|보청|귀가\s*어둡|잘\s*못\s*들|안\s*들/
export function tagsFromScores(dims) {
  const s = (k) => dims?.[k]?.score ?? null
  const q = (k) => dims?.[k]?.quote || ''
  const tags = []
  if (s('D4') != null && s('D4') >= 3 && HEAR.test(q('D4'))) tags.push('hearing')
  if (s('D4') != null && s('D4') >= 4 && !HEAR.test(q('D4'))) tags.push('dementia')
  if (s('D5') != null && s('D5') >= 4) tags.push('oxygen')
  if (s('D5') === 2) tags.push('medication')
  if (s('D6') != null && s('D6') >= 3) tags.push('guardian')
  if (s('D2') === 5) tags.push('bedridden')
  return [...new Set(tags)]
}

// 신뢰도: 근거 없음 low, 차원끼리 등급이 엇갈림 low, 이동 차원 하나만 근거 mid, 둘 이상이 같은 등급 high
export function confidenceOf(result) {
  if (result.grade === 'unknown' || result.conflict) return 'low'
  return result.decidedBy.length >= 2 ? 'high' : 'mid'
}

// 한 사람 루브릭 판정. 기존 출력 필드(grade, quote, confidence, tags, reason)를 그대로 두고 rubric 필드를 더한다
export function rubricPerson(item, sourceText) {
  const dims = verifyDims(item?.dims, sourceText)
  const r = gradeFromScores(dims)
  const confidence = confidenceOf(r)
  const quote = r.decidedBy.length ? dims[r.decidedBy[0]].quote : ''
  const mismatched = DIM_KEYS.filter((k) => dims[k].reason === 'quoteMismatch')
  const reason = !item ? 'noResult' : r.grade === 'unknown' ? (mismatched.length ? 'quoteMismatch' : 'noEvidence') : r.conflict ? 'dimConflict' : undefined
  return {
    grade: r.grade,
    quote,
    confidence,
    tags: r.grade === 'unknown' ? [] : tagsFromScores(dims),
    ...(reason ? { reason } : {}),
    rubric: { version: RUBRIC_VERSION, status: RUBRIC_STATUS, dims, decidedBy: r.decidedBy, conflict: r.conflict, quoteMismatch: mismatched }
  }
}
