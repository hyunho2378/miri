// mockStream.js VITE_USE_MOCK=true 일 때 /api/chat 과 /api/chat/action 을 흉내낸다.
// API_CONTRACT.md 의 NDJSON 을 그대로 지킨다. 5단계에서 도구 이벤트가 들어왔다.
// useChat 은 이 함수가 돌려주는 ReadableStream 을 실제 fetch 응답 body 와 똑같이 읽는다.
//
// 결과값은 지어내지 않는다. 전부 facilities/faqs/knowledge 데이터에서 파생한다.
import facilities from '../mock/facilities.json'
import faqs from '../mock/faqs.json'
import knowledge from '../mock/knowledge.json'

const DOC = Object.fromEntries(knowledge.docs.map((d) => [d.id, d]))
const WEEKDAY = ['sun', 'mon', 'tue', 'wed', 'thu', 'fri', 'sat']
const won = (n) => `${n.toLocaleString('ko-KR')}원`

// ---- 언어 감지 ----
// 가나가 있으면 일본어, 한자만 있으면 중국어, 한글이 있으면 한국어, 나머지는 영어.
// 일본어와 중국어가 한자를 공유하므로 가나를 먼저 본다
function detectLang(text) {
  if (/[぀-ヿ]/.test(text)) return 'ja'
  if (/[가-힯]/.test(text)) return 'ko'
  if (/[一-鿿]/.test(text)) return 'zh'
  if (/[A-Za-z]/.test(text)) return 'en'
  return 'ko'
}

const LANG_NAME = { ko: '한국어', en: 'English', ja: '日本語', zh: '中文' }

// ---- 의도 분류 ----
const INTENT = [
  ['reservation', /예약|자리|남았|코트|캠핑|빈\s*시간|reserv|book|court|予約|空き|预约|订场/i],
  ['fee', /요금|얼마|가격|비용|입장료|fee|price|cost|料金|いくら|费用|价格|多少钱/i],
  ['location', /어디|가는\s*길|찾아|위치|주차|오시는|where|location|parking|directions|get\s*there|場所|駐車|アクセス|行き方|在哪|位置|停车|怎么去|交通|路线/i],
  ['hours', /운영\s*시간|몇\s*시|영업|이용\s*안내|언제|open|hour|close|営業|時間|何時|开放|时间|几点/i]
]

function classify(message) {
  for (const [key, re] of INTENT) if (re.test(message)) return key
  return 'unknown'
}

// ---- 인원 파싱. "성인 2 청소년 1" ----
const PEOPLE = [
  ['adult', /성인\s*(\d+)|어른\s*(\d+)|adults?\s*(\d+)|大人\s*(\d+)|成人\s*(\d+)/i],
  ['youth', /청소년\s*(\d+)|학생\s*(\d+)|youths?\s*(\d+)|students?\s*(\d+)|青少年\s*(\d+)/i],
  ['child', /어린이\s*(\d+)|아동\s*(\d+)|child(?:ren)?\s*(\d+)|子供\s*(\d+)|儿童\s*(\d+)/i]
]

function parsePeople(message) {
  const out = []
  for (const [key, re] of PEOPLE) {
    const m = re.exec(message)
    if (!m) continue
    const n = Number(m.slice(1).find(Boolean))
    if (n > 0) out.push({ key, count: n })
  }
  return out
}

// 외국어 질문에는 한국어 시설명이 없다. 유형 낱말로 찾는다. 없으면 null 이고 호출부가 기본값을 정한다
const ALIAS = [
  ['fac-008', /tennis|テニス|网球|테니스/i],
  ['fac-001', /sports|swim|pool|gym|スポーツ|プール|体育|游泳|체육/i],
  ['fac-002', /camp|キャンプ|露营|캠핑/i],
  ['fac-006', /parking|駐車|停车|주차/i],
  ['fac-005', /culture|art|文化|芸術|문화/i],
  ['fac-003', /cave|洞窟|洞|동굴/i]
]

