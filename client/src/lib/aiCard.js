// aiCard.js 서류 읽기 화면의 확인 사유, 서류에서 알 수 있는 돌봄 정보, 담당자용 AI 정보(모델 카드), 집결지와 대피소 정의.
// 순수 값과 함수만 둔다. 판독 규칙(lib/intake.js)과 서버 지시문(api/intake.js)은 바꾸지 않는다.
// 근거: 의료 AI 분야 교수 면담(2026. 10. 22.) 지적 "평소 돌봄 담당자 확인 필요가 다 붙는다", 모델 카드 제안
//       모델 카드 절 구성은 Mitchell 외(2019) Model Cards for Model Reporting
import { GRADE_KEYS } from './shortage.js'
import { ASSIST_CUE } from './intake.js'

// 확인 사유. 코드가 실제로 아는 조건만 사유가 된다. 사유가 없으면 '확인 필요'를 붙이지 않는다.
// v 는 verifyResult 결과(aiGrade, quote, quoteMatched, confidence, conflict, gradeUncertain, reason)
const UNREAD_QUOTE = /판\s*독\s*불\s*가/
const EMPTY_QUOTE = /빈칸|(?:기록|정보|근거|기재|도움의 종류).{0,12}없/
export const REVIEW_REASON = {
  unread: '서류에서 읽지 못한 구간',
  noField: '서류에 이 사람 거동 내용 없음',
  modelSkip: 'AI가 이 순번을 판정하지 않음',
  noQuote: '근거 문구 없음',
  quoteMismatch: '근거 문구가 원문에 없음',
  conflict: '등급과 특이사항이 서로 맞지 않음',
  assistCue: '도보 판정이지만 보조 단서 있음',
  weak: '근거가 약한 도보나 부축 판정',
  ambiguous: 'AI가 두 등급 사이에서 애매하다고 봄, 높은 쪽 선택',
  noEvidence: '이동에 관한 근거 문구 없음',
  dimConflict: '판정 기준 항목끼리 가리키는 등급이 엇갈림',
  dimMismatch: '원문에 없는 항목 근거는 점수를 비움'
}
export function reviewReasons(v = {}) {
  const out = []
  const graded = GRADE_KEYS.includes(v.aiGrade ?? v.grade)
  const quote = v.quote || ''
  const g = v.aiGrade ?? v.grade
  // 서버 판독 사유(공모전/AI검증/판독출력형식_v1.md): missingFromModel, noResult, unreadable, quoteMismatch, noEvidence, dimConflict
  if (v.reason === 'missingFromModel') out.push('modelSkip')
  else if (v.reason === 'noEvidence') out.push('noEvidence')
  else if (!graded && UNREAD_QUOTE.test(quote)) out.push('unread')
  else if (!graded && (EMPTY_QUOTE.test(quote) || !quote)) out.push('noField')
  else if (!graded) out.push('unread')
  if (graded && !quote) out.push('noQuote')
  else if (graded && v.quoteMatched === false) out.push('quoteMismatch')
  if (v.conflict) out.push('conflict')
  if (v.reason === 'dimConflict' || v.rubric?.conflict) out.push('dimConflict')
  if (v.rubric?.quoteMismatch?.length) out.push('dimMismatch')
  if (graded && g === 'walk' && ASSIST_CUE.test(`${quote} ${v.context || ''}`)) out.push('assistCue')
  if (graded && quote && EMPTY_QUOTE.test(quote)) out.push('noField')
  if (graded && v.confidence === 'low' && !out.length) out.push(g === 'walk' || g === 'assist' ? 'weak' : 'ambiguous')
  return [...new Set(out)].map((key) => ({ key, label: REVIEW_REASON[key] }))
}

