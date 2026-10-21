// api/intake.js Vercel 서버리스 함수(실행 지역 서울 icn1). AI 서류 판독(API_CONTRACT 4.1).
// POST { mimeType, data(base64) } → { transcript, persons, engine }
// 처리 흐름(모두 국내 네이버 클라우드)
//   1. 서류 사진은 CLOVA OCR 에만 보내 글자를 읽는다.
//   2. 읽은 글자에서 이름, 연락처, 주소, 주민번호로 보이는 값을 가린다.
//   3. "거동 상태" 칸을 코드로 나눠 대상자 단위를 정한다(누락 방지).
//   4. 가린 글자만 HyperCLOVA X(HCX-005)에 보내 이송 등급 초안과 근거 문구를 받는다.
//   5. 근거 문구가 원문에 그대로 있는지 코드로 대조하고, 없으면 등급을 비우고 실패로 표시해 담당자 확인으로 넘긴다.
//   가린 뒤에도 개인정보로 보이는 글자가 남으면 4번 전에 멈춘다. 서류 사진 원본은 1번 글자 인식에는 그대로 간다.
// 원문 대조와 신뢰도 강제 하향은 프론트 lib/intake.verifyPage 가 다시 수행한다(서버 응답을 그대로 믿지 않음).
// 키가 없으면 503 NO_KEY. 키는 서버 환경변수(NCP_OCR_INVOKE_URL, NCP_OCR_SECRET, NCP_CLOVASTUDIO_KEY)에만 둔다.

import { clovaOcr, ocrFormat, imageSize, toLines, maskLines, residualPII, boxOf, hcxJson, pick, pickTags, GRADES, CONFS, HCX_MODEL, B64, readJsonBody, VIRTUAL_ONLY_MSG } from './_ncp.js'
import { guard } from './_guard.js'

const MAX_BYTES = 6 * 1024 * 1024
const LABEL = /거\s*동\s*상\s*태\s*[:：]?\s*/
const STOP = /가상\s*데이터|실제\s*개인정보|순\s*번|비\s*고|대피\s*계획서|대피\s*카드|\[가림\]|^\s*\d{1,3}\s*$/
const UNREADABLE = /판\s*독\s*불\s*가|읽\s*을\s*수\s*없|식\s*별\s*불\s*가/

const SYSTEM = `너는 지자체 재난취약자 대피계획서와 대피카드의 거동 상태 문구를 이송 등급으로 분류하는 판독 보조기다.
담당자가 최종 확인하므로 추측하지 말고, 문구에 적힌 것만 근거로 쓴다.

이송 등급
- walk(도보): 혼자 걸을 수 있음. 인솔이나 안내가 필요해도 스스로 걷는다면 walk(치매나 청력 저하는 태그로 표시)
- assist(부축): 지팡이, 보행기, 부축을 받으면 걸을 수 있고 승용차 탑승 가능
- wheelchair(휠체어): 휠체어에 앉은 채로 이동
- bed(침상): 누운 상태로만 이송 가능(와상, 침대에서 못 일어남)
- unknown: 문구가 없거나, 판독 불가이거나, 등급을 정할 근거가 없음

특이사항 태그(문구에 근거가 있을 때만): oxygen(산소 장비) guardian(보호자 동행이나 가족 연락 필요) dementia(인지 저하, 치매) hearing(청력 저하) bedridden(와상) medication(상시 복약)

규칙
1. 입력의 각 구간(S1, S2 …)마다 결과를 하나씩 반드시 낸다. 구간을 빼거나 합치지 않는다.
2. quote 에는 그 구간 글자에서 판정 근거가 된 부분을 한 글자도 바꾸지 않고 그대로 복사한다.
3. "판독 불가", 얼룩, 빈칸처럼 읽을 수 없으면 grade 는 unknown, confidence 는 low, quote 는 그 구간 글자 그대로.
4. confidence 는 high(문구가 등급을 분명히 말함) mid(해석이 조금 필요함) low(근거가 약함) 중 하나.
5. [가림] 표시는 개인정보를 가린 자리다. 추측해서 채우지 않는다.
6. 두 등급 사이에서 애매하면(예: 가끔 휠체어, 거동 불편, 부축 또는 휠체어) 더 높은 등급을 고르고 confidence 는 low 로 둔다. 낮게 판정하면 차가 가도 태우지 못한다.
7. 출력은 아래 JSON 하나만 쓴다. 다른 글은 쓰지 않는다.
{"items":[{"id":"S1","grade":"assist","tags":[],"quote":"…","confidence":"mid"}]}`

