// intake.js AI 서류 판독. API_CONTRACT 4.1.
// 원문 대조: 판정 근거 문구가 전사문에 문자 그대로 없으면 신뢰도 하로 강제(환각 차단).
// 규칙 대조: 등급과 특이사항이 모순이면 신뢰도 한 단계 하향.
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
    body: JSON.stringify({ mimeType: file.type || 'image/png', data })
  })
  const body = await res.json().catch(() => ({}))
  if (!res.ok) {
    const err = new Error(body?.error?.message || '판독 서버 오류')
    err.code = body?.error?.code || res.status
    throw err
  }
  return verifyPage(body)
}

export const TAGS = {
  oxygen: '산소 장비',
  guardian: '보호자 동행',
  dementia: '인지 저하',
  hearing: '청력 저하',
  bedridden: '와상',
  medication: '상시 복약'
}

export const CONF_LABEL = { high: '확실', mid: '보통', low: '확인 필요' }
