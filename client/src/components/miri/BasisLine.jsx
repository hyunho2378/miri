// 수치 바로 아래에 붙이는 기준 표기(PRD v2 4.1 원칙 2). 기준 시나리오, 명부 기준일, 출처 중 해당하는 것만 넘긴다.
import clsx from 'clsx'

// 명부 기준일 표기. 2026. 10. 6. 형식
export function fmtKDate(ms) {
  const d = new Date(ms)
  return `${d.getFullYear()}. ${d.getMonth() + 1}. ${d.getDate()}.`
}

export function basisText({ scenario, today, source } = {}) {
  const parts = []
  if (scenario) parts.push(`기준 시나리오 ${scenario}`)
  if (today != null) parts.push(`명부 ${fmtKDate(today)} 기준`)
  if (source) parts.push(`출처: ${source}`)
  return parts.join(', ')
}

export default function BasisLine({ scenario, today, source, className }) {
  const text = basisText({ scenario, today, source })
  if (!text) return null
  return <p className={clsx('type-meta text-text-meta tabular-nums', className)}>{text}</p>
}