function pickFacility(message, facilityId) {
  if (facilityId) return facilities.find((f) => f.id === facilityId) || null
  // 한국어는 앞 세 글자로, 다른 언어는 전체 이름으로 맞춘다. 외국어 이름은 짧게 자르면 서로 겹친다
  const byName = facilities.find((f) => message.includes(f.name.slice(0, 3))
    || [f.name_ja, f.name_zh].some((n) => n && message.includes(n))
    || (f.name_en && message.toLowerCase().includes(f.name_en.toLowerCase())))
  if (byName) return byName
  const hit = ALIAS.find(([, re]) => re.test(message))
  return hit ? facilities.find((f) => f.id === hit[0]) : null
}

// ---- 다음 토요일. 예약 시연은 항상 가까운 주말이다 ----
function nextSaturday() {
  const d = new Date()
  d.setDate(d.getDate() + ((6 - d.getDay() + 7) % 7 || 7))
  return d
}
const mmdd = (d) => `${String(d.getMonth() + 1).padStart(2, '0')}.${String(d.getDate()).padStart(2, '0')}`
const iso = (d) => `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}-${String(d.getDate()).padStart(2, '0')}`

// ---- 시간대. 시설의 예약 상태에서 파생한다 ----
function slotsFor(fac) {
  const night = fac.fees.find((f) => /야간/.test(f.item)) || fac.fees[fac.fees.length - 1]
  const day = fac.fees.find((f) => /주간/.test(f.item)) || fac.fees[0]
  const light = fac.fees.find((f) => /조명/.test(f.item))
  const base = [
    { time: '18:00', court: 'A', fee: night.price + (light?.price || 0) },
    { time: '19:00', court: 'B', fee: night.price + (light?.price || 0) },
    { time: '20:00', court: 'A', fee: day.price }
  ]
  const taken = fac.reservation === 'full' ? 3 : fac.reservation === 'limited' ? 1 : 0
  return base.map((s, i) => ({ ...s, status: i >= base.length - taken ? 'full' : 'open' }))
}

