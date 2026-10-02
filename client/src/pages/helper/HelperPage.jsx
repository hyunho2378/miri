// 도우미 면(IA 5.1). 설치 없는 링크 접속. 데모는 token 'demo' 만 동작.
// 내 도우미 코드는 발령 전송 시 정해지는 manualHelper. 내 대상자는 자동 진행 없이 이 화면 보고로만 바뀐다.
import { useMemo, useState } from 'react'
import { CircleCheck, CircleX, Clock, LinkIcon, Truck } from 'lucide-react'
import { useParams } from 'react-router-dom'
import FailReportSheet from '../../components/miri/FailReportSheet.jsx'
import HelperAssignmentCard from '../../components/miri/HelperAssignmentCard.jsx'
import HelperStepBar from '../../components/miri/HelperStepBar.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import ChoiceChips from '../../components/ui/ChoiceChips.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import useNow from '../../hooks/useNow.js'
import useToast from '../../hooks/useToast.js'
import { USE_MOCK } from '../../lib/api.js'
import { DECLINE_REASONS, ackOf, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { typeOf } from '../../lib/shortage.js'
import { fmtHM } from '../../lib/time.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const NEXT = {
  wait: { step: 'depart', label: '출발' },
  depart: { step: 'arrive', label: '도착' },
  arrive: { step: 'board', label: '탑승 완료' },
  board: { step: 'handover', label: '대피소 인계 완료' }
}
const DONE = new Set(['handover', 'fail', 'handedToFire'])

function Notice({ icon: Icon = Clock, image, title, children, action }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center px-6 py-16 text-center">
      {image ? <img src={image} alt="" className="h-28 w-28" /> : <Icon size={48} aria-hidden="true" className="text-text-meta" />}
      <h1 className="mt-5 type-h2 text-text-pri">{title}</h1>
      {children && <div className="mt-2 max-w-[340px] type-body text-text-sec">{children}</div>}
      {action && <div className="mt-6 w-full max-w-[320px]">{action}</div>}
    </div>
  )
}

function startDemo() {
  const s = useDispatchStore.getState()
  s.start({ kind: 'drill', speed: 60 })
  useDispatchStore.getState().runAssign()
  useDispatchStore.getState().confirmAndSend()
}

