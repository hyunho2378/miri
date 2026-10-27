// 컴퓨터에서 휴대폰 화면을 볼 때의 틀. 휴대폰 하나를 실제 크기로 가운데에 두고, 위에서 기기를 고른다.
// 틀 안은 같은 주소를 iframe 으로 연다. iframe 의 창 폭이 곧 기기 폭이라 크기 등급, 레일, 두 단, 듀오 세로 막대가
// 컴퓨터 창이 아니라 고른 기기 크기로 정해진다. 창에 들어가지 않으면 틀 전체를 줄이되 틀 안 CSS 폭은 그대로다.
import { useEffect, useMemo, useRef, useState } from 'react'
import { useLocation } from 'react-router-dom'
import { DEVICE_OPTIONS, DEFAULT_DEVICE, DEVICE_KEY, deviceById, deviceSize, fitScale, frameSrc, resolveDevice } from './devices.js'
import './tokens.css'
import './device-frame.css'

const FRAME_PAD = 8   // M3 Utilities Device frame 50770:11451 선 두께 8
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
    return resolveDevice(q) || (DEVICE_OPTIONS.find((o) => o.key === readStore())?.id || DEFAULT_DEVICE)
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const initialKey = useMemo(() => {
    const q = new URLSearchParams(loc.search).get('device') || ''
    if (!q) { const st = DEVICE_OPTIONS.find((o) => o.key === readStore()); if (st) return st.key }
    const k = q.trim().toLowerCase()
    const land = /(land|가로|inner|_in|-in|^fold_?in|^duo_?in)/.test(k)
    const o = DEVICE_OPTIONS.find((x) => x.id === initialId && x.landscape === land && (x.id === 'fold' || x.id === 'duo' || !land)) || DEVICE_OPTIONS.find((x) => x.id === initialId)
    return o.key
  }, [])   // eslint-disable-line react-hooks/exhaustive-deps
  const [optKey, setOptKey] = useState(initialKey)
  const opt = DEVICE_OPTIONS.find((o) => o.key === optKey) || DEVICE_OPTIONS[0]
  const id = opt.id
  const landscape = opt.landscape
  // 주소의 기기 이름을 알아보지 못하면 조용히 바꾸지 않고 위 기기 고르기에서 고르게 알린다
  const unknownDevice = useMemo(() => { const q = new URLSearchParams(loc.search).get('device'); return q && !resolveDevice(q) ? q : null }, [])   // eslint-disable-line react-hooks/exhaustive-deps
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

  // 기기를 바꿔도 iframe 을 다시 열지 않는다. 크기만 바꾸고 화면 모양(iOS, Material)은 메시지로 알려 보던 화면을 유지한다.
  const choose = (nextKey) => {
    if (nextKey === optKey) return
    const nextId = DEVICE_OPTIONS.find((o) => o.key === nextKey).id
    writeStore(nextKey)
    setOptKey(nextKey)
    try { frameRef.current?.contentWindow?.postMessage({ type: 'miri-mobile-platform', platform: deviceById(nextId).platform }, window.location.origin) } catch { /* 틀이 아직 열리지 않았으면 다음 열기에서 적용 */ }
  }

  // 기기 틀: 키트 기기 그림이 있으면 그림의 화면 구멍에 맞춰 iframe 을 놓고, 없으면(갤럭시, 폴드) 키트 Device frame 값으로 그린다.
  const kit = landscape ? (device.frameLandscape || device.frame) : device.frame
  const rotated = !!(landscape && device.frame && !device.frameLandscape)
  let box, hole
  if (kit) {
    const fw = kit.w, fh = kit.h
    box = rotated ? { w: fh, h: fw } : { w: fw, h: fh }
    hole = rotated
      ? { x: kit.y, y: fw - (kit.x + device.width), w: device.height, h: device.width }
      : { x: kit.x, y: kit.y, w: size.width, h: size.height }
  } else {
    box = { w: size.width + FRAME_PAD * 2, h: size.height + FRAME_PAD * 2 }
    hole = { x: FRAME_PAD, y: FRAME_PAD, w: size.width, h: size.height }
  }
  const scale = fitScale({ width: box.w, height: box.h }, avail, 0)
  const outerW = Math.round(box.w * scale)
  const outerH = Math.round(box.h * scale)

  return (
    <div className="dev-host">
      <header className="dev-head">
        <div className="dev-title">
          <h1>미리 휴대폰 화면</h1>
          {unknownDevice && <p role="status">기기 미확인, 오른쪽에서 기기 선택</p>}
        </div>
        <div className="dev-pick" role="radiogroup" aria-label="기기">
          {DEVICE_OPTIONS.map((o) => (
            <button key={o.key} type="button" role="radio" aria-checked={o.key === optKey} className={o.key === optKey ? 'on' : ''} onClick={() => choose(o.key)}>{o.label}</button>
          ))}
        </div>
      </header>
      <main className="dev-stage">
        <div className="dev-outer" style={{ width: outerW, height: outerH }}>
          <div className={`dev-body ${kit ? 'kit' : 'p-android'}`} style={{ width: box.w, height: box.h, transform: `scale(${scale})` }}>
            {kit && (
              <img className="dev-bezel" alt="" aria-hidden="true" src={kit.src} width={kit.w} height={kit.h}
                style={rotated ? { transformOrigin: 'top left', transform: `translateY(${kit.w}px) rotate(-90deg)` } : undefined} />
            )}
            <iframe ref={frameRef} title={`${device.label} 화면`} src={src} className="dev-screen"
              style={{ left: hole.x, top: hole.y, width: hole.w, height: hole.h }} />
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
