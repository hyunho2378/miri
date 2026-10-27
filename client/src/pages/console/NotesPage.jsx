// 현장 소식(IA 4.3 확장). 요양보호사, 생활지원사, 이장, 가족, 동 담당자가 전한 글이나 음성을 AI가 읽어 명부 변경 후보를 만들고, 담당자가 승인해야 명부가 바뀐다.
// 서류 읽기와 같은 구조: 위 단계 안내, 아래 왼쪽 확인 대기 목록, 오른쪽 선택한 건.
import { useMemo, useState } from 'react'
import { CircleAlert, FileAudio, MessageSquareText, ScanText, Send, UserCheck } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import NoteReview from '../../components/miri/NoteReview.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import StepCard from '../../components/miri/StepCard.jsx'
import Button from '../../components/ui/Button.jsx'
import Card from '../../components/ui/Card.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
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
    toast(`${note.personCode} 소식 읽기를 마쳤습니다. ${note.read.diff.changed ? '명부 변경 후보 1건' : '달라진 점 없음'}`, 'primary')
  }

  const base = () => ({ id: nextNoteId(), personCode: target.code, villageCode: target.villageCode, source, status: 'pending', receivedAt: Date.now(), current: { grade: target.grade, tags: [...(target.tags || [])] } })

  const onRead = async () => {
    if (!target) return
    const hasInput = mode === 'voice' ? !!file : !!text.trim()
    if (!hasInput) { setError({ title: mode === 'voice' ? '음성 파일을 골라 주십시오' : '소식을 적어 주십시오', desc: '전달받은 말을 그대로 적거나 녹음 파일을 올립니다.' }); return }
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
    const read = await progress(s.mode === 'voice' ? s.fileName : '샘플 소식', Promise.resolve(verifyNote(s.text, s.read, b.current)))
    finish({ ...b, source: s.source, mode: s.mode, fileName: s.fileName || '', text: s.text, read, mock: true })
  }

  const apply = (n, action, patch) => {
    reviewFieldNote(n.id, action, patch)
    toast(action === 'reject' ? `${n.personCode} 명부는 그대로 둡니다.` : `${n.personCode} 명부에 반영했습니다. 부족분 계산에 바로 쓰입니다.`, 'primary')
  }

  return (
    <PageShell title="현장 소식">
      <section aria-label="현장 소식 단계" className="mb-4 flex flex-col gap-3 lg:flex-row">
        <StepCard n={1} Icon={MessageSquareText} title="소식 받기" count={`${notes.length}건`}
          active={inputOpen} onClick={canEdit ? () => setShowInput((v) => !v) : undefined} />
        <StepCard n={2} Icon={ScanText} title="AI가 읽기" count={`${notes.filter((n) => n.read.diff.changed).length}건 변경 후보`} />
        <StepCard n={3} Icon={UserCheck} title="사회복지 담당자 승인" count={`대기 ${queue.length}건`} active={!inputOpen && queue.length > 0} />
      </section>

      {inputOpen && (
        <Card title="소식 받기" className="mb-4">
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
                  <Select className="w-72" label="샘플 소식" value={sampleId} onChange={setSampleId} options={SAMPLE_NOTES.map((s) => ({ value: s.id, label: s.label }))} />
                  <Button variant="secondary" onClick={onSample} disabled={!!reading && !reading.failed}>샘플 읽기</Button>
                </div>
                <div className="flex flex-col items-end gap-2">
                  <Checkbox checked={virtualOk} onChange={setVirtualOk} label="실제 개인정보가 없는 가상 소식임을 확인했습니다" />
                  <Button variant="primary" size="lg" onClick={onRead} disabled={(!!reading && !reading.failed) || !virtualOk} leftIcon={<Send size={16} aria-hidden="true" />}>AI가 읽기</Button>
                </div>
              </div>
            </div>
          ) : <p className="type-body-sm text-text-meta">현장 소식을 올릴 권한이 없습니다.</p>}
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
        </Card>
      )}

      {current ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
          <Card as="aside" padding="none" aria-label="확인 대기 목록" className="xl:sticky xl:top-20">
            <div className="flex items-center justify-between gap-2 border-b border-line-sub px-4 py-3">
              <p className="type-strong text-text-pri">확인 대기 <span className="tabular-nums">{queue.length}</span>건</p>
              {lightCount > 0 && <span className="type-meta text-text-meta">등급 하향 {lightCount}건</span>}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {queue.map((q, i) => {
                const c = CONF[q.read.confidence] || CONF.mid
                const d = q.read.diff
                return (
                  <li key={q.id}>
                    <button type="button" onClick={() => setIdx(i)} aria-current={i === pos ? 'true' : undefined}
                      className={clsx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast', i === pos ? 'bg-page' : 'hover:bg-mute')}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate type-strong text-text-pri">{vlabel(q.villageCode)} <span className="type-meta tabular-nums text-text-meta">{q.personCode.split('-').pop()}</span></span>
                        <span className="block truncate type-meta text-text-meta">{sourceLabel(q.source)}, {d.changed ? `${gradeOf(q.current.grade)?.label} → ${gradeOf(d.next.grade)?.label}` : '달라진 점 없음'}</span>
                      </span>
                      <span className={clsx('shrink-0 rounded-xs px-1.5 py-0.5 type-caption', c.tone)}>{c.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </Card>
          <NoteReview
            key={current.id}
            note={current} villageLabel={vlabel(current.villageCode)} canEdit={canEdit}
            onApply={(p) => apply(current, 'apply', p)}
            onEdit={(p) => apply(current, 'edit', p)}
            onReject={() => apply(current, 'reject')}
          />
        </div>
      ) : (
        <Card as="div" padding="none"><EmptyState title="확인 대기 소식이 없습니다" desc="새 소식은 1단계 소식 받기에서 등록합니다." /></Card>
      )}

      <section className="mt-6" aria-label="처리 완료 소식">
        <Disclosure summary={`처리 완료 소식 ${done.length}건`}>
          {done.length ? (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {done.map((n) => (
                <Card key={n.id} as="li" padding="sm">
                  <div className="flex items-center justify-between gap-2">
                    <Link to={`/console/roster?person=${n.personCode}`} className="type-strong tabular-nums text-text-pri hover:underline">{n.personCode}</Link>
                    <StatusPill status={n.status === 'rejected' ? 'rejected' : n.status === 'edited' ? 'edited' : 'confirmed'} label={n.status === 'rejected' ? '반영 안 함' : n.status === 'edited' ? '수정 후 반영' : '명부에 반영'} size="sm" />
                  </div>
                  <p className="mt-1 type-meta text-text-meta">{n.id}, {sourceLabel(n.source)}, {fmtDate(n.receivedAt)}</p>
                  <p className="mt-2 type-meta text-text-sec">
                    {n.status === 'rejected' ? `명부 그대로 ${gradeOf(n.current.grade)?.label}` : `${gradeOf(n.current.grade)?.label} → ${gradeOf(n.final.grade)?.label}`}
                  </p>
                  {n.read.quote && <p className="mt-1 truncate type-meta text-text-meta">&ldquo;{n.read.quote}&rdquo;</p>}
                </Card>
              ))}
            </ul>
          ) : <p className="type-body-sm text-text-meta">처리 완료 소식이 없습니다.</p>}
        </Disclosure>
      </section>
    </PageShell>
  )
}
