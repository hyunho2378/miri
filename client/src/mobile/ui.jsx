// 미리 모바일 공용 부품. 같은 API, 플랫폼별 모양(docs/MOBILE_UI.md 5장 부품 대응).
// 모양 차이는 mobile.css 의 .mob-root.platform-ios / .platform-android 토큰이 맡고,
// 구조 차이(앱 바 큰 제목, 대화상자 버튼 배치, 토스트 위치, 물결)는 여기서 나눈다.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ArrowLeft, ChevronRight, WifiOff, Inbox, Check } from 'lucide-react'
import { usePlatform } from './usePlatform.js'
import { layoutFor } from './layout.js'
import { validTime, timeValue } from './time.js'
import './tokens.css'
import './mobile.css'

// 셸 바깥 껍데기. 플랫폼, 큰 글자, 화면 크기 등급(size-*), 이동 막대 위치(bar-*) 클래스를 이 요소에 붙여 토큰을 고정한다.
// 접힘 구획 수: CSS viewport segments 미디어 쿼리(지원 브라우저만, 없으면 1)
const segCount = (axis) => {
  if (typeof window === 'undefined' || !window.matchMedia) return 1
  return window.matchMedia(`(${axis}-viewport-segments: 2)`).matches ? 2 : 1
}
function useViewport() {
  const read = () => (typeof window === 'undefined' ? { width: 402, height: 874 } : { width: window.innerWidth, height: window.innerHeight, hSegments: segCount('horizontal'), vSegments: segCount('vertical') })
  const [vp, setVp] = useState(read)
  useEffect(() => {
    const on = () => setVp(read())
    window.addEventListener('resize', on)
    const posture = navigator.devicePosture   // Device Posture API(continuous, folded)
    posture?.addEventListener?.('change', on)
    return () => { window.removeEventListener('resize', on); posture?.removeEventListener?.('change', on) }
  }, [])
  return vp
}

const LayoutContext = createContext(layoutFor())
export function useLayout() { return useContext(LayoutContext) }

export function MobileRoot({ platform: forced, className = '', children, ...rest }) {
  const { platform, largeText } = usePlatform()
  const p = forced || platform
  const vp = useViewport()
  const layout = layoutFor({ platform: p, ...vp })
  return (
    <LayoutContext.Provider value={layout}>
      <div className={`mob-root platform-${p} size-${layout.size} bar-${layout.bar} ${layout.twoPane ? 'two-pane' : ''} ${layout.posture ? `posture-${layout.posture}` : ''} ${typeof window !== 'undefined' && window.self !== window.top ? 'in-frame' : ''} ${largeText ? 'text-large' : ''} ${className}`} data-platform={p} data-size={layout.size} data-bar={layout.bar} {...rest}>
        <ToastHost>{children}</ToastHost>
      </div>
    </LayoutContext.Provider>
  )
}

// 목록과 상세 두 단(medium 이상, iPhone Duo 안쪽). compact 에서는 상세가 있으면 상세만, 없으면 목록만 보인다.
export function TwoPane({ list, detail, emptyDetail }) {
  const { twoPane } = useLayout()
  if (!twoPane) return detail || list
  return (
    <div className="mob-two">
      <div className="mob-pane mob-pane-list">{list}</div>
      <div className="mob-pane mob-pane-detail">{detail || emptyDetail}</div>
    </div>
  )
}

function useRootPlatform(ref) {
  const { platform } = usePlatform()
  const [p, setP] = useState(platform)
  useEffect(() => {
    const el = ref.current?.closest('.mob-root')
    if (el?.dataset.platform) setP(el.dataset.platform)
  }, [ref, platform])
  return p
}

