// 대상자 명부(IA 4.2). 이름 열 없음(원본 명부는 지자체 서버 보관 전제). ?person=코드 로 상세 드로어.
import { Suspense, lazy, useEffect, useMemo, useState } from 'react'
import { personCare } from '../../lib/tripChecks.js'
import { NOT_ENTERED } from '../../lib/aiCard.js'
import { MessageSquareText, ScanText, Trash2, UserRound, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import { firstAndMore } from '../../lib/rosterCompact.js'
import EditPencil from '../../components/edit/EditPencil.jsx'
import EntityForm, { validate } from '../../components/edit/EntityForm.jsx'
import InlineEditBar from '../../components/edit/InlineEditBar.jsx'
import EvidencePanel from '../../components/miri/EvidencePanel.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import { rosterBreakdown, rosterChipsText } from '../../lib/rosterCount.js'
import { DocImage, GRADE_OPTIONS, TAG_OPTIONS } from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Chip from '../../components/ui/Chip.jsx'
import KeyValue from '../../components/ui/KeyValue.jsx'
import Drawer from '../../components/ui/Drawer.jsx'
import Modal from '../../components/ui/Modal.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import { canConfirmPlan, checkerOf, lastPlanCheck, PLAN_CHECK_VIA, PLAN_CHECK_WITH, planWithLabel } from '../../lib/planCheck.js'
import ChoiceChips from '../../components/ui/ChoiceChips.jsx'
import FilterBar from '../../components/ui/FilterBar.jsx'
import MultiSelect from '../../components/ui/MultiSelect.jsx'
import Select from '../../components/ui/Select.jsx'
import useToast from '../../hooks/useToast.js'
import { TAGS, verifyResult } from '../../lib/intake.js'
import { GRADE_RANK } from '../../lib/shortage.js'
import { fmtDate } from '../../lib/time.js'
import { recheckMatch, RECHECK_OPTIONS } from '../../lib/rosterRecheck.js'
import { checkedOf } from '../../lib/handoverRows.js'
import useNow from '../../hooks/useNow.js'
import { fmtKDate } from '../../components/miri/BasisLine.jsx'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import SegmentControl from '../../components/ui/SegmentControl.jsx'
import RosterPrint from '../../components/miri/RosterPrint.jsx'
import { gradeOf } from '../../lib/shortage.js'
import { countText } from '../../lib/unitText.js'

// 지도는 무거워서 지도 보기를 고를 때만 받는다
const RosterMap = lazy(() => import('../../components/miri/RosterMap.jsx'))
const VIEWS = [{ value: 'list', label: '목록' }, { value: 'map', label: '지도' }, { value: 'print', label: '서식 출력' }]

const REVIEW_OPTIONS = [
  { value: 'all', label: '전체 등급 확인' }, { value: 'pending', label: '확인 대기' },
  { value: 'confirmed', label: '확인 완료' }, { value: 'edited', label: '담당자 수정' }, { value: 'rejected', label: '제외' }
]
const SOURCE_OPTIONS = [{ value: 'all', label: '전체 입력 방법' }, { value: 'ai', label: '서류 읽기' }, { value: 'note', label: '현장 소식 반영' }, { value: 'manual', label: '담당자 입력' }]

function SourceLabel({ source }) {
  if (source === 'ai') return <span className="inline-flex items-center gap-1 type-caption text-text-sec"><ScanText size={14} aria-hidden="true" />서류 읽기</span>
  if (source === 'note') return <span className="inline-flex items-center gap-1 type-caption text-text-sec"><MessageSquareText size={14} aria-hidden="true" />현장 소식 반영</span>
  return <span className="inline-flex items-center gap-1 type-caption text-text-sec"><UserRound size={14} aria-hidden="true" />담당자 입력</span>
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
  const confirmPlanCheck = useMiriStore((s) => s.confirmPlanCheck)
  const [planAsk, setPlanAsk] = useState(false)
  // 당사자와 누가 확인했는지(담당 공무원 직접, 통장, 반장). 1026 망상동 면담
  const [planWith, setPlanWith] = useState('officer')
  const [checkOnSave, setCheckOnSave] = useState(false)
  const user = useAuthStore((s) => s.user)
  const canEdit = useAuthStore((s) => s.canEdit('persons'))
  const toast = useToast()
  const [params, setParams] = useSearchParams()

  const [dong, setDong] = useState(user?.role === 'dong' ? user.dong : 'all')
  const [village, setVillage] = useState('all')
  const [grades, setGrades] = useState([])
  const [source, setSource] = useState('all')
  const [review, setReview] = useState(params.get('review') || 'all')
  // 현황판 '명부 재확인 필요'에서 오면 ?recheck=1 로 그 대상자만 거른다
  const [recheck, setRecheck] = useState(params.get('recheck') === '1' ? 'stale' : 'all')
  const now = useNow(60000)
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
    .filter((p) => recheckMatch(p, recheck, now))
    .sort((a, b) => a.code.localeCompare(b.code)),
  [persons, dong, village, grades, source, review, recheck, now]) // eslint-disable-line react-hooks/exhaustive-deps

  // 담당 범위(동)에서 당사자와 계획 재확인이 필요한 사람 수. 숫자 옆에 바로 거르는 단추를 둔다
  const staleCount = useMemo(() => persons
    .filter((p) => dong === 'all' || dongOf(p.villageCode) === dong)
    .filter((p) => recheckMatch(p, 'stale', now)).length,
  [persons, dong, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const fields = [
    { key: 'villageCode', label: '마을', kind: 'select', required: true, disabled: editing?.mode === 'edit', options: villages.filter((v) => dong === 'all' || v.dongCode === dong).map((v) => ({ value: v.code, label: v.label, secondary: v.code })) },
    { key: 'grade', label: '이송 등급', kind: 'select', required: true, options: GRADE_OPTIONS },
    { key: 'tags', label: '특이사항', kind: 'multiselect', options: TAG_OPTIONS },
    // 1026 복지관 면담: 편마비 쪽과 체격으로 앉을 자리를 정하고 지팡이는 따로 보관. 이름은 적지 않음
    { key: 'boardingNote', label: '탑승 메모', kind: 'text', placeholder: '예: 왼쪽 편마비, 운전석 뒤 왼쪽 자리, 지팡이는 도우미가 보관', hint: '수락한 도우미에게만 보입니다. 이름과 주소는 적지 않습니다.' }
  ]

  const openPerson = (code) => setParams((p) => { const n = new URLSearchParams(p); n.set('person', code); return n })
  const closePerson = () => { setEditing(null); setErrors({}); setParams((p) => { const n = new URLSearchParams(p); n.delete('person'); return n }) }
  const changeRecheck = (value) => {
    setRecheck(value)
    setParams((p) => {
      const n = new URLSearchParams(p)
      if (value === 'stale') n.set('recheck', '1')
      else n.delete('recheck')
      return n
    })
  }

  const save = () => {
    const errs = validate(fields, editing.value)
    setErrors(errs)
    if (Object.keys(errs).length) return
    const v = editing.value
    if (editing.mode === 'add') {
      const nums = persons.filter((p) => p.villageCode === v.villageCode).map((p) => Number(p.code.split('-').pop()) || 0)
      const code = `${v.villageCode}-${String(Math.max(0, ...nums) + 1).padStart(3, '0')}`
      addPerson({ code, villageCode: v.villageCode, grade: v.grade, tags: v.tags || [], docId: null, ...((v.boardingNote || '').trim() ? { boardingNote: v.boardingNote.trim() } : {}) })
      toast(`${code} 추가 완료`, 'primary')
      setEditing(null)
      openPerson(code)
    } else {
      const check = checkOnSave && canPlan ? { by: checkerOf(user), via: 'edit', with: planWith } : undefined
      updatePerson(open.code, { grade: v.grade, tags: v.tags || [], boardingNote: (v.boardingNote || '').trim(), gradeSource: v.grade !== open.grade ? 'manual' : open.gradeSource, review: open.review === 'pending' ? 'edited' : open.review }, check)
      toast(check ? `${open.code} 수정과 확인 완료 기록` : `${open.code} 수정 완료`, 'primary')
      setCheckOnSave(false)
      setEditing(null)
    }
  }

  const canPlan = canEdit && !!open && canConfirmPlan(user, open, dongOf)
  const planLast = lastPlanCheck(open)
  const confirmPlan = () => {
    confirmPlanCheck(open.code, { by: checkerOf(user), with: planWith })
    setPlanAsk(false)
    toast(`${open.code} 당사자와 계획 확인 완료 기록`, 'primary')
  }

  const doc = open?.docId ? docs.find((d) => d.id === open.docId) : null
  const docResult = doc?.results.find((r) => r.personCode === open.code)
  const evidence = docResult ? verifyResult(doc.transcript, docResult) : null

  const columns = [
    { key: 'code', label: '대상자 코드', sortable: true, render: (p) => <span className="type-strong tabular-nums">{p.code}</span> },
    { key: 'village', label: '마을', sortable: true, sortValue: (p) => p.villageCode, render: (p) => vlabel(p.villageCode) },
    { key: 'grade', label: '이송 등급', sortable: true, sortValue: (p) => GRADE_RANK[p.grade], render: (p) => <GradeChip grade={p.grade} /> },
    { key: 'ltcGrade', label: '장기요양 등급', hideBelow: 'lg', sortable: true, render: (p) => <span className="type-meta text-text-sec">{p.ltcGrade || '미기재'}</span> },
    { key: 'tags', label: '특이사항', hideBelow: 'lg', render: (p) => { const f = firstAndMore(p.tags.map((t) => TAGS[t])); return <span className="type-meta text-text-sec whitespace-nowrap" title={f.full || undefined}>{f.text}</span> } },
    { key: 'care', label: '동행과 소통', hideBelow: '3xl', render: (p) => { const c = personCare(p); const f = firstAndMore([c.companionCall && '동행 연락 필요', c.caregiverUnreachable && '돌봄 담당자 연락 불가', c.commCaution && `의사소통 유의(${c.comm.join(', ')})`]); return <span className="type-meta text-text-sec whitespace-nowrap" title={f.full || undefined}>{!c.known ? NOT_ENTERED : f.text}</span> } },
    { key: 'source', label: '입력 방법', hideBelow: '2xl', render: (p) => <SourceLabel source={p.gradeSource} /> },
    { key: 'review', label: '등급 확인', sortable: true, render: (p) => <StatusPill status={p.review} /> },
    { key: 'planCheckedAt', label: '마지막 확인', title: '90일이 지나면 빨간 글자로 표시, 다시 확인합니다', sortable: true, sortValue: (p) => p.planCheckedAt || 0, render: (p) => { const c = checkedOf(p, now); return <span className={`whitespace-nowrap ${c.stale ? 'type-strong text-danger-text' : 'text-text-sec'}`}>{c.text}</span> } },
    { key: 'updatedAt', label: '갱신일', sortable: true, hideBelow: '3xl', render: (p) => fmtDate(p.updatedAt) },
    { key: 'edit', label: '편집', render: (p) => <EditPencil resource="persons" label={`${p.code} 수정`} onClick={() => { openPerson(p.code); setEditing({ mode: 'edit', value: { villageCode: p.villageCode, grade: p.grade, tags: p.tags, boardingNote: p.boardingNote || '' } }) }} /> }
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
            <Select compact label="등급 확인" value={review} onChange={setReview} options={REVIEW_OPTIONS} />
            <Select compact label="마지막 확인" value={recheck} onChange={changeRecheck} options={RECHECK_OPTIONS} />
            {recheck === 'stale' ? (
              <Chip variant="selected" onClick={() => changeRecheck('all')} aria-label="재확인 필요 필터 해제">
                재확인 필요 {staleCount.toLocaleString('ko-KR')}명<X size={16} aria-hidden="true" />
              </Chip>
            ) : staleCount > 0 && (
              <Chip onClick={() => changeRecheck('stale')} aria-label={`재확인 필요 ${staleCount}명만 보기`}>
                재확인 필요 {staleCount.toLocaleString('ko-KR')}명
              </Chip>
            )}
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
          걸러진 명부 <strong className="type-strong text-text-pri tabular-nums">{countText(rows.length, '건')}</strong>, 마을 {byVillage.length}곳
          {grades.length > 0 && `, 등급 ${grades.map((g) => gradeOf(g)?.label).join(', ')}`}
        </p>
      </div>
      {view === 'list' ? (
      <TableCard
        title="대상자" count={countText(rows.length, '건')}
        actions={<InlineEditBar resource="persons" addLabel="대상자 추가" onAdd={() => { setErrors({}); setEditing({ mode: 'add', value: { villageCode: village !== 'all' ? village : villageOptions[1]?.value, grade: 'assist', tags: [] } }) }} />}
        filters={filterBar}
        columns={columns} rows={rows} rowKey={(p) => p.code} onRowClick={(p) => { setEditing(null); openPerson(p.code) }} emptyTitle="조건에 맞는 대상자가 없습니다" emptyDesc="필터 조건을 바꿔 다시 확인해 주십시오." caption="대상자 명부"
      />
      ) : (
        <TableCard
          title={view === 'map' ? '마을별 분포' : '서식 출력'} count={countText(rows.length, '건')}
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
      <p className="mt-2 type-meta text-text-meta tabular-nums">{rosterChipsText(rosterBreakdown(persons))}. {fmtKDate(today)} 기준, 동해시 명부</p>

      <Drawer
        open={!!open || editing?.mode === 'add'}
        onClose={closePerson}
        title={editing?.mode === 'add' ? '대상자 추가' : open?.code}
        footer={editing ? (
          <>
            <Button variant="ghost" onClick={() => { setEditing(null); setErrors({}); setCheckOnSave(false) }}>취소</Button>
            <Button variant="primary" onClick={save}>저장</Button>
          </>
        ) : canEdit && open ? (
          <>
            <Button variant="ghost" leftIcon={<Trash2 size={16} aria-hidden="true" />} onClick={() => { removePerson(open.code); toast(`${open.code} 삭제 완료`); closePerson() }}>삭제</Button>
            {canPlan && <Button variant="secondary" onClick={() => setPlanAsk(true)}>확인 완료</Button>}
            <Button variant="primary" onClick={() => setEditing({ mode: 'edit', value: { villageCode: open.villageCode, grade: open.grade, tags: open.tags, boardingNote: open.boardingNote || '' } })}>수정</Button>
          </>
        ) : null}
      >
        {editing ? (
          <div className="space-y-4">
            <EntityForm fields={fields} value={editing.value} errors={errors} onChange={(value) => setEditing({ ...editing, value })} />
            {editing.mode === 'edit' && canPlan && (
              <>
                <Checkbox checked={checkOnSave} onChange={setCheckOnSave} label="당사자와 계획 확인 완료로 함께 기록(마지막 확인 날짜를 오늘로)" />
                {checkOnSave && <ChoiceChips label="당사자와 확인한 사람" size="sm" value={planWith} onChange={setPlanWith} options={Object.entries(PLAN_CHECK_WITH).map(([value, label]) => ({ value, label }))} />}
              </>
            )}
          </div>
        ) : open && (
          <div className="space-y-5">
            <div className="grid gap-x-8 gap-y-5 sm:grid-cols-2">
            <KeyValue items={[
              { label: '당사자와 계획 확인', value: open.planCheckedAt ? `${checkedOf(open, now).stale ? '재확인 필요, ' : ''}마지막 확인 ${fmtDate(open.planCheckedAt)}${planLast?.by?.name ? ` (${planLast.by.name}${planWithLabel(planLast) ? `, ${planWithLabel(planLast)} 확인` : ''})` : ''}` : '재확인 필요', strong: true },
              { label: '이송 등급', value: <GradeChip grade={open.grade} /> },
              { label: '등급 확인', value: <StatusPill status={open.review} /> },
              { label: '마을', value: vlabel(open.villageCode) },
              { label: '특이사항', value: open.tags.map((t) => TAGS[t]).join(', ') || '없음' },
              { label: '도우미에게 주소 알림', value: open.locConsent === true ? '동의' : '미동의' },
              { label: '입력 방법', value: <SourceLabel source={open.gradeSource} /> },
              { label: '근거 서류', value: open.docId || '없음' },
              { label: '갱신일', value: fmtDate(open.updatedAt) }
            ]} />
            <KeyValue items={[
              ...(open.access ? [
                { label: '거주 층수', value: open.access.floor },
                { label: '계단과 엘리베이터', value: open.access.stairs },
                { label: '차량 접근 위치', value: open.access.vehicle },
                { label: '소통 방식', value: open.access.comm }
              ] : []),
              ...(() => { const c = personCare(open); return [
                { label: '평소 돌봄 담당자', value: !c.known ? NOT_ENTERED : c.caregiverType },
                { label: '돌봄 담당자 연락', value: !c.known ? NOT_ENTERED : c.reachableLabel },
                { label: '의사소통 특성', value: !c.known ? NOT_ENTERED : c.comm.length ? c.comm.join(', ') : '없음' },
                { label: '보조기구', value: !c.known ? NOT_ENTERED : c.aids.length ? c.aids.join(', ') : '없음' },
                { label: '탑승 메모', value: c.boardingNote || '없음' }
              ] })()
            ]} />
            </div>
            {evidence && (
              <div className="space-y-3">
                <h3 className="type-h3 text-text-pri">서류 근거</h3>
                <DocImage src={doc.image} alt={`${doc.name} 판독 영역`} box={evidence.box} />
                <EvidencePanel quote={evidence.quote} matched={evidence.quoteMatched} confidence={evidence.confidence} conflict={evidence.conflict} transcript={doc.transcript} docName={doc.name} source={doc.source} />
              </div>
            )}
          </div>
        )}
      </Drawer>

      <Modal
        open={planAsk && !!open}
        onClose={() => setPlanAsk(false)}
        title="당사자와 계획 확인 완료"
        footer={(
          <>
            <Button variant="ghost" onClick={() => setPlanAsk(false)}>취소</Button>
            <Button variant="primary" onClick={confirmPlan}>확인 완료 기록</Button>
          </>
        )}
      >
        {open && (
          <p className="type-body text-text-sec">
            {open.code}의 거주, 거동 상태, 이송 계획을 당사자나 보호자와 확인했으면 기록합니다. 마지막 확인 날짜가 오늘로 바뀌고, 확인한 사람과 시각이 남습니다.
          </p>
        )}
        {open && (
          <div className="mt-4 space-y-2">
            <p className="type-strong text-text-pri">당사자와 확인한 사람</p>
            <ChoiceChips label="당사자와 확인한 사람" value={planWith} onChange={setPlanWith} options={Object.entries(PLAN_CHECK_WITH).map(([value, label]) => ({ value, label }))} />
          </div>
        )}
      </Modal>
    </PageShell>
  )
}
