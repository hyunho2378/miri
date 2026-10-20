// api/note.js Vercel 서버리스 함수(실행 지역 서울 icn1). 현장 소식 판독(글과 음성).
// POST { text } 또는 { mimeType, data(base64 음성) } 와 { current: { grade, tags } }
//   → { transcript, changed, grade, tags, removeTags, quote, summary, confidence, engine }
// 처리 흐름(모두 국내 네이버 클라우드)
//   음성은 CLOVA Speech Recognition 으로 받아쓴다(60초 이내, mp3 aac ogg flac wav).
//   글에서 이름, 연락처, 주소로 보이는 값을 가린 뒤 HyperCLOVA X(HCX-005)에 보낸다.
// 원문 대조와 신뢰도 강제 하향은 프론트 lib/notes.verifyNote 가 다시 수행한다(서버 응답을 그대로 믿지 않음).
// 키가 없으면 503 NO_KEY. 키는 서버 환경변수(NCP_CLOVASTUDIO_KEY, NCP_CSR_CLIENT_ID, NCP_CSR_CLIENT_SECRET)에만 둔다.

import { hcxJson, clovaStt, csrSupported, maskLines, pick, pickTags, GRADES, CONFS, HCX_MODEL } from './_ncp.js'

const MAX_BYTES = 6 * 1024 * 1024
const MAX_TEXT = 4000

const SYSTEM = `너는 지자체 재난취약자 담당자에게 들어온 현장 소식을 읽는 판독 보조기다.
요양보호사, 이장, 가족, 동 담당자가 전한 말이나 글에서 한 대상자의 거동 상태가 달라졌는지 찾는다. 담당자가 최종 확인한다.

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

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return fail(res, 400, 'BAD_JSON', '요청 형식 오류') }
  }
  const { text, mimeType, data, current } = body || {}

  try {
    let raw
    if (typeof text === 'string' && text.trim()) {
      if (text.length > MAX_TEXT) return fail(res, 413, 'TOO_LONG', `글이 ${MAX_TEXT}자를 넘습니다`)
      raw = text
    } else if (data && /^audio\//.test(mimeType || '')) {
      if (!csrSupported(mimeType)) return fail(res, 415, 'AUDIO_FORMAT', 'mp3, aac, ogg, flac, wav 음성만 받습니다')
      if (Buffer.byteLength(data, 'base64') > MAX_BYTES) return fail(res, 413, 'TOO_LARGE', '파일 크기 6MB 초과')
      raw = await clovaStt(data)
      if (!raw.trim()) return fail(res, 422, 'EMPTY_AUDIO', '음성에서 글자를 받아쓰지 못했습니다')
    } else {
      return fail(res, 400, 'BAD_INPUT', '글 또는 음성 파일 필요')
    }

    const transcript = one(maskLines(raw.split(/\n+/)).join(' '))
    const cur = current?.grade ? `현재 명부 값: 등급 ${current.grade}, 특이사항 ${(current.tags || []).join(', ') || '없음'}\n` : ''
    const p = await hcxJson(SYSTEM, `${cur}현장 소식 글:\n${transcript}`, 800)

    let grade = pick(p?.grade, GRADES, 'unknown')
    let quote = one(p?.quote)
    let confidence = pick(p?.confidence, CONFS, 'low')
    if (quote && !transcript.includes(quote)) confidence = 'low'
    if (!quote) { grade = 'unknown'; confidence = 'low' }
    // 모델이 변화 없음이라고 하면 등급을 내지 않는다(현재 등급을 되풀이해 근거처럼 보이는 일 방지)
    if (!p?.changed) grade = 'unknown'
    return res.status(200).json({
      transcript,
      changed: !!p?.changed && (grade !== 'unknown' || pickTags(p?.tags, transcript).length > 0 || pickTags(p?.removeTags, transcript).length > 0),
      grade,
      tags: pickTags(p?.tags, transcript),
      removeTags: pickTags(p?.removeTags, transcript),
      quote,
      summary: one(p?.summary),
      confidence,
      engine: { stt: data ? 'CLOVA Speech Recognition' : null, llm: HCX_MODEL, region: 'KR' }
    })
  } catch (e) {
    if (e.code === 'NO_KEY') return fail(res, 503, 'NO_KEY', `판독 서버 미연결. ${e.message}`)
    return fail(res, 502, e.code || 'NETWORK', `판독 실패: ${e.message}`)
  }
}
