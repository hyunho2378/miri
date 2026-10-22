// 현장 담당자 휴대폰 화면(docs/MOBILE_UI.md 4장). 콘솔과 같은 store를 쓰고 플랫폼 모양은 공용 부품이 나눈다.
// 재설계 2b(공모전/모바일UI/퍼소나_사용성진단_20261022.md 8-3, 벤치마크_20261022.md, 부품표_20261022.md):
// 한 화면 한 일. 누구 화면인지 한 줄, 큰 숫자 하나, 할 일 목록 행. 문단과 칩, 카드, 안내 띠는 쓰지 않는다(키트에 없는 덩어리).
// 평시 홈(할 일), 발령 홈(늦는 마을), 확인할 서류(목록과 한 건), 확인할 소식, 서류 올리기, 소식 남기기, 마을, 도우미, 소방 요청, 대상자, 더보기
import { useEffect, useMemo, useRef, useState } from 'react'
import { useNavigate, useParams } from 'react-router-dom'
import { Camera, Clock, Flame, Info, PhoneOutgoing, Truck, UserCheck, FileText, MessageSquare, Search, Users, Play } from 'lucide-react'
import { useRealNow } from '../../hooks/useNow.js'
import useOpenData from '../../hooks/useOpenData.js'
import { useDispatchStore } from '../../store/useDispatchStore.js'
import { activeScenario, useMiriStore } from '../../store/useMiriStore.js'
import useAuthStore, { ROLE_LABEL } from '../../store/useAuthStore.js'
import { vnowOf, FAIL_REASONS, DECLINE_REASONS } from '../../lib/dispatchSim.js'
import { computeShortage } from '../../lib/shortageCalc.js'
import { OWNERS, COMMITMENTS, GRADES, commitmentOf, gradeOf } from '../../lib/shortage.js'
import { personCare, ROUTE_NOTE } from '../../lib/tripChecks.js'
import { readDocument, verifyResult } from '../../lib/intake.js'
import { readNote, sourceLabel } from '../../lib/notes.js'
import { AI_CARD, NOT_ENTERED, placeLine, reviewReasons } from '../../lib/aiCard.js'
import { aiErrorMessage } from '../../lib/aiErrors.js'
import { AppBar, DisplaySettings, Button, Dialog, EmptyState, Figure, FilledInput, FilledTextarea, InfoSheet, List, ListRow, Progress, Segmented, Sheet, Spinner, Toggle, useMobileToast } from '../ui.jsx'
import { ACTIVE, failedPending, scopeDispatch, fieldSummary, helperResponses, hm, searchPersons, stepLabel, unservedByReason, villageName, villageProgress, deadlineTag, scopedShortage, lateVillages, docQueue, noteQueue } from './fieldModel.js'

// 발령 복원과 10초 주기 조회(콘솔 발령 운영과 같은 방식)
function useDispatchLive() {
  const d = useDispatchStore()
  const restoreRemote = useDispatchStore((s) => s.restoreRemote)
  const pollReports = useDispatchStore((s) => s.pollReports)
  useEffect(() => { restoreRemote?.() }, [restoreRemote])
  useEffect(() => {
    if (d.status !== 'sent') return undefined
    pollReports?.()
    const t = setInterval(() => pollReports?.(), 10_000)
    return () => clearInterval(t)
  }, [d.status, pollReports])
  // 실제 시각을 받아 한 번만 가상 시각으로 바꾼다(배속 이중 적용으로 경과 시간이 커지던 문제)
  const now = useRealNow(5000)
  return { d, vnow: d.realStart ? vnowOf(d, now) : now, now }
}

// 로그인한 담당자의 범위. 시 관리자는 전체, 동 담당자는 자기 동 마을만(콘솔 현황판과 명부의 동 범위와 같음)
function useFieldScope() {
  const user = useAuthStore((s) => s.user)
  const villages = useMiriStore((s) => s.villages)
  const isDong = user?.role === 'dong' && !!user.dong
  const codes = isDong ? new Set(villages.filter((v) => v.dongCode === user.dong).map((v) => v.code)) : null
  const inScope = (villageCode) => !codes || codes.has(villageCode)
  return { user, isDong, inScope, scopeDispatch: (d, persons) => scopeDispatch(d, persons, codes) }
}

// 평시 부족분(콘솔 현황판과 같은 계산 한 번). 대피 대상 구역 마을 코드도 같이 돌려준다
function usePeaceResult() {
  const data = useMiriStore()
  const scenario = activeScenario(data)
  const result = useMemo(() => computeShortage({ persons: data.persons, villages: data.villages, vehicles: data.vehicles, helpers: data.helpers, settings: data.settings, scenario, t0: data.today }), [data.persons, data.villages, data.vehicles, data.helpers, data.settings, scenario, data.today])
  const scopeCodes = useMemo(() => new Set(Object.keys(result.arrivals || {})), [result])
  return { data, scenario, result, scopeCodes }
}

// 누구 화면인지 한 줄(모든 홈 화면 큰 제목 아래)
function Who({ user, extra }) {
  return <p className="mob-t-callout mob-pad">미리 현장 담당자, {user?.name || '담당 공무원'}{extra ? `, ${extra}` : ''}</p>
}

const tagText = (tag) => (tag === 'over' ? '기한 지남' : tag === 'soon' ? '1시간 안' : null)
const Tag = ({ tone, children }) => <span className={`mob-t-callout ${tone === 'red' ? 'tone-red-text' : ''}`}>{children}</span>

