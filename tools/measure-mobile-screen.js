// 휴대폰 화면 한 장을 재는 도구. 브라우저에서 그 화면 문서 안에서 실행한다(Playwright page.evaluate, 틀 iframe 의 contentWindow).
// 바깥 모듈을 쓰지 않아 함수 그대로 문자열로 넘길 수 있다.
//   const r = await frame.evaluate(`(${measureMobileScreen.toString()})()`)
// 규칙 값은 client/src/mobile/kitParts.js SCREEN_RULES 와 같다.
export function measureMobileScreen(rules = { maxFilledButtons: 1, maxParagraphChars: 80, maxTextLevels: 4 }) {
  const doc = document
  const root = doc.querySelector('.mob-root') || doc.body
  const visible = (el) => {
    const r = el.getBoundingClientRect()
    const cs = getComputedStyle(el)
    return r.width > 0 && r.height > 0 && cs.visibility !== 'hidden' && cs.display !== 'none'
  }
  // 덮개(시트, 대화상자)가 열려 있으면 그 안만 잰다
  const overlay = [...doc.querySelectorAll('.mob-sheet, .mob-dialog')].find(visible)
  const scope = overlay || root
  const filled = [...scope.querySelectorAll('.mob-btn.v-filled, .mob-btn.v-danger')].filter(visible)
  // 글 덩어리: 자식 요소 없이 글자를 가진 가장 안쪽 블록
  const blocks = [...scope.querySelectorAll('p, li, h1, h2, h3, span, div, a, button')].filter((el) => {
    if (!visible(el)) return false
    const own = [...el.childNodes].filter((n) => n.nodeType === 3).map((n) => n.textContent).join('').trim()
    return own.length > 0
  })
  const texts = blocks.map((el) => ({ el, text: el.textContent.replace(/\s+/g, ' ').trim() }))
  const long = texts.filter((t) => t.text.length > rules.maxParagraphChars && !t.el.querySelector('p, li, div')).map((t) => ({ chars: t.text.length, text: t.text.slice(0, 40) }))
  const levels = new Set(blocks.map((el) => { const cs = getComputedStyle(el); return `${cs.fontSize}/${cs.fontWeight}` }))
  const chars = (scope.innerText || '').replace(/\s+/g, '').length
  const content = scope.querySelector('.mob-content') || doc.scrollingElement
  const scroll = content ? Math.round((content.scrollHeight / Math.max(1, content.clientHeight)) * 100) / 100 : 1
  const vh = window.innerHeight
  const main = filled[0]
  const mainInView = main ? (() => { const r = main.getBoundingClientRect(); return r.top >= 0 && r.bottom <= vh })() : null
  const touchSmall = [...scope.querySelectorAll('button, a, [role="switch"], [role="radio"], input')].filter(visible).filter((el) => {
    const r = el.getBoundingClientRect(); return Math.min(r.width, r.height) < 44 && !el.closest('.mob-nav')
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
