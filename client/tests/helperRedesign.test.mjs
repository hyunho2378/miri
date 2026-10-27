// 도우미 화면 재구성 2a(공모전/모바일UI/벤치마크_20261022.md 공통 규칙, 퍼소나_사용성진단_20261022.md 도우미 절)
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { NEXT_STEP, STEP_ACTION, STEP_NOW, STEP_ORDER, PREDEPARTURE_ITEMS, UNDO_MS, nextPlaceOf, sentencesOf, stepIndexOf, tripWord, withPending, stepsByPerson, progressOf } from '../src/mobile/helper/flow.js'
import { EMERGENCY, PREDEPARTURE } from '../src/lib/helperGuidance.js'
import { KIT_PARTS } from '../src/mobile/kitParts.js'

const src = readFileSync(new URL('../src/mobile/helper/HelperScreens.jsx', import.meta.url), 'utf8')
const uiImports = (src.match(/import \{([^}]+)\} from '\.\.\/ui\.jsx'/) || [])[1].split(',').map((x) => x.trim())

test('도우미 화면은 키트에 대응 부품이 없는 옛 부품(칩, 카드, 안내 띠, 문단 안전 안내, 동의 카드, 버튼 묶음)을 쓰지 않는다', () => {
  for (const n of ['Chip', 'Card', 'Banner', 'BottomActions', 'SafetyGuidance', 'HelperConsent']) assert.ok(!uiImports.includes(n), n)
  for (const n of uiImports) assert.ok(!KIT_PARTS[n] || KIT_PARTS[n].status !== 'replace', `${n} 은 replace 부품`)
  assert.ok(uiImports.includes('BottomAction') && uiImports.includes('EmergencyButton') && uiImports.includes('InfoSheet'))
  assert.deepEqual([KIT_PARTS.Figure.status, KIT_PARTS.SelectRow.status], ['combo', 'combo'])
})

test('주 버튼 하나의 이름이 단계(출발했어요, 도착했어요, 탑승했어요, 인계했어요)로 바뀌고 확인 창 없이 되돌리기', () => {
  assert.deepEqual(Object.keys(STEP_ACTION), ['wait', 'depart', 'arrive', 'board'])
  assert.deepEqual(Object.values(STEP_ACTION), ['출발했어요', '도착했어요', '탑승했어요', '인계했어요'])
  for (const k of Object.keys(STEP_ACTION)) { assert.ok(NEXT_STEP[k]); assert.ok(STEP_NOW[k]) }
  assert.deepEqual(STEP_ORDER.slice(0, 4).map(stepIndexOf), [1, 2, 3, 4])
  assert.equal(stepIndexOf('handover'), 4)
  assert.match(src, /primary=\{\{ label: STEP_ACTION\[st\], onClick: press \}\}/)
  assert.doesNotMatch(src, /setConfirm\(true\)/)
  assert.match(src, /toast\(`\$\{houseOf\(m\.trips, code\)\} \$\{what\} 보고`, \{ label: '되돌리기'/)
  assert.ok(UNDO_MS >= 4000 && UNDO_MS <= 8000)
})

test('보내기 전 보고는 화면에만 반영되고, 되돌리면 원래 단계', () => {
  const codes = ['A', 'B']
  const base = stepsByPerson(codes, [{ type: 'step', personCode: 'A', step: 'board', at: 1 }])
  const shown = withPending(base, { code: 'A', step: 'handover' })
  assert.equal(shown.A, 'handover'); assert.equal(base.A, 'board')
  assert.equal(progressOf(codes, shown).current, 'B')
  assert.deepEqual(withPending(base, null), base)
})

test('다음 장소 한 줄과 회차 쉬운 말', () => {
  assert.equal(nextPlaceOf('wait', { village: '괴란동' }), '괴란동 대상자 댁')
  assert.equal(nextPlaceOf('depart', { village: '괴란동' }), '괴란동 대상자 댁')
  assert.equal(nextPlaceOf('arrive', {}), '차에 타기')
  assert.equal(nextPlaceOf('board', { shelter: '중앙초등학교' }), '중앙초등학교')
  assert.equal(nextPlaceOf('board', {}), '대피소')
  assert.equal(tripWord(2), '2번째 이동')
  assert.doesNotMatch(src, /회차/)
})

test('긴 안전 문단은 문장 하나씩 시트 안 목록으로(원문 글자 그대로), 80자 넘는 덩어리 없음', () => {
  const s = sentencesOf(EMERGENCY)
  assert.equal(s.length, 4)
  assert.equal(s.join(' '), EMERGENCY)
  for (const x of s) assert.ok(x.length <= 80, x)
  const p = sentencesOf(PREDEPARTURE)
  assert.equal(p.length, 2); assert.match(p[1], /건강상태를 판정/)
  assert.deepEqual(PREDEPARTURE_ITEMS, ['기존 질환', '거동 불편', '호흡 상태', '비상연락처와 필요한 의료정보'])
  assert.match(src, /sentencesOf\(EMERGENCY\)\.map/)
  assert.doesNotMatch(src, /\{EMERGENCY\}/)
})

test('긴급 버튼은 이송 화면 앱 바 끝 같은 자리, 시트에 119와 실패 보고와 담당자 전화', () => {
  assert.match(src, /trailing=\{<EmergencyButton onClick=\{\(\) => setSos\(true\)\} \/>\}/)
  for (const t of ['119에 전화', '이송할 수 없어요', '담당자 전화', '응급 대응 안내', '말할 때 쓰는 문구']) assert.ok(src.includes(t), t)
})

test('수락 안내 한 문장 유지, 불이익 없음은 동의 화면에도 한 줄(버튼 말과 같은 불가)', () => {
  assert.ok(src.includes('수락을 누르면 배정이 확정됩니다. 불가를 눌러도 불이익은 없고, 다른 도우미에게 넘어갑니다.'))
  assert.ok(src.includes('참여가 불가하거나 나중에 그만둬도 불이익은 없어요.'))
  assert.match(src, /<InfoSheet title="개인정보와 그만두는 방법"/)
})

test('평시 첫 화면: 누구용 한 줄, 내 상태, 할 일 하나, 시연 배정은 약한 글자 버튼', () => {
  assert.match(src, /title="미리 도우미" large/)
  assert.ok(!src.includes('이웃 대피를 돕는 화면'))
  assert.match(src, /secondary=\{\{ label: busy \? '배정을 받는 중이에요' : '시연 배정 받기', onClick: begin, disabled: busy \}\}/)
  // 두 번 누름 방지와 먼저 그린 뒤 계산
  assert.match(src, /if \(busy\) return; setBusy\(true\); setTimeout\(/)
  assert.match(src, /primary=\{consented \? null : \{ label: '참여 동의하기'/)
})
