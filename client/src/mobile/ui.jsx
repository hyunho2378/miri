import { ROLE_OPTIONS } from '../lib/helperConsent.js'
// 미리 모바일 공용 부품. 같은 API, 플랫폼별 모양(docs/MOBILE_UI.md 5장 부품 대응).
// 모양 차이는 mobile.css 의 .mob-root.platform-ios / .platform-android 토큰이 맡고,
// 구조 차이(앱 바 큰 제목, 대화상자 버튼 배치, 토스트 위치, 물결)는 여기서 나눈다.
import { createContext, useCallback, useContext, useEffect, useId, useRef, useState } from 'react'
import { ChevronLeft, ArrowLeft, ChevronRight, WifiOff, Inbox } from 'lucide-react'
import { usePlatform } from './usePlatform.js'
import { HELPER_PHRASES, AVOID_PHRASES, EMERGENCY, PREDEPARTURE } from '../lib/helperGuidance.js'
import { validTime, timeValue } from './time.js'
import './tokens.css'
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
// radio 묶음 방향키 이동과 roving tabindex(GPT 9차 M7). 선택된 항목만 Tab 으로 들어가고 화살표로 옮기며 바로 고른다
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
// GPT 8차 H2: onClose 는 ref 로 보관하고 효과는 열림 전환에만 실행한다(입력할 때마다 첫 칸으로 포커스가 돌아가던 문제).
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
    box.current?.querySelector(FOCUSABLE)?.focus()
    return () => {
      document.removeEventListener('keydown', onKey)
      siblings.forEach((el) => el.removeAttribute('inert'))
      if (before && document.contains(before)) before.focus?.()
    }
  }, [open])
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

// iOS text field / M3 filled text field. Native OS time picker is not invoked.
export function FilledInput({className='', type='text', ...props}) {
 if(type === 'time') return <TimePicker {...props} />
 return <input {...props} type={type} className={`mob-filled-input ${className}`} />
}