// 홈: 발령이 없으면 평시 할 일, 발령 중이면 늦는 마을
export function FieldStatusPage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const scope = useFieldScope()
  const navigate = useNavigate()
  if (!ACTIVE.has(d.status)) return <PeaceHome closed={d.status === 'closed'} />
  const sc = scope.scopeDispatch(d, data.persons)
  const s = fieldSummary(sc.d, sc.persons, data.villages, vnow)
  const left = s.total - s.counts.done
  const pct = s.total ? (s.counts.done / s.total) * 100 : 0
  const late = lateVillages(villageProgress(sc.d, sc.persons, data.villages, vnow), vnow, 3)
  const notMoved = s.counts.fail + s.counts.unassigned
  const u = unservedByReason(sc.d)
  return (
    <>
      <AppBar title="발령 진행" large />
      <main id="main" className="mob-content">
        <Who user={scope.user} extra={d.kind !== 'drill' ? '실제 발령' : '훈련'} />
        <Figure plain label="아직 옮기지 못한 사람" value={left} unit="명">
          <Progress value={pct} label="이송 완료 비율" />
          <p className="mob-t-callout">전체 {s.total}명 중 {s.counts.done}명 대피소 도착</p>
        </Figure>
        <List label="늦는 마을">
          {late.map((v) => (
            <ListRow key={v.code} lead={<Clock size={22} />} title={`${v.name} ${v.at ? `${hm(v.at)}까지` : ''}`.trim()} subtitle={`남은 사람 ${v.left}명`}
              trailing={tagText(v.tag) ? <Tag tone="red">{tagText(v.tag)}</Tag> : null} chevron onClick={() => navigate(`/m/f/villages/${v.code}`)} />
          ))}
          <ListRow title="모든 마을 보기" chevron onClick={() => navigate('/m/f/villages')} />
        </List>
        {notMoved > 0 && (
          <List label="아직 못 옮긴 사람">
            <ListRow lead={<PhoneOutgoing size={22} />} title={`차량이나 도우미가 없는 사람 ${u.total}명`} subtitle={scope.isDong ? '시 관리자가 동해소방서에 지원 요청' : '동해소방서 지원 요청 대상'} chevron onClick={() => navigate('/m/f/fire')} />
          </List>
        )}
        {scope.isDong ? null : u.total > 0 && <Button block variant="danger" onClick={() => navigate('/m/f/fire')}>동해소방서 지원 요청</Button>}
        {d.remote?.state !== 'saved' && <ServerLink remote={d.remote} />}
      </main>
    </>
  )
}

// 서버 연결 상태 한 줄. 세션이 끊기면(오류) 계정을 다시 고르는 행으로 보낸다(시연 코드 칸이 없는 막다른 안내 제거)
function ServerLink({ remote }) {
  const logout = useAuthStore((s) => s.logout)
  const navigate = useNavigate()
  if (remote?.state === 'error') {
    return (
      <List label="서버 연결">
        <ListRow title="다시 로그인" subtitle="서버에 연결하지 못해 이 휴대폰 안에서만 진행 중" chevron onClick={() => { logout(); navigate('/m/f') }} />
      </List>
    )
  }
  return <p className="mob-t-callout mob-pad">이 휴대폰 안에서만 진행 중</p>
}

// 평시 홈: 우리 범위 미이송 예상 숫자 하나, 그 아래 오늘 확인할 일
function PeaceHome({ closed }) {
  const { data, scenario, result, scopeCodes } = usePeaceResult()
  const scope = useFieldScope()
  const navigate = useNavigate()
  const fire = useOpenData('fire')
  const sh = scopedShortage(result, scope.inScope)
  const docs = docQueue(data.intakeDocs, data.persons, scope.inScope, scopeCodes)
  const notes = noteQueue(data.fieldNotes, scope.inScope)
  return (
    <>
      <AppBar title="오늘 할 일" large />
      <main id="main" className="mob-content">
        <Who user={scope.user} extra={closed ? '발령 종료' : null} />
        <Figure plain label={`${scope.isDong ? '우리 동' : '동해시'} 미이송 예상, ${scenario?.name || '기준 시나리오'}`} value={sh.unserved ?? '-'} unit="명">
          <p className="mob-t-callout">대피 대상 {sh.villages}개 마을 {sh.targets}명 중</p>
        </Figure>
        <List label="확인할 일">
          <ListRow lead={<FileText size={22} />} title={`확인할 서류 ${docs.length}건`} subtitle={docs.length ? 'AI가 읽은 등급을 원본과 맞춰 확정' : '모두 확인함'} chevron onClick={() => navigate('/m/f/docs')} />
          <ListRow lead={<MessageSquare size={22} />} title={`확인할 현장 소식 ${notes.length}건`} subtitle={notes.length ? '돌봄 담당자가 전한 상태 변화' : '모두 확인함'} chevron onClick={() => navigate('/m/f/notes')} />
        </List>
        <List label="보내기">
          <ListRow lead={<Camera size={22} />} title="서류 사진 올리기" chevron onClick={() => navigate('/m/f/intake')} />
          <ListRow lead={<UserCheck size={22} />} title="현장 소식 남기기" chevron onClick={() => navigate('/m/f/note')} />
        </List>
        <List label="오늘 산불 여건">
          <ListRow lead={<Flame size={22} />} title={fire.data ? `산불위험지수 최고 ${fire.data.max}` : fire.loading ? '산불위험지수 조회 중' : '산불위험지수 조회 실패'} subtitle={fire.data ? `평균 ${fire.data.mean}, 산림청` : undefined} />
        </List>
      </main>
    </>
  )
}

// 확인할 서류 목록
export function FieldDocsPage() {
  const { data, scopeCodes } = usePeaceResult()
  const scope = useFieldScope()
  const navigate = useNavigate()
  const list = docQueue(data.intakeDocs, data.persons, scope.inScope, scopeCodes)
  return (
    <>
      <AppBar title="확인할 서류" onBack={() => navigate('/m/f')} backLabel="홈" />
      <main id="main" className="mob-content">
        {!list.length ? <EmptyState title="확인할 서류 없음" action={<Button variant="tonal" onClick={() => navigate('/m/f/intake')}>서류 사진 올리기</Button>} /> : (
          <List label="확인할 서류">
            {list.map((q) => {
              const v = verifyResult(q.doc.transcript || '', q.result)
              return <ListRow key={q.person.code} title={q.person.code} subtitle={`${villageName(data.villages, q.person.villageCode)}, AI 초안 ${gradeOf(v.aiGrade)?.label || '판독 불가'}`}
                trailing={v.quoteMatched ? null : <Tag tone="red">원본 확인</Tag>} chevron onClick={() => navigate(`/m/f/docs/${q.person.code}`)} />
            })}
          </List>
        )}
      </main>
    </>
  )
}

