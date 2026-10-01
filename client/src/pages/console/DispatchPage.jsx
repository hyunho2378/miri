// 발령 운영(IA 4.6). 핵심 기능 2(8시간 시계)와 3(배정표), AI 배정 최적화.
// 평시 → 실행대기 발령 → 배정 검토 → 이송 진행 → 종료. 블루프린트 공백 1(피드백 루프)을 여기서 메운다.
import { useMemo, useState } from 'react'
import { ExternalLink, MessageSquareText, Minus, Plus, Route, Siren, UserRoundCheck } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import DeadlineClock from '../../components/miri/DeadlineClock.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import AssignmentBundle from '../../components/miri/AssignmentBundle.jsx'
import BaselineCompare from '../../components/miri/BaselineCompare.jsx'
import StepIndicator from '../../components/miri/StepIndicator.jsx'
import TransportStatusTable from '../../components/miri/TransportStatusTable.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
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
import { MIN, fmtHM, remainText } from '../../lib/time.js'
import useAuthStore from '../../store/useAuthStore.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'

const SPEEDS = [{ value: 1, label: '1배' }, { value: 60, label: '60배' }, { value: 240, label: '240배' }]
const KINDS = [{ value: 'drill', label: '훈련 발령' }, { value: 'real', label: '실제 발령' }]
const COUNT_ORDER = ['wait', 'depart', 'arrive', 'board', 'handover', 'fail', 'handedToFire', 'unassigned']
const COUNT_LABEL = { ...STEP_LABEL, unassigned: '미배정' }
const STEP_NAME = { standby: '실행대기 발령', assigned: '배정 검토', sent: '이송 진행' }
const ISSUE = ['fail', 'handedToFire', 'unassigned']

function useVillageMeta() {
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  return useMemo(() => {
    const label = Object.fromEntries(villages.map((v) => [v.code, v.label]))
    const dong = Object.fromEntries(villages.map((v) => [v.code, dongs.find((d) => d.code === v.dongCode)?.name || v.dongCode]))
    return { label: (c) => label[c] || c, dong: (c) => dong[c] || c }
  }, [villages, dongs])
}

function deadlinesOf(arrival, settings) {
  return {
    dispatchDeadline: arrival - settings.windowHours * 60 * MIN,
    completeDeadline: arrival - settings.completeBeforeHours * 60 * MIN
  }
}

// 평시와 종료 단계: 발령 개시
function StartPanel() {
  const role = useAuthStore((s) => s.user?.role)
  const start = useDispatchStore((s) => s.start)
  const status = useDispatchStore((s) => s.status)
  const closedRecordId = useDispatchStore((s) => s.closedRecordId)
  const scenario = useMiriStore(activeScenario)
  const persons = useMiriStore((s) => s.persons)
  const vehicles = useMiriStore((s) => s.vehicles)
  const helpers = useMiriStore((s) => s.helpers)
  const [kind, setKind] = useState('drill')
  const [speed, setSpeed] = useState(60)
  const targets = persons.filter((p) => p.review !== 'rejected')
  const pending = targets.filter((p) => p.review === 'pending').length

  return (
    <div className="grid gap-4 lg:grid-cols-[1.4fr_1fr]">
      <Card title="발령 개시" desc="산림청 도달 예측 시각을 받으면 실행대기 발령. 마을별 8시간 시계 시작">
        {status === 'closed' && closedRecordId && (
          <div role="status" className="mb-4 rounded-md bg-subtle p-3">
            <p className="type-body-sm text-text-pri">발령 종료. 이송 기록 저장 완료</p>
            <Link to={`/console/records/${closedRecordId}`} className="mt-1 inline-flex min-h-11 md:min-h-0 items-center type-body-sm text-primary-text underline underline-offset-2">방금 기록 보기</Link>
          </div>
        )}
        <div className="space-y-4">
          <div>
            <p className="mb-1.5 type-caption text-text-sec">발령 종류</p>
            <SegmentControl label="발령 종류" items={KINDS} value={kind} onChange={(v) => { setKind(v); if (v === 'real') setSpeed(1) }} />
          </div>
          <div>
            <p className="mb-1.5 type-caption text-text-sec">가상 시계 배속</p>
            <SegmentControl label="가상 시계 배속" items={kind === 'real' ? SPEEDS.slice(0, 1) : SPEEDS} value={speed} onChange={setSpeed} />
            <p className="mt-1.5 type-meta text-text-meta">{kind === 'real' ? '실제 발령은 실제 시각 기준' : '60배는 8시간 창을 8분에 진행. 발표 시연용'}</p>
          </div>
          {role === 'city' ? (
            <Button size="lg" leftIcon={<Siren size={16} aria-hidden="true" />} onClick={() => start({ kind, speed })}>
              {kind === 'drill' ? '훈련 발령 개시' : '실행대기 발령 개시'}
            </Button>
          ) : (
            <p className="rounded-md bg-subtle p-3 type-body-sm text-text-sec">발령 개시와 종료는 시 관리자 권한. 동 담당자는 발령 후 배정 확인과 조정 담당</p>
          )}
        </div>
      </Card>
      <Card title="발령 기준" desc="부족분 계산 화면의 현황판 기준 시나리오 사용">
        <KeyValue items={[
          { label: '시나리오', value: scenario?.name, strong: true },
          { label: '이송 대상', value: <>{targets.length}명{pending > 0 && <span className="text-primary-text"> (확인 대기 {pending}건 포함)</span>}</> },
          { label: '가용 차량', value: `${vehicles.filter((v) => v.available !== false).length}대 / 전체 ${vehicles.length}대` },
          { label: '도우미', value: `${helpers.filter((h) => h.active !== false).length}명` }
        ]} />
        <Link to="/console/shortage" className="mt-4 inline-flex min-h-11 md:min-h-0 items-center type-body-sm text-primary-text underline underline-offset-2">시나리오 바꾸기</Link>
      </Card>
    </div>
  )
}

