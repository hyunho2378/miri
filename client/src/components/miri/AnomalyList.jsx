// 이상 탐지 목록(COMPONENTS 3절). 규칙 이름, 대상, 감지 값, 조치 링크.
import { ChevronRight, ShieldAlert } from 'lucide-react'
import { Link } from 'react-router-dom'
import { ANOMALY_RULES } from '../../lib/anomaly.js'

export default function AnomalyList({ items, limit, onNavigate }) {
  const shown = limit ? items.slice(0, limit) : items
  if (!items.length) return <p className="type-body-sm text-text-meta">감지된 이상 없음</p>
  return (
    <ul className="divide-y divide-line-sub">
      {shown.map((a) => (
        <li key={a.id}>
          <Link to={a.to} onClick={onNavigate} className="flex items-center gap-3 py-3 min-h-11 hover:bg-mute rounded-md px-2 -mx-2 transition-colors duration-fast">
            <ShieldAlert size={20} aria-hidden="true" className={a.rule === 'deadline' || a.rule === 'noAck' ? 'text-danger' : 'text-text-meta'} />
            <span className="min-w-0 flex-1">
              <span className="block type-body-sm font-medium text-text-pri">{ANOMALY_RULES[a.rule]}</span>
              <span className="block truncate type-meta text-text-meta tabular-nums">{a.target} {a.value}</span>
            </span>
            <ChevronRight size={16} aria-hidden="true" className="text-text-meta" />
          </Link>
        </li>
      ))}
    </ul>
  )
}
