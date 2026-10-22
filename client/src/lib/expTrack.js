// 체험 기록 브라우저 쪽. 주소에 ?exp=yeollim 처럼 출처가 붙어 들어온 사람에게만 동의를 묻고, 동의하면
// 화면 키와 머문 시각, 정해진 버튼 키만 묶어 /api/exp 로 보낸다(페이지를 떠날 때도 sendBeacon). 동의하지 않으면 아무것도 보내지 않는다.
import { useEffect } from 'react'
import { actionKeyOf, sourceOf } from './expSchema.js'

const SS = { src: 'miri.exp.src', consent: 'miri.exp.consent', id: 'miri.exp.id', start: 'miri.exp.start', seq: 'miri.exp.seq' }
const ss = {
  get: (k) => { try { return window.sessionStorage.getItem(k) } catch { return null } },
  set: (k, v) => { try { window.sessionStorage.setItem(k, v) } catch { /* 사생활 모드 */ } }
}
let buf = []
let cur = null
let timer = null
let wired = false

// 주소의 exp 값을 이 탭에 기억한다(화면을 옮겨도 유지)
export function expCapture(search = typeof window !== 'undefined' ? window.location.search : '') {
  const m = /[?&]exp=([^&#]+)/.exec(search || '')
  if (!m) return ss.get(SS.src)
  const src = sourceOf(decodeURIComponent(m[1]))
  if (src && src !== ss.get(SS.src)) { ss.set(SS.src, src); ss.set(SS.consent, '') }
  return ss.get(SS.src)
}
export const expSource = () => ss.get(SS.src) || null
export const expConsent = () => ss.get(SS.consent) || '' // 'yes' | 'no' | ''
export const expActive = () => !!expSource() && expConsent() === 'yes'

function newId() {
  const a = new Uint8Array(10)
  window.crypto.getRandomValues(a)
  return Array.from(a, (x) => (x % 36).toString(36)).join('') + Date.now().toString(36).slice(-4)
}
const devOf = () => { const u = navigator.userAgent || ''; return /iPhone|iPad|iPod/i.test(u) ? 'ios' : /Android/i.test(u) ? 'android' : 'other' }
const wbOf = () => { const w = window.innerWidth || 0; return w < 600 ? 's' : w < 840 ? 'm' : 'l' }
const tNow = () => Math.max(0, Date.now() - Number(ss.get(SS.start) || Date.now()))

export function expDecide(yes) {
  ss.set(SS.consent, yes ? 'yes' : 'no')
  if (!yes) return
  if (!ss.get(SS.id)) { ss.set(SS.id, newId()); ss.set(SS.start, String(Date.now())); ss.set(SS.seq, '0') }
  wire()
  if (cur) push({ y: 'v', s: cur })
}

function push(e) {
  if (!expActive()) return
  buf.push({ ...e, t: tNow() })
  if (buf.length >= 150) flush()
}

export function flush(useBeacon = false) {
  if (!expActive() || !buf.length) return false
  const seq = Number(ss.get(SS.seq) || 0)
  const body = JSON.stringify({ id: ss.get(SS.id), src: expSource(), dev: devOf(), wb: wbOf(), seq, ev: buf.slice(0, 200) })
  buf = buf.slice(200)
  ss.set(SS.seq, String(seq + 1))
  try {
    const blob = new Blob([body], { type: 'text/plain' })
    if (useBeacon && navigator.sendBeacon && navigator.sendBeacon('/api/exp', blob)) return true
    fetch('/api/exp', { method: 'POST', body, headers: { 'content-type': 'text/plain' }, keepalive: true, credentials: 'omit' }).catch(() => {})
    return true
  } catch { return false }
}

function wire() {
  if (wired || typeof window === 'undefined') return
  wired = true
  document.addEventListener('click', (ev) => {
    if (!expActive()) return
    const el = ev.target?.closest?.('button,[role="button"],a,[data-exp]')
    if (!el || el.closest('[data-exp-ignore]')) return
    const label = el.dataset?.exp || el.getAttribute('aria-label') || el.textContent || ''
    push({ y: 'a', k: el.dataset?.exp && /^[a-z_]+$/.test(el.dataset.exp) ? el.dataset.exp : actionKeyOf(label), ...(cur ? { s: cur } : {}) })
  }, true)
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'hidden') { push({ y: 'h' }); flush(true) } else push({ y: 'r' })
  })
  window.addEventListener('pagehide', () => { push({ y: 'h' }); flush(true) })
  window.addEventListener('error', () => { if (cur) push({ y: 'e', s: cur }) })
  timer = setInterval(() => flush(), 10_000)
}

// 화면이 바뀔 때 부른다. 같은 화면이면 무시
export function expScreen(key) {
  if (!key || key === cur) return
  cur = key
  if (key.startsWith('err.')) push({ y: 'e', s: key })
  push({ y: 'v', s: key })
}
export function useExpScreen(key) {
  useEffect(() => { if (expActive()) wire(); expScreen(key) }, [key])
}

// 시험용
export function _expReset() { buf = []; cur = null; clearInterval(timer); timer = null; wired = false }
export const _expBuf = () => buf
