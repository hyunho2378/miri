// 8시간 시계(DESIGN 5절, PATTERNS 32). 발령 전은 발령 기한까지, 발령 후는 이송 완료 기한까지.
// 막대는 scaleX. 기한 초과 예상으로 바뀌는 순간만 role=status.
import clsx from 'clsx'
import { fmtHM, remainText } from '../../lib/time.js'
import Card from '../ui/Card.jsx'

export default function DeadlineClock({ title, dispatchDeadline, completeDeadline, now, dispatched = true, finishEta, compact = false, sub }) {
  const target = dispatched ? completeDeadline : dispatchDeadline
  const late = finishEta != null && finishEta > completeDeadline
  const span = completeDeadline - dispatchDeadline
  const ratio = Math.min(1, Math.max(0, (now - dispatchDeadline) / span))
  const remain = target - now
  const Wrap = compact ? 'div' : Card
  return (
    <Wrap {...(compact ? {} : { as: 'div' })}>
      {title && (
        <div className="flex items-baseline justify-between gap-3">
          <p className="min-w-0 truncate type-h3 text-text-pri">{title}</p>
          <p className="shrink-0 type-meta text-text-meta tabular-nums">{dispatched ? '완료 기한' : '발령 기한'} {fmtHM(target)}</p>
        </div>
      )}
      <p className={clsx(compact ? 'type-strong' : 'mt-2 type-kpi', 'tabular-nums', late || remain < 0 ? 'text-danger-text' : 'text-text-pri')}>
        {remain < 0 ? remainText(remain) : `${remainText(remain)} 남음`}
      </p>
      {!compact && (
        <div className="mt-3 h-1.5 rounded-full bg-mute overflow-hidden" aria-hidden="true">
          <div className={clsx('h-full w-full origin-left', late ? 'bg-danger' : 'bg-primary')} style={{ transform: `scaleX(${ratio})` }} />
        </div>
      )}
      {(sub || finishEta != null) && (
        <p className="mt-2 type-meta text-text-meta tabular-nums">
          {sub}{finishEta != null && `${sub ? ' ' : ''}마지막 이송 완료 예상 ${fmtHM(finishEta)}`}
        </p>
      )}
      {late && <p role="status" className="mt-1 type-caption text-danger-text">기한 초과 예상</p>}
    </Wrap>
  )
}
