// 공공데이터 카드의 자료 기준 시각과 갱신 지연 표시. 지연, 0건, 실패이면 마지막 정상 수신 시각을 함께 보인다.
import { useEffect, useState } from 'react'
import clsx from 'clsx'
import { freshness, lastGood, fmtKst, rememberGood } from '../../lib/freshness.js'

export default function FreshnessNote({ kind, state, className }) {
  // 화면을 연 채로 시간이 지나도 지연 판정이 바뀌도록 1분마다 다시 판정
  const [now, setNow] = useState(() => Date.now())
  useEffect(() => { const iv = setInterval(() => setNow(Date.now()), 60_000); return () => clearInterval(iv) }, [])
  const f = state?.data ? freshness(kind, state.data, now) : null
  useEffect(() => { if (state?.data) rememberGood(kind, state.data) }, [kind, state?.data])
  const bad = !f ? Boolean(state?.error) : ['stale', 'empty', 'unknown'].includes(f.state) || Boolean(state?.error)
  const prev = bad ? lastGood(kind) : null
  if (!f && !prev) return null
  return (
    <span className={clsx('block type-caption', className)}>
      {f?.label ? (
        <span className={clsx(f.state === 'stale' || f.state === 'empty' || f.state === 'unknown' ? 'rounded-xs bg-warning-soft px-1.5 py-0.5 text-warning-text' : f.state === 'pending' ? 'rounded-xs bg-mute px-1.5 py-0.5 text-text-sec' : 'text-text-meta')}>{f.label}</span>
      ) : null}
      {prev ? <span className="ml-1.5 text-text-meta">마지막 정상 수신 {fmtKst(prev)}</span> : null}
    </span>
  )
}