// 서류에서 알 수 있는 돌봄 정보. 판독 결과에는 돌봄 담당자 칸이 없으므로 서류 특이사항(tags)에서만 끌어낸다.
// 서류에 없는 칸은 '확인 필요' 대신 '서류에 없음'으로 두고, 명부에서 사회복지 담당자가 입력한다(회신 R37 갱신 담당).
export const NOT_IN_DOC = '서류에 없음'
// 명부에 돌봄 칸이 아직 없는 대상자(서류 판독으로 막 들어온 사람). '확인 필요'를 되풀이하지 않고 상태를 그대로 말한다
export const NOT_ENTERED = '명부 입력 전'
export function docCare(r = {}) {
  const tags = r.tags || []
  const comm = []
  if (tags.includes('hearing')) comm.push('청각')
  if (tags.includes('dementia')) comm.push('인지')
  const aids = []
  if (tags.includes('wheelPower')) aids.push('전동 휠체어')
  if (tags.includes('wheelManual')) aids.push('수동 휠체어')
  if ((r.aiGrade ?? r.grade) === 'bed') aids.push('침대형 이송')
  if (tags.includes('oxygen')) aids.push('산소')
  return {
    caregiver: tags.includes('guardian') ? '보호자 동행 필요(서류)' : NOT_IN_DOC,
    comm: comm.length ? comm.join(', ') : NOT_IN_DOC,
    aids: aids.length ? aids.join(', ') : NOT_IN_DOC,
    missing: [!tags.includes('guardian'), !comm.length, !aids.length].filter(Boolean).length
  }
}

// 집결지와 대피소 정의. 설정 화면(SettingsPage 마을과 평시 지정 대피소 표 설명)의 문장을 줄인 것. 새 정의를 만들지 않는다
export const PLACE_TERMS = {
  pickup: { term: '집결지', text: '마을 경로당 가운데 분포 중심에 가까운 곳' },
  shelter: { term: '대피소', text: '집결지에서 차로 가는 시간이 가장 짧은 임시주거시설. 산불 확산 때는 대피 구역 밖 시설' }
}
export const placeLine = (k) => `${PLACE_TERMS[k].term}: ${PLACE_TERMS[k].text}`

// 담당자용 AI 정보(모델 카드). 화면에서 한 줄씩 보여 준다. 80자 넘는 문장 금지
// 시험 값 출처: 공모전/반영기록/AI판독_홀드아웃2_20261021.md(판독 코드 고정 커밋 a9e3c55)
export const AI_CARD = [
  { title: '하는 일', rows: [
    { k: '목적', v: '서류 글에서 이송 등급 초안과 근거 문구를 냄' },
    { k: '쓰는 곳', v: '동 담당자가 서류를 확인할 때 참고' }
  ] },
  { title: '모델과 입력', rows: [
    { k: '글자 인식', v: 'CLOVA OCR, 국내 클라우드' },
    { k: '등급 초안', v: 'HyperCLOVA X HCX-005, 학습 없이 지시문으로 사용' },
    { k: '입력', v: '이름, 연락처, 주소를 가린 서류 글자' },
    { k: '출력', v: '네 등급 중 하나, 특이사항, 근거 문구, 일치도' }
  ] },
  { title: '하지 않는 일', rows: [
    { k: '최종 판정', v: '하지 않음. 담당자가 확인해야 명부에 들어감' },
    { k: '애매할 때', v: '낮게 잡지 않고 휠체어로 계산, 확인 필요 표시' }
  ] },
  { title: '개인정보', rows: [
    { k: '가림', v: '보내기 전에 이름, 연락처, 주소를 가림' },
    { k: '잔존 검사', v: '가린 뒤에도 남으면 AI로 보내지 않고 멈춤' }
  ] },
  { title: '시험 결과', rows: [
    { k: '독립 판독 시험', v: '처음 보는 가상 서류 15장, 40명 (10. 21.)' },
    { k: '등급 일치', v: '40명 중 21명, 배정 계산 등급 기준' },
    { k: '낮게 계산', v: '2명. 위험 쪽 오류라 따로 관리' },
    { k: '개인정보 전체 잔존', v: '0건' },
    { k: '반복 판독 일치', v: '같은 서류 15장을 5번씩 읽어 38명 중 35명 등급 같음 (10. 22.)' },
    { k: '보완 뒤 재시험', v: '정답 30명 중 21명 일치, 낮게 계산 0명 (10. 22., 75회)' }
  ] },
  { title: '알려진 약점', rows: [
    { k: '글씨', v: '손글씨와 흐린 사진은 잘못 읽을 수 있음' },
    { k: '판정 기준', v: '전문가 검증 전 초안' }
  ] }
]
