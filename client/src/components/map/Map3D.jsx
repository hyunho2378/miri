// Map3D 상황판 3D 지도. three.js 장면(three/Region3D.js)을 React 에 붙이는 껍데기.
// 이 파일은 상황판 화면(lazy)에서만 불러오므로 three 는 다른 화면 번들에 섞이지 않는다.
// 장면은 한 번 만들고, 데이터가 바뀔 때는 메서드로 알린다(다시 만들지 않는다).
import { useEffect, useRef, useState } from 'react'
import Region3D from '../../three/Region3D.js'
import { EXAG } from '../../three/proj.js'
import { prefersReducedMotion } from '../motion/useReducedMotion.js'

export default function Map3D({
  theme = 'light', layers, villages, vehicles, shelters, ltc, fire, selected, onSelect, focus, fitSeq, scopeBounds, padding,
  dongStats, colorMode = 'shortage', spread = false, onReady
}) {
  const boxRef = useRef(null)
  const sceneRef = useRef(null)
  const propsRef = useRef({})
  const [tip, setTip] = useState(null)
  const [progress, setProgress] = useState(0)
  const [failed, setFailed] = useState(false)
  propsRef.current = { villages, onSelect, dongStats, onReady }

  // 장면 생성(한 번)
  useEffect(() => {
    const scene = new Region3D(boxRef.current, {
      theme, reducedMotion: prefersReducedMotion(),
      onProgress: (p, err) => { if (p < 0) { setFailed(true); console.error('3D 지형 오류', err) } else setProgress(p) },
      onReady: () => {
        setProgress(1)
        propsRef.current.onReady?.()
        const sb = propsRef.current.scopeBoundsNow
        if (sb) scene.fitBounds(sb)
      },
      onPick: (e) => {
        if (e.kind === 'village') propsRef.current.onSelect?.(e.code)
        else if (e.kind === 'piece' && e.lonlat) scene.flyToLonLat(e.lonlat[0], e.lonlat[1], e.dongCode ? 13 : 24)
      },
      onHover: (h) => {
        if (!h) { setTip(null); return }
        if (h.kind === 'village') {
          const v = propsRef.current.villages.find((x) => x.code === h.code)
          setTip(v ? { x: h.x, y: h.y, title: v.label, line: v.tipLine } : null)
        } else if (h.kind === 'tip') {
          setTip({ x: h.x, y: h.y, title: h.tip, line: '' })
        } else {
          const st = h.dongCode ? propsRef.current.dongStats?.[h.dongCode] : null
          setTip({
            x: h.x, y: h.y, title: `${h.sggName} ${h.name}`,
            line: st ? `대상자 ${st.targets}명, 미이송 예상 ${st.shortage}명, 고령화율 ${st.aging}%` : h.dongCode ? '' : '동해시 밖. 대피 대상 구역에 들어가지 않습니다'
          })
        }
      }
    })
    sceneRef.current = scene
    if (import.meta.env.DEV) window.__r3d = scene
    return () => { scene.dispose(); sceneRef.current = null }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  propsRef.current.scopeBoundsNow = scopeBounds

  useEffect(() => { sceneRef.current?.applyTheme(theme) }, [theme])
  useEffect(() => { sceneRef.current?.setLayers(layers) }, [layers])
  useEffect(() => {
    sceneRef.current?.setData({ villages, vehicles, shelters, ltc, fire, selected, dongStats, colorMode })
  }, [villages, vehicles, shelters, ltc, fire, selected, dongStats, colorMode])
  useEffect(() => { sceneRef.current?.setExplode(spread) }, [spread])
  const padKey = padding ? `${padding.top},${padding.right},${padding.bottom},${padding.left}` : ''
  useEffect(() => { if (padding) sceneRef.current?.setPadding(padding) }, [padKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (focus?.lngLat) sceneRef.current?.flyToLonLat(focus.lngLat[0], focus.lngLat[1], 9)
  }, [focus])
  const boundsKey = scopeBounds ? scopeBounds.map((x) => x.toFixed(4)).join(',') : ''
  useEffect(() => { if (scopeBounds && sceneRef.current?.ready) sceneRef.current.fitBounds(scopeBounds) }, [boundsKey]) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    if (!fitSeq || !sceneRef.current) return
    if (scopeBounds) sceneRef.current.fitBounds(scopeBounds)
    else sceneRef.current.setView(sceneRef.current.cityView())
  }, [fitSeq]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full w-full">
      <div ref={boxRef} className="relative h-full w-full overflow-hidden" role="region" aria-label="동해시와 접경 시군 3D 지도. 마을 표식은 Tab 키로 고를 수 있습니다" />
      {progress < 1 && !failed && (
        <div role="status" className="pointer-events-none absolute inset-x-0 top-1/2 z-raised mx-auto w-64 -translate-y-1/2 rounded-md bg-page px-4 py-3 shadow-md">
          <p className="type-strong text-text-pri">지형을 만드는 중</p>
          <p className="type-meta text-text-meta">읍면동 {Math.round(progress * 60)} / 60곳</p>
          <div className="mt-2 h-1.5 w-full rounded-full bg-mute"><div className="h-full rounded-full bg-primary" style={{ width: `${Math.round(progress * 100)}%` }} /></div>
        </div>
      )}
      {failed && (
        <p role="alert" className="absolute inset-x-0 top-1/2 z-raised mx-auto w-72 -translate-y-1/2 rounded-md bg-page px-4 py-3 type-body-sm text-danger-text shadow-md">
          3D 지형을 불러오지 못했습니다. 2D 지도로 전환해 계속 사용할 수 있습니다.
        </p>
      )}
      <p className="pointer-events-none absolute bottom-1 right-2 z-raised rounded-xs bg-page/80 px-1.5 py-0.5 type-caption text-text-sec">
        건물 국토교통부 GIS건물통합정보. 지형 Mapzen, AWS. 바탕 OpenStreetMap 기여자. 경계 vuski/admdongkor. 높이 {EXAG}배 과장
      </p>
      {tip && (
        <div role="presentation" className="pointer-events-none absolute z-raised max-w-source-col-md rounded-sm bg-text-pri px-3 py-2 text-text-inverse shadow-md" style={{ left: tip.x + 14, top: tip.y + 14 }}>
          <p className="type-strong">{tip.title}</p>
          {tip.line && <p className="type-meta">{tip.line}</p>}
        </div>
      )}
    </div>
  )
}
