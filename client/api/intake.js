// api/intake.js Vercel 서버리스 함수. AI 서류 판독(API_CONTRACT 4.1).
// POST { mimeType, data(base64) } → { transcript, persons }
// GEMINI_API_KEY 가 없으면 503 NO_KEY. 키는 서버 환경변수에만 두고 프론트에 노출하지 않는다.
// 원문 대조와 신뢰도 강제 하향은 프론트 lib/intake.verifyPage 가 다시 수행한다(서버 응답을 그대로 믿지 않음).

const MODEL = 'gemini-2.5-flash'
const MAX_BYTES = 6 * 1024 * 1024

const PROMPT = `너는 지자체 재난취약자 대피계획서와 대피카드를 읽는 판독기다.
문서 이미지에서 대상자별 거동 상태를 읽고 이송 등급을 판정한다.

이송 등급 정의(원문 그대로)
- 도보: 안내만 받으면 스스로 이동. 마을 버스 또는 승용차와 인솔 1명
- 부축: 부축을 받으면 승용차 탑승 가능. 승용차와 도우미 1명
- 휠체어: 휠체어에 앉은 채로 이동. 리프트 승합차와 도우미 2명
- 침상: 누운 상태로만 이송 가능. 구급차 또는 침상 승합차와 구급대원

규칙
1. transcript 에 페이지 전체 글자를 보이는 그대로 전사한다. 고치거나 요약하지 않는다.
2. 대상자마다 grade 를 walk | assist | wheelchair | bed | unknown 중 하나로 정한다.
3. quote 에는 판정 근거가 된 문구를 transcript 에 있는 그대로 복사한다. 근거 문구가 없으면 grade 는 unknown.
4. 추측하지 않는다. 읽을 수 없으면 unknown, confidence low.
5. tags 는 oxygen(산소 장비) guardian(보호자 동행) dementia(인지 저하) hearing(청력 저하) bedridden(와상) medication(상시 복약) 중 문서에 근거가 있는 것만.
6. 이름 주소 전화번호는 출력하지 않는다. personHint 에는 문서 안 순번 같은 비식별 표기만 쓴다.
7. box 는 해당 대상자 기재 영역의 위치를 이미지 크기 대비 퍼센트 [x, y, w, h] 로 준다.
8. confidence 는 high | mid | low.`

const SCHEMA = {
  type: 'OBJECT',
  properties: {
    transcript: { type: 'STRING' },
    persons: {
      type: 'ARRAY',
      items: {
        type: 'OBJECT',
        properties: {
          personHint: { type: 'STRING' },
          grade: { type: 'STRING', enum: ['walk', 'assist', 'wheelchair', 'bed', 'unknown'] },
          tags: { type: 'ARRAY', items: { type: 'STRING', enum: ['oxygen', 'guardian', 'dementia', 'hearing', 'bedridden', 'medication'] } },
          quote: { type: 'STRING' },
          confidence: { type: 'STRING', enum: ['high', 'mid', 'low'] },
          box: { type: 'ARRAY', items: { type: 'NUMBER' } }
        },
        required: ['grade', 'quote', 'confidence']
      }
    }
  },
  required: ['transcript', 'persons']
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
  const { mimeType, data } = body || {}
  if (!data || !/^image\//.test(mimeType || '')) return fail(res, 400, 'BAD_INPUT', '이미지 파일 필요')
  if (Buffer.byteLength(data, 'base64') > MAX_BYTES) return fail(res, 413, 'TOO_LARGE', '파일 크기 6MB 초과')

  try {
    const r = await fetch(`https://generativelanguage.googleapis.com/v1beta/models/${MODEL}:generateContent?key=${encodeURIComponent(key)}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: [{ role: 'user', parts: [{ text: PROMPT }, { inline_data: { mime_type: mimeType, data } }] }],
        generationConfig: { temperature: 0, responseMimeType: 'application/json', responseSchema: SCHEMA }
      })
    })
    const out = await r.json().catch(() => ({}))
    if (!r.ok) return fail(res, 502, 'UPSTREAM', out?.error?.message || `판독 모델 오류 ${r.status}`)
    const text = out?.candidates?.[0]?.content?.parts?.map((p) => p.text || '').join('') || ''
    let parsed
    try { parsed = JSON.parse(text) } catch { return fail(res, 502, 'PARSE', '판독 결과 형식 오류') }
    const persons = Array.isArray(parsed.persons) ? parsed.persons.map((p) => ({
      personHint: String(p.personHint || ''),
      grade: p.grade || 'unknown',
      tags: Array.isArray(p.tags) ? p.tags : [],
      quote: String(p.quote || ''),
      confidence: p.confidence || 'low',
      box: Array.isArray(p.box) && p.box.length === 4 ? p.box.map(Number) : null
    })) : []
    return res.status(200).json({ transcript: String(parsed.transcript || ''), persons })
  } catch (e) {
    return fail(res, 502, 'NETWORK', `판독 모델 호출 실패: ${e.message}`)
  }
}
