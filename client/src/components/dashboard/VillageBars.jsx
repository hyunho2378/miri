// 마을별 이동 불가 인원 막대. 막대마다 값을 위에 적고, 가장 큰 값은 경보색, 나머지는 진한 회색. 이름은 아래 한 줄
// rows: [{ key, name, value }]. 막대 영역 높이는 className 으로 정한다(넓은 화면에서 키울 수 있게 비율로 그린다)
import clsx from 'clsx'

const shortName = (n) => n.replace(/ 일대$/, '').replace(/동$/, '')

export default function VillageBars({ rows, className = 'h-[140px] cq-2xl:h-[264px]', ariaLabel, fill = false }) {
  const max = Math.max(1, ...rows.map((r) => r.value))
  const top = rows.reduce((m, r) => (r.value > m.value ? r : m), { value: -1 })
  return (
    <div className={clsx('flex gap-1', fill && 'cq-xl:min-h-[140px] cq-xl:flex-1')} role="img" aria-label={ariaLabel || `마을별 이동 불가 인원: ${rows.map((r) => `${r.name} ${r.value}명`).join(', ')}`}>
      {rows.map((r) => {
        const hot = r.key === top.key && r.value > 0
        const pct = r.value > 0 ? Math.max(14, Math.round((r.value / max) * 100)) : 0
        return (
          <div key={r.key} className="flex min-w-0 flex-1 flex-col items-center" title={`${r.name} ${r.value}명`}>
            <div className={clsx('flex w-full flex-col items-center justify-end', fill ? 'h-[140px] cq-2xl:h-[264px] cq-xl:h-auto cq-xl:min-h-0 cq-xl:flex-1' : className)}>
              <div className="flex w-full flex-col items-center justify-end" style={{ height: r.value > 0 ? `${pct}%` : undefined, minHeight: r.value > 0 ? 32 : 4 }}>
                {r.value > 0 && <span className={clsx('mb-1 type-meta tabular-nums', hot ? 'font-bold text-danger-text' : 'text-text-sec')}>{r.value}</span>}
                <div className={clsx('min-h-1 w-7 flex-1 rounded-t-sm', hot ? 'bg-danger' : r.value > 0 ? 'bg-text-sec' : 'bg-mute')} style={r.value > 0 ? undefined : { flex: 'none', height: 4 }} />
              </div>
            </div>
            <span className="mt-2 w-full break-keep text-center type-meta text-text-sec">{shortName(r.name)}</span>
          </div>
        )
      })}
    </div>
  )
}
