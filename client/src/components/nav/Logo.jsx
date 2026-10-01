// 워드마크. 제품명 미리. 기관명은 설정값에서 오므로 여기 박지 않는다.
import { Timer } from 'lucide-react'
import { Link } from 'react-router-dom'
import clsx from 'clsx'

export default function Logo({ to = '/', className, compact = false }) {
  return (
    <Link to={to} className={clsx('inline-flex items-center gap-2 min-h-11 md:min-h-0 text-text-pri', className)} aria-label="미리 홈">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-md bg-primary text-text-inverse">
        <Timer size={20} aria-hidden="true" />
      </span>
      {!compact && <span className="type-h3">미리</span>}
    </Link>
  )
}