const FREE_SYSTEM = SYSTEM.replace('입력의 각 구간(S1, S2 …)마다 결과를 하나씩 반드시 낸다. 구간을 빼거나 합치지 않는다.', '문서 전체에서 대상자별 거동 상태 문구를 찾아 대상자마다 결과를 하나씩 낸다. id 는 P1, P2 … 로 붙인다.')

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })
const one = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// 줄 목록에서 "거동 상태" 구간을 나눈다. 각 구간은 글자와 줄 번호를 가진다
export function segment(masked) {
  const segs = []
  masked.forEach((text, i) => {
    const m = text.match(LABEL)
    if (!m) return
    const seg = { lines: [i], text: one(text.slice(m.index + m[0].length)) }
    for (let j = i + 1; j < masked.length; j++) {
      if (LABEL.test(masked[j]) || STOP.test(masked[j])) break
      seg.lines.push(j); seg.text = one(`${seg.text} ${masked[j]}`)
    }
    // 표 머리줄(순번, 거동 상태, 비고)은 대상자가 아니므로 건너뛴다
    const header = !seg.text && (/순\s*번/.test(masked[i - 1] || '') || /비\s*고/.test(masked[i + 1] || ''))
    if (header) return
    if (!seg.text) seg.text = '(빈칸)'
    segs.push(seg)
  })
  return segs
}

// 요청 검사(GPT 재검토 R4, R9): 형식, 크기, 가상 자료 확인
export function validateRequest(body) {
  if (!body) return { status: 400, code: 'BAD_JSON', error: '요청 형식 오류' }
  const { mimeType, data, virtualOnly } = body
  if (virtualOnly !== true) return { status: 400, code: 'VIRTUAL_ONLY', error: VIRTUAL_ONLY_MSG }
  if (typeof mimeType !== 'string' || !ocrFormat(mimeType)) return { status: 400, code: 'BAD_INPUT', error: 'PNG, JPG, TIFF, PDF 파일 필요' }
  if (typeof data !== 'string' || !data || data.length > Math.ceil(MAX_BYTES / 3) * 4 + 4 || !B64.test(data)) return { status: data && typeof data === 'string' && data.length > MAX_BYTES ? 413 : 400, code: typeof data === 'string' && data.length > MAX_BYTES ? 'TOO_LARGE' : 'BAD_INPUT', error: '파일 내용 형식 오류이거나 6MB를 넘습니다' }
  const buf = Buffer.from(data, 'base64')
  if (!buf.length) return { status: 400, code: 'BAD_INPUT', error: '빈 파일입니다' }
  if (buf.length > MAX_BYTES) return { status: 413, code: 'TOO_LARGE', error: '파일 크기 6MB 초과' }
  // 실제 파일 머리와 형식이 맞는지 확인
  const head = buf.subarray(0, 4).toString('hex')
  const okHead = { 'image/png': head.startsWith('89504e47'), 'image/jpeg': head.startsWith('ffd8'), 'image/jpg': head.startsWith('ffd8'), 'application/pdf': buf.subarray(0, 4).toString() === '%PDF', 'image/tiff': head === '49492a00' || head === '4d4d002a' }
  if (!okHead[mimeType]) return { status: 400, code: 'BAD_INPUT', error: '파일 형식과 내용이 맞지 않습니다' }
  return { mimeType, data, buf }
}

