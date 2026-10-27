// 현황판. 사용자 지향 레퍼런스(IMG_1531)의 벤토 문법으로 짠다.
// 흰 본문 위 회색 면 카드, 작은 점 제목, 진회색 막대에 강조 하나, 중립 아이콘, 오른쪽 위 진한 알약 버튼.
// 1행: 미이송 예상 | 마을별 미이송 예상(도달 순 막대, 등급 칩) | 확인할 일
// 2행: 부족 상위 마을 | 오늘 산불 여건(공공데이터) | 부족 마을, 가용 차량
// 문장은 사실만 서술한다(PRD v2 4절).
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowRight, ChevronRight, Circle, Layers } from 'lucide-react'
import { vehicleCounts } from '../../lib/vehicleSummary.js'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import PageShell, { todayLabel } from '../../components/miri/PageShell.jsx'
import FreshnessNote from '../../components/miri/FreshnessNote.jsx'
import { useFireRisk, useWarning, useWind, dirName } from '../../components/miri/FireRiskStrip.jsx'
import useAnomalies from '../../hooks/useAnomalies.js'
import useNow from '../../hooks/useNow.js'
import { ANOMALY_RULES } from '../../lib/anomaly.js'
import { GRADES, emptyByGrade } from '../../lib/shortage.js'
import { computeShortage } from '../../lib/shortageCalc.js'
import useBoardingRecommended from '../../hooks/useBoardingRecommended.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import { fmtElapsed } from '../../lib/geo.js'
import { pendingCounts } from '../../lib/basis.js'
import { staleRosterCount, STALE_DAYS } from '../../lib/handoverRows.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'

const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')

// 작은 숫자 묶음. 라벨 위, 값 아래
function Stat({ label, value, unit, tone, sub }) {
  return (
    <div className="min-w-0">
      <p className="type-meta text-text-meta">{label}</p>
      <p className={clsx('mt-0.5 whitespace-nowrap type-h3 tabular-nums', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
        {value}{unit && <span className="ml-0.5 type-body-sm">{unit}</span>}
      </p>
      {sub && <p className="mt-0.5 type-meta text-text-meta">{sub}</p>}
    </div>
  )
}

// 진행 막대. 짧은 카드 안에서만 쓴다
function Meter({ value, max, tone }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mt-3 h-1.5 w-full rounded-xs bg-mute" role="presentation">
      <div className={clsx('h-full rounded-xs', tone === 'danger' ? 'bg-danger' : 'bg-primary')} style={{ width: `${pct}%` }} />
    </div>
  )
}

// 마을별 막대. 진회색 막대에 가장 큰 값 하나만 빨강으로 강조하고 그 값만 막대 위에 적는다
function VillageBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const top = rows.reduce((m, r) => (r.value > m.value ? r : m), { value: -1 })
  return (
    <div className="flex h-44 gap-1 cq-xl:h-48" role="img" aria-label={`마을별 미이송 예상 인원: ${rows.map((r) => `${r.name} ${r.value}명`).join(', ')}`}>
      {rows.map((r) => {
        const hot = r.key === top.key && r.value > 0
        const pct = Math.max(r.value > 0 ? 8 : 4, (r.value / max) * 100)
        return (
          // 막대 영역(남은 높이)과 이름 칸(두 줄 고정)으로 나눠 강조 값이 이름 줄을 밀지 않게 한다
          <div key={r.key} className="flex h-full min-w-0 flex-1 flex-col items-center">
            <div className="flex w-full flex-1 items-end justify-center pt-5">
              <div className={clsx('relative w-full max-w-[28px] rounded-sm', hot ? 'bg-danger' : r.value > 0 ? 'bg-text-sec' : 'bg-mute')} style={{ height: `${pct}%` }}>
                {hot && <span className="absolute bottom-full left-1/2 mb-1 -translate-x-1/2 whitespace-nowrap type-caption text-danger-text tabular-nums">{r.value}</span>}
              </div>
            </div>
            <span className="mt-2 flex h-8 w-full items-start justify-center break-keep text-center text-[12px] leading-4 text-text-meta [overflow-wrap:anywhere]" title={`${r.name} ${r.value}명`}>{r.name.replace(/동$/, '')}</span>
          </div>
        )
      })}
    </div>
  )
}