// 확인할 서류 한 건: 근거 문구 한 줄과 AI 초안 등급, 주 버튼 '이 등급으로 확정', 보조 '다른 등급'
export function FieldDocPage() {
  const { code } = useParams()
  const { data, scopeCodes } = usePeaceResult()
  const scope = useFieldScope()
  const navigate = useNavigate()
  const reviewResult = useMiriStore((s) => s.reviewResult)
  const toast = useMobileToast()
  const [pick, setPick] = useState(false)
  const list = docQueue(data.intakeDocs, data.persons, scope.inScope, scopeCodes)
  const i = list.findIndex((x) => x.person.code === code)
  const q = list[i]
  const next = () => navigate(list[i + 1] ? `/m/f/docs/${list[i + 1].person.code}` : '/m/f/docs', { replace: true })
  if (!q) return (<><AppBar title="서류 확인" onBack={() => navigate('/m/f/docs')} backLabel="목록" /><main className="mob-content"><EmptyState title="이미 확인한 서류" action={<Button variant="tonal" onClick={() => navigate('/m/f/docs')}>목록</Button>} /></main></>)
  const v = verifyResult(q.doc.transcript || '', q.result)
  const plan = gradeOf(q.person.grade)
  const confirm = () => { reviewResult(q.doc.id, q.person.code, 'confirm'); toast(`${q.person.code} ${plan?.label || ''} 확정`); next() }
  const edit = (g) => { reviewResult(q.doc.id, q.person.code, 'edit', { grade: g, tags: (q.person.tags || []).filter((t) => t !== 'gradeUncertain') }); toast(`${q.person.code} ${gradeOf(g)?.label} 확정`); setPick(false); next() }
  return (
    <>
      <AppBar title={q.person.code} onBack={() => navigate('/m/f/docs')} backLabel="목록" />
      <main id="main" className="mob-content">
        <Figure plain label={`${villageName(data.villages, q.person.villageCode)}, ${i + 1} / ${list.length}`} value={plan?.label || '확인 필요'} unit="">
          <p className="mob-t-callout">{q.person.grade !== v.aiGrade ? `AI 초안 ${gradeOf(v.aiGrade)?.label || '판독 불가'}, 확인 전까지 휠체어로 계산` : 'AI 초안과 같은 등급'}</p>
        </Figure>
        <List label="근거">
          <ListRow title={v.quote ? `“${v.quote}”` : '근거 문구 없음'} subtitle={v.quoteMatched ? '서류 원문에 있는 문구' : '원문에서 찾지 못함, 원본 사진 확인'} />
          {q.doc.image && <ListRow title="원본 사진 보기" chevron href={q.doc.image} target="_blank" rel="noreferrer" />}
        </List>
        {(() => { const rs = reviewReasons(v); return rs.length ? (
          <section className="mob-section" aria-label="확인할 까닭">
            <h2 className="mob-section-title">확인할 까닭</h2>
            <List label="확인할 까닭">{rs.map((r) => <ListRow key={r.key} title={r.label} />)}</List>
          </section>
        ) : null })()}
        <List label="AI 정보">
          <InfoSheet lead={<Info size={22} />} title="AI 정보" summary="하는 일, 시험 결과, 약점" sheetTitle="서류 읽기 AI 정보">
            {AI_CARD.map((sec) => (
              <section key={sec.title} className="mob-section" aria-label={sec.title}>
                <h3 className="mob-section-title">{sec.title}</h3>
                <List label={sec.title}>{sec.rows.map((r) => <ListRow key={r.k} title={r.k} subtitle={r.v} />)}</List>
              </section>
            ))}
          </InfoSheet>
        </List>
        <div className="mob-stack-8">
          <Button block onClick={confirm}>{plan?.label || '이 등급'}으로 확정</Button>
          <Button block variant="plain" onClick={() => setPick(true)}>다른 등급</Button>
        </div>
      </main>
      <Sheet open={pick} onClose={() => setPick(false)} title="등급 고르기">
        <List label="등급">
          {GRADES.map((g) => <ListRow key={g.key} title={g.label} subtitle={g.target} onClick={() => edit(g.key)} />)}
        </List>
      </Sheet>
    </>
  )
}

// 확인할 현장 소식 목록과 한 건
export function FieldNotesPage() {
  const data = useMiriStore()
  const scope = useFieldScope()
  const navigate = useNavigate()
  const list = noteQueue(data.fieldNotes, scope.inScope)
  return (
    <>
      <AppBar title="확인할 현장 소식" onBack={() => navigate('/m/f')} backLabel="홈" />
      <main id="main" className="mob-content">
        {!list.length ? <EmptyState title="확인할 소식 없음" action={<Button variant="tonal" onClick={() => navigate('/m/f/note')}>현장 소식 남기기</Button>} /> : (
          <List label="확인할 현장 소식">
            {list.map((n) => (
              <ListRow key={n.id} title={n.personCode} subtitle={`${sourceLabel(n.source)}, ${n.read?.diff?.gradeChanged ? `${gradeOf(n.current?.grade)?.label} → ${gradeOf(n.read.diff.next.grade)?.label}` : '등급 그대로'}`} chevron onClick={() => navigate(`/m/f/notes/${n.id}`)} />
            ))}
          </List>
        )}
      </main>
    </>
  )
}

export function FieldNoteReviewPage() {
  const { id } = useParams()
  const data = useMiriStore()
  const scope = useFieldScope()
  const navigate = useNavigate()
  const reviewFieldNote = useMiriStore((s) => s.reviewFieldNote)
  const toast = useMobileToast()
  const n = noteQueue(data.fieldNotes, scope.inScope).find((x) => x.id === id)
  if (!n) return (<><AppBar title="현장 소식" onBack={() => navigate('/m/f/notes')} backLabel="목록" /><main className="mob-content"><EmptyState title="이미 확인한 소식" /></main></>)
  const dif = n.read?.diff
  const nextGrade = dif?.next?.grade || n.current?.grade
  const apply = () => { reviewFieldNote(n.id, 'apply', { grade: nextGrade, tags: dif?.next?.tags || n.current?.tags || [] }); toast(`${n.personCode} 명부에 반영`); navigate('/m/f/notes', { replace: true }) }
  const reject = () => { reviewFieldNote(n.id, 'reject'); toast(`${n.personCode} 명부 그대로`); navigate('/m/f/notes', { replace: true }) }
  return (
    <>
      <AppBar title={n.personCode} onBack={() => navigate('/m/f/notes')} backLabel="목록" />
      <main id="main" className="mob-content">
        <Figure plain label={`받은 소식, ${sourceLabel(n.source)}`} value={gradeOf(nextGrade)?.label || '확인 필요'} unit="">
          <p className="mob-t-callout">{dif?.gradeChanged ? `지금 명부 ${gradeOf(n.current?.grade)?.label}에서 바뀜` : '등급은 그대로'}</p>
        </Figure>
        <List label="근거">
          <ListRow title={n.read?.quote ? `“${n.read.quote}”` : '근거 문구 없음'} subtitle={n.read?.quoteMatched ? '받은 글에 있는 문구' : '받은 글에서 찾지 못함, 직접 확인'} />
          <InfoSheet title="받은 글 전체" sheetTitle="받은 소식">
            <p className="mob-t-body mob-pad">{n.text}</p>
          </InfoSheet>
        </List>
        <div className="mob-stack-8">
          <Button block onClick={apply}>명부에 반영</Button>
          <Button block variant="plain" onClick={reject}>반영하지 않음</Button>
        </div>
      </main>
    </>
  )
}

