// 화면별 코치마크 단계. 한 단계는 영역 하나(또는 붙어 있는 영역 묶음)를 밝힌다.
// targets 의 각 항목: selector(CSS) 또는 find(태그)+text(글자 시작, exact 면 전체 일치, re 면 정규식), within(검색 범위), up(가장 가까운 조상 CSS 선택자).
// 못 찾은 단계는 건너뛴다.
const band = { find: 'section', text: '기한 초과 우려', up: 'section' }
const flow = { find: 'p', text: '대피 대상 인원', up: 'ol' }
const sec = (text, tag = 'h2') => ({ find: tag, text, up: 'section' })
const btn = (text, extra = {}) => ({ find: 'button', text, ...extra })
const detailHead = { find: 'h2', re: '^[A-Z]{1,3}-\\d', up: 'section' }

export const TOURS = {
  '/console': [
    { title: '결론과 숫자 흐름', body: '기준 배정 시 이동 불가 인원, 대피 대상에서 협약 후까지 단계별 인원', targets: [band, flow] },
    { title: '처리할 일', body: '확인 대기 항목 목록, 선택 시 해당 화면 이동', targets: [sec('처리할 일')] },
    { title: '이동 불가 발생 마을', body: '기한 빠른 순 목록, 선택 시 마을 상세와 명부 이동', targets: [sec('이동 불가 발생 마을')] },
    { title: '오늘 상황', body: '산불위험지수, 기상특보, 출동 가능 차량, 활동 중 도우미', targets: [sec(['오늘 상황', '오늘 산불 여건'])] },
    { title: '발령 개시', body: '훈련 발령 시작, 발령 운영 화면 이동', targets: [btn('발령 개시', { within: 'header' })] }
  ],
  '/console/shortage': [
    { title: '결론과 숫자 흐름', body: '기준 배정과 추천 배정 시 이동 불가 인원, 협약 후 인원', targets: [band, flow] },
    { title: '확산 조건', body: '조건 선택, 계산 조건 변경, 계산 근거, 저장과 비교', targets: [btn('확산 조건')] },
    { title: '이동 불가 인원 감소 방안', body: '방안 선택 시 결과와 필요 협약 표시', targets: [sec('이동 불가 인원 감소 방안')] },
    { title: '마을별 이동 불가 인원', body: '산불 도달 시각과 마을별 인원, 표와 색 표 전환', targets: [sec('마을별 이동 불가 인원')] },
    { title: '협약 단추', body: '협약 차량 확인, 계산 숫자가 입력된 협약 추진 기안 열기', targets: [btn('협약 차량 확인'), btn('협약 추진 기안')] }
  ],
  '/console/dispatch': [
    { title: '발령 진행 순서', body: '개시, 배정 계산, 배정표 전송, 이송 진행 4단계와 다음 행동', targets: [{ selector: '[data-tour="dispatch-guide"]' }] },
    { title: '다음 행동 단추', body: '현재 단계의 주 행동, 클릭 시 다음 단계 진행', targets: [{ selector: '[data-tour="dispatch-primary"]' }] },
    { title: '자동 진행', body: '2초 간격 훈련 자동 시연, 직접 진행으로 정지', targets: [{ selector: '[data-tour="dispatch-auto"]' }] }
  ],
  '/console/intake': [
    { title: '서류 올리기', body: '서류 사진 추가, AI 읽기 대상 등록', targets: [btn('서류 올리기')] },
    { title: '확인 대기 서류', body: '서류와 AI 읽기 결과가 다른 건 우선, 선택 시 상세 표시', targets: [sec('확인 대기')] },
    { title: '원본과 읽은 결과', body: '원본 서류, 근거 문구, 이송 등급, 특이사항 대조', targets: [{ selector: 'main section.cq' }] },
    { title: '확인 단추', body: '제외, 수정, 확인, 확인 시 명부 반영', targets: [btn('제외', { exact: true, within: 'main section.cq' }), btn('수정', { exact: true, within: 'main section.cq' }), btn('확인', { exact: true, within: 'main section.cq' })] }
  ],
  '/console/roster': [
    { title: '조건', body: '마을, 이송 등급, 재확인 대상 조건 선택', targets: [btn('조건 더보기', { up: 'div' })] },
    { title: '명부 목록', body: '대상자 코드, 마을, 이송 등급, 등급 확인, 마지막 확인', targets: [sec('표시 중인 명부')] },
    { title: '대상자 상세', body: '장기요양 등급, 특이사항, 근거 서류, 돌봄과 접근 정보', targets: [detailHead] },
    { title: '대상자 추가', body: '명부에 대상자 등록', targets: [btn('대상자 추가')] }
  ],
  '/console/resources': [
    { title: '협약 미확정 차량', body: '미확정 차량 목록 보기, 필요한 협약 대수 확인', targets: [{ find: 'p', text: '협약 미확정 차량' }, btn('미확정 차량만 보기'), btn('필요한 협약 대수 보기')] },
    { title: '차량 목록', body: '등록, 출동 가능, 협약 확정, 미확정 차량, 10개 단위 쪽 이동', targets: [sec('차량')] },
    { title: '차량 상세', body: '협약 상태, 소속, 만료일, 한 번에 태우는 수, 출동 여부', targets: [detailHead] },
    { title: '차량 추가', body: '차량 또는 도우미 등록', targets: [btn('차량 추가')] }
  ],
  '/console/map': [
    { title: '이동 불가 발생 마을', body: '기한 빠른 순 목록, 선택 시 마을 상세와 이동 단추', targets: [{ find: 'h2', text: '이동 불가 발생 마을', up: 'aside' }] },
    { title: '지도 도구', body: '2D와 3D, 라이트와 다크, 전체 화면, 레이어 전환', targets: [btn('레이어', { up: 'div.absolute' })] },
    { title: '지도 마을 표지', body: '마을별 대상자 수 표시, 선택 시 마을 상세 이동', targets: [{ find: 'button', text: '천곡동, 대상자' }] },
    { title: '시간축', body: '발령 후 시각별 대기 인원, 재생과 이동', targets: [{ find: 'button', text: '처음부터 재생', up: 'div.rounded-lg' }] }
  ],
  '/console/notes': [
    { title: '현장 소식 목록', body: '확인 대기 소식, 선택 시 상세 표시', targets: [sec('확인 대기')] },
    { title: '소식 원문과 명부 반영', body: '소식 원문, 변경 항목, 이송 등급 선택에 따라 반영 내용 갱신', targets: [{ selector: 'main section.cq' }] },
    { title: '반영 단추', body: '반영 안 함, 수정 후 반영, 명부에 반영', targets: [btn('반영 안 함', { within: 'main section.cq' }), btn('수정 후 반영', { within: 'main section.cq' }), btn('명부에 반영', { within: 'main section.cq' })] }
  ],
  '/console/records': [
    { title: '발령 기록', body: '훈련과 실제 발령 이력, 10행 단위 쪽 이동', targets: [sec('발령 기록')] },
    { title: '마을별 미완료 추이', body: '발령 시각별 미완료 인원 변화', targets: [sec('마을별 미완료 추이')] }
  ],
  '/console/settings': [
    { title: '구분 탭', body: '계산과 알림 기준, 기관과 사용자, 차종, 대피소, 데이터 출처, 자료 안내', targets: [btn('계산과 알림 기준', { up: 'div' })] },
    { title: '기준 내용', body: '선택한 구분의 기준값과 목록', targets: [{ selector: 'main section.rounded-lg' }] }
  ],
  '/console/workspace': [
    { title: '문서 종류', body: '문서, 시트, 설문지 전환', targets: [btn('시트', { exact: true, up: 'div' })] },
    { title: '새 문서 시작', body: '서식 종류별 목록, 선택 시 숫자 자동 입력, 한글 파일 저장', targets: [{ find: 'h2', text: '새 문서 시작', up: 'div' }, btn('전체 22', { up: 'div' }), btn('빈 문서')] },
    { title: '검색과 가져오기', body: '문서 검색, 한글 파일 가져오기', targets: [{ find: 'input' }, btn('한글 파일 가져오기')] }
  ],
  '/console/handover': [
    { title: '발령 전 예상', body: '현재 확산 조건 기준 소방 인계 예상 인원', targets: [sec('발령 전 예상')] },
    { title: '발령 후 인계 목록', body: '발령 개시 후 목록 생성, 선택 후 소방 인계', targets: [sec('진행 중인 발령 없음'), { selector: 'main table' }] },
    { title: '소방 인계 단추', body: '선택한 대상 인계, 전달 기록 확인', targets: [btn('소방 인계', { exact: true })] }
  ]
}

