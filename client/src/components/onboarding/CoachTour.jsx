// 코치마크 투어. 콘솔에 들어오거나 새로고침하면 화면마다 한 번 뜬다(저장 없음). ?tour=off 로 끈다.
// 한 단계는 영역 하나를 밝히고, 말풍선은 영역과 겹치지 않는 쪽에 놓인다. 영역 안은 그대로 눌러 볼 수 있고, 영역 밖 클릭은 가볍게 막기만 한다.
import { useCallback, useEffect, useLayoutEffect, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import { TOURS, resolveTargets, tourEnabled, unionRect } from './tours.js'

const seen = new Set() // 메모리에만 둔다. 새로고침하면 비워진다
let openRequest = null

export function requestTour(setter) { openRequest = setter }

const PAD = 8 // 영역 둘레 여백
const GAP = 16 // 영역과 말풍선 사이
const MARGIN = 16 // 화면 가장자리 여백
const BW = 340 // 말풍선 폭

// 영역과 겹치지 않는 자리를 아래, 위, 오른쪽, 왼쪽 순으로 찾는다. 없으면 영역 안쪽 아래 왼쪽에 둔다.
export function placeBubble(rect, size, vw, vh) {
  const hole = { l: rect.left - PAD, t: rect.top - PAD, r: rect.left + rect.width + PAD, b: rect.top + rect.height + PAD }
  const clampX = (x) => Math.max(MARGIN, Math.min(x, vw - size.w - MARGIN))
  const clampY = (y) => Math.max(MARGIN, Math.min(y, vh - size.h - MARGIN))
  const cx = rect.left + rect.width / 2
  const cy = rect.top + rect.height / 2
  const tries = [
    { side: 'below', left: clampX(cx - size.w / 2), top: hole.b + GAP, ok: hole.b + GAP + size.h + MARGIN <= vh },
    { side: 'above', left: clampX(cx - size.w / 2), top: hole.t - GAP - size.h, ok: hole.t - GAP - size.h >= MARGIN },
    { side: 'right', left: hole.r + GAP, top: clampY(cy - size.h / 2), ok: hole.r + GAP + size.w + MARGIN <= vw },
    { side: 'left', left: hole.l - GAP - size.w, top: clampY(cy - size.h / 2), ok: hole.l - GAP - size.w >= MARGIN }
  ]
  const pick = tries.find((t) => t.ok)
  if (pick) {
    // 화살표 끝이 영역 중심을 향하도록 말풍선 안 위치를 잡는다
    const arrow = pick.side === 'below' || pick.side === 'above'
      ? { x: Math.max(24, Math.min(cx - pick.left, size.w - 24)) }
      : { y: Math.max(24, Math.min(cy - pick.top, size.h - 24)) }
    return { ...pick, arrow }
  }
  return { side: 'inside', left: clampX(hole.l + 24), top: clampY(Math.min(hole.b, vh) - size.h - 24), arrow: null }
}

// 영역이 화면보다 크면 보이는 부분만 밝힌다(스포트라이트가 화면 밖으로 잘리지 않게)
export function clipToViewport(r) {
  if (!r || typeof window === 'undefined') return r
  const top = Math.max(r.top, PAD)
  const left = Math.max(r.left, PAD)
  const bottom = Math.min(r.top + r.height, window.innerHeight - PAD)
  const right = Math.min(r.left + r.width, window.innerWidth - PAD)
  return { left, top, width: Math.max(0, right - left), height: Math.max(0, bottom - top) }
}

export default function CoachTour() {
  const { pathname, search } = useLocation()
  const [active, setActive] = useState(null) // { steps:[{...step, els}], i }
  const [rect, setRect] = useState(null)
  const [size, setSize] = useState({ w: BW, h: 170 })
  const [nudge, setNudge] = useState(false)
  const bubbleRef = useRef(null)
  const enabled = tourEnabled(search)
  const hasTour = !!TOURS[pathname]

  const begin = useCallback(() => {
    const defs = TOURS[pathname] || []
    const steps = defs.map((d) => ({ ...d, els: resolveTargets(d) })).filter((s) => s.els.length)
    if (steps.length) setActive({ steps, i: 0 })
  }, [pathname])

  useEffect(() => {
    setActive(null)
    if (!enabled || !hasTour || seen.has(pathname)) return undefined
    const t = setTimeout(() => { seen.add(pathname); begin() }, 700)
    return () => clearTimeout(t)
  }, [pathname, enabled, hasTour, begin])

  useEffect(() => { requestTour(enabled && hasTour ? begin : null); return () => requestTour(null) }, [enabled, hasTour, begin])

  const step = active ? active.steps[active.i] : null
  const measure = useCallback(() => {
    if (!step) return setRect(null)
    const els = step.els.every((e) => document.body.contains(e)) ? step.els : resolveTargets(step)
    setRect(clipToViewport(unionRect(els)))
  }, [step])

  // 영역이 화면 밖이면 가운데로 스크롤한다(영역이 화면보다 크면 위쪽부터)
  useLayoutEffect(() => {
    if (!step) return undefined
    const first = step.els[0]
    const r0 = unionRect(step.els)
    if (r0 && first?.scrollIntoView) {
      const vh = window.innerHeight
      const out = r0.top < 72 || r0.top + r0.height > vh - 16
      if (out) first.scrollIntoView({ block: r0.height > vh * 0.8 ? 'start' : 'center', behavior: 'instant' })
    }
    measure()
    const raf = requestAnimationFrame(measure)
    window.addEventListener('resize', measure)
    window.addEventListener('scroll', measure, true)
    return () => { cancelAnimationFrame(raf); window.removeEventListener('resize', measure); window.removeEventListener('scroll', measure, true) }
  }, [step, measure])

  useLayoutEffect(() => {
    if (bubbleRef.current) {
      const q = bubbleRef.current.getBoundingClientRect()
      if (Math.abs(q.height - size.h) > 1) setSize({ w: BW, h: q.height })
    }
  })

  useEffect(() => { if (step) document.querySelector('[data-next]')?.focus() }, [step])

  const close = useCallback(() => setActive(null), [])
  const go = useCallback((d) => setActive((a) => {
    if (!a) return a
    const n = a.i + d
    return n < 0 ? a : n >= a.steps.length ? null : { ...a, i: n }
  }), [])
  const bump = useCallback(() => { setNudge(true); setTimeout(() => setNudge(false), 220) }, [])

  useEffect(() => {
    if (!active) return undefined
    const onKey = (e) => {
      if (e.key === 'Escape') close()
      else if (e.key === 'ArrowRight') go(1)
      else if (e.key === 'ArrowLeft') go(-1)
    }
    window.addEventListener('keydown', onKey)
    return () => window.removeEventListener('keydown', onKey)
  }, [active, close, go])

  const total = active?.steps.length || 0
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const place = rect ? placeBubble(rect, size, vw, vh) : null
  const hole = rect ? { left: rect.left - PAD, top: rect.top - PAD, width: rect.width + PAD * 2, height: rect.height + PAD * 2 } : null
  const dir = place?.side

  return (
    <>
      {enabled && hasTour && !active && (
        <Button size="sm" variant="secondary" onClick={begin} className="fixed right-[188px] top-[16px] z-30 hidden md:inline-flex">안내</Button>
      )}
      {active && step && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="false" aria-label={`화면 안내 ${active.i + 1}/${total}`}>
          {hole ? (
            <>
              {/* 영역 밖 네 면: 눌러도 아무 일 없이 말풍선만 살짝 흔든다. 영역 안은 비워 두어 그대로 누를 수 있다 */}
              <div className="absolute left-0 right-0 top-0" style={{ height: Math.max(0, hole.top) }} onClick={bump} />
              <div className="absolute left-0 right-0 bottom-0" style={{ top: hole.top + hole.height }} onClick={bump} />
              <div className="absolute left-0" style={{ top: hole.top, height: hole.height, width: Math.max(0, hole.left) }} onClick={bump} />
              <div className="absolute right-0" style={{ top: hole.top, height: hole.height, left: hole.left + hole.width }} onClick={bump} />
              <div
                aria-hidden="true"
                className="pointer-events-none absolute rounded-[16px]"
                style={{ ...hole, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)', outline: '2px solid #fff' }}
              />
            </>
          ) : <div className="absolute inset-0 bg-black/55" onClick={bump} />}
          <div
            ref={bubbleRef}
            data-side={dir || ''}
            className="absolute rounded-[16px] bg-page p-5 shadow-lg transition-transform"
            style={{ left: place ? place.left : 24, top: place ? place.top : 24, width: BW, transform: nudge ? 'translateY(-4px)' : 'none' }}
          >
            {place?.arrow && (
              <span
                aria-hidden="true"
                className="absolute h-3 w-3 rotate-45 bg-page"
                style={dir === 'below' ? { top: -6, left: place.arrow.x - 6 }
                  : dir === 'above' ? { bottom: -6, left: place.arrow.x - 6 }
                    : dir === 'right' ? { left: -6, top: place.arrow.y - 6 }
                      : { right: -6, top: place.arrow.y - 6 }}
              />
            )}
            <p className="type-caption text-text-sec tabular-nums">{active.i + 1} / {total}</p>
            <h2 className="mt-1 type-title text-text-pri">{step.title}</h2>
            <p className="mt-1 type-body text-text-pri">{step.body}</p>
            <div className="mt-4 flex items-center justify-between gap-2">
              <Button size="sm" variant="ghost" onClick={close}>건너뛰기</Button>
              <div className="flex gap-2">
                {active.i > 0 && <Button size="sm" variant="secondary" onClick={() => go(-1)}>이전</Button>}
                <Button data-next="1" size="sm" onClick={() => go(1)}>{active.i + 1 === total ? '완료' : '다음'}</Button>
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
