// 현장 소식(IA 4.3 확장). 요양보호사, 생활지원사, 이장, 가족, 동 담당자가 전한 글이나 음성을 AI가 읽어 명부 변경 후보를 만들고, 담당자가 승인해야 명부가 바뀐다.
// 서류 읽기와 같은 구조: 위 단계 안내, 아래 왼쪽 확인 대기 목록, 오른쪽 선택한 건.
import { useMemo, useState } from 'react'
import { ChevronRight, CircleAlert, FileAudio, MessageSquareText, Send } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import NoteReview from '../../components/miri/NoteReview.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import PageHeader from '../../components/console/PageHeader.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import Select from '../../components/ui/Select.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import useToast from '../../hooks/useToast.js'
import { TAGS } from '../../lib/intake.js'
import { NOTE_SOURCES, SAMPLE_NOTES, readNote, sourceLabel, verifyNote } from '../../lib/notes.js'
import { aiErrorMessage } from '../../lib/aiErrors.js'
import Checkbox from '../../components/ui/Checkbox.jsx'
import { gradeOf } from '../../lib/shortage.js'
import { fmtDate } from '../../lib/time.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const CONF_ORDER = { low: 0, mid: 1, high: 2 }
const CONF = {
  high: { label: '서류와 같음', tone: 'text-text-meta' },
  mid: { label: '확인 필요', tone: 'text-text-pri' },
  low: { label: '확인 필요', tone: 'text-danger-text' }
}
const NOTE_STEPS = ['소식 받아 적기', '달라진 점 찾기', '근거 추출', '원문 대조']
const MODES = [{ value: 'text', label: '글로 붙여 넣기', icon: MessageSquareText }, { value: 'voice', label: '음성 파일 올리기', icon: FileAudio }]
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function NotesPage() {
  const persons = useMiriStore((s) => s.persons)
  const notes = useMiriStore((s) => s.fieldNotes)
  const villages = useMiriStore((s) => s.villages)
  const addFieldNote = useMiriStore((s) => s.addFieldNote)
  const reviewFieldNote = useMiriStore((s) => s.reviewFieldNote)
  const nextNoteId = useMiriStore((s) => s.nextNoteId)
  const canEdit = useAuthStore((s) => s.canEdit('intake'))
  const toast = useToast()

  const [showInput, setShowInput] = useState(false)
  const [mode, setMode] = useState('text')
  // 실제 개인정보 소식 입력 금지. 가상 소식임을 고른 뒤에만 AI에 보낸다
  const [virtualOk, setVirtualOk] = useState(false)
  const [personCode, setPersonCode] = useState('')
  const [source, setSource] = useState('caregiver')
  const [text, setText] = useState('')
  const [file, setFile] = useState(null)
  const [sampleId, setSampleId] = useState(SAMPLE_NOTES[0].id)
  const [reading, setReading] = useState(null)
  const [error, setError] = useState(null)
  const [idx, setIdx] = useState(0)

  const vlabel = (c) => villages.find((v) => v.code === c)?.label || c
  const personMap = useMemo(() => Object.fromEntries(persons.map((p) => [p.code, p])), [persons])
  const personOptions = useMemo(() => persons
    .filter((p) => p.review !== 'pending' && p.review !== 'rejected')
    .sort((a, b) => vlabel(a.villageCode).localeCompare(vlabel(b.villageCode), 'ko') || a.code.localeCompare(b.code))
    .map((p) => ({ value: p.code, label: `${vlabel(p.villageCode)} ${p.code.split('-').pop()}`, secondary: gradeOf(p.grade)?.label || '' })),
  // eslint-disable-next-line react-hooks/exhaustive-deps
  [persons, villages])
  const target = personMap[personCode || personOptions[0]?.value]

  const queue = useMemo(() => notes
    .filter((n) => n.status === 'pending')
    .sort((a, b) => CONF_ORDER[a.read.confidence] - CONF_ORDER[b.read.confidence] || b.receivedAt - a.receivedAt), [notes])
  const done = notes.filter((n) => n.status !== 'pending')
  const pos = Math.min(idx, Math.max(0, queue.length - 1))
  const current = queue[pos]
  const inputOpen = showInput || !!reading || !!error
  const lightCount = queue.filter((q) => q.read.lightened).length

  const progress = async (name, work) => {
    setError(null)
    setReading({ name, step: 0 })
    try {
      const [res] = await Promise.all([work, (async () => {
        for (let i = 1; i <= 3; i += 1) { await wait(650); setReading((r) => r && { ...r, step: i }) }
      })()])
      await wait(500)
      setReading((r) => r && { ...r, step: 4 })
      await wait(300)
      return res
    } catch (e) {
      setReading((r) => r && { ...r, failed: true })
      throw e
    }
  }

  const finish = (note) => {
    addFieldNote(note)
    setReading(null)
    setShowInput(false)
    setText('')
    setFile(null)
    setIdx(0)
    toast(`${note.personCode} 소식 읽기 완료, ${note.read.diff.changed ? '명부 변경 후보 1건' : '달라진 점 없음'}`, 'primary')
  }

  const base = () => ({ id: nextNoteId(), personCode: target.code, villageCode: target.villageCode, source, status: 'pending', receivedAt: Date.now(), current: { grade: target.grade, tags: [...(target.tags || [])] } })

  const onRead = async () => {
    if (!target) return
    const hasInput = mode === 'voice' ? !!file : !!text.trim()
    if (!hasInput) { setError({ title: mode === 'voice' ? '음성 파일 선택 필요' : '소식 입력 필요', desc: '전달받은 말을 그대로 적거나 녹음 파일을 올립니다.' }); return }
    try {
      const b = base()
      const read = await progress(mode === 'voice' ? file.name : '붙여 넣은 소식', readNote({ text: mode === 'text' ? text.trim() : undefined, file: mode === 'voice' ? file : undefined, current: b.current, source }))
      finish({ ...b, mode, fileName: mode === 'voice' ? file.name : '', text: read.transcript || text.trim(), read, mock: false })
    } catch (e) {
      setReading(null)
      setError(aiErrorMessage(e, '소식'))
    }
  }

  const onSample = async () => {
    if (!target) return
    const s = SAMPLE_NOTES.find((x) => x.id === sampleId)
    const b = base()
    const read = await progress(s.mode === 'voice' ? s.fileName : '예시 소식', Promise.resolve(verifyNote(s.text, s.read, b.current)))
    finish({ ...b, source: s.source, mode: s.mode, fileName: s.fileName || '', text: s.text, read, mock: true })
  }

  const apply = (n, action, patch) => {
    reviewFieldNote(n.id, action, patch)
    toast(action === 'reject' ? `${n.personCode} 명부 유지` : `${n.personCode} 명부 반영 완료, 부족분 계산에 적용`, 'primary')
  }

  const [doneOpen, setDoneOpen] = useState(false)
  const steps = [
    { n: 1, label: '소식 받기', count: `${notes.length}건`, active: inputOpen },
    { n: 2, label: 'AI 읽기', count: `${notes.filter((n) => n.read.diff.changed).length}건 변경 후보` },
    { n: 3, label: '담당자 승인', count: `대기 ${queue.length}건`, active: !inputOpen && queue.length > 0 }
  ]

  return (
    <PageShell title="현장 소식" hideHeader className="flex flex-col lg:h-full lg:pb-4">
      <PageHeader title="현장 소식" className="!mb-3 shrink-0" action={canEdit && (
        <Button variant="primary" leftIcon={<MessageSquareText size={16} aria-hidden="true" />} onClick={() => setShowInput(true)}>소식 받기</Button>
      )} />
      <ol aria-label="현장 소식 단계" className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 type-body-sm text-text-sec">
        {steps.map((st, i) => (
          <li key={st.n} className="flex items-center gap-3">
            {i > 0 && <ChevronRight size={14} aria-hidden="true" className="text-text-ter" />}
            <span className={clsx('inline-flex items-center gap-2', st.active ? 'text-text-pri' : '')}>
              <span aria-hidden="true" className={clsx('inline-flex h-6 w-6 items-center justify-center rounded-full type-caption', st.active ? 'bg-text-pri text-text-inverse' : 'bg-mute text-text-sec')}>{st.n}</span>
              <span className={clsx(st.active && 'font-bold')}>{st.label}</span>
              <span className="tabular-nums">{st.count}</span>
            </span>
          </li>
        ))}
        <li className="ml-auto"><button type="button" onClick={() => setDoneOpen(true)} className="min-h-11 rounded-md px-2 type-body-sm text-primary-text hover:underline md:min-h-0">처리 완료 소식 {done.length}건</button></li>
      </ol>

      <Modal open={inputOpen} onClose={() => { setShowInput(false); setError(null) }} title="소식 받기" className="max-w-[720px]">
          {canEdit ? (
          <div className="space-y-4">
            <div className="grid gap-3 sm:grid-cols-2">
              <Select label="대상자" value={target?.code || ''} onChange={setPersonCode} options={personOptions} />
              <Select label="소식을 전한 사람" value={source} onChange={setSource} options={NOTE_SOURCES} />
            </div>
            {target && (
              <p className="type-meta text-text-meta">현재 명부: {gradeOf(target.grade)?.label}, 특이사항 {target.tags.map((t) => TAGS[t]).join(', ') || '없음'}</p>
            )}
            <SegmentControl label="소식 입력 방법" items={MODES} value={mode} onChange={(v) => { setMode(v); setError(null) }} />
            {mode === 'text' ? (
              <Textarea label="전해 들은 말" rows={4} value={text} onChange={(e) => setText(e.target.value)} maxLength={4000}
                placeholder="예) 지난주 넘어지신 뒤로 휠체어를 타고 이동하세요." hint="실제 주민의 이름, 주소, 전화번호는 적지 않습니다. 남아 있으면 읽기를 멈춥니다." />
            ) : (
              <div className="rounded-lg border-2 border-dashed border-line-def bg-subtle p-6 text-center">
                <FileAudio size={32} aria-hidden="true" className="mx-auto text-text-meta" />
                <p className="mt-2 type-body-sm text-text-sec">{file ? file.name : '휴대폰으로 녹음한 파일을 올립니다.'}</p>
                <p className="mt-1 type-meta text-text-meta">6MB 이하의 음성 파일(mp3, wav, m4a 등)</p>
                <label className="pressable mt-4 inline-flex h-10 min-h-11 cursor-pointer items-center gap-2 rounded-md bg-page px-4 type-strong text-text-pri shadow-sm hover:bg-mute md:min-h-0">
                  <FileAudio size={16} aria-hidden="true" />파일 선택
                  <input type="file" accept="audio/*" className="sr-only" disabled={!!reading}
                    onChange={(e) => { setFile(e.target.files?.[0] || null); e.target.value = '' }} />
                </label>
              </div>
            )}
            <div className="flex flex-wrap items-end justify-between gap-3">
              <div className="flex flex-wrap items-end gap-2">
                <Select className="w-72" label="예시 소식" value={sampleId} onChange={setSampleId} options={SAMPLE_NOTES.map((s) => ({ value: s.id, label: s.label }))} />
                <Button variant="secondary" onClick={onSample} disabled={!!reading && !reading.failed}>예시 읽기</Button>
              </div>
              <div className="flex flex-col items-end gap-2">
                <Checkbox checked={virtualOk} onChange={setVirtualOk} label="개인정보 없는 소식임을 확인" />
                <Button variant="primary" size="lg" onClick={onRead} disabled={(!!reading && !reading.failed) || !virtualOk} leftIcon={<Send size={16} aria-hidden="true" />}>AI가 읽기</Button>
              </div>
            </div>
          </div>
        ) : <p className="type-body-sm text-text-meta">현장 소식 등록 권한 없음</p>}
        {reading && <div className="mt-4"><ReadTimeline name={reading.name} step={reading.step} failed={reading.failed} steps={NOTE_STEPS} title="현장 소식 읽기 진행 중" /></div>}
        {error && (
          <div role="alert" className="mt-4 flex items-start gap-2 rounded-md bg-danger-soft p-4 text-danger-text">
            <CircleAlert size={20} aria-hidden="true" className="shrink-0" />
            <div>
              <p className="type-strong">{error.title}</p>
              <p className="mt-1 type-meta">{error.desc}</p>
            </div>
          </div>
        )}
      </Modal>

      <Modal open={doneOpen} onClose={() => setDoneOpen(false)} title={`처리 완료 소식 ${done.length}건`} className="max-w-[720px]">
        {done.length ? (
          <ul className="space-y-4">
            {done.map((n) => (
              <li key={n.id}>
                <div className="flex items-center justify-between gap-2">
                  <Link to={`/console/roster?person=${n.personCode}`} className="type-strong tabular-nums text-text-pri hover:underline">{n.personCode}</Link>
                  <StatusPill status={n.status === 'rejected' ? 'rejected' : n.status === 'edited' ? 'edited' : 'confirmed'} label={n.status === 'rejected' ? '반영 안 함' : n.status === 'edited' ? '수정 후 반영' : '명부에 반영'} size="sm" />
                </div>
                <p className="mt-1 type-meta text-text-meta">{n.id}, {sourceLabel(n.source)}, {fmtDate(n.receivedAt)}</p>
                <p className="mt-1 type-body-sm text-text-sec">
                  {n.status === 'rejected' ? `명부 그대로 ${gradeOf(n.current.grade)?.label}` : `${gradeOf(n.current.grade)?.label} → ${gradeOf(n.final.grade)?.label}`}
                </p>
                {n.read.quote && <p className="mt-1 truncate type-meta text-text-meta">&ldquo;{n.read.quote}&rdquo;</p>}
              </li>
            ))}
          </ul>
        ) : <p className="type-body-sm text-text-meta">처리 완료 소식 없음</p>}
      </Modal>

      {current ? (
        <div className="grid min-h-0 flex-1 gap-x-8 gap-y-4 lg:grid-cols-[minmax(300px,380px)_minmax(0,1fr)]">
          <section aria-label="확인 대기 목록" className="flex min-h-0 flex-col max-lg:max-h-[40vh]">
            <div className="flex shrink-0 items-baseline justify-between gap-2 pb-2">
              <h2 className="type-title text-text-pri">확인 대기 <span className="font-normal tabular-nums text-text-sec">{queue.length}건</span></h2>
              {lightCount > 0 && <span className="type-body-sm text-text-sec">등급 하향 {lightCount}건</span>}
            </div>
            <ul role="listbox" aria-label="확인 대기 소식" className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
              {queue.map((q, i) => {
                const c = CONF[q.read.confidence] || CONF.mid
                const d = q.read.diff
                return (
                  <li key={q.id} role="presentation">
                    <button type="button" role="option" aria-selected={i === pos} onClick={() => setIdx(i)}
                      className={clsx('flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left transition-colors duration-fast', i === pos ? 'bg-mute' : 'hover:bg-subtle')}>
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block truncate type-body text-text-pri', i === pos && 'font-bold')}>{vlabel(q.villageCode)} <span className="type-body-sm tabular-nums text-text-sec">{q.personCode.split('-').pop()}</span></span>
                        <span className="block truncate type-body-sm text-text-sec">{sourceLabel(q.source)}, {d.changed ? `${gradeOf(q.current.grade)?.label} → ${gradeOf(d.next.grade)?.label}` : '달라진 점 없음'}</span>
                      </span>
                      <span className={clsx('shrink-0 type-body-sm font-bold', c.tone)}>{c.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
          <section aria-label="선택한 소식" className="cq min-h-0 min-w-0 overflow-y-auto pr-1">
            <NoteReview
              key={current.id}
              note={current} villageLabel={vlabel(current.villageCode)} canEdit={canEdit}
              onApply={(p) => apply(current, 'apply', p)}
              onEdit={(p) => apply(current, 'edit', p)}
              onReject={() => apply(current, 'reject')}
            />
          </section>
        </div>
      ) : (
        <EmptyState title="확인 대기 소식 없음" desc="새 소식은 소식 받기로 등록" action={canEdit ? <Button onClick={() => setShowInput(true)}>소식 받기</Button> : null} />
      )}
    </PageShell>
  )
}
