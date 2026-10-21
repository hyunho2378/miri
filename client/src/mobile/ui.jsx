// 미리 모바일 공용 부품. 같은 API, 플랫폼별 모양(docs/MOBILE_UI.md 5장 부품 대응).
// 모양 차이는 mobile.css 의 .mob-root.platform-ios / .platform-android 토큰이 맡고,
// 구조 차이(앱 바 큰 제목, 대화상자 버튼 배치, 토스트 위치, 물결)는 여기서 나눈다.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ArrowLeft, ChevronRight, WifiOff, Inbox } from 'lucide-react'
import { usePlatform } from './usePlatform.js'
import './mobile.css'

// 셸 바깥 껍데기. 플랫폼과 큰 글자 클래스를 이 요소에 붙여 토큰을 고정한다.
export function MobileRoot({ platform: forced, className = '', children, ...rest }) {
  const { platform, largeText } = usePlatform()
  const p = forced || platform
  return (
    <div className={`mob-root platform-${p} ${largeText ? 'text-large' : ''} ${className}`} data-platform={p} {...rest}>
      <ToastHost>{children}</ToastHost>
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
        <h1 className="mob-bar-title" aria-hidden={showLarge && platform === 'ios' ? 'true' : undefined} style={showLarge && platform === 'ios' ? { opacity: 0 } : undefined}>{title}</h1>
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

export function Card({ filled = false, className = '', children, ...rest }) {
  return <section className={`mob-card ${filled ? 'filled' : ''} ${className}`} {...rest}>{children}</section>
}

// 목록. iOS 그룹 inset(구분선), Android list item(1~3줄).
export function List({ label, children }) {
  return <ul className="mob-list" aria-label={label}>{children}</ul>
}

export function ListRow({ lead, title, subtitle, meta, trailing, onClick, href, chevron, tall, ...rest }) {
  const Tag = href ? 'a' : onClick ? 'button' : 'div'
  return (
    <li>
      <Tag className={`mob-row ${tall || meta ? 'tall' : ''}`} onClick={onClick} href={href} type={Tag === 'button' ? 'button' : undefined} {...rest}>
        {lead && <span className="mob-row-lead" aria-hidden="true">{lead}</span>}
        <span className="mob-row-main">
          <span className="mob-t-body">{title}</span>
          {subtitle && <span className="mob-t-sub">{subtitle}</span>}
          {meta && <span className="mob-t-foot">{meta}</span>}
        </span>
        {(trailing || chevron) && <span className="mob-row-trail">{trailing}{chevron && <ChevronRight size={20} aria-hidden="true" />}</span>}
      </Tag>
    </li>
  )
}

export function Chip({ selected, tone, onClick, children, ...rest }) {
  if (onClick) return <button type="button" className={`mob-chip ${selected ? 'selected' : ''} ${tone ? `tone-${tone}` : ''}`} aria-pressed={!!selected} onClick={onClick} {...rest}>{children}</button>
  return <span className={`mob-chip ${tone ? `tone-${tone}` : ''}`} {...rest}>{children}</span>
}

// 세그먼트(iOS segmented, M3 segmented button). 단일 선택 radiogroup.
export function Segmented({ label, options, value, onChange }) {
  return (
    <div className="mob-seg" role="radiogroup" aria-label={label}>
      {options.map((o) => (
        <button key={o.value} type="button" role="radio" aria-checked={value === o.value} onClick={() => onChange(o.value)}>{o.label}</button>
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

// 덮개 공통: Esc 닫기, 첫 버튼 포커스, 바깥 누르면 닫기, 닫은 뒤 원래 위치로 포커스.
function useOverlay(open, onClose) {
  const box = useRef(null)
  useEffect(() => {
    if (!open) return undefined
    const before = document.activeElement
    const onKey = (e) => { if (e.key === 'Escape') onClose?.() }
    document.addEventListener('keydown', onKey)
    const first = box.current?.querySelector('button, [href], input, textarea, select')
    first?.focus()
    return () => { document.removeEventListener('keydown', onKey); before?.focus?.() }
  }, [open, onClose])
  return box
}

// 하단 시트(iOS 손잡이 있는 시트, M3 모달 바텀 시트).
export function Sheet({ open, onClose, title, children }) {
  const box = useOverlay(open, onClose)
  const id = useId()
  if (!open) return null
  return (
    <div className="mob-scrim" onClick={onClose}>
      <div ref={box} className="mob-sheet" role="dialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
        <div className="mob-grabber" aria-hidden="true" />
        <h2 id={id} className="mob-t-headline" style={{ marginBottom: 12 }}>{title}</h2>
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
      <div ref={box} className="mob-dialog" role="alertdialog" aria-modal="true" aria-labelledby={id} onClick={(e) => e.stopPropagation()}>
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
            <span style={{ flex: 1 }}>{toast.message}</span>
            {toast.action && <Button variant="plain" size="sm" onClick={() => { toast.action.onClick(); setToast(null) }}>{toast.action.label}</Button>}
          </div>
        )}
      </div>
    </ToastContext.Provider>
  )
}
export function useMobileToast() { return useContext(ToastContext) }

export function Banner({ tone = 'gray', icon, children }) {
  return <div className={`mob-banner tone-${tone}`} role={tone === 'red' ? 'alert' : 'status'}>{icon}{children}</div>
}

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
    <Banner tone={online ? 'blue' : 'red'} icon={<WifiOff size={20} aria-hidden="true" />}>
      {online ? `전송 대기 ${pending}건, 연결되어 다시 보내는 중` : `연결 끊김. 보고는 휴대폰에 보관 후 연결되면 전송${pending ? `, 대기 ${pending}건` : ''}`}
    </Banner>
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

// 하단 이동(iOS 탭 바, M3 내비게이션 바 알약). items: [{ key, label, icon, href|onClick, current, badge }]
export function BottomNav({ items, label = '주요 화면' }) {
  return (
    <nav className="mob-nav" aria-label={label}>
      <div className="mob-nav-inner">
        {items.map((it) => {
          const Tag = it.href ? 'a' : 'button'
          return (
            <Tag key={it.key} href={it.href} onClick={it.onClick} type={Tag === 'button' ? 'button' : undefined} aria-current={it.current ? 'page' : undefined}>
              <span className="mob-nav-pill" style={{ position: 'relative' }}>
                {it.icon}
                {it.badge ? <span className="mob-nav-badge" aria-label={`${it.badge}건`}>{it.badge}</span> : null}
              </span>
              <span>{it.label}</span>
            </Tag>
          )
        })}
      </div>
    </nav>
  )
}

// 큰 글자 모드와 플랫폼 수동 전환 줄(설정 화면과 부품 견본에서 씀).
export function DisplaySettings() {
  const { platform, setPlatform, largeText, setLargeText } = usePlatform()
  return (
    <List label="화면 설정">
      <ListRow title="화면 모양" subtitle="휴대폰 종류에 맞춤" trailing={
        <div style={{ width: 168 }}><Segmented label="화면 모양" value={platform} onChange={setPlatform} options={[{ value: 'ios', label: '아이폰' }, { value: 'android', label: '안드로이드' }]} /></div>
      } />
      <ListRow title="큰 글자" subtitle="본문 22, 버튼 56" trailing={<Toggle label="큰 글자" checked={largeText} onChange={setLargeText} />} />
    </List>
  )
}
