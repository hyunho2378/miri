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
// 외부 호출 시간 제한. 단계마다 끊어 서버리스 실행이 오래 붙잡히지 않게 한다
export const TIMEOUT_MS = { ocr: 20000, hcx: 25000, stt: 20000 }
const timeoutSignal = (ms) => (typeof AbortSignal !== 'undefined' && AbortSignal.timeout ? AbortSignal.timeout(ms) : undefined)
const upstream = (e, what) => (e?.name === 'TimeoutError' || e?.name === 'AbortError'
  ? Object.assign(new Error(`${what} 응답 시간 초과`), { code: 'TIMEOUT' })
  : e?.code ? e : Object.assign(new Error(`${what} 연결 실패`), { code: 'NETWORK' }))

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
  let r
  try {
    r = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-OCR-SECRET': secret },
      body: JSON.stringify({ version: 'V2', requestId: rid(), timestamp: Date.now(), lang: 'ko', images: [{ format: ocrFormat(mime), name: 'doc', data: base64 }] }),
      signal: timeoutSignal(TIMEOUT_MS.ocr)
    })
  } catch (e) { throw upstream(e, '글자 인식') }
  const out = await r.json().catch(() => null)
  const img = out?.images?.[0]
  // 공급자 원문 오류는 그대로 보이지 않고 고정 문구로 정리한다
  if (!r.ok || !img || typeof img !== 'object') throw Object.assign(new Error(`글자 인식 오류 ${r.status}`), { code: 'UPSTREAM' })
  if (img.inferResult && img.inferResult !== 'SUCCESS') throw Object.assign(new Error('글자 인식 실패'), { code: 'UPSTREAM' })
  if (img.fields != null && !Array.isArray(img.fields)) throw Object.assign(new Error('글자 인식 결과 형식 오류'), { code: 'BAD_UPSTREAM' })
  return (img.fields || []).filter((f) => f && typeof f === 'object').map((f) => ({
    text: String(f.inferText || ''),
    lineBreak: !!f.lineBreak,
    pts: (Array.isArray(f.boundingPoly?.vertices) ? f.boundingPoly.vertices : []).map((v) => [Number.isFinite(Number(v?.x)) ? Number(v.x) : 0, Number.isFinite(Number(v?.y)) ? Number(v.y) : 0])
  })).filter((f) => f.text)
}