// 앱 바. iOS: 큰 제목(34) 아래 스크롤 시 인라인 제목(17 가운데). Android: Small 앱 바 64(제목 왼쪽 22), large 면 Medium 112.
export function AppBar({ title, large = false, onBack, backLabel = '뒤로', trailing, scrollTarget }) {
  const ref = useRef(null)
  const platform = useRootPlatform(ref)
  const [scrolled, setScrolled] = useState(false)
  useEffect(() => {
    const target = scrollTarget || window
    const onScroll = () => setScrolled((target.scrollY ?? target.scrollTop ?? 0) > 8)
    onScroll()
    target.addEventListener('scroll', onScroll, { passive: true })
    return () => target.removeEventListener('scroll', onScroll)
  }, [scrollTarget])
  const showLarge = large && !scrolled
  const BackIcon = platform === 'android' ? ArrowLeft : ChevronLeft
  return (
    <header ref={ref} className={`mob-bar ${scrolled ? 'scrolled' : ''}`}>
      <div className="mob-bar-row">
        <div className={`mob-bar-slot ${onBack ? '' : 'empty'}`}>
          {onBack && <button type="button" className="mob-icon-btn" onClick={onBack} aria-label={backLabel}><BackIcon size={24} aria-hidden="true" /></button>}
        </div>
        <h1 className="mob-bar-title" aria-hidden={showLarge && platform === 'ios' ? 'true' : undefined} data-hidden={showLarge && platform === 'ios' ? 'true' : undefined}>{title}</h1>
        <div className="mob-bar-slot">{trailing}</div>
      </div>
      {showLarge && platform === 'ios' && <div className="mob-bar-large"><p className="mob-t-display" role="heading" aria-level={1}>{title}</p></div>}
    </header>
  )
}

// 버튼. variant: filled | tonal | gray | plain | danger | danger-tonal. size: md | sm. Android 는 누름 물결.
export function Button({ variant = 'filled', size = 'md', block = false, className = '', onPointerDown, children, ...rest }) {
  const ref = useRef(null)
  const platform = useRootPlatform(ref)
  const handleDown = (e) => {
    if (platform === 'android' && ref.current && !rest.disabled) {
      const r = ref.current.getBoundingClientRect()
      const s = Math.max(r.width, r.height)
      const dot = document.createElement('span')
      dot.className = 'mob-ripple'
      dot.style.width = dot.style.height = `${s}px`
      dot.style.left = `${e.clientX - r.left - s / 2}px`
      dot.style.top = `${e.clientY - r.top - s / 2}px`
      ref.current.appendChild(dot)
      setTimeout(() => dot.remove(), 500)
    }
    onPointerDown?.(e)
  }
  return (
    <button ref={ref} type="button" className={`mob-btn v-${variant} size-${size} ${block ? 'block' : ''} ${className}`} onPointerDown={handleDown} {...rest}>
      {children}
    </button>
  )
}

export function IconButton({ label, children, ...rest }) {
  return <button type="button" className="mob-icon-btn" aria-label={label} {...rest}>{children}</button>
}


// 목록. iOS 그룹 inset(구분선), Android list item(1~3줄).
export function List({ label, children }) {
  return <ul className="mob-list" aria-label={label}>{children}</ul>
}

// 번호(V-18, MS-04-001, H-079)는 붙임표 뒤에서 줄이 바뀌지 않게 한 덩어리로 묶는다(글자는 그대로 두어 복사와 읽기 값은 같음)
// 괄호가 붙은 어절(기관(요양시설,)도 괄호 앞뒤에서 꺾이지 않게 한 덩어리로 묶는다
const CODE_RE = /([A-Z]{1,3}(?:-\d+)+,?|[^\s(),]+\([^\s()]*\)?,?)/g
export function keepCodes(text) {
  if (typeof text !== 'string' || !/[A-Z]-\d|\S\(/.test(text)) return text
  return text.split(CODE_RE).map((part, i) => (i % 2 ? <span key={i} className="mob-nb">{part}</span> : part))
}

export function ListRow({ lead, title, subtitle, meta, trailing, onClick, href, chevron, tall, className = '', ...rest }) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div'
  return (
    <li>
      <Tag className={`mob-row ${tall || meta ? 'tall' : ''} ${className.replace('mob-row', '').trim()}`.trim()} onClick={onClick} href={href} type={Tag === 'button' ? 'button' : undefined} {...rest}>
        {lead && <span className="mob-row-lead" aria-hidden="true">{lead}</span>}
        <span className="mob-row-main">
          <span className="mob-t-body">{keepCodes(title)}</span>
          {subtitle && <span className="mob-t-callout">{keepCodes(subtitle)}</span>}
          {meta && <span className="mob-t-sub">{keepCodes(meta)}</span>}
        </span>
        {(trailing || chevron) && <span className="mob-row-trail">{trailing}{chevron && <ChevronRight size={20} aria-hidden="true" />}</span>}
      </Tag>
    </li>
  )
}


