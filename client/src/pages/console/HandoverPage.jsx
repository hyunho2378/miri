// 소방 인계(IA 4.7). 미이송자 = 배정 결과 미배정 + 이송 실패 + 이미 소방 인계한 대상자.
// 선택 후 일괄 인계, CSV 내보내기, 인쇄, 전달 기록.
import { useMemo, useState } from 'react'
import { Ambulance, Printer } from 'lucide-react'
import { Link } from 'react-router-dom'
import Card from '../../components/ui/Card.jsx'
import GradeChip from '../../components/miri/GradeChip.jsx'
import MetricCard from '../../components/miri/MetricCard.jsx'
import PageShell from '../../components/miri/PageShell.jsx'
import DataTable from '../../components/dashboard/DataTable.jsx'
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
import { fmtDateTime, fmtHM } from '../../lib/time.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore from '../../store/useMiriStore.js'

const REASON = { ...UNSERVED_REASON, ...FAIL_REASONS }

export default function HandoverPage() {
  const d = useDispatchStore()
  const persons = useMiriStore((s) => s.persons)
  const villages = useMiriStore((s) => s.villages)
  const dongs = useMiriStore((s) => s.dongs)
  const orgName = useMiriStore((s) => s.settings.orgName)
  const now = useNow()
  const toast = useToast()
  const [selected, setSelected] = useState(() => new Set())

  const vmap = useMemo(() => Object.fromEntries(villages.map((v) => [v.code, v])), [villages])
  const dname = (code) => dongs.find((x) => x.code === code)?.name || code

  const rows = useMemo(() => {
    if (!d.result) return []
    const stops = indexStops(d.result)
    const pmap = Object.fromEntries(persons.map((p) => [p.code, p]))
    const out = []
    const seen = new Set()
    const push = (code, reasonKey, status) => {
      if (seen.has(code) || !pmap[code]) return
      seen.add(code)
      const p = pmap[code]
      const v = vmap[p.villageCode]
      out.push({
        code, grade: p.grade, dong: dname(v?.dongCode), village: v?.label || p.villageCode,
        tags: (p.tags || []).map((t) => TAGS[t] || t).join(' '), reason: REASON[reasonKey] || '미상', status,
        at: d.events[code]?.at
      })
    }
    for (const [code, ev] of Object.entries(d.events)) if (ev.step === 'handedToFire') push(code, ev.reason, 'handedToFire')
    for (const p of persons) if (stepOf(d, p.code, now, stops) === 'fail') push(p.code, failReasonOf(d, p.code), 'fail')
    for (const u of d.result.unassigned) push(u.personCode, u.reason, 'unassigned')
    const rank = { fail: 0, unassigned: 1, handedToFire: 2 }
    return out.sort((a, b) => rank[a.status] - rank[b.status] || a.code.localeCompare(b.code))
  }, [d, persons, vmap, now]) // eslint-disable-line react-hooks/exhaustive-deps

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
    { key: 'dong', label: '동', hideBelow: 'lg' },
    { key: 'village', label: '마을', sortable: true },
    { key: 'grade', label: '등급', render: (r) => <GradeChip grade={r.grade} size="sm" />, sortValue: (r) => gradeOf(r.grade)?.weight * -1 },
    { key: 'tags', label: '특이사항', render: (r) => r.tags || '-', hideBelow: 'md' },
    { key: 'reason', label: '사유' },
    { key: 'status', label: '상태', render: (r) => <StatusPill status={r.status} label={r.status === 'handedToFire' ? `소방 인계 ${fmtHM(r.at)}` : undefined} /> }
  ]
  const csvCols = [
    { key: 'code', label: '대상자 코드' }, { key: 'dong', label: '동' }, { key: 'village', label: '마을' },
    { key: 'grade', label: '등급', value: (r) => gradeOf(r.grade)?.label }, { key: 'tags', label: '특이사항' },
    { key: 'reason', label: '미이송 사유' }, { key: 'status', label: '상태', value: (r) => (r.status === 'handedToFire' ? '소방 인계' : r.status === 'fail' ? '이송 실패' : '미배정') }
  ]

  const live = ['assigned', 'sent'].includes(d.status) && d.result

  return (
    <PageShell title="소방 인계">
      {!live ? (
        <Card as="div" padding="none">
          <EmptyState
            title="진행 중인 발령 없음"
            desc={d.status === 'standby' ? 'AI 배정 실행 후 미이송자 목록 생성' : '발령 개시 후 배정 결과에서 미이송자 목록 생성'}
            action={<Button as={Link} to="/console/dispatch">발령 운영</Button>}
          />
        </Card>
      ) : (
        <div className="space-y-4">
          <div className="grid gap-3 grid-cols-2 lg:grid-cols-3">
            <MetricCard label="인계 대기" value={waiting.length} unit="명" tone={waiting.length ? 'danger' : 'neutral'} />
            <MetricCard label="인계 완료" value={handed} unit="명" />
            <MetricCard label="전달 횟수" value={d.handovers.length} unit="회" sub={d.status === 'assigned' ? '배정 확정 전. 미배정 예상 목록' : undefined} />
          </div>

          <Card
            title="미이송자 목록"
            desc="실패 건이 위. 선택 후 일괄 소방 인계"
            actions={(
              <>
                <Button variant="ghost" size="sm" disabled={!waiting.length} onClick={() => setSelected(allOn ? new Set() : new Set(waiting.map((r) => r.code)))}>
                  {allOn ? '선택 해제' : '전체 선택'}
                </Button>
                <ExportButton size="sm" columns={csvCols} rows={rows} filename={`${orgName}_소방인계_${fmtDateTime(now).replace(/[ .:]/g, '')}`} />
                <Button variant="secondary" size="sm" leftIcon={<Printer size={16} aria-hidden="true" />} onClick={() => window.print()}>인쇄</Button>
                <Button
                  variant="danger" size="sm" disabled={!picked.length} leftIcon={<Ambulance size={16} aria-hidden="true" />}
                  onClick={() => { d.handover(picked); setSelected(new Set()); toast(`${picked.length}명 동해소방서 인계`, 'primary') }}
                >
                  {picked.length ? `선택 ${picked.length}명 소방 인계` : '소방 인계'}
                </Button>
              </>
            )}
          >
            {rows.length
              ? <DataTable columns={columns} rows={rows} rowKey={(r) => r.code} pageSize={20} caption="미이송자 목록" />
              : <p className="type-body-sm text-text-meta">미이송자 없음. 전원 기한 내 이송 진행</p>}
          </Card>

          <Card title="전달 기록">
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
            ) : <p className="type-body-sm text-text-meta">전달 기록 없음</p>}
          </Card>
        </div>
      )}
    </PageShell>
  )
}
