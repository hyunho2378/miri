// 발령 운영 순서 안내. 지금 단계, 다음 행동 한 문장, 주 행동 단추 하나, 자동 진행.
import { useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import { Check, Play, Siren, Square } from 'lucide-react'
import Button from '../ui/Button.jsx'
import useAuthStore from '../../store/useAuthStore.js'
import { useDispatchStore } from '../../store/useDispatchStore.js'

const STEPS = ['발령 개시', '배정 계산', '배정표 전송', '이송 진행']
const STAGE = { idle: 0, closed: 0, standby: 1, assigned: 2, sent: 3 }
const NEXT = [
  '훈련 발령 개시 후 추천 배정 계산',
  '추천 배정 계산, 마을별 도달 시각 확인',
  '배정표 검토 후 도우미 전송',
  '이송 진행 확인, 완료 후 발령 종료'
]

export default function DispatchGuide({ status }) {
  const role = useAuthStore((s) => s.user?.role)
  const start = useDispatchStore((s) => s.start)
  const runAssign = useDispatchStore((s) => s.runAssign)
  const confirmAndSend = useDispatchStore((s) => s.confirmAndSend)
  const kind = useDispatchStore((s) => s.kind)
  const [auto, setAuto] = useState(false)
  const timer = useRef(null)
  const stage = STAGE[status] ?? 0
  const isCity = role === 'city'

  const act = () => {
    const s = useDispatchStore.getState().status
    if (s === 'idle' || s === 'closed') start({ kind: 'drill', speed: 60 })
    else if (s === 'standby') runAssign()
    else if (s === 'assigned') confirmAndSend()
  }

  useEffect(() => {
    if (!auto) return undefined
    timer.current = setInterval(() => {
      const s = useDispatchStore.getState().status
      if (s === 'sent') { setAuto(false); return }
      if (useDispatchStore.getState().kind === 'real') { setAuto(false); return }
      act()
    }, 2000)
    return () => clearInterval(timer.current)
  }, [auto])

  useEffect(() => { if (status === 'sent') setAuto(false) }, [status])

  const label = stage === 0 ? '훈련 발령 개시' : stage === 1 ? '추천 배정 계산' : stage === 2 ? '배정표 전송' : null
  return (
    <section aria-label="발령 진행 순서" data-tour="dispatch-guide" className="mb-6 rounded-[16px] bg-subtle p-4">
      <ol className="flex flex-wrap items-center gap-x-6 gap-y-2">
        {STEPS.map((t, i) => (
          <li key={t} className={clsx('inline-flex items-center gap-2 type-body-sm', i === stage ? 'font-bold text-text-pri' : i < stage ? 'text-text-pri' : 'text-text-sec')} aria-current={i === stage ? 'step' : undefined}>
            <span className={clsx('inline-flex h-6 w-6 items-center justify-center rounded-full type-caption', i < stage ? 'bg-primary text-text-inverse' : i === stage ? 'bg-text-pri text-text-inverse' : 'bg-line-strong text-text-pri')}>
              {i < stage ? <Check size={14} aria-hidden="true" /> : i + 1}
            </span>
            {t}{i < stage && <span className="sr-only"> 완료</span>}
          </li>
        ))}
      </ol>
      <div className="mt-3 flex flex-wrap items-center justify-between gap-3">
        <p className="type-body text-text-pri"><span className="font-bold">다음 행동</span> {NEXT[stage]}</p>
        {isCity && label && kind !== 'real' && (
          <div className="flex items-center gap-2">
            <Button data-tour="dispatch-primary" size="md" leftIcon={<Siren size={16} aria-hidden="true" />} onClick={act}>{label}</Button>
            {auto
              ? <Button data-tour="dispatch-auto" size="md" variant="secondary" leftIcon={<Square size={16} aria-hidden="true" />} onClick={() => setAuto(false)}>직접 진행</Button>
              : <Button data-tour="dispatch-auto" size="md" variant="secondary" leftIcon={<Play size={16} aria-hidden="true" />} onClick={() => setAuto(true)}>자동 진행</Button>}
          </div>
        )}
      </div>
    </section>
  )
}
