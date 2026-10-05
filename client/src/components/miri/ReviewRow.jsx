// 서류 1건 확인 화면(PATTERNS 35 개정, PRD v2 F2). 왼쪽 원본 이미지, 오른쪽 읽은 값과 근거. 조작은 확인, 수정, 제외 세 가지.
import { useState } from 'react'
import { GRADES } from '../../lib/shortage.js'
import { TAGS } from '../../lib/intake.js'
import Button from '../ui/Button.jsx'
import Card from '../ui/Card.jsx'
import MultiSelect from '../ui/MultiSelect.jsx'
import Select from '../ui/Select.jsx'
import EvidencePanel from './EvidencePanel.jsx'
import GradeChip from './GradeChip.jsx'

export const GRADE_OPTIONS = GRADES.map((g) => ({ value: g.key, label: g.label, secondary: g.target }))
export const TAG_OPTIONS = Object.entries(TAGS).map(([value, label]) => ({ value, label }))

export function DocImage({ src, alt, box }) {
  return (
    <div className="relative w-full overflow-hidden rounded-md bg-mute">
      <img src={src} alt={alt} className="block w-full h-auto" />
      {box && (
        <span
          aria-hidden="true"
          className="absolute rounded-xs ring-2 ring-primary bg-primary/10"
          style={{ left: `${box[0]}%`, top: `${box[1]}%`, width: `${box[2]}%`, height: `${box[3]}%` }}
        />
      )}
    </div>
  )
}

export default function ReviewRow({ doc, result, villageLabel, kindLabel, canEdit, onConfirm, onEdit, onReject }) {
  const [grade, setGrade] = useState(result.grade)
  const [tags, setTags] = useState(result.tags || [])
  const changed = grade !== result.grade || [...tags].sort().join() !== [...(result.tags || [])].sort().join()
  return (
    <Card as="div" padding="lg" aria-label={`서류 ${doc.name}, 대상자 ${result.personCode}`}>
      <div className="grid gap-6 lg:grid-cols-[minmax(0,560px)_minmax(0,1fr)]">
        <div className="min-w-0">
          <p className="mb-2 type-caption text-text-sec">원본 서류</p>
          <DocImage src={doc.image} alt={`${doc.name} 판독 영역`} box={result.box} />
          <p className="mt-2 type-meta text-text-meta tabular-nums">{doc.name}, {kindLabel}, {doc.id}</p>
        </div>

        <div className="min-w-0 space-y-4">
          <div className="flex flex-wrap items-center gap-2">
            <p className="type-h3 text-text-pri tabular-nums">{result.personCode}</p>
            <span className="type-body-sm text-text-meta">{villageLabel}</span>
            <span className="ml-auto inline-flex items-center gap-2">
              <span className="type-meta text-text-meta">읽은 등급</span>
              <GradeChip grade={result.grade} />
            </span>
          </div>
          <Select label="이송 등급" value={grade} options={GRADE_OPTIONS} onChange={setGrade} disabled={!canEdit} />
          <MultiSelect label="특이사항" values={tags} options={TAG_OPTIONS} onChange={setTags} disabled={!canEdit} />
          {changed && <p className="type-meta text-primary-text">읽은 값에서 변경했습니다. 수정을 누르면 변경한 값으로 확정합니다.</p>}
          <EvidencePanel quote={result.quote} matched={result.quoteMatched} confidence={result.confidence} conflict={result.conflict} transcript={doc.transcript} docName={doc.name} />
          {canEdit && (
            <div className="flex flex-wrap items-center justify-end gap-2 pt-1">
              <Button variant="ghost" size="lg" onClick={onReject}>제외</Button>
              <Button variant="secondary" size="lg" disabled={!changed} onClick={() => onEdit({ grade, tags })}>수정</Button>
              <Button variant="primary" size="lg" disabled={changed} onClick={onConfirm}>확인</Button>
            </div>
          )}
        </div>
      </div>
    </Card>
  )
}
