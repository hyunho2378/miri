// 문서함 첫 화면. 문서, 시트, 설문지 전환 → 새로 만들기 양식 → 최근 항목.
import { useMemo, useRef, useState } from 'react'
import clsx from 'clsx'
import { FileText, FileUp, ListChecks, MoreVertical, Plus, Search, Sheet } from 'lucide-react'
import { Link, useNavigate, useSearchParams } from 'react-router-dom'
import PageShell from '../../components/miri/PageShell.jsx'
import useToast from '../../hooks/useToast.js'
import { DOC_TEMPLATES, FORM_TEMPLATES, SHEET_TEMPLATES } from '../../lib/workspaceTemplates.js'
import useWorkspaceStore, { useWorkspaceInit } from '../../store/useWorkspaceStore.js'
import * as api from '../../lib/workspaceApi.js'
import { markdownToHtml } from './docConvert.js'

export const KINDS = [
  { key: 'doc', label: '문서', Icon: FileText, templates: DOC_TEMPLATES, newLabel: '새 문서' },
  { key: 'sheet', label: '시트', Icon: Sheet, templates: SHEET_TEMPLATES, newLabel: '새 시트' },
  { key: 'form', label: '설문지', Icon: ListChecks, templates: FORM_TEMPLATES, newLabel: '새 설문지' }
]
export const editorPath = (item) => `/console/workspace/${item.kind}/${item.id}`

const fmt = (iso) => {
  const d = new Date(iso)
  const today = new Date()
  return d.toDateString() === today.toDateString()
    ? d.toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })
    : d.toLocaleDateString('ko-KR')
}

function TemplateThumb({ kind, t }) {
  if (t.key === 'blank') return <Plus size={40} aria-hidden="true" className="text-primary" />
  if (kind === 'sheet') {
    return (
      <div className="w-full self-start">
        <div className="grid grid-cols-4 border-t border-l border-line-sub">
          {Array.from({ length: 16 }).map((_, i) => (
            <span key={i} className={clsx('h-4 border-r border-b border-line-sub', i < 4 && 'bg-subtle')} />
          ))}
        </div>
        <p className="mt-2 truncate type-meta text-text-meta">{t.columns.map((c) => c.label).join(', ')}</p>
      </div>
    )
  }
  if (kind === 'form') {
    return (
      <div className="w-full self-start space-y-1.5">
        <div className="h-1 rounded-full bg-primary" />
        {t.questions.slice(0, 3).map((q, i) => (
          <div key={i} className="rounded-xs bg-subtle px-2 py-1.5">
            <p className="truncate type-meta text-text-sec">{q.title}</p>
          </div>
        ))}
      </div>
    )
  }
  const text = t.html.replace(/<\/(h1|h2|p|li)>/g, '\n').replace(/<[^>]+>/g, '').split('\n').filter(Boolean).slice(0, 7)
  return (
    <div className="w-full self-start">
      {text.map((l, i) => <p key={i} className={clsx('truncate', i === 0 ? 'type-caption text-text-pri' : 'text-[10px] leading-4 text-text-meta')}>{l}</p>)}
    </div>
  )
}

