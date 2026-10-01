// 담당자 인계. 완료 처리 시각이 H3(담당자 응대시간) 지표의 원천이다.
// 5-G 에서 AI 부서 제안과 답변 초안을 얹었다. 발송은 실행 확인 카드를 거친다(쓰기 게이트).
import { useEffect, useMemo, useState } from 'react'
import { ExternalLink, Sparkles, Wand2 } from 'lucide-react'
import { Link, useSearchParams } from 'react-router-dom'
import { useLang } from '../../i18n/LangContext.jsx'
import { get, post, put } from '../../lib/api.js'
import { formatDate, formatNumber } from '../../lib/format.js'
import useToast from '../../hooks/useToast.js'
import { useTopbar } from '../../store/useAdminUi.js'
import Badge from '../../components/ui/Badge.jsx'
import Button from '../../components/ui/Button.jsx'
import EmptyState from '../../components/ui/EmptyState.jsx'
import Select from '../../components/ui/Select.jsx'
import Skeleton from '../../components/ui/Skeleton.jsx'
import Tabs from '../../components/ui/Tabs.jsx'
import Textarea from '../../components/ui/Textarea.jsx'
import StatusPill from '../../components/dashboard/StatusPill.jsx'
import ActionCard from '../../components/chat/agent/ActionCard.jsx'
import ResultCard from '../../components/chat/agent/ResultCard.jsx'
import ToolCard from '../../components/chat/agent/ToolCard.jsx'

const TABS = ['wait', 'progress', 'done']

// 문의 내용에서 부서를 고르는 규칙. 지어낸 추천이 아니라 키워드와 시설에서 나온다
const KEYWORDS = [
  ['환불', /환불|취소|결제/],
  ['예약', /예약|자리|시간대/],
  ['주차', /주차|차량|경차/],
  ['시설', /고장|파손|청소|온도|시설/]
]

function suggestDepartment(row, facility) {
  const hit = KEYWORDS.find(([, re]) => re.test(row.content || ''))
  return { department: facility?.department || '', keyword: hit ? hit[0] : (row.content || '').slice(0, 6) }
}

