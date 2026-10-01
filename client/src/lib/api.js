// api.js 백엔드 계약(API_CONTRACT.md) 한 곳. 도메인은 .env 에서만 온다.
// VITE_USE_MOCK=true 면 실제 fetch 대신 mock 라우터로 분기한다. 백엔드가 붙으면 USE_MOCK 만 false 로.
// 3단계에서 쓰기 응답을 계약 형태로 채웠다. mock 은 세션 메모리에 상태를 쌓으므로
// 시민 면 인계 접수 → 관리자 인계 목록 → 완료 처리 → 대시보드 반영 왕복이 실제로 돈다.
const API_URL = import.meta.env.VITE_API_URL || ''
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
// 기관명은 4언어다. 화면은 lib/lang.js pickText 로 현재 언어 값을 고른다.
// VITE_ORG_NAME 은 한국어 기본값 폴백으로만 쓴다(PITFALLS 24. 컴포넌트에 기관명을 박지 않는다)
const ORG_NAME = import.meta.env.VITE_ORG_NAME || ''
const ORG_NAMES = {
  ko: ORG_NAME,
  en: 'Donghae City Facilities Management Corp.',
  ja: '東海市施設管理公団',
  zh: '东海市设施管理公团'
}

function fail(code, message) {
  const err = new Error(message)
  err.error = { code, message }
  return err
}

async function request(method, path, body) {
  if (USE_MOCK) return mockRequest(method, path, body)
  let res
  try {
    res = await fetch(`${API_URL}${path}`, {
      method,
      credentials: 'include',
      headers: body ? { 'Content-Type': 'application/json' } : undefined,
      body: body ? JSON.stringify(body) : undefined
    })
  } catch {
    throw fail('NETWORK', '서버에 연결할 수 없습니다. 잠시 후 다시 시도해 주시기 바랍니다.')
  }
  const data = await res.json().catch(() => null)
  if (!res.ok) {
    const e = data?.error
    throw fail(e?.code || String(res.status), e?.message || '요청을 처리하지 못했습니다.')
  }
  return data
}

export const get = (path) => request('GET', path)
export const post = (path, body) => request('POST', path, body)
export const put = (path, body) => request('PUT', path, body)
export const del = (path) => request('DELETE', path)

// 실행 확인 카드의 허용. 응답은 /api/chat 과 같은 NDJSON 이고 같은 답변 타임라인에 이어 붙는다.
// 쓰기는 이 호출을 거친 뒤에만 일어난다(API_CONTRACT 백엔드 책임).
export async function actionStream(body) {
  if (USE_MOCK) {
    const { mockActionStream } = await import('./mockStream.js')
    // 티켓 생성은 mock 라우터가 한다. 상태를 가진 mocks 인스턴스가 하나여야 관리자 목록에 실제로 쌓인다
    return mockActionStream({ ...body, createTicket: (payload) => mockRequest('POST', '/api/handoff', payload) })
  }
  const res = await fetch(`${API_URL}/api/chat/action`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok || !res.body) throw fail('ACTION_FAILED', '요청을 처리하지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.')
  return res
}

// 스트리밍은 Response 를 그대로 돌려준다. useChat 은 mock 과 실서버를 같은 코드로 읽는다.
export async function chatStream(body) {
  if (USE_MOCK) {
    const { mockChatStream } = await import('./mockStream.js')
    return mockChatStream(body)
  }
  const res = await fetch(`${API_URL}/api/chat`, {
    method: 'POST',
    credentials: 'include',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body)
  })
  if (!res.ok || !res.body) throw fail('CHAT_FAILED', '답변을 불러오지 못했습니다. 잠시 후 다시 시도해 주시기 바랍니다.')
  return res
}