// ---- 답변 문장. 질문 언어로 만든다 ----
const TEXT = {
  ko: {
    reservation: (f, s, d) => `${f.name}의 ${mmdd(d)} 저녁 예약 가능 시간대를 확인했습니다. ${s.filter((x) => x.status === 'open').length}개 시간대가 남아 있습니다.\n\n가장 이른 시간은 ${s[0].time} 코트${s[0].court}이며 이용료는 ${won(s[0].fee)}입니다. ${f.guide}\n\n아래에서 예약 내용을 확인하신 뒤 예약하기를 눌러 주시기 바랍니다.`,
    hours: (f) => `${f.name}의 운영시간은 다음과 같습니다.\n\n- 평일 ${f.hours.mon}\n- 토요일 ${f.hours.sat}\n- 일요일 ${f.hours.sun}\n\n${f.guide} 문의는 ${f.department} ${f.phone}으로 연락해 주시기 바랍니다.`,
    fee: (f, items, total) => `${f.name}의 이용 요금을 계산했습니다.\n\n${items.map((i) => `- ${i.label} ${i.count}명 ${won(i.amount)}`).join('\n')}\n\n합계는 ${won(total)}입니다. 요금은 현장 결제 기준이며 감면 대상은 증빙을 지참해 주시기 바랍니다.`,
    location: (f) => `${f.name}은 ${f.address}에 있습니다.\n\n대중교통은 시내버스 이용이 가능하며 주차장은 시설 부지 안에 있습니다. 아래 지도 앱 링크로 길찾기를 시작하실 수 있습니다.\n\n현장 문의는 ${f.phone}입니다.`,
    unknown: () => '해당 내용은 공식 자료에서 확인되지 않았습니다. 담당자에게 연결해 드리겠습니다.\n\n아래에서 부서 연락처를 확인하시거나 문의를 남겨 주시기 바랍니다. 접수하시면 담당자가 확인 후 연락드립니다.',
    approved: (r, f) => `예약이 확정되었습니다. 예약번호는 ${r.code}입니다.\n\n${f.name} ${r.date} ${r.time} 코트${r.court}이며 결제 금액은 ${won(r.total)}입니다. 취소는 ${r.cancelBy}까지 가능합니다.`,
    ticket: (t) => `문의를 접수했습니다. 접수번호는 ${t.ticketId}입니다.\n\n${t.department}에서 확인 후 연락드립니다. 운영시간은 ${t.hours}입니다.`
  },
  en: {
    reservation: (f, s, d) => `I checked the evening availability at ${f.name} on ${mmdd(d)}. ${s.filter((x) => x.status === 'open').length} time slots are open.\n\nThe earliest is ${s[0].time} on court ${s[0].court} at ${s[0].fee.toLocaleString('en-US')} KRW. Booking is limited to two hours per person per day.\n\nPlease review the details below and select the booking button to continue.`,
    hours: (f) => `The opening hours of ${f.name} are as follows.\n\n- Weekdays ${f.hours.mon}\n- Saturday ${f.hours.sat}\n- Sunday ${f.hours.sun}\n\nFor further questions please contact ${f.department} at ${f.phone}.`,
    fee: (f, items, total) => `I calculated the admission for ${f.name}.\n\n${items.map((i) => `- ${i.label} x ${i.count}: ${i.amount.toLocaleString('en-US')} KRW`).join('\n')}\n\nThe total is ${total.toLocaleString('en-US')} KRW. Payment is made on site and discount holders should bring proof of eligibility.`,
    location: (f) => `${f.name} is located at ${f.address}.\n\nCity buses stop nearby and parking is available inside the grounds. You can start navigation with the map links below.\n\nFor on site questions please call ${f.phone}.`,
    unknown: () => 'This could not be confirmed in the official records. I will connect you with the responsible department.\n\nPlease check the contact below or leave an inquiry. A staff member will review it and contact you.',
    approved: (r, f) => `Your booking is confirmed. The booking number is ${r.code}.\n\nIt is ${f.name} on ${r.date} at ${r.time}, court ${r.court}, for ${r.total.toLocaleString('en-US')} KRW. Cancellation is possible until ${r.cancelBy}.`,
    ticket: (t) => `Your inquiry has been received. The ticket number is ${t.ticketId}.\n\n${t.department} will review it and contact you. Office hours are ${t.hours}.`
  },
  ja: {
    reservation: (f, s, d) => `${f.name} の ${mmdd(d)} 夕方の予約状況を確認しました。${s.filter((x) => x.status === 'open').length} 件の時間帯が空いています。\n\n最も早い時間は ${s[0].time} コート${s[0].court} で、利用料は ${s[0].fee.toLocaleString('ja-JP')} ウォンです。予約は 1 人 1 日 2 時間までです。\n\n以下の内容をご確認のうえ、予約ボタンを押してください。`,
    hours: (f) => `${f.name} の営業時間は次のとおりです。\n\n- 平日 ${f.hours.mon}\n- 土曜日 ${f.hours.sat}\n- 日曜日 ${f.hours.sun}\n\nお問い合わせは ${f.department} ${f.phone} までご連絡ください。`,
    fee: (f, items, total) => `${f.name} の利用料金を計算しました。\n\n${items.map((i) => `- ${i.label} ${i.count} 名 ${i.amount.toLocaleString('ja-JP')} ウォン`).join('\n')}\n\n合計は ${total.toLocaleString('ja-JP')} ウォンです。料金は現地払いで、減免対象の方は証明書をご持参ください。`,
    location: (f) => `${f.name} は ${f.address} にあります。\n\n市内バスでお越しいただけます。駐車場は敷地内にあります。以下の地図アプリのリンクから経路を確認できます。\n\n現地へのお問い合わせは ${f.phone} です。`,
    unknown: () => '該当する内容は公式資料で確認できませんでした。担当者におつなぎいたします。\n\n以下の連絡先をご確認いただくか、お問い合わせをお残しください。担当者が確認のうえご連絡いたします。',
    approved: (r, f) => `予約が確定しました。予約番号は ${r.code} です。\n\n${f.name} ${r.date} ${r.time} コート${r.court}、お支払い金額は ${r.total.toLocaleString('ja-JP')} ウォンです。キャンセルは ${r.cancelBy} まで可能です。`,
    ticket: (t) => `お問い合わせを受け付けました。受付番号は ${t.ticketId} です。\n\n${t.department} が確認のうえご連絡いたします。営業時間は ${t.hours} です。`
  },
  zh: {
    reservation: (f, s, d) => `已确认 ${f.name} 在 ${mmdd(d)} 傍晚的预约情况，共有 ${s.filter((x) => x.status === 'open').length} 个时段可用。\n\n最早的时段是 ${s[0].time} ${s[0].court} 号场地，费用为 ${s[0].fee.toLocaleString('zh-CN')} 韩元。每人每天最多可预约 2 小时。\n\n请确认以下内容后点击预约按钮。`,
    hours: (f) => `${f.name} 的开放时间如下。\n\n- 平日 ${f.hours.mon}\n- 周六 ${f.hours.sat}\n- 周日 ${f.hours.sun}\n\n如需咨询请联系 ${f.department} ${f.phone}。`,
    fee: (f, items, total) => `已计算 ${f.name} 的使用费用。\n\n${items.map((i) => `- ${i.label} ${i.count} 人 ${i.amount.toLocaleString('zh-CN')} 韩元`).join('\n')}\n\n合计为 ${total.toLocaleString('zh-CN')} 韩元。费用现场支付，减免对象请携带证明。`,
    location: (f) => `${f.name} 位于 ${f.address}。\n\n可乘坐市内公交前往，园区内设有停车场。可通过下方地图应用链接开始导航。\n\n现场咨询电话为 ${f.phone}。`,
    unknown: () => '该内容未能在官方资料中确认。将为您转接负责人。\n\n请查看下方联系方式或留下咨询。工作人员确认后会与您联系。',
    approved: (r, f) => `预约已确认，预约编号为 ${r.code}。\n\n${f.name} ${r.date} ${r.time} ${r.court} 号场地，支付金额为 ${r.total.toLocaleString('zh-CN')} 韩元。可在 ${r.cancelBy} 前取消。`,
    ticket: (t) => `已受理您的咨询，受理编号为 ${t.ticketId}。\n\n${t.department} 确认后会与您联系。办公时间为 ${t.hours}。`
  }
}