export default function WorkspaceHome() {
  const [params, setParams] = useSearchParams()
  const kindKey = params.get('kind') || 'doc'
  const kind = KINDS.find((k) => k.key === kindKey) || KINDS[0]
  const items = useWorkspaceStore((s) => s.items)
  const create = useWorkspaceStore((s) => s.create)
  const duplicate = useWorkspaceStore((s) => s.duplicate)
  const remove = useWorkspaceStore((s) => s.remove)
  const navigate = useNavigate()
  const toast = useToast()
  const [q, setQ] = useState('')
  const [menu, setMenu] = useState(null)
  const ready = useWorkspaceInit()
  const mode = useWorkspaceStore((s) => s.mode)
  const createFromHtml = useWorkspaceStore((s) => s.createFromHtml)
  const fileRef = useRef(null)
  const [importing, setImporting] = useState(false)

  const importFile = async (e) => {
    const f = e.target.files?.[0]
    e.target.value = ''
    if (!f) return
    setImporting(true)
    try {
      const r = await api.parseFile(f)
      const title = (r.title || f.name.replace(/\.[^.]+$/, '')).slice(0, 80)
      const id = createFromHtml(title, markdownToHtml(r.markdown))
      toast(`${f.name} 파일을 문서로 가져왔습니다`, 'primary')
      navigate(`/console/workspace/doc/${id}`)
    } catch (err) {
      toast(err.message || '파일을 읽지 못했습니다', 'danger')
    } finally {
      setImporting(false)
    }
  }

  const list = useMemo(() => items
    .filter((x) => x.kind === kind.key)
    .filter((x) => !q || x.title.includes(q))
    .sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)), [items, kind.key, q])

  const make = (t) => {
    const id = create(kind.key, t.key)
    navigate(`/console/workspace/${kind.key}/${id}`)
  }

  return (
    <PageShell title="문서함">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div role="tablist" aria-label="종류" className="inline-flex rounded-full bg-mute p-1">
          {KINDS.map((k) => (
            <button key={k.key} type="button" role="tab" aria-selected={k.key === kind.key}
              onClick={() => setParams({ kind: k.key })}
              className={clsx('inline-flex h-9 items-center gap-2 rounded-full px-4 type-strong transition-colors duration-fast',
                k.key === kind.key ? 'bg-page text-primary-text shadow-card' : 'text-text-sec hover:text-text-pri')}>
              <k.Icon size={16} aria-hidden="true" />{k.label}
            </button>
          ))}
        </div>
        <label className="flex h-10 w-full max-w-sm items-center gap-2 rounded-full bg-mute px-4 sm:w-auto sm:flex-1">
          <Search size={16} aria-hidden="true" className="text-text-meta" />
          <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`${kind.label} 검색`} className="min-w-0 flex-1 bg-transparent type-body-sm text-text-pri outline-none placeholder:text-text-meta" />
        </label>
      </div>

      <section className="mt-6 rounded-lg bg-subtle p-4 lg:p-6" aria-labelledby="tpl-title">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h2 id="tpl-title" className="type-h3 text-text-pri">{kind.newLabel} 시작</h2>
          {kind.key === 'doc' && (
            <>
              <input ref={fileRef} type="file" accept=".hwp,.hwpx,.pdf,.docx" className="sr-only" onChange={importFile} />
              <button type="button" disabled={importing} onClick={() => fileRef.current?.click()} className="inline-flex h-10 items-center gap-2 rounded-md bg-page px-4 type-strong text-primary ring-1 ring-inset ring-line-def hover:bg-mute disabled:opacity-40">
                <FileUp size={16} aria-hidden="true" />{importing ? '파일 읽는 중' : '한글 파일 가져오기'}
              </button>
            </>
          )}
        </div>
        <ul className="mt-4 grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-6">
          {kind.templates.map((t) => (
            <li key={t.key}>
              <button type="button" onClick={() => make(t)} className="group block w-full text-left">
                <span className="flex aspect-[3/4] items-center justify-center rounded-md bg-page p-3 shadow-card ring-1 ring-inset ring-line-sub transition-shadow duration-fast group-hover:ring-primary">
                  <TemplateThumb kind={kind.key} t={t} />
                </span>
                <span className="mt-2 block truncate type-strong text-text-pri">{t.title}</span>
                <span className="block truncate type-meta text-text-meta">{t.desc}</span>
              </button>
            </li>
          ))}
        </ul>
      </section>

      <section className="mt-8" aria-labelledby="recent-title">
        <h2 id="recent-title" className="type-h3 text-text-pri">최근 {kind.label} <span className="ml-1 type-body-sm text-text-meta tabular-nums">{list.length}개</span></h2>
        {!ready ? (
          <p className="mt-3 type-body-sm text-text-meta">문서함을 불러오는 중입니다.</p>
        ) : list.length === 0 ? (
          <p className="mt-3 type-body-sm text-text-meta">아직 만든 {kind.label}가 없습니다. 위 양식에서 시작하세요.</p>
        ) : (
          <ul className="mt-3 divide-y divide-line-sub rounded-lg bg-page shadow-card">
            {list.map((x) => (
              <li key={x.id} className="relative flex items-center gap-3 px-4 py-3">
                <kind.Icon size={20} aria-hidden="true" className="shrink-0 text-primary" />
                <Link to={editorPath(x)} className="min-w-0 flex-1">
                  <span className="block truncate type-strong text-text-pri hover:underline">{x.title}</span>
                  <span className="block type-meta text-text-meta">
                    {x.kind === 'form' && `응답 ${x.responses.length}개, `}
                    {x.kind === 'sheet' && x.source === 'roster' && '명부와 연결, '}
                    {x.kind === 'sheet' && x.source === 'form' && '설문 응답과 연결, '}
                    {fmt(x.updatedAt)} 수정
                  </span>
                </Link>
                <button type="button" aria-label={`${x.title} 메뉴`} onClick={() => setMenu(menu === x.id ? null : x.id)} className="inline-flex h-9 w-9 items-center justify-center rounded-full text-text-meta hover:bg-mute">
                  <MoreVertical size={18} aria-hidden="true" />
                </button>
                {menu === x.id && (
                  <div className="absolute right-4 top-12 z-dropdown w-40 rounded-md bg-page py-1 shadow-float ring-1 ring-line-sub">
                    <button type="button" className="block w-full px-3 py-2 text-left type-body-sm hover:bg-mute" onClick={() => { const id = duplicate(x.id); setMenu(null); toast('사본을 만들었습니다', 'primary'); if (id) navigate(`/console/workspace/${x.kind}/${id}`) }}>사본 만들기</button>
                    <button type="button" className="block w-full px-3 py-2 text-left type-body-sm text-danger-text hover:bg-mute" onClick={() => { remove(x.id); setMenu(null); toast('삭제했습니다') }}>삭제</button>
                  </div>
                )}
              </li>
            ))}
          </ul>
        )}
        <p className="mt-3 type-meta text-text-meta">{mode === 'server' ? '문서함은 서버에 저장됩니다. 실제 주민 정보는 넣지 마세요.' : '문서함은 시연용으로 이 창에만 저장됩니다. 새로고침하면 처음 상태로 돌아가니 필요한 문서는 내보내기로 받아 두세요. 실제 주민 정보는 넣지 마세요.'}</p>
      </section>
    </PageShell>
  )
}
