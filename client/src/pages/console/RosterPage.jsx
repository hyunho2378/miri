// 대상자 명부(IA 4.2). 이름 열 없음(원본 명부는 지자체 서버 보관 전제). ?person=코드 로 상세 드로어.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { ScanText, Trash2, UserRound } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import EditPencil from '../../components/edit/EditPencil.jsx'
import EntityForm, { validate } from '../../components/edit/EntityForm.jsx'
import InlineEditBar from '../../components/edit/InlineEditBar.jsx'
import EvidencePanel from '../../components/miri/EvidencePanel.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import { DocImage, GRADE_OPTIONS, TAG_OPTIONS } from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import FilterBar from '../../components/ui/FilterBar.jsx'
import MultiSelect from '../../components/ui/MultiSelect.jsx'
import Select from '../../components/ui/Select.jsx'
import useToast from '../../hooks/useToast.js'
import { TAGS, verifyResult } from '../../lib/intake.js'
import { GRADE_RANK } from '../../lib/shortage.js'
import { fmtDate } from '../../lib/time.js'
import { fmtKDate } from '../../components/miri/BasisLine.jsx'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import RosterPrint from '../../components/miri/RosterPrint.jsx'
import { gradeOf } from '../../lib/shortage.js'

// 지도는 무거워서 지도 보기를 고를 때만 받는다
const RosterMap = lazy(() => import('../../components/miri/RosterMap.jsx'))
const VIEWS = [{ value: 'list', label: '목록' }, { value: 'map', label: '지도' }, { value: 'print', label: '서식 출력' }]

const REVIEW_OPTIONS = [
  { value: 'all', label: '전체 확인 상태' }, { value: 'pending', label: '확인 대기' },
  { value: 'confirmed', label: '확인 완료' }, { value: 'edited', label: '담당자 수정' }, { value: 'rejected', label: '제외' }
]
const SOURCE_OPTIONS = [{ value: 'all', label: '전체 입력 방법' }, { value: 'ai', label: '서류 자동 판독' }, { value: 'manual', label: '담당자 입력' }]

function SourceLabel({ source }) {
  return source === 'ai'
    ? <span className="inline-flex items-center gap-1 type-caption text-primary-text"><ScanText size={14} aria-hidden="true" />서류 자동 판독</span>
    : <span className="inline-flex items-center gap-1 type-caption text-text-sec"><UserRound size={14} aria-hidden="true" />담당자 입력</span>
}

