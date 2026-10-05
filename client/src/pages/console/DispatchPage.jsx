// 발령 운영(IA 4.6). 핵심 기능 2(마을별 도달 시계)와 3(배정표), 추천 배정 계산.
// 평시 → 실행대기 발령 → 배정 검토 → 이송 진행 → 종료. 단계 표시줄 아래에는 현재 단계의 할 일 하나만 크게 둔다(PRD v2 F2).
import { useMemo, useState } from 'react'
import { ExternalLink, MessageSquareText, Minus, Plus, Route, Siren, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import BasisLine from '../../components/miri/BasisLine.jsx'
import DeadlineClock from '../../components/miri/DeadlineClock.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import AssignmentBundle from '../../components/miri/AssignmentBundle.jsx'
import BaselineCompare from '../../components/miri/BaselineCompare.jsx'
import StepIndicator from '../../components/miri/StepIndicator.jsx'
import TransportStatusTable from '../../components/miri/TransportStatusTable.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import SectionTitle from '../../components/ui/SectionTitle.jsx'
import Modal from '../../components/ui/Modal.jsx'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import useNow from '../../hooks/useNow.js'
import useToast from '../../hooks/useToast.js'
import { UNSERVED_REASON } from '../../lib/assign.js'
import { DECLINE_REASONS, FAIL_REASONS, STEP_LABEL, ackOf, failReasonOf, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { MIN, fmtHM, fmtHMFrom, remainText } from '../../lib/time.js'
import useAuthStore from '../../store/useAuthStore.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'

const SPEEDS = [{ value: 1, label: '1배' }, { value: 60, label: '60배' }, { value: 240, label: '240배' }]
const KINDS = [{ value: 'drill', label: '훈련 발령' }, { value: 'real', label: '실제 발령' }]
const COUNT_ORDER = ['wait', 'depart', 'arrive', 'board', 'handover', 'fail', 'handedToFire', 'unassigned']
const COUNT_LABEL = { ...STEP_LABEL, unassigned: '미배정' }
const ISSUE = ['fail', 'handedToFire', 'unassigned']
const completeText = (h) => (h ? `도달 ${h}시간 전` : '도달 시각')

function useVillageMeta() {
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  return useMemo(() => {
    const label = Object.fromEntries(villages.map((v) => [v.code, v.label]))
    const dong = Object.fromEntries(villages.map((v) => [v.code, dongs.find((d) => d.code === v.dongCode)?.name || v.dongCode]))
    return { label: (c) => label[c] || c, dong: (c) => dong[c] || c }
  }, [villages, dongs])
}

// 발령 기한 = 도달 시각 - 시나리오 첫 도달 시간. 시나리오가 없으면 설정 기본값
function deadlinesOf(arrival, settings, scenario) {
  return {
    dispatchDeadline: arrival - (scenario?.windowHours ?? settings.windowHours) * 60 * MIN,
    completeDeadline: arrival - settings.completeBeforeHours * 60 * MIN
  }
}

// 훈련 시뮬레이션 속도. 훈련 발령에서만 그린다
function SpeedControl({ value, onChange }) {
  return (
    <div>
      <p className="mb-1.5 type-caption text-text-sec">훈련 시뮬레이션 속도</p>
      <SegmentControl label="훈련 시뮬레이션 속도" items={SPEEDS} value={value} onChange={onChange} />
      <p className="mt-1.5 type-meta text-text-meta">60배 속도에서는 1시간이 1분에 진행됩니다.</p>
    </div>
  )
}

// 현재 단계의 할 일 하나를 크게 보이는 영역
function TaskCard({ step, title, desc, actions, children }) {
  return (
    <Card as="section" padding="lg" aria-labelledby="dispatch-task">
      <p className="type-caption text-text-meta">현재 단계: {step}</p>
      <h2 id="dispatch-task" className="mt-1 type-h1 text-text-pri">{title}</h2>
      {desc && <p className="mt-2 max-w-text type-body text-text-sec tabular-nums">{desc}</p>}
      {children && <div className="mt-5 space-y-4">{children}</div>}
      {actions && <div className="mt-5 flex flex-wrap items-center gap-3">{actions}</div>}
    </Card>
  )
}

// 평시와 종료 단계: 발령 개시
function StartPanel() {
  const role = useAuthStore((s) => s.user?.role)
  const start = useDispatchStore((s) => s.start)
  const status = useDispatchStore((s) => s.status)
  const closedRecordId = useDispatchStore((s) => s.closedRecordId)
  const scenario = useMiriStore(activeScenario)
  const today = useMiriStore((s) => s.today)
  const persons = useMiriStore((s) => s.persons)
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const [kind, setKind] = useState('drill')
  const [speed, setSpeed] = useState(60)
  const targets = persons.filter((p) => p.review !== 'rejected')
  const pending = targets.filter((p) => p.review === 'pending').length

  return (
    <div className="space-y-4">
      {status === 'closed' && closedRecordId && (
        <div role="status" className="rounded-lg bg-subtle p-4">
          <p className="type-body-sm text-text-pri">발령이 종료되었습니다. 이송 기록을 저장했습니다.</p>
          <Link to={`/console/records/${closedRecordId}`} className="mt-1 inline-flex min-h-11 md:min-h-0 items-center type-body-sm text-primary-text underline underline-offset-2">방금 저장한 기록 보기</Link>
        </div>
      )}
      <TaskCard
        step={status === 'closed' ? '종료' : '평시'} title="발령 개시"
        desc={`기준 시나리오 ${scenario?.name}에 따라 배정을 계산합니다.`}
        actions={role === 'city' ? (
          <Button size="lg" leftIcon={<Siren size={16} aria-hidden="true" />} onClick={() => start({ kind, speed })}>
            {kind === 'drill' ? '훈련 발령 개시' : '실제 발령 개시'}
          </Button>
        ) : (
          <p className="rounded-md bg-subtle p-3 type-body-sm text-text-sec">발령 개시와 종료는 시 관리자 권한으로만 처리합니다.</p>
        )}
      >
        <div>
          <p className="mb-1.5 type-caption text-text-sec">발령 종류</p>
          <SegmentControl label="발령 종류" items={KINDS} value={kind} onChange={(v) => { setKind(v); if (v === 'real') setSpeed(1) }} />
          {kind === 'real' && <p className="mt-1.5 type-meta text-text-meta">실제 발령은 실제 시각 기준으로 진행하며 속도를 조절하지 않습니다.</p>}
        </div>
        {kind === 'drill' && <SpeedControl value={speed} onChange={setSpeed} />}
      </TaskCard>
      <Card title="발령 기준" desc="현황판 기준 시나리오">
        <KeyValue items={[
          { label: '시나리오', value: scenario?.name, strong: true },
          { label: '이송 대상', value: <>{targets.length}명{pending > 0 && <span className="text-primary-text">, 확인 대기 서류 {pending}건 포함</span>}</> },
          { label: '가용 차량', value: `${vehicles.filter((v) => v.available !== false).length}대 / 전체 ${vehicles.length}대` },
          { label: '도우미', value: `${helpers.filter((h) => h.active !== false).length}명` }
        ]} />
        <BasisLine className="mt-3" today={today} />
        <Link to="/console/shortage" className="mt-3 inline-flex min-h-11 md:min-h-0 items-center type-body-sm text-primary-text underline underline-offset-2">시나리오 변경</Link>
      </Card>
    </div>
  )
}

// 실행대기 발령: 추천 배정 계산 + 마을별 도달 예측 조정
function StandbyPanel({ now, meta }) {
  const scenario = useMiriStore(activeScenario)
  const arrivals = useDispatchStore((s) => s.arrivals)
  const kind = useDispatchStore((s) => s.kind)
  const speed = useDispatchStore((s) => s.speed)
  const setSpeed = useDispatchStore((s) => s.setSpeed)
  const setArrival = useDispatchStore((s) => s.setArrival)
  const runAssign = useDispatchStore((s) => s.runAssign)
  const settings = useMiriStore((s) => s.settings)
  const [busy, setBusy] = useState(false)
  const list = Object.entries(arrivals).sort((a, b) => a[1] - b[1])

  const onAssign = () => {
    setBusy(true)
    setTimeout(() => { runAssign(); setBusy(false) }, 30)
  }

  return (
    <div className="space-y-4">
      <TaskCard
        step="실행대기 발령" title="추천 배정 계산"
        desc={`준비 ${settings.prepMinutes}분, 이송 완료 기한 ${completeText(settings.completeBeforeHours)} 조건으로 차량과 도우미 배정을 계산합니다.`}
        actions={<Button size="lg" loading={busy} leftIcon={<Route size={16} aria-hidden="true" />} onClick={onAssign}>추천 배정 계산</Button>}
      >
        {kind === 'drill' && <SpeedControl value={speed} onChange={setSpeed} />}
      </TaskCard>
      <Disclosure summary={`마을별 도달 시계 (${list.length}곳, 발령 기한 이른 순)`}>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(([code, arrival]) => (
            <li key={code} className="min-w-0 flex flex-col gap-2">
              <DeadlineClock title={meta.label(code)} {...deadlinesOf(arrival, settings, scenario)} now={now} dispatched={false} sub={`${meta.dong(code)}, 산불 도달 예측 ${fmtHM(arrival)}`} />
              <div className="flex flex-wrap items-center gap-2 px-1">
                <span className="type-caption text-text-sec">도달 예측 조정</span>
                <Button size="sm" variant="secondary" aria-label={`${meta.label(code)} 도달 예측 30분 앞당김`} leftIcon={<Minus size={14} aria-hidden="true" />} onClick={() => setArrival(code, arrival - 30 * MIN)}>30분</Button>
                <Button size="sm" variant="secondary" aria-label={`${meta.label(code)} 도달 예측 30분 늦춤`} leftIcon={<Plus size={14} aria-hidden="true" />} onClick={() => setArrival(code, arrival + 30 * MIN)}>30분</Button>
              </div>
            </li>
          ))}
        </ul>
      </Disclosure>
    </div>
  )
}

// 배정 검토: 추천 배정 결과, 기본 순서 비교, 배정표, 수동 조정, 미배정, 확정 후 전송
function AssignedPanel({ meta }) {
  const result = useDispatchStore((s) => s.result)
  const kind = useDispatchStore((s) => s.kind)
  const speed = useDispatchStore((s) => s.speed)
  const setSpeed = useDispatchStore((s) => s.setSpeed)
  const runAssign = useDispatchStore((s) => s.runAssign)
  const movePerson = useDispatchStore((s) => s.movePerson)
  const confirmAndSend = useDispatchStore((s) => s.confirmAndSend)
  const vehicles = useMiriStore((s) => s.vehicles)
  const toast = useToast()
  const trips = result.assignments.reduce((s, a) => s + a.trips.length, 0)
  const firstDepart = Math.min(...result.assignments.flatMap((a) => (a.trips || []).map((t) => t.departAt)).filter(Number.isFinite))

  const unassignedRows = result.unassigned.map((u) => ({ ...u, code: u.personCode }))
  const unassignedCols = [
    { key: 'code', label: '대상자', render: (r) => <span className="tabular-nums">{r.code}</span>, sortable: true },
    { key: 'village', label: '마을', render: (r) => meta.label(r.village), sortValue: (r) => r.village, sortable: true },
    { key: 'grade', label: '등급', render: (r) => <GradeChip grade={r.grade} size="sm" /> },
    { key: 'reason', label: '사유', render: (r) => UNSERVED_REASON[r.reason] || r.reason },
    { key: 'next', label: '조치', render: () => <StatusPill status="handedToFire" label="소방 인계 대상" /> }
  ]

  return (
    <div className="space-y-4">
      <TaskCard
        step="배정 검토" title="배정 확정"
        desc={`배정 차량 ${result.assignments.length}대, ${trips}회차, 미이송 예상 ${result.unassigned.length}명, 마지막 이송 완료 ${fmtHMFrom(result.metrics.lastFinishAt, firstDepart)}`}
        actions={(
          <>
            <Button size="lg" leftIcon={<MessageSquareText size={16} aria-hidden="true" />} onClick={() => { confirmAndSend(); toast('배정을 확정하고 도우미 배정표를 전송했습니다.', 'primary') }}>배정 확정 후 전송</Button>
            <Button size="lg" variant="secondary" onClick={() => { runAssign(); toast('배정을 다시 계산했습니다.') }}>다시 계산</Button>
          </>
        )}
      >
        {result.manualEdits ? <p role="status" className="type-body-sm text-text-sec">수동 조정 {result.manualEdits}건을 반영했습니다.</p> : null}
        {kind === 'drill' && <SpeedControl value={speed} onChange={setSpeed} />}
      </TaskCard>
      {result.warnings?.length > 0 && (
        <Card as="div" role="alert" tone="danger" padding="sm">
          <p className="type-body-sm text-danger-text">
            <span className="type-strong">도우미가 부족한 차량: {result.warnings.map((w) => `${w.vehicleCode} (${w.got}/${w.need}명)`).join(', ')}.</span> 차량과 도우미 화면에서 도우미를 추가해 주십시오.
          </p>
        </Card>
      )}
      <BaselineCompare result={result} villageLabel={meta.label} />
      <SectionTitle
        className="mt-2"
        title="배정표"
        desc={<span className="inline-flex items-center gap-1"><Route size={14} aria-hidden="true" className="text-primary-text" />추천 배정 기준. 차량별 회차와 대상자 순서입니다.</span>}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {result.assignments.map((a) => (
          <AssignmentBundle
            key={a.vehicleCode} assignment={a} vehicle={vehicles.find((v) => v.code === a.vehicleCode)}
            villageLabel={meta.label} assignments={result.assignments} vehicles={vehicles} editable
            onMove={(code, veh, idx) => { movePerson(code, veh, idx); toast(`회차 이동: ${code}, ${veh} ${idx}회차`) }}
          />
        ))}
      </div>
      <TableCard
        title="미배정" count={`${result.unassigned.length}명`} desc="이송 진행 단계에서 소방 인계 대상으로 분류됩니다."
        columns={unassignedCols} rows={unassignedRows} rowKey={(r) => r.code} pageSize={10} caption="미배정 대상자"
        emptyCompact emptyTitle="미배정 없음" emptyDesc="전원 기한 내 배정되었습니다."
      />
    </div>
  )
}

// 이송 진행: 실시간 현황, 도우미 응답, 실패 대응, 마을별 시계
function SentPanel({ now, meta }) {
  const scenario = useMiriStore(activeScenario)
  const d = useDispatchStore()
  const persons = useMiriStore((s) => s.persons)
  const settings = useMiriStore((s) => s.settings)
  const role = useAuthStore((s) => s.user?.role)
  const toast = useToast()
  const [filter, setFilter] = useState('all')
  const [confirmClose, setConfirmClose] = useState(false)

  const stops = useMemo(() => indexStops(d.result), [d.result])
  const unassignedMap = useMemo(() => Object.fromEntries(d.result.unassigned.map((u) => [u.personCode, u])), [d.result])

  const rows = []
  const counts = Object.fromEntries(COUNT_ORDER.map((k) => [k, 0]))
  for (const p of persons) {
    if (p.review === 'rejected') continue
    let step = stepOf(d, p.code, now, stops)
    if (!step && unassignedMap[p.code]) step = 'unassigned'
    if (!step) continue
    counts[step] += 1
    const stop = stops[p.code]
    const ev = d.events[p.code]
    let note
    if (ev) note = `${STEP_LABEL[ev.step]} 보고 ${fmtHM(ev.at)}${ev.reason ? ` ${FAIL_REASONS[ev.reason] || UNSERVED_REASON[ev.reason] || ''}` : ''}`
    else if (step === 'fail') note = `실패 ${FAIL_REASONS[failReasonOf(d, p.code)] || ''}`
    else if (stop) note = `출발 ${fmtHM(stop.trip.departAt)} 완료 ${fmtHM(stop.trip.finishAt)}`
    else note = UNSERVED_REASON[unassignedMap[p.code]?.reason] || ''
    rows.push({
      code: p.code, village: meta.label(p.villageCode), grade: p.grade, step, note,
      vehicle: stop?.vehicleCode, helpers: stop?.helperCodes?.join(' ')
    })
  }
  const rank = (s) => (s === 'fail' ? 0 : s === 'unassigned' ? 1 : s === 'handedToFire' ? 2 : 3)
  rows.sort((a, b) => rank(a.step) - rank(b.step) || a.code.localeCompare(b.code))
  const shown = rows.filter((r) => (filter === 'all' ? true : filter === 'moving' ? ['depart', 'arrive', 'board'].includes(r.step) : ISSUE.includes(r.step)))
  const fails = rows.filter((r) => r.step === 'fail')

  const helpers = [...new Set(d.result.assignments.flatMap((a) => a.helperCodes))]
  const helperRows = helpers.map((h) => {
    const ack = ackOf(d, h, now)
    let answer = ack.answer
    // 시연용 수동 도우미는 화면 보고를 기다리므로 무응답으로 넘기지 않는다
    if (answer === 'none' && h !== d.manualHelper && d.sentAt && now - d.sentAt > settings.noAckMinutes * MIN) answer = 'noack'
    const a = d.result.assignments.find((x) => x.helperCodes.includes(h))
    return {
      code: h, answer, reason: ack.reason, replaced: ack.replaced, vehicle: a?.vehicleCode,
      persons: a ? a.trips.reduce((s, t) => s + t.personCodes.length, 0) : 0, manual: h === d.manualHelper
    }
  }).sort((a, b) => (['decline', 'noack'].includes(b.answer) ? 1 : 0) - (['decline', 'noack'].includes(a.answer) ? 1 : 0) || a.code.localeCompare(b.code))
  const helperCols = [
    { key: 'code', label: '도우미', render: (r) => <span className="tabular-nums">{r.code}{r.manual && <span className="ml-1 type-meta text-primary-text">화면 보고</span>}</span> },
    { key: 'vehicle', label: '차량', render: (r) => <span className="tabular-nums">{r.vehicle} {r.persons}명</span> },
    { key: 'answer', label: '응답', render: (r) => <StatusPill status={r.answer} /> },
    { key: 'reason', label: '사유', render: (r) => (r.replaced ? `${r.replaced} 대체` : DECLINE_REASONS[r.reason] || '-'), hideBelow: 'md' },
    {
      key: 'act', label: '조치',
      render: (r) => (['decline', 'noack'].includes(r.answer)
        ? (
          <Button size="sm" variant="secondary" onClick={() => {
            const next = d.replaceHelper(r.code)
            toast(next ? `대체 배정: ${r.code} 대신 ${next}. 대체 문자를 발송했습니다.` : '대체 배정이 가능한 도우미가 없습니다.', next ? 'primary' : 'danger')
          }}
          >
            대체 배정
          </Button>
        )
        : <span className="type-meta text-text-meta">-</span>)
    }
  ]

  const villageClocks = useMemo(() => {
    const eta = {}
    for (const a of d.result.assignments) for (const t of a.trips) eta[t.village] = Math.max(eta[t.village] || 0, t.finishAt)
    return Object.entries(d.arrivals).filter(([c]) => eta[c]).map(([c, arrival]) => ({ code: c, arrival, eta: eta[c] })).sort((a, b) => a.arrival - b.arrival)
  }, [d.result, d.arrivals])

  return (
    <div className="space-y-4">
      <TaskCard
        step="이송 진행" title="이송 진행 상황 확인"
        desc={`${d.kind === 'drill' ? '훈련 시각' : '현재 시각'} ${fmtHM(now)}, 전송 후 ${remainText(now - d.sentAt).replace(' 경과', '')} 경과`}
        actions={role === 'city' ? <Button size="lg" variant="danger" onClick={() => setConfirmClose(true)}>발령 종료</Button> : null}
      >
        {d.kind === 'drill' && <SpeedControl value={d.speed} onChange={d.setSpeed} />}
        <ul aria-label="이송 단계별 인원" className="grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
          {COUNT_ORDER.map((k) => (
            <li key={k} className="min-w-0">
              <MetricCard size="sm" label={COUNT_LABEL[k]} value={counts[k]} unit="명" tone={ISSUE.includes(k) && counts[k] ? 'danger' : 'neutral'} />
            </li>
          ))}
        </ul>
      </TaskCard>

      {fails.length > 0 && (
        <section aria-label="이송 실패" className="space-y-2">
          {fails.map((r) => (
            <Card key={r.code} as="div" role="alert" tone="danger" padding="sm" bodyClassName="flex flex-wrap items-center gap-3">
              <StatusPill status="fail" />
              <GradeChip grade={r.grade} size="sm" />
              <span className="type-strong text-text-pri tabular-nums">{r.code}</span>
              <span className="type-body-sm text-text-sec">{r.village}</span>
              <span className="type-strong text-danger-text">사유: {FAIL_REASONS[failReasonOf(d, r.code)] || '미상'}</span>
              <span className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => { const v = d.reassign(r.code); toast(v ? `재배정: ${r.code}, ${v} 차량 새 회차` : '기한 내 이송 가능한 차량이 없습니다. 소방 인계가 필요합니다.', v ? 'primary' : 'danger') }}>재배정</Button>
                {role === 'city' && <Button size="sm" variant="danger" onClick={() => { d.handover([r.code]); toast(`소방 인계: ${r.code}, 동해소방서`) }}>소방 인계</Button>}
              </span>
            </Card>
          ))}
        </section>
      )}

      {d.manualHelper && helpers.includes(d.manualHelper) && (
        <Card as="div" tone="primary" padding="sm" bodyClassName="flex flex-wrap items-center gap-3">
          <UserRoundCheck size={20} aria-hidden="true" className="text-primary-text" />
          <p className="min-w-0 flex-1 type-body-sm text-primary-text">도우미 {d.manualHelper}의 배정은 도우미 화면에서 보고한 내용으로만 진행됩니다.</p>
          <a href="/h/demo" target="_blank" rel="noreferrer" className="inline-flex min-h-11 md:min-h-0 items-center gap-1 type-strong text-primary-text underline underline-offset-2">
            도우미 화면 열기<ExternalLink size={14} aria-hidden="true" />
          </a>
        </Card>
      )}

      <TransportStatusTable
        rows={shown} count={`${shown.length} / ${rows.length}명`}
        filters={(
          <SegmentControl
            label="현황 필터" value={filter} onChange={setFilter}
            items={[{ value: 'all', label: `전체 ${rows.length}` }, { value: 'moving', label: '이동 중' }, { value: 'issue', label: '실패와 미이송' }]}
          />
        )}
      />

      <TableCard
        title="도우미 응답" count={`${helperRows.length}명`} desc={`무응답 판정 기준 ${settings.noAckMinutes}분`}
        columns={helperCols} rows={helperRows} rowKey={(r) => r.code} pageSize={8} caption="도우미 응답"
      />

      <Disclosure summary={`마을별 이송 완료 기한 (${villageClocks.length}곳)`}>
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {villageClocks.map((v) => (
            <li key={v.code} className="rounded-md bg-subtle p-3 min-w-0">
              <DeadlineClock compact title={meta.label(v.code)} {...deadlinesOf(v.arrival, settings, scenario)} now={now} dispatched finishEta={v.eta} />
            </li>
          ))}
        </ul>
      </Disclosure>

      {d.smsLog.length > 0 && (
        <Card as="div">
          <Disclosure summary={<span className="inline-flex items-center gap-2"><MessageSquareText size={16} aria-hidden="true" />모의 문자 발송 기록 {d.smsLog.length}건</span>}>
            <ul className="divide-y divide-line-sub">
              {d.smsLog.map((m, i) => (
                <li key={`${m.helper}-${i}`} className="flex gap-3 py-2 type-body-sm">
                  <span className="shrink-0 type-meta text-text-meta tabular-nums">{fmtHM(m.at)}</span>
                  <span className="min-w-0 text-text-sec">{m.text}</span>
                </li>
              ))}
            </ul>
          </Disclosure>
        </Card>
      )}

      <Modal
        open={confirmClose} onClose={() => setConfirmClose(false)} title="발령 종료"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setConfirmClose(false)}>취소</Button>
            <Button variant="danger" onClick={() => { setConfirmClose(false); d.close(); toast('발령을 종료했습니다. 도우미 화면의 배정 정보를 삭제했습니다.', 'primary') }}>발령 종료</Button>
          </>
        )}
      >
        <p className="type-body-sm text-text-sec">발령을 종료하면 도우미 화면의 배정 정보가 삭제되고, 결과는 이송 기록에 저장됩니다.</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 tabular-nums">
          {['handover', 'handedToFire', 'fail', 'unassigned'].map((k) => (
            <div key={k} className="rounded-md bg-subtle p-3">
              <dt className="type-caption text-text-sec">{COUNT_LABEL[k]}</dt>
              <dd className="type-h3 text-text-pri">{counts[k]}명</dd>
            </div>
          ))}
        </dl>
        {counts.fail + counts.unassigned > 0 && <p className="mt-3 type-body-sm text-danger-text">실패와 미배정 {counts.fail + counts.unassigned}명은 소방 인계 여부를 확인해 주십시오.</p>}
      </Modal>
    </div>
  )
}

export default function DispatchPage() {
  const status = useDispatchStore((s) => s.status)
  const hasResult = useDispatchStore((s) => !!s.result)
  const now = useNow()
  const meta = useVillageMeta()

  return (
    <PageShell title="발령 운영">
      <Card as="div" className="mb-5">
        <StepIndicator status={status} />
      </Card>
      {(status === 'idle' || status === 'closed') && <StartPanel />}
      {status === 'standby' && <StandbyPanel now={now} meta={meta} />}
      {status === 'assigned' && hasResult && <AssignedPanel meta={meta} />}
      {status === 'sent' && hasResult && <SentPanel now={now} meta={meta} />}
    </PageShell>
  )
}
