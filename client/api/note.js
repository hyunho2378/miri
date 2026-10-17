// api/note.js Vercel 서버리스 함수. 현장 소식 판독(글과 음성).
// POST { text } 또는 { mimeType, data(base64 음성) } 와 { current: { grade, tags } } → { transcript, changed, grade, tags, removeTags, quote, summary, confidence }
// GEMINI_API_KEY 가 없으면 503 NO_KEY. 키는 서버 환경변수에만 둔다.
// 원문 대조와 신뢰도 강제 하향은 프론트 lib/notes.verifyNote 가 다시 수행한다(서버 응답을 그대로 믿지 않음).

const MODEL = 'gemini-2.5-flash'
const MAX_BYTES = 6 * 1024 * 1024
const MAX_TEXT = 4000

const PROMPT = `너는 지자체 재난취약자 담당자에게 들어온 현장 소식을 읽는 판독기다.
요양보호사, 이장, 가족, 동 담당자가 전한 말이나 글에서 한 대상자의 거동 상태가 달라졌는지 찾는다.

이송 등급 정의(원문 그대로)
- 도보: 안내만 받으면 스스로 이동
- 부축: 부축을 받으면 승용차 탑승 가능
- 휠체어: 휠체어에 앉은 채로 이동
- 침상: 누운 상태로만 이송 가능

규칙
1. transcript 에 입력 글자 전체를 그대로 옮긴다. 음성이면 들리는 대로 받아 적는다. 고치거나 요약하지 않는다.
2. 소식에 거동 상태가 현재 어떻다는 말이 있을 때만 grade 를 walk | assist | wheelchair | bed 중 하나로 정한다. 변화가 없거나 알 수 없으면 changed 를 false, grade 를 unknown 으로 한다.
3. quote 에는 판단 근거가 된 문구를 transcript 에 있는 그대로 복사한다. 근거 문구가 없으면 grade 는 unknown.
4. 추측하지 않는다. 말하지 않은 것을 채우지 않는다. 읽을 수 없으면 unknown, confidence low.
5. tags 는 소식에 근거가 있는 특이사항만: oxygen(산소 장비) guardian(보호자 동행) dementia(인지 저하) hearing(청력 저하) bedridden(와상) medication(상시 복약).
6. removeTags 는 소식에서 더는 해당하지 않는다고 말한 특이사항만 같은 목록에서 고른다.
7. summary 는 달라진 점을 한 문장으로 쓴다. 달라진 점이 없으면 빈 문자열.
8. 이름 주소 전화번호는 출력하지 않는다.
9. confidence 는 high | mid | low.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    changed: { type: 'BOOLEAN' },
    grade: { type: 'STRING', enum: ['walk', 'assist', 'wheelchair', 'bed', 'unknown'] },
    tags: { type: 'ARRAY', items: { type: 'STRING', enum: ['oxygen', 'guardian', 'dementia', 'hearing', 'bedridden', 'medication'] } },
    removeTags: { type: 'ARRAY', items: { type: 'STRING', enum: ['oxygen', 'guardian', 'dementia', 'hearing', 'bedridden', 'medication'] } },
    quote: { type: 'STRING' },
    summary: { type: 'STRING' },
    confidence: { type: 'STRING', enum: ['high', 'mid', 'low'] }
  },
  required: ['transcript', 'changed', 'grade', 'quote', 'confidence']
}

const fail = (res, status, code, message) => res.status(status).json({ error: { code, message } })

export default async function handler(req, res) {
  if (req.method !== 'POST') return fail(res, 405, 'METHOD', 'POST 만 허용')
  const key = process.env.GEMINI_API_KEY
  if (!key) return fail(res, 503, 'NO_KEY', '판독 서버 미연결. GEMINI_API_KEY 설정 필요')

  let body = req.body
  if (typeof body === 'string') {
    try { body = JSON.parse(body) } catch { return fail(res, 400, 'BAD_JSON', '요청 형식 오류') }
  }
  const { text, mimeType, data, current } = body || {}
  const parts = [{ text: PROMPT }]
  if (current?.grade) parts.push({ text: `현재 명부 값: 등급 ${current.grade}, 특이사항 ${(current.tags || []).join(', ') || '없음'}` })
  if (typeof text === 'string' && text.trim()) {
    if (text.length > MAX_TEXT) return fail(res, 413, 'TOO_LONG', `글이 ${MAX_TEXT}자를 넘습니다`)
    parts.push({ text: `현장 소식 글:\n${text}` })
  } else if (data && /^audio\//.test(mimeType || '')) {
    if (Buffer.byteLength(data, 'base64') > MAX_BYTES) return fail(res, 413, 'TOO_LARGE', '파일 크기 6MB 초과')
    parts.push({ inline_data: { mime_type: mimeType, data } })
  } else {
    return fail(res, 400, 'BAD_INPUT', '글 또는 음성 파일 필요')
  }

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA }
      })
    })
    const out = await r.json().catch(() => ({}))
    if (!r.ok) return fail(res, 502, 'UPSTREAM', out?.error?.message || `판독 모델 오류 ${r.status}`)
    const raw = out?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
    let p
    try { p = JSON.parse(raw) } catch { return fail(res, 502, 'PARSE', '판독 결과 형식 오류') }
    return res.status(200).json({
      transcript: String(p.transcript || ''),
      changed: !!p.changed,
      grade: p.grade || 'unknown',
      tags: Array.isArray(p.tags) ? p.tags : [],
      removeTags: Array.isArray(p.removeTags) ? p.removeTags : [],
      quote: String(p.quote || ''),
      summary: String(p.summary || ''),
      confidence: p.confidence || 'low'
    })
  } catch (e) {
    return fail(res, 502, 'NETWORK', `판독 모델 호출 실패: ${e.message}`)
  }
}