// 마을별 진행 목록
export function FieldVillagesPage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  const scope = useFieldScope()
  if (!ACTIVE.has(d.status)) return <NoDispatch title="마을" />
  const list = villageProgress(d, data.persons, data.villages, vnow).filter((v) => scope.inScope(v.code))
  return (
    <>
      <AppBar title="마을" large />
      <main id="main" className="mob-content">
        {!list.length ? <EmptyState title="배정 전" body="배정 계산 뒤 마을별 진행 표시" /> : (
          <List label="마을별 진행, 기한 이른 순">
            {list.map((v) => {
              const tg = tagText(deadlineTag(v, vnow))
              return <ListRow key={v.code} title={`${v.name}`} subtitle={`${v.done} / ${v.total}명 도착${v.at ? `, ${hm(v.at)}까지` : ''}`}
                trailing={tg ? <Tag tone="red">{tg}</Tag> : null} chevron onClick={() => navigate(`/m/f/villages/${v.code}`)} />
            })}
          </List>
        )}
      </main>
    </>
  )
}

// 마을 상세: 큰 숫자(도착 n / 전체)와 기한, 대상자 목록. 차량과 도우미는 접힌 행 하나 뒤
export function FieldVillageDetailPage() {
  const { code } = useParams()
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  const scope = useFieldScope()
  const v = scope.inScope(code) ? villageProgress(d, data.persons, data.villages, vnow).find((x) => x.code === code) : null
  const village = data.villages.find((x) => x.code === code)
  const vehicles = v ? v.vehicles.map((vc) => data.vehicles.find((x) => x.code === vc) || { code: vc }) : []
  // 도우미별 탑승 차량(같은 마을 회차 기준)
  const rideOf = {}
  for (const r of v?.people || []) if (r.stop) for (const h of r.stop.helperCodes) (rideOf[h] ||= new Set()).add(r.stop.vehicleCode)
  const tg = v ? tagText(deadlineTag(v, vnow)) : null
  return (
    <>
      <AppBar title={villageName(data.villages, code)} onBack={() => navigate('/m/f/villages')} backLabel="마을" />
      <main id="main" className="mob-content">
        {!scope.inScope(code) ? <EmptyState title="담당 구역 밖 마을" body={`${ROLE_LABEL.dong} 계정은 담당 동 마을만 볼 수 있음`} /> : !v ? <EmptyState title="진행 정보 없음" body="대피 대상 구역 밖 마을이거나 배정 전" /> : (
          <>
            <Figure plain label={`대피소 도착${v.at ? `, ${hm(v.at)}까지` : ''}${tg ? `, ${tg}` : ''}`} value={`${v.done} / ${v.total}`} unit="명">
              <Progress value={v.total ? (v.done / v.total) * 100 : 0} label="마을 이송 완료 비율" />
            </Figure>
            <List label="만나는 곳과 차량">
              <ListRow title={village?.pickup?.name || '집결지 확인 필요'} subtitle={village?.pickup?.road || undefined} meta={placeLine('pickup')} />
              <InfoSheet lead={<Truck size={22} />} title={`차량 ${vehicles.length}대, 도우미 ${v.helpers.length}명`} sheetTitle="차량과 도우미">
                {!vehicles.length ? <EmptyState title="배정 차량 없음" /> : (
                  <List label="배정 차량">
                    {vehicles.map((x) => <ListRow key={x.code} title={x.code} subtitle={x.owner ? `${OWNERS[x.owner] || '소속 확인 필요'}, ${COMMITMENTS[commitmentOf(x)]}` : undefined} />)}
                  </List>
                )}
                {!!v.helpers.length && (
                  <List label="배정 도우미">
                    {v.helpers.map((h) => <ListRow key={h} title={h} subtitle={rideOf[h] ? `${[...rideOf[h]].join(', ')} 동승` : undefined} />)}
                  </List>
                )}
              </InfoSheet>
            </List>
            <List label="대상자 진행">
              {v.people.map((r) => (
                <ListRow key={r.person.code} title={r.person.code} subtitle={gradeOf(r.person.grade)?.label || '등급 확인'}
                  trailing={<Tag tone={['fail', 'unassigned'].includes(r.step) ? 'red' : undefined}>{stepLabel(r.step)}</Tag>} onClick={() => navigate(`/m/f/people/${r.person.code}`)} chevron />
              ))}
            </List>
          </>
        )}
      </main>
    </>
  )
}

