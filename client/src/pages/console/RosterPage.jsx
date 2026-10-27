// 대상자 명부(IA 4.2). 이름 열 없음(원본 명부는 지자체 서버 보관 전제). ?person=코드 로 상세 드로어.
import { Suspense, lazy, useEffect, useMemo, useRef, useState } from 'react'
import { personCare } from '../../lib/tripChecks.js'
import { NOT_ENTERED } from '../../lib/aiCard.js'
import { MessageSquareText, Plus, ScanText, Trash2, UserRound, X } from 'lucide-react'
import { useSearchParams } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import DataList from '../../components/console/DataList.jsx'
import InfoRows from '../../components/console/InfoRows.jsx'
import PageHeader from '../../components/console/PageHeader.jsx'
import Section from '../../components/console/Section.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import { firstAndMore } from '../../lib/rosterCompact.js'
import EntityForm, { validate } from '../../components/edit/EntityForm.jsx'
import EvidencePanel from '../../components/miri/EvidencePanel.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import { rosterBreakdown, rosterChipsText } from '../../lib/rosterCount.js'
import { DocImage, GRADE_OPTIONS, TAG_OPTIONS } from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Chip from '../../components/ui/Chip.jsx'
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
import { fmtDate, fmtDateTime } from '../../lib/time.js'
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
  { value: 'all', label: '전체' }, { value: 'pending', label: '확인 대기' },
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
  const [village, setVillage] = useState(params.get('village') || 'all')
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
  const vlabel = (c) => villages.find((v) => v.code === c)?.label || c
  const dongOf = (c) => villages.find((v) => v.code === c)?.dongCode

  const prevDong = useRef(dong)
  useEffect(() => { if (prevDong.current !== dong) { prevDong.current = dong; setVillage('all') } }, [dong])

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

  // 선택한 대상자: 주소의 ?person= 값, 없으면 목록 첫 행
  const open = (openCode ? persons.find((p) => p.code === openCode) : null) || rows[0] || null

  const fields = [
    { key: 'villageCode', label: '마을', kind: 'select', required: true, disabled: editing?.mode === 'edit', options: villages.filter((v) => dong === 'all' || v.dongCode === dong).map((v) => ({ value: v.code, label: v.label, secondary: v.code })) },
    { key: 'grade', label: '이송 등급', kind: 'select', required: true, options: GRADE_OPTIONS },
    { key: 'tags', label: '특이사항', kind: 'multiselect', options: TAG_OPTIONS },
    // 1026 복지관 면담: 편마비 쪽과 체격으로 앉을 자리를 정하고 지팡이는 따로 보관. 이름은 적지 않음
    { key: 'boardingNote', label: '탑승 메모', kind: 'text', placeholder: '예: 왼쪽 편마비, 운전석 뒤 왼쪽 자리, 지팡이는 도우미가 보관', hint: '수락한 도우미에게만 표시, 이름과 주소 입력 금지' }
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

  // 목록 열은 필수 다섯 개만. 장기요양 등급, 특이사항, 입력 방법, 동행과 소통, 갱신일은 오른쪽 상세
  const columns = [
    { key: 'code', label: '대상자 코드', sortable: true, render: (p) => <span className="type-strong tabular-nums">{p.code}</span> },
    { key: 'village', label: '마을', sortable: true, sortValue: (p) => p.villageCode, render: (p) => vlabel(p.villageCode) },
    { key: 'grade', label: '이송 등급', sortable: true, sortValue: (p) => GRADE_RANK[p.grade], render: (p) => <GradeChip grade={p.grade} size="sm" /> },
    { key: 'review', label: '등급 확인', sortable: true, render: (p) => <StatusPill status={p.review === 'confirmed' && !p.planCheckedAt ? 'pending' : p.review} size="sm" /> },
    { key: 'planCheckedAt', label: '마지막 확인', title: '90일 경과 또는 기록 없음은 재확인 대상, 빨간 글자로 표시', sortable: true, sortValue: (p) => p.planCheckedAt || 0, render: (p) => { const c = checkedOf(p, now); return <span className={`whitespace-nowrap ${c.stale ? 'type-strong text-danger-text' : 'text-text-sec'}`}>{c.text}</span> } }
  ]
  const listGrid = 'minmax(6.5rem,1.1fr) minmax(4.5rem,0.9fr) minmax(5.5rem,1fr) minmax(5.5rem,1fr) minmax(5rem,0.9fr)'

  const hiddenActive = [source !== 'all', dong !== 'all', review !== 'all'].filter(Boolean).length
  // 지도와 서식 출력은 목록과 같은 필터 결과를 마을 단위로 묶어 쓴다
  const byVillage = useMemo(() => {
    const m = {}
    for (const p of rows) (m[p.villageCode] ||= []).push(p)
    return villages.filter((v) => m[v.code]).map((v) => ({ code: v.code, name: v.label, lngLat: v.lngLat, count: m[v.code].length, village: v, persons: m[v.code] }))
  }, [rows, villages])
  // 조건 이름이 이미 왼쪽에 있으므로 값은 '전체'만 써서 조건 줄을 한 줄로 둔다
  const recheckOptions = RECHECK_OPTIONS.map((o) => ({ ...o, label: o.value === 'all' ? '전체' : o.label.replace('재확인 필요', '재확인 대상') }))
  const dongOptions = [{ value: 'all', label: '전체' }, ...dongs.filter((d) => villages.some((v) => v.dongCode === d.code)).map((d) => ({ value: d.code, label: d.name }))]
  const villageOptions = [{ value: 'all', label: '전체' }, ...villages.filter((v) => dong === 'all' || v.dongCode === dong).map((v) => ({ value: v.code, label: v.label }))]

  const filterBar = (
          <FilterBar>
            <Select compact label="마을" value={village} onChange={setVillage} options={villageOptions} />
            <MultiSelect compact label="이송 등급" values={grades} onChange={setGrades} options={GRADE_OPTIONS} placeholder="전체" />
            {recheck === 'stale' ? (
              <Chip variant="selected" onClick={() => changeRecheck('all')} aria-label="재확인 대상 조건 해제">
                재확인 대상 {staleCount.toLocaleString('ko-KR')}명<X size={16} aria-hidden="true" />
              </Chip>
            ) : staleCount > 0 && (
              <Chip onClick={() => changeRecheck('stale')} aria-label={`재확인 대상 ${staleCount}명만 보기`}>
                재확인 대상 {staleCount.toLocaleString('ko-KR')}명
              </Chip>
            )}
            {moreFilters && (
              <>
                <Select compact label="동" value={dong} onChange={setDong} options={dongOptions} disabled={user?.role === 'dong'} />
                <Select compact label="등급 확인" value={review} onChange={setReview} options={REVIEW_OPTIONS} />
                <Select compact label="마지막 확인" value={recheck} onChange={changeRecheck} options={recheckOptions} />
                <Select compact label="입력 방법" value={source} onChange={setSource} options={SOURCE_OPTIONS} />
              </>
            )}
            <Button variant="ghost" size="sm" aria-expanded={moreFilters} onClick={() => setMoreFilters((v) => !v)}>
              {moreFilters ? '조건 접기' : `조건 더보기${hiddenActive ? ` (적용 ${hiddenActive})` : ''}`}
            </Button>
          </FilterBar>
  )

  const detail = open ? (
    <section aria-label="선택한 대상자" className="flex min-h-0 min-w-0 flex-col">
      <div className="flex shrink-0 flex-wrap items-center justify-between gap-x-4 gap-y-2 pb-4">
        <div className="flex min-w-0 flex-wrap items-center gap-x-3 gap-y-1">
        <h2 className="self-baseline type-title tabular-nums text-text-pri">{open.code}</h2>
        <span className="self-baseline type-body text-text-sec">{vlabel(open.villageCode)}</span>
        <GradeChip grade={open.grade} />
        <StatusPill status={open.review} />
        </div>
        {canEdit && (
          <div className="flex shrink-0 flex-wrap items-center justify-end gap-2">
            <Button variant="ghost" leftIcon={<Trash2 size={16} aria-hidden="true" />} onClick={() => { removePerson(open.code); toast(`${open.code} 삭제 완료`); closePerson() }}>삭제</Button>
            {canPlan && <Button variant="secondary" onClick={() => setPlanAsk(true)}>확인 완료</Button>}
            <Button variant="primary" onClick={() => { setErrors({}); setEditing({ mode: 'edit', value: { villageCode: open.villageCode, grade: open.grade, tags: open.tags, boardingNote: open.boardingNote || '' } }) }}>수정</Button>
          </div>
        )}
      </div>
      <div className="min-h-0 flex-1 space-y-6 overflow-y-auto pr-1">
        <InfoRows rows={[
          { label: '당사자와 계획 확인', value: open.planCheckedAt ? `${checkedOf(open, now).stale ? '재확인 필요, ' : ''}마지막 확인 ${fmtDate(open.planCheckedAt)}${planLast?.by?.name ? ` (${planLast.by.name}${planWithLabel(planLast) ? `, ${planWithLabel(planLast)} 확인` : ''})` : ''}` : '재확인 필요', strong: true },
          ...((open.grade === 'walk' || open.grade === 'assist') && open.tags.includes('bedridden') ? [{ label: '등급 불일치', value: `이송 등급 ${open.grade === 'walk' ? '도보' : '부축'}, 특이사항 와상${open.planCheckedAt ? `, 확인 완료 ${fmtDateTime(open.planCheckedAt)}` : ', 확인 대기'}`, strong: true }] : []),
          { label: '장기요양 등급', value: open.ltcGrade || '미기재' },
          { label: '특이사항', value: open.tags.map((t) => TAGS[t]).join(', ') || '없음' },
          { label: '도우미에게 주소 알림', value: open.locConsent === true ? '동의' : '미동의' },
          { label: '입력 방법', value: <SourceLabel source={open.gradeSource} /> },
          { label: '근거 서류', value: open.docId || '없음' },
          { label: '갱신일', value: fmtDate(open.updatedAt) }
        ]} />
        <Section title="돌봄과 접근">
          <InfoRows rows={[
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
        </Section>
        {evidence && (
          <Section title="서류 근거">
            <div className="space-y-3">
              <DocImage src={doc.image} alt={`${doc.name} 읽은 영역`} box={evidence.box} />
              <EvidencePanel quote={evidence.quote} matched={evidence.quoteMatched} confidence={evidence.confidence} conflict={evidence.conflict} transcript={doc.transcript} docName={doc.name} source={doc.source} />
            </div>
          </Section>
        )}
      </div>
    </section>
  ) : <EmptyState compact title="표시할 대상자 없음" />

  return (
    <PageShell title="대상자 명부" hideHeader className="flex flex-col lg:h-full lg:pb-4">
      <PageHeader
        title="대상자 명부" className="!mb-3 shrink-0"
        action={(
          <>
            <SegmentControl label="보기" value={view} onChange={setView} items={VIEWS} />
            {canEdit && (
              <Button variant="primary" leftIcon={<Plus size={16} aria-hidden="true" />} onClick={() => { setErrors({}); setEditing({ mode: 'add', value: { villageCode: village !== 'all' ? village : villageOptions[1]?.value, grade: 'assist', tags: [] } }) }}>대상자 추가</Button>
            )}
          </>
        )}
      />
      <div className="mb-3 shrink-0">{filterBar}</div>
      {view === 'list' ? (
        <div className="grid min-h-0 flex-1 gap-x-10 gap-y-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(400px,1fr)]">
          <section aria-label="대상자 목록" className="flex min-h-0 flex-col max-lg:max-h-[50vh]">
            <div className="shrink-0 pb-3">
              <h2 className="flex items-baseline gap-2 type-title text-text-pri">표시 중인 명부<span className="font-normal tabular-nums text-text-sec">{countText(rows.length, '건')}</span></h2>
              <dl className="mt-2 flex flex-wrap items-baseline gap-x-6 gap-y-1 type-body-sm tabular-nums">
                <div className="flex items-baseline gap-1.5"><dt className="text-text-sec">마을</dt><dd className="text-text-pri">{byVillage.length}곳</dd></div>
                {grades.length > 0 && <div className="flex items-baseline gap-1.5"><dt className="text-text-sec">이송 등급</dt><dd className="text-text-pri">{grades.map((g) => gradeOf(g)?.label).join(' ')}</dd></div>}
              </dl>
            </div>
            <DataList
              label="대상자 명부" columns={columns} grid={listGrid} rows={rows} rowKey={(p) => p.code} selectedKey={open?.code}
              onSelect={(code) => { setEditing(null); openPerson(code) }}
              emptyTitle="조건에 맞는 대상자 없음" emptyDesc="조건을 바꿔 다시 확인"
              footer={<p className="shrink-0 pt-2 type-meta tabular-nums text-text-sec">{rosterChipsText(rosterBreakdown(persons))}. {fmtKDate(today)} 기준, 동해시 명부</p>}
            />
          </section>
          {detail}
        </div>
      ) : (
        <div className="min-h-0 flex-1 overflow-y-auto">
          <Section title={view === 'map' ? '마을별 분포' : '서식 출력'} count={countText(rows.length, '건')}>
            {view === 'map' ? (
              <Suspense fallback={<div className="h-[60vh] min-h-96 animate-pulse rounded-lg bg-mute" />}>
                <RosterMap items={byVillage} selected={village} onPick={(c) => { setVillage(c); setView('list') }} />
              </Suspense>
            ) : (
              <RosterPrint groups={byVillage} dongs={dongs} today={today} />
            )}
          </Section>
        </div>
      )}

      <Drawer
        open={!!editing}
        onClose={() => { setEditing(null); setErrors({}); setCheckOnSave(false) }}
        title={editing?.mode === 'add' ? '대상자 추가' : open?.code}
        footer={editing ? (
          <>
            <Button variant="ghost" onClick={() => { setEditing(null); setErrors({}); setCheckOnSave(false) }}>취소</Button>
            <Button variant="primary" onClick={save}>저장</Button>
          </>
        ) : null}
      >
        {editing && (
          <div className="space-y-4">
            <EntityForm fields={fields} value={editing.value} errors={errors} onChange={(value) => setEditing({ ...editing, value })} />
            {editing.mode === 'edit' && canPlan && (
              <>
                <Checkbox checked={checkOnSave} onChange={setCheckOnSave} label="당사자와 계획 확인 완료로 함께 기록(마지막 확인 날짜를 오늘로)" />
                {checkOnSave && <ChoiceChips label="당사자와 확인한 사람" size="sm" value={planWith} onChange={setPlanWith} options={Object.entries(PLAN_CHECK_WITH).map(([value, label]) => ({ value, label }))} />}
              </>
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
