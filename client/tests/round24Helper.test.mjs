// 24회차 반영(플랫폼 셀 71, 72): 도우미 화면 집 표기, 장소 쉬운 말, 산불 단계 이름, 수락 되돌리기
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { houseOf, UNDO_MS } from '../src/mobile/helper/flow.js'
import { PLACE_TERMS } from '../src/lib/aiCard.js'

const helper = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
const fire = readFileSync(new URL('../src/components/miri/FireRiskStrip.jsx', import.meta.url), 'utf8')

test('셀 71: 대상자 코드 대신 마을 n번째 집, 배정에 없으면 대상자', () => {
  const trips = [{ village: '괴란동', personCodes: ['GR-01-001', 'GR-01-002'] }, { village: '만우동', personCodes: ['MW-05-003'] }]
  assert.equal(houseOf(trips, 'GR-01-002'), '괴란동 2번째 집')
  assert.equal(houseOf(trips, 'MW-05-003'), '만우동 1번째 집')
  assert.equal(houseOf(trips, 'XX'), '대상자')
  assert.equal(houseOf(undefined, 'XX'), '대상자')
})

test('셀 71: 전송 대기, 끝 화면, 실패 사유, 보고 알림에 코드가 그대로 나오지 않음', () => {
  assert.ok(!helper.includes('`${q.personCode} ${STEP_LABEL'))
  assert.ok(!helper.includes('title={r.personCode}'))
  assert.ok(!helper.includes('lead={`${v.code}, 이유를'))
  assert.ok(!helper.includes('toast(`${code} ${what} 보고`'))
  assert.equal((helper.match(/houseOf\(m\.trips,/g) || []).length, 4)
})

test('셀 71: 장소 뜻 쉬운 말은 도우미 화면에만, 콘솔 문장은 그대로', () => {
  assert.equal(PLACE_TERMS.pickup.text, '마을 경로당 가운데 분포 중심에 가까운 곳')
  assert.ok(PLACE_TERMS.pickup.easy && PLACE_TERMS.shelter.easy)
  assert.ok(!/분포|임시주거시설/.test(PLACE_TERMS.pickup.easy + PLACE_TERMS.shelter.easy))
  assert.match(helper, /subtitle=\{t\.easy \|\| t\.text\}/)
})

test('셀 72: 산불 단계 이름은 코드 기준 두 개만, 그 밖은 이름 없음', async () => {
  const src = fire.slice(fire.indexOf('export function fireLevelOf'), fire.indexOf('function toneOf'))
  // JSX 없는 순수 함수만 떼어 실행
  const fn = new Function(`${src.replace('export ', '')}; return fireLevelOf`)()
  assert.equal(fn({ d3: 40, d4: 20 }), '높음')
  assert.equal(fn({ d2: 30, d3: 10 }), '다소 높음')
  assert.equal(fn({ d2: 10, d3: 5 }), null)
  assert.equal(fn({}), null)
  assert.ok(!/관심|주의|경계|심각|매우 높음/.test(src))
  assert.match(fire, /발표`/)
})

test('수락은 기다림 없이 바로 보냄(사용자 지적 2026. 10. 27., 6초 지연 삭제), 실패하면 되돌림 안내', () => {
  assert.ok(!/ackTimer\.current = setTimeout\(sendAccept/.test(helper))
  assert.match(helper, /const r = m\.ack\('accept'\)/)
  assert.match(helper, /수락 전송 실패, 다시 수락/)
})
