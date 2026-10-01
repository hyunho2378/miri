// Card. 모든 흰 표면의 단일 출처(UI_PLAYBOOK 3.1). 페이지에서 bg-page rounded-lg shadow-card 를 직접 쓰지 않는다.
// 액센트 보더(좌측 상단 컬러 줄) 금지. 강조가 필요하면 tone 으로 배경 톤만 바꾼다.
// padding: md(기본 16/20) sm(12/16) none(표나 목록이 가장자리까지 닿을 때)
import clsx from 'clsx'

const PAD = { md: 'p-4 lg:p-5', sm: 'p-3 lg:p-4', lg: 'p-5 lg:p-6', none: '' }
const TONE = { default: 'bg-page shadow-card', primary: 'bg-primary-soft', danger: 'bg-danger-soft', mute: 'bg-subtle' }

export default function Card({
  title, desc, actions, eyebrow, children, className, bodyClassName,
  padding = 'md', tone = 'default', as: As = 'section', headingLevel = 2, ...rest
}) {
  const H = `h${headingLevel}`
  const hasHead = title || actions || eyebrow
  return (
    <As className={clsx('rounded-lg min-w-0', TONE[tone], className)} {...rest}>
      {hasHead && (
        <header className={clsx('flex flex-wrap items-start justify-between gap-3', padding === 'none' ? 'px-4 pt-4 pb-3 lg:px-5 lg:pt-5' : clsx(PAD[padding], 'pb-0 lg:pb-0'))}>
          <div className="min-w-0">
            {eyebrow && <p className="mb-1 type-caption text-text-meta">{eyebrow}</p>}
            {title && <H className="type-h3 text-text-pri">{title}</H>}
            {desc && <p className="mt-1 type-meta text-text-meta">{desc}</p>}
          </div>
          {actions && <div className="flex flex-wrap items-center gap-2">{actions}</div>}
        </header>
      )}
      <div className={clsx(PAD[padding], hasHead && padding !== 'none' && 'pt-3 lg:pt-4', bodyClassName)}>{children}</div>
    </As>
  )
}
