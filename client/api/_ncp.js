// api/_ncp.js 네이버 클라우드(국내) AI 호출 공용 모듈. 밑줄로 시작해 Vercel 함수 경로로 노출되지 않는다.
// 서류 글자 인식: CLOVA OCR(일반 도메인, API Gateway 호출 주소)
// 문구 분류: CLOVA Studio HyperCLOVA X(HCX-005)
// 음성 받아쓰기: CLOVA Speech Recognition(CSR)
// 키는 서버 환경변수에만 둔다. 코드와 저장소에 키를 넣지 않는다.

export const HCX_MODEL = 'HCX-005'
export const GRADES = ['walk', 'assist', 'wheelchair', 'bed', 'unknown']
export const TAGS = ['oxygen', 'guardian', 'dementia', 'hearing', 'bedridden', 'medication']
export const CONFS = ['high', 'mid', 'low']

export const env = {
  ocrUrl: () => process.env.NCP_OCR_INVOKE_URL,
  ocrSecret: () => process.env.NCP_OCR_SECRET,
  hcxKey: () => process.env.NCP_CLOVASTUDIO_KEY,
  csrId: () => process.env.NCP_CSR_CLIENT_ID,
  csrSecret: () => process.env.NCP_CSR_CLIENT_SECRET
}

const rid = () => `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 10)}`

// PNG, JPEG 머리에서 가로세로 크기를 읽는다(상자 위치를 퍼센트로 바꾸기 위함)
export function imageSize(buf) {
  if (buf.length > 24 && buf.readUInt32BE(0) === 0x89504e47) return { w: buf.readUInt32BE(16), h: buf.readUInt32BE(20) }
  if (buf[0] === 0xff && buf[1] === 0xd8) {
    let i = 2
    while (i < buf.length - 9) {
      if (buf[i] !== 0xff) { i++; continue }
      const m = buf[i + 1]
      const len = buf.readUInt16BE(i + 2)
      if (m >= 0xc0 && m <= 0xcf && ![0xc4, 0xc8, 0xcc].includes(m)) return { h: buf.readUInt16BE(i + 5), w: buf.readUInt16BE(i + 7) }
      i += 2 + len
    }
  }
  return null
}

const FORMAT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/jpg': 'jpg', 'image/tiff': 'tiff', 'application/pdf': 'pdf' }
export const ocrFormat = (mime) => FORMAT[mime] || null

// CLOVA OCR 일반 인식. 글자 조각(fields)을 돌려준다
export async function clovaOcr(base64, mime) {
  const url = env.ocrUrl(); const secret = env.ocrSecret()
  if (!url || !secret) throw Object.assign(new Error('글자 인식 서버 미연결'), { code: 'NO_KEY' })
  const r = await fetch(url, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': secret },
    body: JSON.stringify({ version: 'V2', requestId: rid(), timestamp: Date.now(), lang: 'ko', images: [{ format: ocrFormat(mime), name: 'doc', data: base64 }] })
  })
  const out = await r.json().catch(() => ({}))
  const img = out?.images?.[0]
  if (!r.ok || !img) throw Object.assign(new Error(out?.message || `글자 인식 오류 ${r.status}`), { code: 'UPSTREAM' })
  if (img.inferResult && img.inferResult !== 'SUCCESS') throw Object.assign(new Error(img.message || '글자 인식 실패'), { code: 'UPSTREAM' })
  return (img.fields || []).map((f) => ({
    text: String(f.inferText || ''),
    lineBreak: !!f.lineBreak,
    pts: (f.boundingPoly?.vertices || []).map((v) => [Number(v.x) || 0, Number(v.y) || 0])
  })).filter((f) => f.text)
}

