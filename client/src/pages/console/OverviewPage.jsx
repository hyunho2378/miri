// 현황판. 사용자 지향 레퍼런스(IMG_1531)의 벤토 문법으로 짠다.
// 흰 본문 위 회색 면 카드, 작은 점 제목, 진회색 막대에 강조 하나, 중립 아이콘, 오른쪽 위 진한 알약 버튼.
// 1행: 미이송 예상 | 마을별 미이송 예상(도달 순 막대, 등급 칩) | 확인할 일
// 2행: 부족 상위 마을 | 오늘 산불 여건(공공데이터) | 부족 마을, 가용 차량
// 문장은 사실만 서술한다(PRD v2 4절).
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ArrowRight, ChevronRight, Circle, Layers } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import PageShell, { todayLabel } from '../../components/miri/PageShell.jsx'
import { useFireRisk, useWarning, useWind, dirName } from '../../components/miri/FireRiskStrip.jsx'
import useAnomalies from '../../hooks/useAnomalies.js'
import useNow from '../../hooks/useNow.js'
import { ANOMALY_RULES } from '../../lib/anomaly.js'
import { GRADES, emptyByGrade } from '../../lib/shortage.js'
import { computeShortage, optimizedUnserved } from '../../lib/shortageCalc.js'
import { fmtElapsed } from '../../lib/geo.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'

const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')

// 작은 숫자 묶음. 라벨 위, 값 아래
function Stat({ label, value, unit, tone }) {
  return (
    <div className="min-w-0">
      <p className="type-meta text-text-meta">{label}</p>
      <p className={clsx('mt-0.5 type-h3 tabular-nums', tone === 'danger' ? 'text-danger-text' : 'text-text-pri')}>
        {value}{unit && <span className="ml-0.5 type-body-sm">{unit}</span>}
      </p>
    </div>
  )
}

// 진행 막대. 짧은 카드 안에서만 쓴다
function Meter({ value, max, tone }) {
  const pct = max ? Math.min(100, Math.round((value / max) * 100)) : 0
  return (
    <div className="mt-3 h-1.5 w-full rounded-full bg-mute" role="presentation">
      <div className={clsx('h-full rounded-full', tone === 'danger' ? 'bg-danger' : 'bg-primary')} style={{ width: `${pct}%` }} />
    </div>
  )
}