// 도구 라벨과 후속 질문. UI 문자열이 아니라 서버가 보내는 값이라 여기 둔다
const LABEL = {
  ko: { knowledge: '지식 검색', reservation: '예약 시스템 조회', reservationWrite: '예약 생성', location: '위치 안내', fee: '요금 계산', handoff: '담당자 연결', handoffWrite: '문의 접수', translate: '언어 감지' },
  en: { knowledge: 'Knowledge search', reservation: 'Reservation lookup', reservationWrite: 'Create booking', location: 'Location lookup', fee: 'Fee calculation', handoff: 'Staff lookup', handoffWrite: 'Create ticket', translate: 'Language detection' },
  ja: { knowledge: 'ナレッジ検索', reservation: '予約システム照会', reservationWrite: '予約作成', location: '位置案内', fee: '料金計算', handoff: '担当者照会', handoffWrite: '問い合わせ受付', translate: '言語検出' },
  zh: { knowledge: '知识检索', reservation: '预约系统查询', reservationWrite: '创建预约', location: '位置查询', fee: '费用计算', handoff: '负责人查询', handoffWrite: '受理咨询', translate: '语言检测' }
}

const SUMMARY = {
  ko: { slots: (n) => `${n}개 시간대 확인`, hits: (n) => `근거 ${n}건`, none: '일치하는 자료 없음', fee: (t) => `합계 ${won(t)}`, place: (a) => a, dept: (d) => d, lang: (l) => `${LANG_NAME[l]} 감지`, booked: '예약 완료', ticket: '접수 완료' },
  en: { slots: (n) => `${n} slots found`, hits: (n) => `${n} sources`, none: 'No matching records', fee: (t) => `Total ${t.toLocaleString('en-US')} KRW`, place: (a) => a, dept: (d) => d, lang: (l) => `${LANG_NAME[l]} detected`, booked: 'Booking created', ticket: 'Ticket created' },
  ja: { slots: (n) => `${n} 件の時間帯`, hits: (n) => `根拠 ${n} 件`, none: '該当資料なし', fee: (t) => `合計 ${t.toLocaleString('ja-JP')} ウォン`, place: (a) => a, dept: (d) => d, lang: (l) => `${LANG_NAME[l]} を検出`, booked: '予約完了', ticket: '受付完了' },
  zh: { slots: (n) => `找到 ${n} 个时段`, hits: (n) => `依据 ${n} 条`, none: '未找到相关资料', fee: (t) => `合计 ${t.toLocaleString('zh-CN')} 韩元`, place: (a) => a, dept: (d) => d, lang: (l) => `检测到${LANG_NAME[l]}`, booked: '预约完成', ticket: '受理完成' }
}

