// 도우미 서명 링크 화면(회신 R34: 도우미별 접근 권한, 저장과 재전송).
// 본인 배정만 서버에서 받고, 수락과 단계 보고는 휴대폰 대기열에 먼저 넣은 뒤 보낸다. 끊기면 '전송 대기 n건'으로 남겼다가 다시 보낸다.
import { useCallback, useEffect, useMemo, useState } from 'react'
import { CircleCheck, CircleX, CloudOff, Truck } from 'lucide-react'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import useToast from '../../hooks/useToast.js'
import { clockNow, helperGet, helperSend } from '../../lib/dispatchSync.js'
import { enqueue, flush, readQueue } from '../../lib/reportQueue.js'
import { fmtHM } from '../../lib/time.js'

const NEXT = { wait: ['depart', '출발'], depart: ['arrive', '도착'], arrive: ['board', '탑승 완료'], board: ['handover', '대피소 인계 완료'] }
const STEP_TEXT = { wait: '대기', depart: '출발', arrive: '도착', board: '탑승', handover: '인계 완료', fail: '이송 실패' }

export default function RemoteHelper({ token }) {
  useEffect(() => { document.title = '도우미 배정 | 미리' }, [])
  const toast = useToast()
  const scope = useMemo(() => String(token || '').split('.').slice(0, 2).join('.'), [token])
  const [data, setData] = useState(null)
  const [error, setError] = useState(null)
  const [pending, setPending] = useState(() => readQueue(scope).length)
  const [local, setLocal] = useState([])

  const load = useCallback(async () => {
    try { setData(await helperGet(token)); setError(null) } catch (e) { if (!data) setError(e.message) }
  }, [token, data])
  const send = useCallback(async () => {
    const r = await flush(scope, (it) => helperSend(token, it))
    setPending(r.left)
    if (r.sent) load()
    return r
  }, [scope, token, load])

  useEffect(() => { load(); send() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => send()
    window.addEventListener('online', on)
    const t = setInterval(() => { if (readQueue(scope).length) send() }, 15_000)
    return () => { window.removeEventListener('online', on); clearInterval(t) }
  }, [send, scope])

  const report = (item) => {
    // 보고 시각은 발령 가상 시계 기준(담당자 화면 기록과 같은 시간 축)
    const it = enqueue(scope, { ...item, at: Math.round(clockNow(data?.brief?.clock)) })
    setLocal((l) => [...l, it])
    setPending(readQueue(scope).length)
    send().then((r) => { if (r.left) toast(`연결 끊김: 전송 대기 ${r.left}건, 연결되면 다시 보냄`, 'danger') })
  }

  if (error) {
    return (
      <main className="mx-auto flex min-h-dvh max-w-[480px] flex-col items-center justify-center px-6 text-center">
        <CircleX size={48} aria-hidden="true" className="text-text-meta" />
        <h1 className="mt-5 type-h2 text-text-pri">배정을 열 수 없음</h1>
        <p className="mt-2 type-body text-text-sec">{error}</p>
      </main>
    )
  }
  if (!data) return <main className="mx-auto max-w-[480px] px-6 py-16 type-body text-text-sec">배정 정보 불러오는 중</main>

  const b = data.brief
  const all = [...(data.reports || []), ...local]
  const ack = [...all].reverse().find((r) => r.type === 'ack')
  const stepOf = (code) => [...all].reverse().find((r) => r.type === 'step' && r.personCode === code)?.step || 'wait'

  return (
    <main className="mx-auto max-w-[480px] space-y-4 px-4 py-6">
      <header>
        <p className="type-meta text-text-meta">{b.drill ? '훈련 발령' : '발령'}, 도우미 {data.helper}</p>
        <h1 className="mt-1 type-h2 text-text-pri">{b.disaster} 대피 이송 배정</h1>
      </header>

      {pending > 0 && (
        <Card as="div" role="status" tone="danger" padding="sm" bodyClassName="flex items-center gap-2">
          <CloudOff size={18} aria-hidden="true" />
          <span className="type-body-sm text-text-pri">전송 대기 {pending}건. 연결되면 자동으로 다시 보냄</span>
        </Card>
      )}

      <Card title="배정 안내">
        {!ack && <p role="note" className="type-body-sm text-text-sec">수락을 누르면 배정이 확정됩니다. 불가를 눌러도 불이익은 없고, 다른 도우미에게 넘어갑니다.</p>}
        <KeyValue items={[
          { label: '이송 완료 기한', value: b.completeBy ? `${fmtHM(b.completeBy)}까지` : '담당자 확인' },
          { label: '마을', value: (b.villages || []).join(', ') },
          { label: '만나는 곳', value: `${b.meetVillage || '-'} 첫 대상자 댁, 차량 ${b.vehicleCode}` },
          { label: '동승 도우미', value: b.coHelpers?.length ? b.coHelpers.join(', ') : '없음' },
          { label: '담당자 연락', value: b.officerContact || '발령 담당자, 문자 회신' },
          { label: '대상', value: `${b.persons}명` },
          { label: '링크 만료', value: fmtHM(data.expiresAt) }
        ]} />
        {!ack && (
          <div className="mt-4 grid grid-cols-2 gap-2">
            <Button size="lg" onClick={() => report({ type: 'ack', answer: 'accept' })}><CircleCheck size={18} aria-hidden="true" />수락</Button>
            <Button size="lg" variant="secondary" onClick={() => report({ type: 'ack', answer: 'decline', reason: 'other' })}>불가</Button>
          </div>
        )}
        {ack && <p className="mt-4 type-strong text-text-pri">응답: {ack.answer === 'accept' ? '수락' : '불가'} {fmtHM(ack.at)}</p>}
      </Card>

      {ack?.answer === 'accept' && (b.trips || []).map((t) => (
        <Card key={t.index} title={`${t.index}회차, ${t.village}`} meta={`출발 ${fmtHM(t.departAt)}, 완료 ${fmtHM(t.finishAt)}`}>
          <ul className="divide-y divide-line-sub">
            {t.personCodes.map((c) => {
              const st = stepOf(c)
              const nx = NEXT[st]
              return (
                <li key={c} className="flex flex-wrap items-center gap-2 py-3">
                  <Truck size={16} aria-hidden="true" className="text-text-meta" />
                  <span className="type-strong text-text-pri tabular-nums">{c}</span>
                  <span className="type-body-sm text-text-sec">{STEP_TEXT[st]}</span>
                  <span className="ml-auto flex gap-2">
                    {nx && <Button size="sm" onClick={() => report({ type: 'step', personCode: c, step: nx[0] })}>{nx[1]}</Button>}
                    {nx && st !== 'wait' && <Button size="sm" variant="secondary" onClick={() => report({ type: 'step', personCode: c, step: 'fail', reason: 'absent' })}>실패</Button>}
                  </span>
                </li>
              )
            })}
          </ul>
        </Card>
      ))}
    </main>
  )
}
