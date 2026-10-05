// 상황판(PRD F1). 지도를 업무의 출발점으로 둔다. 가운데 지도, 왼쪽 사실 요약, 오른쪽 레이어와 범례, 아래 시간 축.
// 데이터 흐름: 저장소(명부, 마을, 차량, 시나리오) → computeShortage(현황판과 같은 계산) → 마을별 부족분
//   → buildTimeline/progressAt(단순 비례 가정) → 시점 t 의 마을별 대기 인원 → MapCanvas(2D 원, 3D 막대, 숫자 표식).
// 마을 위치는 실제 마을 집결지(경로당), 대피소는 실제 임시주거시설이다. 대상자 개인과 차량 위치는 가상이며 지도 위에 고정 표기한다.
// lg 이상은 패널이 지도 위에 뜨고, 그보다 좁으면 지도 아래로 쌓인다.
import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { Layers, X } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import MapCanvas from '../../components/map/MapCanvas.jsx'
import SummaryPanel from '../../components/map/SummaryPanel.jsx'
import VillageDetail from '../../components/map/VillageDetail.jsx'
import LayerPanel from '../../components/map/LayerPanel.jsx'
import TimeAxis from '../../components/map/TimeAxis.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { buildTimeline, fireArrow, fmtDotDate, placeVehicles, placeVillages, progressAt, severityOf } from '../../lib/geo.js'
import { typeOf } from '../../lib/shortage.js'
import { SHELTER_NOTE } from '../../lib/scenario.js'
import { agingStops } from '../../components/map/mapTheme.js'
import { DATA_SOURCES, LTC_DAYCARE, LTC_RESIDENTIAL, TEMP_SHELTERS } from '../../mock/donghaeData.js'
import { computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import { HOUR } from '../../lib/time.js'
import { useTopbar } from '../../store/useAdminUi.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'
import { spacing } from '../../tokens.js'

const px = (v) => Number.parseInt(v, 10)
const AGING = agingStops()
const NOTE = '마을과 대피소는 실제 위치, 대상자 개인과 차량은 가상입니다'

export default function MapPage() {
  useTopbar({ title: '상황판' })
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const settings = useMiriStore((s) => s.settings)
  const dongs = useMiriStore((s) => s.dongs)
  const shelters = useMiriStore((s) => s.shelters)
  const today = useMiriStore((s) => s.today)
  const scenarios = useMiriStore((s) => s.scenarios)
  const setActiveScenario = useMiriStore((s) => s.setActiveScenario)
  const scenario = useMiriStore(activeScenario)

  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')

  const [mode, setMode] = useState('2d')
  const [theme, setTheme] = useState('light')
  const [layers, setLayers] = useState({ shortage: true, dongs: true, fire: true, shelters: true, vehicles: false, ltc: false, aging: false })
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)
  const [fitSeq, setFitSeq] = useState(0)
  const [layerOpen, setLayerOpen] = useState(null)   // null 이면 화면 폭 기본값(xl 이상 펼침)
  const [playing, setPlaying] = useState(false)
  const [tState, setT] = useState(null)              // null 이면 마지막 도달 시점

  // 현황판과 같은 계산
  const input = { persons, villages, vehicles, helpers, settings, scenario, t0: today }
  const result = useMemo(() => computeShortage(input), [persons, villages, vehicles, helpers, settings, scenario, today]) // eslint-disable-line react-hooks/exhaustive-deps
  const extra = useMemo(() => requiredExtraVehicles(input, result), [result]) // eslint-disable-line react-hooks/exhaustive-deps

  const positions = useMemo(() => placeVillages(villages), [villages])
  const timeline = useMemo(() => buildTimeline(result, villages, scenario, settings, today), [result, villages, scenario, settings, today])
  const t = tState == null ? timeline.endH : Math.min(tState, timeline.endH)
  const progress = useMemo(() => progressAt(timeline, t), [timeline, t])

  const dongName = useCallback((code) => dongs.find((d) => d.code === code)?.name || code, [dongs])
  const shelterName = useCallback((code) => shelters.find((s) => s.code === code)?.name, [shelters])
  const effVillage = useMemo(() => Object.fromEntries((result.villages || villages).map((v) => [v.code, v])), [result, villages])

  const villageVm = useMemo(() => villages.filter((v) => positions[v.code]).map((v) => {
    const row = result.byVillage[v.code]
    const ev = effVillage[v.code] || v
    const tl = timeline.rows.find((r) => r.code === v.code)
    const inScope = row.inScope !== false
    const p = inScope ? (progress.byCode[v.code] || { waiting: 0, moved: 0 }) : { waiting: 0, moved: 0 }
    const level = inScope ? severityOf(row.total) : 0
    const rt = inScope ? ev.roundTripMin : v.roundTripMin
    return {
      code: v.code, label: v.label, dongName: dongName(v.dongCode), lngLat: positions[v.code], inScope,
      pickup: v.pickup, estTargets: v.estTargets, weightBasis: v.weightBasis,
      roundTripMin: rt, driveMin: inScope ? ev.driveMin : v.driveMin,
      shelterName: shelterName(inScope ? ev.shelterCode : v.shelterCode), plannedShelterName: shelterName(v.shelterCode),
      shelterNote: inScope && ev.shelterNote ? SHELTER_NOTE[ev.shelterNote] : null,
      shelterParts: inScope ? (ev.shelterParts || []).map(([c, n]) => `${shelterName(c)} ${n}명`) : [],
      target: row.targetTotal, targets: row.targets, shortage: inScope ? row.total : 0, shortageByGrade: row.shortage, provisional: row.provisional,
      timeOnly: row.timeOnly || 0,
      waiting: p.waiting, moved: p.moved, level,
      arrivalH: tl?.arrivalH ?? scenario.windowHours, arrivalAt: today + (tl?.arrivalH ?? scenario.windowHours) * HOUR,
      tipLine: inScope
        ? `대기 ${p.waiting}명, 도달 시점 부족 ${row.total ? `${row.total}명` : '없음'}, 왕복 ${rt}분`
        : `대피 대상 구역 밖, 대상자 ${row.targetTotal}명`,
      ariaLabel: `${v.label}. 선택 시점 대기 ${p.waiting}명, 도달 시점 부족 ${row.total ? `${row.total}명` : '없음'}. 상세 보기`
    }
  }), [villages, positions, result, effVillage, timeline, progress, dongName, shelterName, scenario, today])

  const shortList = useMemo(() => villageVm.filter((v) => v.shortage > 0).sort((a, b) => b.shortage - a.shortage || a.code.localeCompare(b.code)), [villageVm])
  const scopeCount = villageVm.filter((v) => v.inScope).length

  const vehiclePos = useMemo(() => placeVehicles(vehicles), [vehicles])
  const vehicleVm = useMemo(() => vehicles.filter((v) => vehiclePos[v.code]).map((v) => ({
    code: v.code, lngLat: vehiclePos[v.code], available: v.available !== false,
    tip: `${v.code} ${typeOf(v.type)?.label || v.type}, ${dongName(v.baseDong)} 행정복지센터 대기(가정)${v.available === false ? `, ${v.note || '이송 불가'}` : ''}`
  })), [vehicles, vehiclePos, dongName])

  // 임시주거시설: 이번 시나리오 배정 인원과 수용 가능 인원 비교. 대피 대상 구역 안 시설은 쓰지 않는다
  const shelterVm = useMemo(() => {
    const load = result.shelterLoad || {}
    const scope = new Set(scenario.affected || [])
    return TEMP_SHELTERS.map((x) => {
      const n = load[x.code] || 0
      const blocked = scenario.avoidAffectedShelters && x.villageCode && scope.has(x.villageCode)
      const state = blocked ? 'blocked' : n > x.capacity ? 'over' : n > x.capacity * 0.8 ? 'near' : 'ok'
      const tail = blocked ? '대피 대상 구역 안이라 이번 시나리오에서는 쓰지 않음' : `배정 ${n}명 / 수용 ${x.capacity}명`
      return { code: x.code, lngLat: x.lngLat, name: x.name, state, load: n, capacity: x.capacity, tip: `${x.name}(${x.kind}), ${tail}${x.coordApprox ? ', 좌표 근사' : ''}` }
    })
  }, [result.shelterLoad, scenario])
  const routes = useMemo(() => villageVm.filter((v) => v.inScope && v.target > 0).map((v) => {
    const ev = effVillage[v.code]
    const s = TEMP_SHELTERS.find((x) => x.code === ev?.shelterCode)
    return s ? { from: v.lngLat, to: s.lngLat } : null
  }).filter(Boolean), [villageVm, effVillage])
  const ltcVm = useMemo(() => [
    ...LTC_RESIDENTIAL.map((x) => ({ lngLat: x.lngLat, kind: 'residential', tip: `${x.name}(노인요양시설), 정원 ${x.capacity}명, 현원 ${x.current}명` })),
    ...LTC_DAYCARE.map((x) => ({ lngLat: x.lngLat, kind: 'daycare', tip: `${x.name}(주야간보호), 정원 ${x.capacity}명, 현원 ${x.current}명` }))
  ], [])
  const shelterStats = useMemo(() => ({
    used: shelterVm.filter((x) => x.load > 0).length,
    over: shelterVm.filter((x) => x.state === 'over').length,
    blocked: shelterVm.filter((x) => x.state === 'blocked').length
  }), [shelterVm])

  const fire = useMemo(() => fireArrow(scenario, villages), [scenario, villages])
  // 대피 대상 구역(마을과 발화 가정 지점)을 감싸는 범위. 시 전체 시나리오는 지정하지 않는다
  const scopeBounds = useMemo(() => {
    if (scenario.kind !== 'fire') return null
    const pts = villageVm.filter((v) => v.inScope).map((v) => v.lngLat)
    if (scenario.origin) pts.push(scenario.origin)
    if (pts.length < 2) return null
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }, [scenario.id, scenario.kind, scenario.origin, villageVm.length]) // eslint-disable-line react-hooks/exhaustive-deps
  const fireInfo = fire ? { label: fire.label, speed: scenario.speedKmh, fromH: fire.firstHours, toH: fire.lastHours } : null

  const selectedVm = selected ? villageVm.find((v) => v.code === selected) : null

  const onLayer = (key, v) => setLayers((l) => ({ ...l, [key]: v }))
  const pick = useCallback((code) => {
    setSelected(code)
    const lngLat = positions[code]
    if (lngLat) setFocus({ code, lngLat, seq: Date.now() })
  }, [positions])

  // 지도 맞춤 여백. 떠 있는 패널 폭만큼 비운다(tokens spacing 기준)
  const showLayers = layerOpen ?? isXl
  const padding = useMemo(() => {
    if (!isLg) return { top: 24, bottom: 24, left: 24, right: 24 }
    const gap = px(spacing[4])
    return {
      top: gap * 2,
      left: px(spacing['source-col-md']) + gap * 3,
      right: showLayers ? px(spacing['source-col-md']) - px(spacing[8]) + gap * 3 : gap * 4,
      bottom: px(spacing[24]) + px(spacing[16])
    }
  }, [isLg, showLayers])

  return (
    <div className="relative lg:h-[calc(100dvh-theme(spacing.topbar))] lg:overflow-hidden">

      {/* 지도 */}
      <div className={clsx('relative h-[60vh] min-h-80 lg:absolute lg:inset-0 lg:h-auto', theme === 'dark' ? 'bg-text-pri' : 'bg-mute')}>
        <MapCanvas
          theme={theme} mode={mode} layers={layers} villages={villageVm} vehicles={vehicleVm} shelters={shelterVm}
          routes={routes} ltc={ltcVm} agingStops={AGING} fire={fire} scopeBounds={scopeBounds} selected={selected} onSelect={pick} focus={focus} fitSeq={fitSeq} padding={padding}
        />
        {/* 실제 자료와 가정 구분 고정 표기 */}
        <p className={clsx(
          'pointer-events-none absolute left-3 bottom-3 z-raised rounded-xs bg-page px-2 py-1 type-caption text-text-sec shadow-sm',
          'lg:left-[calc(theme(spacing.source-col-md)+theme(spacing.8))] lg:bottom-auto lg:top-4'
        )}>
          {NOTE}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 md:px-6 lg:contents">
        {/* 왼쪽: 사실 요약 또는 마을 상세 */}
        <Card
          as="aside" aria-label={selectedVm ? '마을 상세' : '상황 요약'} padding="md"
          className="lg:absolute lg:left-4 lg:top-4 lg:bottom-4 lg:z-raised lg:w-source-col-md lg:overflow-y-auto lg:shadow-md"
        >
          {selectedVm
            ? <VillageDetail village={selectedVm} onBack={() => setSelected(null)} />
            : (
              <SummaryPanel
                scenario={scenario} scenarios={scenarios} onScenario={(id) => { setActiveScenario(id); setSelected(null) }}
                dateLabel={fmtDotDate(today)} result={result} extra={extra}
                villageCount={villages.length} scopeCount={scopeCount} shortList={shortList} onPick={pick}
              />
            )}
        </Card>

        {/* 아래: 시간 축 */}
        <Card
          as="section" aria-label="시간 축" padding="sm"
          className={clsx(
            'lg:absolute lg:bottom-4 lg:z-raised lg:left-[calc(theme(spacing.source-col-md)+theme(spacing.8))] lg:shadow-md',
            showLayers ? 'lg:right-[calc(theme(spacing.72)+theme(spacing.8))]' : 'lg:right-4'
          )}
        >
          <TimeAxis
            t={t} onT={setT} timeline={timeline} t0={today} progress={progress}
            total={progress.moved + progress.waiting} playing={playing} onPlaying={setPlaying}
          />
        </Card>

        {/* 오른쪽: 보기, 레이어, 범례 */}
        {isLg && !showLayers ? (
          <div className="absolute right-4 top-4 z-raised">
            <Button variant="secondary" className="shadow-md" onClick={() => setLayerOpen(true)} leftIcon={<Layers size={16} aria-hidden="true" />}>
              레이어와 범례
            </Button>
          </div>
        ) : (
          <Card
            as="aside" aria-label="레이어와 범례" padding="md"
            title={isLg ? '레이어와 범례' : undefined} headingLevel={2}
            actions={isLg ? (
              <IconButton size="sm" aria-label="레이어와 범례 닫기" onClick={() => setLayerOpen(false)}>
                <X size={16} aria-hidden="true" />
              </IconButton>
            ) : undefined}
            className="lg:absolute lg:right-4 lg:top-4 lg:z-raised lg:w-72 lg:max-h-[calc(100%-theme(spacing.16))] lg:overflow-y-auto lg:shadow-md"
          >
            <LayerPanel
              mode={mode} onMode={setMode} theme={theme} onTheme={setTheme} onFit={() => setFitSeq((n) => n + 1)}
              layers={layers} onLayer={onLayer} shelterStats={shelterStats} shelterTotal={TEMP_SHELTERS.length}
              ltcCounts={{ residential: LTC_RESIDENTIAL.length, daycare: LTC_DAYCARE.length }}
              fireInfo={fireInfo} vehicleCount={vehicles.length} sources={DATA_SOURCES}
            />
          </Card>
        )}
      </div>
    </div>
  )
}