// 세그먼트(iOS segmented, M3 segmented button). 단일 선택 radiogroup.
// radio 묶음 방향키 이동과 roving tabindex. 선택된 항목만 Tab 으로 들어가고 화살표로 옮기며 바로 고른다
export function radioProps(values, current, onChange, value) {
  const sel = values.includes(current) ? current : values[0]
  return {
    tabIndex: value === sel ? 0 : -1,
    onKeyDown: (e) => {
      const i = values.indexOf(value)
      let j = null
      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') j = (i + 1) % values.length
      else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') j = (i - 1 + values.length) % values.length
      else if (e.key === 'Home') j = 0
      else if (e.key === 'End') j = values.length - 1
      if (j == null) return
      e.preventDefault()
      onChange(values[j])
      const group = e.currentTarget.closest('[role="radiogroup"]')
      const items = group ? group.querySelectorAll('[role="radio"]') : []
      items[j]?.focus()
    }
  }
}

export function Segmented({ label, options, value, onChange }) {
  return (
    <div className="mob-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)} {...radioProps(options.map((x) => x.value), value, onChange, o.value)}>{value === o.value && <svg className="mob-seg-check" viewBox="0 0 24 24" aria-hidden="true"><path d="M9 16.2 4.8 12l-1.4 1.4L9 19 21 7l-1.4-1.4z" fill="currentColor" /></svg>}{o.label}</button>
      ))}
    </div>
  )
}

export function Toggle({ checked, onChange, label, ...rest }) {
  return <button type="button" role="switch" className="mob-toggle" aria-checked={!!checked} aria-label={label} onClick={() => onChange(!checked)} {...rest} />
}