// 모델 응답 검사(GPT 재검토 R9). items 배열이 아니면 형식 오류로 멈추고, 항목마다 형식이 틀리면 그 항목은 없는 것으로 본다
export function itemsOf(out) {
  if (!out || typeof out !== 'object' || !Array.isArray(out.items)) throw Object.assign(new Error('분류 결과 형식 오류'), { code: 'BAD_MODEL_OUTPUT' })
  return out.items.filter((x) => x && typeof x === 'object' && !Array.isArray(x)).map((x) => ({
    id: typeof x.id === 'string' ? x.id.trim() : '',
    grade: GRADES.includes(x.grade) ? x.grade : null,
    confidence: CONFS.includes(x.confidence) ? x.confidence : null,
    quote: typeof x.quote === 'string' ? x.quote : '',
    tags: Array.isArray(x.tags) ? x.tags.filter((t) => typeof t === 'string') : []
  }))
}

// 모델 응답 형식 오류는 한 번만 다시 묻고, 그래도 틀리면 422 확인 요청(회신 R36 홀드아웃 HO-04)
export async function askItems(system, user, ask = hcxJson) {
  for (let k = 0; k < 2; k++) {
    try { return itemsOf(await ask(system, user)) } catch (e) {
      if (!['PARSE', 'BAD_MODEL_OUTPUT'].includes(e.code)) throw e
      if (k === 1) throw Object.assign(new Error('분류 결과 형식 오류(재요청 뒤에도)'), { code: 'MODEL_FORMAT' })
    }
  }
}

// 자유 서술 문서에서 모델이 빠뜨린 대상자를 확인 필요로 채운다(회신 R36). 근거: 번호 매긴 줄 수, P 번호 빈자리
export function fillMissing(persons, items, masked) {
  const ids = items.map((x) => /^P(\d+)$/.exec(x.id || '')?.[1]).filter(Boolean).map(Number)
  const numbered = masked.filter((l) => /^\s*\d{1,2}\s*[.)]\s*\S/.test(l) && /가림|거\s*동|걸|휠체|침상|와상|부축|보행/.test(l)).length
  const want = Math.max(ids.length ? Math.max(...ids) : 0, numbered, detectedPersonCount(masked), persons.length)
  const out = persons.slice()
  for (let k = out.length; k < want; k++) out.push({ personHint: `순번 ${k + 1}`, tags: [], quote: '', confidence: 'low', box: null, grade: 'unknown', reason: 'missingFromModel' })
  return out
}

// OCR에서 확인되는 대상자 표식 수만 사용하며 모델 출력 수로 축소하지 않는다.
export function detectedPersonCount(masked) {
  const text = masked.join(' ')
  const count = (re) => [...text.matchAll(re)].length
  const declared = [...text.matchAll(/(?:대상자|인원|총)\s*[:：]?\s*(\d{1,3})\s*명/g)].map((m) => Number(m[1]))
  return Math.max(0, ...declared, count(/순\s*번\s*[:：]?\s*\d+/g), count(/(?:대상자|성명|이름)\s*[:：]?\s*\[가림\]/g), masked.filter((l) => /^\s*\d{1,3}\s+\[가림\]/.test(l)).length)
}

