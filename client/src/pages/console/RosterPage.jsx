// 대상자 명부(IA 4.2). 이름 열 없음(원본 명부는 지자체 서버 보관 전제). ?person=코드 로 상세 드로어.
import { useEffect, useMemo, useState } from 'react'
import { ScanText, Trash2, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
import EditPencil from '../../components/edit/EditPencil.jsx'
import EntityForm, { validate } from '../../components/edit/EntityForm.jsx'
import InlineEditBar from '../../components/edit/InlineEditBar.jsx'
import EvidencePanel from '../../components/miri/EvidencePanel.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import { DocImage, GRADE_OPTIONS, TAG_OPTIONS } from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import MultiSelect from '../../components/ui/MultiSelect.jsx'
import Select from '../../components/ui/Select.jsx'
import useToast from '../../hooks/useToast.js'
import { TAGS, verifyResult } from '../../lib/intake.js'
import { GRADE_RANK } from '../../lib/shortage.js'
import { fmtDate } from '../../lib/time.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const REVIEW_OPTIONS = [
  { value: 'all', label: '전체 확인 상태' }, { value: 'pending', label: '확인 대기' },
  { value: 'confirmed', label: '확인 완료' }, { value: 'edited', label: '담당자 수정' }, { value: 'rejected', label: '반려' }
]
const SOURCE_OPTIONS = [{ value: 'all', label: '전체 판정 출처' }, { value: 'ai', label: 'AI 판정' }, { value: 'manual', label: '담당자 입력' }]

function SourceLabel({ source }) {
  return source === 'ai'
    ? <span className="inline-flex items-center gap-1 type-caption text-primary-text"><ScanText size={14} aria-hidden="true" />AI 판정</span>
    : <span className="inline-flex items-center gap-1 type-caption text-text-sec"><UserRound size={14} aria-hidden="true" />담당자 입력</span>
}

