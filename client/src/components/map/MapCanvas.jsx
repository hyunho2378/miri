// MapCanvas 상황판 지도 본체. MapLibre GL(OpenFreeMap 바탕) + three.js 3D 막대 사용자 정의 레이어.
// 이 파일과 barsLayer.js 만 maplibre-gl 과 three 를 불러온다. 상황판 화면은 lazy 라 다른 화면 번들에 섞이지 않는다.
// 스타일 교체(밝은 바탕과 어두운 바탕) 때 바탕 스타일이 통째로 바뀌므로 style.load 마다 겹침 레이어를 다시 얹는다.
// 레이어 켜고 끄기는 anime.js 로 투명도를 움직인다(움직임 줄이기 설정이면 즉시).
import { useEffect, useRef, useState } from 'react'
import { Map as MlMap, Marker, MercatorCoordinate, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { DONGHAE_BBOX, cityOutlineFeature, dongFeatures, dongLabelFeatures, featureCollection, pointFeature } from '../../lib/geo.js'
import { fadeValue } from '../motion/fade.js'
import { prefersReducedMotion } from '../motion/useReducedMotion.js'
import { createBarsLayer } from './barsLayer.js'
import { OVERLAY, SEVERITY_COLOR, STYLE_URL } from './mapTheme.js'

setWorkerUrl(workerUrl)

const PITCH_3D = 55
const BEARING_3D = -12
const FONT = ['Noto Sans Regular']
const CENTER = [129.11, 37.52]
// 막대 높이 1명당 미터. 시 전체 화면에서 부족 12명 막대가 눈에 띄고 대상자 26명 막대도 화면 안에 들어오는 값
const M_PER_PERSON = 15
// 지형: AWS Terrain Tiles(Terrarium 인코딩, Mapzen 공개 DEM, 키 불필요). 3D 에서만 지형을 켠다
const DEM_TILES = ['https://s3.amazonaws.com/elevation-tiles-prod/terrarium/{z}/{x}/{y}.png']
const TERRAIN_EXAGGERATION = 1.5
const BBOX_CENTER = [(DONGHAE_BBOX[0] + DONGHAE_BBOX[2]) / 2, (DONGHAE_BBOX[1] + DONGHAE_BBOX[3]) / 2]
const FIT_GAP = 16
const ZOOM_3D = 0.3

// 시 전체가 보이는 카메라. 지도 여백(setPadding)은 MapLibre 가 맞춤 계산에 더한다
function cityCamera(map, mode) {
  const cam = map.cameraForBounds(DONGHAE_BBOX, { padding: FIT_GAP }) || { center: BBOX_CENTER, zoom: map.getZoom() }
  return mode === '3d'
    ? { center: cam.center, zoom: cam.zoom + ZOOM_3D, pitch: PITCH_3D, bearing: BEARING_3D }
    : { center: cam.center, zoom: cam.zoom, pitch: 0, bearing: 0 }
}
function moveTo(map, opts, duration) {
  if (prefersReducedMotion()) map.jumpTo(opts)
  else map.easeTo({ ...opts, duration })
}

// 레이어 묶음과 각 레이어의 기본 투명도. 묶음 투명도(0~1)를 곱해 적용한다
const GROUP_LAYERS = {
  dongs: [['dong-line', 'line-opacity', 0.9], ['dong-label', 'text-opacity', 1]],
  shortage: [['village-circle', 'circle-opacity', 0.92], ['village-circle', 'circle-stroke-opacity', 1]],
  shelters: [['shelter-circle', 'circle-opacity', 1], ['shelter-circle', 'circle-stroke-opacity', 1], ['shelter-name', 'text-opacity', 1], ['route-line', 'line-opacity', 0.7]],
  vehicles: [['vehicle-circle', 'circle-opacity', 1], ['vehicle-circle', 'circle-stroke-opacity', 1]],
  fire: [['fire-zone', 'fill-opacity', 0.06], ['fire-zone-line', 'line-opacity', 0.7], ['fire-line', 'line-opacity', 0.95], ['fire-head', 'fill-opacity', 0.95], ['fire-origin', 'circle-opacity', 1], ['fire-origin', 'circle-stroke-opacity', 1]],
  ltc: [['ltc-circle', 'circle-opacity', 1], ['ltc-circle', 'circle-stroke-opacity', 1]],
  aging: [['dong-fill', 'fill-opacity', 0.38]]
}

// 원 크기: 대피 대상 구역 마을은 대기 인원 제곱근에 비례, 구역 밖 마을은 작은 점
const radiusExpr = ['case', ['==', ['get', 'inScope'], 1], ['+', 5, ['*', 1.6, ['sqrt', ['get', 'waiting']]]], 3.5]

function villageFc(villages) {
  return featureCollection(villages.map((v) => pointFeature(v.lngLat, {
    code: v.code, name: v.label, waiting: v.waiting, color: v.inScope ? SEVERITY_COLOR[v.level] : SEVERITY_COLOR.out, inScope: v.inScope ? 1 : 0
  })))
}
function routeFc(routes) {
  return featureCollection((routes || []).map((r) => ({ type: 'Feature', properties: {}, geometry: { type: 'LineString', coordinates: [r.from, r.to] } })))
}
function ltcFc(list) {
  return featureCollection((list || []).map((x) => pointFeature(x.lngLat, { tip: x.tip, kind: x.kind })))
}
function vehicleFc(vehicles) {
  return featureCollection(vehicles.map((v) => pointFeature(v.lngLat, { code: v.code, available: v.available ? 1 : 0, tip: v.tip })))
}
function shelterFc(shelters) {
  return featureCollection((shelters || []).map((x) => pointFeature(x.lngLat, { tip: x.tip, name: x.name, state: x.state })))
}
function fireFc(fire) {
  return {
    zone: featureCollection(fire ? [fire.zone] : []),
    line: featureCollection(fire ? [fire.line] : []),
    head: featureCollection(fire ? [fire.head] : []),
    origin: featureCollection(fire ? [pointFeature(fire.origin, { tip: fire.label })] : [])
  }
}

function labelEl() {
  const el = document.createElement('button')
  el.type = 'button'
  el.className = 'pressable inline-flex h-6 items-center rounded-full px-2 type-caption tabular-nums shadow-sm'
  return el
}

export default function MapCanvas({
  theme = 'light', mode = '2d', layers, villages, vehicles, shelters, routes, ltc, agingStops, fire, selected, onSelect,
  focus, fitSeq, scopeBounds, padding, onReady, onStyleError
}) {
  const boxRef = useRef(null)
  const mapRef = useRef(null)
  const barsRef = useRef(null)
  const markersRef = useRef(new Map())
  const fireMarkerRef = useRef(null)
  const opRef = useRef({ dongs: 1, shortage: 1, shelters: 0, vehicles: 0, fire: 0, ltc: 0, aging: 0 })
  const animRef = useRef({})
  const themeRef = useRef(theme)
  const propsRef = useRef({})
  const [tip, setTip] = useState(null)
  propsRef.current = { theme, mode, layers, villages, vehicles, shelters, routes, ltc, agingStops, fire, selected, onSelect, padding, scopeBounds }

  // 묶음 투명도를 지도와 막대, 표식에 반영
  const applyGroup = (group, v) => {
    const map = mapRef.current
    if (!map) return
    const { mode: md } = propsRef.current
    for (const [id, prop, base] of GROUP_LAYERS[group] || []) {
      if (!map.getLayer(id)) continue
      const extra = group === 'shortage' && md === '3d' ? 0 : 1
      map.setPaintProperty(id, prop, base * v * extra)
      map.setLayoutProperty(id, 'visibility', v * extra > 0.001 ? 'visible' : 'none')
    }
    if (group === 'shortage') {
      if (map.getLayer('village-name')) map.setPaintProperty('village-name', 'text-opacity', v)
      barsRef.current?.setOpacity(v)
      for (const { el } of markersRef.current.values()) {
        el.style.opacity = String(v)
        el.style.visibility = v > 0.001 ? 'visible' : 'hidden'
      }
    }
    if (group === 'fire' && fireMarkerRef.current) {
      const el = fireMarkerRef.current.labelEl
      el.style.opacity = String(v)
      el.style.visibility = v > 0.001 ? 'visible' : 'hidden'
    }
  }

  // 겹침 레이어 설치. 스타일을 새로 불러올 때마다 호출된다
  const install = () => {
    const map = mapRef.current
    const p = propsRef.current
    const c = OVERLAY[p.theme] || OVERLAY.light
    map.addSource('dongs', { type: 'geojson', data: dongFeatures() })
    map.addSource('dong-labels', { type: 'geojson', data: dongLabelFeatures() })
    map.addSource('city', { type: 'geojson', data: cityOutlineFeature() })
    map.addSource('villages', { type: 'geojson', data: villageFc(p.villages) })
    map.addSource('vehicles', { type: 'geojson', data: vehicleFc(p.vehicles) })
    map.addSource('shelters', { type: 'geojson', data: shelterFc(p.shelters) })
    map.addSource('routes', { type: 'geojson', data: routeFc(p.routes) })
    map.addSource('ltc', { type: 'geojson', data: ltcFc(p.ltc) })
    const f = fireFc(p.fire)
    map.addSource('fire-zone', { type: 'geojson', data: f.zone })
    map.addSource('fire-line', { type: 'geojson', data: f.line })
    map.addSource('fire-head', { type: 'geojson', data: f.head })
    map.addSource('fire-origin', { type: 'geojson', data: f.origin })

    // 바탕 지도 지명을 한글 이름 우선으로 바꾼다(영문 병기 제거)
    for (const l of map.getStyle().layers) {
      if (l.type !== 'symbol' || !l.layout?.['text-field']) continue
      if (/^(highway|road)/.test(l.id) && l.id.includes('shield')) continue
      map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name']])
    }
    // 지형 음영, 산림 강조, 3D 건물. 바탕 스타일의 openmaptiles 벡터 타일과 공개 DEM 을 쓴다
    if (!map.getSource('dem')) map.addSource('dem', { type: 'raster-dem', tiles: DEM_TILES, encoding: 'terrarium', tileSize: 256, maxzoom: 13, attribution: 'Terrain: Mapzen, AWS Open Data' })
    const firstSymbol = map.getStyle().layers.find((l) => l.type === 'symbol')?.id
    map.addLayer({ id: 'hillshade', type: 'hillshade', source: 'dem', paint: { 'hillshade-exaggeration': p.theme === 'dark' ? 0.35 : 0.5, 'hillshade-shadow-color': c.hillShadow, 'hillshade-highlight-color': c.hillLight } }, firstSymbol)
    if (map.getSource('openmaptiles')) {
      map.addLayer({ id: 'forest-fill', type: 'fill', source: 'openmaptiles', 'source-layer': 'landcover', filter: ['==', ['get', 'class'], 'wood'], paint: { 'fill-color': c.forest, 'fill-opacity': 0.12 } }, firstSymbol)
      map.addLayer({
        id: 'building-3d', type: 'fill-extrusion', source: 'openmaptiles', 'source-layer': 'building', minzoom: 12.5,
        paint: {
          'fill-extrusion-color': c.building,
          'fill-extrusion-height': ['coalesce', ['get', 'render_height'], 6],
          'fill-extrusion-base': ['coalesce', ['get', 'render_min_height'], 0],
          'fill-extrusion-opacity': ['interpolate', ['linear'], ['zoom'], 12.5, 0, 13.5, 0.85]
        }
      }, firstSymbol)
    }
    if (p.mode === '3d') map.setTerrain({ source: 'dem', exaggeration: TERRAIN_EXAGGERATION })
    // 행정동 고령화율(65세 이상 비율, KOSIS). 단계 색은 agingStops 로 받는다
    const stops = p.agingStops || []
    map.addLayer({
      id: 'dong-fill', type: 'fill', source: 'dongs',
      paint: { 'fill-color': stops.length ? ['step', ['get', 'aging'], ...stops] : c.agingLow, 'fill-opacity': 0 }
    }, firstSymbol)
    map.addLayer({ id: 'fire-zone', type: 'fill', source: 'fire-zone', paint: { 'fill-color': c.fire, 'fill-opacity': 0 } })
    map.addLayer({ id: 'fire-zone-line', type: 'line', source: 'fire-zone', paint: { 'line-color': c.fire, 'line-width': 1.2, 'line-dasharray': [2, 2], 'line-opacity': 0 } })
    map.addLayer({ id: 'dong-line', type: 'line', source: 'dongs', paint: { 'line-color': c.dongLine, 'line-width': 1, 'line-dasharray': [3, 2] } })
    map.addLayer({ id: 'city-line', type: 'line', source: 'city', paint: { 'line-color': c.cityLine, 'line-width': 2.2 } })
    map.addLayer({ id: 'fire-line', type: 'line', source: 'fire-line', layout: { 'line-cap': 'round' }, paint: { 'line-color': c.fire, 'line-width': 5, 'line-dasharray': [1.6, 1.2] } })
    map.addLayer({ id: 'fire-head', type: 'fill', source: 'fire-head', paint: { 'fill-color': c.fire } })
    map.addLayer({
      id: 'dong-label', type: 'symbol', source: 'dong-labels',
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 13, 'text-allow-overlap': false },
      paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.6 }
    })
    map.addLayer({ id: 'route-line', type: 'line', source: 'routes', layout: { 'line-cap': 'round' }, paint: { 'line-color': c.shelter, 'line-width': 1.4, 'line-dasharray': [1, 2], 'line-opacity': 0 } })
    map.addLayer({
      id: 'ltc-circle', type: 'circle', source: 'ltc',
      paint: {
        'circle-radius': 4.5, 'circle-color': ['case', ['==', ['get', 'kind'], 'residential'], c.ltc, c.stroke],
        'circle-stroke-color': c.ltc, 'circle-stroke-width': 2
      }
    })
    map.addLayer({
      id: 'shelter-circle', type: 'circle', source: 'shelters',
      paint: {
        'circle-radius': 6, 'circle-color': c.stroke,
        'circle-stroke-color': ['match', ['get', 'state'], 'over', c.danger, 'near', c.warn, 'blocked', c.shelterOff, c.shelter],
        'circle-stroke-width': 3
      }
    })
    map.addLayer({
      id: 'shelter-name', type: 'symbol', source: 'shelters', minzoom: 12.3,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11, 'text-offset': [0, 1.2], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4 }
    })
    map.addLayer({
      id: 'fire-origin', type: 'circle', source: 'fire-origin',
      paint: { 'circle-radius': 7, 'circle-color': c.fire, 'circle-stroke-color': c.stroke, 'circle-stroke-width': 2.5, 'circle-opacity': 0, 'circle-stroke-opacity': 0 }
    })
    map.addLayer({
      id: 'vehicle-circle', type: 'circle', source: 'vehicles',
      paint: {
        'circle-radius': 5,
        'circle-color': ['case', ['==', ['get', 'available'], 1], c.vehicle, c.stroke],
        'circle-stroke-color': ['case', ['==', ['get', 'available'], 1], c.stroke, c.vehicleOff],
        'circle-stroke-width': 2
      }
    })
    map.addLayer({
      id: 'village-circle', type: 'circle', source: 'villages',
      paint: { 'circle-radius': radiusExpr, 'circle-color': ['get', 'color'], 'circle-stroke-color': c.stroke, 'circle-stroke-width': 1.5 }
    })
    // 법정동 이름. 확대했을 때만 보인다
    map.addLayer({
      id: 'village-name', type: 'symbol', source: 'villages', minzoom: 11.6,
      layout: { 'text-field': ['get', 'name'], 'text-font': FONT, 'text-size': 11.5, 'text-offset': [0, 1.6], 'text-anchor': 'top', 'text-optional': true },
      paint: { 'text-color': c.label, 'text-halo-color': c.halo, 'text-halo-width': 1.4 }
    })
    // 3D 에서는 숫자 표식을 막대 윗면 바로 위로 올린다(매 프레임 화면 좌표 차이만큼 옮김)
    const onFrame = (tops) => {
      if (propsRef.current.mode !== '3d') return
      for (const [code, m] of markersRef.current) {
        const o = tops[code]
        if (o) m.marker.setOffset([o[0], o[1] - 18])
      }
    }
    const bars = createBarsLayer({ id: 'village-bars', MercatorCoordinate, origin: CENTER, highlightColor: c.highlight, onFrame })
    barsRef.current = bars
    map.addLayer(bars.layer)
    syncBars()
    bars.setHidden(p.mode !== '3d')
    bars.setSelected(p.selected)
    for (const g of Object.keys(GROUP_LAYERS)) applyGroup(g, opRef.current[g])
  }

  const syncBars = () => {
    const bars = barsRef.current
    if (!bars) return
    const { villages: vs, mode: md } = propsRef.current
    const map = mapRef.current
    const terrainOn = md === '3d' && map?.getTerrain?.()
    bars.setBars(vs.filter((v) => v.inScope).map((v) => ({ code: v.code, lngLat: v.lngLat, height: v.waiting * M_PER_PERSON, color: SEVERITY_COLOR[v.level], base: terrainOn ? (map.queryTerrainElevation(v.lngLat) || 0) : 0 })))
    bars.setHidden(md !== '3d')
  }

  // 지도 생성(한 번)
  useEffect(() => {
    const map = new MlMap({
      container: boxRef.current,
      style: STYLE_URL[themeRef.current],
      center: BBOX_CENTER,
      zoom: 10.5,
      attributionControl: { compact: true },
      localIdeographFontFamily: "'Pretendard Variable', 'Pretendard', sans-serif",
      maxPitch: 70,
      dragRotate: true
    })
    mapRef.current = map
    // 떠 있는 패널 폭만큼 지도 여백을 둔다. 이후 이동과 맞춤은 이 여백 안쪽을 기준으로 한다
    map.setPadding(propsRef.current.padding)
    map.fitBounds(DONGHAE_BBOX, { padding: FIT_GAP, animate: false })
    let triedFallback = false
    map.on('style.load', () => { install(); onReady?.() })
    // 어두운 바탕 스타일이 참조하는 무늬 이미지(wood-pattern 등)가 스프라이트에 없어 경고가 난다. 투명 1px 로 채운다
    map.on('styleimagemissing', (e) => {
      if (!map.hasImage(e.id)) map.addImage(e.id, { width: 1, height: 1, data: new Uint8Array(4) })
    })
    map.on('error', (e) => {
      // 바탕 스타일을 못 받으면 liberty 로 한 번 바꾼다
      const msg = String(e?.error?.message || '')
      if (!triedFallback && /style|Failed to fetch|NetworkError/i.test(msg) && !map.isStyleLoaded()) {
        triedFallback = true
        onStyleError?.(msg)
        map.setStyle(STYLE_URL.fallback, { diff: false })
      }
    })

    const pickAt = (pt) => {
      const md = propsRef.current.mode
      if (md === '3d') return barsRef.current?.pick(pt.x, pt.y) || null
      if (!map.getLayer('village-circle')) return null
      const hit = map.queryRenderedFeatures(pt, { layers: ['village-circle'] })
      return hit[0]?.properties?.code || null
    }
    const tipAt = (pt) => {
      const code = pickAt(pt)
      if (code) {
        const v = propsRef.current.villages.find((x) => x.code === code)
        return v ? { x: pt.x, y: pt.y, title: v.label, line: v.tipLine } : null
      }
      const layersOn = ['vehicle-circle', 'shelter-circle', 'ltc-circle', 'fire-origin'].filter((id) => map.getLayer(id) && map.getLayoutProperty(id, 'visibility') !== 'none')
      if (!layersOn.length) return null
      const hit = map.queryRenderedFeatures(pt, { layers: layersOn })[0]
      return hit ? { x: pt.x, y: pt.y, title: hit.properties.tip, line: '' } : null
    }
    map.on('mousemove', (e) => {
      const t = tipAt(e.point)
      map.getCanvas().style.cursor = t ? 'pointer' : ''
      setTip((old) => (t ? t : old ? null : old))
    })
    map.on('mouseout', () => setTip(null))
    map.on('click', (e) => {
      const code = pickAt(e.point)
      if (code) propsRef.current.onSelect?.(code)
    })

    const ro = new ResizeObserver(() => map.resize())
    ro.observe(boxRef.current)
    return () => {
      ro.disconnect()
      Object.values(animRef.current).forEach((a) => a?.pause?.())
      for (const { marker } of markersRef.current.values()) marker.remove()
      markersRef.current.clear()
      fireMarkerRef.current?.remove()
      map.remove()
      mapRef.current = null
      barsRef.current = null
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // 밝은 바탕과 어두운 바탕 전환
  useEffect(() => {
    const map = mapRef.current
    if (!map || themeRef.current === theme) return
    themeRef.current = theme
    map.setStyle(STYLE_URL[theme], { diff: false })
  }, [theme])

  // 마을 데이터와 표식(숫자 라벨). 표식은 키보드로 고를 수 있는 버튼이다
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    map.getSource('villages')?.setData(villageFc(villages))
    syncBars()
    const markers = markersRef.current
    const seen = new Set()
    for (const v of villages) {
      if (!v.inScope) continue
      seen.add(v.code)
      let m = markers.get(v.code)
      if (!m) {
        const el = labelEl()
        el.addEventListener('click', (ev) => { ev.stopPropagation(); propsRef.current.onSelect?.(v.code) })
        // MapLibre 가 표식 요소의 opacity 를 직접 다루므로 감싼 요소를 표식으로 넘기고 안쪽 버튼만 서서히 바꾼다
        const wrap = document.createElement('div')
        wrap.appendChild(el)
        const marker = new Marker({ element: wrap, anchor: 'center' }).setLngLat(v.lngLat).addTo(map)
        m = { marker, el }
        markers.set(v.code, m)
      }
      m.marker.setLngLat(v.lngLat)
      m.el.textContent = `${v.waiting}명`
      // 대기 0명 표식은 선택했을 때만 보인다(지도 겹침 줄이기). 원은 그대로 남아 고를 수 있다
      m.el.parentElement.style.display = v.waiting > 0 || selected === v.code ? '' : 'none'
      m.el.setAttribute('aria-label', v.ariaLabel)
      m.el.setAttribute('aria-pressed', selected === v.code ? 'true' : 'false')
      const isSel = selected === v.code
      m.el.classList.toggle('bg-text-pri', isSel)
      m.el.classList.toggle('text-text-inverse', isSel)
      m.el.classList.toggle('bg-page', !isSel)
      m.el.classList.toggle('text-text-pri', !isSel && v.waiting > 0)
      m.el.classList.toggle('text-text-meta', !isSel && v.waiting === 0)
      const o = opRef.current.shortage
      m.el.style.opacity = String(o)
      m.el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
    }
    for (const [code, m] of markers) {
      if (!seen.has(code)) { m.marker.remove(); markers.delete(code) }
    }
  }, [villages, selected]) // eslint-disable-line react-hooks/exhaustive-deps

  // 표식 위치: 2D 는 원 가운데, 3D 는 막대 윗면(barsLayer onFrame 이 맞춘다)
  useEffect(() => {
    if (mode === '3d') { mapRef.current?.triggerRepaint(); return }
    for (const { marker } of markersRef.current.values()) marker.setOffset([0, 0])
  }, [mode, villages])

  useEffect(() => { mapRef.current?.getSource('vehicles')?.setData(vehicleFc(vehicles)) }, [vehicles])
  useEffect(() => { mapRef.current?.getSource('shelters')?.setData(shelterFc(shelters)) }, [shelters])
  useEffect(() => { mapRef.current?.getSource('routes')?.setData(routeFc(routes)) }, [routes])
  useEffect(() => { mapRef.current?.getSource('ltc')?.setData(ltcFc(ltc)) }, [ltc])

  // 산불 확산 가정 방향 화살표와 라벨
  useEffect(() => {
    const map = mapRef.current
    if (!map) return
    const f = fireFc(fire)
    map.getSource('fire-zone')?.setData(f.zone)
    map.getSource('fire-line')?.setData(f.line)
    map.getSource('fire-head')?.setData(f.head)
    map.getSource('fire-origin')?.setData(f.origin)
    fireMarkerRef.current?.remove()
    fireMarkerRef.current = null
    if (fire) {
      const wrap = document.createElement('div')
      const el = document.createElement('span')
      el.className = 'pointer-events-none inline-flex h-6 items-center rounded-full bg-text-pri px-2 type-caption text-text-inverse shadow-sm'
      el.textContent = '산불 확산 가정 구역'
      wrap.appendChild(el)
      fireMarkerRef.current = new Marker({ element: wrap, anchor: 'center' }).setLngLat(fire.mid).addTo(map)
      fireMarkerRef.current.labelEl = el
      const o = opRef.current.fire
      el.style.opacity = String(o)
      el.style.visibility = o > 0.001 ? 'visible' : 'hidden'
    }
  }, [fire])

  // 레이어 켜고 끄기(서서히)
  useEffect(() => {
    for (const g of Object.keys(GROUP_LAYERS)) {
      const target = layers[g] ? 1 : 0
      const from = opRef.current[g]
      if (from === target) continue
      animRef.current[g]?.pause?.()
      animRef.current[g] = fadeValue(from, target, (v) => { opRef.current[g] = v; applyGroup(g, v) })
    }
  }, [layers]) // eslint-disable-line react-hooks/exhaustive-deps

  // 2D 와 3D 전환
  const modeRef = useRef(mode)
  useEffect(() => {
    const map = mapRef.current
    if (!map || modeRef.current === mode) return
    modeRef.current = mode
    barsRef.current?.setHidden(mode !== '3d')
    map.setTerrain(mode === '3d' ? { source: 'dem', exaggeration: TERRAIN_EXAGGERATION } : null)
    // 지형 타일을 받은 뒤 막대 바닥 높이를 다시 맞춘다
    map.once('idle', () => syncBars())
    applyGroup('shortage', opRef.current.shortage)
    // 대피 대상 구역이 있으면 그 범위로, 없으면 시 전체로 맞춘다. 3D 는 기울이면 작아 보이므로 조금 확대한다
    const sb = propsRef.current.scopeBounds
    const cam = sb && map.cameraForBounds(sb, { padding: 48 })
    if (cam) moveTo(map, { center: cam.center, zoom: Math.min(13, cam.zoom + (mode === '3d' ? ZOOM_3D : 0)), pitch: mode === '3d' ? PITCH_3D : 0, bearing: mode === '3d' ? BEARING_3D : 0 }, 600)
    else moveTo(map, cityCamera(map, mode), 600)
  }, [mode]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { barsRef.current?.setSelected(selected) }, [selected])

  // 화면 폭이 바뀌어 패널 배치가 달라지면 지도 여백을 맞춘다
  const padKey = padding ? `${padding.top},${padding.right},${padding.bottom},${padding.left}` : ''
  useEffect(() => { if (mapRef.current && padding) mapRef.current.setPadding(padding) }, [padKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 마을로 이동
  useEffect(() => {
    const map = mapRef.current
    if (!map || !focus?.lngLat) return
    const opts = { center: focus.lngLat, zoom: 12.6, pitch: mode === '3d' ? PITCH_3D : 0, bearing: mode === '3d' ? BEARING_3D : 0 }
    if (prefersReducedMotion()) map.jumpTo(opts)
    else map.flyTo({ ...opts, duration: 900 })
  }, [focus]) // eslint-disable-line react-hooks/exhaustive-deps

  // 시나리오 대피 대상 구역 맞춤. 시나리오가 바뀔 때마다
  const boundsKey = scopeBounds ? scopeBounds.map((x) => x.toFixed(4)).join(',') : ''
  useEffect(() => {
    const map = mapRef.current
    if (!map || !scopeBounds) return
    const run = () => {
      const cam = map.cameraForBounds(scopeBounds, { padding: 48 })
      if (!cam) return
      const opts = { center: cam.center, zoom: Math.min(13, cam.zoom), pitch: mode === '3d' ? PITCH_3D : 0, bearing: mode === '3d' ? BEARING_3D : 0 }
      moveTo(map, opts, 800)
    }
    if (map.isStyleLoaded()) run()
    else map.once('load', run)
  }, [boundsKey]) // eslint-disable-line react-hooks/exhaustive-deps

  // 시 전체 보기
  useEffect(() => {
    const map = mapRef.current
    if (!map || !fitSeq) return
    moveTo(map, cityCamera(map, mode), 700)
  }, [fitSeq]) // eslint-disable-line react-hooks/exhaustive-deps

  return (
    <div className="relative h-full w-full">
      <div ref={boxRef} className="h-full w-full" role="region" aria-label="동해시 상황판 지도. 마을 표식은 Tab 키로 고를 수 있습니다" />
      {tip && (
        <div
          role="presentation"
          className="pointer-events-none absolute z-raised max-w-source-col-md rounded-md bg-text-pri px-3 py-2 text-text-inverse shadow-md"
          style={{ left: tip.x + 14, top: tip.y + 14 }}
        >
          <p className="type-strong">{tip.title}</p>
          {tip.line && <p className="type-meta">{tip.line}</p>}
        </div>
      )}
    </div>
  )
}
