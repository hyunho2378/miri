// 현황판. 상태 띠 한 줄, 숫자 흐름, 부족 마을 목록과 선택한 마을 상세(목록과 상세 구조), 확인할 일 한 줄 목록, 작은 상태 줄.
// 문장은 사실만 서술한다(PRD v2 4절).
import { useMemo, useState } from 'react'
import clsx from 'clsx'

import { vehicleCounts } from '../../lib/vehicleSummary.js'
import { Link, useNavigate } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import PageShell, { todayLabel } from '../../components/miri/PageShell.jsx'
import { ConditionMenu, PageHeader, StatusBand, NumberFlow, DetailSection, Section, InfoRows, LinkRow, SummaryRows } from '../../components/console/index.js'
import VillageBars from '../../components/dashboard/VillageBars.jsx'
import Modal from '../../components/ui/Modal.jsx'
import DispatchAction from '../../components/layout/DispatchAction.jsx'
import FreshnessNote from '../../components/miri/FreshnessNote.jsx'
import { useFireRisk, useWarning, useWind, dirName } from '../../components/miri/FireRiskStrip.jsx'
import useAnomalies from '../../hooks/useAnomalies.js'
import useNow from '../../hooks/useNow.js'
import { ANOMALY_RULES } from '../../lib/anomaly.js'
import { GRADES, emptyByGrade } from '../../lib/shortage.js'
import { computeShortage, requiredExtraVehicles } from '../../lib/shortageCalc.js'
import useBoardingRecommended from '../../hooks/useBoardingRecommended.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import { fmtElapsed } from '../../lib/geo.js'
import { pendingCounts } from '../../lib/basis.js'
import { staleRosterCount, STALE_DAYS } from '../../lib/handoverRows.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'

