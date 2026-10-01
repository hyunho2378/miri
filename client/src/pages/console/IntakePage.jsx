// 서류 판독(IA 4.3). AI 1번. 멀티모달 LLM 판독 → 원문 대조 → 담당자 확인 후 명부 확정.
import { useMemo, useRef, useState } from 'react'
import { CircleAlert, ScanText } from 'lucide-react'
import { Link } from 'react-router-dom'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Card from '../../components/ui/Card.jsx'
import SectionTitle from '../../components/ui/SectionTitle.jsx'
import IntakeUploader, { ReadTimeline } from '../../components/miri/IntakeUploader.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import ReviewRow from '../../components/miri/ReviewRow.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
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
  const queueRef = useRef(null)

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

  const highCount = queue.filter((q) => q.result.confidence === 'high').length
  const doneDocs = docs.filter((d) => d.results.every((r) => personMap[r.personCode] && personMap[r.personCode].review !== 'pending'))

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
    toast(`${doc.name} 판독 완료. 확인 대기 ${doc.results.length}건`, 'primary')
    requestAnimationFrame(() => queueRef.current?.scrollIntoView({ block: 'start' }))
  }

  const onSample = async () => {
    const page = await progress(SAMPLE_UPLOAD.name, Promise.resolve(verifyPage(SAMPLE_UPLOAD)))
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
        setError({ title: '판독 결과 없음', desc: '대상자 표기를 찾지 못한 문서. 재촬영 필요' })
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
        ? { title: '판독 서버 미연결', desc: '샘플 서류로 시연 가능. 실제 판독은 서버에 GEMINI_API_KEY 설정 필요' }
        : { title: '판독 실패', desc: `${e.message}. 샘플 서류로 시연 가능` })
    }
  }

  const confirmAllHigh = () => {
    const targets = queue.filter((q) => q.result.confidence === 'high')
    targets.forEach((q) => reviewResult(q.doc.id, q.result.personCode, 'confirm'))
    toast(`신뢰도 상 ${targets.length}건 판독 확인`, 'primary')
  }

  return (
    <PageShell
      title="서류 판독"
      intro="종이 대피계획서와 대피카드를 AI가 읽어 이송 등급과 특이사항을 판정. 근거 문구가 전사문에 없으면 신뢰도 하로 강제. 담당자 확인 전까지 명부 확정 아님"
    >
      <div className="grid gap-4 xl:grid-cols-[minmax(0,1fr)_minmax(0,360px)]">
        <Card title="서류 올리기" desc="사진과 스캔 이미지 판독">
          {canEdit ? (
            <IntakeUploader villages={villages} onFile={onFile} onSample={onSample} busy={!!reading && !reading.failed} />
          ) : <p className="type-body-sm text-text-meta">서류 판독 권한 없음</p>}
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
        <Card title="판독 원칙">
          <ul className="space-y-2 type-body-sm text-text-sec">
            <li>- 등급 기준: 도보, 부축, 휠체어, 침상 4단계</li>
            <li>- 근거 문구 없으면 판정 불가로 처리</li>
            <li>- 등급과 특이사항이 모순이면 신뢰도 하향</li>
            <li>- 확인 대기 판독은 부족분에 잠정값으로 포함</li>
            <li>- 이름과 연락처는 판독 결과에 출력하지 않음</li>
          </ul>
        </Card>
      </div>

      <section ref={queueRef} className="mt-8 scroll-mt-24" aria-label="확인 대기열">
        <SectionTitle
          title={<>확인 대기열 <span className="text-text-meta tabular-nums">{queue.length}건</span></>}
          desc="신뢰도 하부터 정렬. 신뢰도 중과 하는 한 건씩 확인"
          actions={canEdit && highCount > 0 && (
            <Button variant="secondary" onClick={confirmAllHigh} leftIcon={<ScanText size={16} aria-hidden="true" />}>신뢰도 상 {highCount}건 일괄 확인</Button>
          )}
        />
        {queue.length ? (
          <ul className="space-y-4">
            {queue.map(({ doc, result }) => (
              <ReviewRow
                key={result.personCode} doc={doc} result={result} villageLabel={vlabel(doc.villageCode)} canEdit={canEdit}
                onConfirm={() => { reviewResult(doc.id, result.personCode, 'confirm'); toast(`${result.personCode} 판독 확인`, 'primary') }}
                onEdit={(patch) => { reviewResult(doc.id, result.personCode, 'edit', patch); toast(`${result.personCode} 수정 후 확인`, 'primary') }}
                onReject={() => { reviewResult(doc.id, result.personCode, 'reject'); toast(`${result.personCode} 반려. 재촬영 요청 대상`) }}
              />
            ))}
          </ul>
        ) : (
          <Card as="div" padding="none"><EmptyState title="확인 대기 없음" desc="새 서류를 올리거나 샘플 서류로 판독 시연" /></Card>
        )}
      </section>

      <section className="mt-8" aria-label="처리 완료 문서">
        <SectionTitle title="처리 완료 문서" />
        {doneDocs.length ? (
          <ul className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
            {doneDocs.map((d) => (
              <Card key={d.id} as="li" padding="sm">
                <p className="type-strong text-text-pri">{d.name}</p>
                <p className="mt-1 type-meta text-text-meta tabular-nums">{d.id} {KIND_LABEL[d.kind]} {fmtDate(d.uploadedAt)}</p>
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
        ) : <p className="type-body-sm text-text-meta">처리 완료 문서 없음</p>}
      </section>
    </PageShell>
  )
}
