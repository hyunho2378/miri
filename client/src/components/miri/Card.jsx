// 카드 베이스(PATTERNS 3). 제목, 설명, 우측 동작 슬롯.
import clsx from 'clsx'

export default function Card({ title, desc, actions, children, className, bodyClassName, as: As = 'section' }) {
  return (
    <As className={clsx('bg-page rounded-lg shadow-card min-w-0', className)}>
      {(title || actions) && (
        <header className="flex flex-wrap items-start justify-between gap-3 px-4 pt-4 lg:px-5 lg:pt-5">
          <div className="min-w-0">
            {title && <h2 className="type-h3 text-text-pri">{title}</h2>}
            {desc && <p className="mt-1 type-meta text-text-meta">{desc}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx('p-4 lg:p-5', bodyClassName)}>{children}</div>
    </As>
  )
}