// 실행대기 발령: 8시간 시계 + 도달 예측 조정 + AI 배정 실행
function StandbyPanel({ now, meta }) {
  const arrivals = useDispatchStore((s) => s.arrivals)
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
      <Card
        title="AI 배정 실행"
        desc="차량 정원과 회차 순서와 마을별 이송 완료 기한을 동시에 고려한 제약 조건 최적화. 담당자 확정 전까지 적용 안 됨"
        actions={<Button size="lg" loading={busy} leftIcon={<Route size={16} aria-hidden="true" />} onClick={onAssign}>AI 배정 실행</Button>}
      >
        <p className="type-meta text-text-meta">
          발령 기한 = 산불 도달 예측 − {settings.windowHours}시간. 이송 완료 기한 = 도달 예측{settings.completeBeforeHours ? ` − ${settings.completeBeforeHours}시간` : ''}. 준비 시간 {settings.prepMinutes}분
        </p>
      </Card>
      <section>
        <SectionTitle title="마을별 8시간 시계" desc="발령 기한 이른 순. 도달 예측 30분 단위 조정" />
        <ul className="grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {list.map(([code, arrival]) => (
            <li key={code} className="min-w-0 flex flex-col gap-2">
              <DeadlineClock title={meta.label(code)} {...deadlinesOf(arrival, settings)} now={now} dispatched={false} sub={`${meta.dong(code)} 산불 도달 예측 ${fmtHM(arrival)}`} />
              <div className="flex flex-wrap items-center gap-2 px-1">
                <span className="type-caption text-text-sec">도달 예측 조정</span>
                <Button size="sm" variant="secondary" aria-label={`${meta.label(code)} 도달 예측 30분 앞당김`} leftIcon={<Minus size={14} aria-hidden="true" />} onClick={() => setArrival(code, arrival - 30 * MIN)}>30분</Button>
                <Button size="sm" variant="secondary" aria-label={`${meta.label(code)} 도달 예측 30분 늦춤`} leftIcon={<Plus size={14} aria-hidden="true" />} onClick={() => setArrival(code, arrival + 30 * MIN)}>30분</Button>
              </div>
            </li>
          ))}
        </ul>
      </section>
    </div>
  )
}

