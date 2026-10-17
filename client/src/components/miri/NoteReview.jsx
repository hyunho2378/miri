// 현장 소식 1건 확인 화면. 왼쪽 받은 소식 원문(근거 문구 강조), 오른쪽 현재 명부 값과 AI 제안 값, 근거.
// 조작은 반영, 수정 후 반영, 반영 안 함 세 가지. 반영해야 명부가 바뀐다.
import { useState } from 'react'
import { ArrowRight, CircleAlert, FileAudio } from 'lucide-react'
import { TAGS } from '../../lib/intake.js'
import { sourceLabel } from '../../lib/notes.js'
import { fmtDate } from '../../lib/time.js'
import Badge from '../ui/Badge.jsx'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import MultiSelect from '../ui/MultiSelect.jsx'
import Select from '../ui/Select.jsx'
import EvidencePanel from './EvidencePanel.jsx'
import GradeChip from './GradeChip.jsx'
import { GRADE_OPTIONS, TAG_OPTIONS } from './ReviewRow.jsx'

function Quoted({ text, quote }) {
  const i = quote ? text.indexOf(quote) : -1
  if (i < 0) return <span>{text}</span>
  return (
    <span>
      {text.slice(0, i)}
      <mark className="rounded-xs bg-primary-soft px-0.5 text-primary-text">{quote}</mark>
      {text.slice(i + quote.length)}
    </span>
  )
}

const sameTags = (a, b) => [...a].sort().join() === [...b].sort().join()

export default function NoteReview({ note, villageLabel, canEdit, onApply, onEdit, onReject }) {
  const { read, current } = note
  const d = read.diff
  const [grade, setGrade] = useState(d.next.grade)
  const [tags, setTags] = useState(d.next.tags)
  const edited = grade !== d.next.grade || !sameTags(tags, d.next.tags)
  const willChange = grade !== current.grade || !sameTags(tags, current.tags)
  return (
    <Card as="div" padding="lg" aria-label={`현장 소식, 대상자 ${note.personCode}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,1fr)_minmax(340px,0.9fr)]">
        <div className="min-w-0">
          <div className="mb-2 flex flex-wrap items-center gap-2">
            <p className="type-caption text-text-sec">받은 소식</p>
            <span className="type-meta text-text-meta">{sourceLabel(note.source)}, {fmtDate(note.receivedAt)}</span>
            {note.mock && <Badge tone="neutral" className="ml-auto">시연용 모의 응답</Badge>}
          </div>
          {note.mode === 'voice' && (
            <p className="mb-2 inline-flex items-center gap-1.5 rounded-md bg-mute px-3 py-2 type-meta text-text-sec">
              <FileAudio size={16} aria-hidden="true" />{note.fileName || '음성 파일'}, 아래는 AI가 받아 적은 글입니다.
            </p>
          )}
          <p className="rounded-md bg-subtle p-4 type-body-sm leading-relaxed text-text-pri">
            <Quoted text={note.text} quote={read.quote} />
          </p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-h3 tabular-nums text-text-pri">{note.personCode}</p>
            <span className="type-body-sm text-text-meta">{villageLabel}</span>
          </div>

          <div className="rounded-md bg-subtle p-4">
            <p className="type-caption text-text-sec">명부가 이렇게 바뀝니다</p>
            <div className="mt-2 flex flex-wrap items-center gap-2">
              <GradeChip grade={current.grade} />
              <ArrowRight size={16} aria-hidden="true" className="text-text-meta" />
              {d.gradeChanged ? <GradeChip grade={d.next.grade} /> : <span className="type-meta text-text-meta">등급 그대로</span>}
            </div>
            <p className="mt-2 type-meta text-text-sec">
              특이사항 {d.addedTags.length || d.removedTags.length ? [
                ...d.addedTags.map((t) => `${TAGS[t]} 추가`),
                ...d.removedTags.map((t) => `${TAGS[t]} 해제`)
              ].join(', ') : '그대로'}
            </p>
            {read.summary && read.quoteMatched && <p className="mt-2 type-body-sm text-text-pri">{read.summary}</p>}
          </div>

          {!d.changed && (
            <p className="inline-flex items-center gap-1.5 type-meta text-text-sec">
              <CircleAlert size={16} aria-hidden="true" />소식에서 달라진 점을 찾지 못했습니다. 명부는 그대로 둡니다.
            </p>
          )}
          {!read.quoteMatched && d.changed && (
            <p role="note" className="flex items-start gap-1.5 rounded-md bg-danger-soft p-3 type-meta text-danger-text">
              <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              AI가 낸 근거 문구를 소식 원문에서 찾지 못했습니다. 요약은 숨겼습니다. 반영하지 말고 소식을 다시 확인해 주십시오.
            </p>
          )}
          {read.lightened && (
            <p role="note" className="flex items-start gap-1.5 rounded-md bg-warning-soft p-3 type-meta text-warning-text">
              <CircleAlert size={16} aria-hidden="true" className="mt-0.5 shrink-0" />
              도움이 덜 필요해지는 변경입니다. 안전을 위해 일치도를 한 단계 낮춰 표시했습니다. 소식 원문과 대조한 뒤 반영해 주십시오.
            </p>
          )}

          {d.changed && (
            <>
              <Select label="이송 등급" value={grade} options={GRADE_OPTIONS} onChange={setGrade} disabled={!canEdit} />
              <MultiSelect label="특이사항" values={tags} options={TAG_OPTIONS} onChange={setTags} disabled={!canEdit} />
              {edited && <p className="type-meta text-primary-text">AI 제안에서 변경했습니다. 수정 후 반영을 누르면 변경한 값으로 명부를 바꿉니다.</p>}
            </>
          )}

          <EvidencePanel subject="소식" quote={read.quote} matched={read.quoteMatched} confidence={read.confidence} conflict={read.conflict} transcript={note.text} docName={note.mode === 'voice' ? note.fileName : ''} />

          {canEdit && (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="lg" onClick={onReject}>{d.changed ? '반영 안 함' : '변경 없이 닫기'}</Button>
              {d.changed && <Button variant="secondary" size="lg" disabled={!edited || !willChange} onClick={() => onEdit({ grade, tags })}>수정 후 반영</Button>}
              {d.changed && <Button variant="primary" size="lg" disabled={edited} onClick={() => onApply({ grade, tags })}>명부에 반영</Button>}
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