export default function RosterPage() {
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  const docs = useMiriStore((s) => s.intakeDocs)
  const updatePerson = useMiriStore((s) => s.updatePerson)
  const addPerson = useMiriStore((s) => s.addPerson)
  const removePerson = useMiriStore((s) => s.removePerson)
  const user = useAuthStore((s) => s.user)
  const canEdit = useAuthStore((s) => s.canEdit('persons'))
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [dong, setDong] = useState(user?.role === 'dong' ? user.dong : 'all')
  const [village, setVillage] = useState('all')
  const [grades, setGrades] = useState([])
  const [source, setSource] = useState('all')
  const [review, setReview] = useState(params.get('review') || 'all')
  const [editing, setEditing] = useState(null)   // { mode: 'edit'|'add', value }
  const [errors, setErrors] = useState({})

  const openCode = params.get('person')
  const open = openCode ? persons.find((p) => p.code === openCode) : null
  const vlabel = (c) => villages.find((v) => v.code === c)?.label || c
  const dongOf = (c) => villages.find((v) => v.code === c)?.dongCode

  useEffect(() => { setVillage('all') }, [dong])

  const rows = useMemo(() => persons
    .filter((p) => dong === 'all' || dongOf(p.villageCode) === dong)
    .filter((p) => village === 'all' || p.villageCode === village)
    .filter((p) => !grades.length || grades.includes(p.grade))
    .filter((p) => source === 'all' || p.gradeSource === source)
    .filter((p) => review === 'all' || p.review === review)
    .sort((a, b) => a.code.localeCompare(b.code)),
  [persons, dong, village, grades, source, review]) // eslint-disable-line react-hooks/exhaustive-deps

  const fields = [
    { key: 'villageCode', label: '마을', kind: 'select', required: true, disabled: editing?.mode === 'edit', options: villages.filter((v) => dong === 'all' || v.dongCode === dong).map((v) => ({ value: v.code, label: v.label, secondary: v.code })) },
    { key: 'grade', label: '이송 등급', kind: 'select', required: true, options: GRADE_OPTIONS },
    { key: 'tags', label: '특이사항', kind: 'multiselect', options: TAG_OPTIONS }
  ]

  const openPerson = (code) => setParams((p) => { const n = new URLSearchParams(p); n.set('person', code); return n })
  const closePerson = () => { setEditing(null); setErrors({}); setParams((p) => { const n = new URLSearchParams(p); n.delete('person'); return n }) }

  const save = () => {
    const errs = validate(fields, editing.value)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const v = editing.value
    if (editing.mode === 'add') {
      const nums = persons.filter((p) => p.villageCode === v.villageCode).map((p) => Number(p.code.split('-').pop()) || 0)
      const code = `${v.villageCode}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
      addPerson({ code, villageCode: v.villageCode, grade: v.grade, tags: v.tags || [], docId: null })
      toast(`${code} 추가 완료`, 'primary')
      setEditing(null)
      openPerson(code)
    } else {
      updatePerson(open.code, { grade: v.grade, tags: v.tags || [], gradeSource: v.grade !== open.grade ? 'manual' : open.gradeSource, review: open.review === 'pending' ? 'edited' : open.review })
      toast(`${open.code} 수정 완료`, 'primary')
      setEditing(null)
    }
  }

  const doc = open?.docId ? docs.find((d) => d.id === open.docId) : null
  const docResult = doc?.results.find((r) => r.personCode === open.code)
  const evidence = docResult ? verifyResult(doc.transcript, docResult) : null

  const columns = [
    { key: 'code', label: '대상자 코드', sortable: true, render: (p) => <span className="font-medium tabular-nums">{p.code}</span> },
    { key: 'village', label: '마을', sortable: true, sortValue: (p) => p.villageCode, render: (p) => vlabel(p.villageCode) },
    { key: 'grade', label: '등급', sortable: true, sortValue: (p) => GRADE_RANK[p.grade], render: (p) => <GradeChip grade={p.grade} /> },
    { key: 'tags', label: '특이사항', hideBelow: 'lg', render: (p) => <span className="type-meta text-text-sec">{p.tags.map((t) => TAGS[t]).join(', ') || '없음'}</span> },
    { key: 'source', label: '판정 출처', hideBelow: 'md', render: (p) => <SourceLabel source={p.gradeSource} /> },
    { key: 'review', label: '확인 상태', sortable: true, render: (p) => <StatusPill status={p.review} /> },
    { key: 'updatedAt', label: '갱신일', sortable: true, hideBelow: 'lg', render: (p) => fmtDate(p.updatedAt) },
    { key: 'edit', label: '편집', render: (p) => <EditPencil resource="persons" label={`${p.code} 수정`} onClick={() => { openPerson(p.code); setEditing({ mode: 'edit', value: { villageCode: p.villageCode, grade: p.grade, tags: p.tags } }) }} /> }
  ].filter((c) => c.key !== 'edit' || canEdit)

  const dongOptions = [{ value: 'all', label: '전체 동' }, ...dongs.filter((d) => villages.some((v) => v.dongCode === d.code)).map((d) => ({ value: d.code, label: d.name }))]
  const villageOptions = [{ value: 'all', label: '전체 마을' }, ...villages.filter((v) => dong === 'all' || v.dongCode === dong).map((v) => ({ value: v.code, label: v.label }))]

  return (
    <PageShell
      title="대상자 명부"
      intro="이송 대상자 목록. 이름과 주소는 지자체 서버 보관 전제로 화면과 클라우드에 없음. 대상자 코드와 마을과 이송 등급만 표시"
    >
      <div className="mb-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-5">
        <Select label="동" value={dong} onChange={setDong} options={dongOptions} disabled={user?.role === 'dong'} />
        <Select label="마을" value={village} onChange={setVillage} options={villageOptions} />
        <MultiSelect label="등급" values={grades} onChange={setGrades} options={GRADE_OPTIONS} placeholder="전체 등급" />
        <Select label="판정 출처" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
        <Select label="확인 상태" value={review} onChange={setReview} options={REVIEW_OPTIONS} />
      </div>
      <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
        <p className="type-body-sm text-text-sec tabular-nums">{rows.length}명</p>
        <InlineEditBar resource="persons" addLabel="대상자 추가" onAdd={() => { setErrors({}); setEditing({ mode: 'add', value: { villageCode: village !== 'all' ? village : villageOptions[1]?.value, grade: 'assist', tags: [] } }) }} />
      </div>
      <DataTable columns={columns} rows={rows} rowKey={(p) => p.code} onRowClick={(p) => { setEditing(null); openPerson(p.code) }} emptyTitle="조건에 맞는 대상자 없음" emptyDesc="필터 조정 필요" caption="대상자 명부" />

      <Drawer
        open={!!open || editing?.mode === 'add'}
        onClose={closePerson}
        title={editing?.mode === 'add' ? '대상자 추가' : open?.code}
        footer={editing ? (
          <>
            <Button variant="ghost" onClick={() => { setEditing(null); setErrors({}) }}>취소</Button>
            <Button variant="primary" onClick={save}>저장</Button>
          </>
        ) : canEdit && open ? (
          <>
            <Button variant="ghost" leftIcon={<Trash2 size={16} aria-hidden="true" />} onClick={() => { removePerson(open.code); toast(`${open.code} 삭제 완료`); closePerson() }}>삭제</Button>
            <Button variant="primary" onClick={() => setEditing({ mode: 'edit', value: { villageCode: open.villageCode, grade: open.grade, tags: open.tags } })}>수정</Button>
          </>
        ) : null}
      >
        {editing ? (
          <EntityForm fields={fields} value={editing.value} errors={errors} onChange={(value) => setEditing({ ...editing, value })} />
        ) : open && (
          <div className="space-y-5">
            <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-2">
              <dt className="type-caption text-text-meta">마을</dt><dd className="type-body-sm text-text-pri">{vlabel(open.villageCode)}</dd>
              <dt className="type-caption text-text-meta">이송 등급</dt><dd><GradeChip grade={open.grade} /></dd>
              <dt className="type-caption text-text-meta">특이사항</dt><dd className="type-body-sm text-text-pri">{open.tags.map((t) => TAGS[t]).join(', ') || '없음'}</dd>
              <dt className="type-caption text-text-meta">판정 출처</dt><dd><SourceLabel source={open.gradeSource} /></dd>
              <dt className="type-caption text-text-meta">확인 상태</dt><dd><StatusPill status={open.review} /></dd>
              <dt className="type-caption text-text-meta">근거 서류</dt><dd className="type-body-sm text-text-pri tabular-nums">{open.docId || '없음'}</dd>
              <dt className="type-caption text-text-meta">갱신일</dt><dd className="type-body-sm text-text-pri tabular-nums">{fmtDate(open.updatedAt)}</dd>
            </dl>
            {evidence ? (
              <div className="space-y-3">
                <h3 className="type-h3 text-text-pri">판독 근거</h3>
                <DocImage src={doc.image} alt={`${doc.name} 판독 영역`} box={evidence.box} />
                <EvidencePanel quote={evidence.quote} matched={evidence.quoteMatched} confidence={evidence.confidence} conflict={evidence.conflict} transcript={doc.transcript} docName={doc.name} />
              </div>
            ) : (
              <p className="rounded-md bg-subtle p-4 type-meta text-text-meta">
                {open.gradeSource === 'ai' ? '판독 서류 원본은 지자체 서버 보관. 시제품에서는 서류 판독 화면에서 올린 서류만 근거 표시' : '담당자 직접 입력 건. 판독 근거 없음'}
              </p>
            )}
          </div>
        )}
      </Drawer>
    </PageShell>
  )
}