// 개인정보로 보이는 글자를 가린다. 언어 모델에는 가린 글자만 보낸다
const LABEL = /(성\s*명|이\s*름|연\s*락\s*처|전\s*화(?:\s*번\s*호)?|휴\s*대\s*폰|주\s*소|생\s*년\s*월\s*일|주\s*민(?:\s*등\s*록)?\s*번\s*호)\s*[:：]?\s*/
const PHONE = /(0\d{1,2})[\s.-]?\d{3,4}[\s.-]?\d{4}/g
const RRN = /\d{6}\s*-\s*[1-4]\d{6}/g
// 성으로 시작하는 두세 글자 이름 뒤에 어르신, 할머니, 할아버지, 씨가 오면 이름으로 보고 가린다
const NAMED = /(^|[\s(])([김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설길연위표명기반왕금옥육인맹제모탁국은편용예봉경][가-힣]{1,2})\s?(어르신|할머니|할아버지|씨)/g
// 13자리 번호(주민번호 꼴, 붙임표 없음 포함)
const RRN13 = /(^|\D)\d{6}\s*-?\s*\d{7}(?!\d)/g
// 날짜(생년월일 등). 판정에 필요 없으므로 모두 가린다
const DATE = /(19|20)\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}\s*[.일]?/g
// 주소: 시도 시군구 뒤 도로명과 번호, 또는 도로명과 번호만
const ADDR = /([가-힣]+(특별자치도|광역시|특별시|도|시|군|구)\s+)*[가-힣0-9]+(로|길)\s*\d+(\s*-\s*\d+)?(\s*번길\s*\d+)?/g
// 성으로 시작하는 두세 글자 뒤 님, 씨. 직함과 관계 낱말은 이름이 아니므로 둔다
const NAMED_HON = /(^|[^가-힣])([김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설길연위표명기반왕금옥육인맹제모탁국은편용예봉경][가-힣]{1,2})\s?(님|씨)/g
const ROLE = /^(이장|반장|통장|선생|기사|박사|원장|회장|과장|계장|팀장|부장|실장|소장|국장|시장|동장|사장|주무관|공무원|간호사|보호사|복지사|요양사|대원|봉사자|도우미|담당자|어르신|할머|할아|어머|아버|며느|사위|손자|손녀|조카|형|누나|언니|오빠|동생|아드|따|고객|손)/
const LABEL_ONLY = /^\s*(성\s*명|이\s*름|연\s*락\s*처|전\s*화(?:\s*번\s*호)?|휴\s*대\s*폰|주\s*소|생\s*년\s*월\s*일|주\s*민(?:\s*등\s*록)?\s*번\s*호)\s*[:：]?\s*$/
// 칸 이름 없이 문장 속, 서명란, 표 칸에 나오는 이름 꼴(회신 R36 홀드아웃 시험: 자유 서술과 손글씨풍 5장에서 성명 미가림)
// 성씨로 시작하는 세 글자 낱말을 이름 후보로 보고, 거동과 업무 낱말은 보호한다. 과잉 가림은 허용한다
const SURNAME = '김이박최정강조윤장임한오서신권황안송류유전홍고문양손배백허남심노하곽성차주우구민진나지엄채원천방공현함변염여추도소석선설마길연위표명기반왕금옥육인맹제모탁국'
const PROTECT = /(걸|보행|부축|휠체|침상|침대|이동|거동|누워|누운|앉|지팡|천천|도움|혼자|가능|불가|필요|상태|와상|산소|치매|청력|인지|보호|동행|주간|야간|정도|조금|일부|자주|가끔|항상|계단|집안|외출|확인|판독|대상|도보|기저|연락|가족|보조|사용|상시|복약|투석|요양|센터|주소|성명|이름|전화|생년|주민|비고|순번|서명|작성|담당|기록|시설|마을|동해|강원|어르신|할머|할아|선생|간호|복지|다리|무릎|허리|골절|수술|통증|장애|시각|청각|언어|중증|경증|등급|이송|차량|리프트|대피|안내|요청|문의|위험|정상|약간|매우|거의|전혀|시간|한쪽|오른|왼쪽|안전|안방|방안|소변|대변|식사|목욕|화장|기능|인정|판정|수급|보건|진료|병원|의원|약물|투약|당뇨|고혈|혈압|뇌졸|중풍|마비|편마|파킨|관절|노인|독거|부부|동거|자녀|아들|며느|사위|손자|손녀|조카|배우|남편|아내|어머|아버|주민|통장|이장|반장|동장|시장|공무|주무|기사|대원|봉사|도우|기관|관리|등록|평가|내용|사항|특이|기타|현재|최근|이전|이후|당시|매일|가정|자택|주택|아파|빌라|현관|문턱|엘리|승강|도로|골목|경사|언덕|정류|버스|택시|구급|소방|경찰|동사|행정|복합|노인|경로|회관|교회|학교|초등|중학|고등|체육|대피소|공원|시청|군청|도청|구청|면사|읍사|부분|전체|약간|많이|조금|다소|별도|함께|같이|사람|정신|신체|건강|질환|질병|증상|상황|문제|필수|주의|유의|해당|없음|있음|모름|미상|불명|선택|체크|표시|확인|비해|대해|위해|통해|따라|으로|에서|에게|까지|부터|이상|이하|미만|초과|이내|정도|일반|특수|전동|수동|접이|이불|기저귀|흡인|위관|도뇨|욕창|체위|기침|가래|호흡|맥박|의식|기억|판단|소통|대화|발음|난청|보청|안경|시력|실명|저시|점자|수어|통역|외국|한국|중국|베트|필리|일본|미국|러시)/
const NAME3 = new RegExp(`(^|[^가-힣])([${SURNAME}][가-힣]{2})(?=(?:은|는|이|가|을|를|의|께서|에게|와|과|도|댁|님|씨|\\s*\\(|\\s*\\d{2,3}\\s*세|[^가-힣]|$))`, 'g')
const RELATION = /(장남|장녀|차남|차녀|손주|아들|딸|며느리|사위|손자|손녀|남편|아내|배우자|보호자|자녀|형|누나|언니|오빠|동생|조카|작성자|확인자|기록자|담당자|담당|서명|성함|대상자|어르신|할머니|할아버지|이웃)\s*[:：]?\s*([가-힣]{2,3})(?=(?:과|와|가|이|은|는|을|를|의|도|께서|에게)?(?:[^가-힣]|$))/g
const NAME_AGE = /(^|[^가-힣])([가-힣]{2,3})\s*\(\s*(\d{2,3})\s*(세)?\s*\)/g
// 지번 주소, 아파트 동호수
const ADDR_LOT = /([가-힣0-9]+(동|리|읍|면|가)\s*)?\d{1,5}\s*(-\s*\d{1,5}\s*)?번지/g
const ADDR_LOT2 = /([가-힣]+(동|리))\s+\d{1,5}(\s*-\s*\d{1,5})?(?![\d가-힣])/g
const APT = /\d{1,4}\s*동\s*\d{1,4}\s*호/g
// 가린 주소 뒤에 남는 건물 이름과 호수, 건물 이름 뒤 호수(홀드아웃2 결과 뒤 수정)
const ADDR_TAIL = /\[주소 가림\](\s*[가-힣A-Za-z0-9]{1,12}?)?\s*\d{1,4}(\s*호)?(?=에|의|로|에서|[^\d가-힣]|$)/g
const UNIT = /([가-힣A-Za-z]*(아파트|빌라|주택|맨션|타운|하우스|오피스텔|빌딩|연립|원룸)\s*)?\d{1,4}\s*호(?=에|의|로|에서|[^가-힣]|$)/g
// 년생, 짧은 날짜
const BORN = /((19|20)?\d{2})\s*년\s*생/g
const DATE2 = /(^|\D)\d{2}\s*[.]\s*\d{1,2}\s*[.]\s*\d{1,2}(?!\d)/g
// 조사나 어미로 끝나는 세 글자는 이름이 아니다(예: 차에는, 오르심). 이름에 흔한 끝 글자(지, 서, 은, 영 등)는 넣지 않는다
const ENDING = /(에는|에서|에게|으로|하고|하며|하여|하는|하심|하신|하게|에도|까지|부터|처럼|보다|이나|거나|지만|면서|는데|었음|았음|였음|심|습|니다|어요|아요|음|임|요|다|고|며|면|게|함|됨|듯|쯤|씩|뿐|께|엔|론|란|랑|에)$/
const RELATION_NOT_NAME = /(걸|부축|휠체|침상|보행|이동|거동|연락|가능|불가|방문|동행|함께|같이|없음|있음|미상|모름|확인|필요|거주|사망|별거|동거|외국|해외|타지|서울|부산|대구|인천|광주|대전|울산|세종|경기|강원|충북|충남|전북|전남|경북|경남|제주)/
const isProtected = (w) => PROTECT.test(w) || ENDING.test(w)
export function maskNamesFree(s) {
  return s
    .replace(RELATION, (all, rel, name) => (RELATION_NOT_NAME.test(name) || ENDING.test(name) || /가림/.test(name) ? all : `${rel} [이름 가림]`))
    .replace(NAME_AGE, (all, pre, name) => (isProtected(name) || /가림/.test(name) ? all : `${pre}[이름 가림]([나이 가림])`))
    .replace(NAME3, (all, pre, name) => (isProtected(name) || /가림/.test(name) ? all : `${pre}[이름 가림]`))
}
export function maskLines(lines) {
  const out = lines.map((line) => {
    let s = line.replace(RRN, '[주민번호 가림]').replace(RRN13, '$1[번호 가림]').replace(PHONE, '[연락처 가림]').replace(DATE, '[날짜 가림]')
      .replace(BORN, '[날짜 가림]').replace(DATE2, '$1[날짜 가림]')
      .replace(ADDR, '[주소 가림]').replace(APT, '[주소 가림]').replace(ADDR_TAIL, '[주소 가림]').replace(UNIT, '[주소 가림]').replace(ADDR_LOT, '[주소 가림]').replace(ADDR_LOT2, '[주소 가림]')
      .replace(NAMED, '$1[이름 가림] $3')
      .replace(NAMED_HON, (all, pre, name, hon) => (ROLE.test(name) ? all : `${pre}[이름 가림]${hon}`))
    s = maskNamesFree(s)
    const m = s.match(LABEL)
    // 항목 이름 뒤에 쌍점이 있거나 줄 맨 앞에 항목 이름이 올 때만 값으로 보고 가린다(안내 문장 속 낱말은 두기)
    const josa = /^[과와은는이가을를의도]/.test(s.slice(m ? m.index + m[1].length : 0))
    if (m && (/[:：]/.test(m[0]) || (!s.slice(0, m.index).trim() && !josa))) s = s.slice(0, m.index) + m[1].replace(/\s/g, '') + ': [가림]'
    return s
  })
  // 표에서 항목 이름과 값이 다른 줄로 읽히면 항목 이름만 있는 줄 다음 줄을 값으로 보고 가린다
  lines.forEach((line, i) => {
    if (LABEL_ONLY.test(line) && i + 1 < out.length && !/거\s*동\s*상\s*태/.test(out[i + 1])) out[i + 1] = '[가림]'
  })
  return out
}