// App-owned sheet, never input[type=time] or a native select.
// iOS: 키트 'Date and time - Collapsed'(30:53803) 알약을 누르면 'Date and time - Pickers' Inline(51:56014) 카드가 시트로 열린다. 휠 없음.
// Android: M3 키트 'Keyboard picker'(52949:28053) 24시간 입력형.
const WEEK = ['일', '월', '화', '수', '목', '금', '토']
function IosInlineCalendar({ day, onDay }) {
  const [view, setView] = useState(() => new Date(day.getFullYear(), day.getMonth(), 1))
  const today = new Date()
  const first = view.getDay()
  const last = new Date(view.getFullYear(), view.getMonth() + 1, 0).getDate()
  const cells = Array.from({ length: first + last }, (_, n) => (n < first ? null : n - first + 1))
  const same = (a, d) => a.getFullYear() === view.getFullYear() && a.getMonth() === view.getMonth() && a.getDate() === d
  const move = (k) => setView(new Date(view.getFullYear(), view.getMonth() + k, 1))
  return (
    <div className="mob-ios-cal">
      <div className="mob-ios-cal-head">
        <p className="mob-ios-cal-month">{view.getFullYear()}년 {view.getMonth() + 1}월<span className="mob-ios-cal-disc" aria-hidden="true"><ChevronRight size={13} strokeWidth={3} /></span></p>
        <span className="mob-ios-cal-arrows">
          <button type="button" className="mob-ios-cal-arrow" aria-label="이전 달" onClick={() => move(-1)}><ChevronLeft size={20} /></button>
          <button type="button" className="mob-ios-cal-arrow" aria-label="다음 달" onClick={() => move(1)}><ChevronRight size={20} /></button>
        </span>
      </div>
      <div className="mob-ios-cal-week" aria-hidden="true">{WEEK.map((w) => <span key={w}>{w}</span>)}</div>
      <div className="mob-ios-cal-grid" role="grid" aria-label="날짜">
        {cells.map((d, n) => d === null ? <span key={'e' + n} /> : (
          <button key={d} type="button" role="gridcell" aria-selected={same(day, d)} className={`mob-ios-day ${same(today, d) ? 'is-today' : ''} ${same(day, d) ? 'is-selected' : ''}`} onClick={() => onDay(new Date(view.getFullYear(), view.getMonth(), d))}>{d}</button>
        ))}
      </div>
    </div>
  )
}
function DigitPair({ hour, minute, setHour, setMinute, inputProps, className }) {
  return (
    <span className={className}>
      <input {...inputProps} aria-label="시" inputMode="numeric" maxLength={2} value={hour} onChange={(e) => setHour(e.target.value.replace(/\D/g, ''))} />
      <span aria-hidden="true">:</span>
      <input aria-label="분" inputMode="numeric" maxLength={2} value={minute} onChange={(e) => setMinute(e.target.value.replace(/\D/g, ''))} />
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
  const hint = !ok && <p role="alert" className="mob-t-sub">시는 00부터 23, 분은 00부터 59까지 입력해 주세요.</p>
  if (platform === 'android') {
    return (
      <span className="mob-time-control">
        <Button variant="gray" block disabled={disabled} onClick={choose} aria-label={`${label} 선택`}>{validTime(value) ? value : `${label} 선택`}</Button>
        <Sheet open={open} onClose={() => setOpen(false)} title={`${label} 입력`}>
          <div className="mob-m3-timepicker">
            <p className="mob-m3-tp-title">시각 입력</p>
            <DigitPair hour={hour} minute={minute} setHour={setHour} setMinute={setMinute} inputProps={props} className="mob-m3-tp-digits" />
            <span className="mob-m3-tp-caption" aria-hidden="true"><span>시</span><span>분</span></span>
            {hint}
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
          <div className="mob-ios-inline-time"><span className="mob-t-body">시간</span><DigitPair hour={hour} minute={minute} setHour={setHour} setMinute={setMinute} inputProps={props} className="mob-ios-pill mob-ios-pill-input" /></div>
        </div>
        {hint}
        <div className="mob-h-sheet-actions"><Button block disabled={!ok} onClick={commit}>완료</Button><Button variant="plain" block onClick={() => setOpen(false)}>취소</Button></div>
      </Sheet>
    </span>
  )
}
export const FilledTextarea = ({className='', ...props}) => <textarea {...props} className={`mob-filled-input ${className}`} />
export function BottomActions({children}) { return <div className="mob-h-bottom">{children}</div> }

export function SafetyGuidance({beforeDeparture=false}) {
 const [open,setOpen]=useState(false)
 return <><Banner tone="red">{EMERGENCY}</Banner>{beforeDeparture&&<Banner tone="blue">{PREDEPARTURE}</Banner>}<List><ListRow href="tel:119" title="119 연결" subtitle="현재 위치와 의식 및 호흡 변화 전달" chevron /><ListRow title="상황별 안내 문구" subtitle="권장 문구 6개와 피할 표현" onClick={()=>setOpen(true)} chevron /></List><Sheet open={open} onClose={()=>setOpen(false)} title="상황별 안내 문구"><List>{HELPER_PHRASES.map(([title,subtitle])=><ListRow key={title} title={title} subtitle={subtitle} />)}<ListRow title="피할 표현" subtitle={AVOID_PHRASES.join(', ')} /><ListRow title="전달 방법" subtitle="천천히 말하고 한 번에 한 가지 정보만 전달해 주세요." /></List><Button block variant="plain" onClick={()=>setOpen(false)}>닫기</Button></Sheet></>
}

export function HelperConsent({onChange,withdraw=false}) {
 const [roles,setRoles]=useState(['ride']);const [sent,setSent]=useState(false)
 return <Card><p className="mob-t-headline">참여 동의</p><p className="mob-t-sub">참여와 역할은 본인이 선택합니다.</p><p className="mob-t-sub">참여를 거절하거나 동의를 철회해도 불이익이 없습니다. 배정 불가 응답과 등록 동의 철회는 별개입니다.</p><div className="mob-h-chips">{Object.entries(ROLE_OPTIONS).map(([value,label])=><Chip key={value} selected={roles.includes(value)} onClick={()=>setRoles(r=>r.includes(value)?r.filter(x=>x!==value):[...r,value])}>{label}</Chip>)}</div><div className="mob-h-sheet-actions"><Button block disabled={!roles.length} variant="tonal" onClick={()=>{onChange(true,roles);setSent(true)}}>선택한 역할로 참여 동의</Button>{withdraw&&<Button block variant="plain" onClick={()=>{onChange(false,roles);setSent(true)}}>등록 동의 철회 요청</Button>}</div>{sent&&<p role="status" className="mob-t-sub">요청을 기록했습니다. 연결이 없으면 전송 대기에 보관하며 담당자 화면과 동기화 후 다음 배정 후보에 반영합니다. 현재 배정은 담당자에게 연락해 조정해 주세요.</p>}</Card>
}
