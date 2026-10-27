// 업무 단계 안내 한 칸. 서류 읽기와 현장 소식이 같이 쓴다. 누르면 입력 카드를 여닫는 칸은 onClick 을 준다.
import clsx from 'clsx'

export default function StepCard({ n, title, desc, count, active, onClick, Icon }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={clsx('flex min-w-0 flex-1 items-start gap-3 rounded-lg p-4 text-left transition-colors duration-fast',
        active ? 'bg-mute' : 'bg-subtle', onClick && 'hover:bg-mute')}>
      <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-sm type-strong', active ? 'bg-text-pri text-text-inverse' : 'bg-page text-text-sec')}>
        {Icon ? <Icon size={16} aria-hidden="true" /> : n}
      </span>
      <span className="min-w-0">
        <span className="block type-caption text-text-meta">{n}단계</span>
        <span className="block type-strong text-text-pri">{title}</span>
        {desc && <span className="mt-0.5 block type-meta leading-5 text-text-sec">{desc}</span>}
        <span className="mt-2 block type-h3 text-text-pri tabular-nums">{count}</span>
      </span>
    </Tag>
  )
}
