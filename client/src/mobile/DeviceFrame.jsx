// 컴퓨터에서 휴대폰 화면을 볼 때의 틀. 휴대폰 하나를 실제 크기로 가운데에 두고, 위에서 기기를 고른다.
// 틀 안은 같은 주소를 iframe 으로 연다. iframe 의 창 폭이 곧 기기 폭이라 크기 등급, 레일, 두 단, 듀오 세로 막대가
// 컴퓨터 창이 아니라 고른 기기 크기로 정해진다. 창에 들어가지 않으면 틀 전체를 줄이되 틀 안 CSS 폭은 그대로다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DEVICES, DEFAULT_DEVICE, DEVICE_KEY, deviceById, deviceSize, fitScale, frameSrc } from './devices.js'
import './tokens.css'
import './device-frame.css'

const BEZEL = 24
const HEADER = 132

function readStore() {
  try { return window.sessionStorage.getItem(DEVICE_KEY) } catch { return null }
}
function writeStore(v) {
  try { window.sessionStorage.setItem(DEVICE_KEY, v) } catch { /* 저장 불가 브라우저는 이번 화면에서만 */ }
}
function readAvail() {
  return { availWidth: Math.max(320, window.innerWidth - 48), availHeight: Math.max(320, window.innerHeight - HEADER - 24) }
}

export default function DeviceFrameHost() {
  const loc = useLocation()
  const initialId = useMemo(() => {
    const q = new URLSearchParams(loc.search).get('device')
    return DEVICES.some((d) => d.id === q) ? q : (readStore() || DEFAULT_DEVICE)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const [id, setId] = useState(initialId)
  const [landscape, setLandscape] = useState(false)
  const device = deviceById(id)
  const size = deviceSize(device, landscape)
  const [src, setSrc] = useState(() => frameSrc(loc.pathname, loc.search, deviceById(initialId)))
  const [avail, setAvail] = useState(readAvail)
  const innerPath = useRef({ pathname: loc.pathname, search: loc.search })
  const frameRef = useRef(null)

  useEffect(() => {
    const on = () => setAvail(readAvail())
    window.addEventListener('resize', on)
    return () => window.removeEventListener('resize', on)
  }, [])

  // 틀 안에서 화면을 옮기면 바깥 주소도 맞춰 둔다(새로 고침해도 같은 화면).
  useEffect(() => {
    const on = (e) => {
      if (e.origin !== window.location.origin || e.data?.type !== 'miri-mobile-path') return
      const u = new URL(e.data.href, window.location.origin)
      u.searchParams.delete('frame'); u.searchParams.delete('platform')
      u.searchParams.set('device', id)
      innerPath.current = { pathname: u.pathname, search: u.search }
      window.history.replaceState(null, '', `${u.pathname}${u.search}`)
    }
    window.addEventListener('message', on)
    return () => window.removeEventListener('message', on)
  }, [id])

  const choose = (nextId) => {
    if (nextId === id) return
    writeStore(nextId)
    setId(nextId)
    setSrc(frameSrc(innerPath.current.pathname, innerPath.current.search, deviceById(nextId)))
  }

  const scale = fitScale(size, avail, BEZEL)
  const outerW = Math.round((size.width + BEZEL) * scale)
  const outerH = Math.round((size.height + BEZEL) * scale)

  return (
    <div className="dev-host">
      <header className="dev-head">
        <div className="dev-title">
          <h1>미리 휴대폰 화면</h1>
          <p>{device.label}, {size.width} x {size.height}, {device.platform === 'ios' ? 'iOS 모양' : 'Material 3 모양'}{scale < 1 ? `, 창에 맞춰 ${Math.round(scale * 100)}%로 줄임` : ', 실제 크기'}</p>
        </div>
        <div className="dev-pick" role="radiogroup" aria-label="기기">
          {DEVICES.map((d) => (
            <button key={d.id} type="button" role="radio" aria-checked={d.id === id} className={d.id === id ? 'on' : ''} onClick={() => choose(d.id)}>{d.label}</button>
          ))}
          <button type="button" className={`dev-rotate ${landscape ? 'on' : ''}`} aria-pressed={landscape} onClick={() => setLandscape((v) => !v)}>가로로 보기</button>
        </div>
      </header>
      <main className="dev-stage">
        <div className="dev-outer" style={{ width: outerW, height: outerH }}>
          <div className={`dev-body p-${device.platform}`} style={{ width: size.width + BEZEL, height: size.height + BEZEL, transform: `scale(${scale})` }}>
            <iframe ref={frameRef} key={`${id}-${src}`} title={`${device.label} 화면`} src={src} width={size.width} height={size.height} />
          </div>
        </div>
      </main>
    </div>
  )
}

// 틀 안(iframe)에서 화면이 바뀔 때 바깥 틀에 알린다.
export function useReportPathToFrame(location) {
  useEffect(() => {
    if (typeof window === 'undefined' || window.parent === window) return
    try { window.parent.postMessage({ type: 'miri-mobile-path', href: `${location.pathname}${location.search}` }, window.location.origin) } catch { /* 다른 출처 틀이면 알리지 않음 */ }
  }, [location.pathname, location.search])
}