// 마을별 막대. 진회색 막대에 가장 큰 값 하나만 빨강으로 강조하고 그 값만 막대 위에 적는다
function VillageBars({ rows }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const top = rows.reduce((m, r) => (r.value > m.value ? r : m), { value: -1 })
  return (
    <div className="flex h-44 items-end gap-2 lg:h-48" role="img" aria-label={`마을별 미이송 예상. ${rows.map((r) => `${r.name} ${r.value}명`).join(', ')}`}>
      {rows.map((r) => {
        const hot = r.key === top.key && r.value > 0
        return (
          <div key={r.key} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end">
            {hot && <span className="mb-1 type-caption text-danger-text tabular-nums">{r.value}</span>}
            <div
              className={clsx('w-full max-w-[28px] rounded-full', hot ? 'bg-danger' : r.value > 0 ? 'bg-text-sec' : 'bg-mute')}
              style={{ height: `${Math.max(r.value > 0 ? 8 : 4, (r.value / max) * 100)}%` }}
            />
            <span className="mt-2 w-full truncate text-center type-meta text-text-meta" title={r.name}>{r.name.replace(/동$/, '')}</span>
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
  const optUnserved = useMemo(() => optimizedUnserved(result), [result])
  const isDong = user?.role === 'dong'
  const myVillages = isDong ? villages.filter((v) => v.dongCode === user.dong) : villages
  const active = persons.filter((p) => p.review !== 'rejected' && myVillages.some((v) => v.code === p.villageCode))
  const pending = persons.filter((p) => p.review === 'pending' && myVillages.some((v) => v.code === p.villageCode)).length
  const scope = myVillages.map((v) => ({ v, r: result.byVillage[v.code] })).filter((x) => x.r)
  const scopeTotal = scope.reduce((s, x) => s + x.r.total, 0)
  const scopeByGrade = scope.reduce((acc, x) => { for (const g of GRADES) acc[g.key] += x.r.shortage[g.key]; return acc }, emptyByGrade())
  const scopeProvisional = scope.reduce((s, x) => s + x.r.provisional, 0)
  const inScope = scope.filter((x) => x.r.inScope)
  const shortVillages = inScope.filter((x) => x.r.total > 0)
  const diff = optUnserved - result.total
  const dongName = (c) => dongs.find((d) => d.code === c)?.name || c
  const scopeName = isDong ? dongName(user.dong) : '동해시 전체'

  // 대피 대상 마을을 도달 순으로 세운다
  const arrival = (code) => result.ctx?.deadlines?.[code]?.arrival ?? Infinity
  const ordered = [...inScope].sort((a, b) => arrival(a.v.code) - arrival(b.v.code))
  const bars = ordered.map(({ v, r }) => ({ key: v.code, name: v.label, value: grade === 'all' ? r.total : r.shortage[grade] }))
  const chips = [{ key: 'all', label: '전체', n: scopeTotal }, ...GRADES.map((g) => ({ key: g.key, label: g.label, n: scopeByGrade[g.key] }))]

  const topVillages = [...shortVillages].sort((a, b) => b.r.total - a.r.total).slice(0, 6)
  const availVehicles = vehicles.filter((v) => v.available).length
  const todo = pending + anomalies.length
  const completeText = scenario.completeBeforeHours ? `도달 ${scenario.completeBeforeHours}시간 전` : '도달 시각'

  const h0 = wind.data?.hours?.[0]
  const g = fire.data?.grades || {}
  const over51 = (g.d2 || 0) + (g.d3 || 0) + (g.d4 || 0)
  const conditions = [
    {
      key: 'fire',
      title: fire.data ? `산불위험지수 평균 ${fire.data.mean}, 최고 ${fire.data.max}` : fire.error ? `산불위험지수를 불러오지 못했습니다(${fire.error}).` : '산불위험지수를 불러오는 중입니다.',
      sub: fire.data ? `지수 51 이상 면적 ${over51}%, 산림청 국립산림과학원` : '산림청 국립산림과학원'
    },
    {
      key: 'warning',
      title: warning.data ? (warning.data.active.length ? `동해 발효 특보 ${warning.data.active.join(', ')}` : '동해 발효 특보 없음') : warning.error ? `기상특보를 불러오지 못했습니다(${warning.error}).` : '기상특보를 불러오는 중입니다.',
      sub: '기상청 기상특보 조회서비스'
    },
    {
      key: 'wind',
      title: h0 ? `바람 ${dirName(h0.fromDeg)}풍 ${h0.speed}m/s, 습도 ${h0.humidity}%` : wind.error ? `단기예보를 불러오지 못했습니다(${wind.error}).` : '단기예보를 불러오는 중입니다.',
      sub: '기상청 단기예보 조회서비스'
    }
  ]

  const actions = (
    <>
      <Link to="/console/map" className="inline-flex h-10 items-center gap-2 rounded-full bg-subtle px-4 type-body-sm text-text-sec hover:bg-mute">
        <Layers size={16} aria-hidden="true" className="text-text-meta" />
        <span className="max-w-[16rem] truncate">{scenario.name}</span>
      </Link>
      <Link to="/console/shortage" className="inline-flex h-10 items-center gap-2 rounded-full bg-text-pri pl-4 pr-1.5 type-strong text-text-inverse hover:bg-text-sec">
        부족분 계산
        <span className="inline-flex h-7 w-7 items-center justify-center rounded-full bg-page text-text-pri"><ArrowRight size={16} aria-hidden="true" /></span>
      </Link>
    </>
  )

  return (
    <PageShell title="오늘의 현황" eyebrow={todayLabel()} actions={actions}>
      <div className="grid gap-3 md:grid-flow-row-dense md:grid-cols-6 lg:grid-cols-12">
        {/* 미이송 예상 */}
        <Card title="미이송 예상" className="flex flex-col md:col-span-3 lg:col-span-3" bodyClassName="flex flex-1 flex-col">
          <p className="type-meta text-text-meta">{scopeName}, 기준 시나리오 {scenario.name}</p>
          <p className="mt-1 type-kpi text-danger-text">{fmt(scopeTotal)}<span className="ml-1 type-h3">명</span></p>
          <p className="mt-1 type-meta text-text-meta tabular-nums">{GRADES.filter((x) => scopeByGrade[x.key]).map((x) => `${x.label} ${scopeByGrade[x.key]}`).join(', ') || '부족 없음'}</p>
          <div className="mt-4 flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5 rounded-md bg-page px-3 py-2.5">
            <span className="whitespace-nowrap type-meta text-text-sec">추천 배정 적용 시</span>
            <span className="whitespace-nowrap type-strong text-text-pri tabular-nums">{fmt(optUnserved)}명{diff < 0 ? <span className="ml-1 type-meta text-text-sec">{-diff}명 감소</span> : null}</span>
          </div>
          {scopeProvisional > 0 && <p className="mt-2 type-meta text-text-meta">확인 대기 서류 {scopeProvisional}건이 포함된 잠정값입니다.</p>}
          <div className="mt-auto grid grid-cols-2 gap-3 pt-5">
            <Stat label="대상자" value={fmt(active.length)} unit="명" />
            <Stat label="부족 마을" value={shortVillages.length} unit="곳" tone={shortVillages.length ? 'danger' : undefined} />
          </div>
        </Card>

        {/* 마을별 미이송 예상 */}
        <Card
          title="마을별 미이송 예상"
          className="md:col-span-6 lg:col-span-6"
          actions={<Link to="/console/shortage" className="inline-flex items-center gap-0.5 type-meta text-text-sec hover:text-text-pri">전체 보기<ChevronRight size={14} aria-hidden="true" /></Link>}
        >
          <div className="flex flex-wrap gap-x-8 gap-y-2">
            <Stat label="첫 도달" value={`발령 후 ${fmtElapsed(scenario.windowHours)}`} />
            <Stat label="이송 완료 기한" value={completeText} />
            <Stat label="대피 대상" value={inScope.length} unit="곳" />
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

        {/* 확인할 일 */}
        <Card
          title="확인할 일"
          className="md:col-span-3 lg:col-span-3"
          actions={<span className="type-h2 text-text-pri tabular-nums">{todo}</span>}
        >
          {todo === 0 ? (
            <p className="type-body-sm text-text-meta">확인할 항목이 없습니다.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {pending > 0 && (
                <li>
                  <Link to="/console/intake" className="flex min-h-11 items-center gap-2.5 rounded-md px-2 hover:bg-page">
                    <Circle size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                    <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">확인 대기 서류</span>
                    <span className="type-meta text-text-meta tabular-nums">{pending}건</span>
                  </Link>
                </li>
              )}
              {anomalies.slice(0, 5).map((a) => (
                <li key={a.id}>
                  <Link to={a.to} className="flex min-h-11 items-center gap-2.5 rounded-md px-2 hover:bg-page">
                    <Circle size={16} aria-hidden="true" className={clsx('shrink-0', a.rule === 'deadline' || a.rule === 'noAck' ? 'text-danger' : 'text-text-meta')} />
                    <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">{ANOMALY_RULES[a.rule]}</span>
                    <span className="max-w-[45%] truncate type-meta text-text-meta tabular-nums">{a.target}</span>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 부족 상위 마을 */}
        <Card
          title="부족 상위 마을"
          className="md:col-span-6 lg:col-span-5"
          actions={<Link to="/console/map" className="inline-flex items-center gap-0.5 type-meta text-text-sec hover:text-text-pri">상황판<ChevronRight size={14} aria-hidden="true" /></Link>}
        >
          {topVillages.length === 0 ? (
            <p className="type-body-sm text-text-meta">부족한 마을이 없습니다.</p>
          ) : (
            <ul className="-mx-2 flex flex-col">
              {topVillages.map(({ v, r }) => (
                <li key={v.code}>
                  <Link to="/console/map" className="grid min-h-12 grid-cols-[4.5rem_minmax(0,1fr)_auto_auto] items-center gap-3 rounded-md px-2 py-1.5 hover:bg-page">
                    <span className="type-meta leading-4 text-text-meta">{dongName(v.dongCode)}<br />왕복 {v.roundTripMin}분</span>
                    <span className="min-w-0">
                      <span className="block truncate type-strong text-text-pri">{v.label}</span>
                      <span className="block truncate type-meta text-text-meta tabular-nums">{GRADES.filter((x) => r.targets[x.key]).map((x) => `${x.label} ${r.targets[x.key]}`).join(' ')}</span>
                    </span>
                    <span className="type-strong text-danger-text tabular-nums">{r.total}명</span>
                    <ChevronRight size={16} aria-hidden="true" className="text-text-meta" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>

        {/* 오늘 산불 여건 */}
        <Card title="오늘 산불 여건" className="md:col-span-3 lg:col-span-4">
          <ul className="flex flex-col gap-4">
            {conditions.map((x) => (
              <li key={x.key} className="flex gap-2.5">
                <span aria-hidden="true" className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-primary" />
                <span className="min-w-0">
                  <span className="block type-strong text-text-pri">{x.title}</span>
                  <span className="block type-meta text-text-meta">{x.sub}</span>
                </span>
              </li>
            ))}
          </ul>
        </Card>

        {/* 부족 마을, 가용 차량 */}
        <div className="grid gap-3 md:col-span-3 lg:col-span-3">
          <Card
            title="부족 마을"
            actions={<Link to="/console/shortage" aria-label="부족분 계산으로 이동" className="text-text-meta hover:text-text-pri"><ChevronRight size={16} aria-hidden="true" /></Link>}
          >
            <p className="type-h2 text-danger-text tabular-nums">{shortVillages.length}<span className="ml-0.5 type-body-sm">곳</span></p>
            <Meter value={shortVillages.length} max={inScope.length} tone="danger" />
            <p className="mt-2 type-meta text-text-meta tabular-nums">대피 대상 {inScope.length}곳 중 {inScope.length ? Math.round((shortVillages.length / inScope.length) * 100) : 0}%</p>
          </Card>
          <Card
            title="가용 차량"
            actions={<Link to="/console/resources" aria-label="차량과 도우미로 이동" className="text-text-meta hover:text-text-pri"><ChevronRight size={16} aria-hidden="true" /></Link>}
          >
            <p className="type-h2 text-text-pri tabular-nums">{availVehicles}<span className="ml-0.5 type-body-sm">대</span></p>
            <Meter value={availVehicles} max={vehicles.length} />
            <p className="mt-2 type-meta text-text-meta tabular-nums">전체 {vehicles.length}대 중 {vehicles.length ? Math.round((availVehicles / vehicles.length) * 100) : 0}%, 도우미 {helpers.filter((h) => h.active).length}명</p>
          </Card>
        </div>
      </div>
    </PageShell>
  )
}