export default function HandoffPage() {
  const { t } = useLang()
  const toast = useToast()
  const [params, setParams] = useSearchParams()
  const tab = TABS.includes(params.get('tab')) ? params.get('tab') : 'wait'
  const [rows, setRows] = useState(null)
  const [failed, setFailed] = useState(false)
  const [reload, setReload] = useState(0)
  const [facilities, setFacilities] = useState([])
  const [patch, setPatch] = useState({})

  useTopbar({ title: t('admin.handoff.title') })

  useEffect(() => {
    let alive = true
    get('/api/admin/facilities').then((f) => { if (alive) setFacilities(f) }).catch(() => {})
    return () => { alive = false }
  }, [])

  useEffect(() => {
    let alive = true
    setRows(null)
    get(`/api/admin/handoff?status=${tab}`).then((r) => { if (alive) setRows(r) }).catch(() => { if (alive) setFailed(true) })
    return () => { alive = false }
  }, [tab, reload])

  const [ai, setAi] = useState({})        // { [id]: { node, draft, action, sent } }
  const facilityById = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f])), [facilities])
  const facilityName = useMemo(() => Object.fromEntries(facilities.map((f) => [f.id, f.name])), [facilities])
  // 부서 목록은 시설 데이터에서 온다. 화면에 부서명을 박지 않는다
  const departments = useMemo(() => [...new Set(facilities.map((f) => f.department))].filter(Boolean), [facilities])

  const setTab = (next) => {
    const p = new URLSearchParams(params)
    p.set('tab', next)
    setParams(p)
  }

  // 서버가 돌려준 객체로 갱신한다. 완료 처리 시간(H3)은 서버가 계산해 보낸다.
  // 상태가 지금 보고 있는 탭과 달라지면 목록에서 뺀다. 남아 있으면 탭이 거짓말을 한다
  const update = async (row, body, opts = {}) => {
    try {
      const saved = await put(`/api/admin/handoff/${row.id}`, body)
      setPatch((prev) => ({ ...prev, [row.id]: saved }))
      if (saved.status && saved.status !== tab) {
        // 발송 직후에는 결과 카드를 볼 시간을 준 뒤 목록에서 뺀다.
        // 바로 빼면 사용자가 무엇이 나갔는지 확인할 수 없다
        const drop = () => setRows((prev) => prev.filter((r) => r.id !== row.id))
        if (opts.defer) setTimeout(drop, 2600)
        else drop()
      }
      toast(t('admin.handoff.saved'), 'primary')
    } catch (e) {
      toast(e.error?.message || t('common.error.network'), 'danger')
    }
  }

  const setAiState = (id, patch) => setAi((prev) => ({ ...prev, [id]: { ...prev[id], ...patch } }))

  // 답변 초안. 근거는 시설 데이터에서 온다. 발송은 아래 실행 확인 카드를 거쳐야 한다
  const makeDraft = (row) => {
    const f = facilityById[row.facilityId]
    setAiState(row.id, {
      node: { kind: 'tool', id: `d-${row.id}`, tool: 'knowledge', phase: 'running', label: t('admin.handoffAi.drafting'), detail: row.content?.slice(0, 24) }
    })
    setTimeout(() => {
      const body = t('admin.handoffAi.draftBody', {
        facility: f?.name || '',
        answer: f?.guide || t('admin.handoffAi.draftFallback'),
        dept: f?.department || '',
        phone: f?.phone || ''
      })
      setAiState(row.id, {
        node: { kind: 'tool', id: `d-${row.id}`, tool: 'knowledge', phase: 'done', label: t('admin.handoffAi.drafting'), summary: t('admin.handoffAi.draftDone') },
        draft: body,
        action: {
          kind: 'action', id: `s-${row.id}`, tool: 'handoff', op: 'reply', status: 'awaiting',
          confirmLabel: 'admin.handoffAi.sendConfirmFull',
          title: t('admin.handoffAi.sendTitle'),
          lines: [`${t('admin.handoffAi.sentTo')} ${row.name} ${row.phone}`]
        }
      })
    }, 1000)
  }

  // 발송하면 상태가 완료로 바뀌고 서버가 처리 시간을 기록한다(H3)
  const send = async (row, approve) => {
    const state = ai[row.id]
    if (!approve) {
      setAiState(row.id, { action: { ...state.action, status: 'declined' } })
      return
    }
    // 발송은 전용 라우트다. 서버가 완료 처리와 처리 시간 기록을 함께 한다(H3)
    setAiState(row.id, { action: { ...state.action, status: 'approved' } })
    try {
      const saved = await post(`/api/admin/handoff/${row.id}/reply`, { body: state.draft })
      setPatch((prev) => ({ ...prev, [row.id]: saved }))
      setAiState(row.id, { sent: saved })
      toast(t('admin.handoff.saved'), 'primary')
      if (saved.status !== tab) setTimeout(() => setRows((prev) => prev.filter((r) => r.id !== row.id)), 2600)
    } catch (e) {
      setAiState(row.id, { action: { ...state.action, status: 'awaiting' } })
      toast(e.error?.message || t('common.error.network'), 'danger')
    }
  }

  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-5">
      <Tabs
        value={tab} onChange={setTab}
        items={TABS.map((v) => ({ value: v, label: t(`admin.handoff.tab${v[0].toUpperCase()}${v.slice(1)}`) }))}
      />

      {failed ? (
        <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
      ) : rows === null ? (
        <div className="space-y-3">{[0, 1, 2].map((i) => <Skeleton key={i} variant="card" />)}</div>
      ) : rows.length === 0 ? (
        <EmptyState title={t(`admin.handoff.empty${tab[0].toUpperCase()}${tab.slice(1)}`)} desc={t('common.empty.filterDesc')} />
      ) : (
        <ul className="space-y-3">
          {rows.map((r) => {
            const state = { ...r, ...patch[r.id] }
            return (
              <li key={r.id} className="bg-page rounded-lg shadow-card p-4 lg:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="min-w-0">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="type-meta text-text-meta tabular-nums">{formatDate(r.createdAt, 'datetime')}</span>
                      <StatusPill size="sm" status={state.status} label={t(`common.status.${state.status}`)} />
                      {facilityName[r.facilityId] && <span className="type-meta text-text-meta">{facilityName[r.facilityId]}</span>}
                    </div>
                    <p className="mt-2 type-body text-text-pri">{r.content}</p>
                    <dl className="mt-3 flex flex-wrap gap-x-6 gap-y-1">
                      <div className="flex gap-2">
                        <dt className="type-caption text-text-meta">{t('admin.handoff.colName')}</dt>
                        <dd className="type-body-sm text-text-sec">{r.name}</dd>
                      </div>
                      <div className="flex gap-2">
                        <dt className="type-caption text-text-meta">{t('admin.handoff.contact')}</dt>
                        <dd className="type-body-sm">
                          <a href={`tel:${r.phone}`} className="text-primary hover:text-primary-hover transition-colors duration-fast">{r.phone}</a>
                        </dd>
                      </div>
                      {state.handleMinutes != null && (
                        <div className="flex gap-2">
                          <dt className="type-caption text-text-meta">{t('admin.handoff.handleMinutes')}</dt>
                          <dd className="type-body-sm text-text-sec tabular-nums">
                            {formatNumber(state.handleMinutes)}{t('admin.unit.minute')}
                          </dd>
                        </div>
                      )}
                    </dl>
                  </div>

                  {r.logId && (
                    <Button
                      as={Link} to={`/admin/logs?id=${r.logId}`} size="sm" variant="secondary"
                      rightIcon={<ExternalLink size={16} aria-hidden="true" />}
                    >
                      {t('admin.handoff.sourceChat')}
                    </Button>
                  )}
                </div>

                {/* AI 제안 부서. 규칙은 문의 내용 키워드와 시설이다 */}
                {!state.department && (() => {
                  const s = suggestDepartment(r, facilityById[r.facilityId])
                  if (!s.department) return null
                  return (
                    <div className="mt-3 flex flex-wrap items-center gap-2 rounded-md bg-subtle px-3 py-2">
                      <Sparkles size={16} aria-hidden="true" className="shrink-0 text-text-meta" />
                      <span className="type-caption text-text-meta">{t('admin.handoffAi.suggest')}</span>
                      <Badge>{s.department}</Badge>
                      <span className="min-w-0 type-meta text-text-meta truncate">
                        {t('admin.handoffAi.because', { facility: facilityName[r.facilityId] || '', keyword: s.keyword })}
                      </span>
                      <Button size="sm" variant="secondary" className="ml-auto" onClick={() => update(r, { department: s.department })}>
                        {t('admin.handoffAi.apply')}
                      </Button>
                    </div>
                  )
                })()}

                {/* 답변 초안 → 발송 확인 게이트. 승인 전에는 아무것도 나가지 않는다 */}
                {tab !== 'done' && (
                  <div className="mt-3 space-y-3">
                    {!ai[r.id] && (
                      <Button size="sm" variant="secondary" leftIcon={<Wand2 size={16} aria-hidden="true" />} onClick={() => makeDraft(r)}>
                        {t('admin.handoffAi.draft')}
                      </Button>
                    )}
                    {ai[r.id]?.node && <ToolCard node={ai[r.id].node} />}
                    {ai[r.id]?.draft && (
                      <Textarea
                        rows={5} label={t('admin.handoffAi.draftLabel')} value={ai[r.id].draft}
                        onChange={(e) => setAiState(r.id, { draft: e.target.value })}
                      />
                    )}
                    {ai[r.id]?.action && !ai[r.id].sent && (
                      <ActionCard action={ai[r.id].action} onResolve={(approve) => send(r, approve)} />
                    )}
                    {ai[r.id]?.sent && (
                      <ResultCard result={{ ticket: {
                        ticketId: ai[r.id].sent.id,
                        department: ai[r.id].sent.department || facilityById[r.facilityId]?.department || '',
                        phone: ai[r.id].sent.phone,
                        hours: t('admin.handoffAi.sentTitle')
                      } }} />
                    )}
                  </div>
                )}

                <div className="mt-4 flex flex-wrap items-end gap-3 border-t border-line-sub pt-4">
                  <Select
                    compact className="w-full sm:w-64" label={t('admin.handoff.assign')}
                    value={state.department || ''}
                    onChange={(v) => update(r, { department: v })}
                    placeholder={t('admin.handoff.unassigned')}
                    options={departments.map((d) => ({ value: d, label: d }))}
                  />
                  <Select
                    compact className="w-full sm:w-52" label={t('admin.handoff.changeStatus')}
                    value={state.status}
                    onChange={(v) => update(r, { status: v })}
                    options={TABS.map((v) => ({ value: v, label: t(`common.status.${v}`) }))}
                  />
                </div>
              </li>
            )
          })}
        </ul>
      )}
    </div>
  )
}