// 도우미 응답 현황
export function FieldHelpersPage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const scope = useFieldScope()
  const replaceHelper = useDispatchStore((s) => s.replaceHelper)
  const resendLink = useDispatchStore((s) => s.resendLink)
  const toast = useMobileToast()
  const [tab, setTab] = useState('none')
  const [open, setOpen] = useState(null)
  const [confirm, setConfirm] = useState(null)
  const tokens = d.remote?.tokens || {}
  const linkFor = (h) => (tokens[h] ? `${window.location.origin}/h/${tokens[h]}` : null)
  const copy = async (h) => {
    const url = linkFor(h)
    if (!url) { toast('서버 저장 전이라 링크 없음'); return }
    try { await navigator.clipboard.writeText(url); toast(`${h} 링크 복사`) } catch { toast('복사 실패, 링크를 길게 눌러 복사') }
  }
  if (!ACTIVE.has(d.status) || !d.result) return <NoDispatch title="도우미" body="배정 뒤 도우미 응답이 여기에 보임" />
  const g = helperResponses(scope.scopeDispatch(d, data.persons).d, vnow)
  const rows = g[tab]
  return (
    <>
      <AppBar title="도우미" large />
      <main id="main" className="mob-content">
        <Segmented label="응답 구분" value={tab} onChange={setTab} options={[{ value: 'none', label: `응답 없음 ${g.none.length}` }, { value: 'accept', label: `수락 ${g.accept.length}` }, { value: 'decline', label: `불가 ${g.decline.length}` }]} />
        {d.status !== 'sent' && <p className="mob-t-callout mob-pad">배정을 보내면 응답이 모임</p>}
        {!rows.length ? <EmptyState title="해당 도우미 없음" /> : (
          <List label="도우미 목록">
            {rows.map((h) => (
              <ListRow key={h.code} title={h.code} subtitle={h.at ? `${hm(h.at)} 응답${h.reason ? `, ${DECLINE_REASONS[h.reason] || h.reason}` : ''}` : `문자 ${h.sms}회 보냄`} chevron onClick={() => setOpen(h)} />
            ))}
          </List>
        )}
      </main>
      <Sheet open={!!open} onClose={() => setOpen(null)} title={open?.code || ''}>
        <List label="배정">
          <ListRow title={`차량 ${open?.vehicle || '-'}`} subtitle={`${open?.trips || 0}번 이동`} />
          {open?.memo && <ListRow title="메모" subtitle={open.memo} />}
          <ListRow title="배정 링크 복사" subtitle="본인 배정만 보임, 12시간 뒤 만료" disabled={!open || !linkFor(open.code)} onClick={() => open && copy(open.code)} />
          <ListRow title="문자 다시 보내기" onClick={() => { const ok = resendLink?.(open.code); toast(ok ? `${open.code} 문자 다시 보냄` : '다시 보내기 실패'); setOpen(null) }} />
        </List>
        {tab !== 'accept' && <Button block variant="tonal" onClick={() => { setConfirm(open); setOpen(null) }}>다른 도우미로 바꾸기</Button>}
      </Sheet>
      <Dialog open={!!confirm} onClose={() => setConfirm(null)} title={`${confirm?.code} 바꾸기`} body="같은 등급을 돕는 대기 도우미에게 새 배정 문자를 보냄"
        actions={<><Button variant="plain" onClick={() => setConfirm(null)}>취소</Button><Button onClick={() => { const r = replaceHelper?.(confirm.code); toast(r ? `${confirm.code} 바꿈` : '바꿀 도우미 없음'); setConfirm(null) }}>바꾸기</Button></>} />
    </>
  )
}

// 아직 못 옮긴 사람과 소방 지원 요청. 동 담당자는 요청하지 않고 사람과 사유만 본다(요청은 시 관리자)
export function FieldFirePage() {
  const { d, vnow } = useDispatchLive()
  const data = useMiriStore()
  const navigate = useNavigate()
  const requestFireSupport = useDispatchStore((s) => s.requestFireSupport)
  const handover = useDispatchStore((s) => s.handover)
  const toast = useMobileToast()
  const [open, setOpen] = useState(false)
  const [openFail, setOpenFail] = useState(false)
  const scope = useFieldScope()
  const sc = scope.scopeDispatch(d, data.persons)
  const u = unservedByReason(sc.d)
  const failed = failedPending(sc.d, sc.persons, vnow)
  return (
    <>
      <AppBar title="소방 지원 요청" onBack={() => navigate(-1)} backLabel="뒤로" />
      <main id="main" className="mob-content">
        {!d.result ? <EmptyState icon={<Truck size={28} />} title="배정 전" body="배정 뒤 못 옮길 사람이 여기에 보임" /> : (
          <>
            <Figure plain label="차량이나 도우미가 없는 사람" value={u.total} unit="명" />
            <List label="사유별 인원">
              {u.reasons.map((r) => <ListRow key={r.key} title={r.label} trailing={<span className="mob-t-body">{r.n}명</span>} />)}
              {!!failed.length && (
                <InfoSheet title={`이동 중 실패 ${failed.length}명`} sheetTitle="이동 중 실패">
                  <List label="이송 실패 보고 대상자">
                    {failed.map((f) => <ListRow key={f.code} title={f.code} subtitle={[FAIL_REASONS[f.reason] || f.reason, f.memo, f.at ? `${hm(f.at)} 보고` : null].filter(Boolean).join(', ') || '사유 미기재'} />)}
                  </List>
                  {!scope.isDong && <Button block variant="danger-tonal" onClick={() => setOpenFail(true)}>실패 {failed.length}명 소방 인계</Button>}
                </InfoSheet>
              )}
              {!!sc.d.fireRequests?.length && (
                <InfoSheet title={`요청 기록 ${sc.d.fireRequests.length}건`} sheetTitle="요청 기록">
                  <List label="요청 기록">
                    {sc.d.fireRequests.map((q, i) => (
                      <ListRow key={i} title={`${hm(q.at)} 요청 ${q.count}명`} subtitle={Object.entries(q.villages).map(([c, n]) => `${villageName(data.villages, c)} ${n}`).join(', ')} />
                    ))}
                  </List>
                </InfoSheet>
              )}
            </List>
            {scope.isDong
              ? <p className="mob-t-callout mob-pad">동해소방서 지원 요청은 시 관리자 계정에서 시 전체 미배정 인원으로 보냄</p>
              : <Button block variant="danger" disabled={!u.total} onClick={() => setOpen(true)}>동해소방서 지원 요청</Button>}
          </>
        )}
      </main>
      <Dialog open={open} onClose={() => setOpen(false)} title={`${u.total}명 지원 요청`} body="사유와 마을별 인원을 동해소방서 인계 기록으로 넘김"
        actions={<><Button variant="plain" onClick={() => setOpen(false)}>취소</Button><Button variant="danger" onClick={() => { const q = requestFireSupport(); toast(q ? `지원 요청 ${q.count}명 기록` : '요청할 사람 없음'); setOpen(false) }}>요청</Button></>} />
      <Dialog open={openFail} onClose={() => setOpenFail(false)} title={`실패 ${failed.length}명 소방 인계`} body="이동 중 실패한 사람을 동해소방서 인계 기록으로 넘김"
        actions={<><Button variant="plain" onClick={() => setOpenFail(false)}>취소</Button><Button variant="danger" onClick={() => { handover(failed.map((f) => f.code)); toast(`실패 ${failed.length}명 소방 인계 기록`); setOpenFail(false) }}>인계</Button></>} />
    </>
  )
}