export default function OverviewPage() {
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const settings = useMiriStore((s) => s.settings)
  const dongs = useMiriStore((s) => s.dongs)
  const today = useMiriStore((s) => s.today)
  const fieldNotes = useMiriStore((s) => s.fieldNotes)
  const scenario = useMiriStore(activeScenario)
  const user = useAuthStore((s) => s.user)
  const now = useNow(5000)
  const anomalies = useAnomalies(now)
  const [grade, setGrade] = useState('all')
  const fire = useFireRisk()
  const warning = useWarning()
  const wind = useWind()

  const result = useMemo(
    () => computeShortage({ persons, villages, vehicles, helpers, settings, scenario, t0: today }),
    [persons, villages, vehicles, helpers, settings, scenario, today]
  )
  // 추천 배정 탐색은 1초 안팎이 걸려 첫 화면을 멈추게 하므로 부족분 화면과 같은 캐시로 뒤에서 구한다
  const recInput = useMemo(() => ({ persons, villages, vehicles, helpers, settings, scenario, t0: today }), [persons, villages, vehicles, helpers, settings, scenario, today])
  const recSteps = useMemo(() => [settings.boardingMinutes], [settings.boardingMinutes])
  const optUnserved = useBoardingRecommended(recInput, recSteps)[settings.boardingMinutes]
  const d = useDispatchStore()
  const live = ['standby', 'assigned', 'sent'].includes(d.status)
  const liveUnserved = d.result?.unassigned?.length || 0
  const isDong = user?.role === 'dong'
  const myVillages = isDong ? villages.filter((v) => v.dongCode === user.dong) : villages
  const active = persons.filter((p) => p.review !== 'rejected' && myVillages.some((v) => v.code === p.villageCode))
  const myCodes = new Set(myVillages.map((v) => v.code))
  // 확인 대기 세 값(대피 대상 구역 서류, 명부 전체 서류, 현장 소식)을 한 함수로 센다(회신 R34: 4, 7, 10건이 기준 없이 보이던 문제)
  const pc = pendingCounts({ persons: persons.filter((p) => myCodes.has(p.villageCode)), fieldNotes: isDong ? fieldNotes.filter((x) => myCodes.has(x.villageCode)) : fieldNotes })
  const pending = pc.docsAll
  const scope = myVillages.map((v) => ({ v, r: result.byVillage[v.code] })).filter((x) => x.r)
  const scopeTotal = scope.reduce((s, x) => s + x.r.total, 0)
  const scopeByGrade = scope.reduce((acc, x) => { for (const g of GRADES) acc[g.key] += x.r.shortage[g.key]; return acc }, emptyByGrade())
  // 미이송 예상은 대피 대상 구역 마을에서만 나오므로, 잠정값 표시도 같은 범위의 확인 대기 서류만 센다
  const scopeProvisional = scope.filter((x) => x.r.inScope).reduce((s, x) => s + x.r.provisional, 0)
  const inScope = scope.filter((x) => x.r.inScope)
  const shortVillages = inScope.filter((x) => x.r.total > 0)
  const diff = optUnserved == null ? 0 : optUnserved - result.total
  const dongName = (c) => dongs.find((d) => d.code === c)?.name || c
  const scopeName = isDong ? dongName(user.dong) : '동해시 전체'

  // 대피 대상 마을을 도달 순으로 세운다
  const arrival = (code) => result.ctx?.deadlines?.[code]?.arrival ?? Infinity
  const ordered = [...inScope].sort((a, b) => arrival(a.v.code) - arrival(b.v.code))
  // 값 큰 순으로 12곳까지(작은 화면에서도 막대가 가로로 넘치지 않게). 전체는 상황판에서 본다
  const bars = ordered.map(({ v, r }) => ({ key: v.code, name: v.label, value: grade === 'all' ? r.total : r.shortage[grade] })).sort((a, b) => b.value - a.value).slice(0, 12)
  const chips = [{ key: 'all', label: '전체', n: scopeTotal }, ...GRADES.map((g) => ({ key: g.key, label: g.label, n: scopeByGrade[g.key] }))]

  const availVehicles = vehicles.filter((v) => v.available).length
  const staleRoster = staleRosterCount(active, now)
  const todo = pending + pc.notes + anomalies.length
  // 이송 완료 기한: 규칙 글자 대신 첫 마을의 실제 기한(발령 후 경과 시간)을 보이고, 규칙은 아래 줄에 적는다
  const firstCompleteH = Math.max(0, (scenario.windowHours || 0) - (scenario.completeBeforeHours || 0))

  const h0 = wind.data?.hours?.[0]
  const g = fire.data?.grades || {}
  const over51 = (g.d2 || 0) + (g.d3 || 0) + (g.d4 || 0)
  const conditions = [
    {
      key: 'fire',
      title: fire.data ? `산불위험지수 평균 ${fire.data.mean}, 최고 ${fire.data.max}` : fire.error ? `산불위험지수를 불러오지 못했습니다(${fire.error}).` : '산불위험지수를 불러오는 중입니다.',
      sub: fire.data ? `지수 51 이상 면적 ${over51}%, 산림청 국립산림과학원` : '산림청 국립산림과학원',
      fresh: <FreshnessNote kind="fire" state={fire} />
    },
    {
      key: 'warning',
      title: warning.data ? (warning.data.active.length ? `동해 발효 특보 ${warning.data.active.join(', ')}` : '동해 발효 특보 없음') : warning.error ? `기상특보를 불러오지 못했습니다(${warning.error}).` : '기상특보를 불러오는 중입니다.',
      sub: '기상청 기상특보 조회서비스',
      fresh: <FreshnessNote kind="warning" state={warning} />
    },
    {
      key: 'wind',
      title: h0 ? `바람 ${dirName(h0.fromDeg)}풍 ${h0.speed}m/s, 습도 ${h0.humidity}%` : wind.error ? `단기예보를 불러오지 못했습니다(${wind.error}).` : '단기예보를 불러오는 중입니다.',
      sub: '기상청 단기예보 조회서비스',
      fresh: <FreshnessNote kind="wind" state={wind} />
    }
  ]

  const actions = (
    <Link to="/console/map" className="inline-flex h-10 items-center gap-2 rounded-md bg-subtle px-4 type-body-sm text-text-sec hover:bg-mute">
      <Layers size={16} aria-hidden="true" className="text-text-meta" />
      <span className="max-w-[16rem] truncate">{scenario.name}</span>
    </Link>
  )

  const btn = 'inline-flex h-10 items-center gap-2 rounded-md bg-text-pri pl-4 pr-1.5 type-strong text-text-inverse hover:bg-text-sec'
  const btnIcon = <span className="inline-flex h-7 w-7 items-center justify-center rounded-sm bg-page text-text-pri"><ArrowRight size={16} aria-hidden="true" /></span>
  const link = 'inline-flex items-center gap-0.5 type-meta text-text-sec hover:text-text-pri'

  return (
    <PageShell title="오늘의 현황" eyebrow={todayLabel()} actions={actions}>
      <div className="grid gap-3 cq-md:grid-flow-row-dense cq-md:grid-cols-6 cq-xl:grid-cols-12">
        {/* 결론 숫자와 다음 행동. 발령 중에는 발령 진행 값을 먼저 보인다 */}
        {live ? (
          <Card title={d.kind === 'drill' ? '훈련 발령 진행 중' : '발령 진행 중'} className="flex flex-col cq-md:col-span-3 cq-xl:col-span-3" bodyClassName="flex flex-1 flex-col">
            <p className="type-meta text-text-meta">이 배정표로 기한 안에 못 옮기는 사람</p>
            <p className={clsx('mt-1 type-kpi', liveUnserved ? 'text-danger-text' : 'text-text-pri')}>{fmt(liveUnserved)}<span className="ml-1 type-h3">명</span></p>
            <div className="mt-auto pt-5">
              <Link to="/console/dispatch" className={btn}>발령 운영 열기{btnIcon}</Link>
            </div>
          </Card>
        ) : (
          <Card title="기한 안에 못 옮기는 사람" className="flex flex-col cq-md:col-span-3 cq-xl:col-span-3" bodyClassName="flex flex-1 flex-col">
            <p className="type-meta text-text-meta">{scopeName}, {scenario.name}</p>
            <p className="mt-1 type-kpi text-danger-text">{fmt(scopeTotal)}<span className="ml-1 type-h3">명</span></p>
            <p className="mt-1 type-meta text-text-meta tabular-nums">{GRADES.filter((x) => scopeByGrade[x.key]).map((x) => `${x.label} ${scopeByGrade[x.key]}`).join(', ') || '부족 없음'}{scopeProvisional > 0 ? `, 확인 대기 서류 ${scopeProvisional}건 포함` : ''}</p>
            <p className="mt-3 type-body-sm text-text-sec tabular-nums">추천 배정 적용 시 {optUnserved == null ? '계산 중' : `${fmt(optUnserved)}명${diff < 0 ? `(${-diff}명 감소)` : ''}`}</p>
            <div className="mt-auto pt-5">
              <Link to="/console/shortage" className={btn}>부족분 계산 열기{btnIcon}</Link>
            </div>
          </Card>
        )}

        {/* 마을별 미이송 예상 */}
        <Card
          title="마을별 미이송 예상"
          className="cq-md:col-span-6 cq-xl:col-span-6"
          actions={<Link to="/console/map" className={link}>상황판에서 보기<ChevronRight size={14} aria-hidden="true" /></Link>}
        >
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Stat label="첫 산불 도달" value={`발령 후 ${fmtElapsed(scenario.windowHours)}`} />
            {firstCompleteH !== scenario.windowHours && <Stat label="첫 마을 이송 완료 기한" value={`발령 후 ${fmtElapsed(firstCompleteH)}`} />}
            <Stat label="대피 대상 마을" value={inScope.length} unit="곳" />
            <Stat label="부족 마을" value={shortVillages.length} unit="곳" tone={shortVillages.length ? 'danger' : undefined} />
          </div>
          <div className="mt-5">
            {bars.length ? <VillageBars rows={bars} /> : <p className="type-body-sm text-text-meta">대피 대상 마을이 없습니다.</p>}
          </div>
          <div role="radiogroup" aria-label="등급" className="mt-4 flex flex-wrap gap-1.5">
            {chips.map((c) => {
              const on = grade === c.key
              return (
                <button
                  key={c.key} type="button" role="radio" aria-checked={on} onClick={() => setGrade(c.key)}
                  className={clsx('inline-flex h-8 items-center gap-1.5 rounded-md px-2.5 type-meta transition-colors duration-fast',
                    on ? 'bg-primary text-text-inverse' : 'bg-page text-text-sec hover:text-text-pri')}
                >
                  {c.label}<span className={clsx('tabular-nums', on ? 'text-text-inverse' : 'text-text-meta')}>{c.n}</span>
                </button>
              )
            })}
          </div>
        </Card>

        {/* 확인할 일: 줄마다 해당 화면으로 바로 간다 */}
        <Card
          title="확인할 일"
          className="cq-md:col-span-3 cq-xl:col-span-3"
          actions={<span className="type-h2 text-text-pri tabular-nums">{todo}</span>}
        >
          {todo === 0 && staleRoster === 0 ? (
            <p className="type-body-sm text-text-meta">확인할 항목이 없습니다.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {anomalies.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={a.to} className="flex min-h-11 items-center gap-2.5 rounded-md px-2 hover:bg-page">
                    <Circle size={16} aria-hidden="true" className={clsx('shrink-0', a.rule === 'deadline' || a.rule === 'noAck' ? 'text-danger' : 'text-text-meta')} />
                    <span className="min-w-0 flex-1 break-keep type-body-sm text-text-pri">{ANOMALY_RULES[a.rule]}</span>
                    <span className="max-w-[45%] shrink-0 truncate type-meta text-text-meta tabular-nums" title={a.target}>{a.target}</span>
                  </Link>
                </li>
              ))}
              {pending > 0 && (
                <li>
                  <Link to="/console/intake" className="flex min-h-11 items-center gap-2.5 rounded-md px-2 hover:bg-page">
                    <Circle size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                    <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">확인할 서류</span>
                    <span className="type-meta text-text-meta tabular-nums">{pending}건</span>
                  </Link>
                </li>
              )}
              {pc.notes > 0 && (
                <li>
                  <Link to="/console/notes" className="flex min-h-11 items-center gap-2.5 rounded-md px-2 hover:bg-page">
                    <Circle size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                    <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">확인할 현장 소식</span>
                    <span className="type-meta text-text-meta tabular-nums">{pc.notes}건</span>
                  </Link>
                </li>
              )}
              {staleRoster > 0 && (
                <li>
                  <Link to="/console/roster?recheck=1" className="flex min-h-11 items-center gap-2.5 rounded-md px-2 hover:bg-page">
                    <Circle size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                    <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri" title={`마지막 확인 ${STALE_DAYS}일 경과 또는 확인 기록 없음`}>명부 재확인 필요</span>
                    <span className="type-meta text-text-meta tabular-nums">{staleRoster}명</span>
                  </Link>
                </li>
              )}
            </ul>
          )}
        </Card>

        {/* 오늘 산불 여건 */}
        <Card title="오늘 산불 여건" className="cq-md:col-span-3 cq-xl:col-span-6">
          <ul className="flex flex-col gap-4">
            {conditions.map((x) => (
              <li key={x.key} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <span className="block type-strong text-text-pri">{x.title}</span>
                  <span className="block type-meta text-text-meta">{x.sub}</span>
                  {x.fresh}
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* 출동 가능 차량과 다음 행동 */}
        <Card title="출동 가능 차량" className="cq-md:col-span-3 cq-xl:col-span-6">
          <p className="type-h2 text-text-pri tabular-nums">{availVehicles}<span className="ml-0.5 type-body-sm">대</span></p>
          <Meter value={availVehicles} max={vehicles.length} />
          <p className="mt-2 type-meta text-text-meta tabular-nums">등록 {vehicleCounts(vehicles).total}대, 도우미 {helpers.filter((h) => h.active).length}명</p>
          <Link to="/console/resources" className={clsx(link, 'mt-3')}>협약 차량 확인<ChevronRight size={14} aria-hidden="true" /></Link>
        </Card>
      </div>
    </PageShell>
  )
}
