// notes.js 현장 소식 판독. 요양보호사, 생활지원사, 보건소 방문건강관리 담당자, 돌봄 수행기관 사회복지사(회신 R40), 이장, 가족, 동 담당자가 전한 글이나 음성에서 대상자의 거동 변화를 찾아 명부 변경 후보를 만든다.
// AI는 소식을 읽고 변경 후보와 근거 문구만 낸다. 필요 인원과 차량은 바뀐 등급을 받아 규칙으로 계산한다.
// 원문 대조: 근거 문구가 전사문에 문자 그대로 없으면 일치도 하로 강제(환각 차단).
// 비대칭 주의: 등급을 낮추는(도움이 덜 필요해지는) 제안은 일치도를 한 단계 내려 반드시 직접 확인하게 한다.
import { GRADE_KEYS, GRADE_RANK } from './shortage.js'

const DOWN = { high: 'mid', mid: 'low', low: 'low' }
const normalize = (s = '') => s.replace(/\s+/g, ' ').trim()
const uniq = (a) => [...new Set(a)]

export const NOTE_SOURCES = [
  { value: 'caregiver', label: '요양보호사' },
  { value: 'dailyCare', label: '생활지원사' },
  { value: 'visitingHealth', label: '보건소 방문건강관리 담당자' },
  { value: 'careAgencySW', label: '돌봄 수행기관 사회복지사' },
  { value: 'leader', label: '이장, 통장' },
  { value: 'family', label: '가족, 보호자' },
  { value: 'dong', label: '동 담당자' }
]
export const sourceLabel = (v) => NOTE_SOURCES.find((s) => s.value === v)?.label || v

// 현재 명부 값과 판독 결과를 견주어 바뀌는 칸을 구한다
export function diffOf(current, r) {
  const gradeChanged = GRADE_KEYS.includes(r.grade) && r.grade !== current.grade
  const removeTags = (r.removeTags || []).filter((t) => (current.tags || []).includes(t))
  const nextTags = uniq([...(current.tags || []).filter((t) => !removeTags.includes(t)), ...(r.tags || [])])
  const addedTags = nextTags.filter((t) => !(current.tags || []).includes(t))
  const next = { grade: gradeChanged ? r.grade : current.grade, tags: nextTags }
  return { gradeChanged, addedTags, removedTags: removeTags, next, changed: gradeChanged || addedTags.length > 0 || removeTags.length > 0 }
}

export function verifyNote(transcript, r, current) {
  const quoteMatched = !!r.quote && normalize(transcript).includes(normalize(r.quote))
  const diff = diffOf(current, r)
  let confidence = r.confidence || 'mid'
  if (!quoteMatched || (!GRADE_KEYS.includes(r.grade) && !diff.addedTags.length && !diff.removedTags.length)) confidence = 'low'
  const lightened = diff.gradeChanged && GRADE_RANK[r.grade] > GRADE_RANK[current.grade]
  if (lightened) confidence = DOWN[confidence]
  const conflict = (diff.next.grade === 'walk' || diff.next.grade === 'assist') && diff.next.tags.includes('bedridden')
  if (conflict) confidence = DOWN[confidence]
  return { ...r, quoteMatched, lightened, conflict, confidence, diff }
}

const toBase64 = (file) => new Promise((resolve, reject) => {
  const fr = new FileReader()
  fr.onload = () => resolve(String(fr.result).split(',')[1])
  fr.onerror = reject
  fr.readAsDataURL(file)
})

// 서버 판독 호출(/api/note). 글이면 text, 음성이면 file. 키가 없으면 503
export async function readNote({ text, file, current, source }) {
  const payload = { source, current: { grade: current.grade, tags: current.tags || [] }, virtualOnly: true }
  if (file) { payload.mimeType = file.type || 'audio/mpeg'; payload.data = await toBase64(file) } else payload.text = text
  const res = await fetch('/api/note', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(payload) })
  const body = await res.json().catch(() => null)
  if (!res.ok) {
    const err = new Error(body?.error?.message || '판독 서버 오류')
    err.code = body?.error?.code || res.status
    throw err
  }
  if (!body || typeof body.changed !== 'boolean' || typeof body.transcript !== 'string') {
    throw Object.assign(new Error('판독 결과 형식 오류'), { code: 'BAD_RESPONSE' })
  }
  // 글 소식은 담당자가 입력한 원문 자체를 대조 기준으로 쓴다. AI가 돌려준 전사문은 음성일 때만 쓴다
  return verifyNote(file ? (body.transcript || '') : (text || ''), body, current)
}