// ---- mock ----
// 한 번 읽어 세션 메모리에 사본을 둔다. 쓰기는 이 사본에 쌓인다.
// 원본 JSON 모듈을 그대로 고치면 다른 import 에 영향이 가므로 복제한다.
let mocks
async function loadMocks() {
  if (!mocks) {
    const [facilities, faqs, notices, logs, kpi, knowledge, users, handoff,
           insights, patterns, reports, forecast] = await Promise.all([
      import('../mock/facilities.json'), import('../mock/faqs.json'), import('../mock/notices.json'),
      import('../mock/logs.json'), import('../mock/kpi.json'), import('../mock/knowledge.json'),
      import('../mock/users.json'), import('../mock/handoff.json'),
      import('../mock/insights.json'), import('../mock/patterns.json'),
      import('../mock/reports.json'), import('../mock/forecast.json')
    ])
    mocks = structuredClone({
      facilities: facilities.default, faqs: faqs.default, notices: notices.default,
      logs: logs.default, kpi: kpi.default, knowledge: knowledge.default,
      users: users.default, handoff: handoff.default,
      insights: insights.default, patterns: patterns.default,
      reports: reports.default, forecast: forecast.default,
      settings: { orgName: { ...ORG_NAMES } },
      reviewed: 0,
      reservations: []          // 채팅에서 만든 예약. 세션 메모리
    })
  }
  return mocks
}

// 개통하면 기관명이 문자열 한 개로 덮인다. 화면 밖(계약 문구)에서는 한국어 값만 쓴다
const orgKo = (d) => (typeof d.settings.orgName === 'string' ? d.settings.orgName : d.settings.orgName?.ko || '')

const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const todayHours = (f) => f.hours[WEEKDAY[new Date().getDay()]]
const range = (d, q) => d.kpi.ranges[q.range || '7d'] || d.kpi.ranges['7d']
const pad = (n, w = 3) => String(n).padStart(w, '0')
const nowIso = () => new Date().toISOString()

// 검토 대기 큐. 세션 중 처리한 만큼 줄어든다
const reviewQueue = (d, q) => ({
  accuracy: Math.max(0, range(d, q).reviewQueue.accuracy - d.reviewed),
  handoff: d.handoff.filter((h) => h.status !== 'done').length,
  knowledge: d.knowledge.pending.length
})

function find(rows, id) {
  const row = rows.find((r) => r.id === id)
  if (!row) throw fail('NOT_FOUND', '요청하신 자료를 찾을 수 없습니다.')
  return row
}

// 공지를 지식베이스 문서로 반영한다. 같은 공지를 다시 저장하면 갱신이다
function indexNotice(d, notice) {
  const docId = `doc-ntc-${notice.id}`
  const existing = d.knowledge.docs.find((x) => x.id === docId)
  const doc = {
    id: docId, title: notice.title, kind: 'notice',
    facilityIds: notice.facilityIds || (notice.facilityId ? [notice.facilityId] : []),
    updatedAt: nowIso().slice(0, 10), indexStatus: 'indexed',
    chunks: Math.max(1, Math.ceil((notice.body || '').length / 120))
  }
  if (existing) Object.assign(existing, doc)
  else d.knowledge.docs.unshift(doc)
  return doc
}

// 청크 미리보기. 본문이 없는 문서는 제목으로 형태만 만든다
function chunksOf(doc) {
  return Array.from({ length: doc.chunks || 0 }, (_, i) => ({
    no: i + 1,
    text: `${doc.title} 본문 ${i + 1}번째 조각입니다. 운영시간과 요금과 이용 규정을 문단 단위로 나눠 임베딩했습니다.`,
    status: doc.indexStatus === 'failed' && i === 0 ? 'failed' : 'indexed'
  }))
}

// 상담 로그 한 건의 근거. 계약대로 kind 는 코드다
const sourcesFor = (d, row) => d.knowledge.docs
  .filter((doc) => doc.facilityIds.includes(row.facilityId))
  .slice(0, 3)
  .map((doc) => ({ id: doc.id, title: doc.title, kind: doc.kind, updatedAt: doc.updatedAt, url: `/docs/${doc.id}`, facilityId: row.facilityId }))

