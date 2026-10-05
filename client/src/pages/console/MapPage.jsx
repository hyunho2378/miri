// 상황판(PRD F1). 지도를 업무의 출발점으로 둔다. 가운데 지도, 왼쪽 사실 요약, 오른쪽 레이어와 범례, 아래 시간 축.
// 데이터 흐름: 저장소(명부, 마을, 차량, 시나리오) → computeShortage(현황판과 같은 계산) → 마을별 부족분
//   → buildTimeline/progressAt(단순 비례 가정) → 시점 t 의 마을별 대기 인원 → MapCanvas(2D 원, 3D 막대, 숫자 표식).
// 마을과 차량 위치는 가상이다(lib/geo.js 가 동 경계 안에 결정적으로 배치). 지도 위에 고정 표기한다.
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
import OpenDataLoader from '../../components/map/OpenDataLoader.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { buildTimeline, fireArrow, fmtDotDate, placeVehicles, placeVillages, progressAt, severityOf } from '../../lib/geo.js'
import { typeOf } from '../../lib/shortage.js'
import { computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import { HOUR } from '../../lib/time.js'
import { useTopbar } from '../../store/useAdminUi.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'
import { spacing } from '../../tokens.js'

const px = (v) => Number.parseInt(v, 10)
const NOTE = '마을 위치와 대상자는 가상 데이터입니다'

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
  const [layers, setLayers] = useState({ shortage: true, dongs: true, fire: true, vehicles: false, shelters: false, ltc: false })
  const [selected, setSelected] = useState(null)
  const [focus, setFocus] = useState(null)
  const [fitSeq, setFitSeq] = useState(0)
  const [openData, setOpenData] = useState({})
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

  const villageVm = useMemo(() => villages.filter((v) => positions[v.code]).map((v) => {
    const row = result.byVillage[v.code]
    const tl = timeline.rows.find((r) => r.code === v.code)
    const p = progress.byCode[v.code] || { waiting: 0, moved: 0 }
    const level = severityOf(row.total)
    return {
      code: v.code, label: v.label, dongName: dongName(v.dongCode), lngLat: positions[v.code],
      roundTripMin: v.roundTripMin, shelterName: shelterName(v.shelterCode),
      target: row.targetTotal, targets: row.targets, shortage: row.total, shortageByGrade: row.shortage, provisional: row.provisional,
      waiting: p.waiting, moved: p.moved, level,
      arrivalH: tl?.arrivalH ?? scenario.windowHours, arrivalAt: today + (tl?.arrivalH ?? scenario.windowHours) * HOUR,
      tipLine: `대기 ${p.waiting}명, 도달 시점 부족 ${row.total ? `${row.total}명` : '없음'}, 왕복 ${v.roundTripMin}분`,
      ariaLabel: `${v.label}, 가상 위치. 선택 시점 대기 ${p.waiting}명, 도달 시점 부족 ${row.total ? `${row.total}명` : '없음'}. 상세 보기`
    }
  }), [villages, positions, result, timeline, progress, dongName, shelterName, scenario, today])

  const shortList = useMemo(() => villageVm.filter((v) => v.shortage > 0).sort((a, b) => b.shortage - a.shortage || a.code.localeCompare(b.code)), [villageVm])
  const forestCount = villages.filter((v) => v.forestAdjacent).length

  const vehiclePos = useMemo(() => placeVehicles(vehicles), [vehicles])
  const vehicleVm = useMemo(() => vehicles.filter((v) => vehiclePos[v.code]).map((v) => ({
    code: v.code, lngLat: vehiclePos[v.code], available: v.available !== false,
    tip: `${v.code} ${typeOf(v.type)?.label || v.type}, ${dongName(v.baseDong)} 소속, 가상 위치${v.available === false ? `, ${v.note || '이송 불가'}` : ''}`
  })), [vehicles, vehiclePos, dongName])

  const shelterVm = useMemo(() => {
    const list = openData.shelters?.data?.list || []
    return list.filter((x) => Number.isFinite(x.lat) && Number.isFinite(x.lon) && x.lat && x.lon)
      .map((x) => ({ lngLat: [x.lon, x.lat], tip: `${x.name}, 최대 수용 ${x.capacity}명` }))
  }, [openData.shelters])

  const fire = useMemo(() => fireArrow(scenario, villages, positions), [scenario, villages, positions])
  const fireInfo = fire ? { fromH: scenario.windowHours + fire.firstHours, toH: scenario.windowHours + fire.lastHours } : null

  const selectedVm = selected ? villageVm.find((v) => v.code === selected) : null

  const onLayer = (key, v) => setLayers((l) => ({ ...l, [key]: v }))
  const onOpenData = useCallback((kind, state) => setOpenData((o) => (o[kind] === state ? o : { ...o, [kind]: state })), [])
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
      {layers.shelters && <OpenDataLoader kind="shelters" onChange={onOpenData} />}
      {layers.ltc && <OpenDataLoader kind="ltc" onChange={onOpenData} />}

      {/* 지도 */}
      <div className={clsx('relative h-[60vh] min-h-80 lg:absolute lg:inset-0 lg:h-auto', theme === 'dark' ? 'bg-text-pri' : 'bg-mute')}>
        <MapCanvas
          theme={theme} mode={mode} layers={layers} villages={villageVm} vehicles={vehicleVm} shelters={shelterVm}
          fire={fire} selected={selected} onSelect={pick} focus={focus} fitSeq={fitSeq} padding={padding}
        />
        {/* 가상 데이터 고정 표기. 지도 왼쪽 아래 */}
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
                villageCount={villages.length} forestCount={forestCount} shortList={shortList} onPick={pick}
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
              layers={layers} onLayer={onLayer} shelterState={openData.shelters} ltcState={openData.ltc}
              fireInfo={fireInfo} vehicleCount={vehicles.length}
            />
          </Card>
        )}
      </div>
    </div>
  )
}
