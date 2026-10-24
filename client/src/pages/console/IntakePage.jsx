// 서류 읽기(IA 4.3). 미리의 핵심 화면. 종이 대피계획서를 AI가 읽고 담당자가 한 건씩 확인해 명부에 확정한다(PRD v2 F2).
// 위: 3단계 안내(올리기, AI 읽기, 담당자 확인)와 단계별 건수. 아래: 왼쪽 확인 대기 목록, 오른쪽 선택한 건(원본, 읽은 값, 근거).
import { useMemo, useState } from 'react'
import { CircleAlert, FileUp, ScanText, UserCheck } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import IntakeUploader, { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import StepCard from '../../components/miri/StepCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ReviewRow from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import useToast from '../../hooks/useToast.js'
import { readDocument, verifyPage, verifyResult } from '../../lib/intake.js'
import { aiErrorMessage } from '../../lib/aiErrors.js'
import { fmtDate } from '../../lib/time.js'
import { SAMPLE_UPLOAD } from '../../mock/seed.js'
import { REAL_READINGS, REAL_READ_SOURCE } from '../../mock/realReadings.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import { gradeOf } from '../../lib/shortage.js'
import { countText } from '../../lib/unitText.js'

const CONF_ORDER = { low: 0, mid: 1, high: 2 }
const KIND_LABEL = { plan: '대피계획서', card: '대피카드', etc: '기타' }
const CONF = {
  high: { label: '원문 일치', tone: 'text-text-meta' },
  mid: { label: '확인 권장', tone: 'text-text-pri' },
  low: { label: '원문 불일치', tone: 'text-danger-text' }
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
    toast(`${doc.name} 읽기를 마쳤습니다. 확인 대기 ${doc.results.length}건`, 'primary')
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
        setError({ title: '판독 결과가 없습니다', desc: '문서에서 대상자 표기를 찾지 못했습니다. 다시 촬영해 올려 주십시오.' })
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
    toast(`일치도 높음 ${targets.length}건을 확인했습니다.`, 'primary')
  }

  return (
    <PageShell title="서류 읽기" desc="동에서 받은 대피 관련 서류를 AI가 읽은 결과와 원본을 맞춰 보고, 이송 등급을 확정합니다.">
      <section aria-label="서류 읽기 단계" className="mb-4 flex flex-col gap-3 lg:flex-row">
        <StepCard n={1} Icon={FileUp} title="서류 올리기" desc="동 담당자가 받은 대피계획서나 대피카드를 찍거나 스캔해 올립니다." count={`서류 ${countText(docs.length, '건')}`}
          active={uploadOpen} onClick={canEdit ? () => setShowUpload((v) => !v) : undefined} />
        <StepCard n={2} Icon={ScanText} title="AI가 읽기" desc="서류 사진은 국내 글자 인식(CLOVA OCR)에만 보내고, 이름, 연락처, 주소를 가린 글자만 국내 AI(HyperCLOVA X)가 읽어 이송 등급 초안과 근거 문구를 만듭니다." count={`대상자 ${countText(readPeople, '명')}`} />
        <StepCard n={3} Icon={UserCheck} title="담당자 확인" desc="원본과 근거 문구를 대조해 확인, 수정, 제외합니다. 확인해야 명부와 부족분 계산에 들어갑니다." count={`확인 대기 ${countText(queue.length, '건')}`} active={!uploadOpen && queue.length > 0} />
      </section>
      <p className="-mt-1 mb-4 type-meta text-text-meta">왼쪽 메뉴의 숫자 {countText(pendingDocs + pendingNotes, '')}은 확인 대기 판독 결과 {countText(pendingDocs, '건')}과 현장 소식 {countText(pendingNotes, '건')}을 더한 값입니다.</p>

      {uploadOpen && (
        <Card title="서류 올리기" className="mb-4">
          {canEdit ? (
            <IntakeUploader villages={villages} onFile={onFile} onSample={onSample} onReal={onReal} realCases={REAL_READINGS} busy={!!reading && !reading.failed} />
          ) : <p className="type-body-sm text-text-meta">서류 읽기 권한이 없습니다.</p>}
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
        </Card>
      )}

      {current ? (
        <div className="grid gap-4 xl:grid-cols-[300px_minmax(0,1fr)] xl:items-start">
          <Card as="aside" padding="none" aria-label="확인 대기 목록" className="xl:sticky xl:top-20">
            <div className="flex items-center justify-between gap-2 border-b border-line-sub px-4 py-3">
              <p className="type-strong text-text-pri">확인 대기 <span className="tabular-nums">{queue.length}</span>건</p>
              {mismatch > 0 && <span className="type-meta text-danger-text">원문 불일치 {mismatch}건 먼저</span>}
            </div>
            <ul className="max-h-[60vh] overflow-y-auto py-1">
              {queue.map((q, i) => {
                const g = gradeOf(q.result.grade)
                const c = CONF[q.result.confidence] || CONF.mid
                return (
                  <li key={q.result.personCode}>
                    <button type="button" onClick={() => setIdx(i)} aria-current={i === pos ? 'true' : undefined}
                      className={clsx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast', i === pos ? 'bg-page' : 'hover:bg-mute')}>
                      <span className="min-w-0 flex-1">
                        <span className="block truncate type-strong text-text-pri">{vlabel(q.doc.villageCode)} <span className="type-meta text-text-meta tabular-nums">{q.result.personCode.split('-').pop()}</span></span>
                        <span className="block truncate type-meta text-text-meta">{KIND_LABEL[q.doc.kind]}, AI 판정 {g?.label || '판독 불가'}</span>
                      </span>
                      <span className={clsx('shrink-0 rounded-xs px-1.5 py-0.5 type-caption', c.tone)}>{c.label}</span>
                    </button>
                  </li>
                )
              })}
            </ul>
            {canEdit && highCount > 0 && (
              <div className="border-t border-line-sub p-3">
                <Button variant="ghost" size="sm" className="w-full" onClick={confirmAllHigh} leftIcon={<ScanText size={16} aria-hidden="true" />}>원문 일치 {highCount}건 한 번에 확인</Button>
              </div>
            )}
          </Card>
          <ReviewRow
            key={current.result.personCode}
            doc={current.doc} result={current.result} kindLabel={KIND_LABEL[current.doc.kind]}
            villageLabel={vlabel(current.doc.villageCode)} canEdit={canEdit}
            onConfirm={() => { reviewResult(current.doc.id, current.result.personCode, 'confirm'); toast(`${current.result.personCode} 판독을 확인했습니다.`, 'primary') }}
            onEdit={(patch) => { reviewResult(current.doc.id, current.result.personCode, 'edit', patch); toast(`${current.result.personCode} 수정한 값으로 확인했습니다.`, 'primary') }}
            onReject={() => { reviewResult(current.doc.id, current.result.personCode, 'reject'); toast(`${current.result.personCode}을 제외했습니다. 서류를 다시 찍어 달라고 요청해 주세요.`) }}
          />
        </div>
      ) : (
        <Card as="div" padding="none"><EmptyState title="확인 대기 서류가 없습니다" desc="새 서류는 1단계 서류 올리기에서 등록합니다." /></Card>
      )}

      <section className="mt-6" aria-label="처리 완료 문서">
        <Disclosure summary={`처리 완료 문서 ${doneDocs.length}건`}>
          {doneDocs.length ? (
            <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
              {doneDocs.map((d) => (
                <Card key={d.id} as="li" padding="sm">
                  <p className="type-strong text-text-pri">{d.name}</p>
                  <p className="mt-1 type-meta text-text-meta tabular-nums">{d.id}, {KIND_LABEL[d.kind]}, {fmtDate(d.uploadedAt)}</p>
                  <ul className="mt-3 flex flex-wrap gap-2">
                    {d.results.map((r) => (
                      <li key={r.personCode}>
                        <Link to={`/console/roster?person=${r.personCode}`} className="inline-flex items-center gap-1.5 min-h-11 md:min-h-0 hover:underline">
                          <span className="type-meta text-text-sec tabular-nums">{r.personCode}</span>
                          <StatusPill status={personMap[r.personCode]?.review || 'rejected'} size="sm" />
                        </Link>
                      </li>
                    ))}
                  </ul>
                </Card>
              ))}
            </ul>
          ) : <p className="type-body-sm text-text-meta">처리 완료 문서가 없습니다.</p>}
        </Disclosure>
      </section>
    </PageShell>
  )
}