// 배정 검토: AI 결과, 기준선 비교, 배정표, 수동 조정, 미배정, 확정 후 전송
function AssignedPanel({ meta }) {
  const result = useDispatchStore((s) => s.result)
  const runAssign = useDispatchStore((s) => s.runAssign)
  const movePerson = useDispatchStore((s) => s.movePerson)
  const confirmAndSend = useDispatchStore((s) => s.confirmAndSend)
  const vehicles = useMiriStore((s) => s.vehicles)
  const toast = useToast()
  const trips = result.assignments.reduce((s, a) => s + a.trips.length, 0)

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
      <p role="status" className="type-body-sm text-text-sec">
        AI 배정 완료. 계산 시간 <span className="tabular-nums">{result.elapsedMs}ms</span>{result.manualEdits ? `. 수동 조정 ${result.manualEdits}건 반영` : ''}
      </p>
      <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
        <MetricCard label="배정 차량" value={result.assignments.length} unit="대" />
        <MetricCard label="회차" value={trips} unit="회" />
        <MetricCard label="미이송 예상" value={result.unassigned.length} unit="명" tone={result.unassigned.length ? 'danger' : 'neutral'} sub={result.unassigned.length ? '소방 인계 대상' : '전원 기한 내 이송'} />
        <MetricCard label="마지막 이송 완료" value={fmtHM(result.metrics.lastFinishAt)} sub={`도우미 부담 편차 ${result.metrics.helperLoadStd}`} />
      </div>
      <BaselineCompare result={result} villageLabel={meta.label} />
      {result.warnings?.length > 0 && (
        <Card as="div" role="alert" tone="danger" padding="sm">
          <p className="type-body-sm text-danger-text">
            <span className="type-strong">도우미 부족 차량 {result.warnings.map((w) => `${w.vehicleCode} (${w.got}/${w.need}명)`).join(' ')}.</span> 차량과 도우미 화면에서 도우미 추가 필요
          </p>
        </Card>
      )}
      <SectionTitle
        className="mt-2"
        title="배정표"
        desc={<span className="inline-flex items-center gap-1"><Route size={14} aria-hidden="true" className="text-primary-text" />AI 배정. 제약 조건 최적화 결과. 차량별 회차와 대상자 순서</span>}
        actions={(
          <>
            <Button variant="secondary" onClick={() => { runAssign(); toast('배정 다시 계산 완료') }}>다시 계산</Button>
            <Button leftIcon={<MessageSquareText size={16} aria-hidden="true" />} onClick={() => { confirmAndSend(); toast('배정 확정. 도우미 배정표 전송 완료', 'primary') }}>배정 확정 후 전송</Button>
          </>
        )}
      />
      <div className="grid gap-4 lg:grid-cols-2">
        {result.assignments.map((a) => (
          <AssignmentBundle
            key={a.vehicleCode} assignment={a} vehicle={vehicles.find((v) => v.code === a.vehicleCode)}
            villageLabel={meta.label} assignments={result.assignments} vehicles={vehicles} editable
            onMove={(code, veh, idx) => { movePerson(code, veh, idx); toast(`${code} ${veh} ${idx}회차로 이동`) }}
          />
        ))}
      </div>
      <Card title={`미배정 ${result.unassigned.length}명`} desc="기한 안에 옮길 차량이 없는 대상자. 이송 진행 단계에서 소방 인계">
        {result.unassigned.length
          ? <DataTable columns={unassignedCols} rows={unassignedRows} rowKey={(r) => r.code} pageSize={10} caption="미배정 대상자" />
          : <p className="type-body-sm text-text-meta">미배정 없음</p>}
      </Card>
    </div>
  )
}