// 시연용 샘플 소식. AI 호출 없이 미리 써 둔 판독 결과(모의 응답)를 쓴다. 화면에도 모의 응답임을 표시한다.
export const SAMPLE_NOTES = [
  {
    id: 'worse', label: '넘어진 뒤 휠체어 사용(글)', mode: 'text', source: 'caregiver',
    text: '지난주 화장실에서 넘어지신 뒤로는 혼자 서지 못하세요. 이제 휠체어를 타고 이동하시고, 옮길 때는 두 사람이 잡아 드려야 합니다.',
    read: { changed: true, grade: 'wheelchair', tags: [], removeTags: [], quote: '이제 휠체어를 타고 이동하시고', summary: '낙상 뒤 휠체어로 이동함', confidence: 'high' }
  },
  {
    id: 'better', label: '재활 뒤 혼자 걷고 산소 중단(글)', mode: 'text', source: 'family',
    text: '재활 치료를 받고 요즘은 지팡이를 짚고 혼자 걸으세요. 산소 장비는 지난달부터 쓰지 않으세요.',
    read: { changed: true, grade: 'walk', tags: [], removeTags: ['oxygen'], quote: '지팡이를 짚고 혼자 걸으세요', summary: '혼자 걷게 되었고 산소 장비를 쓰지 않음', confidence: 'high' }
  },
  {
    id: 'voice', label: '낮에 보호자 부재(음성 메모)', mode: 'voice', source: 'caregiver', fileName: '요양보호사_방문메모_샘플.m4a',
    text: '오늘 방문했는데 어머님은 계속 침대에 누워만 계세요. 따님이 직장 때문에 낮에는 집에 안 계셔서, 낮에 급한 일이 생기면 연락이 안 될 수 있어요.',
    read: { changed: true, grade: 'bed', tags: ['bedridden'], removeTags: [], quote: '계속 침대에 누워만 계세요', summary: '침대에 누워 지내며 낮에는 보호자 연락이 어려움', confidence: 'mid' }
  },
  {
    id: 'same', label: '변화 없음(글)', mode: 'text', source: 'leader',
    text: '이번 달에도 특별히 달라지신 건 없어요. 식사도 잘 하시고 지난번과 똑같습니다.',
    read: { changed: false, grade: 'unknown', tags: [], removeTags: [], quote: '', summary: '', confidence: 'high' }
  },
  {
    id: 'hallu', label: '근거 없는 읽기 점검(글)', mode: 'text', source: 'dong',
    text: '요즘 날씨가 추워서 경로당에 자주 못 나오세요. 약은 잘 챙겨 드시는 것 같습니다.',
    // 소식에 없는 문구를 근거로 낸 결과. 원문 대조에서 확인 필요로 떨어지는 사례
    read: { changed: true, grade: 'wheelchair', tags: [], removeTags: [], quote: '휠체어로 이동하신다', summary: '휠체어를 쓰게 됨', confidence: 'high' }
  }
]

// 처음 화면에서 확인 대기로 보이는 소식 3건. 현재 명부의 대상자 가운데 알맞은 등급을 골라 연결한다.
export function seedFieldNotes(persons, today) {
  const DAY = 86400000
  const pick = (grade, skip = []) => persons.find((p) => p.review === 'confirmed' && p.grade === grade && !skip.includes(p.code))
  const a = pick('assist')
  const b = pick('wheelchair')
  const c = pick('walk')
  const make = (id, p, sample, ago, mock = true) => {
    if (!p) return null
    const s = SAMPLE_NOTES.find((x) => x.id === sample)
    const current = { grade: p.grade, tags: [...(p.tags || [])] }
    const read = verifyNote(s.text, s.read, current)
    return {
      id, personCode: p.code, villageCode: p.villageCode, source: s.source, mode: s.mode, fileName: s.fileName || '',
      text: s.text, read, current, status: 'pending', mock, receivedAt: today - ago * DAY
    }
  }
  return [make('NOTE-0001', a, 'worse', 1), make('NOTE-0002', b, 'better', 2), make('NOTE-0003', c, 'hallu', 3)].filter(Boolean)
}