// 대상자 찾기. 처음에는 확인 필요 대상자만 짧게, 나머지는 검색으로
export function FieldPeoplePage() {
  const data = useMiriStore()
  const navigate = useNavigate()
  const [q, setQ] = useState('')
  const scope = useFieldScope()
  const mine = data.persons.filter((p) => scope.inScope(p.villageCode))
  const list = q ? searchPersons(mine, data.villages, q, 30) : mine.filter((p) => p.review === 'pending' || (p.tags || []).includes('gradeUncertain')).slice(0, 10)
  return (
    <>
      <AppBar title="대상자 찾기" onBack={() => navigate('/m/f/more')} backLabel="더보기" />
      <main id="main" className="mob-content">
        <label className="mob-search">
          <Search size={20} aria-hidden="true" />
          <FilledInput type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder="대상자 번호 또는 마을" aria-label="대상자 번호 또는 마을 검색" />
        </label>
        <p className="mob-t-callout mob-pad">{q ? `찾은 사람 ${list.length}명` : '등급 확인이 필요한 사람'}</p>
        {!list.length ? <EmptyState title={q ? '찾은 사람 없음' : '확인이 필요한 사람 없음'} body="번호 앞자리나 마을 이름으로 찾기" /> : (
          <List label="대상자 목록">
            {list.map((p) => (
              <ListRow key={p.code} title={p.code} subtitle={`${villageName(data.villages, p.villageCode)}, ${gradeOf(p.grade)?.label || '등급 확인'}`} chevron onClick={() => navigate(`/m/f/people/${p.code}`)} />
            ))}
          </List>
        )}
      </main>
    </>
  )
}

export function FieldPersonPage() {
  const { code } = useParams()
  const data = useMiriStore()
  const { d, vnow } = useDispatchLive()
  const navigate = useNavigate()
  const scope = useFieldScope()
  const p = data.persons.find((x) => x.code === code && scope.inScope(x.villageCode))
  if (!p) return (<><AppBar title="대상자" onBack={() => navigate(-1)} /><main className="mob-content"><EmptyState title="대상자 없음" /></main></>)
  const care = personCare(p)
  const g = gradeOf(p.grade)
  const row = ACTIVE.has(d.status) ? villageProgress(d, [p], data.villages, vnow)[0]?.people[0] : null
  return (
    <>
      <AppBar title={p.code} onBack={() => navigate(-1)} />
      <main id="main" className="mob-content">
        <Figure plain label={villageName(data.villages, p.villageCode)} value={g?.label || '등급 확인'} unit="">
          <p className="mob-t-callout">{row ? `${stepLabel(row.step)}${row.stop ? `, 차량 ${row.stop.vehicleCode}` : ''}${row.step === 'fail' ? `, ${FAIL_REASONS[d.events[p.code]?.reason] || ''}` : ''}` : g?.need || ''}</p>
        </Figure>
        <List label="동행과 소통">
          <ListRow title="평소 돌봄 담당자" subtitle={!care.known ? NOT_ENTERED : `${care.caregiverType}, ${care.reachableLabel}${care.companionCall ? ', 동행 연락' : ''}`} />
          <ListRow title="의사소통" subtitle={care.comm.length ? care.comm.join(', ') : care.known ? '특이 없음' : NOT_ENTERED} />
          <ListRow title="보조기구" subtitle={care.aids.length ? care.aids.join(', ') : care.known ? '없음' : NOT_ENTERED} />
          <InfoSheet title="경로 확인 기준" sheetTitle="경로 확인 기준"><p className="mob-t-body mob-pad">{ROUTE_NOTE}</p></InfoSheet>
        </List>
      </main>
    </>
  )
}

// 서류 사진 올리기. 콘솔 서류 읽기와 같은 형태로 확인할 서류에 저장
function VillagePicker({ villages, value, onChange }) {
  const [open, setOpen] = useState(false)
  const cur = villages.find((v) => v.code === value)
  return (
    <>
      <ListRow title="마을" subtitle={cur ? (cur.label || cur.name) : '서류의 마을 고르기'} chevron onClick={() => setOpen(true)} />
      <Sheet open={open} onClose={() => setOpen(false)} title="마을 고르기">
        <div className="mob-sheet-scroll">
          <List label="마을 목록">
            {villages.map((v) => <ListRow key={v.code} title={v.label || v.name} trailing={v.code === value ? <Tag>고름</Tag> : null} onClick={() => { onChange(v.code); setOpen(false) }} />)}
          </List>
        </div>
      </Sheet>
    </>
  )
}

// AI 판독 오류 문구. 휴대폰 로그인에는 시연 코드 칸이 없으므로 콘솔 로그인으로 안내한다(막다른 안내 제거)
const fieldAiError = (e, kind) => {
  const m = aiErrorMessage(e, kind)
  if (e?.code === 'NEED_SESSION' || e?.code === 401) return { title: 'AI 판독은 시연 코드가 필요해요', desc: '같은 브라우저의 콘솔 로그인에서 시연 코드를 넣은 뒤 다시 시도' }
  return m
}

