// 현황판. 첫 화면은 정보 묶음 4개: 미이송 예상(기준 포함), 확인 대기, 마을별 부족분, 접힌 참고 자료.
// 문장은 사실만 서술한다(PRD v2 4절). 가정형과 설득형 문장을 쓰지 않는다.
import { useMemo } from 'react'
import { ArrowRight, ScanText, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import BarChart from '../../components/dashboard/BarChart.jsx'
import AnomalyList from '../../components/miri/AnomalyList.jsx'
import BasisLine, { basisText } from '../../components/miri/BasisLine.jsx'
import Card from '../../components/ui/Card.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import OpenDataCard from '../../components/miri/OpenDataCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ShortageTable from '../../components/miri/ShortageTable.jsx'
import ShortageValue from '../../components/miri/ShortageValue.jsx'
import useAnomalies from '../../hooks/useAnomalies.js'
import useNow from '../../hooks/useNow.js'
import { GRADES, emptyByGrade } from '../../lib/shortage.js'
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
  const pending = persons.filter((p) => p.review === 'pending' && (user?.role !== 'dong' || villages.find((v) => v.code === p.villageCode)?.dongCode === user.dong)).length
  const diff = optUnserved - result.total
  const isDong = user?.role === 'dong'
  const myVillages = isDong ? villages.filter((v) => v.dongCode === user.dong) : villages
  // 동 담당자는 소속 동의 마을만 합산한다. 시 관리자는 동해시 전체
  const scope = myVillages.map((v) => result.byVillage[v.code])
  const scopeTotal = scope.reduce((s, v) => s + v.total, 0)
  const scopeByGrade = scope.reduce((acc, v) => { for (const g of GRADES) acc[g.key] += v.shortage[g.key]; return acc }, emptyByGrade())
  const scopeProvisional = scope.reduce((s, v) => s + v.provisional, 0)
  const scopeName = isDong ? dongs.find((d) => d.code === user.dong)?.name || user.dong : '동해시 전체'
  const shortVillages = scope.filter((v) => v.total > 0).length

  const groups = GRADES.map((g) => ({
    label: g.label,
    bars: [
      { key: 'target', name: '대상자', value: active.filter((p) => p.grade === g.key).length, fill: 'fill-chart-3', dot: 'bg-chart-3' },
      { key: 'short', name: '미이송 예상', value: result.byGrade[g.key], fill: 'fill-danger', dot: 'bg-danger' }
    ]
  }))

  const todo = pending + anomalies.length
  const completeText = scenario.completeBeforeHours ? `도달 ${scenario.completeBeforeHours}시간 전` : '도달 시각'

  return (
    <PageShell title="현황판">
      <Card as="section" padding="lg" aria-labelledby="kpi-title">
        <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(0,360px)] lg:items-start">
          <div className="min-w-0">
            <h2 id="kpi-title" className="sr-only">미이송 예상</h2>
            <ShortageValue value={scopeTotal} byGrade={scopeByGrade} provisional={scopeProvisional}>
              <BasisLine scenario={scenario.name} today={today} />
            </ShortageValue>
            <p className="mt-3 type-body-sm text-text-pri tabular-nums">
              {isDong ? '동해시 전체 기준, ' : ''}
              {diff < 0
                ? `추천 배정 적용 시 ${optUnserved}명(기본 순서 대비 ${-diff}명 감소)`
                : diff === 0
                  ? `추천 배정 적용 시 ${optUnserved}명(기본 순서와 동일)`
                  : `추천 배정 적용 시 ${optUnserved}명(기본 순서 대비 ${diff}명 증가)`}
            </p>
            <div className="mt-5">
              <Button as={Link} to="/console/shortage" rightIcon={<ArrowRight size={16} aria-hidden="true" />}>부족분 계산</Button>
            </div>
          </div>
          <KeyValue dense items={[
            { label: '집계 범위', value: scopeName, strong: true },
            { label: '부족 마을', value: `${shortVillages}곳` },
            { label: '대상자', value: `${active.filter((p) => myVillages.some((v) => v.code === p.villageCode)).length}명` },
            { label: '준비 시간', value: `${scenario.prepMinutes}분` },
            { label: '발령 기준', value: `도달 ${scenario.windowHours}시간 전` },
            { label: '이송 완료 기한', value: completeText }
          ]} />
        </div>
      </Card>

      <section className="mt-6" aria-labelledby="todo-title">
        <h2 id="todo-title" className="type-h3 text-text-pri">확인 대기 <span className="ml-1 type-body-sm text-text-meta tabular-nums">{todo}건</span></h2>
        {todo === 0 ? (
          <p className="mt-3 type-body-sm text-text-meta">확인 대기 항목이 없습니다.</p>
        ) : (
          <div className="mt-3 grid items-start gap-3 md:grid-cols-2">
            {pending > 0 && (
              <Link to="/console/intake" className="flex items-center gap-4 rounded-lg bg-page shadow-card p-4 lg:p-5 min-h-11 hover:shadow-md transition-shadow duration-fast">
                <ScanText size={24} aria-hidden="true" className="shrink-0 text-primary" />
                <span className="min-w-0 flex-1">
                  <span className="block type-strong text-text-pri">확인 대기 서류 {pending}건</span>
                  <span className="block type-meta text-text-meta">확인이 끝나기 전까지 미이송 예상은 잠정값으로 계산합니다.</span>
                </span>
                <ArrowRight size={16} aria-hidden="true" className="text-text-meta" />
              </Link>
            )}
            {anomalies.length > 0 && (
              <div className="rounded-lg bg-page shadow-card p-4 lg:p-5">
                <div className="flex items-center gap-3">
                  <ShieldAlert size={24} aria-hidden="true" className="shrink-0 text-danger" />
                  <p className="type-strong text-text-pri">이상 탐지 {anomalies.length}건</p>
                </div>
                <div className="mt-2"><AnomalyList items={anomalies} limit={3} /></div>
              </div>
            )}
          </div>
        )}
      </section>

      <div className="mt-6">
        <ShortageTable title="마을별 부족분" basis={basisText({ scenario: scenario.name, today })} villages={myVillages} dongs={dongs} byVillage={result.byVillage} pageSize={5} />
      </div>

      <div className="mt-6">
        <Disclosure summary="등급별 그래프와 공공데이터">
          <div className="grid gap-4 lg:grid-cols-2">
            <Card title="등급별 대상자와 미이송 예상" desc={`기준 시나리오 ${scenario.name}`}>
              <BarChart groups={groups} height={220} ariaLabel={`등급별 대상자와 미이송 예상. ${GRADES.map((g) => `${g.label} 미이송 예상 ${result.byGrade[g.key]}명`).join(' ')}`} />
            </Card>
            <OpenDataCard />
          </div>
        </Disclosure>
      </div>
    </PageShell>
  )
}
