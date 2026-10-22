// api/note.js Vercel 서버리스 함수(실행 지역 서울 icn1). 현장 소식 판독(글과 음성).
// POST { text } 또는 { mimeType, data(base64 음성) } 와 { current: { grade, tags } }
//   → { transcript, changed, grade, tags, removeTags, quote, summary, confidence, engine }
// 처리 흐름(모두 국내 네이버 클라우드)
//   음성은 CLOVA Speech Recognition 으로 받아쓴다(60초 이내, mp3 aac ogg flac wav).
//   글에서 이름, 연락처, 주소로 보이는 값을 가린 뒤 HyperCLOVA X(HCX-005)에 보낸다.
// 원문 대조와 신뢰도 강제 하향은 프론트 lib/notes.verifyNote 가 다시 수행한다(서버 응답을 그대로 믿지 않음).
// 키가 없으면 503 NO_KEY. 키는 서버 환경변수(NCP_CLOVASTUDIO_KEY, NCP_CSR_CLIENT_ID, NCP_CSR_CLIENT_SECRET)에만 둔다.

import { hcxJson, clovaStt, csrSupported, maskLines, residualPII, pick, pickTags, GRADES, TAGS, CONFS, HCX_MODEL, B64, readJsonBody, VIRTUAL_ONLY_MSG } from './_ncp.js'
import { guard } from './_guard.js'
import { NOTE_SOURCES } from '../src/lib/notes.js'

const MAX_BYTES = 6 * 1024 * 1024
const MAX_TEXT = 4000

const SYSTEM = `너는 지자체 재난취약자 담당자에게 들어온 현장 소식을 읽는 판독 보조기다.
요양보호사, 생활지원사, 보건소 방문건강관리 담당자, 돌봄 수행기관 사회복지사, 이장, 가족, 동 담당자가 전한 말이나 글에서 한 대상자의 거동 상태가 달라졌는지 찾는다. 담당자가 최종 확인한다.

이송 등급
- walk(도보): 안내만 받으면 스스로 걸어서 이동
- assist(부축): 지팡이, 보행기, 부축을 받으면 걸을 수 있고 승용차 탑승 가능
- wheelchair(휠체어): 휠체어에 앉은 채로 이동
- bed(침상): 누운 상태로만 이송 가능

특이사항 태그: oxygen(산소 장비) guardian(보호자 동행) dementia(인지 저하) hearing(청력 저하) bedridden(와상) medication(상시 복약)

규칙
1. 소식에 지금 거동 상태가 어떻다는 말이 있을 때만 grade 를 walk assist wheelchair bed 중 하나로 정한다. 변화가 없거나 알 수 없으면 changed 는 false, grade 는 unknown.
2. quote 에는 판단 근거가 된 문구를 소식 글에서 한 글자도 바꾸지 않고 그대로 복사한다. 근거가 없으면 grade 는 unknown.
3. 추측하지 않는다. 말하지 않은 것을 채우지 않는다.
4. tags 는 소식에 근거가 있는 특이사항만. removeTags 는 더는 해당하지 않는다고 말한 특이사항만.
5. summary 는 달라진 점을 한 문장으로 쓴다. 없으면 빈 문자열. 이름, 주소, 전화번호는 쓰지 않는다.
6. [가림] 표시는 개인정보를 가린 자리다. 추측해서 채우지 않는다.
7. confidence 는 high mid low 중 하나.
8. 출력은 아래 JSON 하나만 쓴다. 다른 글은 쓰지 않는다.
{"changed":true,"grade":"assist","tags":[],"removeTags":[],"quote":"…","summary":"…","confidence":"mid"}`

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })
const one = (s) => String(s || '').replace(/\s+/g, ' ').trim()