// 개인정보로 보이는 글자를 가린다. 언어 모델에는 가린 글자만 보낸다
const LABEL = /(성\s*명|이\s*름|연\s*락\s*처|전\s*화(?:\s*번\s*호)?|휴\s*대\s*폰|주\s*소|생\s*년\s*월\s*일|주\s*민(?:\s*등\s*록)?\s*번\s*호)\s*[:：]?\s*/
const PHONE = /(0\d{1,2})[\s.-]?\d{3,4}[\s.-]?\d{4}/g
const RRN = /\d{6}\s*-\s*[1-4]\d{6}/g
// 성으로 시작하는 두세 글자 이름 뒤에 어르신, 할머니, 할아버지, 씨가 오면 이름으로 보고 가린다
const NAMED = /(^|[\s(])([김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설길연위표명기반왕금옥육인맹제모탁국은편용예봉경][가-힣]{1,2})\s?(어르신|할머니|할아버지|씨)/g
export function maskLines(lines) {
  return lines.map((line) => {
    let s = line.replace(RRN, '[주민번호 가림]').replace(PHONE, '[연락처 가림]').replace(NAMED, '$1[이름 가림] $3')
    const m = s.match(LABEL)
    // 항목 이름 뒤에 쌍점이 있거나 줄 맨 앞에 항목 이름이 올 때만 값으로 보고 가린다(안내 문장 속 낱말은 두기)
    const josa = /^[과와은는이가을를의도]/.test(s.slice(m ? m.index + m[1].length : 0))
    if (m && (/[:：]/.test(m[0]) || (!s.slice(0, m.index).trim() && !josa))) s = s.slice(0, m.index) + m[1].replace(/\s/g, '') + ': [가림]'
    return s
  })
}

// 글자 조각을 줄 단위로 묶는다(lineBreak 기준). 각 줄은 조각 번호 범위를 가진다
export function toLines(fields) {
  const lines = []; let cur = []
  fields.forEach((f, i) => { cur.push(i); if (f.lineBreak) { lines.push(cur); cur = [] } })
  if (cur.length) lines.push(cur)
  return lines.map((idx) => ({ idx, text: idx.map((i) => fields[i].text).join(' ') }))
}

// 조각 묶음의 위치를 이미지 대비 퍼센트 [x, y, w, h] 로
export function boxOf(fields, idx, size) {
  if (!size || !idx.length) return null
  const xs = []; const ys = []
  idx.forEach((i) => fields[i].pts.forEach(([x, y]) => { xs.push(x); ys.push(y) }))
  if (!xs.length) return null
  const x0 = Math.min(...xs), x1 = Math.max(...xs), y0 = Math.min(...ys), y1 = Math.max(...ys)
  const p = (v, t) => Math.max(0, Math.min(100, Math.round((v / t) * 1000) / 10))
  return [p(x0, size.w), p(y0, size.h), p(x1 - x0, size.w), p(y1 - y0, size.h)]
}

// HyperCLOVA X 대화 호출. JSON 한 덩어리를 받아 파싱한다
export async function hcxJson(system, user, maxTokens = 1200) {
  const key = env.hcxKey()
  if (!key) throw Object.assign(new Error('문구 분류 서버 미연결'), { code: 'NO_KEY' })
  const r = await fetch(`https://clovastudio.stream.ntruss.com/v3/chat-completions/${HCX_MODEL}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-NCP-CLOVASTUDIO-REQUEST-ID': rid() },
    body: JSON.stringify({ messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature: 0.1, topP: 0.8, maxTokens, repetitionPenalty: 1.0 })
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok || (out?.status?.code && out.status.code !== '20000')) throw Object.assign(new Error(out?.status?.message || `문구 분류 오류 ${r.status}`), { code: 'UPSTREAM' })
  const text = String(out?.result?.message?.content || '').replace(/```(?:json)?/g, '').trim()
  // 모델이 객체 대신 배열만 내는 경우가 있어 둘 다 받는다. 배열이면 { items } 로 감싼다
  const tries = [text]
  const os = text.indexOf('{'), oe = text.lastIndexOf('}'), as = text.indexOf('['), ae = text.lastIndexOf(']')
  if (as >= 0 && ae > as && (os < 0 || as < os)) tries.push(text.slice(as, ae + 1))
  if (os >= 0 && oe > os) tries.push(text.slice(os, oe + 1))
  for (const t of tries) {
    try { const v = JSON.parse(t); return Array.isArray(v) ? { items: v } : v } catch {}
  }
  throw Object.assign(new Error('분류 결과 형식 오류'), { code: 'PARSE' })
}

// CLOVA Speech Recognition. 음성 파일(60초 이내)을 글로
const CSR_MIME = /^audio\/(mpeg|mp3|aac|x-aac|ac3|ogg|flac|x-flac|wav|x-wav|wave)$/
export const csrSupported = (mime) => CSR_MIME.test(mime || '')
export async function clovaStt(base64) {
  const id = env.csrId(); const sec = env.csrSecret()
  if (!id || !sec) throw Object.assign(new Error('음성 받아쓰기 서버 미연결'), { code: 'NO_KEY' })
  const r = await fetch('https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor', {
    method: 'POST',
    headers: { 'Content-Type': 'application/octet-stream', 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': sec },
    body: Buffer.from(base64, 'base64')
  })
  const out = await r.json().catch(() => ({}))
  if (!r.ok) throw Object.assign(new Error(out?.errorMessage || out?.error?.message || `음성 받아쓰기 오류 ${r.status}`), { code: 'UPSTREAM' })
  return String(out?.text || '')
}

export const pick = (v, list, d) => (list.includes(v) ? v : d)
// 특이사항은 글자에 근거 낱말이 있을 때만 남긴다(모델이 근거 없이 붙인 태그를 걷어냄)
const TAG_EVIDENCE = {
  oxygen: /산소/, guardian: /보호자|가족|딸|아들|며느리|배우자|동행/, dementia: /치매|인지/,
  hearing: /청력|난청|보청|귀가\s*어둡|잘\s*못\s*들/, bedridden: /와상|누워|침대|못\s*일어/, medication: /약|복약|투약|투석|인슐린/
}
export const pickTags = (a, evidence) => (Array.isArray(a) ? [...new Set(a.filter((t) => TAGS.includes(t) && (evidence == null || TAG_EVIDENCE[t].test(evidence))))] : [])
export const norm = (s) => String(s || '').replace(/\s+/g, '')
