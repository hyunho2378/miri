// 30회차: 플랫폼 AI 협업 툴 검토 반영(셀 80, 81). 문자 할 일 먼저와 90바이트, 훈련 결과 보고 자동 채움, 기록 말 통일
import assert from 'node:assert/strict'
import { dispatchSms, replaceSms, resendSms, smsBytes, SMS_ACTION } from '../src/lib/dispatchSim.js'
import { drillVars, formatVar } from '../src/lib/docVars.js'
import { latestDrillRecord, recordPeriod, recordTotals, RECORD_LABELS } from '../src/lib/recordTotals.js'
import { DOC_TEMPLATES } from '../src/lib/docTemplates.js'

let n = 0
const t = (name, fn) => { fn(); n++; console.log('ok', name) }
const brief = (villages, persons = 12) => ({ disaster: '지진해일', villages, persons, completeBy: Date.UTC(2026, 9, 24, 17, 25) })
const PRIVATE = /\d{2,3}-\d{3,4}-\d{4}|번지|\d+동 \d+호|님/

t('배정 문자: 할 일이 맨 앞, 링크 뺀 본문 90바이트 이하, 개인정보 없음', () => {
  for (const vs of [['망상동'], ['망상동', '발한동'], ['묵호진동', '발한동', '부곡동', '평릉동'], ['묵호진동가나다', '발한동가나', '부곡동']]) {
    const m = dispatchSms(brief(vs), { drill: true, link: 'https://miri-indol.vercel.app/m/h/abcdef' })
    assert.ok(m.body.startsWith(`[미리 훈련] ${SMS_ACTION}.`), m.body)
    assert.ok(m.bodyBytes <= 90, `${m.bodyBytes} ${m.body}`)
    assert.equal(m.bodyBytes, smsBytes(m.body))
    assert.ok(!PRIVATE.test(m.body), m.body)
    assert.ok(m.text.endsWith('https://miri-indol.vercel.app/m/h/abcdef'))
  }
})

t('배정 문자: 마을이 많으면 첫 마을 외 n곳으로 줄임', () => {
  const m = dispatchSms(brief(['묵호진동', '발한동', '부곡동', '평릉동']), { drill: false })
  assert.match(m.body, /^\[미리\] 수락이나 불가를 눌러 주세요\. 지진해일 (대피 )?이송, 묵호진동(, 발한동)? 외 [23]곳 12명, \d\d:\d\d까지$/)
})

t('대체 배정 문자와 재발송 문자: 할 일 먼저, 90바이트 이하, 도우미 코드만', () => {
  for (const m of [replaceSms('H-084', { drill: true }), replaceSms('H-084', { drill: false }), resendSms('H-084', { drill: true })]) {
    assert.match(m.body, /^\[미리( 훈련)?\] 수락이나 불가를 눌러 주세요\./)
    assert.ok(m.bodyBytes <= 90, `${m.bodyBytes} ${m.body}`)
    assert.ok(m.body.includes('H-084'))
  }
  assert.ok(replaceSms('H-084').body.includes('불가여도 불이익 없음'))
})

const rec = (kind, startedAt, closedAt) => ({
  id: `R-${startedAt}`, kind, startedAt, closedAt, helpers: 44,
  byVillage: { A: { total: 500, done: 300, failed: 0, fire: 190 }, B: { total: 348, done: 270, failed: 11, fire: 77 } }
})

t('기록 합계와 말: 화면 말(인계 완료, 소방 인계, 미완료) 기준', () => {
  const r = rec('drill', 0, 1)
  assert.deepEqual(recordTotals(r), { total: 848, done: 570, fire: 267, open: 11 })
  assert.deepEqual(RECORD_LABELS, { total: '대상자', done: '인계 완료', fire: '소방 인계', open: '미완료' })
})

t('훈련 결과 보고 자동 채움: 최근 훈련 기록 값, 기록 없으면 ○○○ 빈칸', () => {
  const start = new Date(2026, 9, 24, 23, 10).getTime(), end = new Date(2026, 9, 24, 23, 58).getTime()
  const records = [rec('real', start + 5000, end + 5000), rec('drill', start, end)]
  assert.equal(latestDrillRecord(records).kind, 'drill')
  assert.equal(recordPeriod(records[1]), '2026. 10. 24.(토) 23:10∼23:58')
  const v = drillVars(latestDrillRecord(records))
  assert.equal(formatVar('drillHelpers', v), '44명')
  assert.equal(formatVar('drillDone', v), '570명')
  assert.equal(formatVar('drillFire', v), '267명')
  assert.equal(formatVar('drillOpen', v), '11명')
  assert.equal(formatVar('drillTargets', v), '848명')
  const empty = drillVars(latestDrillRecord([]))
  for (const k of Object.keys(empty)) assert.equal(formatVar(k, empty), '○○○')
})

t('훈련 결과 보고 서식: 고정 ○○ 칸 대신 자료값, 화면과 같은 말', () => {
  const tpl = DOC_TEMPLATES.find((d) => d.key === 'drill-result')
  for (const k of ['drillPeriod', 'drillHelpers', 'drillDone', 'drillFire', 'drillOpen', 'drillBaseAt']) assert.ok(tpl.html.includes(`data-var="${k}"`), k)
  assert.ok(!tpl.html.includes('이송 완료 ○○명'))
  assert.ok(!tpl.html.includes('미이송 ○○명'))
  assert.ok(tpl.html.includes('인계 완료'))
})

console.log(`\n${n}개 시험 통과`)