export default function HelperPage() {
  const { token } = useParams()
  const d = useDispatchStore()
  const vnow = useNow()
  const data = useMiriStore()
  const toast = useToast()
  const [declining, setDeclining] = useState(false)
  const [failFor, setFailFor] = useState(null)
  const [expanded, setExpanded] = useState({})

  const stops = useMemo(() => indexStops(d.result), [d.result])
  const me = d.manualHelper
  const mine = useMemo(() => d.result?.assignments.find((a) => a.helperCodes.includes(me)) || null, [d.result, me])

  if (token !== 'demo') {
    return (
      <Notice icon={LinkIcon} title="유효하지 않은 링크">
        담당자에게 새 링크 요청
      </Notice>
    )
  }

  const demoButton = USE_MOCK && (
    <Button size="xl" onClick={startDemo}>데모 발령 시작</Button>
  )

  if (d.status === 'closed') {
    return (
      <Notice icon={CircleCheck} title="발령 종료. 배정 정보 삭제 완료" action={demoButton}>
        주소와 연락처 삭제 완료
      </Notice>
    )
  }
  if (d.status === 'idle') {
    return (
      <Notice image="/images/illustrations/empty.svg" title="배정 대기 중" action={demoButton}>
        발령 시 배정 표시
      </Notice>
    )
  }
  if (d.status === 'standby' || d.status === 'assigned') {
    return (
      <Notice title="배정 준비 중">
        전송되면 문자와 이 화면으로 도착
      </Notice>
    )
  }
  if (!me || !mine) {
    return <Notice icon={CircleX} title="이번 발령 배정 없음">대기 상태 유지. 담당자 연락 시 응답</Notice>
  }

  const ack = ackOf(d, me, vnow)
  const vehicle = data.vehicles.find((v) => v.code === mine.vehicleCode)
  const trips = [...mine.trips].sort((a, b) => a.index - b.index)
  const list = trips.flatMap((tr) => tr.personCodes.map((code) => ({ code, trip: tr })))
  const villageOf = (code) => data.villages.find((v) => v.code === code)
  const shelterOf = (vcode) => data.shelters.find((s) => s.code === villageOf(vcode)?.shelterCode)?.name || '대피소'
  const shelters = [...new Set(trips.map((tr) => shelterOf(tr.village)))]

  const summary = (
    <Card>
      <div className="flex items-center gap-2">
        <Truck size={20} aria-hidden="true" className="text-primary" />
        <h1 className="type-h2 text-text-pri">내 배정</h1>
        <span className="ml-auto type-body-sm text-text-meta tabular-nums">{me}</span>
      </div>
      <KeyValue
        size="lg"
        className="mt-3"
        items={[
          { label: '차량', value: <>{vehicle?.code} {typeOf(vehicle?.type)?.label}</> },
          { label: '대상자', value: <>{list.length}명 {trips.length}회차</> },
          { label: '대피소', value: <>{shelters.join(', ')}</> },
          { label: '첫 출발', value: <>{fmtHM(trips[0]?.departAt)}</> }
        ]}
      />
    </Card>
  )

  if (ack.answer === 'decline') {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        {summary}
        <Notice icon={CircleX} title="불가 응답 완료">
          사유 {DECLINE_REASONS[ack.reason] || '기타'}. 대체 배정 진행
        </Notice>
      </div>
    )
  }

  if (ack.answer === 'none') {
    return (
      <div className="flex flex-1 flex-col gap-4 p-4">
        <p role="status" className="rounded-lg bg-primary-soft px-4 py-3 type-body text-primary-text">배정 도착. 수락 또는 불가 응답 필요</p>
        {summary}
        {!declining ? (
          <div className="mt-auto space-y-2 pb-4">
            <Button size="xl" onClick={() => { useDispatchStore.getState().helperAck(me, 'accept'); toast('수락 완료. 첫 대상자부터 진행', 'primary') }}>
              수락
            </Button>
            <Button variant="secondary" size="xl" onClick={() => setDeclining(true)}>불가</Button>
          </div>
        ) : (
          <Card title="불가 사유 선택">
            <ChoiceChips
              label="불가 사유" size="lg" value={null}
              onChange={(k) => useDispatchStore.getState().helperAck(me, 'decline', k)}
              options={Object.entries(DECLINE_REASONS).map(([value, label]) => ({ value, label }))}
            />
            <Button variant="ghost" size="lg" className="mt-3 w-full" onClick={() => setDeclining(false)}>돌아가기</Button>
          </Card>
        )}
      </div>
    )
  }

  // 수락 후 이송 진행
  const steps = list.map(({ code }) => stepOf(d, code, vnow, stops) || d.events[code]?.step || 'wait')
  const currentIdx = steps.findIndex((s) => !DONE.has(s))
  const current = currentIdx >= 0 ? list[currentIdx] : null
  const doneCount = steps.filter((s) => s === 'handover').length
  const failCount = steps.filter((s) => s === 'fail' || s === 'handedToFire').length
  const next = current ? NEXT[steps[currentIdx]] : null

  const onNext = () => {
    useDispatchStore.getState().report(current.code, next.step)
    if (next.step === 'handover') toast(`${current.code} 대피소 인계 완료`, 'primary')
  }

  return (
    <div className="flex flex-1 flex-col">
      <div className="flex-1 space-y-4 p-4">
        {summary}
        <div className="flex items-center justify-between gap-3">
          <h2 className="type-h3 text-text-pri">대상자 순서</h2>
          <p className="type-body-sm text-text-sec tabular-nums">완료 {doneCount} 실패 {failCount} / {list.length}</p>
        </div>
        {!current && (
          <p role="status" className="rounded-lg bg-mute px-4 py-3 type-body text-text-pri">
            배정 대상자 전원 처리 완료. 대피소 대기 후 담당자 안내 확인
          </p>
        )}
        <ol className="space-y-3">
          {list.map(({ code, trip }, i) => {
            const person = data.persons.find((p) => p.code === code)
            if (!person) return null
            const ev = d.events[code]
            return (
              <HelperAssignmentCard
                key={code} order={i + 1} person={person} step={steps[i]} tripIndex={trip.index}
                info={data.privateInfo[code]} villageLabel={villageOf(trip.village)?.label || trip.village}
                shelterName={shelterOf(trip.village)}
                current={i === currentIdx} expanded={!!expanded[code]}
                onToggle={() => setExpanded((x) => ({ ...x, [code]: !x[code] }))}
                doneAt={ev?.at} failReason={ev?.reason}
              />
            )
          })}
        </ol>
      </div>
      {current && next && (
        <HelperStepBar nextLabel={`${current.code} ${next.label}`} onNext={onNext} onFail={() => setFailFor(current.code)} />
      )}
      <FailReportSheet
        open={!!failFor} personCode={failFor} onClose={() => setFailFor(null)}
        onSubmit={(reason, memo) => {
          useDispatchStore.getState().report(failFor, 'fail', reason, memo)
          toast(`${failFor} 실패 보고 완료. 다음 대상자로 진행`, 'danger')
          setFailFor(null)
        }}
      />
    </div>
  )
}