export default function RosterPage() {
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  const docs = useMiriStore((s) => s.intakeDocs)
  const today = useMiriStore((s) => s.today)
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
  const [moreFilters, setMoreFilters] = useState(false)
  const [view, setView] = useState('list')
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
    { key: 'code', label: '대상자 코드', sortable: true, render: (p) => <span className="type-strong tabular-nums">{p.code}</span> },
    { key: 'village', label: '마을', sortable: true, sortValue: (p) => p.villageCode, render: (p) => vlabel(p.villageCode) },
    { key: 'grade', label: '이송 등급', sortable: true, sortValue: (p) => GRADE_RANK[p.grade], render: (p) => <GradeChip grade={p.grade} /> },
    { key: 'ltcGrade', label: '장기요양 등급', hideBelow: 'lg', sortable: true, render: (p) => <span className="type-meta text-text-sec">{p.ltcGrade || '미기재'}</span> },
    { key: 'tags', label: '특이사항', hideBelow: 'lg', render: (p) => <span className="type-meta text-text-sec">{p.tags.map((t) => TAGS[t]).join(', ') || '없음'}</span> },
    { key: 'source', label: '입력 방법', hideBelow: 'md', render: (p) => <SourceLabel source={p.gradeSource} /> },
    { key: 'review', label: '확인 상태', sortable: true, render: (p) => <StatusPill status={p.review} /> },
    { key: 'updatedAt', label: '갱신일', sortable: true, hideBelow: 'lg', render: (p) => fmtDate(p.updatedAt) },
    { key: 'edit', label: '편집', render: (p) => <EditPencil resource="persons" label={`${p.code} 수정`} onClick={() => { openPerson(p.code); setEditing({ mode: 'edit', value: { villageCode: p.villageCode, grade: p.grade, tags: p.tags } }) }} /> }
  ].filter((c) => c.key !== 'edit' || canEdit)

  const hiddenActive = source !== 'all' ? 1 : 0
  // 지도와 서식 출력은 목록과 같은 필터 결과를 마을 단위로 묶어 쓴다
  const byVillage = useMemo(() => {
    const m = {}
    for (const p of rows) (m[p.villageCode] ||= []).push(p)
    return villages.filter((v) => m[v.code]).map((v) => ({ code: v.code, name: v.label, lngLat: v.lngLat, count: m[v.code].length, village: v, persons: m[v.code] }))
  }, [rows, villages])
  const dongOptions = [{ value: 'all', label: '전체 동' }, ...dongs.filter((d) => villages.some((v) => v.dongCode === d.code)).map((d) => ({ value: d.code, label: d.name }))]
  const villageOptions = [{ value: 'all', label: '전체 마을' }, ...villages.filter((v) => dong === 'all' || v.dongCode === dong).map((v) => ({ value: v.code, label: v.label }))]

  const filterBar = (
          <FilterBar>
            <Select compact label="동" value={dong} onChange={setDong} options={dongOptions} disabled={user?.role === 'dong'} />
            <Select compact label="마을" value={village} onChange={setVillage} options={villageOptions} />
            <MultiSelect compact label="이송 등급" values={grades} onChange={setGrades} options={GRADE_OPTIONS} placeholder="전체" />
            <Select compact label="확인 상태" value={review} onChange={setReview} options={REVIEW_OPTIONS} />
            {moreFilters && (
              <Select compact label="입력 방법" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
            )}
            <Button variant="ghost" size="sm" aria-expanded={moreFilters} onClick={() => setMoreFilters((v) => !v)}>
              {moreFilters ? '필터 접기' : `필터 더보기${hiddenActive ? ` (적용 ${hiddenActive})` : ''}`}
            </Button>
          </FilterBar>
  )

  return (
    <PageShell
      title="대상자 명부"
    >
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3">
        <SegmentControl label="보기" value={view} onChange={setView} items={VIEWS} />
        <p className="type-body-sm text-text-sec">
          걸러진 대상자 <strong className="type-strong text-text-pri tabular-nums">{rows.length}명</strong>, 마을 {byVillage.length}곳
          {grades.length > 0 && `, 등급 ${grades.map((g) => gradeOf(g)?.label).join(', ')}`}
        </p>
      </div>
      {view === 'list' ? (
      <TableCard
        title="대상자" count={`${rows.length}명`} desc={`명부 ${fmtKDate(today)} 기준. 이름 없이 대상자 코드로 표시합니다.`}
        actions={<InlineEditBar resource="persons" addLabel="대상자 추가" onAdd={() => { setErrors({}); setEditing({ mode: 'add', value: { villageCode: village !== 'all' ? village : villageOptions[1]?.value, grade: 'assist', tags: [] } }) }} />}
        filters={filterBar}
        columns={columns} rows={rows} rowKey={(p) => p.code} onRowClick={(p) => { setEditing(null); openPerson(p.code) }} emptyTitle="조건에 맞는 대상자가 없습니다" emptyDesc="필터 조건을 바꿔 다시 확인해 주십시오." caption="대상자 명부"
      />
      ) : (
        <TableCard
          title={view === 'map' ? '마을별 분포' : '서식 출력'} count={`${rows.length}명`}
          desc={view === 'map' ? '목록과 같은 필터를 씁니다. 원을 누르면 그 마을로 목록이 좁혀집니다.' : '마을별 명부를 인쇄합니다. 이름과 연락처는 지자체 서버 원본에서 채워 씁니다.'}
        filters={filterBar}
        >
          {view === 'map' ? (
            <Suspense fallback={<div className="h-[60vh] min-h-96 animate-pulse rounded-lg bg-mute" />}>
              <RosterMap items={byVillage} selected={village} onPick={(c) => { setVillage(c); setView('list') }} />
            </Suspense>
          ) : (
            <RosterPrint groups={byVillage} dongs={dongs} today={today} />
          )}
        </TableCard>
      )}

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
            <KeyValue items={[
              { label: '마을', value: vlabel(open.villageCode), strong: true },
              { label: '이송 등급', value: <GradeChip grade={open.grade} /> },
              { label: '특이사항', value: open.tags.map((t) => TAGS[t]).join(', ') || '없음' },
              { label: '입력 방법', value: <SourceLabel source={open.gradeSource} /> },
              { label: '확인 상태', value: <StatusPill status={open.review} /> },
              { label: '근거 서류', value: open.docId || '없음' },
              { label: '갱신일', value: fmtDate(open.updatedAt) }
            ]} />
            {evidence ? (
              <div className="space-y-3">
                <h3 className="type-h3 text-text-pri">판독 근거</h3>
                <DocImage src={doc.image} alt={`${doc.name} 판독 영역`} box={evidence.box} />
                <EvidencePanel quote={evidence.quote} matched={evidence.quoteMatched} confidence={evidence.confidence} conflict={evidence.conflict} transcript={doc.transcript} docName={doc.name} />
              </div>
            ) : (
              <p className="rounded-md bg-subtle p-4 type-meta text-text-meta">
                {open.gradeSource === 'ai' ? '판독 근거는 서류 읽기 화면에서 올린 서류에 대해서만 표시합니다.' : '담당자가 직접 입력한 건이므로 판독 근거가 없습니다.'}
              </p>
            )}
          </div>
        )}
      </Drawer>
    </PageShell>
  )
}