export function FieldIntakePage() {
  const scope = useFieldScope()
  const navigate = useNavigate()
  const data = useMiriStore()
  const addIntakeDoc = useMiriStore((s) => s.addIntakeDoc)
  const nextDocId = useMiriStore((s) => s.nextDocId)
  const toast = useMobileToast()
  const fileRef = useRef(null)
  const [agree, setAgree] = useState(false)
  const [villageCode, setVillageCode] = useState('')
  const [state, setState] = useState({ phase: 'idle' })
  const run = async (file) => {
    if (!file) return
    const req = { village: villageCode } // 판독 중 마을을 바꿔도 요청 당시 마을로 저장
    setState({ phase: 'loading', req })
    try {
      const page = await readDocument(file)
      setState({ phase: 'done', page, file, req })
    } catch (e) {
      setState({ phase: 'error', err: fieldAiError(e, '서류'), req })
    }
  }
  const save = () => {
    const villageCode = state.req?.village
    if (!villageCode || !state.page) return
    const used = new Set(data.persons.map((p) => p.code))
    const codes = []
    for (let k = 301; codes.length < state.page.persons.length; k += 1) { const c = `${villageCode}-${k}`; if (!used.has(c)) codes.push(c) }
    const vname = villageName(data.villages, villageCode)
    addIntakeDoc({ id: nextDocId(), kind: 'plan', name: `${vname} 대피계획서 (휴대폰 촬영)`, villageCode, image: URL.createObjectURL(state.file), uploadedAt: Date.now(), status: 'pending', transcript: state.page.transcript, results: state.page.persons.map((r, i) => ({ ...r, personCode: codes[i] })) })
    toast(`확인할 서류에 ${state.page.persons.length}명 저장`)
    setState({ phase: 'idle' })
    navigate('/m/f/docs')
  }
  const need = !villageCode ? '마을을 먼저 고르기' : !agree ? '가상 자료 확인을 켜기' : null
  return (
    <>
      <AppBar title="서류 사진 올리기" onBack={() => navigate(-1)} backLabel="뒤로" />
      <main id="main" className="mob-content">
        {state.phase !== 'done' ? (
          <>
            <List label="올리기 전 확인">
              <VillagePicker villages={data.villages.filter((v) => scope.inScope(v.code))} value={villageCode} onChange={setVillageCode} />
              <ListRow title="가상 자료만 올림" subtitle="실제 주민 서류는 올리지 않음" trailing={<Toggle checked={agree} onChange={setAgree} label="가상 자료만 올림" />} />
              <InfoSheet title="읽는 방법" summary="국내 서버, 이름과 연락처 가림" sheetTitle="읽는 방법">
                <List label="읽는 방법">
                  <ListRow title="글자 읽기" subtitle="국내 서버에서 사진의 글자를 읽음" />
                  <ListRow title="개인정보 가림" subtitle="이름, 주소, 연락처를 가린 뒤에만 등급 초안" />
                  <ListRow title="확정" subtitle="담당자가 원본과 맞춰 확정해야 명부에 반영" />
                </List>
              </InfoSheet>
            </List>
            <input ref={fileRef} type="file" accept="image/png,image/jpeg,application/pdf" capture="environment" hidden onChange={(e) => { run(e.target.files?.[0]); e.target.value = '' }} />
            {state.phase === 'loading' && <div className="mob-pad mob-inline"><Spinner label="읽는 중" /><span className="mob-t-body">읽는 중, 보통 5초 안팎</span></div>}
            {state.phase === 'error' && <List label="오류"><ListRow title={state.err.title} subtitle={state.err.desc} /></List>}
            <div className="mob-stack-8">
              <Button block disabled={!!need || state.phase === 'loading'} onClick={() => fileRef.current?.click()}><Camera size={20} aria-hidden="true" />사진 찍기 또는 고르기</Button>
              {need && <p className="mob-t-callout mob-pad">{need}</p>}
            </div>
          </>
        ) : (
          <>
            <Figure plain label={`${villageName(data.villages, state.req?.village)} 서류`} value={state.page.persons.length} unit="명 읽음" />
            <List label="읽은 결과">
              {state.page.persons.map((r, i) => (
                <ListRow key={i} title={gradeOf(r.grade)?.label || '등급 확인 필요'} subtitle={r.quote ? `“${r.quote}”` : '근거 문구 없음'} trailing={r.quoteMatched ? null : <Tag tone="red">원본 확인</Tag>} />
              ))}
            </List>
            <div className="mob-stack-8">
              <Button block onClick={save}>확인할 서류로 저장</Button>
              <Button block variant="plain" onClick={() => setState({ phase: 'idle' })}>저장하지 않음</Button>
            </div>
          </>
        )}
      </main>
    </>
  )
}

