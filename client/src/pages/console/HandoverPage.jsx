// 소방 인계(IA 4.7). 구조 대상(기한 안 미이송) = 배정 결과 미배정 + 이송 실패 + 이미 소방 인계한 대상자.
// 선택 후 일괄 인계, CSV 내보내기, 인쇄, 전달 기록.
// 현직 소방관 인터뷰(2026. 10. 24.) 반영: 기준 시각을 숫자 옆에, 가장 급한 사람 먼저, 상세 위치와 엘리베이터와 보호자 연락처,
// 명부 마지막 확인, 소방 용어(구조 대상, 거동불편). 목록 계산은 lib/handoverRows.js
import { useMemo, useState } from 'react'
import { Ambulance, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import PublicFactsCard from '../../components/miri/PublicFactsCard.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import TableCard from '../../components/dashboard/TableCard.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import Button from '../../components/ui/Button.jsx'
import Checkbox from '../../components/ui/Checkbox.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import ExportButton from '../../components/ui/ExportButton.jsx'
import useNow from '../../hooks/useNow.js'
import useToast from '../../hooks/useToast.js'
import { UNSERVED_REASON } from '../../lib/assign.js'
import { FAIL_REASONS, failReasonOf, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { TAGS } from '../../lib/intake.js'
import { gradeOf } from '../../lib/shortage.js'
import { STALE_DAYS, buildHandoverRows, handoverCsvColumns } from '../../lib/handoverRows.js'
import { dispatchBasisText } from '../../lib/basis.js'
import { fmtDateTime, fmtHM } from '../../lib/time.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const REASON = { ...UNSERVED_REASON, ...FAIL_REASONS }

export default function HandoverPage() {
  const d = useDispatchStore()
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  const privateInfo = useMiriStore((s) => s.privateInfo)
  const today = useMiriStore((s) => s.today)
  const orgName = useMiriStore((s) => s.settings.orgName)
  const now = useNow()
  const toast = useToast()
  const [selected, setSelected] = useState(() => new Set())

  const dname = (code) => dongs.find((x) => x.code === code)?.name || code

  const rows = useMemo(() => {
    if (!d.result) return []
    const stops = indexStops(d.result)
    const entries = []
    const add = (code, reasonKey, status) => entries.push({
      code, reason: REASON[reasonKey] || '미상', status, at: d.events[code]?.at, care: d.events[code]?.care || null
    })
    for (const code of Object.keys(d.events)) if (d.events[code].step === 'handedToFire') add(code, d.events[code].reason, 'handedToFire')
    for (const p of persons) if (stepOf(d, p.code, now, stops) === 'fail') add(p.code, failReasonOf(d, p.code), 'fail')
    for (const u of d.result.unassigned) add(u.personCode, u.reason, 'unassigned')
    // 같은 대상자는 처음 들어온 상태(소방 인계, 이송 실패, 미배정 순)만 남기고, 가장 급한 사람 먼저 정렬
    return buildHandoverRows({
      entries, persons, villages, privateInfo, arrivals: d.arrivals, now: today,
      dongName: dname, tagText: (t) => TAGS[t] || t
    })
  }, [d, persons, villages, privateInfo, today, now]) // eslint-disable-line react-hooks/exhaustive-deps

  const waiting = rows.filter((r) => r.status !== 'handedToFire')
  const handed = rows.length - waiting.length
  const picked = waiting.filter((r) => selected.has(r.code)).map((r) => r.code)

  const toggle = (code) => setSelected((s) => {
    const n = new Set(s)
    if (n.has(code)) n.delete(code)
    else n.add(code)
    return n
  })
  const allOn = waiting.length > 0 && picked.length === waiting.length

  const columns = [
    {
      key: 'code', label: '대상자', sortable: true,
      render: (r) => (r.status === 'handedToFire'
        ? <span className="tabular-nums">{r.code}</span>
        : (
          <span className="inline-flex items-center gap-1">
            <Checkbox checked={selected.has(r.code)} onChange={() => toggle(r.code)} label={`${r.code} 선택`} srOnlyLabel />
            <span className="tabular-nums">{r.code}</span>
          </span>
        ))
    },
    { key: 'village', label: '마을(동)', sortable: true, render: (r) => <span>{r.village}<span className="block type-meta text-text-meta">{r.dong}</span></span> },
    { key: 'arrival', label: '산불 도달', sortable: true, render: (r) => <span className="tabular-nums">{fmtHM(r.arrival)}</span>, sortValue: (r) => r.arrival ?? Infinity },
    {
      key: 'grade', label: '등급(거동)', sortValue: (r) => gradeOf(r.grade)?.weight * -1,
      render: (r) => <span className="inline-flex flex-col gap-0.5"><GradeChip grade={r.grade} size="sm" /><span className="type-meta text-text-meta">{r.gradeTerm}</span></span>
    },
    { key: 'location', label: '상세 위치(동호수, 층)', render: (r) => <span className="type-body-sm">{r.location}</span> },
    { key: 'elevator', label: '엘리베이터', hideBelow: 'md' },
    { key: 'guardianPhone', label: '보호자 연락처', render: (r) => <span className="tabular-nums">{r.guardianPhone}</span> },
    { key: 'crew', label: '필요 대원 수', render: (r) => <span className="type-body-sm">{r.crew}</span> },
    { key: 'device', label: '의료기기', hideBelow: 'md' },
    { key: 'pet', label: '반려동물', hideBelow: 'md' },
    { key: 'address', label: '주소(가상)', hideBelow: 'lg', render: (r) => <span className="type-body-sm text-text-sec">{r.address}</span> },
    {
      key: 'checked', label: '명부 마지막 확인', hideBelow: 'md', sortValue: (r) => r.checked.days ?? Infinity,
      render: (r) => <span className={r.checked.stale ? 'type-strong text-danger-text' : 'text-text-sec'}>{r.checked.text}{r.checked.stale && r.checked.days != null ? ', 재확인 필요' : ''}</span>
    },
    { key: 'tags', label: '특이사항', render: (r) => r.tags || '-', hideBelow: 'lg' },
    { key: 'reason', label: '사유' },
    {
      key: 'care', label: '증상 시각, 관찰, 조치', hideBelow: 'lg',
      render: (r) => (r.care ? <span className="type-body-sm text-text-sec">{[r.care.symptomAt && `${r.care.symptomAt} 발생`, r.care.observation, r.care.action && `조치: ${r.care.action}`].filter(Boolean).join(', ')}</span> : '-')
    },
    { key: 'status', label: '상태', render: (r) => <StatusPill status={r.status} label={r.status === 'handedToFire' ? `소방 인계 ${fmtHM(r.at)}` : undefined} /> }
  ]
  const baseAt = d.result?.basis?.at
  const csvCols = handoverCsvColumns(baseAt)

  const live = ['assigned', 'sent'].includes(d.status) && d.result

  return (
    <PageShell title="소방 인계" desc="기한 안에 옮기지 못한 구조 대상(거동불편자)을 동해소방서에 넘기고, 넘긴 기록을 남깁니다.">
      {!live ? (
        <Card as="div" padding="none">
          <EmptyState
            title="진행 중인 발령이 없습니다"
            desc={d.status === 'standby' ? '추천 배정을 계산하면 목록이 생성됩니다.' : '발령을 개시하면 목록이 생성됩니다.'}
            action={<Button as={Link} to="/console/dispatch">발령 운영</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-4">
            <MetricCard label="목록 기준 시각" value={fmtHM(baseAt)} sub={`${dispatchBasisText(d.result.basis)}. 이송 실패는 들어오는 대로 추가`} />
            <MetricCard label="구조 대상 인계 대기" value={waiting.length} unit="명" tone={waiting.length ? 'danger' : 'neutral'} sub={`${fmtHM(baseAt)} 기준`} />
            <MetricCard label="인계 완료" value={handed} unit="명" />
            <MetricCard label="전달 횟수" value={d.handovers.length} unit="회" sub={d.status === 'assigned' ? '배정 확정 전이므로 미배정 예상 목록입니다.' : undefined} />
          </div>

          <TableCard
            title="구조 대상(기한 안 미이송)" count={`${rows.length}명`}
            desc={`${fmtHM(baseAt)} 기준. 가장 급한 사람 먼저: 산불 도달이 빠른 마을, 등급이 무거운 순(소방 인계 완료는 아래). 명부 마지막 확인이 ${STALE_DAYS}일을 넘으면 빨간 글자`}
            actions={(
              <>
                <Button variant="ghost" size="sm" disabled={!waiting.length} onClick={() => setSelected(allOn ? new Set() : new Set(waiting.map((r) => r.code)))}>
                  {allOn ? '선택 해제' : '전체 선택'}
                </Button>
                <ExportButton size="sm" columns={csvCols} rows={rows} filename={`${orgName}_소방인계_${fmtDateTime(now).replace(/[ .:]/g, '')}`} />
                <Button variant="secondary" size="sm" leftIcon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>인쇄</Button>
                <Button
                  variant="danger" size="sm" disabled={!picked.length} leftIcon={<Ambulance size={16} aria-hidden="true" />}
                  onClick={() => { d.handover(picked); setSelected(new Set()); toast(`동해소방서 인계: ${picked.length}명`, 'primary') }}
                >
                  {picked.length ? `선택 ${picked.length}명 소방 인계` : '소방 인계'}
                </Button>
              </>
            )}
            columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={20} caption="구조 대상(기한 안 미이송) 목록"
            emptyTitle="구조 대상(기한 안 미이송)이 없습니다" emptyDesc="전원 기한 내 이송이 진행 중입니다."
          />

          <PublicFactsCard only="er" />

          <Card title="전달 기록" meta={`${d.handovers.length}회`}>
            {d.handovers.length ? (
              <ul className="divide-y divide-line-sub">
                {d.handovers.map((h, i) => (
                  <li key={`${h.at}-${i}`} className="flex flex-wrap items-center gap-3 py-3">
                    <span className="type-strong text-text-pri tabular-nums">{fmtDateTime(h.at)}</span>
                    <span className="type-body-sm text-text-sec">{h.receiver}</span>
                    <span className="type-body-sm text-text-sec tabular-nums">{h.codes.length}명</span>
                    <span className="min-w-0 basis-full truncate type-meta text-text-meta tabular-nums">{h.codes.join(' ')}</span>
                  </li>
                ))}
              </ul>
            ) : <p className="type-body-sm text-text-meta">전달 기록이 없습니다.</p>}
          </Card>
        </div>
      )}
    </PageShell>
  )
}
