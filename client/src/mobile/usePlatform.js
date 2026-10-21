// 플랫폼과 큰 글자 모드를 정하고 body 클래스를 붙이는 훅. 수동 전환은 sessionStorage 에 남긴다.
import { createContext, createElement, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { LARGE_TEXT_KEY, STORAGE_KEY, bodyClassFor, normalizePlatform, resolvePlatform } from './platform.js'

const PlatformContext = createContext(null)

function readStore(key) {
  try { return window.sessionStorage.getItem(key) } catch { return null }
}
function writeStore(key, value) {
  try { window.sessionStorage.setItem(key, value) } catch { /* 저장 불가 브라우저는 이번 화면에서만 적용 */ }
}

export function PlatformProvider({ children }) {
  const initial = useMemo(() => resolvePlatform({
    search: typeof window === 'undefined' ? '' : window.location.search,
    stored: typeof window === 'undefined' ? null : readStore(STORAGE_KEY),
    userAgent: typeof navigator === 'undefined' ? '' : navigator.userAgent
  }), [])
  const [platform, setPlatformState] = useState(initial.platform)
  const [source, setSource] = useState(initial.source)
  const [largeText, setLargeTextState] = useState(() => readStore(LARGE_TEXT_KEY) === '1')

  useEffect(() => {
    if (initial.source === 'query') writeStore(STORAGE_KEY, initial.platform)
  }, [initial])

  useEffect(() => {
    const classes = bodyClassFor(platform, largeText)
    document.body.classList.add(...classes)
    return () => document.body.classList.remove(...classes)
  }, [platform, largeText])

  const setPlatform = useCallback((next) => {
    const p = normalizePlatform(next)
    if (!p) return
    writeStore(STORAGE_KEY, p)
    setPlatformState(p)
    setSource('manual')
  }, [])
  const setLargeText = useCallback((on) => {
    writeStore(LARGE_TEXT_KEY, on ? '1' : '0')
    setLargeTextState(!!on)
  }, [])

  const value = useMemo(() => ({ platform, source, isIOS: platform === 'ios', isAndroid: platform === 'android', setPlatform, largeText, setLargeText }), [platform, source, setPlatform, largeText, setLargeText])
  return createElement(PlatformContext.Provider, { value }, children)
}

export function usePlatform() {
  const ctx = useContext(PlatformContext)
  if (!ctx) throw new Error('usePlatform 은 PlatformProvider 안에서만 씀')
  return ctx
}
