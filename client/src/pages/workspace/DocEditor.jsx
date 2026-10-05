// 문서 편집기. 왼쪽 개요, 가운데 A4 종이, 오른쪽 버전 기록. 내보내기는 Word, HTML, 텍스트, 인쇄, 구글 문서로 복사.
import { useCallback, useEffect, useRef, useState } from 'react'
import clsx from 'clsx'
import {
  Bold, Download, FileText, Heading1, Heading2, History, Italic, Link2, List, ListOrdered,
  Pilcrow, Printer, Redo2, RemoveFormatting, Underline, Undo2
} from 'lucide-react'
import { Navigate, useParams } from 'react-router-dom'
import Button from '../../components/ui/Button.jsx'
import useToast from '../../hooks/useToast.js'
import useWorkspaceStore from '../../store/useWorkspaceStore.js'
import EditorFrame, { download } from './EditorFrame.jsx'

const exec = (cmd, arg) => document.execCommand(cmd, false, arg)

function ToolButton({ label, onClick, children, active }) {
  return (
    <button type="button" aria-label={label} title={label}
      onMouseDown={(e) => e.preventDefault()} onClick={onClick}
      className={clsx('inline-flex h-9 w-9 items-center justify-center rounded-md text-text-sec hover:bg-mute hover:text-text-pri', active && 'bg-primary-soft text-primary-text')}>
      {children}
    </button>
  )
}

const toText = (html) => {
  const el = document.createElement('div')
  el.innerHTML = html
  el.querySelectorAll('h1').forEach((n) => { n.textContent = `# ${n.textContent}` })
  el.querySelectorAll('h2').forEach((n) => { n.textContent = `## ${n.textContent}` })
  el.querySelectorAll('li').forEach((n) => { n.textContent = `- ${n.textContent}` })
  return [...el.childNodes].map((n) => (n.tagName === 'UL' || n.tagName === 'OL' ? [...n.children].map((li) => li.textContent).join('\n') : n.textContent)).join('\n\n')
}

const wrapHtml = (title, body) => `<!doctype html><html lang="ko"><head><meta charset="utf-8"><title>${title}</title><style>body{font-family:'Pretendard','Malgun Gothic',sans-serif;line-height:1.7;max-width:720px;margin:40px auto;padding:0 24px}h1{font-size:24px}h2{font-size:18px;margin-top:28px}</style></head><body>${body}</body></html>`