const FOLLOWUPS = {
  ko: { reservation: ['주차는 어떻게 하나요', '취소는 언제까지 되나요', '조명 요금은 왜 붙나요'], hours: ['휴관일은 언제인가요', '이용 요금은 얼마인가요', '주차장이 있나요'], fee: ['감면 대상이 있나요', '현장 결제만 되나요', '단체 할인이 있나요'], location: ['주차 요금은 얼마인가요', '대중교통으로 얼마나 걸리나요', '오늘 운영하나요'], unknown: ['담당 부서 전화번호를 알려주세요', '비슷한 다른 시설이 있나요', '운영시간은 어떻게 되나요'] },
  en: { reservation: ['How does parking work', 'Until when can I cancel', 'Why is there a lighting fee'], hours: ['When are the closing days', 'How much is admission', 'Is there parking'], fee: ['Are there any discounts', 'Is it on site payment only', 'Is there a group rate'], location: ['How much is parking', 'How long by public transport', 'Is it open today'], unknown: ['What is the department phone number', 'Are there similar facilities', 'What are the opening hours'] },
  ja: { reservation: ['駐車はどうすればよいですか', 'キャンセルはいつまで可能ですか', '照明料金はなぜかかりますか'], hours: ['休館日はいつですか', '利用料金はいくらですか', '駐車場はありますか'], fee: ['減免対象はありますか', '現地払いのみですか', '団体割引はありますか'], location: ['駐車料金はいくらですか', '公共交通でどのくらいかかりますか', '本日は営業していますか'], unknown: ['担当部署の電話番号を教えてください', '似た施設はありますか', '営業時間はどうなりますか'] },
  zh: { reservation: ['停车怎么办', '可以在什么时候之前取消', '为什么有照明费'], hours: ['休息日是什么时候', '使用费用是多少', '有停车场吗'], fee: ['有减免对象吗', '只能现场支付吗', '有团体优惠吗'], location: ['停车费是多少', '乘坐公共交通需要多久', '今天开放吗'], unknown: ['请告诉我负责部门的电话', '有类似的设施吗', '开放时间是什么时候'] }
}

// ---- 근거 ----
function knowledgeHits(fac, message) {
  const faq = faqs.find((q) => (!fac || q.facilityId === fac.id) && q.question.split(' ').some((w) => w.length > 1 && message.includes(w)))
  const docs = fac ? knowledge.docs.filter((d) => d.facilityIds.includes(fac.id)) : []
  const out = docs.slice(0, 2).map((d) => ({ id: d.id, title: d.title, kind: d.kind, updatedAt: d.updatedAt, url: `/docs/${d.id}`, facilityId: fac?.id }))
  if (faq) out.push({ id: faq.id, title: faq.question, kind: 'faq', updatedAt: faq.updatedAt, url: `/faq?cat=${faq.category}`, facilityId: fac?.id })
  return out
}

// ---- 요금 계산 ----
const PEOPLE_LABEL = {
  ko: { adult: '성인', youth: '청소년', child: '어린이' },
  en: { adult: 'Adult', youth: 'Youth', child: 'Child' },
  ja: { adult: '大人', youth: '青少年', child: '子供' },
  zh: { adult: '成人', youth: '青少年', child: '儿童' }
}

