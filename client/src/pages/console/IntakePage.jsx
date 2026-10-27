// 서류 읽기(IA 4.3). 미리의 핵심 화면. 종이 대피계획서를 AI가 읽고 담당자가 한 건씩 확인해 명부에 확정한다(PRD v2 F2).
// 위: 한 줄 단계 띠(올리기, AI 읽기, 담당자 확인). 아래: 왼쪽 확인 대기 목록, 오른쪽 선택한 건(원본, 읽은 값, 근거). 두 칸은 화면 높이 안에서 각자 안에서만 스크롤하고 확인 단추는 늘 보인다.
import { useMemo, useRef, useState } from 'react'
import { ChevronRight, CircleAlert, FileUp } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Modal from '../../components/ui/Modal.jsx'
import PageHeader from '../../components/console/PageHeader.jsx'
import IntakeUploader, { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ReviewRow from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import useToast from '../../hooks/useToast.js'
import { readDocument, verifyPage, verifyResult } from '../../lib/intake.js'
import { aiErrorMessage } from '../../lib/aiErrors.js'
import { fmtDate } from '../../lib/time.js'
import { SAMPLE_UPLOAD } from '../../mock/seed.js'
import { REAL_READINGS, REAL_READ_SOURCE } from '../../mock/realReadings.js'
import useAuthStore from '../../store/useAuthStore.js'
import Checkbox from '../../components/ui/Checkbox.jsx'
import Input from '../../components/ui/Input.jsx'
import { canConfirmPlan, checkerOf } from '../../lib/planCheck.js'
import useMiriStore from '../../store/useMiriStore.js'
import { gradeOf } from '../../lib/shortage.js'
import { countText } from '../../lib/unitText.js'

const CONF_ORDER = { low: 0, mid: 1, high: 2 }
const KIND_LABEL = { plan: '대피계획서', card: '대피카드', etc: '기타' }
const CONF = {
  high: { label: '서류와 같음', tone: 'text-text-meta' },
  mid: { label: '확인 필요', tone: 'text-text-pri' },
  low: { label: '서류와 다름', tone: 'text-danger-text' }
}

const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function IntakePage() {
  const persons = useMiriStore((s) => s.persons)
  const docs = useMiriStore((s) => s.intakeDocs)
  const villages = useMiriStore((s) => s.villages)
  const reviewResult = useMiriStore((s) => s.reviewResult)
  const pendingDocs = persons.filter((p) => p.review === 'pending').length
  const pendingNotes = useMiriStore((s) => s.fieldNotes.filter((n) => n.status === 'pending').length)
  const addIntakeDoc = useMiriStore((s) => s.addIntakeDoc)
  const nextDocId = useMiriStore((s) => s.nextDocId)
  const canEdit = useAuthStore((s) => s.canEdit('intake'))
  const authUser = useAuthStore((s) => s.user)
  const [checkOnConfirm, setCheckOnConfirm] = useState(false)
  // 확정 때 함께 남기는 탑승 메모(1026 복지관 면담). 대상자별 입력값
  const [boardingDraft, setBoardingDraft] = useState({})
  const boardingPatch = (code) => { const t = (boardingDraft[code] || '').trim(); return t ? { boardingNote: t } : {} }
  const planCheckFor = (q) => {
    if (!checkOnConfirm) return undefined
    const person = persons?.find((p) => p.code === q.result.personCode) || { villageCode: q.doc.villageCode }
    return canConfirmPlan(authUser, person, (c) => villages.find((v) => v.code === c)?.dongCode) ? { by: checkerOf(authUser) } : undefined
  }
  const toast = useToast()
  const [reading, setReading] = useState(null)   // { name, step, failed }
  const [error, setError] = useState(null)
  const [showUpload, setShowUpload] = useState(false)
  const [idx, setIdx] = useState(0)

  const vlabel = (c) => villages.find((v) => v.code === c)?.label || c
  const personMap = useMemo(() => Object.fromEntries(persons.map((p) => [p.code, p])), [persons])

  const queue = useMemo(() => {
    const out = []
    for (const doc of docs) {
      for (const r of doc.results) {
        const p = personMap[r.personCode]
        if (!p || p.review !== 'pending') continue
        out.push({ doc, result: verifyResult(doc.transcript, r) })
      }
    }
    return out.sort((a, b) => CONF_ORDER[a.result.confidence] - CONF_ORDER[b.result.confidence] || a.result.personCode.localeCompare(b.result.personCode))
  }, [docs, personMap])

  const pos = Math.min(idx, Math.max(0, queue.length - 1))
  const current = queue[pos]
  const highCount = queue.filter((q) => q.result.confidence === 'high').length
  const doneDocs = docs.filter((d) => d.results.every((r) => personMap[r.personCode] && personMap[r.personCode].review !== 'pending'))
  const uploadOpen = showUpload || !!reading || !!error
  const readPeople = docs.reduce((t, d) => t + d.results.length, 0)
  const mismatch = queue.filter((q) => q.result.confidence === 'low').length

  // 같은 서류를 다시 올려도 코드가 겹치지 않게 번호를 이어 붙인다
  const uniqueCodes = (villageCode, n) => {
    const used = new Set(persons.map((p) => p.code))
    const out = []
    let k = 301
    while (out.length < n) {
      const c = `${villageCode}-${k}`
      if (!used.has(c)) out.push(c)
      k += 1
    }
    return out
  }

  const progress = async (name, work) => {
    setError(null)
    setReading({ name, step: 0 })
    try {
      const [page] = await Promise.all([work, (async () => {
        for (let i = 1; i <= 3; i += 1) { await wait(650); setReading((r) => r && { ...r, step: i }) }
      })()])
      await wait(500)
      setReading((r) => r && { ...r, step: 4 })
      await wait(300)
      return page
    } catch (e) {
      setReading((r) => r && { ...r, failed: true })
      throw e
    }
  }

  const finish = (doc) => {
    addIntakeDoc(doc)
    setReading(null)
    setShowUpload(false)
    setIdx(0)
    toast(`${doc.name} 읽기 완료, 확인 대기 ${doc.results.length}건`, 'primary')
  }

  const onSample = async () => {
    const page = await progress(SAMPLE_UPLOAD.name, Promise.resolve(verifyPage({ ...SAMPLE_UPLOAD, persons: SAMPLE_UPLOAD.persons || SAMPLE_UPLOAD.results })))
    const codes = uniqueCodes(SAMPLE_UPLOAD.villageCode, page.persons.length)
    finish({
      id: nextDocId(), kind: SAMPLE_UPLOAD.kind, name: `${SAMPLE_UPLOAD.name}(예시)`, source: 'example', villageCode: SAMPLE_UPLOAD.villageCode,
      image: SAMPLE_UPLOAD.image, uploadedAt: Date.now(), status: 'pending', transcript: page.transcript,
      results: page.persons.map((r, i) => ({ ...r, personCode: codes[i] }))
    })
  }

  // 실제 판독 사례: 저장된 HCX-005 결과를 외부 호출 없이 불러옴
  const onReal = async (c) => {
    const page = await progress(c.name, Promise.resolve(verifyPage({ ...c, persons: c.results })))
    const codes = uniqueCodes(c.villageCode, page.persons.length)
    finish({
      id: nextDocId(), kind: c.kind, name: c.name, villageCode: c.villageCode, source: REAL_READ_SOURCE,
      image: c.image, uploadedAt: Date.now(), status: 'pending', transcript: page.transcript,
      results: page.persons.map((r, i) => ({ ...r, personCode: codes[i] }))
    })
  }

  const onFile = async (file, { villageCode, kind }) => {
    try {
      const page = await progress(file.name, readDocument(file))
      if (!page.persons?.length) {
        setReading(null)
        setError({ title: '읽기 결과 없음', desc: '문서에서 대상자 표기를 찾지 못함. 다시 촬영해 업로드' })
        return
      }
      const codes = uniqueCodes(villageCode, page.persons.length)
      finish({
        id: nextDocId(), kind, name: `${vlabel(villageCode)} ${KIND_LABEL[kind]} (${file.name})`, villageCode,
        image: URL.createObjectURL(file), uploadedAt: Date.now(), status: 'pending', transcript: page.transcript,
        results: page.persons.map((r, i) => ({ ...r, personCode: codes[i] }))
      })
    } catch (e) {
      setReading(null)
      setError(aiErrorMessage(e, '서류'))
    }
  }

  const confirmAllHigh = () => {
    const targets = queue.filter((q) => q.result.confidence === 'high')
    targets.forEach((q) => reviewResult(q.doc.id, q.result.personCode, 'confirm'))
    toast(`서류와 같음 ${targets.length}건 확인 완료`, 'primary')
  }

  const [doneOpen, setDoneOpen] = useState(false)
  const steps = [
    { n: 1, label: '서류 올리기', count: `서류 ${countText(docs.length, '건')}`, onClick: canEdit ? () => setShowUpload((v) => !v) : undefined, active: uploadOpen },
    { n: 2, label: 'AI 읽기', count: `대상자 ${countText(readPeople, '명')}` },
    { n: 3, label: '담당자 확인', count: `확인 대기 ${countText(queue.length, '건')}`, active: !uploadOpen && queue.length > 0 }
  ]

  const listRef = useRef(null)
  const confirmCurrent = () => {
    if (!current) return
    const ck = planCheckFor(current)
    reviewResult(current.doc.id, current.result.personCode, 'confirm', boardingPatch(current.result.personCode), ck)
    toast(`${current.result.personCode} 읽기 결과를 확인했습니다.${ck ? ' 당사자와 계획 확인 기록 완료' : ''}`, 'primary')
  }
  // 목록에서 마우스 없이: 위아래 화살표로 이동, 선택한 건에서 Enter 로 확인
  const onListKey = (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') {
      e.preventDefault()
      const n = Math.max(0, Math.min(queue.length - 1, pos + (e.key === 'ArrowDown' ? 1 : -1)))
      setIdx(n)
      requestAnimationFrame(() => listRef.current?.querySelectorAll('[role="option"]')[n]?.focus())
    } else if (e.key === 'Enter' && canEdit && e.target.getAttribute?.('aria-selected') === 'true') {
      e.preventDefault()
      confirmCurrent()
    }
  }

  return (
    <PageShell title="서류 읽기" hideHeader className="flex flex-col lg:h-full lg:pb-4">
      <PageHeader title="서류 읽기" className="!mb-3 shrink-0" action={canEdit && (
        <Button variant="primary" leftIcon={<FileUp size={16} aria-hidden="true" />} onClick={() => setShowUpload(true)}>서류 올리기</Button>
      )} />
      <ol aria-label="서류 읽기 단계" className="mb-3 flex shrink-0 flex-wrap items-center gap-x-3 gap-y-1 type-body-sm text-text-sec">
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
        <li className="ml-auto"><button type="button" onClick={() => setDoneOpen(true)} className="min-h-11 rounded-md px-2 type-body-sm text-primary-text hover:underline md:min-h-0">처리 완료 문서 {doneDocs.length}건</button></li>
      </ol>

      <Modal open={uploadOpen} onClose={() => { setShowUpload(false); setError(null) }} title="서류 올리기" className="max-w-[720px]">
        {canEdit ? (
          <IntakeUploader villages={villages} onFile={onFile} onSample={onSample} onReal={onReal} realCases={REAL_READINGS} busy={!!reading && !reading.failed} />
        ) : <p className="type-body-sm text-text-meta">서류 읽기 권한 없음</p>}
        {reading && <div className="mt-4"><ReadTimeline name={reading.name} step={reading.step} failed={reading.failed} /></div>}
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

      <Modal open={doneOpen} onClose={() => setDoneOpen(false)} title={`처리 완료 문서 ${doneDocs.length}건`} className="max-w-[720px]">
        {doneDocs.length ? (
          <ul className="space-y-4">
            {doneDocs.map((d) => (
              <li key={d.id}>
                <p className="type-strong text-text-pri">{d.name}</p>
                <p className="mt-1 type-meta text-text-meta tabular-nums">{d.id}, {KIND_LABEL[d.kind]}, {fmtDate(d.uploadedAt)}</p>
                <ul className="mt-2 flex flex-wrap gap-2">
                  {d.results.map((r) => (
                    <li key={r.personCode}>
                      <Link to={`/console/roster?person=${r.personCode}`} className="inline-flex min-h-11 items-center gap-1.5 md:min-h-0 hover:underline">
                        <span className="type-meta text-text-sec tabular-nums">{r.personCode}</span>
                        <StatusPill status={personMap[r.personCode]?.review || 'rejected'} size="sm" />
                      </Link>
                    </li>
                  ))}
                </ul>
              </li>
            ))}
          </ul>
        ) : <p className="type-body-sm text-text-meta">처리 완료 서류 없음</p>}
      </Modal>

      {current ? (
        <div className="grid min-h-0 flex-1 gap-x-8 gap-y-4 lg:grid-cols-[minmax(260px,340px)_minmax(0,1fr)]">
          <section aria-label="확인 대기 목록" className="flex min-h-0 flex-col max-lg:max-h-[40vh]">
            <div className="flex shrink-0 items-baseline justify-between gap-2 pb-2">
              <h2 className="type-title text-text-pri">확인 대기 <span className="font-normal tabular-nums text-text-sec">{queue.length}건</span></h2>
              {canEdit && highCount > 0 && (
                <button type="button" onClick={confirmAllHigh} className="min-h-11 rounded-md px-2 type-body-sm font-bold text-primary-text hover:underline md:min-h-0">서류와 같음 {highCount}건 일괄 확인</button>
              )}
            </div>
            {mismatch > 0 && <p className="shrink-0 pb-1 type-body-sm text-danger-text">서류와 다름 {mismatch}건 우선</p>}
            {canEdit && <p className="shrink-0 pb-2 type-body-sm text-text-sec">↑↓ 이동, Enter 확인</p>}
            <ul ref={listRef} role="listbox" aria-label="확인 대기 서류" onKeyDown={onListKey} className="min-h-0 flex-1 space-y-0.5 overflow-y-auto pr-1">
              {queue.map((q, i) => {
                const g = gradeOf(q.result.grade)
                const c = CONF[q.result.confidence] || CONF.mid
                return (
                  <li key={q.result.personCode} role="presentation">
                    <button type="button" role="option" aria-selected={i === pos} tabIndex={i === pos ? 0 : -1} onClick={() => setIdx(i)}
                      className={clsx('flex min-h-[56px] w-full items-center gap-3 rounded-xl px-3 py-1.5 text-left transition-colors duration-fast', i === pos ? 'bg-mute' : 'hover:bg-subtle')}>
                      <span className="min-w-0 flex-1">
                        <span className={clsx('block truncate type-body text-text-pri', i === pos && 'font-bold')}><span className="tabular-nums">{q.result.personCode}</span></span>
                        <span className="block truncate type-body-sm text-text-sec">{vlabel(q.doc.villageCode)}, {KIND_LABEL[q.doc.kind]}, 읽은 등급 {g?.label || '읽기 불가'}</span>
                      </span>
                      <span className={clsx('shrink-0 type-body-sm font-bold', c.tone)}>{c.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
          </section>
          <section aria-label="선택한 서류" className="cq flex min-h-0 min-w-0 flex-col max-lg:min-h-[520px]">
            <ReviewRow
              key={current.result.personCode}
              doc={current.doc} result={current.result} kindLabel={KIND_LABEL[current.doc.kind]}
              villageLabel={vlabel(current.doc.villageCode)} canEdit={canEdit}
              extra={canEdit && (
                <div className="space-y-3">
                  <Input
                    label="탑승 메모(선택)" value={boardingDraft[current.result.personCode] ?? ''}
                    placeholder="예: 왼쪽 편마비, 운전석 뒤 왼쪽 자리"
                    hint="수락한 도우미에게만 표시. 이름과 주소는 적지 않음"
                    onChange={(e) => setBoardingDraft((b) => ({ ...b, [current.result.personCode]: e.target.value }))}
                  />
                </div>
              )}
              footer={canEdit && <Checkbox checked={checkOnConfirm} onChange={setCheckOnConfirm} label="확인 시 당사자와 계획 확인 함께 기록" />}
              onConfirm={confirmCurrent}
              onEdit={(patch) => { const ck = planCheckFor(current); reviewResult(current.doc.id, current.result.personCode, 'edit', { ...patch, ...boardingPatch(current.result.personCode) }, ck); toast(`${current.result.personCode} 수정한 값으로 확인했습니다.${ck ? ' 당사자와 계획 확인 기록 완료' : ''}`, 'primary') }}
              onReject={() => { reviewResult(current.doc.id, current.result.personCode, 'reject'); toast(`${current.result.personCode} 제외. 서류 재촬영 요청 필요`) }}
            />
          </section>
        </div>
      ) : (
        <EmptyState title="확인 대기 서류 없음" desc="새 서류는 서류 올리기로 등록" action={canEdit ? <Button onClick={() => setShowUpload(true)}>서류 올리기</Button> : null} />
      )}
    </PageShell>
  )
}