export default function DocEditor() {
  const { id } = useParams()
  const doc = useWorkspaceStore((s) => s.items.find((x) => x.id === id))
  const update = useWorkspaceStore((s) => s.update)
  const saveVersion = useWorkspaceStore((s) => s.saveVersion)
  const toast = useToast()
  const pageRef = useRef(null)
  const timer = useRef(null)
  const [outline, setOutline] = useState([])
  const [showHistory, setShowHistory] = useState(false)
  const [exportOpen, setExportOpen] = useState(false)

  const readOutline = useCallback(() => {
    const el = pageRef.current
    if (!el) return
    setOutline([...el.querySelectorAll('h1, h2')].map((n, i) => ({ i, level: n.tagName === 'H1' ? 1 : 2, text: n.textContent.trim() || '제목 없음', node: n })))
  }, [])

  useEffect(() => {
    if (pageRef.current && doc) { pageRef.current.innerHTML = doc.html; readOutline() }
  }, [id]) // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => () => clearTimeout(timer.current), [])

  if (!doc) return <Navigate to="/console/workspace?kind=doc" replace />

  const onInput = () => {
    readOutline()
    clearTimeout(timer.current)
    timer.current = setTimeout(() => {
      update(id, { html: pageRef.current.innerHTML })
      saveVersion(id)
    }, 800)
  }

  const block = (tag) => { exec('formatBlock', tag); onInput() }
  const link = () => { const url = window.prompt('연결할 주소'); if (url) { exec('createLink', url); onInput() } }

  const html = () => pageRef.current?.innerHTML || doc.html
  const doExport = async (type) => {
    setExportOpen(false)
    const name = doc.title.replace(/[\\/:*?"<>|]/g, '')
    if (type === 'doc') download(`${name}.doc`, wrapHtml(doc.title, html()), 'application/msword')
    if (type === 'html') download(`${name}.html`, wrapHtml(doc.title, html()), 'text/html')
    if (type === 'txt') download(`${name}.md`, toText(html()), 'text/markdown')
    if (type === 'print') {
      const w = window.open('', '_blank')
      if (!w) { toast('팝업이 막혀 인쇄 창을 열지 못했습니다', 'danger'); return }
      w.document.write(wrapHtml(doc.title, html())); w.document.close(); w.focus(); w.print()
    }
    if (type === 'gdoc') {
      try {
        await navigator.clipboard.write([new ClipboardItem({ 'text/html': new Blob([html()], { type: 'text/html' }), 'text/plain': new Blob([toText(html())], { type: 'text/plain' }) })])
        window.open('https://docs.new', '_blank', 'noopener')
        toast('서식째 복사했습니다. 새 구글 문서에 붙여 넣으세요', 'primary')
      } catch {
        toast('복사하지 못했습니다. 브라우저 권한을 확인하세요', 'danger')
      }
    }
  }

  const restore = (v) => {
    pageRef.current.innerHTML = v.html
    update(id, { html: v.html })
    saveVersion(id, '이전 버전 복원')
    readOutline()
    toast('이전 버전으로 되돌렸습니다', 'primary')
  }

  const actions = (
    <>
      <Button variant="ghost" size="sm" leftIcon={<History size={16} aria-hidden="true" />} onClick={() => setShowHistory((v) => !v)}>버전 기록</Button>
      <div className="relative">
        <Button size="sm" leftIcon={<Download size={16} aria-hidden="true" />} onClick={() => setExportOpen((v) => !v)}>내보내기</Button>
        {exportOpen && (
          <div className="absolute right-0 top-11 z-dropdown w-56 rounded-md bg-page py-1 shadow-float ring-1 ring-line-sub">
            {[
              ['gdoc', '구글 문서로 복사'], ['doc', 'Word 파일(.doc)'], ['html', '웹페이지(.html)'], ['txt', '마크다운(.md)'], ['print', '인쇄 또는 PDF 저장']
            ].map(([k, l]) => (
              <button key={k} type="button" onClick={() => doExport(k)} className="flex w-full items-center gap-2 px-3 py-2 text-left type-body-sm hover:bg-mute">
                {k === 'print' ? <Printer size={16} aria-hidden="true" /> : <FileText size={16} aria-hidden="true" />}{l}
              </button>
            ))}
          </div>
        )}
      </div>
    </>
  )

  const toolbar = (
    <div className="flex flex-wrap items-center gap-0.5 border-t border-line-sub px-3 py-1 md:px-5">
      <ToolButton label="실행 취소" onClick={() => exec('undo')}><Undo2 size={18} /></ToolButton>
      <ToolButton label="다시 실행" onClick={() => exec('redo')}><Redo2 size={18} /></ToolButton>
      <span className="mx-1 h-5 w-px bg-line-sub" />
      <ToolButton label="큰 제목" onClick={() => block('H1')}><Heading1 size={18} /></ToolButton>
      <ToolButton label="소제목" onClick={() => block('H2')}><Heading2 size={18} /></ToolButton>
      <ToolButton label="본문" onClick={() => block('P')}><Pilcrow size={18} /></ToolButton>
      <span className="mx-1 h-5 w-px bg-line-sub" />
      <ToolButton label="굵게" onClick={() => { exec('bold'); onInput() }}><Bold size={18} /></ToolButton>
      <ToolButton label="기울임" onClick={() => { exec('italic'); onInput() }}><Italic size={18} /></ToolButton>
      <ToolButton label="밑줄" onClick={() => { exec('underline'); onInput() }}><Underline size={18} /></ToolButton>
      <ToolButton label="링크" onClick={link}><Link2 size={18} /></ToolButton>
      <span className="mx-1 h-5 w-px bg-line-sub" />
      <ToolButton label="글머리 목록" onClick={() => { exec('insertUnorderedList'); onInput() }}><List size={18} /></ToolButton>
      <ToolButton label="번호 목록" onClick={() => { exec('insertOrderedList'); onInput() }}><ListOrdered size={18} /></ToolButton>
      <ToolButton label="서식 지우기" onClick={() => { exec('removeFormat'); onInput() }}><RemoveFormatting size={18} /></ToolButton>
    </div>
  )

  return (
    <EditorFrame kind="doc" Icon={FileText} title={doc.title} onTitle={(t) => update(id, { title: t })} updatedAt={doc.updatedAt} actions={actions} tabs={toolbar}>
      <div className="flex flex-1">
        <aside className="hidden w-64 shrink-0 border-r border-line-sub px-4 py-6 lg:block" aria-label="문서 개요">
          <p className="type-caption text-text-meta">개요</p>
          <ul className="mt-2 space-y-1">
            {outline.map((o) => (
              <li key={o.i}>
                <button type="button" onClick={() => o.node.scrollIntoView({ behavior: 'smooth', block: 'center' })}
                  className={clsx('block w-full truncate rounded-xs px-2 py-1 text-left hover:bg-mute', o.level === 1 ? 'type-strong text-text-pri' : 'pl-4 type-body-sm text-text-sec')}>
                  {o.text}
                </button>
              </li>
            ))}
          </ul>
        </aside>
        <div className="min-w-0 flex-1 overflow-x-auto px-4 py-8">
          <div
            ref={pageRef} contentEditable suppressContentEditableWarning onInput={onInput} onBlur={() => saveVersion(id, '편집')}
            aria-label="문서 본문" role="textbox" aria-multiline="true"
            className="doc-page mx-auto min-h-[1000px] w-full max-w-[816px] bg-page px-8 py-10 shadow-card outline-none md:px-16 md:py-16"
          />
        </div>
        {showHistory && (
          <aside className="w-72 shrink-0 border-l border-line-sub bg-page px-4 py-6" aria-label="버전 기록">
            <p className="type-strong text-text-pri">버전 기록</p>
            <p className="mt-1 type-meta text-text-meta">고칠 때마다 저장됩니다. 눌러서 되돌릴 수 있습니다.</p>
            <ul className="mt-3 space-y-1">
              {[...doc.versions].reverse().map((v, i) => (
                <li key={v.at + i}>
                  <button type="button" onClick={() => restore(v)} className="block w-full rounded-md px-2 py-2 text-left hover:bg-mute">
                    <span className="block type-body-sm text-text-pri">{new Date(v.at).toLocaleString('ko-KR', { month: 'numeric', day: 'numeric', hour: 'numeric', minute: '2-digit' })}</span>
                    <span className="block type-meta text-text-meta">{i === 0 ? '현재 버전' : v.label}</span>
                  </button>
                </li>
              ))}
            </ul>
          </aside>
        )}
      </div>
    </EditorFrame>
  )
}
