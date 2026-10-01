// 이송 등급 칩(PATTERNS 30). 색으로 구분하지 않는다. 아이콘과 라벨만.
import clsx from 'clsx'
import { Accessibility, BedSingle, Footprints, HandHelping } from 'lucide-react'
import { gradeOf } from '../../lib/shortage.js'

export const GRADE_ICON = { bed: BedSingle, wheelchair: Accessibility, assist: HandHelping, walk: Footprints }

export default function GradeChip({ grade, size = 'md', className }) {
  const g = gradeOf(grade)
  const Icon = GRADE_ICON[grade]
  if (!g) return <span className={clsx('inline-flex items-center h-6 px-2 rounded-xs bg-danger-soft text-danger-text type-caption', className)}>판정 불가</span>
  return (
    <span className={clsx('inline-flex items-center gap-1 rounded-xs bg-line-def text-text-sec type-caption whitespace-nowrap', size === 'sm' ? 'h-5 px-1.5' : 'h-6 px-2', className)}>
      <Icon size={size === 'sm' ? 14 : 16} strokeWidth={1.75} aria-hidden="true" />
      {g.label}
    </span>
  )
}
