// 화면별 코치마크 단계. 대상은 data-tour 속성, 선택자, 또는 요소 안 글자로 찾는다. 못 찾은 단계는 건너뛴다.
export const TOURS = {
  '/console': [
    { find: 'h2', text: '처리할 일', title: '처리할 일', body: '확인 대기 항목 선택 시 해당 화면 이동' },
    { find: 'h2', text: '이동 불가 발생 마을', title: '이동 불가 발생 마을', body: '마을 선택 시 상세와 명부 이동' },
    { find: 'button', text: '발령 개시', title: '발령 개시', body: '훈련 발령 시작, 발령 운영 화면 이동' }
  ],
  '/console/dispatch': [
    { selector: '[data-tour="dispatch-guide"]', title: '발령 진행 순서', body: '1 발령 개시, 2 배정 계산, 3 배정표 전송, 4 이송 진행' },
    { selector: '[data-tour="dispatch-primary"]', title: '다음 행동', body: '현재 단계의 주 행동 단추' },
    { selector: '[data-tour="dispatch-auto"]', title: '자동 진행', body: '훈련 발령 자동 시연, 직접 진행으로 정지' }
  ],
  '/console/shortage': [
    { find: 'button', text: '계산 조건 변경', title: '계산 조건', body: '확산 조건과 차량 조건 변경' },
    { find: 'h2', text: '이동 불가 인원 감소 방안', title: '감소 방안', body: '방안 선택 시 결과와 협약 구성 표시' },
    { find: 'button', text: '협약 추진 기안', title: '협약 추진 기안', body: '계산 숫자가 입력된 기안 열기' }
  ],
  '/console/intake': [
    { find: 'h2', text: '확인 대기', title: '확인 대기 서류', body: '서류 선택 시 원본과 AI 읽기 결과 대조' },
    { find: 'button', text: '서류 올리기', title: '서류 올리기', body: '서류 사진 추가' }
  ],
  '/console/roster': [
    { find: 'button', text: '조건 더보기', title: '조건', body: '마을, 이송 등급, 재확인 대상 조건 선택' },
    { find: 'button', text: '대상자 추가', title: '대상자 추가', body: '명부에 대상자 등록' }
  ],
  '/console/resources': [
    { find: 'button', text: '필요한 협약 대수 보기', title: '협약 대수', body: '확정 차량만 사용 시 필요 협약 확인' },
    { find: 'button', text: '차량 추가', title: '차량 추가', body: '차량 또는 도우미 등록' }
  ]
}

export function tourEnabled(search = '') {
  if (/[?&]tour=off\b/.test(search)) return false
  return typeof window !== 'undefined'
}

export function resolveTarget(step, root = document) {
  if (step.selector) return root.querySelector(step.selector)
  const list = [...root.querySelectorAll(step.find || '*')]
  return list.find((el) => (el.textContent || '').replace(/\s+/g, ' ').trim().startsWith(step.text)) || null
}
