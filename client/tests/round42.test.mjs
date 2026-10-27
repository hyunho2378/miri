import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { DOC_TEMPLATES } from '../src/lib/workspaceTemplates.js'

test('R42 동의서는 수집 이용, 민감정보, 제3자 제공 세 단으로 나뉘고 각 단에 체크칸이 있음', () => {
  const html = DOC_TEMPLATES.find((x) => x.key === 'consent').html
  assert.ok(html.includes('1. 개인정보 수집과 이용 동의'))
  assert.ok(html.includes('2. 민감정보 별도 동의'))
  assert.ok(html.includes('3. 제3자 제공 동의'))
  assert.ok(html.includes('3-1. 소방 기관에 제공'))
  assert.ok(html.includes('3-2. 도우미 위치 정보 제공'))
  assert.equal(html.split('□ 동의함    □ 동의하지 않음').length - 1, 4, '수집 이용, 민감정보, 소방, 도우미 위치 각각 체크칸')
})

test('R42 동의서 서명 아래에 대리인 성명과 관계, 대면 설명 담당자 확인 칸이 있음', () => {
  const html = DOC_TEMPLATES.find((x) => x.key === 'consent').html
  assert.ok(html.includes('대리인(보호자)  성명 ○○○ (서명)    동의자와의 관계 ○○○'))
  assert.ok(html.includes('대면으로 설명하고 서면 서명을 받음'))
})

test('R42 제3자 제공 단마다 받는 자, 이용 목적, 제공 항목, 보유 기간, 거부권 다섯 가지를 적음', () => {
  const html = DOC_TEMPLATES.find((x) => x.key === 'consent').html
  for (const k of ['제공받는 자', '이용 목적', '제공 항목', '거부권과 불이익']) {
    assert.equal(html.split(`<td>${k}</td>`).length - 1, 2, `${k}는 소방과 도우미 두 단에 있음`)
  }
  assert.equal(html.split('<td>보유 기간</td>').length - 1, 4, '보유 기간은 네 단(수집 이용, 민감정보, 소방, 도우미) 모두에 있음')
  assert.ok(!html.includes('&nbsp;'))
})

test('R42 가운데점, 줄표, 이모지 없음(동의서)', () => {
  const html = DOC_TEMPLATES.find((x) => x.key === 'consent').html
  assert.ok(!/[·—–]/.test(html))
})
