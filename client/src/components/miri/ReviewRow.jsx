// 판독 확인 행(PATTERNS 35). [문서 이미지 + 판독 영역 | 판정 편집 | 근거]. 근거 열은 항상 예약.
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

export default function ReviewRow({ doc, result, villageLabel, canEdit, onConfirm, onEdit, onReject }) {
  const [grade, setGrade] = useState(result.grade)
  const [tags, setTags] = useState(result.tags || [])
  const changed = grade !== result.grade || [...tags].sort().join() !== [...(result.tags || [])].sort().join()
  return (
    <Card as="li">
      <div className="flex flex-wrap items-center gap-2 mb-3">
        <p className="type-h3 text-text-pri tabular-nums">{result.personCode}</p>
        <span className="type-meta text-text-meta">{villageLabel}</span>
        <span className="ml-auto"><GradeChip grade={result.grade} /></span>
      </div>
      <div className="grid gap-4 lg:grid-cols-[minmax(0,220px)_minmax(0,1fr)_minmax(0,320px)]">
        <DocImage src={doc.image} alt={`${doc.name} 판독 영역`} box={result.box} />
        <div className="space-y-3 min-w-0">
          <Select label="이송 등급" value={grade} options={GRADE_OPTIONS} onChange={setGrade} disabled={!canEdit} />
          <MultiSelect label="특이사항" values={tags} options={TAG_OPTIONS} onChange={setTags} disabled={!canEdit} />
          {changed && <p className="type-meta text-primary-text">읽은 값에서 바꿨습니다. 저장하면 확정됩니다</p>}
        </div>
        <EvidencePanel quote={result.quote} matched={result.quoteMatched} confidence={result.confidence} conflict={result.conflict} transcript={doc.transcript} docName={doc.name} />
      </div>
      {canEdit && (
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" onClick={onReject}>반려</Button>
          <Button variant="secondary" disabled={!changed} onClick={() => onEdit({ grade, tags })}>수정 후 확인</Button>
          <Button variant="primary" disabled={changed} onClick={onConfirm}>판독 확인</Button>
        </div>
      )}
    </Card>
  )
}
