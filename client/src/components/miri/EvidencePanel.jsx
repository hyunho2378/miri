// 판독 근거(SourcePanel 구조 승계). 근거 문구, 원문 대조 결과, 일치도, 자동 판독 결과 라벨.
// 근거 문구가 전사문에 없으면 불일치로 표시하고 일치도는 lib/intake.verifyResult 가 하로 강제한다.
import clsx from 'clsx'
import { CircleAlert, CircleCheck, ScanText } from 'lucide-react'
import { CONF_LABEL } from '../../lib/intake.js'
import StatusPill from '../dashboard/StatusPill.jsx'
import Disclosure from '../ui/Disclosure.jsx'

function Highlighted({ transcript, quote }) {
  const i = quote ? transcript.indexOf(quote) : -1
  if (i < 0) return <span>{transcript}</span>
  return (
    <span>
      {transcript.slice(0, i)}
      <mark className="bg-primary-soft text-primary-text rounded-xs px-0.5">{quote}</mark>
      {transcript.slice(i + quote.length)}
    </span>
  )
}

export default function EvidencePanel({ quote, matched, confidence, conflict, transcript, docName, className }) {
  return (
    <aside className={clsx('rounded-md bg-subtle p-4 min-w-0', className)} aria-label="판독 근거">
      <div className="flex flex-wrap items-center gap-2">
        <span className="inline-flex items-center gap-1 type-caption text-primary-text">
          <ScanText size={16} aria-hidden="true" />자동 판독 결과
        </span>
        {confidence && <StatusPill status={confidence} label={`${CONF_LABEL[confidence]}`} />}
      </div>
      {docName && <p className="mt-2 type-meta text-text-meta">{docName}</p>}
      <p className="mt-3 type-caption text-text-sec">근거 문구</p>
      <p className="mt-1 type-body-sm text-text-pri">{quote ? `"${quote}"` : '근거 문구가 없습니다.'}</p>
      <p className={clsx('mt-2 inline-flex items-center gap-1 type-caption', matched ? 'text-text-sec' : 'text-danger-text')}>
        {matched ? <CircleCheck size={16} aria-hidden="true" /> : <CircleAlert size={16} aria-hidden="true" />}
        {matched ? '서류 원문과 일치합니다.' : '서류 원문에서 찾지 못한 문구입니다.'}
      </p>
      {conflict && (
        <p className="mt-1 inline-flex items-center gap-1 type-caption text-danger-text">
          <CircleAlert size={16} aria-hidden="true" />등급과 특이사항이 일치하지 않아 확인 필요로 분류했습니다.
        </p>
      )}
      {transcript && (
        <Disclosure className="mt-3" summary="서류 원문 보기">
          <p className="type-meta text-text-sec leading-relaxed"><Highlighted transcript={transcript} quote={quote} /></p>
        </Disclosure>
      )}
    </aside>
  )
}
