// intake.js 서류 자동 판독. API_CONTRACT 4.1.
// 원문 대조: 판정 근거 문구가 전사문에 문자 그대로 없으면 일치도 하로 강제(환각 차단).
// 규칙 대조: 등급과 특이사항이 모순이면 일치도 한 단계 하향.
import { GRADE_KEYS } from './shortage.js'

const DOWN = { high: 'mid', mid: 'low', low: 'low' }
const normalize = (s = '') => s.replace(/\s+/g, ' ').trim()

export function verifyResult(transcript, r) {
  const quoteMatched = !!r.quote && normalize(transcript).includes(normalize(r.quote))
  let confidence = GRADE_KEYS.includes(r.grade) ? r.confidence || 'mid' : 'low'
  if (!quoteMatched) confidence = 'low'
  const conflict = (r.grade === 'walk' || r.grade === 'assist') && (r.tags || []).includes('bedridden')
  if (conflict) confidence = DOWN[confidence]
  return { ...r, quoteMatched, conflict, confidence }
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
  pressureSore: '욕창 확인 필요'
}

export const CONF_LABEL = { high: '일치도 높음', mid: '일치도 보통', low: '확인 필요' }
