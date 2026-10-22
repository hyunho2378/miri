// 도우미 면 대상자 카드(COMPONENTS 3절). 현재 카드만 펼침, 완료 카드는 접힘 + 완료 시각.
// 주소와 보호자 연락처는 발령 기간에만 표시(SOURCE B 개인정보 설계).
import clsx from 'clsx'
import { ChevronDown, MapPin, Phone } from 'lucide-react'
import { STEP_LABEL, FAIL_REASONS } from '../../lib/dispatchSim.js'
import { TAGS } from '../../lib/intake.js'
import { gradeOf } from '../../lib/shortage.js'
import { fmtHM } from '../../lib/time.js'
import { personCare } from '../../lib/tripChecks.js'
import StatusPill from '../dashboard/StatusPill.jsx'
import Badge from '../ui/Badge.jsx'
import Card from '../ui/Card.jsx'
import GradeChip from './GradeChip.jsx'

const DONE = new Set(['handover', 'fail', 'handedToFire'])

export default function HelperAssignmentCard({
  order, person, step, info, villageLabel, shelterName, tripIndex,
  current = false, expanded = false, onToggle, doneAt, failReason, routeCheck = false
}) {
  const done = DONE.has(step)
  const open = current || expanded
  const g = gradeOf(person.grade)
  const tags = (person.tags || []).filter((t) => t !== 'bedridden').map((t) => TAGS[t]).filter(Boolean)
  const care = personCare(person)
  return (
    <Card as="li" padding="none">
      <button
        type="button" onClick={current ? undefined : onToggle} aria-expanded={open}
        disabled={current}
        className="flex w-full items-center gap-3 p-4 min-h-14 text-left disabled:cursor-default"
      >
        <span className={clsx(
          'inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-full type-body-strong tabular-nums',
          current ? 'bg-primary text-text-inverse' : 'bg-mute text-text-sec'
        )}>{order}</span>
        <span className="min-w-0 flex-1">
          <span className="flex flex-wrap items-center gap-2">
            <span className="type-h3 text-text-pri tabular-nums">{person.code}</span>
            {current && <Badge tone="primary">현재</Badge>}
          </span>
          <span className="mt-0.5 flex flex-wrap items-center gap-2">
            <GradeChip grade={person.grade} />
            <span className="type-body-sm text-text-sec">{tripIndex}회차</span>
          </span>
        </span>
        <span className="flex shrink-0 flex-col items-end gap-1">
          <StatusPill status={step} label={step === 'fail' && failReason ? `실패 ${FAIL_REASONS[failReason] || ''}` : STEP_LABEL[step]} />
          {done && doneAt && <span className="type-meta text-text-meta tabular-nums">{fmtHM(doneAt)}</span>}
        </span>
        {!current && <ChevronDown size={20} aria-hidden="true" className={clsx('shrink-0 text-text-meta transition-transform duration-fast', open && 'rotate-180')} />}
      </button>

      {open && (
        <div className="border-t border-line-sub px-4 pb-4 pt-3 space-y-3">
          <div className="flex items-start gap-2">
            <MapPin size={20} aria-hidden="true" className="mt-1 shrink-0 text-text-meta" />
            <div className="min-w-0">
              <p className="type-body text-text-pri">{info?.address || '주소 정보가 없습니다.'}</p>
              <p className="type-body-sm text-text-sec">출발 {villageLabel}, 도착 {shelterName}</p>
            </div>
          </div>
          {info?.guardianPhone && (
            <a
              href={`tel:${info.guardianPhone}`}
              className="pressable flex items-center gap-2 min-h-11 rounded-md bg-mute px-3 type-body text-text-pri hover:bg-line-sub"
            >
              <Phone size={20} aria-hidden="true" className="text-primary" />
              보호자에게 전화 <span className="tabular-nums">{info.guardianPhone}</span>
            </a>
          )}
          {routeCheck && (
            <p role="note" className="rounded-md bg-warning-soft px-3 py-2 type-body-sm text-warning-text">경로 확인 필요. 집결지와 대피소를 잇는 직선이 산불 영향 범위를 지남(직선 기준, 도로 경로 아님). 출발 전 담당자 확인</p>
          )}
          <div>
            <p className="type-caption text-text-sec">동행과 소통</p>
            <ul className="mt-1 space-y-1 type-body text-text-pri">
              <li>평소 돌봄 담당자: {care.caregiverType}{care.caregiverType !== '없음' && care.caregiverType !== '확인 필요' ? `, ${care.reachableLabel}` : ''}</li>
              {care.companionCall && <li className="text-primary-text">동행 연락 필요. 출발 전 돌봄 담당자에게 연락</li>}
              {care.caregiverUnreachable && <li className="text-warning-text">돌봄 담당자와 연락이 닿지 않습니다. 담당자에게 알려 주세요</li>}
              <li>의사소통 특성: {!care.known ? '확인 필요' : care.comm.length ? `${care.comm.join(', ')}, 천천히 짧게 설명` : '없음'}</li>
              <li>보조기구: {!care.known ? '확인 필요' : care.aids.length ? care.aids.join(', ') : '없음'}</li>
            </ul>
          </div>
          <div>
            <p className="type-caption text-text-sec">필요 차량과 인력</p>
            <p className="mt-0.5 type-body text-text-pri">{g?.need}</p>
          </div>
          <div>
            <p className="type-caption text-text-sec">주의사항</p>
            {tags.length
              ? <ul className="mt-1 flex flex-wrap gap-2">{tags.map((t) => <li key={t} className="inline-flex items-center h-8 px-3 rounded-sm bg-mute type-body-sm text-text-pri">{t}</li>)}</ul>
              : <p className="mt-0.5 type-body text-text-meta">특이사항이 없습니다.</p>}
          </div>
        </div>
      )}
    </Card>
  )
}
