import { useId } from 'react'
import clsx from 'clsx'

export default function Textarea({ label, hint, error, rows = 4, id, className, ...rest }) {
  const auto = useId()
  const inputId = id || auto
  return (
    <div className={className}>
      {label && <label htmlFor={inputId} className="block type-caption text-text-sec mb-1.5">{label}</label>}
      <div className={clsx(
        'px-3 py-2.5 rounded-md bg-page border transition-colors duration-fast',
        error ? 'border-danger' : 'border-line-def hover:border-line-strong',
        'focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-line'
      )}>
        <textarea
          id={inputId}
          rows={rows}
          aria-invalid={error ? true : undefined}
          className="w-full min-w-0 resize-none bg-transparent outline-none type-body-sm text-text-pri placeholder:text-text-ter"
          {...rest}
        />
      </div>
      {error ? <p className="mt-1 type-caption text-danger-text">{error}</p>
             : hint && <p className="mt-1 type-meta text-text-meta">{hint}</p>}
    </div>
  )
}
