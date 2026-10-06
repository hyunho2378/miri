// 상황판(PRD F1). 지도를 업무의 출발점으로 둔다. 가운데 지도, 왼쪽 사실 요약, 오른쪽 레이어와 범례, 아래 시간 축.
// 데이터 흐름: 저장소(명부, 마을, 차량, 시나리오) → computeShortage(현황판과 같은 계산) → 마을별 부족분
//   → buildTimeline/progressAt(단순 비례 가정) → 시점 t 의 마을별 대기 인원 → MapCanvas(2D 원, 3D 막대, 숫자 표식).
// 마을 위치는 실제 마을 집결지(경로당), 대피소는 실제 임시주거시설이다. 대상자 개인과 차량 위치는 가상이며 지도 위에 고정 표기한다.
// lg 이상은 패널이 지도 위에 뜨고, 그보다 좁으면 지도 아래로 쌓인다.
import { useCallback, useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronUp, Layers, Maximize, X } from 'lucide-react'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import MapCanvas from '../../components/map/MapCanvas.jsx'
import Map3D from '../../components/map/Map3D.jsx'
import SummaryPanel from '../../components/map/SummaryPanel.jsx'
import VillageDetail from '../../components/map/VillageDetail.jsx'
import LayerPanel from '../../components/map/LayerPanel.jsx'
import TimeAxis from '../../components/map/TimeAxis.jsx'
import useMediaQuery from '../../hooks/useMediaQuery.js'
import { buildTimeline, fireArrow, fmtDotDate, placeVehicles, placeVillages, progressAt, severityOf } from '../../lib/geo.js'
import { GRADES, typeOf } from '../../lib/shortage.js'
import { HAZARD_KINDS, SHELTER_NOTE } from '../../lib/scenario.js'
import { agingStops } from '../../components/map/mapTheme.js'
import { DATA_SOURCES, DONG_STATS, LTC_DAYCARE, LTC_RESIDENTIAL, TEMP_SHELTERS } from '../../mock/donghaeData.js'
import { computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import { HOUR } from '../../lib/time.js'
import { useTopbar } from '../../store/useAdminUi.js'
import FireRiskStrip, { WeatherLine, dirName, useWind } from '../../components/miri/FireRiskStrip.jsx'
import { fireScenario } from '../../lib/scenario.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'
import { useDispatchStore } from '../../store/useDispatchStore.js'
import { Link } from 'react-router-dom'
import { spacing } from '../../tokens.js'

const px = (v) => Number.parseInt(v, 10)
const AGING = agingStops()
const NOTE = '마을과 대피소와 건물은 실제 위치, 대상자 개인과 차량은 가상입니다'
const GRADE_LABEL = Object.fromEntries(GRADES.map((g) => [g.key, g.label]))

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
  const saveScenario = useMiriStore((s) => s.saveScenario)
  const wind = useWind()
  // 기상청 단기예보 첫 시간 풍향을 확산 방향으로 둔 시나리오. 발화 지점과 속도는 기본 시나리오(S-1) 값
  const windHour = wind.data?.hours?.find((h) => h.toDeg != null)
  const makeWindScenario = windHour ? () => {
    const base = scenarios.find((x) => x.id === 'S-1') || scenarios[0]
    const sc = fireScenario({
      ...base, id: 'S-W', villages, heading: windHour.toDeg,
      name: `오늘 예보 바람 기준(${dirName(windHour.fromDeg)}풍 ${windHour.speed}m/s)`,
      basis: `기상청 단기예보(${wind.data.base} 발표) 동해시 격자의 ${windHour.at.slice(8, 10)}시 풍향 ${windHour.fromDeg}도를 확산 방향으로 둡니다. 발화 지점과 확산 속도는 기본 시나리오 가정값입니다.`
    })
    saveScenario(sc)
    setActiveScenario('S-W')
    setSelected(null)
  } : null
  const scenario = useMiriStore(activeScenario)

  const isLg = useMediaQuery('(min-width: 1024px)')
  const isXl = useMediaQuery('(min-width: 1280px)')

  const [mode, setMode] = useState('3d')
  const [theme, setTheme] = useState('light')
  const [layers, setLayers] = useState({ shortage: true, dongs: true, fire: true, shelters: true, vehicles: false, ltc: false, aging: false, spread: false })
  const [selected, setSelected] = useState(null)
  // 보기 상황. 평시(기본)는 지금 있는 사람과 자원과 오늘 위험만, 가정 시나리오는 버튼으로 켠다. 발령 중이면 그 발령의 시나리오로 고정한다
  const [view, setView] = useState('normal')
  const dispatchStatus = useDispatchStore((s) => s.status)
  const dispatchKind = useDispatchStore((s) => s.kind)
  const live = dispatchStatus !== 'idle'
  const situation = live ? 'dispatch' : view
  const isNormal = situation === 'normal'
  const [opened3d, setOpened3d] = useState(true)    // 3D 를 한 번 열면 장면을 유지한다(지형을 다시 만들지 않는다)
  const [focus, setFocus] = useState(null)
  const [fitSeq, setFitSeq] = useState(0)
  const [layerOpen, setLayerOpen] = useState(false)  // 레이어와 범례는 도구줄 버튼으로 연다
  const [summaryOpen, setSummaryOpen] = useState(null) // null 이면 2D 펼침, 3D 접음
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
    const inScope = isNormal ? true : row.inScope !== false
    const p = isNormal ? { waiting: row.targetTotal, moved: 0 } : inScope ? (progress.byCode[v.code] || { waiting: 0, moved: 0 }) : { waiting: 0, moved: 0 }
    const level = isNormal ? 0 : inScope ? severityOf(row.total) : 0
    const rt = isNormal ? v.roundTripMin : inScope ? ev.roundTripMin : v.roundTripMin
    const gradeLine = Object.entries(row.targets || {}).filter(([, n]) => n).map(([k, n]) => `${GRADE_LABEL[k] || k} ${n}`).join(', ')
    return {
      code: v.code, label: v.label, dongCode: v.dongCode, dongName: dongName(v.dongCode), lngLat: positions[v.code], inScope,
      pickup: v.pickup, estTargets: v.estTargets, weightBasis: v.weightBasis,
      roundTripMin: rt, driveMin: inScope ? ev.driveMin : v.driveMin,
      shelterName: shelterName(inScope ? ev.shelterCode : v.shelterCode), plannedShelterName: shelterName(v.shelterCode),
      shelterNote: inScope && ev.shelterNote ? SHELTER_NOTE[ev.shelterNote] : null,
      shelterParts: inScope ? (ev.shelterParts || []).map(([c, n]) => `${shelterName(c)} ${n}명`) : [],
      target: row.targetTotal, targets: row.targets, shortage: inScope ? row.total : 0, shortageByGrade: row.shortage, provisional: row.provisional,
      timeOnly: row.timeOnly || 0,
      waiting: p.waiting, moved: p.moved, level,
      arrivalH: tl?.arrivalH ?? scenario.windowHours, arrivalAt: today + (tl?.arrivalH ?? scenario.windowHours) * HOUR,
      radiusKm: isNormal ? 0.12 + 0.028 * Math.sqrt(row.targetTotal) : undefined,
      tipLine: isNormal
        ? `대상자 ${row.targetTotal}명(${gradeLine || '등급 자료 없음'}), 계획 대피소 ${shelterName(v.shelterCode)}, 왕복 ${rt}분`
        : inScope
          ? `대기 ${p.waiting}명, 도달 시점 부족 ${row.total ? `${row.total}명` : '없음'}, 왕복 ${rt}분`
          : `대피 대상 구역 밖, 대상자 ${row.targetTotal}명`,
      ariaLabel: isNormal
        ? `${v.label}. 대상자 ${row.targetTotal}명. 상세 보기`
        : `${v.label}. 선택 시점 대기 ${p.waiting}명, 도달 시점 부족 ${row.total ? `${row.total}명` : '없음'}. 상세 보기`
    }
  }), [villages, positions, result, effVillage, timeline, progress, dongName, shelterName, scenario, today, isNormal])

  // 3D 행정동 조각 색과 높이에 쓰는 행정동별 수치
  const dongStats = useMemo(() => {
    const out = {}
    for (const [code, st] of Object.entries(DONG_STATS)) out[code] = { name: st.name, aging: st.agingRate, targets: 0, shortage: 0, level: 0 }
    for (const v of villageVm) {
      const d = out[v.dongCode]
      if (!d) continue
      d.targets += v.target
      d.shortage += v.shortage
    }
    for (const d of Object.values(out)) d.level = severityOf(d.shortage)
    return out
  }, [villageVm])

  const shortList = useMemo(() => villageVm.filter((v) => v.shortage > 0).sort((a, b) => b.shortage - a.shortage || a.code.localeCompare(b.code)), [villageVm])
  const scopeCount = villageVm.filter((v) => v.inScope).length

  const vehiclePos = useMemo(() => placeVehicles(vehicles), [vehicles])
  const vehicleVm = useMemo(() => vehicles.filter((v) => vehiclePos[v.code]).map((v) => ({
    code: v.code, lngLat: vehiclePos[v.code], available: v.available !== false,
    tip: `${v.code} ${typeOf(v.type)?.label || v.type}, ${dongName(v.baseDong)} 행정복지센터 대기(가정)${v.available === false ? `, ${v.note || '이송 불가'}` : ''}`
  })), [vehicles, vehiclePos, dongName])

  // 임시주거시설: 이번 시나리오 배정 인원과 수용 가능 인원 비교. 대피 대상 구역 안 시설은 쓰지 않는다
  const shelterVm = useMemo(() => {
    if (isNormal) {
      return TEMP_SHELTERS.map((x) => ({ code: x.code, lngLat: x.lngLat, name: x.name, state: 'ok', load: 0, capacity: x.capacity, tip: `${x.name}(${x.kind}), 수용 ${x.capacity}명${x.coordApprox ? ', 좌표 근사' : ''}` }))
    }
    const load = result.shelterLoad || {}
    const scope = new Set(scenario.affected || [])
    return TEMP_SHELTERS.map((x) => {
      const n = load[x.code] || 0
      const blocked = scenario.avoidAffectedShelters && x.villageCode && scope.has(x.villageCode)
      const state = blocked ? 'blocked' : n > x.capacity ? 'over' : n > x.capacity * 0.8 ? 'near' : 'ok'
      const tail = blocked ? '대피 대상 구역 안이라 이번 시나리오에서는 쓰지 않음' : `배정 ${n}명 / 수용 ${x.capacity}명`
      return { code: x.code, lngLat: x.lngLat, name: x.name, state, load: n, capacity: x.capacity, tip: `${x.name}(${x.kind}), ${tail}${x.coordApprox ? ', 좌표 근사' : ''}` }
    })
  }, [result.shelterLoad, scenario, isNormal])
  const routes = useMemo(() => (isNormal ? [] : villageVm).filter((v) => v.inScope && v.target > 0).map((v) => {
    const ev = effVillage[v.code]
    const s = TEMP_SHELTERS.find((x) => x.code === ev?.shelterCode)
    return s ? { from: v.lngLat, to: s.lngLat } : null
  }).filter(Boolean), [villageVm, effVillage, isNormal])
  const ltcVm = useMemo(() => [
    ...LTC_RESIDENTIAL.map((x) => ({ lngLat: x.lngLat, kind: 'residential', tip: `${x.name}(노인요양시설), 정원 ${x.capacity}명, 현원 ${x.current}명` })),
    ...LTC_DAYCARE.map((x) => ({ lngLat: x.lngLat, kind: 'daycare', tip: `${x.name}(주야간보호), 정원 ${x.capacity}명, 현원 ${x.current}명` }))
  ], [])
  const shelterStats = useMemo(() => ({
    used: shelterVm.filter((x) => x.load > 0).length,
    over: shelterVm.filter((x) => x.state === 'over').length,
    blocked: shelterVm.filter((x) => x.state === 'blocked').length
  }), [shelterVm])

  const fire = useMemo(() => (isNormal ? null : fireArrow(scenario, villages)), [scenario, villages, isNormal])
  // 대피 대상 구역(마을과 발화 가정 지점)을 감싸는 범위. 시 전체 시나리오는 지정하지 않는다
  const scopeBounds = useMemo(() => {
    if (isNormal || scenario.kind === 'all') return null
    const pts = villageVm.filter((v) => v.inScope).map((v) => v.lngLat)
    if (scenario.origin) pts.push(scenario.origin)
    if (pts.length === 1) pts.push([pts[0][0] + 0.01, pts[0][1] + 0.01])
    if (pts.length < 2) return null
    const xs = pts.map((p) => p[0])
    const ys = pts.map((p) => p[1])
    return [Math.min(...xs), Math.min(...ys), Math.max(...xs), Math.max(...ys)]
  }, [scenario.id, scenario.kind, scenario.origin, villageVm.length, isNormal]) // eslint-disable-line react-hooks/exhaustive-deps
  const fireInfo = fire ? { label: fire.label, speed: scenario.speedKmh, fromH: fire.firstHours, toH: fire.lastHours } : null

  const selectedVm = selected ? villageVm.find((v) => v.code === selected) : null
  const normalStats = useMemo(() => {
    const byGrade = {}
    for (const v of villageVm) for (const [k, n] of Object.entries(v.targets || {})) byGrade[k] = (byGrade[k] || 0) + n
    return {
      targets: villageVm.reduce((a, v) => a + v.target, 0),
      capacity: TEMP_SHELTERS.reduce((a, x) => a + x.capacity, 0),
      avail: vehicles.filter((v) => v.available !== false).length,
      gradeLine: GRADES.filter((g) => byGrade[g.key]).map((g) => `${g.label} ${byGrade[g.key]}`).join(', '),
      top: [...villageVm].sort((a, b) => b.target - a.target).slice(0, 5)
    }
  }, [villageVm, vehicles])

  const changeMode = (m) => { setMode(m); if (m === '3d') setOpened3d(true) }
  const onLayer = (key, v) => setLayers((l) => ({ ...l, [key]: v }))
  const pick = useCallback((code) => {
    setSelected(code)
    const lngLat = positions[code]
    if (lngLat) setFocus({ code, lngLat, seq: Date.now() })
  }, [positions])

  // 지도 맞춤 여백. 떠 있는 패널 폭만큼 비운다(tokens spacing 기준)
  const showLayers = layerOpen
  const showSummary = summaryOpen ?? mode !== '3d'
  const padding = useMemo(() => {
    if (!isLg) return { top: 24, bottom: 24, left: 24, right: 24 }
    const gap = px(spacing[4])
    return {
      top: gap * 4,
      left: (showSummary || selected || isNormal ? px(spacing['source-col-md']) : 300) + gap * 2,
      right: showLayers ? px(spacing['source-col-md']) - px(spacing[8]) + gap * 3 : gap * 2,
      bottom: isNormal ? gap * 2 : px(spacing[24]) + gap * 2
    }
  }, [isLg, showLayers, showSummary, selected, isNormal])

  return (
    <div className="relative lg:h-full lg:overflow-hidden">

      {/* 지도 */}
      <div className={clsx('relative h-[60vh] min-h-80 lg:absolute lg:inset-0 lg:h-auto', theme === 'dark' ? 'bg-text-pri' : 'bg-mute')}>
        <div className={clsx('absolute inset-0', mode === '3d' && 'hidden')} aria-hidden={mode === '3d' || undefined}>
          <MapCanvas
            theme={theme} mode="2d" layers={layers} villages={villageVm} vehicles={vehicleVm} shelters={shelterVm}
            routes={routes} ltc={ltcVm} agingStops={AGING} fire={fire} scopeBounds={scopeBounds} selected={selected} onSelect={pick} focus={focus} fitSeq={fitSeq} padding={padding}
          />
        </div>
        {(mode === '3d' || opened3d) && (
          <div className={clsx('absolute inset-0', mode !== '3d' && 'hidden')} aria-hidden={mode !== '3d' || undefined}>
            <Map3D
              theme={theme} layers={layers} villages={villageVm} vehicles={vehicleVm} shelters={shelterVm} ltc={ltcVm}
              fire={fire} scopeBounds={scopeBounds} selected={selected} onSelect={pick} focus={focus} fitSeq={fitSeq} padding={padding}
              dongStats={dongStats} spread={layers.spread}
            />
          </div>
        )}
        {/* 실제 자료와 가정 구분 고정 표기 */}
        <p className="pointer-events-none absolute left-3 bottom-3 z-raised rounded-xs bg-page/90 px-2 py-1 type-caption text-text-sec shadow-sm lg:hidden">
          {NOTE}
        </p>
      </div>

      <div className="flex flex-col gap-4 px-4 py-4 md:px-6 lg:contents">
        {/* 왼쪽 위: 상황 전환. 평시가 기본이고 가정 시나리오는 켜서 본다. 발령 중이면 고정 */}
        {isNormal && !selectedVm ? (
          <section aria-label="평시 현황" className="lg:absolute lg:left-4 lg:top-4 lg:z-raised lg:w-[320px] rounded-lg bg-page p-4 shadow-md">
            <SituationSwitch situation={situation} onView={(v) => { setView(v); setSelected(null) }} live={live} kind={dispatchKind} />
            <p className="mt-3 type-meta text-text-meta">평시. 지금 등록된 대상자와 자원, 오늘의 위험</p>
            <dl className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2.5">
              <div><dt className="type-meta text-text-meta">대상자</dt><dd className="type-h3 text-text-pri tabular-nums">{fmtN(normalStats.targets)}<span className="ml-0.5 type-body-sm">명</span></dd></div>
              <div><dt className="type-meta text-text-meta">마을</dt><dd className="type-h3 text-text-pri tabular-nums">{villages.length}<span className="ml-0.5 type-body-sm">곳</span></dd></div>
              <div><dt className="type-meta text-text-meta">임시주거시설 수용</dt><dd className="type-h3 text-text-pri tabular-nums">{fmtN(normalStats.capacity)}<span className="ml-0.5 type-body-sm">명</span></dd></div>
              <div><dt className="type-meta text-text-meta">가용 차량</dt><dd className="type-h3 text-text-pri tabular-nums">{normalStats.avail}<span className="ml-0.5 type-body-sm">/ {vehicles.length}대</span></dd></div>
            </dl>
            <p className="mt-1 type-meta text-text-meta">{normalStats.gradeLine}</p>
            <div className="mt-3 rounded-md bg-subtle px-3 py-2">
              <FireRiskStrip compact />
              <WeatherLine className="mt-0.5" />
            </div>
            <p className="mt-3 type-caption text-text-sec">대상자가 많은 마을</p>
            <ul className="mt-1 -mx-1 flex flex-col">
              {normalStats.top.map((v) => (
                <li key={v.code}>
                  <button type="button" onClick={() => pick(v.code)} className="flex min-h-9 w-full items-center gap-2 rounded-md px-1 text-left hover:bg-subtle">
                    <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">{v.label}<span className="ml-1.5 type-meta text-text-meta">{v.dongName}</span></span>
                    <span className="type-strong text-text-pri tabular-nums">{v.target}명</span>
                  </button>
                </li>
              ))}
            </ul>
            <p className="mt-2 type-caption text-text-meta">{NOTE}</p>
          </section>
        ) : isLg && !selectedVm && !showSummary ? (
          <section aria-label="상황 요약" className="absolute left-4 top-4 z-raised w-[300px] rounded-lg bg-page p-4 shadow-md">
            <SituationSwitch situation={situation} onView={(v) => { setView(v); setSelected(null) }} live={live} kind={dispatchKind} />
            <div className="mt-3 flex items-start justify-between gap-2">
              <div className="min-w-0">
                <label className="sr-only" htmlFor="scenario-pick">시나리오</label>
                <select id="scenario-pick" value={scenario.id} onChange={(e) => { setActiveScenario(e.target.value); setSelected(null) }}
                  className="-ml-1 h-8 max-w-full truncate rounded-md bg-subtle px-1.5 type-meta text-text-pri">
                  {scenarios.map((x) => <option key={x.id} value={x.id}>{`${HAZARD_KINDS[x.kind]?.label || '재난'}: ${x.name}`}</option>)}
                </select>
                <p className="mt-0.5 flex items-baseline gap-1.5">
                  <span className="type-h2 text-danger-text tabular-nums">{result.total}</span>
                  <span className="type-body-sm text-text-sec">명 미이송 예상</span>
                </p>
                <p className="type-meta text-text-meta">부족 마을 {shortList.length}곳, 대피 대상 {scopeCount}곳, 필요 추가 차량 {extra.reduce((a, x) => a + x.count, 0)}대</p>
              </div>
              <IconButton size="sm" aria-label="상황 요약 펼치기" onClick={() => setSummaryOpen(true)}>
                <ChevronDown size={16} aria-hidden="true" />
              </IconButton>
            </div>
            <div className="mt-3 rounded-md bg-subtle px-3 py-2">
              <FireRiskStrip compact />
              <WeatherLine className="mt-0.5" />
            </div>
            {shortList.length > 0 && (
              <ul className="mt-2 -mx-1 flex flex-col">
                {shortList.slice(0, 4).map((v) => (
                  <li key={v.code}>
                    <button type="button" onClick={() => pick(v.code)} className="flex min-h-9 w-full items-center gap-2 rounded-md px-1 text-left hover:bg-subtle">
                      <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">{v.label}</span>
                      <span className="type-strong text-danger-text tabular-nums">{v.shortage}명</span>
                    </button>
                  </li>
                ))}
              </ul>
            )}
            <p className="mt-2 type-caption text-text-meta">{NOTE}</p>
          </section>
        ) : (
          <Card
            as="aside" aria-label={selectedVm ? '마을 상세' : '상황 요약'} padding="md"
            className="lg:absolute lg:left-4 lg:top-4 lg:bottom-4 lg:z-raised lg:w-source-col-md lg:overflow-y-auto lg:shadow-md"
          >
            {!selectedVm && <div className="mb-3"><SituationSwitch situation={situation} onView={(v) => { setView(v); setSelected(null) }} live={live} kind={dispatchKind} /></div>}
            {isLg && !selectedVm && (
              <div className="-mt-1 mb-2 flex justify-end">
                <IconButton size="sm" aria-label="상황 요약 접기" onClick={() => setSummaryOpen(false)}>
                  <ChevronUp size={16} aria-hidden="true" />
                </IconButton>
              </div>
            )}
            {selectedVm
              ? <VillageDetail village={selectedVm} onBack={() => setSelected(null)} />
              : (
                <SummaryPanel
                  scenario={scenario} scenarios={scenarios} onScenario={(id) => { setActiveScenario(id); setSelected(null) }}
                  dateLabel={fmtDotDate(today)} result={result} extra={extra}
                  villageCount={villages.length} scopeCount={scopeCount} shortList={shortList} onPick={pick} onWindScenario={makeWindScenario}
                />
              )}
          </Card>
        )}

        {/* 아래: 시간 축(가정 시나리오와 발령 중에만) */}
        {!isNormal && <Card
          as="section" aria-label="시간 축" padding="sm"
          className={clsx(
            'lg:absolute lg:bottom-4 lg:z-raised lg:shadow-md',
            showSummary || selectedVm ? 'lg:left-[calc(theme(spacing.source-col-md)+theme(spacing.8))]' : 'lg:left-[calc(300px+theme(spacing.8))]',
            showLayers ? 'lg:right-[calc(theme(spacing.72)+theme(spacing.8))]' : 'lg:right-4'
          )}
        >
          <TimeAxis
            t={t} onT={setT} timeline={timeline} t0={today} progress={progress}
            total={progress.moved + progress.waiting} playing={playing} onPlaying={setPlaying}
          />
        </Card>}

        {/* 오른쪽 위: 보기 도구줄. 레이어와 범례는 눌렀을 때만 펼친다 */}
        {isLg && (
          <div className="absolute right-4 top-4 z-raised flex items-center gap-1.5 rounded-lg bg-page p-1.5 shadow-md">
            <div role="radiogroup" aria-label="지도" className="flex rounded-md bg-mute p-0.5">
              {[['2d', '2D'], ['3d', '3D']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={mode === v} onClick={() => changeMode(v)}
                  className={clsx('h-8 min-w-11 rounded-sm px-3 type-strong transition-colors duration-fast', mode === v ? 'bg-page text-text-pri shadow-sm' : 'text-text-meta hover:text-text-pri')}>{l}</button>
              ))}
            </div>
            <div role="radiogroup" aria-label="바탕" className="flex rounded-md bg-mute p-0.5">
              {[['light', '밝게'], ['dark', '어둡게']].map(([v, l]) => (
                <button key={v} type="button" role="radio" aria-checked={theme === v} onClick={() => setTheme(v)}
                  className={clsx('h-8 rounded-sm px-3 type-body-sm transition-colors duration-fast', theme === v ? 'bg-page text-text-pri shadow-sm' : 'text-text-meta hover:text-text-pri')}>{l}</button>
              ))}
            </div>
            <button type="button" onClick={() => setFitSeq((n) => n + 1)} aria-label={mode === '3d' ? '대피 대상 구역 보기' : '동해시 전체 보기'} title={mode === '3d' ? '대피 대상 구역 보기' : '동해시 전체 보기'}
              className="inline-flex h-9 w-9 items-center justify-center rounded-md text-text-sec hover:bg-mute hover:text-text-pri">
              <Maximize size={16} aria-hidden="true" />
            </button>
            <button type="button" onClick={() => setLayerOpen((o) => !o)} aria-expanded={showLayers}
              className={clsx('inline-flex h-9 items-center gap-1.5 rounded-md px-3 type-strong transition-colors duration-fast', showLayers ? 'bg-text-pri text-text-inverse' : 'text-text-sec hover:bg-mute hover:text-text-pri')}>
              <Layers size={16} aria-hidden="true" />레이어
            </button>
          </div>
        )}
        {(!isLg || showLayers) && (
          <Card
            as="aside" aria-label="레이어와 범례" padding="md"
            title={isLg ? '레이어와 범례' : undefined} headingLevel={2}
            actions={isLg ? (
              <IconButton size="sm" aria-label="레이어와 범례 닫기" onClick={() => setLayerOpen(false)}>
                <X size={16} aria-hidden="true" />
              </IconButton>
            ) : undefined}
            className="lg:absolute lg:right-4 lg:top-[72px] lg:z-raised lg:w-72 lg:max-h-[calc(100%-theme(spacing.24))] lg:overflow-y-auto lg:shadow-md"
          >
            <LayerPanel
              mode={mode} onMode={changeMode} theme={theme} onTheme={setTheme} onFit={() => setFitSeq((n) => n + 1)} compact={isLg}
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

const fmtN = (n) => Number(n || 0).toLocaleString('ko-KR')

// 상황 전환. 평시와 가정 시나리오를 고른다. 발령 중이면 발령 운영으로 가는 표시만 둔다
function SituationSwitch({ situation, onView, live, kind }) {
  if (live) {
    return (
      <div className="flex items-center justify-between gap-2 rounded-md bg-text-pri px-3 py-2 text-text-inverse">
        <span className="type-strong">{kind === 'real' ? '실제 발령 중' : '훈련 발령 중'}</span>
        <Link to="/console/dispatch" className="type-meta underline underline-offset-2">발령 운영</Link>
      </div>
    )
  }
  return (
    <div role="radiogroup" aria-label="보기 상황" className="grid grid-cols-2 gap-1 rounded-md bg-mute p-1">
      {[['normal', '평시'], ['scenario', '가정 시나리오']].map(([v, l]) => (
        <button key={v} type="button" role="radio" aria-checked={situation === v} onClick={() => onView(v)}
          className={clsx('h-8 rounded-sm px-2 type-strong transition-colors duration-fast', situation === v ? 'bg-page text-text-pri shadow-sm' : 'text-text-meta hover:text-text-pri')}>{l}</button>
      ))}
    </div>
  )
}
