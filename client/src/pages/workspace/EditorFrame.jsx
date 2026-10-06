// 편집기 공통 틀. 왼쪽 위 문서함으로 돌아가기, 제목 바로 고치기, 저장 상태, 오른쪽 동작 버튼.
// 사이드바 없이 화면 전체를 쓴다(구글 문서와 같은 배치).
import { ArrowLeft, Cloud } from 'lucide-react'
import { Link } from 'react-router-dom'
import { useEffect, useState } from 'react'
import useWorkspaceStore from '../../store/useWorkspaceStore.js'

export function download(filename, content, type) {
  const blob = content instanceof Blob ? content : new Blob([content], { type })
  const url = URL.createObjectURL(blob)
  const a = document.createElement('a')
  a.href = url
  a.download = filename
  a.click()
  URL.revokeObjectURL(url)
}

export default function EditorFrame({ fill = false, kind, Icon, title, onTitle, updatedAt, actions, tabs, children }) {
  const [draft, setDraft] = useState(title)
  useEffect(() => { setDraft(title) }, [title])
  const commit = () => { const t = draft.trim(); if (t && t !== title) onTitle(t); else setDraft(title) }
  const mode = useWorkspaceStore((s) => s.mode)
  const sync = useWorkspaceStore((s) => s.sync)
  const savedAt = useWorkspaceStore((s) => s.savedAt)
  const time = updatedAt ? new Date(updatedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' }) : ''
  return (
    <div className={fill ? 'flex h-dvh flex-col overflow-hidden bg-canvas' : 'flex min-h-dvh flex-col bg-canvas'}>
      <header className="sticky top-0 z-nav shrink-0 bg-page border-b border-line-sub">
        <div className="flex h-16 items-center gap-3 px-3 md:px-5">
          <Link to={`/console/workspace?kind=${kind}`} aria-label="문서함으로" className="inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-full text-text-sec hover:bg-mute">
            <ArrowLeft size={20} aria-hidden="true" />
          </Link>
          <Icon size={26} aria-hidden="true" className="shrink-0 text-text-sec" />
          <input
            value={draft} onChange={(e) => setDraft(e.target.value)} onBlur={commit}
            onKeyDown={(e) => { if (e.key === 'Enter') e.currentTarget.blur() }}
            aria-label="제목"
            className="min-w-0 flex-1 rounded-xs bg-transparent px-2 py-1 type-h3 text-text-pri outline-none hover:ring-1 hover:ring-line-def focus:ring-2 focus:ring-primary-line"
          />
          <span className="hidden items-center gap-1 type-meta text-text-meta md:inline-flex">
            <Cloud size={14} aria-hidden="true" />{mode === 'server'
              ? (sync === 'saving' ? '저장 중' : sync === 'error' ? '저장 실패, 다시 시도 중' : `서버에 저장됨${savedAt ? ` ${new Date(savedAt).toLocaleTimeString('ko-KR', { hour: 'numeric', minute: '2-digit' })}` : ''}`)
              : (time ? `${time} 저장됨(이 창)` : '저장됨(이 창)')}
          </span>
          <div className="flex shrink-0 items-center gap-2">{actions}</div>
        </div>
        {tabs}
      </header>
      {children}
    </div>
  )
}
