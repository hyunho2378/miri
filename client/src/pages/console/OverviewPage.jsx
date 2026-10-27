// 현황판. 상태 띠 한 줄, 숫자 흐름, 부족 마을 목록과 선택한 마을 상세(목록과 상세 구조), 확인할 일 한 줄 목록, 작은 상태 줄.
// 문장은 사실만 서술한다(PRD v2 4절).
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronRight, Circle, Layers, MapPin } from 'lucide-react'
import { vehicleCounts } from '../../lib/vehicleSummary.js'
import { Link } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import PageShell, { todayLabel } from '../../components/miri/PageShell.jsx'
import { PageHeader, StatusBand, NumberFlow, ListDetail, DetailSection, StatusChip, Section, InfoRows } from '../../components/console/index.js'
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
  const user = useAuthStore((s) => s.user)
  const now = useNow(5000)
  const anomalies = useAnomalies(now)
  const [picked, setPicked] = useState(null)
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
      label: '산불위험지수', title: fire.data ? `평균 ${fire.data.mean}, 최고 ${fire.data.max}` : fire.error ? `산불위험지수를 불러오지 못했습니다(${fire.error}).` : '산불위험지수를 불러오는 중입니다.',
      sub: fire.data ? `지수 51 이상 면적 ${over51}%, 산림청 국립산림과학원` : '산림청 국립산림과학원',
      fresh: <FreshnessNote kind="fire" state={fire} />
    },
    {
      key: 'warning',
      label: '기상특보', title: warning.data ? (warning.data.active.length ? `동해 ${warning.data.active.join(', ')}` : '동해 발효 특보 없음') : warning.error ? `기상특보를 불러오지 못했습니다(${warning.error}).` : '기상특보를 불러오는 중입니다.',
      sub: '기상청 기상특보 조회서비스',
      fresh: <FreshnessNote kind="warning" state={warning} />
    },
    {
      key: 'wind',
      label: '바람과 습도', title: h0 ? `${dirName(h0.fromDeg)}풍 ${h0.speed}m/s, 습도 ${h0.humidity}%` : wind.error ? `단기예보를 불러오지 못했습니다(${wind.error}).` : '단기예보를 불러오는 중입니다.',
      sub: '기상청 단기예보 조회서비스',
      fresh: <FreshnessNote kind="wind" state={wind} />
    }
  ]

  const fmtH = (ms) => (ms == null || !Number.isFinite(ms) ? null : `발령 후 ${fmtElapsed((ms - today) / 3600000)}`)
  const deadlineOf = (code) => result.ctx?.deadlines?.[code]?.completeBy
  // 부족 마을 목록: 기한 빠른 순. 부족이 없으면 대피 대상 마을 전체
  const listRows = (shortVillages.length ? ordered.filter((x) => x.r.total > 0) : ordered)
  const items = listRows.map(({ v, r }, i) => ({
    id: v.code,
    icon: <MapPin size={20} />,
    title: v.label,
    sub: `기한 ${fmtH(deadlineOf(v.code)) || '계산 전'}`,
    trailing: r.total > 0 ? `${r.total}명` : '부족 없음',
    chip: i === 0 && r.total > 0 ? <StatusChip tone="danger">가장 급함</StatusChip> : null
  }))
  const selId = items.some((x) => x.id === picked) ? picked : items[0]?.id
  const sel = listRows.find((x) => x.v.code === selId)
  const targetsAll = isDong ? inScope.reduce((s, x) => s + x.r.targetTotal, 0) : result.scopeTargets
  const extraLine = extraNeed.length > 0 && extraNeed.every((e) => e.resolved) ? extraNeed.map((e) => `${e.typeLabel} ${e.count}대`).join(', ') : null

  const flow = [
    { label: '대피 대상', value: fmt(targetsAll), unit: '명', note: `${inScope.length}개 마을` },
    { label: '기준 배정으로 못 옮기는 사람', value: fmt(scopeTotal), unit: '명', note: '지금 차량 기준', tone: 'danger' },
    { label: '추천 배정 적용', value: optUnserved == null ? '계산하는 중' : fmt(optUnserved), unit: optUnserved == null ? '' : '명', note: optUnserved != null && diff < 0 ? `${-diff}명 줄어듦` : '지금 차량 기준' },
    ...(!isDong && extraLine ? [{ label: '협약 뒤', value: '0', unit: '명', note: `${extraLine} 협약 시` }] : [])
  ]

  const rowLink = 'flex min-h-12 items-center gap-3 rounded-lg px-3 hover:bg-mute'
  const todoRows = [
    ...anomalies.slice(0, 5).map((a) => ({ key: a.id, to: a.to, title: ANOMALY_RULES[a.rule], sub: a.target, hot: a.rule === 'deadline' || a.rule === 'noAck' })),
    ...(pending > 0 ? [{ key: 'docs', to: '/console/intake', title: '확인할 서류', n: `${pending}건` }] : []),
    ...(pc.notes > 0 ? [{ key: 'notes', to: '/console/notes', title: '확인할 현장 소식', n: `${pc.notes}건` }] : []),
    ...(staleRoster > 0 ? [{ key: 'stale', to: '/console/roster?recheck=1', title: '명부 재확인 필요', n: `${staleRoster}명` }] : [])
  ]

  return (
    <PageShell title="오늘의 현황" hideHeader>
      <PageHeader
        title="오늘의 현황" meta={todayLabel()}
        action={<Link to="/console/map" className="inline-flex h-10 items-center gap-2 rounded-md bg-subtle px-4 type-body-sm text-text-sec hover:bg-mute"><Layers size={16} aria-hidden="true" /><span className="max-w-[16rem] truncate">{scenario.name}</span></Link>}
      />
      <div className="grid min-w-0 gap-6">
        {live ? (
          <StatusBand tag={d.kind === 'drill' ? '훈련 발령 중' : '발령 중'} tone="primary" action={<Button as={Link} to="/console/dispatch">발령 운영 열기</Button>}>
            이 배정표로 기한 안에 못 옮기는 사람 {fmt(liveUnserved)}명
          </StatusBand>
        ) : (
          <StatusBand
            tag={scopeTotal > 0 ? '기한 초과 우려' : '이상 없음'} tone={scopeTotal > 0 ? 'danger' : 'primary'}
            action={(
              <>
                <Button as={Link} to="/console/shortage">부족분 계산 열기</Button>
                {!isDong && extraNeed.length > 0 && <Button as={Link} to="/console/workspace?kind=doc&new=gian-simple" variant="secondary">협약 추진 기안 쓰기</Button>}
              </>
            )}
          >
            {scopeTotal > 0 ? `${isDong ? `${scopeName}에서 ` : ''}발령이 나면 기한 안에 옮기지 못하는 사람이 ${fmt(scopeTotal)}명입니다` : '발령이 나도 대피 대상 모두 기한 안에 옮길 수 있습니다'}
            {!isDong && extraLine && <span className="mt-1 block type-body text-text-sec">지금 차량 기준, {extraLine}를 더 약속받으면 0명</span>}
          </StatusBand>
        )}

        {!live && <NumberFlow items={flow} />}

        <ListDetail items={items} selectedId={selId} onSelect={setPicked} listLabel="부족 마을" listTitle={`${shortVillages.length ? '부족 마을' : '대피 대상 마을'} ${items.length}곳`}>
          {sel ? (
            <>
              <div className="flex flex-wrap items-baseline justify-between gap-3">
                <h2 className="type-h2 text-text-pri">{sel.v.label}</h2>
                <p className={sel.r.total > 0 ? 'type-kpi text-danger-text' : 'type-kpi text-text-pri'}>{fmt(sel.r.total)}<span className="ml-1 type-h3">명</span></p>
              </div>
              <DetailSection title="결론" className="mt-4">
                <p className="type-body text-text-pri tabular-nums">
                  {sel.r.total > 0
                    ? `기한 안에 못 옮기는 사람은 ${GRADES.filter((g) => sel.r.shortage[g.key]).map((g) => `${g.label} ${sel.r.shortage[g.key]}명`).join(', ')}입니다${sel.r.provisional > 0 ? `. 확인 대기 서류 ${sel.r.provisional}건이 들어 있습니다` : ''}.`
                    : '이 마을은 기한 안에 모두 옮길 수 있습니다.'}
                </p>
              </DetailSection>
              <DetailSection title="할 일">
                <div className="flex flex-wrap gap-2">
                  <Button as={Link} to={`/console/roster?village=${sel.v.code}`}>이 마을 명부 보기</Button>
                  <Button as={Link} to="/console/resources" variant="secondary">협약 차량 확인하기</Button>
                </div>
              </DetailSection>
              <DetailSection title="근거">
                <dl className="grid grid-cols-[auto_1fr] gap-x-6 gap-y-2 type-body-sm tabular-nums">
                  <dt className="text-text-sec">대상자</dt><dd className="text-text-pri">{sel.r.targetTotal}명</dd>
                  <dt className="text-text-sec">대피소 왕복</dt><dd className="text-text-pri">{sel.v.roundTripMin == null ? '대피소 없음' : `${sel.v.roundTripMin}분`}</dd>
                  <dt className="text-text-sec">산불 도달</dt><dd className="text-text-pri">{fmtH(result.arrivals?.[sel.v.code]) || '계산 전'}</dd>
                  <dt className="text-text-sec">이송 완료 기한</dt><dd className="text-text-pri">{fmtH(deadlineOf(sel.v.code)) || '계산 전'}</dd>
                </dl>
              </DetailSection>
            </>
          ) : <p className="type-body text-text-sec">대피 대상 마을이 없습니다.</p>}
        </ListDetail>

        <Section id="ov-todo" title="확인할 일" count={todo}>
          {todoRows.length === 0 ? (
            <p className="type-body text-text-sec">확인할 항목이 없습니다.</p>
          ) : (
            <ul className="grid cq-xl:grid-cols-2 cq-xl:gap-x-10">
              {todoRows.map((t) => (
                <li key={t.key}>
                  <Link to={t.to} className="flex min-h-14 items-center gap-3 rounded-2xl px-4 hover:bg-subtle">
                    <Circle size={16} aria-hidden="true" className={clsx('shrink-0', t.hot ? 'text-danger' : 'text-text-sec')} />
                    <span className="min-w-0 flex-1">
                      <span className="block break-keep type-body text-text-pri">{t.title}</span>
                      {t.sub && <span className="block truncate type-body-sm text-text-sec tabular-nums" title={t.sub}>{t.sub}</span>}
                    </span>
                    {t.n && <span className="type-body-strong text-text-pri tabular-nums">{t.n}</span>}
                    <ChevronRight size={18} aria-hidden="true" className="shrink-0 text-text-sec" />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Section>

        <Section id="ov-state" title="오늘 상황" action={<Link to="/console/resources" className="inline-flex min-h-10 items-center gap-0.5 type-strong text-primary-text hover:underline">협약 차량 확인하기<ChevronRight size={14} aria-hidden="true" /></Link>}>
          <InfoRows columns={2} rows={[
            ...conditions.map((x) => ({ key: x.key, label: x.label, value: x.title, note: x.sub, extra: x.fresh })),
            { key: 'veh', label: '출동 가능 차량', value: `${vc.usable}대`, strong: true, note: `협약 확정 ${vc.agreed}대, 협약 미확정 ${vc.unconfirmed}대, 활동 중 도우미 ${helpers.filter((h) => h.active).length}명` }
          ]} />
        </Section>
      </div>
    </PageShell>
  )
}
