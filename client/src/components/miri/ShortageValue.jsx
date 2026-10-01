// 부족분 표기(DESIGN 5절, PATTERNS 31). 0 이면 부족 없음. 1 이상이면 danger 글자.
import clsx from 'clsx'
import { GRADES } from '../../lib/shortage.js'

export function byGradeLine(byGrade) {
  return GRADES.filter((g) => byGrade?.[g.key]).map((g) => `${g.label} ${byGrade[g.key]}`).join(' ')
}

export default function ShortageValue({ value, byGrade, provisional = 0, size = 'kpi', label = '부족분' }) {
  const big = size === 'kpi'
  return (
    <div>
      {label && <p className="type-caption text-text-sec">{label}</p>}
      {value === 0
        ? <p className={clsx(big ? 'mt-2 type-kpi' : 'type-body-sm font-semibold', 'text-text-pri')}>부족 없음</p>
        : (
          <p className={clsx(big ? 'mt-2 type-kpi' : 'type-body-sm font-semibold', 'text-danger-text tabular-nums')}>
            부족 {value}<span className={big ? 'ml-1 type-h3' : ''}>명</span>
          </p>
        )}
      {byGrade && value > 0 && <p className="mt-1 type-meta text-text-meta">{byGradeLine(byGrade)}</p>}
      {provisional > 0 && <p className="mt-1 type-meta text-primary-text">확인 대기 판독 {provisional}건 포함 잠정값</p>}
    </div>
  )
}
