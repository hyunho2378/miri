// intake.js 서류 자동 판독. API_CONTRACT 4.1.
// 원문 대조: 판정 근거 문구가 전사문에 문자 그대로 없으면 일치도 하로 강제(환각 차단).
// 규칙 대조: 등급과 특이사항이 모순이면 일치도 한 단계 하향.
import { GRADE_KEYS } from './shortage.js'

const DOWN = { high: 'mid', mid: 'low', low: 'low' }
const normalize = (s = '') => s.replace(/\s+/g, ' ').trim()

export function verifyResult(transcript, r0) {
  const r = r0.aiGrade ? { ...r0, grade: r0.aiGrade } : r0
  const quoteMatched = !!r.quote && normalize(transcript).includes(normalize(r.quote))
  let confidence = GRADE_KEYS.includes(r.grade) ? r.confidence || 'mid' : 'low'
  if (!quoteMatched) confidence = 'low'
  const conflict = (r.grade === 'walk' || r.grade === 'assist') && (r.tags || []).includes('bedridden')
  if (conflict) confidence = DOWN[confidence]
  const planned = planningGrade({ ...r, confidence })
  return { ...r, quoteMatched, conflict, confidence, aiGrade: r.grade, grade: planned.grade, gradeUncertain: planned.uncertain }
}

// 등급 미확정 규칙(회신 R36): 낮게 판정하면 차가 가도 태우지 못하므로 위험 쪽 오류를 막는다.
// 판독 불가(unknown), 근거 약함(low)인 도보와 부축 판정은 배정 계산에서 휠체어 등급으로 잡고 '등급 확인 필요'를 단다.
// 담당자가 확인하거나 고치면 그 값으로 바뀐다. 휠체어와 침상 판정은 이미 높은 쪽이라 그대로 둔다.
export const UNCERTAIN_PLAN_GRADE = 'wheelchair'
// 도보 판정이라도 보조 단서(지팡이, 보행기, 천천히, 부축 등)가 근거나 문맥에 있으면 확인 필요 후보로 둔다(회신 R36 홀드아웃)
export const ASSIST_CUE = /지팡이|보행\s*기|보행\s*보조|실버\s*카|천천히|부축|느리게|느림|휘청|넘어|낙상|불안정|손잡이|짚고|짚으|붙잡|기대어|의지/
export function planningGrade(r) {
  if (!GRADE_KEYS.includes(r.grade)) return { grade: UNCERTAIN_PLAN_GRADE, uncertain: true }
  if (r.grade === 'walk' && ASSIST_CUE.test(`${r.quote || ''} ${r.context || ''}`)) return { grade: UNCERTAIN_PLAN_GRADE, uncertain: true }
  if (r.confidence === 'low' && (r.grade === 'walk' || r.grade === 'assist')) return { grade: UNCERTAIN_PLAN_GRADE, uncertain: true }
  return { grade: r.grade, uncertain: false }
}

export function verifyPage(page) {
  return { ...page, persons: (page.persons || []).map((r) => verifyResult(page.transcript || '', r)) }
}

// 서버 판독 호출(Vercel 함수 /api/intake). 키가 없으면 503
export async function readDocument(file) {
  const data = await new Promise((resolve, reject) => {
    const fr = new FileReader()
    fr.onload = () => resolve(String(fr.result).split(',')[1])
    fr.onerror = reject
    fr.readAsDataURL(file)
  })
  const res = await fetch('/api/intake', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    // 가상 자료 확인은 화면에서 '가상 자료만 올립니다'를 고른 뒤에만 보낸다(GPT 재검토 R4)
    body: JSON.stringify({ mimeType: file.type || 'image/png', data, virtualOnly: true })
  })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(body?.error?.message || '판독 서버 오류')
    err.code = body?.error?.code || res.status
    throw err
  }
  // 성공 응답이어도 형식이 틀리면 빈 결과로 넘기지 않는다(GPT 재검토 R9)
  if (!body || typeof body.transcript !== 'string' || !Array.isArray(body.persons)) {
    throw Object.assign(new Error('판독 결과 형식 오류'), { code: 'BAD_RESPONSE' })
  }
  // 대상자가 한 명도 없으면 빈 성공으로 보이지 않게 확인 요청으로 바꾼다(GPT 3차 확인 R9)
  if (!body.transcript.trim() || !body.persons.length) {
    throw Object.assign(new Error('읽은 내용 없음. 담당자가 서류를 직접 확인해 주십시오'), { code: 'EMPTY_RESULT' })
  }
  return verifyPage(body)
}

export const TAGS = {
  oxygen: '산소 장비',
  guardian: '보호자 동행',
  dementia: '인지 저하',
  hearing: '청력 저하',
  bedridden: '와상',
  medication: '상시 복약',
  pet: '반려동물 동반',
  wheelPower: '전동 휠체어',
  wheelManual: '수동 휠체어',
  pressureSore: '욕창 확인 필요',
  gradeUncertain: '등급 확인 필요'
}

export const CONF_LABEL = { high: '일치도 높음', mid: '일치도 보통', low: '확인 필요' }
