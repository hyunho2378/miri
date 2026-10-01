// 페이지 안 섹션 제목. 카드 밖 구획에만 쓴다. 카드 제목은 Card title.
import clsx from 'clsx'

export default function SectionTitle({ title, desc, actions, level = 2, className }) {
  const H = `h${level}`
  return (
    <div className={clsx('mb-3 flex flex-wrap items-end justify-between gap-3', className)}>
      <div className="min-w-0">
        <H className="type-h2 text-text-pri">{title}</H>
        {desc && <p className="mt-1 type-meta text-text-meta">{desc}</p>}
      </div>
      {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
    </div>
  )
}
