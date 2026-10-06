// 서류 읽기(IA 4.3). 미리의 핵심 화면. 종이 대피계획서를 AI 가 읽고 담당자가 한 건씩 확인해 명부에 확정한다(PRD v2 F2).
// 위: 3단계 안내(올리기, AI 읽기, 담당자 확인)와 단계별 건수. 아래: 왼쪽 확인 대기 목록, 오른쪽 선택한 건(원본, 읽은 값, 근거).
import { useMemo, useState } from 'react'
import { CircleAlert, FileUp, ScanText, UserCheck } from 'lucide-react'
import clsx from 'clsx'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import IntakeUploader, { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ReviewRow from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import useToast from '../../hooks/useToast.js'
import { readDocument, verifyPage, verifyResult } from '../../lib/intake.js'
import { fmtDate } from '../../lib/time.js'
import { SAMPLE_UPLOAD } from '../../mock/seed.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'
import { gradeOf } from '../../lib/shortage.js'

const CONF_ORDER = { low: 0, mid: 1, high: 2 }
const KIND_LABEL = { plan: '대피계획서', card: '대피카드', etc: '기타' }
const CONF = {
  high: { label: '원문 일치', tone: 'bg-success-soft text-success-text' },
  mid: { label: '확인 권장', tone: 'bg-warning-soft text-warning-text' },
  low: { label: '원문 불일치', tone: 'bg-danger-soft text-danger-text' }
}

// 단계 안내 한 칸
function Step({ n, title, desc, count, active, onClick, Icon }) {
  const Tag = onClick ? 'button' : 'div'
  return (
    <Tag type={onClick ? 'button' : undefined} onClick={onClick}
      className={clsx('flex min-w-0 flex-1 items-start gap-3 rounded-lg p-4 text-left transition-colors duration-fast',
        active ? 'bg-primary-soft' : 'bg-subtle', onClick && 'hover:bg-mute')}>
      <span className={clsx('inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full type-strong', active ? 'bg-primary text-text-inverse' : 'bg-page text-text-sec')}>
        {Icon ? <Icon size={16} aria-hidden="true" /> : n}
      </span>
      <span className="min-w-0">
        <span className="block type-caption text-text-meta">{n}단계</span>
        <span className="block type-strong text-text-pri">{title}</span>
        <span className="mt-0.5 block type-meta leading-5 text-text-sec">{desc}</span>
        <span className="mt-2 block type-h3 text-text-pri tabular-nums">{count}</span>
      </span>
    </Tag>
  )
}
const wait = (ms) => new Promise((r) => setTimeout(r, ms))

export default function IntakePage() {
  const persons = useMiriStore((s) => s.persons)
  const docs = useMiriStore((s) => s.intakeDocs)
  const villages = useMiriStore((s) => s.villages)
  const reviewResult = useMiriStore((s) => s.reviewResult)
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
      id: nextDocId(), kind: SAMPLE_UPLOAD.kind, name: SAMPLE_UPLOAD.name, villageCode: SAMPLE_UPLOAD.villageCode,
      image: SAMPLE_UPLOAD.image, uploadedAt: Date.now(), status: 'pending', transcript: page.transcript,
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
      setError(e.code === 'NO_KEY' || e.code === 503 || e.code === 404 || e.code === 405
        ? { title: '판독 서버에 연결되지 않았습니다', desc: '샘플 서류 읽기로 화면을 확인해 주십시오.' }
        : { title: '서류 읽기에 실패했습니다', desc: `${e.message}. 샘플 서류 읽기로 화면을 확인해 주십시오.` })
    }
  }

  const confirmAllHigh = () => {
    const targets = queue.filter((q) => q.result.confidence === 'high')
    targets.forEach((q) => reviewResult(q.doc.id, q.result.personCode, 'confirm'))
    toast(`일치도 높음 ${targets.length}건을 확인했습니다.`, 'primary')
  }

  return (
    <PageShell title="서류 읽기">
      <section aria-label="서류 읽기 단계" className="mb-4 flex flex-col gap-3 lg:flex-row">
        <Step n={1} Icon={FileUp} title="서류 올리기" desc="동 담당자가 받은 대피계획서나 대피카드를 찍거나 스캔해 올립니다." count={`${docs.length}건`}
          active={uploadOpen} onClick={canEdit ? () => setShowUpload((v) => !v) : undefined} />
        <Step n={2} Icon={ScanText} title="AI 가 읽기" desc="AI 가 거동 상태 문구를 찾아 이송 등급 초안과 근거 문구를 만듭니다. 이름과 연락처는 읽지 않습니다." count={`${readPeople}명`} />
        <Step n={3} Icon={UserCheck} title="담당자 확인" desc="원본과 근거 문구를 대조해 확인, 수정, 제외합니다. 확인해야 명부와 부족분 계산에 들어갑니다." count={`대기 ${queue.length}건`} active={!uploadOpen && queue.length > 0} />
      </section>

      {uploadOpen && (
        <Card title="서류 올리기" className="mb-4">
          {canEdit ? (
            <IntakeUploader villages={villages} onFile={onFile} onSample={onSample} busy={!!reading && !reading.failed} />
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
                      className={clsx('flex w-full items-center gap-3 px-4 py-2.5 text-left transition-colors duration-fast', i === pos ? 'bg-primary-soft' : 'hover:bg-mute')}>
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
            onReject={() => { reviewResult(current.doc.id, current.result.personCode, 'reject'); toast(`${current.result.personCode} 제외. 재촬영 요청 대상입니다.`) }}
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