// 요청 검사. current 는 허용된 등급과 특이사항만 받는다
const CUR_GRADES = GRADES.filter((g) => g !== 'unknown')
export function validateRequest(body) {
  if (!body) return { status: 400, code: 'BAD_JSON', error: '요청 형식 오류' }
  const { text, mimeType, data, current, virtualOnly, source } = body
  if (source != null && !NOTE_SOURCES.some((s) => s.value === source)) return { status: 400, code: 'BAD_INPUT', error: '소식을 전한 사람 형식 오류' }
  if (virtualOnly !== true) return { status: 400, code: 'VIRTUAL_ONLY', error: VIRTUAL_ONLY_MSG }
  let cur = null
  if (current != null) {
    if (typeof current !== 'object' || Array.isArray(current) || !CUR_GRADES.includes(current.grade)) return { status: 400, code: 'BAD_INPUT', error: '현재 명부 등급 형식 오류' }
    if (current.tags != null && (!Array.isArray(current.tags) || current.tags.some((t) => !TAGS.includes(t) && typeof t !== 'string'))) return { status: 400, code: 'BAD_INPUT', error: '현재 특이사항 형식 오류' }
    cur = { grade: current.grade, tags: (current.tags || []).filter((t) => TAGS.includes(t)) }
  }
  if (typeof text === 'string' && text.trim()) {
    if (text.length > MAX_TEXT) return { status: 413, code: 'TOO_LONG', error: `글이 ${MAX_TEXT}자를 넘습니다` }
    return { text, current: cur }
  }
  if (text != null && typeof text !== 'string') return { status: 400, code: 'BAD_INPUT', error: '글 형식 오류' }
  if (typeof data === 'string' && data && typeof mimeType === 'string' && /^audio\//.test(mimeType)) {
    if (!csrSupported(mimeType)) return { status: 415, code: 'AUDIO_FORMAT', error: 'mp3, aac, ogg, flac, wav 음성만 받습니다' }
    if (data.length > Math.ceil(MAX_BYTES / 3) * 4 + 4) return { status: 413, code: 'TOO_LARGE', error: '파일 크기 6MB 초과' }
    if (!B64.test(data)) return { status: 400, code: 'BAD_INPUT', error: '음성 파일 형식 오류' }
    return { data, mimeType, current: cur }
  }
  return { status: 400, code: 'BAD_INPUT', error: '글 또는 음성 파일 필요' }
}

// 모델 응답 검사와 판정. changed 는 참과 거짓 값만 받고, 근거 문구가 글에 없으면 등급을 비운다
export function judgeNote(p, transcript) {
  if (!p || typeof p !== 'object' || Array.isArray(p) || typeof p.changed !== 'boolean') throw Object.assign(new Error('판독 결과 형식 오류'), { code: 'BAD_MODEL_OUTPUT' })
  let grade = pick(p.grade, GRADES, 'unknown')
  const quote = one(typeof p.quote === 'string' ? p.quote : '')
  let confidence = pick(p.confidence, CONFS, 'low')
  let quoteMismatch = false
  let proposedGrade
  if (quote && !transcript.includes(quote)) { quoteMismatch = true; proposedGrade = grade === 'unknown' ? undefined : grade; grade = 'unknown'; confidence = 'low' }
  if (!quote) { grade = 'unknown'; confidence = 'low' }
  // 모델이 변화 없음이라고 하면 등급을 내지 않는다(현재 등급을 되풀이해 근거처럼 보이는 일 방지)
  if (!p.changed) grade = 'unknown'
  const evidence = quoteMismatch ? '' : transcript
  const tags = pickTags(p.tags, evidence)
  const removeTags = pickTags(p.removeTags, evidence)
  return {
    changed: p.changed && (grade !== 'unknown' || tags.length > 0 || removeTags.length > 0),
    grade, tags, removeTags, quote, quoteMismatch, proposedGrade,
    summary: typeof p.summary === 'string' ? one(p.summary) : '',
    confidence
  }
}

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  if (!(await guard(req, res, { requireSession: true, ai: 'note' }))) return
  const v = validateRequest(readJsonBody(req))
  if (v.error) return fail(res, v.status, v.code, v.error)
  const { text, mimeType, data, current } = v

  try {
    let raw
    if (text != null) raw = text
    else {
      raw = await clovaStt(data)
      if (!raw.trim()) return fail(res, 422, 'EMPTY_AUDIO', '음성에서 글자를 받아쓰지 못했습니다')
    }

    const masked = maskLines(raw.split(/\n+/))
    // 가린 뒤에도 개인정보로 보이는 글자가 남으면 언어 모델에 보내지 않는다
    const left = residualPII(masked)
    if (left.length) return fail(res, 422, 'PII_REMAINS', `개인정보로 보이는 글자(${left.join(', ')})가 남아 AI 판독을 멈췄습니다. ${VIRTUAL_ONLY_MSG}`)
    const transcript = one(masked.join(' '))
    const cur = current ? `현재 명부 값: 등급 ${current.grade}, 특이사항 ${current.tags.join(', ') || '없음'}\n` : ''
    const p = await hcxJson(SYSTEM, `${cur}현장 소식 글:\n${transcript}`, 800)
    return res.status(200).json({ transcript, ...judgeNote(p, transcript), engine: { stt: data ? 'CLOVA Speech Recognition' : null, llm: HCX_MODEL, region: 'KR' } })
  } catch (e) {
    if (e.code === 'NO_KEY') return fail(res, 503, 'NO_KEY', `판독 서버 미연결. ${e.message}`)
    if (e.code === 'TIMEOUT') return fail(res, 504, 'TIMEOUT', `판독 실패: ${e.message}. 잠시 뒤 다시 시도해 주십시오`)
    return fail(res, 502, ['UPSTREAM', 'BAD_UPSTREAM', 'PARSE', 'BAD_MODEL_OUTPUT', 'NETWORK'].includes(e.code) ? e.code : 'NETWORK', `판독 실패: ${e.message}`)
  }
}
