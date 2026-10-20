// api/intake.js Vercel 서버리스 함수(실행 지역 서울 icn1). AI 서류 판독(API_CONTRACT 4.1).
// POST { mimeType, data(base64) } → { transcript, persons, engine }
// 처리 흐름(모두 국내 네이버 클라우드)
//   1. 서류 사진은 CLOVA OCR 에만 보내 글자를 읽는다.
//   2. 읽은 글자에서 이름, 연락처, 주소, 주민번호로 보이는 값을 가린다.
//   3. "거동 상태" 칸을 코드로 나눠 대상자 단위를 정한다(누락 방지).
//   4. 가린 글자만 HyperCLOVA X(HCX-005)에 보내 이송 등급 초안과 근거 문구를 받는다.
//   5. 근거 문구가 원문에 그대로 있는지 코드로 대조하고, 없으면 일치도를 낮춘다.
// 원문 대조와 신뢰도 강제 하향은 프론트 lib/intake.verifyPage 가 다시 수행한다(서버 응답을 그대로 믿지 않음).
// 키가 없으면 503 NO_KEY. 키는 서버 환경변수(NCP_OCR_INVOKE_URL, NCP_OCR_SECRET, NCP_CLOVASTUDIO_KEY)에만 둔다.

import { clovaOcr, ocrFormat, imageSize, toLines, maskLines, boxOf, hcxJson, pick, pickTags, GRADES, CONFS, HCX_MODEL } from './_ncp.js'

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
6. 출력은 아래 JSON 하나만 쓴다. 다른 글은 쓰지 않는다.
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

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return fail(res, 400, 'BAD_JSON', '요청 형식 오류') }
  }
  const { mimeType, data } = body || {}
  if (!data || !ocrFormat(mimeType)) return fail(res, 400, 'BAD_INPUT', 'PNG, JPG, TIFF, PDF 파일 필요')
  const buf = Buffer.from(data, 'base64')
  if (buf.length > MAX_BYTES) return fail(res, 413, 'TOO_LARGE', '파일 크기 6MB 초과')

  try {
    const fields = await clovaOcr(data, mimeType)
    const lines = toLines(fields)
    const masked = maskLines(lines.map((l) => l.text))
    const transcript = one(masked.join(' '))
    const size = imageSize(buf)
    const segs = segment(masked)

    let persons
    if (segs.length) {
      const user = segs.map((s, k) => `S${k + 1}: ${s.text}`).join('\n')
      const out = await hcxJson(SYSTEM, user)
      const items = Array.isArray(out?.items) ? out.items : []
      persons = segs.map((s, k) => {
        const it = items.find((x) => String(x?.id || '').trim() === `S${k + 1}`) || (items.length === segs.length && !items.some((x) => x?.id) ? items[k] : undefined)
        let grade = pick(it?.grade, GRADES, 'unknown')
        let confidence = pick(it?.confidence, CONFS, 'low')
        let quote = one(it?.quote)
        if (!quote || !s.text.includes(quote)) { quote = s.text; if (confidence === 'high') confidence = 'mid' }
        if (!it) { grade = 'unknown'; confidence = 'low' }
        if (UNREADABLE.test(s.text)) { grade = 'unknown'; confidence = 'low'; quote = s.text }
        const idx = s.lines.flatMap((li) => lines[li].idx)
        return { personHint: `순번 ${k + 1}`, grade, tags: grade === 'unknown' ? [] : pickTags(it?.tags, s.text), quote, confidence, box: boxOf(fields, idx, size) }
      })
    } else {
      const out = await hcxJson(FREE_SYSTEM, transcript)
      const items = Array.isArray(out?.items) ? out.items : []
      persons = items.map((it, k) => {
        const quote = one(it?.quote)
        const grade = quote ? pick(it?.grade, GRADES, 'unknown') : 'unknown'
        return { personHint: `순번 ${k + 1}`, grade, tags: pickTags(it?.tags, quote), quote, confidence: pick(it?.confidence, CONFS, 'low'), box: null }
      })
    }
    return res.status(200).json({ transcript, persons, engine: { ocr: 'CLOVA OCR', llm: HCX_MODEL, region: 'KR' } })
  } catch (e) {
    if (e.code === 'NO_KEY') return fail(res, 503, 'NO_KEY', `판독 서버 미연결. ${e.message}`)
    return fail(res, 502, e.code || 'NETWORK', `판독 실패: ${e.message}`)
  }
}