function feeItems(fac, people, lang) {
  const base = fac.fees[0]?.price || 0
  const rate = { adult: 1, youth: 0.7, child: 0.5 }
  const list = (people.length ? people : [{ key: 'adult', count: 1 }]).map((p) => ({
    label: PEOPLE_LABEL[lang][p.key],
    count: p.count,
    unit: Math.round((base * rate[p.key]) / 100) * 100,
    amount: Math.round((base * rate[p.key]) / 100) * 100 * p.count
  }))
  return { items: list, total: list.reduce((a, b) => a + b.amount, 0) }
}

// 토큰 단위로 나눠 흘린다. 한글 조합 깨짐 없이 공백 기준 + 짧은 청크
function tokenize(text) {
  const out = []
  for (const word of text.split(/(\s+)/)) {
    if (!word) continue
    if (word.length <= 4) { out.push(word); continue }
    for (let i = 0; i < word.length; i += 3) out.push(word.slice(i, i + 3))
  }
  return out
}

// 허용 대기 중인 action. 허용 요청이 오면 여기서 찾는다. 세션 메모리다
const PENDING = new Map()

// ---- 시나리오 조립 ----
function buildScenario(message, facilityId) {
  const lang = detectLang(message)
  const t = TEXT[lang]
  const L = LABEL[lang]
  const S = SUMMARY[lang]
  const picked = pickFacility(message, facilityId) || facilities.find((f) => f.id === 'fac-008')
  // 답변 안 시설명도 질문 언어로 낸다. 번역이 없으면 한국어 이름으로 떨어진다
  const fac = lang === 'ko' ? picked : { ...picked, name: picked[`name_${lang}`] || picked.name }
  const intent = classify(message)
  const steps = []
  const push = (wait, evt) => steps.push({ wait, evt })
  const id = Math.random().toString(36).slice(2, 8)

  // 질문 언어가 한국어가 아니면 언어 감지 카드가 먼저 뜬다
  if (lang !== 'ko') {
    push(260, { type: 'tool', id: 'tr', tool: 'translate', phase: 'running', label: L.translate })
    push(320, { type: 'tool', id: 'tr', phase: 'done', summary: S.lang(lang), result: { detected: lang, answerLang: lang } })
  }

  if (intent === 'reservation') {
    const date = nextSaturday()
    const slots = slotsFor(fac)
    const open = slots.filter((s) => s.status === 'open')
    push(300, { type: 'tool', id: 't1', tool: 'reservation', phase: 'running', label: L.reservation, detail: `${fac.name} ${mmdd(date)}` })
    push(620, { type: 'tool', id: 't1', phase: 'done', summary: S.slots(open.length), result: { slots, facilityId: fac.id, date: iso(date) } })
    // 시설 상태 카드는 보내지 않는다. 외부 예약 시스템 버튼이 채팅 안 예약과 부딪힌다
    if (!open.length) {
      // 남은 자리가 없으면 쓰기 확인 카드를 만들지 않는다. 없는 것을 예약시키지 않는다
      return { lang, fac, steps, text: t.unknown(), followups: FOLLOWUPS[lang].reservation, autoResolved: false, confidence: 0.4 }
    }
    const first = open[0]
    const action = {
      type: 'action', id: `a-${id}`, tool: 'reservation', op: 'create',
      title: `${mmdd(date)} ${first.time}~${String(Number(first.time.slice(0, 2)) + 1).padStart(2, '0')}:00 ${fac.name} ${first.court}`,
      lines: fac.fees.filter((f) => /야간|조명/.test(f.item) || fac.fees.length < 3).map((f) => `${f.item} ${won(f.price)}`),
      confirmLabel: 'chat.agent.confirmReservation',   // 화면 사전 키다. 서버 문자열을 그대로 그리지 않는다
      alternatives: [{ labelKey: 'otherTime', prompt: message.replace(/\?$/, '') + ' 다른 시간대' }],
      payload: { facilityId: fac.id, date: iso(date), time: first.time, court: first.court, total: first.fee }
    }
    PENDING.set(action.id, { ...action, lang })
    return { lang, fac, steps, text: t.reservation(fac, slots, date), action, followups: FOLLOWUPS[lang].reservation, autoResolved: true, confidence: 0.92 }
  }

  if (intent === 'fee') {
    const hits = knowledgeHits(fac, message)
    const people = parsePeople(message)
    const { items, total } = feeItems(fac, people, lang)
    push(280, { type: 'tool', id: 'k1', tool: 'knowledge', phase: 'running', label: L.knowledge, detail: fac.name })
    push(520, { type: 'tool', id: 'k1', phase: 'done', summary: S.hits(hits.length), result: { sources: hits } })
    push(240, { type: 'tool', id: 'f1', tool: 'fee', phase: 'running', label: L.fee, detail: fac.name })
    push(480, { type: 'tool', id: 'f1', phase: 'done', summary: S.fee(total), result: { items, total, facilityId: fac.id } })
    return { lang, fac, steps, text: t.fee(fac, items, total), followups: FOLLOWUPS[lang].fee, autoResolved: true, confidence: 0.88 }
  }

  if (intent === 'location') {
    const q = encodeURIComponent(fac.name)
    const result = {
      address: fac.address,
      transit: ['시내버스 정류장 도보 5분', '동해역 차량 12분'],
      parking: '부지 내 주차장 이용 가능',
      links: { naver: `https://map.naver.com/p/search/${q}`, kakao: `https://map.kakao.com/?q=${q}` }
    }
    push(280, { type: 'tool', id: 'l1', tool: 'location', phase: 'running', label: L.location, detail: fac.name })
    push(540, { type: 'tool', id: 'l1', phase: 'done', summary: S.place(fac.address), result })
    return { lang, fac, steps, text: t.location(fac), followups: FOLLOWUPS[lang].location, autoResolved: true, confidence: 0.9 }
  }

  if (intent === 'hours') {
    const hits = knowledgeHits(fac, message)
    push(280, { type: 'tool', id: 'k1', tool: 'knowledge', phase: 'running', label: L.knowledge, detail: fac.name })
    push(560, { type: 'tool', id: 'k1', phase: 'done', summary: S.hits(hits.length), result: { sources: hits } })
    push(160, { type: 'cards', cards: [{ type: 'facility', facilityId: fac.id }] })
    return { lang, fac, steps, text: t.hours(fac), followups: FOLLOWUPS[lang].hours, autoResolved: true, confidence: 0.86 }
  }

  // 자료 없음 → 담당자 연결. 티켓 생성은 허용 게이트를 거친다
  const todayHours = fac.hours[WEEKDAY[new Date().getDay()]]
  push(280, { type: 'tool', id: 'k1', tool: 'knowledge', phase: 'running', label: L.knowledge })
  push(620, { type: 'tool', id: 'k1', phase: 'done', summary: S.none, result: { sources: [] } })
  const action = {
    type: 'action', id: `a-${id}`, tool: 'handoff', op: 'create',
    title: `${fac.department} ${fac.name}`,
    confirmLabel: 'chat.agent.confirmHandoff',
    lines: [`${fac.phone}`, `${todayHours}`],
    fields: [
      { key: 'name', required: true },
      { key: 'phone' },
      { key: 'content', multiline: true, required: true }
    ],
    payload: { facilityId: fac.id }
  }
  PENDING.set(action.id, { ...action, lang })
  return {
    lang,
    fac,
    steps,
    text: t.unknown(),
    afterText: [
      { wait: 240, evt: { type: 'tool', id: 'h1', tool: 'handoff', phase: 'running', label: L.handoff, detail: fac.department } },
      { wait: 460, evt: { type: 'tool', id: 'h1', phase: 'done', summary: S.dept(fac.department), result: { department: fac.department, phone: fac.phone, hours: todayHours, facilityId: fac.id } } }
    ],
    action,
    followups: FOLLOWUPS[lang].unknown,
    autoResolved: false,
    confidence: 0.31
  }
}

