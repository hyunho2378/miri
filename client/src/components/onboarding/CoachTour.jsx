// 코치마크 투어. 콘솔에 들어오거나 새로고침하면 화면마다 한 번 뜬다(저장 없음). ?tour=off 로 끈다.
import { useCallback, useEffect, useLayoutEffect, useState } from 'react'
import { useLocation } from 'react-router-dom'
import Button from '../ui/Button.jsx'
import { TOURS, resolveTarget, tourEnabled } from './tours.js'

const seen = new Set() // 메모리에만 둔다. 새로고침하면 비워진다
let openRequest = null

export function requestTour(setter) { openRequest = setter }

export default function CoachTour() {
  const { pathname, search } = useLocation()
  const [active, setActive] = useState(null) // { steps:[{...step, el}], i }
  const [rect, setRect] = useState(null)
  const enabled = tourEnabled(search)
  const hasTour = !!TOURS[pathname]

  const begin = useCallback(() => {
    const defs = TOURS[pathname] || []
    const steps = defs.map((d) => ({ ...d, el: resolveTarget(d) })).filter((s) => s.el)
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
    const el = document.body.contains(step.el) ? step.el : resolveTarget(step)
    if (!el) return setRect(null)
    const r = el.getBoundingClientRect()
    setRect({ left: r.left, top: r.top, width: r.width, height: r.height })
  }, [step])

  useLayoutEffect(() => {
    if (!step) return undefined
    step.el.scrollIntoView?.({ block: 'center', behavior: 'instant' })
    measure()
    window.addEventListener('resize', measure)
    return () => window.removeEventListener('resize', measure)
  }, [step, measure])

  useEffect(() => { if (step) document.querySelector('[data-next]')?.focus() }, [step])

  const close = useCallback(() => setActive(null), [])
  const go = useCallback((d) => setActive((a) => {
    if (!a) return a
    const n = a.i + d
    return n < 0 ? a : n >= a.steps.length ? null : { ...a, i: n }
  }), [])

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
  const pad = 6
  const vw = typeof window !== 'undefined' ? window.innerWidth : 1440
  const vh = typeof window !== 'undefined' ? window.innerHeight : 900
  const bw = 320
  let bubble = { left: 24, top: 24 }
  if (rect) {
    const below = rect.top + rect.height + 16 + 180 < vh
    bubble = {
      left: Math.max(16, Math.min(rect.left, vw - bw - 16)),
      top: below ? rect.top + rect.height + pad + 12 : Math.max(16, rect.top - pad - 12 - 170)
    }
  }

  return (
    <>
      {enabled && hasTour && !active && (
        <Button size="sm" variant="secondary" onClick={begin} className="fixed right-[188px] top-[16px] z-30 hidden md:inline-flex">안내</Button>
      )}
      {active && step && (
        <div className="fixed inset-0 z-[90]" role="dialog" aria-modal="true" aria-label={`화면 안내 ${active.i + 1}/${total}`}>
          <div className="absolute inset-0" onClick={close} />
          {rect && (
            <div
              aria-hidden="true"
              className="pointer-events-none absolute rounded-[12px]"
              style={{ left: rect.left - pad, top: rect.top - pad, width: rect.width + pad * 2, height: rect.height + pad * 2, boxShadow: '0 0 0 9999px rgba(0,0,0,0.55)' }}
            />
          )}
          <div className="absolute rounded-[16px] bg-page p-5 shadow-lg" style={{ ...bubble, width: bw }}>
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
