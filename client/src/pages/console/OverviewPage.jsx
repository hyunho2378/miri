// 현황판. 한 화면에 한 가지 질문, "지금 산불이 나면 몇 명을 못 옮기는가"에만 답한다.
// 순서: 답(큰 문장) → 지금 확인할 일 → 부족한 마을 5곳. 그래프와 공공데이터는 접어 둔다.
import { useMemo } from 'react'
import { ArrowRight, ScanText, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import BarChart from '../../components/dashboard/BarChart.jsx'
import AnomalyList from '../../components/miri/AnomalyList.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
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
  const shortVillages = Object.values(result.byVillage).filter((v) => v.total > 0).length

  const groups = GRADES.map((g) => ({
    label: g.label,
    bars: [
      { key: 'target', name: '대상자', value: active.filter((p) => p.grade === g.key).length, fill: 'fill-chart-3', dot: 'bg-chart-3' },
      { key: 'short', name: '부족분', value: result.byGrade[g.key], fill: 'fill-danger', dot: 'bg-danger' }
    ]
  }))

  const myVillages = user?.role === 'dong' ? villages.filter((v) => v.dongCode === user.dong) : villages
  const todo = pending + anomalies.length

  return (
    <PageShell title="현황판">
      <section className="rounded-lg bg-page shadow-card p-5 lg:p-8">
        <p className="type-caption text-text-meta">{scenario.name}</p>
        {result.total ? (
          <>
            <h2 className="mt-2 type-h1 text-text-pri">
              지금 발령하면 <span className="text-danger-text tabular-nums">{result.total}명</span>을 제시간에 옮기지 못합니다
            </h2>
            <p className="mt-2 type-body text-text-sec">
              {byGradeLine(result.byGrade)}. 부족한 마을은 {shortVillages}곳입니다.
              {diff < 0 && ` 배정을 다시 짜면 ${optUnserved}명까지 줄일 수 있습니다.`}
            </p>
          </>
        ) : (
          <h2 className="mt-2 type-h1 text-text-pri">지금 발령해도 모든 대상자를 옮길 수 있습니다</h2>
        )}
        <div className="mt-5 flex flex-wrap items-center gap-3">
          <Button as={Link} to="/console/shortage" rightIcon={<ArrowRight size={16} aria-hidden="true" />}>부족분 줄이기</Button>
          <span className="type-body-sm text-text-meta tabular-nums">대상자 {active.length}명, 준비 {scenario.prepMinutes}분, 도달 {scenario.windowHours}시간 전 발령</span>
        </div>
      </section>

      <section className="mt-6" aria-labelledby="todo-title">
        <h2 id="todo-title" className="type-h3 text-text-pri">지금 확인할 일 <span className="ml-1 type-body-sm text-text-meta tabular-nums">{todo}건</span></h2>
        {todo === 0 ? (
          <p className="mt-3 type-body-sm text-text-meta">확인할 일이 없습니다.</p>
        ) : (
          <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
            {pending > 0 && (
              <Link to="/console/intake" className="flex items-center gap-4 rounded-lg bg-page shadow-card p-4 lg:p-5 min-h-11 hover:shadow-md transition-shadow duration-fast">
                <ScanText size={24} aria-hidden="true" className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block type-strong text-text-pri">서류에서 읽은 내용 {pending}건 확인</span>
                  <span className="block type-meta text-text-meta">확인 전까지 부족분은 잠정값입니다</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" className="text-text-meta" />
              </Link>
            )}
            {anomalies.length > 0 && (
              <div className="rounded-lg bg-page shadow-card p-4 lg:p-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={24} aria-hidden="true" className="shrink-0 text-danger" />
                  <p className="type-strong text-text-pri">명부와 차량에서 이상한 점 {anomalies.length}건</p>
                </div>
                <div className="mt-2"><AnomalyList items={anomalies} limit={3} /></div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-6">
        <ShortageTable title="부족한 마을" villages={myVillages} dongs={dongs} byVillage={result.byVillage} pageSize={5} />
      </div>

      <div className="mt-6">
        <Disclosure summary="등급별 그래프와 공공데이터 보기">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="등급별 대상자와 부족분">
              <BarChart groups={groups} height={220} ariaLabel={`등급별 대상자와 부족분. ${GRADES.map((g) => `${g.label} 부족 ${result.byGrade[g.key]}명`).join(' ')}`} />
            </Card>
            <OpenDataCard />
          </div>
        </Disclosure>
      </div>
    </PageShell>
  )
}