const enc = new TextEncoder()
const line = (o) => enc.encode(JSON.stringify(o) + '\n')
const wait = (ms) => new Promise((r) => setTimeout(r, ms))
const ndjson = (start) => new Response(new ReadableStream({ start }), { headers: { 'Content-Type': 'application/x-ndjson' } })

export function mockChatStream({ message, facilityId }) {
  const s = buildScenario(message || '', facilityId)

  return ndjson(async (ctrl) => {
    await wait(320)
    for (const step of s.steps) {
      ctrl.enqueue(line(step.evt))
      await wait(step.wait)
    }
    for (const t of tokenize(s.text)) {
      ctrl.enqueue(line({ type: 'token', token: t }))
      await wait(16 + Math.random() * 24)
    }
    for (const step of s.afterText || []) {
      ctrl.enqueue(line(step.evt))
      await wait(step.wait)
    }
    if (s.action) ctrl.enqueue(line(s.action))
    ctrl.enqueue(line({ type: 'followups', items: s.followups }))
    ctrl.enqueue(line({ type: 'done', messageId: `msg-${Math.random().toString(36).slice(2, 8)}`, autoResolved: s.autoResolved, confidence: s.confidence }))
    ctrl.close()
  })
}

// 허용 응답. 여기서만 쓰기가 일어난다. approve 가 false 면 아무것도 바꾸지 않는다
export function mockActionStream({ actionId, approve, args, createTicket }) {
  const action = PENDING.get(actionId)

  return ndjson(async (ctrl) => {
    if (!approve || !action) {
      ctrl.enqueue(line({ type: 'done' }))
      ctrl.close()
      return
    }
    PENDING.delete(actionId)
    const lang = action.lang || 'ko'
    const t = TEXT[lang]
    const L = LABEL[lang]
    const S = SUMMARY[lang]
    const fac = facilities.find((f) => f.id === action.payload.facilityId)

    if (action.tool === 'reservation') {
      const d = new Date(action.payload.date)
      const code = `R-${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}${String(d.getDate()).padStart(2, '0')}-${String(Math.floor(Math.random() * 900) + 100)}`
      const cancel = new Date(d)
      cancel.setDate(cancel.getDate() - 1)
      const reservation = {
        code, facilityId: fac.id, facilityName: fac.name, date: action.payload.date,
        time: `${action.payload.time}~${String(Number(action.payload.time.slice(0, 2)) + 1).padStart(2, '0')}:00`,
        court: action.payload.court, total: action.payload.total, cancelBy: iso(cancel), guide: fac.guide
      }
      await wait(300)
      ctrl.enqueue(line({ type: 'tool', id: 'w1', tool: 'reservation', phase: 'running', label: L.reservationWrite, detail: fac.name }))
      await wait(760)
      ctrl.enqueue(line({ type: 'tool', id: 'w1', phase: 'done', summary: S.booked, result: { reservation } }))
      await wait(220)
      for (const tk of tokenize(t.approved(reservation, fac))) {
        ctrl.enqueue(line({ type: 'token', token: tk }))
        await wait(16 + Math.random() * 20)
      }
      ctrl.enqueue(line({ type: 'done' }))
      ctrl.close()
      return
    }

    // handoff. 기존 mock 라우터를 그대로 호출해 관리자 인계 목록에 실제로 쌓는다
    await wait(300)
    ctrl.enqueue(line({ type: 'tool', id: 'w1', tool: 'handoff', phase: 'running', label: L.handoffWrite, detail: fac.department }))
    let ticket
    try {
      ticket = await createTicket({
        facilityId: fac.id,
        name: args?.name || '',
        phone: args?.phone || '',
        content: args?.content || '',
        consent: true
      })
    } catch {
      ticket = { ticketId: '', department: fac.department, phone: fac.phone, hours: '' }
    }
    ctrl.enqueue(line({ type: 'tool', id: 'w1', phase: 'done', summary: S.ticket, result: { ticket } }))
    await wait(220)
    for (const tk of tokenize(t.ticket(ticket))) {
      ctrl.enqueue(line({ type: 'token', token: tk }))
      await wait(16 + Math.random() * 20)
    }
    ctrl.enqueue(line({ type: 'done' }))
    ctrl.close()
  })
}