const ROUTES = [
  // ---- 시민 조회 ----
  ['GET', /^\/api\/facilities$/, (d, q) => d.facilities.filter((f) => !q.type || q.type === 'all' || f.type === q.type)],
  ['GET', /^\/api\/facilities\/([^/]+)$/, (d, q, [id]) => find(d.facilities, id)],
  ['GET', /^\/api\/facilities\/([^/]+)\/status$/, (d, q, [id]) => {
    const f = find(d.facilities, id)
    return { status: f.status, todayHours: todayHours(f), reservation: f.reservation, reservationUrl: f.reservationUrl, syncedAt: nowIso() }
  }],
  ['GET', /^\/api\/notices$/, (d) => d.notices],
  ['GET', /^\/api\/notices\/([^/]+)$/, (d, q, [id]) => find(d.notices, id)],
  ['GET', /^\/api\/faq$/, (d, q) => d.faqs.filter((f) => f.visible && (!q.cat || f.category === q.cat))],
  ['GET', /^\/api\/settings\/public$/, (d) => ({
    orgName: d.settings.orgName,
    logoUrl: '',
    headline: { ko: `${orgKo(d)} 공공시설, 무엇이든 물어보세요` },
    // key 가 있으면 화면이 i18n 사전에서 현재 언어 문장을 꺼낸다. label question 은 한국어 폴백이다
    suggestions: [
      { key: 'hours', label: '시설 운영시간', question: '시설 운영시간을 알려 주세요', iconName: 'hours' },
      { key: 'fee', label: '이용 요금 안내', question: '이용 요금을 알려 주세요', iconName: 'fee' },
      { key: 'reserve', label: '공공시설 예약', question: '공공시설 예약은 어떻게 하나요', iconName: 'reserve' },
      { key: 'way', label: '찾아오는 길', question: '찾아오는 길을 알려 주세요', iconName: 'place' }
    ],
    trustLine: `${orgKo(d)} 공식 자료로만 답합니다. 답변마다 출처를 표시합니다`,
    languages: ['ko', 'en', 'ja', 'zh']
  })],

  // ---- 상담 ----
  ['POST', /^\/api\/chat\/feedback$/, () => ({ ok: true })],
  // 시민이 남긴 문의가 관리자 인계 목록에 실제로 쌓인다. 발표 시연의 왕복 지점이다
  ['POST', /^\/api\/handoff$/, (d, q, m, body) => {
    const f = d.facilities.find((x) => x.id === body?.facilityId) || d.facilities[0]
    const seq = d.handoff.length + 1
    const today = new Date()
    const ticketId = `HO-${today.getFullYear()}-${pad(today.getMonth() + 1, 2)}${pad(today.getDate(), 2)}-${pad(seq)}`
    d.handoff.unshift({
      id: ticketId, status: 'wait', content: body?.content || '', facilityId: f.id,
      phone: body?.phone || '', name: body?.name || '', createdAt: nowIso(),
      department: null, handleMinutes: null, logId: body?.messageId || null
    })
    return { ticketId, department: f.department, phone: f.phone, hours: todayHours(f) }
  }],

  // ---- 인증 ----
  ['GET', /^\/api\/auth\/me$/, () => { throw fail('UNAUTHORIZED', '로그인이 필요합니다.') }],
  ['POST', /^\/api\/auth\/login$/, (d, q, m, body) => {
    if (body?.email !== 'admin@gchat.dev' || body?.password !== 'gchat1234') {
      throw fail('INVALID_CREDENTIALS', '이메일 또는 비밀번호가 올바르지 않습니다.')
    }
    return { user: d.users.find((u) => u.email === body.email) }
  }],
  ['POST', /^\/api\/auth\/logout$/, () => ({ ok: true })],

  // ---- 대시보드 ----
  // 검토 대기 수는 세션 중 처리한 만큼 줄어야 한다. 대시보드와 사이드바가 같은 값을 보게 여기서도 계산해 덮는다
  ['GET', /^\/api\/admin\/kpi$/, (d, q) => ({ ...range(d, q), reviewQueue: reviewQueue(d, q) })],
  ['GET', /^\/api\/admin\/trend$/, (d, q) => range(d, q).trend],
  ['GET', /^\/api\/admin\/top-questions$/, (d, q) => range(d, q).topQuestions.slice(0, Number(q.limit || 5))],
  ['GET', /^\/api\/admin\/facility-share$/, (d, q) => range(d, q).facilityShare],
  // 검토 대기 수는 세션 중 처리한 만큼 줄어든다
  ['GET', /^\/api\/admin\/review-queue$/, (d, q) => reviewQueue(d, q)],

  // ---- 상담 로그 ----
  ['GET', /^\/api\/admin\/logs$/, (d, q) => {
    const rows = d.logs.filter((r) =>
      (!q.facilityId || r.facilityId === q.facilityId) &&
      (!q.result || r.result === q.result) &&
      (!q.lang || r.lang === q.lang) &&
      (!q.vote || String(r.vote) === q.vote))
    const page = Number(q.page || 1)
    const size = Number(q.pageSize || 20)
    return { rows: rows.slice((page - 1) * size, page * size), total: rows.length }
  }],
  ['GET', /^\/api\/admin\/logs\/sample$/, (d) => ({ rows: d.logs.filter((r) => !r.review).slice(0, 20), total: 20 })],
  // 계약대로 전체 대화와 근거와 리뷰를 함께 준다
  ['GET', /^\/api\/admin\/logs\/([^/]+)$/, (d, q, [id]) => {
    const row = find(d.logs, id)
    return {
      ...row,
      history: [{ role: 'user', content: row.question }, { role: 'assistant', content: row.answer }],
      sources: sourcesFor(d, row),
      review: row.review ? { verdict: row.review, note: row.reviewNote || '' } : null
    }
  }],
  ['PUT', /^\/api\/admin\/logs\/([^/]+)\/review$/, (d, q, [id], body) => {
    const row = find(d.logs, id)
    if (!row.review) d.reviewed += 1
    row.review = body?.verdict || null
    row.reviewNote = body?.note || ''
    return { ...row, review: { verdict: row.review, note: row.reviewNote } }
  }],
  // 로그 드로어와 시뮬레이터가 함께 쓴다. 시뮬레이터는 로그 id 가 없어 body 로 질문과 답변을 보낸다
  ['POST', /^\/api\/admin\/logs\/([^/]+)\/to-faq$/, (d, q, [id], body) => {
    const row = d.logs.find((l) => l.id === id)
    if (!row && !body?.question) throw fail('NOT_FOUND', '요청하신 자료를 찾을 수 없습니다.')
    const pending = {
      id: `pend-${pad(d.knowledge.pending.length + 100)}`,
      question: body?.question || row.question,
      answer: body?.answer || row.answer,
      sourceDocId: body?.sourceDocId || (row ? sourcesFor(d, row)[0]?.id : null) || null,
      occurrences: 1, createdAt: nowIso()
    }
    d.knowledge.pending.unshift(pending)
    return pending
  }],

  // ---- 인계 ----
  ['GET', /^\/api\/admin\/handoff$/, (d, q) => d.handoff.filter((h) => !q.status || h.status === q.status)],
  // 답변 발송. 발송하면 완료 처리되고 서버가 처리 시간을 기록한다(H3 원천)
  ['POST', /^\/api\/admin\/handoff\/([^/]+)\/reply$/, (d, q, [id], body) => {
    const row = find(d.handoff, id)
    row.status = 'done'
    row.reply = body?.body || ''
    row.repliedAt = nowIso()
    if (row.handleMinutes == null) {
      row.handleMinutes = Math.max(1, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 60000))
    }
    return { ...row, sentTo: { name: row.name, phone: row.phone } }
  }],
  ['PUT', /^\/api\/admin\/handoff\/([^/]+)$/, (d, q, [id], body) => {
    const row = find(d.handoff, id)
    if (body?.department !== undefined) row.department = body.department
    if (body?.status !== undefined) {
      row.status = body.status
      // 완료로 바뀌는 순간 접수부터 지금까지를 처리 시간으로 기록한다. H3 지표의 원천
      if (body.status === 'done' && row.handleMinutes == null) {
        row.handleMinutes = Math.max(1, Math.round((Date.now() - new Date(row.createdAt).getTime()) / 60000))
      }
    }
    return row
  }],

  // ---- 공지 관리 ----
  // 공지를 저장하면 시민 /api/notices 가 그대로 바뀌고 지식베이스에도 notice 문서로 들어간다.
  // 관리자가 올린 공지가 상담 답변의 근거가 되는 경로다
  ['POST', /^\/api\/admin\/notices$/, (d, q, m, body) => {
    const notice = {
      id: `ntc-${pad(d.notices.length + 1)}`,
      title: body?.title || '', body: body?.body || '',
      facilityId: body?.facilityIds?.[0] || null,
      publishedAt: body?.from || nowIso().slice(0, 10),
      from: body?.from || nowIso().slice(0, 10), to: body?.to || '',
      status: body?.status || 'draft', indexStatus: 'indexed',
      facilityIds: body?.facilityIds || [], updatedAt: nowIso().slice(0, 10)
    }
    d.notices.unshift(notice)
    indexNotice(d, notice)
    return notice
  }],
  ['PUT', /^\/api\/admin\/notices\/([^/]+)$/, (d, q, [id], body) => {
    const row = find(d.notices, id)
    Object.assign(row, body, {
      facilityId: body?.facilityIds?.[0] ?? row.facilityId,
      indexStatus: 'indexed', updatedAt: nowIso().slice(0, 10)
    })
    indexNotice(d, row)
    return row
  }],

  // ---- 기관 온보딩 ----
  // 개통하면 기관명이 설정에 들어가고 시민 헤드라인과 신뢰 문구가 그 이름으로 바뀐다
  ['POST', /^\/api\/admin\/onboarding$/, (d, q, m, body) => {
    if (body?.orgName) d.settings.orgName = body.orgName
    if (body?.languages) d.settings.languages = body.languages
    d.settings.activatedAt = nowIso()
    return { ok: true, settings: d.settings, docs: body?.docs || 0, chunks: body?.chunks || 0, facilities: body?.facilities || 0 }
  }],

  // ---- 지식베이스 ----
  ['GET', /^\/api\/admin\/knowledge\/docs$/, (d) => d.knowledge.docs],
  // 청크 목록. 서버가 문단 단위로 잘라 임베딩한 결과다
  ['GET', /^\/api\/admin\/knowledge\/docs\/([^/]+)$/, (d, q, [id]) => {
    const doc = find(d.knowledge.docs, id)
    return { ...doc, chunkList: chunksOf(doc) }
  }],
  // 문서 1건 재색인
  ['POST', /^\/api\/admin\/knowledge\/docs\/([^/]+)\/reindex$/, (d, q, [id]) => {
    const doc = find(d.knowledge.docs, id)
    doc.indexStatus = 'indexed'
    doc.updatedAt = nowIso().slice(0, 10)
    return doc
  }],
  ['POST', /^\/api\/admin\/knowledge\/docs$/, (d, q, m, body) => {
    const doc = {
      id: `doc-${pad(d.knowledge.docs.length + 1)}`,
      title: body?.file || body?.title || '', kind: body?.kind || 'manual',
      facilityIds: body?.facilityIds || [], updatedAt: nowIso().slice(0, 10),
      indexStatus: 'pending', chunks: 0
    }
    d.knowledge.docs.unshift(doc)
    return doc
  }],
  ['GET', /^\/api\/admin\/knowledge\/pending$/, (d) => d.knowledge.pending],
  // 승인하면 FAQ 목록에 실제로 생긴다. 승인 대기에서는 빠진다
  ['PUT', /^\/api\/admin\/knowledge\/pending\/([^/]+)$/, (d, q, [id], body) => {
    const i = d.knowledge.pending.findIndex((p) => p.id === id)
    if (i < 0) throw fail('NOT_FOUND', '요청하신 자료를 찾을 수 없습니다.')
    const [row] = d.knowledge.pending.splice(i, 1)
    if (body?.action === 'reject') return { action: 'reject', id }
    const faq = {
      id: `faq-${pad(d.faqs.length + 1)}`,
      category: body?.category || d.faqs[0]?.category || '',
      question: body?.question || row.question,
      answer: body?.answer || row.answer,
      facilityId: body?.facilityId || null,
      sourceDocId: row.sourceDocId, visible: true, hits30d: 0,
      updatedAt: nowIso().slice(0, 10)
    }
    d.faqs.unshift(faq)
    return { action: body?.action || 'approve', faq }
  }],
  ['GET', /^\/api\/admin\/knowledge\/index-status$/, (d) => d.knowledge.index],
  ['POST', /^\/api\/admin\/knowledge\/reindex$/, (d) => {
    const at = nowIso()
    d.knowledge.index.lastReindexAt = at
    d.knowledge.index.logs.unshift({ at, result: 'success', docs: d.knowledge.docs.length, chunks: 0, durationSec: 0 })
    return d.knowledge.index
  }],

  // ---- FAQ ----
  ['GET', /^\/api\/admin\/faq$/, (d, q) => d.faqs.filter((f) => !q.cat || f.category === q.cat)],
  ['POST', /^\/api\/admin\/faq$/, (d, q, m, body) => {
    const faq = { ...body, id: `faq-${pad(d.faqs.length + 1)}`, hits30d: 0, updatedAt: nowIso().slice(0, 10) }
    d.faqs.unshift(faq)
    return faq
  }],
  ['PUT', /^\/api\/admin\/faq\/([^/]+)$/, (d, q, [id], body) => {
    const row = find(d.faqs, id)
    Object.assign(row, body, { updatedAt: nowIso().slice(0, 10) })
    return row
  }],

  // ---- 시설 ----
  ['GET', /^\/api\/admin\/facilities$/, (d) => d.facilities],
  ['POST', /^\/api\/admin\/facilities$/, (d, q, m, body) => {
    const f = { ...body, id: `fac-${pad(d.facilities.length + 1)}`, updatedAt: nowIso().slice(0, 10) }
    d.facilities.push(f)
    return f
  }],
  ['GET', /^\/api\/admin\/facilities\/([^/]+)$/, (d, q, [id]) => find(d.facilities, id)],
  ['PUT', /^\/api\/admin\/facilities\/([^/]+)$/, (d, q, [id], body) => {
    const row = find(d.facilities, id)
    Object.assign(row, body, { updatedAt: nowIso().slice(0, 10) })
    return row
  }],
  ['POST', /^\/api\/admin\/facilities\/([^/]+)\/reservation-test$/, (d, q, [id]) => {
    const f = find(d.facilities, id)
    return { facilityId: f.id, connected: !!f.reservationUrl, syncedAt: nowIso() }
  }],

  // ---- 예약 현황 ----
  ['GET', /^\/api\/admin\/reservations$/, (d) => d.kpi.reservationSlots],

  // ---- 분석 ----
  ['GET', /^\/api\/admin\/analytics\/([^/]+)$/, (d, q) => {
    const r = range(d, q)
    return { trend: r.trend, breakdown: { byFacility: r.facilityShare, byHour: d.kpi.heatmap }, npsBeforeAfter: d.kpi.npsBeforeAfter, rows: r.topQuestions }
  }],

  // ---- 사용자 ----
  ['GET', /^\/api\/admin\/users$/, (d) => d.users],
  ['POST', /^\/api\/admin\/users\/invite$/, (d, q, m, body) => {
    const user = {
      id: `usr-${pad(d.users.length + 1)}`, name: body?.email?.split('@')[0] || '',
      email: body?.email || '', role: body?.role || 'operator',
      facilities: body?.facilities || [], lastLoginAt: null, status: 'invited'
    }
    d.users.push(user)
    return user
  }],
  ['PUT', /^\/api\/admin\/users\/([^/]+)$/, (d, q, [id], body) => {
    const row = find(d.users, id)
    Object.assign(row, body)
    return row
  }],

  // ---- 5단계 인사이트 ----
  ['GET', /^\/api\/admin\/insights$/, (d) => d.insights],
  ['GET', /^\/api\/admin\/patterns$/, (d) => d.patterns],
  ['GET', /^\/api\/admin\/reports$/, (d) => d.reports],
  ['GET', /^\/api\/admin\/forecast$/, (d) => d.forecast],

  // ---- 세션 만족도. H2 NPS 원천 ----
  ['POST', /^\/api\/chat\/nps$/, (d, q, m, body) => ({ ok: true, score: body?.score ?? null })],

  // ---- 설정 ----
  ['GET', /^\/api\/admin\/settings$/, (d) => d.settings],
  ['PUT', /^\/api\/admin\/settings\/([^/]+)$/, (d, q, [tab], body) => {
    Object.assign(d.settings, body || {}, { tab })
    return d.settings
  }]
]

async function mockRequest(method, path, body) {
  const [pathname, search] = path.split('?')
  const q = Object.fromEntries(new URLSearchParams(search || ''))
  const d = await loadMocks()
  await new Promise((r) => setTimeout(r, 200))
  for (const [m, re, handler] of ROUTES) {
    if (m !== method) continue
    const match = pathname.match(re)
    if (match) return handler(d, q, match.slice(1), body)
  }
  if (method !== 'GET') return { ok: true }
  throw fail('NOT_FOUND', '요청하신 자료를 찾을 수 없습니다.')
}