export function Progress({ value, label }) {
  const indet = value == null
  return (
    <div className={`mob-progress ${indet ? 'indeterminate' : ''}`} role="progressbar" aria-label={label} aria-valuemin={0} aria-valuemax={100} aria-valuenow={indet ? undefined : Math.round(value)}>
      <span style={indet ? undefined : { width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  )
}

export function Spinner({ label = '불러오는 중' }) {
  return <div className="mob-spinner" role="status" aria-label={label} />
}

// 덮개 공통: Esc 닫기, 첫 입력 포커스, Tab 순환(포커스 가두기), 배경 inert, 닫은 뒤 원래 위치로 포커스.
// onClose 는 ref 로 보관하고 효과는 열림 전환에만 실행한다(입력할 때마다 첫 칸으로 포커스가 돌아가던 문제).
const FOCUSABLE = 'button:not([disabled]), [href], input:not([disabled]), textarea:not([disabled]), select:not([disabled]), [tabindex]:not([tabindex="-1"])'
export function trapTab(e, root) {
  if (e.key !== 'Tab' || !root) return false
  const items = [...root.querySelectorAll(FOCUSABLE)]
  if (!items.length) { e.preventDefault(); return true }
  const first = items[0]; const last = items[items.length - 1]
  const active = root.ownerDocument.activeElement
  if (e.shiftKey && (active === first || !root.contains(active))) { e.preventDefault(); last.focus(); return true }
  if (!e.shiftKey && (active === last || !root.contains(active))) { e.preventDefault(); first.focus(); return true }
  return false
}
function useOverlay(open, onClose) {
  const box = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose
  useEffect(() => {
    if (!open) return undefined
    const before = document.activeElement
    const onKey = (e) => { const overlays = document.querySelectorAll('.mob-sheet, .mob-dialog'); if (overlays.length && overlays[overlays.length - 1] !== box.current) return; if (e.key === 'Escape') closeRef.current?.(); else trapTab(e, box.current) }
    document.addEventListener('keydown', onKey)
    // 배경 inert: 덮개 바깥의 형제 요소를 잠시 비활성화
    const scrim = box.current?.parentElement
    const siblings = scrim?.parentElement ? [...scrim.parentElement.children].filter((el) => el !== scrim && !el.hasAttribute('inert')) : []
    siblings.forEach((el) => el.setAttribute('inert', ''))
    // 처음 포커스: data-autofocus 가 있으면 그 칸, 없으면 덮개 자체(첫 버튼에 포커스 테두리가 뜨지 않게)
    const first = box.current?.querySelector('[data-autofocus]')
    if (first) first.focus()
    else box.current?.focus({ preventScroll: true })
    return () => {
      document.removeEventListener('keydown', onKey)
      siblings.forEach((el) => el.removeAttribute('inert'))
      if (before && document.contains(before)) before.focus?.()
    }
  }, [open])
  return box
}

// 하단 시트(iOS 손잡이 있는 시트, M3 모달 바텀 시트).
export function Sheet({ open, onClose, title, hideTitle = false, center = false, children }) {
  const box = useOverlay(open, onClose)
  const id = useId()
  if (!open) return null
  return (
    <div className="mob-scrim" onClick={onClose}>
      <div ref={box} tabIndex={-1} className={`mob-sheet${center ? ' center' : ''}`} role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        {!center && <div className="mob-grabber" aria-hidden="true" />}
        <h2 id={id} className={hideTitle ? 'mob-sr-only' : 'mob-t-headline mob-sheet-title'}>{title}</h2>
        {children}
      </div>
    </div>
  )
}

// 알림 대화상자(iOS alert 300 폭 가운데 정렬, M3 dialog 312 폭 오른쪽 버튼).
export function Dialog({ open, onClose, title, body, actions }) {
  const box = useOverlay(open, onClose)
  const id = useId()
  if (!open) return null
  return (
    <div className="mob-scrim" onClick={onClose}>
      <div ref={box} tabIndex={-1} className="mob-dialog" role="alertdialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <div className="mob-dialog-body">
          <h2 id={id} className="mob-t-headline">{title}</h2>
          {body && <p className="mob-t-sub">{body}</p>}
        </div>
        <div className="mob-dialog-actions">{actions}</div>
      </div>
    </div>
  )
}

// 스낵바와 토스트. iOS 는 위쪽 배너형, Android 는 아래쪽 스낵바(344 폭).
const ToastContext = createContext(() => {})
function ToastHost({ children }) {
  const [toast, setToast] = useState(null)
  const timer = useRef(null)
  const show = useCallback((message, action) => {
    clearTimeout(timer.current)
    setToast({ message, action, key: Date.now() })
    timer.current = setTimeout(() => setToast(null), action ? 6000 : 3200)
  }, [])
  useEffect(() => () => clearTimeout(timer.current), [])
  return (
    <ToastContext.Provider value={show}>
      {children}
      <div className="mob-toast-wrap" role="status" aria-live="polite">
        {toast && (
          <div key={toast.key} className="mob-toast">
            <span className="mob-toast-text">{toast.message}</span>
            {toast.action && <Button variant="plain" size="sm" onClick={() => { toast.action.onClick(); setToast(null) }}>{toast.action.label}</Button>}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
export function useMobileToast() { return useContext(ToastContext) }


// 오프라인 띠. navigator.onLine 과 전송 대기 수를 함께 보여 준다.
export function OfflineBanner({ pending = 0 }) {
  const [online, setOnline] = useState(typeof navigator === 'undefined' ? true : navigator.onLine)
  useEffect(() => {
    const on = () => setOnline(true)
    const off = () => setOnline(false)
    window.addEventListener('online', on)
    window.addEventListener('offline', off)
    return () => { window.removeEventListener('online', on); window.removeEventListener('offline', off) }
  }, [])
  if (online && !pending) return null
  return (
    <List label="연결 상태">
      <ListRow lead={<WifiOff size={20} aria-hidden="true" />} role="status" className={online ? '' : 'tone-red-text'}
        title={online ? `보내는 중 ${pending}건` : '연결 끊김'} subtitle={online ? '연결되어 다시 보내는 중' : `보고는 휴대폰에 보관, 연결되면 전송${pending ? `, 대기 ${pending}건` : ''}`} />
    </List>
  )
}

export function EmptyState({ icon, title, body, action }) {
  return (
    <div className="mob-empty">
      <div className="mob-empty-icon" aria-hidden="true">{icon || <Inbox size={28} />}</div>
      <p className="mob-t-headline">{title}</p>
      {body && <p className="mob-t-sub">{body}</p>}
      {action}
    </div>
  )
}

// 이동 막대. 위치는 화면 크기로 정한다(layout.js).
// iOS 아래: 떠 있는 알약 탭 바(키트 Tab Bar - iPhone 3:70967, 402x95 pad 16/25/25/25, 탭 72x54)
// iOS 옆: iPhone Duo 세로 탭 바(12887:20935, 막대 84 폭, 탭 48x48 아이콘만, 이름은 화면 낭독기 글자)
// Android 아래: 내비게이션 바(58016:37259, 64 높이, 아이콘 칸 56x32), medium 이상: 내비게이션 레일(58016:36879, 96 폭)
export function BottomNav({ items, label = '주요 화면' }) {
  const { bar } = useLayout()
  return (
    <nav className={`mob-nav nav-${bar}`} aria-label={label}>
      <div className="mob-nav-inner">
        {items.map((it) => {
          const Tag = it.href ? 'a' : 'button'
          return (
            <Tag key={it.key} href={it.href} onClick={it.onClick} type={Tag === 'button' ? 'button' : undefined} aria-current={it.current ? 'page' : undefined} className="mob-nav-item">
              <span className="mob-nav-pill">
                {it.icon}
                {it.badge ? <span className="mob-nav-badge" aria-label={`${it.badge}건`}>{it.badge}</span> : null}
              </span>
              <span className="mob-nav-label">{it.label}</span>
            </Tag>
          )
        })}
      </div>
    </nav>
  )
}

// 큰 글자 설정 줄(더보기와 도우미 설정에서 씀). 화면 모양(아이폰, 안드로이드)은 기기에서 정한다:
// 휴대폰에서는 기기 종류, 컴퓨터 미리보기에서는 위쪽 기기 고르기(DeviceFrame.jsx).
export function DisplaySettings() {
  const { largeText, setLargeText } = usePlatform()
  return (
    <List label="화면 설정">
      <ListRow title="큰 글자" subtitle="글자와 버튼을 크게" trailing={<Toggle label="큰 글자" checked={largeText} onChange={setLargeText} />} />
    </List>
  )
}

// iOS text field / M3 filled text field. Native OS time picker is not invoked.
export function FilledInput({className='', type='text', ...props}) {
 if(type === 'time') return <TimePicker {...props} />
 return <input {...props} type={type} className={`mob-filled-input ${className}`} />
}

// App-owned sheet, never input[type=time] or a native select.
// iOS: 키트 'Date and time - Collapsed'(30:53803) 알약을 누르면 'Date and time - Pickers' Inline(51:56014) 카드가 시트로 열린다. 휠 없음.
// Android: M3 키트 'Keyboard picker'(52949:28053) 24시간 입력형.
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
// 날짜 격자: 행(row) 구조와 이동 가능한 칸 하나(roving tabindex). 좌우 하루, 위아래 한 주, Home과 End 주의 처음과 끝, PageUp과 PageDown 이전과 다음 달, Enter와 Space 선택
export function calendarKeyMove(date, key) {
  const d = new Date(date.getFullYear(), date.getMonth(), date.getDate())
  const shiftMonth = (k) => { const last = new Date(d.getFullYear(), d.getMonth() + k + 1, 0).getDate(); return new Date(d.getFullYear(), d.getMonth() + k, Math.min(d.getDate(), last)) }
  switch (key) {
    case 'ArrowLeft': return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 1)
    case 'ArrowRight': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 1)
    case 'ArrowUp': return new Date(d.getFullYear(), d.getMonth(), d.getDate() - 7)
    case 'ArrowDown': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + 7)
    case 'Home': return new Date(d.getFullYear(), d.getMonth(), d.getDate() - d.getDay())
    case 'End': return new Date(d.getFullYear(), d.getMonth(), d.getDate() + (6 - d.getDay()))
    case 'PageUp': return shiftMonth(-1)
    case 'PageDown': return shiftMonth(1)
    default: return null
  }
}
function IosInlineCalendar({ day, onDay }) {
  const [focus, setFocus] = useState(() => new Date(day.getFullYear(), day.getMonth(), day.getDate()))
  const view = new Date(focus.getFullYear(), focus.getMonth(), 1)
  const gridRef = useRef(null)
  const moved = useRef(false)
  const today = new Date()
  const first = view.getDay()
  const last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: Math.ceil((first + last) / 7) * 7 }, (_, n) => (n < first || n >= first + last ? null : n - first + 1))
  const rows = Array.from({ length: cells.length / 7 }, (_, r) => cells.slice(r * 7, r * 7 + 7))
  const same = (a, d) => a.getFullYear() === view.getFullYear() && a.getMonth() === view.getMonth() && a.getDate() === d
  const move = (k) => { const last2 = new Date(view.getFullYear(), view.getMonth() + k + 1, 0).getDate(); setFocus(new Date(view.getFullYear(), view.getMonth() + k, Math.min(focus.getDate(), last2))) }
  useEffect(() => {
    if (!moved.current) return
    moved.current = false
    gridRef.current?.querySelector('[tabindex="0"]')?.focus()
  }, [focus])
  const onKey = (e) => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); onDay(new Date(focus)); return }
    const next = calendarKeyMove(focus, e.key)
    if (!next) return
    e.preventDefault()
    moved.current = true
    setFocus(next)
  }
  return (
    <div className="mob-ios-cal">
      <div className="mob-ios-cal-head">
        <p className="mob-ios-cal-month" aria-live="polite">{view.getFullYear()}년 {view.getMonth() + 1}월<span className="mob-ios-cal-disc" aria-hidden="true"><ChevronRight size={13} strokeWidth={3} /></span></p>
        <span className="mob-ios-cal-arrows">
          <button type="button" className="mob-ios-cal-arrow" aria-label="이전 달" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
          <button type="button" className="mob-ios-cal-arrow" aria-label="다음 달" onClick={() => move(1)}><ChevronRight size={20} /></button>
        </span>
      </div>
      <div className="mob-ios-cal-week" aria-hidden="true">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div ref={gridRef} className="mob-ios-cal-grid" role="grid" aria-label={`${view.getFullYear()}년 ${view.getMonth() + 1}월 날짜`} onKeyDown={onKey}>
        {rows.map((row, r) => (
          <div key={r} role="row" className="mob-ios-cal-row">
            {row.map((d, c) => d === null ? <span key={'e' + c} role="gridcell" aria-hidden="true" /> : (
              <span key={d} role="gridcell" aria-selected={same(day, d)}>
                <button type="button" tabIndex={d === focus.getDate() ? 0 : -1} aria-label={`${view.getMonth() + 1}월 ${d}일${same(today, d) ? ', 오늘' : ''}`} className={`mob-ios-day ${same(today, d) ? 'is-today' : ''} ${same(day, d) ? 'is-selected' : ''}`} onClick={() => { const nd = new Date(view.getFullYear(), view.getMonth(), d); setFocus(nd); onDay(nd) }}>{d}</button>
              </span>
            ))}
          </div>
        ))}
      </div>
    </div>
  )
}
// 시와 분 칸: Tab 외에도 시 칸 끝에서 오른쪽 방향키, 분 칸 처음에서 왼쪽 방향키로 옮겨 가고, 시 두 자리를 치면 분 칸으로 넘어간다
function DigitPair({ hour, minute, setHour, setMinute, inputProps, className, onEnter }) {
  const hRef = useRef(null)
  const mRef = useRef(null)
  const atEnd = (el) => el.selectionStart === el.value.length && el.selectionEnd === el.value.length
  const atStart = (el) => el.selectionStart === 0 && el.selectionEnd === 0
  const keyH = (e) => { if (e.key === 'ArrowRight' && atEnd(e.currentTarget)) { e.preventDefault(); mRef.current?.focus(); mRef.current?.setSelectionRange(0, 0) } else if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }
  const keyM = (e) => { if ((e.key === 'ArrowLeft' || e.key === 'Backspace') && atStart(e.currentTarget)) { e.preventDefault(); hRef.current?.focus() } else if (e.key === 'Enter') { e.preventDefault(); onEnter?.() } }
  const changeH = (e) => { const v = e.target.value.replace(/\D/g, ''); setHour(v); if (v.length === 2) mRef.current?.focus() }
  return (
    <span className={className}>
      <input {...inputProps} ref={hRef} aria-label="시" inputMode="numeric" maxLength={2} value={hour} onChange={changeH} onKeyDown={keyH} />
      <span aria-hidden="true">:</span>
      <input ref={mRef} aria-label="분" inputMode="numeric" maxLength={2} value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, ''))} onKeyDown={keyM} />
    </span>
  )
}
export function TimePicker({ value = '', onChange, disabled, label = '시각', ...props }) {
  const { platform } = usePlatform()
  const [open, setOpen] = useState(false)
  const [hour, setHour] = useState('00')
  const [minute, setMinute] = useState('00')
  const [day, setDay] = useState(() => new Date())
  const choose = () => { const [h, m] = (validTime(value) ? value : timeValue(new Date().getHours(), new Date().getMinutes())).split(':'); setHour(h); setMinute(m); setOpen(true) }
  const result = timeValue(hour, minute)
  const ok = validTime(result)
  const commit = () => { onChange?.({ target: { value: result } }); setOpen(false) }
  const hint = !ok && <p role="alert" className="mob-t-sub">시 00-23, 분 00-59 입력</p>
  if (platform === 'android') {
    return (
      <span className="mob-time-control">
        <Button variant="gray" block disabled={disabled} onClick={choose} aria-label={`${label} 선택`}>{validTime(value) ? value : `${label} 선택`}</Button>
        <Sheet open={open} onClose={() => setOpen(false)} title={`${label} 입력`} hideTitle center>
          <div className="mob-m3-timepicker">
            <p className="mob-m3-tp-title" aria-hidden="true">{label} 입력</p>
            <div className="mob-m3-tp-sel">
              <DigitPair hour={hour} minute={minute} setHour={setHour} setMinute={setMinute} inputProps={{ ...props, 'data-autofocus': true }} className="mob-m3-tp-digits" onEnter={() => ok && commit()} />
              <span className="mob-m3-tp-caption" aria-hidden="true"><span>시</span><span>분</span></span>
              {hint}
            </div>
            <div className="mob-m3-tp-actions"><Button variant="plain" onClick={() => setOpen(false)}>취소</Button><Button variant="plain" disabled={!ok} onClick={commit}>확인</Button></div>
          </div>
        </Sheet>
      </span>
    )
  }
  return (
    <span className="mob-time-control">
      <span className="mob-ios-collapsed">
        <button type="button" className={`mob-ios-pill ${open ? 'is-selected' : ''}`} disabled={disabled} onClick={choose} aria-label={`${label} 날짜 선택`}>{day.getMonth() + 1}월 {day.getDate()}일</button>
        <button type="button" className={`mob-ios-pill ${open ? 'is-selected' : ''}`} disabled={disabled} onClick={choose} aria-label={`${label} 선택`}>{validTime(value) ? value : '선택'}</button>
      </span>
      <Sheet open={open} onClose={() => setOpen(false)} title={label}>
        <div className="mob-ios-inline">
          <IosInlineCalendar day={day} onDay={setDay} />
          <div className="mob-ios-inline-time"><span className="mob-t-body">시간</span><DigitPair hour={hour} minute={minute} setHour={setHour} setMinute={setMinute} inputProps={props} className="mob-ios-pill mob-ios-pill-input" onEnter={() => ok && commit()} /></div>
        </div>
        {hint}
        <div className="mob-h-sheet-actions"><Button block disabled={!ok} onClick={commit}>완료</Button><Button variant="plain" block onClick={() => setOpen(false)}>취소</Button></div>
      </Sheet>
    </span>
  )
}
export const FilledTextarea = ({className='', ...props}) => <textarea {...props} className={`mob-filled-input ${className}`} />



