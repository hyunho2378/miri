// Top N 랭크. 요구사항 4(반복 질문이 뭔지 숫자로 보고 싶다)에 대한 직접 응답이다.
import clsx from 'clsx'
import { ArrowDown, ArrowUp } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import { formatNumber } from '../../lib/format.js'
import Button from '../ui/Button.jsx'

export default function RankList({ items = [], onAction, actionLabel }) {
  const { t } = useLang()
  const max = Math.max(1, ...items.map((i) => i.count))

  if (!items.length) return <p className="type-body-sm text-text-meta">{t('admin.dashboard.noData')}</p>

  return (
    <ol className="space-y-3">
      {items.map((it) => {
        const up = Number(it.delta) >= 0
        return (
          <li key={it.rank}>
            <div className="flex items-center gap-3">
              {/* 9단계. 강조는 1등 하나다. 2등 이하는 무채색이다 */}
              <span className={clsx('w-5 shrink-0 type-body-sm font-semibold tabular-nums', it.rank === 1 ? 'text-primary-text' : 'text-text-ter')}>
                {it.rank}
              </span>
              <span className="min-w-0 flex-1 truncate type-body-sm text-text-pri">{it.label}</span>
              <span className="shrink-0 type-h3 text-text-pri tabular-nums">{formatNumber(it.count)}</span>
              {/* 증감은 화살표 방향이 전한다. 늘어난 질문이 나쁜 것도 좋은 것도 아니라 색을 쓰지 않는다 */}
              <span className="shrink-0 inline-flex items-center gap-0.5 w-14 justify-end type-caption tabular-nums text-text-meta">
                {up ? <ArrowUp size={12} aria-hidden="true" /> : <ArrowDown size={12} aria-hidden="true" />}
                {Math.abs(it.delta)}
              </span>
              {onAction && (
                <Button size="sm" variant="ghost" className="shrink-0" onClick={() => onAction(it)}>
                  {actionLabel}
                </Button>
              )}
            </div>
            <div className="mt-1.5 ml-8 h-1.5 rounded-full bg-line-sub" aria-hidden="true">
              <div
                className={clsx('h-full rounded-full', it.rank === 1 ? 'bg-primary' : 'bg-line-strong')}
                style={{ width: `${(it.count / max) * 100}%` }}
              />
            </div>
          </li>
        )
      })}
    </ol>
  )
}
