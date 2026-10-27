// 화면별 코치마크 단계. 한 단계는 영역 하나(또는 붙어 있는 영역 묶음)를 밝힌다.
// targets 의 각 항목: selector(CSS) 또는 find(태그)+text(글자 시작, exact 면 전체 일치, re 면 정규식), within(검색 범위), up(가장 가까운 조상 CSS 선택자).
// 못 찾은 단계는 건너뛴다.
const band = { find: 'section', text: '기한 초과 우려', up: 'section' }
const flow = { find: 'p', text: '대피 대상 인원', up: 'ol' }
const sec = (text, tag = 'h2') => ({ find: tag, text, up: 'section' })
const btn = (text, extra = {}) => ({ find: 'button', text, ...extra })

export const TOURS = {
  '/console': [
    { title: '결론과 숫자 흐름', body: '기준 배정 시 이동 불가 인원, 대피 대상에서 협약 후까지 단계별 인원', targets: [band, flow] },
    { title: '처리할 일', body: '확인 대기 항목 목록, 선택 시 해당 화면 이동', targets: [sec('처리할 일')] },
    { title: '이동 불가 발생 마을', body: '기한 빠른 순 목록, 선택 시 마을 상세와 명부 이동', targets: [sec('이동 불가 발생 마을')] },
    { title: '발령 개시', body: '훈련 발령 시작, 발령 운영 화면 이동', targets: [btn('발령 개시', { within: 'header' })] }
  ],
  '/console/shortage': [
    { title: '결론과 숫자 흐름', body: '기준 배정과 추천 배정 시 이동 불가 인원, 협약 후 인원', targets: [band, flow] },
    { title: '확산 조건', body: '조건 선택, 계산 조건 변경, 계산 근거, 저장과 비교', targets: [btn('확산 조건')] },
    { title: '이동 불가 인원 감소 방안', body: '방안 선택 시 결과와 필요 협약 표시', targets: [sec('이동 불가 인원 감소 방안')] },
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
