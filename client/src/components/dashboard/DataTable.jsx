// PATTERNS.md 12번. 관리자 표 공통.
// 정렬과 페이지는 이 컴포넌트가 전체 rows 위에서 처리한다. 페이지 안에서만 정렬하면 사용자를 속인다.
// 768 미만은 표를 카드 리스트로 바꾼다(PITFALLS 22). 상태 색은 StatusPill 한 곳이므로 여기서 정의하지 않는다.
import { useMemo, useState } from 'react'
import clsx from 'clsx'
import { ChevronDown, ChevronsUpDown, ChevronUp } from 'lucide-react'
import { useLang } from '../../i18n/LangContext.jsx'
import EmptyState from '../ui/EmptyState.jsx'
import Pagination from '../ui/Pagination.jsx'

const HIDE = { md: 'hidden md:table-cell', lg: 'hidden lg:table-cell' }

export default function DataTable({
  columns = [], rows = [], rowKey = (r) => r.id, onRowClick,
  emptyTitle, emptyDesc, emptyImage, pageSize = 20, caption
}) {
  const { t } = useLang()
  const [sort, setSort] = useState(null)   // { key, dir: 'asc' | 'desc' }
  const [page, setPage] = useState(1)

  const sorted = useMemo(() => {
    if (!sort) return rows
    const col = columns.find((c) => c.key === sort.key)
    const value = col?.sortValue || ((r) => r[sort.key])
    return [...rows].sort((a, b) => {
      const x = value(a)
      const y = value(b)
      if (x === y) return 0
      const n = x > y ? 1 : -1
      return sort.dir === 'asc' ? n : -n
    })
  }, [rows, sort, columns])

  const total = sorted.length
  const safePage = Math.min(page, Math.max(1, Math.ceil(total / pageSize)))
  const view = sorted.slice((safePage - 1) * pageSize, safePage * pageSize)

  const toggleSort = (key) => {
    setPage(1)
    setSort((s) => (s?.key === key ? (s.dir === 'asc' ? { key, dir: 'desc' } : null) : { key, dir: 'asc' }))
  }

  if (!rows.length) {
    return <EmptyState image={emptyImage} title={emptyTitle || t('common.empty.title')} desc={emptyDesc || t('common.empty.desc')} />
  }

  const cell = (col, row) => (col.render ? col.render(row) : row[col.key])

  return (
    <div>
      {/* 768 이상 표 */}
      <div className="hidden md:block overflow-x-auto rounded-lg shadow-card bg-page">
        <table className="w-full text-left tabular-nums">
          {caption && <caption className="sr-only">{caption}</caption>}
          <thead>
            <tr className="bg-subtle">
              {columns.map((c) => {
                const active = sort?.key === c.key
                const Icon = !active ? ChevronsUpDown : sort.dir === 'asc' ? ChevronUp : ChevronDown
                return (
                  <th
                    key={c.key} scope="col" style={c.width ? { width: c.width } : undefined}
                    aria-sort={active ? (sort.dir === 'asc' ? 'ascending' : 'descending') : undefined}
                    className={clsx('px-4 py-3 type-caption font-semibold text-text-meta', c.align === 'right' && 'text-right', HIDE[c.hideBelow])}
                  >
                    {c.sortable ? (
                      <button
                        type="button" onClick={() => toggleSort(c.key)}
                        aria-label={`${c.label} ${t('common.action.sort')}`}
                        className={clsx('inline-flex items-center gap-1 hover:text-text-pri transition-colors duration-fast', active && 'text-text-pri')}
                      >
                        {c.label}
                        <Icon size={12} aria-hidden="true" />
                      </button>
                    ) : c.label}
                  </th>
                )
              })}
            </tr>
          </thead>
          <tbody>
            {view.map((row) => (
              <tr
                key={rowKey(row)}
                onClick={onRowClick ? () => onRowClick(row) : undefined}
                onKeyDown={onRowClick ? (e) => { if (e.key === 'Enter' && e.target === e.currentTarget) onRowClick(row) } : undefined}
                tabIndex={onRowClick ? 0 : undefined}
                className={clsx('border-t border-line-sub', onRowClick && 'cursor-pointer hover:bg-mute transition-colors duration-fast')}
              >
                {columns.map((c) => (
                  <td key={c.key} className={clsx('px-4 py-3 type-body-sm text-text-pri', c.align === 'right' && 'text-right', HIDE[c.hideBelow])}>
                    {cell(c, row)}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* 768 미만 카드 전환. 첫 열이 카드 타이틀, 나머지는 라벨과 값 2열 */}
      <ul className="md:hidden space-y-3">
        {view.map((row) => {
          const [first, ...rest] = columns
          return (
            <li key={rowKey(row)} className="bg-page rounded-lg shadow-card p-4">
              {/* 카드 전체를 버튼으로 감싸면 셀 안의 Toggle 이 button 안 button 이 된다. 제목만 버튼이다 */}
              {onRowClick ? (
                <button
                  type="button" onClick={() => onRowClick(row)}
                  className="pressable flex w-full items-center min-h-11 md:min-h-0 text-left type-h3 text-text-pri"
                >
                  {cell(first, row)}
                </button>
              ) : (
                <p className="type-h3 text-text-pri">{cell(first, row)}</p>
              )}
              <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
                {rest.map((c) => (
                  <div key={c.key} className="contents">
                    <dt className="type-caption text-text-meta">{c.label}</dt>
                    <dd className="type-body-sm text-text-sec tabular-nums">{cell(c, row)}</dd>
                  </div>
                ))}
              </dl>
            </li>
          )
        })}
      </ul>

      <Pagination className="mt-4" page={safePage} total={total} pageSize={pageSize} onChange={setPage} />
    </div>
  )
}
