// 명부 지도 보기. 목록과 같은 필터 결과를 마을별 원으로 보인다(일본 NEC 피난행동요지원자 명부 시스템의 대장, 지도 연동 방식).
// 원 크기는 걸러진 대상자 수, 숫자는 그 인원. 원을 누르면 그 마을로 목록을 좁힌다.
import { useEffect, useRef } from 'react'
import { Map as MlMap, setWorkerUrl } from 'maplibre-gl'
import 'maplibre-gl/dist/maplibre-gl.css'
import workerUrl from 'maplibre-gl/dist/maplibre-gl-worker.mjs?worker&url'
import { DONGHAE_BBOX, cityOutlineFeature, dongFeatures, featureCollection, pointFeature } from '../../lib/geo.js'
import { colors } from '../../tokens.js'

setWorkerUrl(workerUrl)
const STYLE = 'https://tiles.openfreemap.org/styles/positron'
const FONT = ['Noto Sans Regular']

const fc = (items) => featureCollection(items.filter((x) => x.count > 0).map((x) => pointFeature(x.lngLat, { code: x.code, count: x.count, label: `${x.name} ${x.count}` })))

export default function RosterMap({ items, onPick, selected }) {
  const box = useRef(null)
  const mapRef = useRef(null)
  const itemsRef = useRef(items)
  itemsRef.current = items

  useEffect(() => {
    const map = new MlMap({ container: box.current, style: STYLE, bounds: DONGHAE_BBOX, fitBoundsOptions: { padding: 24 }, attributionControl: { compact: true } })
    mapRef.current = map
    map.on('load', () => {
      for (const l of map.getStyle().layers) {
        if (l.type === 'symbol' && l.layout?.['text-field']) map.setLayoutProperty(l.id, 'text-field', ['coalesce', ['get', 'name:ko'], ['get', 'name']])
      }
      map.addSource('dongs', { type: 'geojson', data: dongFeatures() })
      map.addSource('city', { type: 'geojson', data: cityOutlineFeature() })
      map.addSource('pts', { type: 'geojson', data: fc(itemsRef.current) })
      map.addLayer({ id: 'dong-line', type: 'line', source: 'dongs', paint: { 'line-color': colors.line.strong, 'line-width': 1, 'line-dasharray': [3, 2] } })
      map.addLayer({ id: 'city-line', type: 'line', source: 'city', paint: { 'line-color': colors.text.meta, 'line-width': 2 } })
      map.addLayer({
        id: 'pts', type: 'circle', source: 'pts',
        paint: {
          'circle-radius': ['+', 4, ['*', 1.3, ['sqrt', ['get', 'count']]]],
          'circle-color': colors.primary.DEFAULT, 'circle-opacity': 0.85,
          'circle-stroke-color': colors.page, 'circle-stroke-width': 2
        }
      })
      map.addLayer({
        id: 'pts-label', type: 'symbol', source: 'pts', minzoom: 11.2,
        layout: { 'text-field': ['get', 'label'], 'text-font': FONT, 'text-size': 12, 'text-offset': [0, 1.8], 'text-anchor': 'top' },
        paint: { 'text-color': colors.text.pri, 'text-halo-color': colors.page, 'text-halo-width': 1.6 }
      })
      map.on('click', 'pts', (e) => onPick?.(e.features[0].properties.code))
      map.on('mouseenter', 'pts', () => { map.getCanvas().style.cursor = 'pointer' })
      map.on('mouseleave', 'pts', () => { map.getCanvas().style.cursor = '' })
    })
    return () => map.remove()
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { mapRef.current?.getSource('pts')?.setData(fc(items)) }, [items])
  useEffect(() => {
    const map = mapRef.current
    if (!map?.getLayer('pts')) return
    map.setPaintProperty('pts', 'circle-color', selected && selected !== 'all'
      ? ['case', ['==', ['get', 'code'], selected], colors.danger.DEFAULT, colors.primary.DEFAULT]
      : colors.primary.DEFAULT)
  }, [selected])

  return <div ref={box} className="h-[60vh] min-h-96 w-full overflow-hidden rounded-lg" role="region" aria-label="걸러진 대상자의 마을별 분포 지도" />
}
