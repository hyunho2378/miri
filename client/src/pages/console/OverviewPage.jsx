// 현황판(IA 4.1). "지금 산불이 나면 몇 명을 못 옮기는가"에 한 화면으로 답한다.
import { useMemo } from 'react'
import { Link } from 'react-router-dom'
import BarChart from '../../components/dashboard/BarChart.jsx'
import AnomalyList from '../../components/miri/AnomalyList.jsx'
import Card from '../../components/ui/Card.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import OpenDataCard from '../../components/miri/OpenDataCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ShortageTable from '../../components/miri/ShortageTable.jsx'
import { byGradeLine } from '../../components/miri/ShortageValue.jsx'
import useAnomalies from '../../hooks/useAnomalies.js'
import useNow from '../../hooks/useNow.js'
import { GRADES } from '../../lib/shortage.js'
import { computeShortage, optimizedUnserved } from '../../lib/shortageCalc.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'

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

  const result = useMemo(
    () => computeShortage({ persons, villages, vehicles, helpers, settings, scenario, t0: today }),
    [persons, villages, vehicles, helpers, settings, scenario, today]
  )
  const optUnserved = useMemo(() => optimizedUnserved(result), [result])
  const active = persons.filter((p) => p.review !== 'rejected')
  const pending = persons.filter((p) => p.review === 'pending').length
  const diff = optUnserved - result.total

  const groups = GRADES.map((g) => ({
    label: g.label,
    bars: [
      { key: 'target', name: '대상자', value: active.filter((p) => p.grade === g.key).length, fill: 'fill-chart-3', dot: 'bg-chart-3' },
      { key: 'short', name: '부족분', value: result.byGrade[g.key], fill: 'fill-danger', dot: 'bg-danger' }
    ]
  }))

  const myVillages = user?.role === 'dong' ? villages.filter((v) => v.dongCode === user.dong) : villages

  return (
    <PageShell title="현황판">
      <div className="mb-4 flex flex-wrap items-center gap-x-3 gap-y-1">
        <span className="type-caption text-text-meta">기준 시나리오</span>
        <span className="min-w-0 type-strong text-text-pri">{scenario.name}</span>
        <span className="type-meta text-text-meta tabular-nums">준비 {scenario.prepMinutes}분, 도달 {scenario.windowHours}시간 전 발령</span>
        <Link to="/console/shortage" className="type-caption text-primary-text underline underline-offset-2 min-h-11 md:min-h-0 inline-flex items-center">시나리오 변경</Link>
      </div>

      <div className="grid gap-3 md:gap-4 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="총 부족분" value={result.total ? result.total : '0'} unit="명" tone={result.total ? 'danger' : 'neutral'}
          sub={(
            <>
              <span className="block">{result.total ? byGradeLine(result.byGrade) : '부족 없음'}</span>
              {diff < 0 && <span className="block">배정 최적화 시 {optUnserved}명</span>}
            </>
          )} to="/console/shortage" />
        <MetricCard label="대상자 수" value={active.length} unit="명" sub={`산림 연접 마을 ${villages.length}개`} to="/console/roster" />
        <MetricCard label="판독 확인 대기" value={pending} unit="건" sub={pending ? '부족분 잠정값에 포함' : '대기 없음'} to="/console/intake" />
        <MetricCard label="이상 탐지" value={anomalies.length} unit="건" tone={anomalies.length ? 'danger' : 'neutral'} sub="규칙 기반 탐지" />
      </div>

      <div className="mt-4 grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,380px)]">
        <ShortageTable title="마을별 부족분" villages={myVillages} dongs={dongs} byVillage={result.byVillage} pageSize={10} />
        <div className="grid gap-4 content-start">
          <Card title="등급별 대상자와 부족분">
            <BarChart groups={groups} height={220} ariaLabel={`등급별 대상자와 부족분. ${GRADES.map((g) => `${g.label} 부족 ${result.byGrade[g.key]}명`).join(' ')}`} />
          </Card>
          <Card title="이상 탐지" meta={anomalies.length > 5 ? `상위 5건 / ${anomalies.length}건` : `${anomalies.length}건`}>
            <AnomalyList items={anomalies} limit={5} />
          </Card>
          <OpenDataCard />
        </div>
      </div>
    </PageShell>
  )
}
