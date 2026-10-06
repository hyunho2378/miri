// 미이송 예상 표기(DESIGN 5절, PATTERNS 31). 라벨은 항상 숫자 위에 텍스트로 둔다. 1 이상이면 danger 글자.
// 기준(시나리오, 명부 기준일)은 children 으로 받아 숫자 바로 아래에 둔다.
import clsx from 'clsx'
import { GRADES } from '../../lib/shortage.js'

// 표 안에서 쓰는 짧은 형식. 침상 24 휠체어 24
export function byGradeLine(byGrade) {
  return GRADES.filter((g) => byGrade?.[g.key]).map((g) => `${g.label} ${byGrade[g.key]}`).join(' ')
}

// 문장 형식. 침상 24명, 휠체어 24명
export function byGradeText(byGrade) {
  return GRADES.filter((g) => byGrade?.[g.key]).map((g) => `${g.label} ${byGrade[g.key]}명`).join(', ')
}

export default function ShortageValue({ value, byGrade, provisional = 0, size = 'kpi', label = '미이송 예상', children }) {
  const big = size === 'kpi'
  return (
    <div>
      {label && <p className="type-caption text-text-sec">{label}</p>}
      <p className={clsx(big ? 'mt-2 type-kpi' : 'type-strong', 'tabular-nums', value > 0 ? 'text-danger-text' : 'text-text-pri')}>
        {value}<span className={big ? 'ml-1 type-h3' : ''}>명</span>
      </p>
      {byGrade && value > 0 && <p className="mt-1 type-body-sm text-text-sec tabular-nums">{byGradeText(byGrade)}</p>}
      {children && <div className="mt-1">{children}</div>}
      {provisional > 0 && <p className="mt-1 type-meta text-text-meta">확인 대기 서류 {provisional}건이 포함된 잠정값입니다.</p>}
    </div>
  )
}
