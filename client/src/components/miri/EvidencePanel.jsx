// 판독 근거(SourcePanel 구조 승계). 근거 문구, 원문 대조 결과, 일치도, 자동 판독 결과 라벨.
// 근거 문구가 전사문에 없으면 불일치로 표시하고 일치도는 lib/intake.verifyResult 가 하로 강제한다.
import { useRef } from 'react'
import clsx from 'clsx'
import { CircleAlert, CircleCheck, ScanText } from 'lucide-react'
import { CONF_LABEL } from '../../lib/intake.js'
import { evidenceQuoteIndex } from '../../lib/evidenceQuote.js'
import { prefersReducedMotion } from '../motion/useReducedMotion.js'
import StatusPill from '../dashboard/StatusPill.jsx'
import Disclosure from '../ui/Disclosure.jsx'
import { REAL_READ_SOURCE, REAL_READ_LABEL, EXAMPLE_READ_LABEL } from '../../mock/realReadings.js'

function Highlighted({ transcript, quote, markRef }) {
  const i = evidenceQuoteIndex(transcript, quote)
  if (i < 0) return <span>{transcript}</span>
  return (
    <span>
      {transcript.slice(0, i)}
      <mark ref={markRef} tabIndex={-1} className="rounded-xs bg-primary-soft px-0.5 text-primary-text">{quote}</mark>
      {transcript.slice(i + quote.length)}
    </span>
  )
}

export default function EvidencePanel({ quote, matched, confidence, conflict, transcript, docName, className, subject = '서류', source, jumpRef }) {
  const detailsRef = useRef(null)
  const markRef = useRef(null)
  const canFindQuote = matched && evidenceQuoteIndex(transcript, quote) >= 0
  const showInOriginal = () => {
    if (!canFindQuote) return
    if (detailsRef.current) detailsRef.current.open = true
    requestAnimationFrame(() => {
      markRef.current?.scrollIntoView({ behavior: prefersReducedMotion() ? 'auto' : 'smooth', block: 'center' })
      markRef.current?.focus({ preventScroll: true })
    })
  }
  // 바깥(확인할 곳)에서 근거 문구 원문 위치로 이동할 수 있게 함수를 넘김(33회차)
  if (jumpRef) jumpRef.current = canFindQuote ? showInOriginal : null

  return (
    <aside className={clsx('min-w-0 rounded-md bg-subtle p-4', className)} aria-label="판독 근거">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 type-caption text-text-sec">
          <ScanText size={16} aria-hidden="true" />{source === REAL_READ_SOURCE ? REAL_READ_LABEL : EXAMPLE_READ_LABEL}
        </span>
        {confidence && <StatusPill status={confidence} label={`${CONF_LABEL[confidence]}`} />}
      </div>
      {docName && <p className="mt-2 type-meta text-text-meta">{docName}</p>}
      <p className="mt-3 type-caption text-text-sec">근거 문구</p>
      {canFindQuote ? (
        <button type="button" onClick={showInOriginal} className="mt-1 min-h-11 max-w-full rounded-md py-1 text-left type-body-sm text-text-pri hover:text-primary-text md:min-h-0" aria-label={`${quote}, ${subject} 원문에서 보기`}>
          &ldquo;{quote}&rdquo;
        </button>
      ) : (
        <p className="mt-1 type-body-sm text-text-pri">{quote ? `"${quote}"` : '근거 문구 없음'}</p>
      )}
      <p className={clsx('mt-2 inline-flex items-center gap-1 type-caption', matched ? 'text-text-sec' : 'text-danger-text')}>
        {matched ? <CircleCheck size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
        {matched ? `${subject} 원문 일치` : `${subject} 원문에서 미확인`}
      </p>
      {conflict && (
        <p className="mt-2 flex items-start gap-1 type-caption text-danger-text">
          <CircleAlert size={16} aria-hidden="true" />등급과 특이사항 불일치, 확인 필요
        </p>
      )}
      {transcript && (
        <Disclosure detailsRef={detailsRef} className="mt-3" summary={`${subject} 원문 보기`}>
          <p className="type-meta leading-relaxed text-text-sec"><Highlighted transcript={transcript} quote={quote} markRef={markRef} /></p>
        </Disclosure>
      )}
    </aside>
  )
}
