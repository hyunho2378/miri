// 휴대폰 화면 한 장을 재는 도구. 브라우저에서 그 화면 문서 안에서 실행한다(Playwright page.evaluate, 틀 iframe 의 contentWindow).
// 바깥 모듈을 쓰지 않아 함수 그대로 문자열로 넘길 수 있다.
//   const r = await frame.evaluate(`(${measureMobileScreen.toString()})()`)
// 규칙 값은 client/src/mobile/kitParts.js SCREEN_RULES 와 같다.
export function measureMobileScreen(rules = { maxFilledButtons: 1, maxParagraphChars: 80, maxTextLevels: 4 }) {
  const doc = document
  const root = doc.querySelector('.mob-root') || doc.body
  // 숨긴 요소(투명도 0, aria-hidden, data-hidden 조상)는 보이는 글이 아니므로 세지 않는다(iOS 큰 제목이 접힐 때 쓰는 숨은 인라인 제목 등)
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    if (!(r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none')) return false
    for (let n = el; n && n !== doc.body; n = n.parentElement) {
      if (n.getAttribute && (n.getAttribute('aria-hidden') === 'true' || n.hasAttribute('data-hidden'))) return false
      if (Number(getComputedStyle(n).opacity) === 0) return false
    }
    return true
  }
  // 알림(스낵바, 토스트)은 몇 초 뒤 사라지는 일시 요소라 화면 위계에서 따로 센다(M3 Snackbar, 화면 위에 잠깐 겹침)
  const transient = (el) => !!el.closest('.mob-toast, [role="alert"].mob-toast, .mob-snackbar')
  // 누름 영역: 키트 크기는 두고 ::after 로 넓힌 영역까지 포함해 잰다
  const hitSize = (el) => {
    const r = el.getBoundingClientRect()
    let w = r.width, h = r.height
    const a = getComputedStyle(el, '::after')
    if (a && a.content && a.content !== 'none' && a.position === 'absolute') {
      const px = (v) => (v && v.endsWith('px') ? parseFloat(v) : 0)
      h = Math.max(h, r.height - Math.min(0, px(a.top)) - Math.min(0, px(a.bottom)))
      w = Math.max(w, r.width - Math.min(0, px(a.left)) - Math.min(0, px(a.right)))
    }
    return Math.min(w, h)
  }
  // 덮개(시트, 대화상자)가 열려 있으면 그 안만 잰다
  const overlay = [...doc.querySelectorAll('.mob-sheet, .mob-dialog')].find(visible)
  const scope = overlay || root
  const filled = [...scope.querySelectorAll('.mob-btn.v-filled, .mob-btn.v-danger')].filter(visible)
  // 글 덩어리: 자식 요소 없이 글자를 가진 가장 안쪽 블록
  const blocks = [...scope.querySelectorAll('p, li, h1, h2, h3, span, div, a, button')].filter((el) => {
    if (!visible(el) || transient(el)) return false
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
    return own.length > 0
  })
  const texts = blocks.map((el) => ({ el, text: el.textContent.replace(/\s+/g, ' ').trim() }))
  const long = texts.filter((t) => t.text.length > rules.maxParagraphChars && !t.el.querySelector('p, li, div')).map((t) => ({ chars: t.text.length, text: t.text.slice(0, 40) }))
  const levels = new Set(blocks.map((el) => { const cs = getComputedStyle(el); return `${cs.fontSize}/${cs.fontWeight}` }))
  const chars = (scope.innerText || '').replace(/\s+/g, '').length
  // 스크롤: 내용 칸과 문서 전체 중 큰 값(내용 칸만 재면 문서 스크롤을 놓침)
  const content = scope.querySelector('.mob-content')
  const se = doc.scrollingElement
  const ratio = (el) => (el ? el.scrollHeight / Math.max(1, el.clientHeight) : 1)
  const scroll = Math.round(Math.max(ratio(content), overlay ? 1 : ratio(se)) * 100) / 100
  const vh = window.innerHeight
  const main = filled[0]
  const mainInView = main ? (() => { const r = main.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh })() : null
  const touchSmall = [...scope.querySelectorAll('button, a, [role="switch"], [role="radio"], input')].filter(visible).filter((el) => {
    return hitSize(el) < 44 && !el.closest('.mob-nav')
  }).length
  return {
    filledButtons: filled.length,
    longBlocks: long,
    textLevels: levels.size,
    chars,
    scroll,
    mainInView,
    touchSmall,
    pass: {
      filled: filled.length <= rules.maxFilledButtons,
      paragraph: long.length === 0,
      levels: levels.size <= rules.maxTextLevels,
      mainInView: mainInView !== false
    }
  }
}
