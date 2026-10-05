// 서류 읽기(IA 4.3). 자동 판독 후 담당자가 한 건씩 확인하고 명부에 확정한다(PRD v2 F2).
// 화면은 서류 1건 단위: 왼쪽 원본, 오른쪽 읽은 값과 근거, 조작은 확인, 수정, 제외.
import { useMemo, useState } from 'react'
import { ChevronLeft, ChevronRight, CircleAlert, FileUp, ScanText } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import IntakeUploader, { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ReviewRow from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import Disclosure from '../../components/ui/Disclosure.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import IconButton from '../../components/ui/IconButton.jsx'
import useToast from '../../hooks/useToast.js'
import { readDocument, verifyPage, verifyResult } from '../../lib/intake.js'
import { fmtDate } from '../../lib/time.js'
import { SAMPLE_UPLOAD } from '../../mock/seed.js'
import useAuthStore from '../../store/useAuthStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const CONF_ORDER = { low: 0, mid: 1, high: 2 }
const KIND_LABEL = { plan: '대피계획서', card: '대피카드', etc: '기타' }
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
      <Card as="div" padding="sm" className="mb-4" bodyClassName="flex flex-wrap items-center gap-3">
        <div className="flex items-center gap-1" role="group" aria-label="확인 대기 이동">
          <IconButton aria-label="이전 서류" size="md" disabled={!queue.length || pos <= 0} onClick={() => setIdx(pos - 1)}>
            <ChevronLeft size={20} aria-hidden="true" />
          </IconButton>
          <p className="min-w-40 text-center type-strong text-text-pri tabular-nums" role="status">
            {queue.length ? `확인 대기 ${queue.length}건 중 ${pos + 1}번째` : '확인 대기 0건'}
          </p>
          <IconButton aria-label="다음 서류" size="md" disabled={!queue.length || pos >= queue.length - 1} onClick={() => setIdx(pos + 1)}>
            <ChevronRight size={20} aria-hidden="true" />
          </IconButton>
        </div>
        <div className="ml-auto flex flex-wrap items-center gap-2">
          {canEdit && highCount > 0 && (
            <Button variant="ghost" onClick={confirmAllHigh} leftIcon={<ScanText size={16} aria-hidden="true" />}>일치도 높음 {highCount}건 일괄 확인</Button>
          )}
          {canEdit && (
            <Button variant={uploadOpen ? 'primary' : 'secondary'} aria-expanded={uploadOpen} onClick={() => setShowUpload((v) => !v)} leftIcon={<FileUp size={16} aria-hidden="true" />}>서류 올리기</Button>
          )}
        </div>
      </Card>

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
        <ReviewRow
          key={current.result.personCode}
          doc={current.doc} result={current.result} kindLabel={KIND_LABEL[current.doc.kind]}
          villageLabel={vlabel(current.doc.villageCode)} canEdit={canEdit}
          onConfirm={() => { reviewResult(current.doc.id, current.result.personCode, 'confirm'); toast(`${current.result.personCode} 판독을 확인했습니다.`, 'primary') }}
          onEdit={(patch) => { reviewResult(current.doc.id, current.result.personCode, 'edit', patch); toast(`${current.result.personCode} 수정한 값으로 확인했습니다.`, 'primary') }}
          onReject={() => { reviewResult(current.doc.id, current.result.personCode, 'reject'); toast(`${current.result.personCode} 제외. 재촬영 요청 대상입니다.`) }}
        />
      ) : (
        <Card as="div" padding="none"><EmptyState title="확인 대기 서류가 없습니다" desc="새 서류는 서류 올리기에서 등록합니다." /></Card>
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