// ===== 벤치마크 공통 규칙 부품(공모전/모바일UI/벤치마크_20261022.md, 부품표_20261022.md) =====
// 화면 아래 주 동작. 주 버튼은 한 순간에 하나(채움, 전체 폭), 보조 동작은 그 아래 글자 버튼(약하게).
// iOS: Toolbar - Bottom - iPhone 4:55732 + Button Large 50(5473:21667), Android: Bottom app bar 51159:5105 + Button 57994:2227
export function BottomAction({ primary, secondary }) {
  return (
    <div className="mob-h-bottom mob-bottom-action">
      {primary && <Button block variant={primary.danger ? 'danger' : 'filled'} onClick={primary.onClick} disabled={primary.disabled} aria-describedby={primary.describedBy}>{primary.label}</Button>}
      {secondary && <Button block variant={secondary.danger ? 'danger-tonal' : 'plain'} onClick={secondary.onClick} disabled={secondary.disabled}>{secondary.label}</Button>}
    </div>
  )
}

// 긴급 버튼. 모든 단계에서 같은 자리(앱 바 오른쪽)에 작은 빨간 버튼으로 둔다.
// iOS: Toolbar 글자 버튼(Toolbar - Top - iPhone 1:54472), Android: App bar 끝 동작(58114:20565) + Button - tonal 58651:11237
export function EmergencyButton({ label = '대상자 상태 악화', onClick }) {
  return <Button variant="danger-tonal" size="sm" className="mob-emergency" onClick={onClick}>{label}</Button>
}