// 가린 뒤에도 개인정보로 보이는 글자가 남았는지 검사한다. 남았으면 언어 모델에 보내지 않는다(회신 R36)
const RESIDUAL = [
  [/\d{6}\s*-?\s*\d{7}/, '주민번호 꼴 번호'],
  [/(^|\D)\d{2,4}[\s.-]\d{3,4}[\s.-]\d{4}(?!\d)/, '전화번호 꼴 번호'],
  [/(^|\D)\d{10,11}(?!\d)/, '긴 번호'],
  [/(성\s*명|이\s*름|연\s*락\s*처|주\s*소|생\s*년\s*월\s*일|주\s*민\s*번\s*호)\s*[:：]\s*(?!\[)[^\s[]/, '항목 값'],
  [/@[A-Za-z0-9-]+\.[A-Za-z]{2,}/, '전자우편 주소'],
  [/\d{1,5}\s*번지|\d{1,4}\s*동\s*\d{1,4}\s*호|\d{1,4}\s*호(?=에|의|로|[^가-힣]|$)/, '지번이나 동호수'],
  [/(19|20)\d{2}\s*[.\-/년]\s*\d{1,2}\s*[.\-/월]\s*\d{1,2}|\d{2}\s*년\s*생/, '날짜'],
  [/[가-힣]+(로|길)\s*\d+(\s*-\s*\d+)?/, '도로명 주소']
]
export function residualPII(lines) {
  const hits = []
  for (const line of lines) {
    for (const [re, label] of RESIDUAL) if (re.test(line) && !hits.includes(label)) hits.push(label)
    if (maskNamesFree(line) !== line && !hits.includes('이름 꼴 낱말')) hits.push('이름 꼴 낱말')
  }
  return hits
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
// 재현성: CLOVA Studio Chat Completions v3 의 seed(1~4294967295, 0 또는 미입력은 무작위)로 같은 입력의 결과를 고정한다
// (네이버 클라우드 API 문서 clovastudio-chatcompletionsv3). 기본값은 환경변수 HCX_SEED, 없으면 아래 상수. temperature 와 topP 는 재현성 시험 결과 전까지 그대로 둔다
export const HCX_DEFAULTS = { temperature: 0.1, topP: 0.8, seed: 20261022 }
export const hcxSeed = () => { const v = Number(process.env.HCX_SEED); return Number.isInteger(v) && v >= 0 && v <= 4294967295 ? v : HCX_DEFAULTS.seed }
export function hcxBody(system, user, maxTokens = 1200, opts = {}) {
  const seed = opts.seed === undefined ? hcxSeed() : opts.seed
  return {
    messages: [{ role: 'system', content: system }, { role: 'user', content: user }],
    temperature: opts.temperature ?? HCX_DEFAULTS.temperature, topP: opts.topP ?? HCX_DEFAULTS.topP, maxTokens, repetitionPenalty: 1.0,
    ...(seed == null ? {} : { seed })
  }
}
// 실시간 AI 호출 스위치. 민관협력 플랫폼 사무국 안내(2026. 10. 22.)에 따라 기본은 꺼짐.
// 환경변수 AI_LIVE=1 일 때만 공개 경로(서류 읽기, 현장 소식)가 CLOVA OCR, HyperCLOVA X, CLOVA Speech 를 부른다
export const aiLive = () => process.env.AI_LIVE === '1'
export const STORED_ONLY_MSG = '시연에서는 저장된 판독 결과만 보여 드립니다. 아래 샘플 서류(소식) 읽기를 골라 주세요'
export async function hcxJson(system, user, maxTokens = 1200, opts = {}) {
  const key = env.hcxKey()
  if (!key) throw Object.assign(new Error('문구 분류 서버 미연결'), { code: 'NO_KEY' })
  let r
  try {
    r = await fetch(`https://clovastudio.stream.ntruss.com/v3/chat-completions/${opts.model || HCX_MODEL}`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`, 'X-NCP-CLOVASTUDIO-REQUEST-ID': rid() },
      body: JSON.stringify(hcxBody(system, user, maxTokens, opts)),
      signal: timeoutSignal(TIMEOUT_MS.hcx)
    })
  } catch (e) { throw upstream(e, '문구 분류') }
  const out = await r.json().catch(() => null)
  if (!r.ok || !out || (out?.status?.code && out.status.code !== '20000')) throw Object.assign(new Error(`문구 분류 오류 ${r.status}`), { code: 'UPSTREAM' })
  return parseModelJson(out?.result?.message?.content)
}

// 모델 글 응답에서 JSON 한 덩어리를 꺼낸다(다른 모델 비교 도구도 같은 해석을 쓴다)
function closeBrackets(t) {
  // 빠진 닫는 괄호를 채운다. 닫는 괄호 종류가 어긋나면("}}]}"처럼 항목을 닫기 전에 배열을 닫음) 앞에 빠진 괄호를 넣는다
  // (10. 22. 판정 기준표 v0.1 출력에서 관찰). 글자 내용은 바꾸지 않고 괄호만 넣는다
  const stack = []; let inStr = false, esc = false, out = '', fixed = 0
  const closer = (c) => (c === '{' ? '}' : ']')
  for (const ch of t) {
    if (inStr) { out += ch; if (esc) esc = false; else if (ch === '\\') esc = true; else if (ch === '"') inStr = false; continue }
    if (ch === '"') inStr = true
    else if (ch === '{' || ch === '[') stack.push(ch)
    else if (ch === '}' || ch === ']') {
      const want = ch === '}' ? '{' : '['
      if (!stack.includes(want)) return null
      while (stack[stack.length - 1] !== want) { out += closer(stack.pop()); fixed++ }
      stack.pop()
    }
    out += ch
  }
  if (inStr || stack.length > 3 || (!stack.length && !fixed)) return null
  return out + stack.reverse().map(closer).join('')
}
export function parseModelJson(content) {
  const text = String(content || '').replace(/```(?:json)?/g, '').trim()
  // 모델이 객체 대신 배열만 내는 경우가 있어 둘 다 받는다. 배열이면 { items } 로 감싼다
  const tries = [text]
  const os = text.indexOf('{'), oe = text.lastIndexOf('}'), as = text.indexOf('['), ae = text.lastIndexOf(']')
  if (as >= 0 && ae > as && (os < 0 || as < os)) tries.push(text.slice(as, ae + 1))
  if (os >= 0 && oe > os) tries.push(text.slice(os, oe + 1))
  // 모델이 마지막 닫는 괄호를 빠뜨리는 경우(루브릭 출력에서 관찰)만 짝을 맞춰 한 번 더 시도한다. 내용은 고치지 않는다
  const start = [os, as].filter((x) => x >= 0).sort((a, b) => a - b)[0]
  if (start != null) { const fixed = closeBrackets(text.slice(start)); if (fixed) tries.push(fixed) }
  for (const t of tries) {
    let v
    try { v = JSON.parse(t) } catch { continue }
    // 객체나 배열만 받는다. null, 숫자, 문자열은 형식 오류
    if (Array.isArray(v)) return { items: v }
    if (v && typeof v === 'object') return v
  }
  throw Object.assign(new Error('분류 결과 형식 오류'), { code: 'PARSE' })
}

// CLOVA Speech Recognition. 음성 파일(60초 이내)을 글로
const CSR_MIME = /^audio\/(mpeg|mp3|aac|x-aac|ac3|ogg|flac|x-flac|wav|x-wav|wave)$/
export const csrSupported = (mime) => CSR_MIME.test(mime || '')
export async function clovaStt(base64) {
  const id = env.csrId(); const sec = env.csrSecret()
  if (!id || !sec) throw Object.assign(new Error('음성 받아쓰기 서버 미연결'), { code: 'NO_KEY' })
  let r
  try {
    r = await fetch('https://naveropenapi.apigw.ntruss.com/recog/v1/stt?lang=Kor', {
      method: 'POST',
      headers: { 'Content-Type': 'application/octet-stream', 'X-NCP-APIGW-API-KEY-ID': id, 'X-NCP-APIGW-API-KEY': sec },
      body: Buffer.from(base64, 'base64'),
      signal: timeoutSignal(TIMEOUT_MS.stt)
    })
  } catch (e) { throw upstream(e, '음성 받아쓰기') }
  const out = await r.json().catch(() => null)
  if (!r.ok || !out) throw Object.assign(new Error(`음성 받아쓰기 오류 ${r.status}`), { code: 'UPSTREAM' })
  if (typeof out.text !== 'string') throw Object.assign(new Error('음성 받아쓰기 결과 형식 오류'), { code: 'BAD_UPSTREAM' })
  return out.text
}

export const pick = (v, list, d) => (list.includes(v) ? v : d)
// 특이사항은 글자에 근거 낱말이 있을 때만 남긴다(모델이 근거 없이 붙인 태그를 걷어냄)
const TAG_EVIDENCE = {
  oxygen: /산소/, guardian: /보호자|가족|딸|아들|며느리|배우자|동행/, dementia: /치매|인지/,
  hearing: /청력|난청|보청|귀가\s*어둡|잘\s*못\s*들/, bedridden: /와상|누워|침대|못\s*일어/, medication: /약|복약|투약|투석|인슐린/
}
export const pickTags = (a, evidence) => (Array.isArray(a) ? [...new Set(a.filter((t) => TAGS.includes(t) && (evidence == null || TAG_EVIDENCE[t].test(evidence))))] : [])
export const norm = (s) => String(s || '').replace(/\s+/g, '')

// 요청 검사
export const B64 = /^[A-Za-z0-9+/]+={0,2}$/
export function readJsonBody(req) {
  let body = req.body
  if (typeof body === 'string') { try { body = JSON.parse(body) } catch { return null } }
  return body && typeof body === 'object' && !Array.isArray(body) ? body : null
}
// 실제 개인정보 서류 업로드 금지 확인. 화면에서 '가상 자료만 올립니다'를 고른 요청만 받는다
export const VIRTUAL_ONLY_MSG = '시안에서는 가상 자료만 처리합니다. 실제 개인정보가 담긴 서류나 소식은 올리지 마십시오'