// 이송 진행: 실시간 현황, 도우미 응답, 실패 대응, 마을별 시계
function SentPanel({ now, meta }) {
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
            toast(next ? `${r.code} 대신 ${next} 배정. 대체 문자 발송` : '대체 가능한 도우미 없음', next ? 'primary' : 'danger')
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
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="type-body-sm text-text-sec tabular-nums">가상 시각 {fmtHM(now)}. 전송 후 {remainText(now - d.sentAt).replace(' 경과', '')} 경과</p>
        <div className="flex flex-wrap items-center gap-2">
          {d.kind === 'drill' && <SegmentControl label="가상 시계 배속" items={SPEEDS} value={d.speed} onChange={d.setSpeed} />}
          {role === 'city' && <Button variant="danger" onClick={() => setConfirmClose(true)}>발령 종료</Button>}
        </div>
      </div>

      <ul aria-label="이송 단계별 인원" className="grid gap-2 grid-cols-2 sm:grid-cols-4 xl:grid-cols-8">
        {COUNT_ORDER.map((k) => (
          <li key={k} className="min-w-0">
            <MetricCard size="sm" label={COUNT_LABEL[k]} value={counts[k]} unit="명" tone={ISSUE.includes(k) && counts[k] ? 'danger' : 'neutral'} />
          </li>
        ))}
      </ul>

      {fails.length > 0 && (
        <section aria-label="이송 실패" className="space-y-2">
          {fails.map((r) => (
            <Card key={r.code} as="div" role="alert" tone="danger" padding="sm" bodyClassName="flex flex-wrap items-center gap-3">
              <StatusPill status="fail" />
              <GradeChip grade={r.grade} size="sm" />
              <span className="type-strong text-text-pri tabular-nums">{r.code}</span>
              <span className="type-body-sm text-text-sec">{r.village}</span>
              <span className="type-strong text-danger-text">사유 {FAIL_REASONS[failReasonOf(d, r.code)] || '미상'}</span>
              <span className="ml-auto flex flex-wrap gap-2">
                <Button size="sm" variant="secondary" onClick={() => { const v = d.reassign(r.code); toast(v ? `${r.code} ${v} 차량 새 회차로 재배정` : '기한 안에 옮길 차량 없음. 소방 인계 필요', v ? 'primary' : 'danger') }}>재배정</Button>
                {role === 'city' && <Button size="sm" variant="danger" onClick={() => { d.handover([r.code]); toast(`${r.code} 동해소방서 인계`) }}>소방 인계</Button>}
              </span>
            </Card>
          ))}
        </section>
      )}

      {d.manualHelper && helpers.includes(d.manualHelper) && (
        <Card as="div" tone="primary" padding="sm" bodyClassName="flex flex-wrap items-center gap-3">
          <UserRoundCheck size={20} aria-hidden="true" className="text-primary-text" />
          <p className="min-w-0 flex-1 type-body-sm text-primary-text">도우미 {d.manualHelper} 배정은 자동 진행 없이 도우미 화면 보고로만 진행. 시연 시 휴대폰 화면 사용</p>
          <a href="/h/demo" target="_blank" rel="noreferrer" className="inline-flex min-h-11 md:min-h-0 items-center gap-1 type-strong text-primary-text underline underline-offset-2">
            도우미 화면에서 직접 보고<ExternalLink size={14} aria-hidden="true" />
          </a>
        </Card>
      )}

      <div className="grid gap-4 xl:grid-cols-[1fr_1.4fr]">
        <Card title="도우미 응답" desc={`전송 후 ${settings.noAckMinutes}분 응답 없으면 무응답 처리`}>
          <DataTable columns={helperCols} rows={helperRows} rowKey={(r) => r.code} pageSize={8} caption="도우미 응답" />
        </Card>
        <Card title="마을별 이송 완료 기한" desc="마지막 이송 완료 예상이 기한을 넘으면 기한 초과 예상">
          <ul className="grid gap-3 sm:grid-cols-2">
            {villageClocks.map((v) => (
              <li key={v.code} className="rounded-md bg-subtle p-3 min-w-0">
                <DeadlineClock compact title={meta.label(v.code)} {...deadlinesOf(v.arrival, settings)} now={now} dispatched finishEta={v.eta} />
              </li>
            ))}
          </ul>
        </Card>
      </div>

      <section className="space-y-3">
        <SectionTitle
          className="mb-0"
          title="대상자별 이송 현황"
          actions={(
            <SegmentControl
              label="현황 필터" value={filter} onChange={setFilter}
              items={[{ value: 'all', label: `전체 ${rows.length}` }, { value: 'moving', label: '이동 중' }, { value: 'issue', label: '실패와 미이송' }]}
            />
          )}
        />
        <TransportStatusTable rows={shown} />
      </section>

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
            <Button variant="danger" onClick={() => { setConfirmClose(false); d.close(); toast('발령 종료. 도우미 화면 배정 정보 삭제', 'primary') }}>발령 종료</Button>
          </>
        )}
      >
        <p className="type-body-sm text-text-sec">종료하면 도우미 화면의 대상자 주소와 연락처가 삭제되고 결과가 이송 기록으로 저장됨</p>
        <dl className="mt-4 grid grid-cols-2 gap-2 tabular-nums">
          {['handover', 'handedToFire', 'fail', 'unassigned'].map((k) => (
            <div key={k} className="rounded-md bg-subtle p-3">
              <dt className="type-caption text-text-sec">{COUNT_LABEL[k]}</dt>
              <dd className="type-h3 text-text-pri">{counts[k]}명</dd>
            </div>
          ))}
        </dl>
        {counts.fail + counts.unassigned > 0 && <p className="mt-3 type-body-sm text-danger-text">실패와 미배정 {counts.fail + counts.unassigned}명은 소방 인계 확인 권장</p>}
      </Modal>
    </div>
  )
}

export default function DispatchPage() {
  const status = useDispatchStore((s) => s.status)
  const kind = useDispatchStore((s) => s.kind)
  const hasResult = useDispatchStore((s) => !!s.result)
  const now = useNow()
  const meta = useVillageMeta()
  const live = ['standby', 'assigned', 'sent'].includes(status)

  return (
    <PageShell title="발령 운영">
      <Card as="div" className="mb-5">
        <div className="mb-3 flex flex-wrap items-center gap-2">
          {live && <StatusPill status={status} label={`${kind === 'drill' ? '훈련 ' : ''}${STEP_NAME[status]}`} />}
          <span className="type-meta text-text-meta">8시간 시계와 배정표. 시 관리자 발령 개시 후 동 담당자 배정 확인</span>
        </div>
        <StepIndicator status={status} />
      </Card>
      {(status === 'idle' || status === 'closed') && <StartPanel />}
      {status === 'standby' && <StandbyPanel now={now} meta={meta} />}
      {status === 'assigned' && hasResult && <AssignedPanel meta={meta} />}
      {status === 'sent' && hasResult && <SentPanel now={now} meta={meta} />}
    </PageShell>
  )
}