const fmt = (n) => Number(n || 0).toLocaleString('ko-KR')

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
  const scenarios = useMiriStore((s) => s.scenarios)
  const setActiveScenario = useMiriStore((s) => s.setActiveScenario)
  const navigate = useNavigate()
  const user = useAuthStore((s) => s.user)
  const now = useNow(5000)
  const anomalies = useAnomalies(now)
  const [picked, setPicked] = useState(null)
  const [grade, setGrade] = useState('all')
  const fire = useFireRisk()
  const warning = useWarning()
  const wind = useWind()

  const result = useMemo(
    () => computeShortage({ persons, villages, vehicles, helpers, settings, scenario, t0: today }),
    [persons, villages, vehicles, helpers, settings, scenario, today]
  )
  // 추천 배정 탐색은 1초 안팎이 걸려 첫 화면을 멈추게 하므로 부족분 화면과 같은 캐시로 뒤에서 구한다
  // 0명이 되는 조건(지금 차량 기준 추가 협약)은 첫 화면 큰 숫자 아래에 한 줄로 보인다
  const extraNeed = useMemo(() => (result.total > 0 ? requiredExtraVehicles({ persons, villages, vehicles, helpers, settings, scenario, t0: today }, result) : []), [result]) // eslint-disable-line react-hooks/exhaustive-deps
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

  const vc = vehicleCounts(vehicles)
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
      label: '산불위험지수', title: fire.data ? `평균 ${fire.data.mean}, 최고 ${fire.data.max}` : fire.error ? `조회 실패(${fire.error})` : '조회 중',
      sub: fire.data ? `지수 51 이상 면적 ${over51}%, 산림청 국립산림과학원` : '산림청 국립산림과학원',
      fresh: <FreshnessNote kind="fire" state={fire} />
    },
    {
      key: 'warning',
      label: '기상특보', title: warning.data ? (warning.data.active.length ? warning.data.active.join(', ') : '발효 특보 없음') : warning.error ? `조회 실패(${warning.error})` : '조회 중',
      sub: '기상청 기상특보 조회서비스',
      fresh: <FreshnessNote kind="warning" state={warning} />
    },
    {
      key: 'wind',
      label: '바람과 습도', title: h0 ? `${dirName(h0.fromDeg)}풍 ${h0.speed}m/s, 습도 ${h0.humidity}%` : wind.error ? `조회 실패(${wind.error})` : '조회 중',
      sub: '기상청 단기예보 조회서비스',
      fresh: <FreshnessNote kind="wind" state={wind} />
    }
  ]

  const fmtH = (ms) => (ms == null || !Number.isFinite(ms) ? null : `발령 후 ${fmtElapsed((ms - today) / 3600000)}`)
  const deadlineOf = (code) => result.ctx?.deadlines?.[code]?.completeBy
  const villageRows = (shortVillages.length ? ordered.filter((x) => x.r.total > 0) : ordered)
  const sel = villageRows.find((x) => x.v.code === picked)
  const targetsAll = isDong ? inScope.reduce((s, x) => s + x.r.targetTotal, 0) : result.scopeTargets
  const extraLine = extraNeed.length > 0 && extraNeed.every((e) => e.resolved) ? extraNeed.map((e) => `${e.typeLabel} ${e.count}대`).join(', ') : null

  const bars = ordered.map(({ v, r }) => ({ key: v.code, name: v.label, value: grade === 'all' ? r.total : r.shortage[grade] })).sort((a, b) => b.value - a.value).slice(0, 8)
  const chips = [{ key: 'all', label: '전체', n: scopeTotal }, ...GRADES.map((g) => ({ key: g.key, label: g.label, n: scopeByGrade[g.key] }))]
  const rowSub = (v) => (v.roundTripMin == null ? '대피소 없음' : `왕복 ${v.roundTripMin}분`)
  const factRows = [
    { key: 'p', label: '명부 대상자', value: `${fmt(active.length)}명` },
    { key: 'v', label: '대피 대상 마을', value: `${inScope.length}곳` },
    { key: 's', label: '이동 불가 발생 마을', value: `${shortVillages.length}곳`, tone: shortVillages.length ? 'danger' : undefined },
    { key: 'a', label: '첫 산불 도달', value: `발령 후 ${fmtElapsed(scenario.windowHours)}` },
    ...(firstCompleteH !== scenario.windowHours ? [{ key: 'c', label: '첫 마을 이송 기한', value: `발령 후 ${fmtElapsed(firstCompleteH)}` }] : []),
    ...(scopeProvisional > 0 ? [{ key: 'q', label: '확인 대기 서류 포함', value: `${scopeProvisional}건` }] : [])
  ]
  const carRows = [
    { key: 'u', label: '출동 가능', value: `${vc.usable}대` },
    { key: 'g', label: '협약 확정', value: `${vc.agreed}대` },
    { key: 'n', label: '협약 미확정', value: `${vc.unconfirmed}대`, tone: vc.unconfirmed ? 'danger' : undefined },
    { key: 'h', label: '활동 중 도우미', value: `${helpers.filter((h) => h.active).length}명` }
  ]
  const conditionRows = conditions.map((x) => ({ key: x.key, label: x.label, value: x.title }))

  const flow = [
    { label: '대피 대상 인원', value: fmt(targetsAll), unit: '명', note: `${inScope.length}개 마을` },
    { label: '기준 배정 시 이동 불가 인원', value: fmt(scopeTotal), unit: '명', note: '기준 배정, 발령 전', tone: 'danger' },
    { label: '추천 배정 시 이동 불가 인원', value: optUnserved == null ? '조회 중' : fmt(optUnserved), unit: optUnserved == null ? '' : '명', note: optUnserved != null && diff < 0 ? `추천 배정 적용, ${-diff}명 감소` : '추천 배정 적용' },
    ...(!isDong && extraLine ? [{ label: '협약 후 이동 불가 인원', value: '0', unit: '명', note: `${extraLine} 추가` }] : [])
  ]

  // 점검 필요 항목은 세 건만 보이고 전체는 상단바 점검 필요 목록에서 연다
  const openAnomalies = () => document.querySelector('button[aria-label^="점검 필요"]')?.click()
  const todoRows = [
    ...anomalies.slice(0, 3).map((a) => ({ key: a.id, to: a.to, title: ANOMALY_RULES[a.rule], sub: a.target })),
    ...(anomalies.length > 3 ? [{ key: 'anomaly-all', onClick: openAnomalies, title: '점검 필요 전체', n: `${anomalies.length}건` }] : []),
    ...(pending > 0 ? [{ key: 'docs', to: '/console/intake', title: '서류 확인 대기', sub: 'AI 읽기 결과 확인', n: `${pending}건` }] : []),
    ...(pc.notes > 0 ? [{ key: 'notes', to: '/console/notes', title: '현장 소식 확인 대기', n: `${pc.notes}건` }] : []),
    ...(staleRoster > 0 ? [{ key: 'stale', to: '/console/roster?recheck=1', title: '명부 재확인 대상', n: `${staleRoster}명` }] : [])
  ]

  return (
    <PageShell title="오늘의 현황" hideHeader>
      <PageHeader
        title="오늘의 현황" meta={todayLabel()}
        action={(
          <ConditionMenu
            scenarios={scenarios} value={scenario.id} onPick={setActiveScenario}
            items={[{ key: 'cond', label: '계산 조건 변경', onClick: () => navigate('/console/shortage') }, { key: 'map', label: '상황판에서 보기', onClick: () => navigate('/console/map') }]}
          />
        )}
      />
      <div className="grid min-w-0 gap-6">
        {live ? (
          <StatusBand tag={d.kind === 'drill' ? '훈련 발령 중' : '발령 중'} tone="primary" action={<Button as={Link} to="/console/dispatch">발령 운영 열기</Button>}>
            현재 배정표 시 이동 불가 인원 {fmt(liveUnserved)}명
          </StatusBand>
        ) : (
          <StatusBand
            tag={scopeTotal > 0 ? '기한 초과 우려' : '이상 없음'} tone={scopeTotal > 0 ? 'danger' : 'primary'}
            action={(
              <>
                <Button as={Link} to="/console/shortage">부족분 계산</Button>
                {!isDong && extraNeed.length > 0 && <Button as={Link} to="/console/workspace?kind=doc&new=gian-simple" variant="secondary">협약 추진 기안</Button>}
              </>
            )}
          >
            {scopeTotal > 0 ? `${isDong ? `${scopeName} ` : ''}기준 배정 시 이동 불가 인원 ${fmt(scopeTotal)}명, 협약 차량 확보 필요` : '대피 대상 전원 기한 내 이송 가능'}
          </StatusBand>
        )}

        {!live && <NumberFlow items={flow} />}

        {/* 대시보드: 한 화면에서 여러 면을 동시에 본다. 열 배치는 본문 폭 기준(공통 부품 규칙) */}
        <div
          className={clsx(
            'grid min-w-0 gap-x-10 gap-y-8',
            "cq-lg:[grid-template-columns:minmax(0,1fr)_20rem] cq-lg:[grid-template-areas:'chart_todo''facts_facts']",
            "cq-xl:[grid-template-columns:17rem_minmax(0,1fr)_21rem] cq-xl:[grid-template-areas:'facts_chart_todo']",
            "cq-2xl:[grid-template-columns:19rem_minmax(0,1fr)_24rem]"
          )}
        >
          <div className="grid min-w-0 content-start gap-8 [grid-area:chart]">
            <Section id="ov-chart" title="마을별 이동 불가 인원" action={<Link to="/console/map" className="inline-flex min-h-7 items-center type-strong text-primary-text hover:underline">상황판에서 보기</Link>}>
              {bars.length ? <VillageBars rows={bars} /> : <p className="type-body text-text-sec">대피 대상 마을 없음</p>}
              <div role="radiogroup" aria-label="이송 등급" className="mt-3 flex flex-wrap gap-2">
                {chips.map((c) => {
                  const on = grade === c.key
                  return (
                    <button
                      key={c.key} type="button" role="radio" aria-checked={on} onClick={() => setGrade(c.key)}
                      className={clsx('inline-flex h-8 items-center gap-1.5 rounded-xs px-3 type-body-sm font-bold', on ? 'bg-primary text-text-inverse' : 'bg-subtle text-text-pri hover:bg-mute')}
                    >
                      {c.label}<span className="tabular-nums">{c.n}</span>
                    </button>
                  )
                })}
              </div>
            </Section>
            <Section id="ov-village" title={`${shortVillages.length ? '이동 불가 발생 마을' : '대피 대상 마을'} ${villageRows.length}곳`}>
              <ul className="cq-xl:grid cq-xl:grid-cols-2 cq-xl:gap-x-2 cq-2xl:grid-cols-3">
                {villageRows.map(({ v, r }) => (
                  <li key={v.code}>
                    <LinkRow dense onClick={() => setPicked(v.code)} title={v.label} sub={rowSub(v)} value={r.total > 0 ? `${r.total}명` : '없음'} tone={r.total > 0 ? 'danger' : undefined} />
                  </li>
                ))}
              </ul>
            </Section>
          </div>

          <div className="grid min-w-0 content-start gap-8 [grid-area:todo]">
            <Section id="ov-todo" title="처리할 일" count={todo} action={<DispatchAction size="sm" />}>
              {todoRows.length === 0 ? (
                <p className="type-body text-text-sec">처리할 일 없음</p>
              ) : (
                <ul>
                  {todoRows.map((t) => <li key={t.key}><LinkRow dense to={t.to} onClick={t.onClick} title={t.title} sub={t.sub} value={t.n} /></li>)}
                </ul>
              )}
            </Section>
            <Section tone="surface" dense id="ov-state" title="오늘 산불 여건" className="!p-6">
              <SummaryRows rows={conditionRows} />
              <p className="mt-1 type-meta text-text-sec">산림청 국립산림과학원, 기상청 조회서비스</p>
            </Section>
          </div>

          <div className="grid min-w-0 content-start gap-6 cq-lg:grid-cols-2 cq-xl:grid-cols-1 [grid-area:facts]">
            <Section tone="surface" dense id="ov-facts" title="대피 대상 현황" className="!p-6">
              <SummaryRows rows={factRows} />
            </Section>
            <div className="grid min-w-0 content-start gap-6">
              <Section tone="surface" dense id="ov-cars" className="!p-6" title="출동 가능 차량" action={<Link to="/console/resources" className="inline-flex min-h-8 items-center type-strong text-primary-text hover:underline">협약 차량 확인</Link>}>
                <SummaryRows rows={carRows} />
              </Section>
            </div>
          </div>
        </div>
      </div>

      <Modal
        open={!!sel} onClose={() => setPicked(null)} title={sel ? `${sel.v.label} 이동 불가 인원 ${fmt(sel.r.total)}명` : ''} className="max-w-[520px]"
        footer={sel && (
          <>
            <Button as={Link} to="/console/resources" variant="secondary">협약 차량 확인</Button>
            <Button as={Link} to={`/console/roster?village=${sel.v.code}`}>마을 명부</Button>
          </>
        )}
      >
        {sel && (
          <DetailSection title="근거">
            <InfoRows rows={[
              { key: 'g', label: '등급별 이동 불가', value: GRADES.filter((g) => sel.r.shortage[g.key]).map((g) => `${g.label} ${sel.r.shortage[g.key]}명`).join(', ') || '없음' },
              ...(sel.r.provisional > 0 ? [{ key: 'p', label: '확인 대기 서류 포함', value: `${sel.r.provisional}건` }] : []),
              { key: 't', label: '대상자', value: `${sel.r.targetTotal}명` },
              { key: 'r', label: '대피소 왕복', value: sel.v.roundTripMin == null ? '대피소 없음' : `${sel.v.roundTripMin}분` },
              { key: 'a', label: '산불 도달', value: fmtH(result.arrivals?.[sel.v.code]) || '계산 전' },
              { key: 'd', label: '이송 완료 기한', value: fmtH(deadlineOf(sel.v.code)) || '계산 전' }
            ]} />
          </DetailSection>
        )}
      </Modal>
    </PageShell>
  )
}