export function tourEnabled(search = '') {
  if (/[?&]tour=off\b/.test(search)) return false
  return typeof window !== 'undefined'
}

const norm = (el) => (el.textContent || '').replace(/\s+/g, ' ').trim()

// 한 대상 정의를 요소 하나로 바꾼다. 글자 찾기는 글자가 맞는 요소 중 가장 짧은 것을 고른다.
export function resolveTarget(def, root = document) {
  const scope = def.within ? root.querySelector(def.within) : root
  if (!scope) return null
  let el = null
  if (def.selector) el = scope.querySelector(def.selector)
  else {
    const re = def.re ? new RegExp(def.re) : null
    const texts = [].concat(def.text || [])
    const list = [...scope.querySelectorAll(def.find || '*')].filter((e) => {
      const t = norm(e)
      return re ? re.test(t) : texts.some((x) => (def.exact ? t === x : t.startsWith(x)))
    })
    list.sort((a, b) => norm(a).length - norm(b).length)
    el = list[0] || null
  }
  if (el && def.up) el = el.closest(def.up) || el.parentElement
  return el
}

export function resolveTargets(step, root = document) {
  return (step.targets || []).map((d) => resolveTarget(d, root)).filter(Boolean)
}

export function unionRect(els) {
  let l = Infinity, t = Infinity, r = -Infinity, b = -Infinity
  for (const el of els) {
    const q = el.getBoundingClientRect()
    if (!q.width && !q.height) continue
    l = Math.min(l, q.left); t = Math.min(t, q.top); r = Math.max(r, q.right); b = Math.max(b, q.bottom)
  }
  return Number.isFinite(l) ? { left: l, top: t, width: r - l, height: b - t } : null
}