// 긴 설명은 화면에 문단으로 두지 않고 한 줄 행 뒤 시트로. 행: Row 550:50430 / List item 59106:13183, 시트: Sheet - iPhone 10525:1632 / Bottom sheet 51827:5859
export function InfoSheet({ lead, title, summary, sheetTitle, children, closeLabel = '닫기' }) {
  const [open, setOpen] = useState(false)
  return (
    <>
      <ListRow lead={lead} title={title} subtitle={summary} chevron onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title={sheetTitle || title}>
        {children}
        <Button block variant="plain" onClick={() => setOpen(false)}>{closeLabel}</Button>
      </Sheet>
    </>
  )
}

// ===== 도우미 화면 재구성(2a)에서 더한 키트 조합 부품 =====
// 큰 값 하나(기한, 다음 장소, 결과). iOS: Large Title 글자 역할(Text Styles 0:2194, 34/41 w700)을 묶음 목록 면(Lists 507:24675) 위에.
// Android: Headline Medium(Styles 49823:12141, 28/36)을 List 면(59106:13028) 위에. 위계 세 층(큰 값, 보조 한 줄, 주 버튼, 벤치마크 규칙 4)
export function Figure({ label, value, unit, caption, live, tone, plain = false, children }) {
  // plain: 카드 면 없이 바탕 위(현장 홈 큰 숫자). 기본: 목록 면 위(도우미 기한, 다음 장소)
  return (
    <section className={`mob-figure ${plain ? 'is-plain' : ''} ${tone ? `tone-${tone}` : ''}`} aria-label={label || undefined}>
      {label && <p className="mob-t-callout mob-figure-caption">{keepCodes(label)}</p>}
      <p className="mob-t-display mob-figure-value">{keepCodes(value)}{unit ? <span className="mob-t-body mob-figure-unit">{unit}</span> : null}</p>
      {caption && <p className="mob-t-callout mob-figure-caption" role={live ? 'timer' : undefined}>{keepCodes(caption)}</p>}
      {children}
    </section>
  )
}