// 현장 소식 남기기: 대상자 고르기, 쓰기 또는 음성, 주 버튼 하나
export function FieldNotePage() {
  const navigate = useNavigate()
  const data = useMiriStore()
  const addFieldNote = useMiriStore((s) => s.addFieldNote)
  const nextNoteId = useMiriStore((s) => s.nextNoteId)
  const toast = useMobileToast()
  const [code, setCode] = useState('')
  const [text, setText] = useState('')
  const [mode, setMode] = useState('text')
  const [sheet, setSheet] = useState(false)
  const [pickOpen, setPickOpen] = useState(false)
  const [state, setState] = useState({ phase: 'idle' })
  const fileRef = useRef(null)
  const scope = useFieldScope()
  const person = data.persons.find((p) => p.code === code.trim().toUpperCase() && scope.inScope(p.villageCode))
  const candidates = searchPersons(data.persons.filter((p) => scope.inScope(p.villageCode)), data.villages, code, 20)
  const reqSeq = useRef(0)
  const send = async (file) => {
    if (!person) { toast('대상자 번호 확인 필요'); return }
    // 요청 시작 시 대상자, 마을, 현재 값, 방식, 글을 한 요청 객체로 고정. 결과와 저장 모두 이 객체만 사용
    const req = { id: ++reqSeq.current, personCode: person.code, villageCode: person.villageCode, current: { grade: person.grade, tags: [...(person.tags || [])] }, mode, text: text.trim() }
    setState({ phase: 'loading', req })
    try {
      const read = await readNote({ text: file ? undefined : req.text, file: file || undefined, current: req.current })
      if (req.id !== reqSeq.current) return // 늦게 온 이전 요청 응답은 버림
      setState({ phase: 'done', read, file, req })
      setSheet(true)
    } catch (e) {
      if (req.id !== reqSeq.current) return
      setState({ phase: 'error', err: fieldAiError(e, '소식'), req })
    }
  }
  const keep = () => {
    const { read, file, req } = state
    if (!req || !read) return
    addFieldNote({ id: nextNoteId(), personCode: req.personCode, villageCode: req.villageCode, source: 'dong', status: 'pending', receivedAt: Date.now(), current: req.current, mode: req.mode, fileName: file?.name || '', text: read.transcript || req.text, read, mock: false })
    toast(`${req.personCode} 확인할 소식으로 저장`)
    setSheet(false); setText(''); setState({ phase: 'idle' })
  }
  const r = state.read
  const busy = state.phase === 'loading'
  return (
    <>
      <AppBar title="현장 소식 남기기" onBack={() => navigate(-1)} backLabel="뒤로" />
      <main id="main" className="mob-content">
        <List label="대상자">
          <ListRow title={person ? person.code : '대상자 고르기'} subtitle={person ? `${villageName(data.villages, person.villageCode)}, 지금 ${gradeOf(person.grade)?.label || '등급 확인'}` : '번호나 마을로 찾기'} chevron onClick={() => setPickOpen(true)} />
        </List>
        <Segmented label="남기는 방식" value={mode} onChange={setMode} options={[{ value: 'text', label: '글' }, { value: 'voice', label: '음성 파일' }]} />
        {mode === 'text'
          ? <FilledTextarea className="mob-textarea" rows={4} value={text} onChange={(e) => setText(e.target.value)} placeholder="예: 지난주부터 보행기 없이 걷기 어려움" aria-label="현장 소식" />
          : <input ref={fileRef} type="file" accept="audio/wav,audio/mpeg,audio/mp4,audio/x-m4a" hidden onChange={(e) => { send(e.target.files?.[0]); e.target.value = '' }} />}
        {busy && <div className="mob-pad mob-inline"><Spinner label="읽는 중" /><span className="mob-t-body">읽는 중</span></div>}
        {state.phase === 'error' && <List label="오류"><ListRow title={state.err.title} subtitle={state.err.desc} /></List>}
        <div className="mob-stack-8">
          {mode === 'text'
            ? <Button block disabled={!person || !text.trim() || busy} onClick={() => send(null)}>보내고 읽기</Button>
            : <Button block disabled={!person || busy} onClick={() => fileRef.current?.click()}>음성 파일 고르기</Button>}
          <p className="mob-t-callout mob-pad">이름과 연락처를 가린 뒤 읽음. 명부는 담당자 확인 뒤 바뀜</p>
        </div>
      </main>
      <Sheet open={pickOpen} onClose={() => setPickOpen(false)} title="대상자 고르기">
        <label className="mob-search">
          <Search size={20} aria-hidden="true" />
          <FilledInput value={code} onChange={(e) => setCode(e.target.value)} disabled={busy} aria-label="대상자 번호" placeholder="번호나 마을" autoCapitalize="characters" />
        </label>
        <div className="mob-sheet-scroll">
          <List label="대상자 후보">
            {candidates.map((p) => <ListRow key={p.code} title={p.code} subtitle={`${villageName(data.villages, p.villageCode)}, ${gradeOf(p.grade)?.label || '등급 확인'}`} onClick={() => { setCode(p.code); setPickOpen(false) }} />)}
          </List>
        </div>
      </Sheet>
      <Sheet open={sheet} onClose={() => setSheet(false)} title="읽은 결과">
        {r && (
          <>
            <List label="읽은 결과">
              <ListRow title={r.diff?.gradeChanged ? `${gradeOf(state.req?.current?.grade)?.label} → ${gradeOf(r.diff.next.grade)?.label}` : '등급 그대로'} subtitle={r.quote ? `근거 “${r.quote}”` : '근거 문구 없음'} />
            </List>
            <Button block onClick={keep}>확인할 소식으로 저장</Button>
            <Button block variant="plain" onClick={() => setSheet(false)}>닫기</Button>
          </>
        )}
      </Sheet>
    </>
  )
}

function NoDispatch({ title, body }) {
  const navigate = useNavigate()
  return (
    <>
      <AppBar title={title} large />
      <main id="main" className="mob-content">
        <EmptyState icon={<UserCheck size={28} />} title="진행 중인 발령 없음" body={body || '발령이 나면 여기에 진행이 보임'} action={<Button variant="tonal" onClick={() => navigate('/m/f')}>오늘 할 일</Button>} />
      </main>
    </>
  )
}

// 더보기: 다른 업무, 시연, 계정, 화면 설정
export function FieldMorePage() {
  const navigate = useNavigate()
  const d = useDispatchStore()
  const account = { user: useAuthStore((st) => st.user), logout: useAuthStore((st) => st.logout) }
  const data = useMiriStore()
  const scope = useFieldScope()
  const toast = useMobileToast()
  const u = unservedByReason(scope.scopeDispatch(d, data.persons).d)
  const startDrill = () => {
    const st = useDispatchStore.getState()
    if (st.status === 'closed') st.reset()
    useDispatchStore.getState().start({ kind: 'drill', speed: 60 })
    useDispatchStore.getState().runAssign()
    useDispatchStore.getState().confirmAndSend()
    toast('훈련 발령 시작')
    navigate('/m/f')
  }
  return (
    <>
      <AppBar title="더보기" large />
      <main id="main" className="mob-content">
        <List label="다른 업무">
          <ListRow lead={<PhoneOutgoing size={22} />} title="소방 지원 요청" subtitle={d.result ? `차량이나 도우미가 없는 사람 ${u.total}명` : '발령 뒤 표시'} chevron onClick={() => navigate('/m/f/fire')} />
          <ListRow lead={<Search size={22} />} title="대상자 찾기" chevron onClick={() => navigate('/m/f/people')} />
          <InfoSheet lead={<Users size={22} />} title="차량 소속과 확인 상태" sheetTitle="차량 소속과 확인 상태">
            <List label="차량 소속">
              {Object.entries(OWNERS).map(([key, label]) => {
                const list = data.vehicles.filter((v) => v.owner === key)
                const promised = list.filter((v) => commitmentOf(v) === 'agreed').length
                return <ListRow key={key} title={`${label} ${list.length}대`} subtitle={list.length ? `약속됨 ${promised}대` : '없음'} />
              })}
            </List>
          </InfoSheet>
        </List>
        {!ACTIVE.has(d.status) && (
          <List label="시연">
            <ListRow lead={<Play size={22} />} title="훈련 발령 시작" subtitle="배정과 문자 보내기까지 한 번에, 60배 빠른 시계" onClick={startDrill} />
          </List>
        )}
        <List label="계정">
          <ListRow title={account.user ? ROLE_LABEL[account.user.role] : '로그인 전'} subtitle={account.user?.name} trailing={<Button size="sm" variant="plain" onClick={account.logout}>로그아웃</Button>} />
        </List>
        <DisplaySettings />
      </main>
    </>
  )
}
