// 이름과 값을 한 줄씩 잇는 행(HIG 그룹 목록의 이름-값 행). 상자와 선 없이 행 높이 48 이상
// rows: [{ key, label, value, note, strong }]. columns=2 는 넓은 화면에서 두 줄로 나눈다
import clsx from 'clsx'

export default function InfoRows({ rows, columns = 1, className }) {
  return (
    <dl className={clsx('grid min-w-0', columns === 2 && 'cq-xl:grid-cols-2 cq-xl:gap-x-10', className)}>
      {rows.filter(Boolean).map((r, i) => (
        <div key={r.key ?? i} className={clsx(r.wide && 'cq-xl:col-span-2', 'grid min-h-12 grid-cols-1 items-baseline gap-x-6 gap-y-0 py-2 cq-md:grid-cols-[minmax(9rem,13rem)_1fr]')}>
          <dt className="type-body-sm text-text-sec">{r.label}</dt>
          <dd className="min-w-0">
            <span className={clsx('tabular-nums', r.strong ? 'type-body-strong text-text-pri' : 'type-body text-text-pri')}>{r.value}</span>
            {r.note && <span className="block type-meta text-text-sec tabular-nums">{r.note}</span>}
            {r.extra}
          </dd>
        </div>
      ))}
    </dl>
  )
}