// 고르기 행. iOS: Row 550:50430 + 끝 보조 표시 Checkmark(_Trailing 212:117586), Android: List item 59106:13183 + Trailing element Radio 59106:13365 또는 Checkbox 59106:13362.
// 칩 대신 쓴다(iOS 키트에 칩 없음). multiple 이면 체크 상자, 아니면 라디오.
export function SelectRow({ title, subtitle, selected, multiple = false, onSelect, disabled }) {
  const ref = useRef(null)
  const platform = useRootPlatform(ref)
  const mark = platform === 'android'
    ? <span className={`mob-select-mark ${multiple ? 'box' : 'radio'} ${selected ? 'on' : ''}`} aria-hidden="true">{selected ? <Check size={16} strokeWidth={3} /> : null}</span>
    : (selected ? <Check size={22} strokeWidth={2.6} className="mob-select-check" aria-hidden="true" /> : <span className="mob-select-empty" aria-hidden="true" />)
  return (
    <li>
      <button ref={ref} type="button" role={multiple ? 'checkbox' : 'radio'} aria-checked={!!selected} disabled={disabled} className={`mob-row mob-select ${selected ? 'selected' : ''}`} onClick={onSelect}>
        <span className="mob-row-main">
          <span className="mob-t-body">{title}</span>
          {subtitle && <span className="mob-t-callout">{subtitle}</span>}
        </span>
        <span className="mob-row-trail">{mark}</span>
      </button>
    </li>
  )
}