// 한 사람 판정. 근거 문구가 그 구간 원문에 없으면 원래 문구를 남기고 실패로 표시해 담당자 확인으로 넘긴다(GPT 재검토 R3)
export function judge(it, segText, personHint, box, free = false) {
  const quote = one(it?.quote)
  const base = { personHint, tags: [], quote, context: free ? undefined : segText, confidence: 'low', box }
  if (!it || !it.grade || !it.confidence) return { ...base, grade: 'unknown', reason: 'noResult' }
  if ((!free && UNREADABLE.test(segText)) || /판\s*독\s*불\s*가|읽\s*을\s*수\s*없|식\s*별\s*불\s*가|빈칸|(?:기록|정보|근거|기재|도움의 종류).{0,12}없/.test(quote)) return { ...base, grade: 'unknown', quote: quote || segText, reason: 'unreadable' }
  if (!quote || !segText.includes(quote)) {
    return { ...base, grade: 'unknown', proposedGrade: it.grade === 'unknown' ? undefined : it.grade, quoteMismatch: true, reason: 'quoteMismatch' }
  }
  const grade = it.grade
  return { ...base, grade, tags: grade === 'unknown' ? [] : pickTags(it.tags, free ? quote : segText), confidence: grade === 'unknown' ? 'low' : it.confidence }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  if (!(await guard(req, res, { requireSession: true, ai: 'intake' }))) return
  const v = validateRequest(readJsonBody(req))
  if (v.error) return fail(res, v.status, v.code, v.error)
  const { mimeType, data, buf } = v

  try {
    const fields = await clovaOcr(data, mimeType)
    const lines = toLines(fields)
    const masked = maskLines(lines.map((l) => l.text))
    // 가린 뒤에도 개인정보로 보이는 글자가 남으면 언어 모델에 보내지 않고 멈춘다(GPT 재검토 R4)
    const left = residualPII(masked)
    if (left.length) return fail(res, 422, 'PII_REMAINS', `개인정보로 보이는 글자(${left.join(', ')})가 남아 AI 판독을 멈췄습니다. ${VIRTUAL_ONLY_MSG}`)
    const transcript = one(masked.join(' '))
    // 글자를 하나도 못 읽었으면 언어 모델을 부르지 않고 확인 요청으로 돌려준다(GPT 3차 확인 R9)
    if (!transcript) return fail(res, 422, 'EMPTY_RESULT', '읽은 내용 없음. 담당자가 서류를 직접 확인해 주십시오')
    const size = imageSize(buf)
    const segs = segment(masked)

    let persons
    if (segs.length) {
      const user = segs.map((s, k) => `S${k + 1}: ${s.text}`).join('\n')
      const items = await askItems(SYSTEM, user)
      persons = segs.map((s, k) => {
        const it = items.find((x) => x.id === `S${k + 1}`) || (items.length === segs.length && !items.some((x) => x.id) ? items[k] : undefined)
        const idx = s.lines.flatMap((li) => lines[li].idx)
        return judge(it, s.text, `순번 ${k + 1}`, boxOf(fields, idx, size))
      })
    } else {
      const items = await askItems(FREE_SYSTEM, transcript)
      persons = fillMissing(items.map((it, k) => judge(it, transcript, `순번 ${k + 1}`, null, true)), items, masked)
    }
    persons = fillMissing(persons, [], masked)
    // 읽은 내용이 없으면 성공으로 넘기지 않는다(GPT 3차 확인 R9)
    if (!transcript || !persons.length) return fail(res, 422, 'EMPTY_RESULT', '읽은 내용 없음. 담당자가 서류를 직접 확인해 주십시오')
    return res.status(200).json({ transcript, persons, engine: { ocr: 'CLOVA OCR', llm: HCX_MODEL, region: 'KR' } })
  } catch (e) {
    if (e.code === 'NO_KEY') return fail(res, 503, 'NO_KEY', `판독 서버 미연결. ${e.message}`)
    if (e.code === 'MODEL_FORMAT') return fail(res, 422, 'MODEL_FORMAT', '판독 결과 형식이 맞지 않아 담당자 확인이 필요합니다. 서류를 직접 확인해 주십시오')
    if (e.code === 'TIMEOUT') return fail(res, 504, 'TIMEOUT', `판독 실패: ${e.message}. 잠시 뒤 다시 시도해 주십시오`)
    return fail(res, 502, ['UPSTREAM', 'BAD_UPSTREAM', 'PARSE', 'BAD_MODEL_OUTPUT', 'NETWORK'].includes(e.code) ? e.code : 'NETWORK', `판독 실패: ${e.message}`)
  }
}
