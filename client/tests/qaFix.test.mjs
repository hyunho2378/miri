// 완성도 점검(2026. 11. 14.)에서 실제 브라우저로 재현한 오류의 회귀 시험
import test from 'node:test'
import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { enqueue, flush, moveToRejected, readQueue, readRejected } from '../src/lib/reportQueue.js'
import { remoteSendOutcome } from '../src/lib/dispatchSync.js'

const src = (p) => readFileSync(new URL(`../${p}`, import.meta.url), 'utf8')
const mem = () => { const m = new Map(); return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) } }

test('Q1 큰 화면 도우미 링크: 교체된 도우미의 보고(404 NO_ASSIGNMENT)는 성공으로 지우지 않고 종료 안내로 바뀜', async () => {
  assert.equal(remoteSendOutcome({ kind: 'ok', status: 200 }), 'ok')
  assert.equal(remoteSendOutcome({ kind: 'retry', status: 503 }), 'retry')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 404, code: 'NO_ASSIGNMENT' }), 'end')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 404, code: 'CLOSED' }), 'end')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 401, code: 'BAD_SIG' }), 'end')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 409, code: 'CONFLICT' }), 'reject')
  assert.equal(remoteSendOutcome({ kind: 'reject', status: 400, code: 'BAD_REPORT' }), 'reject')
  // 대기열: 종료 응답이면 보고가 남아 있고, 영구 거부는 '보내지 못한 보고'로 옮겨 남음
  const st = mem()
  enqueue('D1.H1', { key: 'k1', type: 'ack', answer: 'accept' }, st)
  const r = await flush('D1.H1', async () => false, st)
  assert.equal(r.left, 1)
  moveToRejected('D1.H1', 'k1', '형식 오류', st)
  assert.equal(readQueue('D1.H1', st).length, 0)
  assert.equal(readRejected('D1.H1', st)[0].rejected, '형식 오류')
})

test('Q1 RemoteHelper 는 거부 응답을 성공으로 처리하던 helperSend 를 쓰지 않고 결과별로 처리', () => {
  const s = src('src/pages/helper/RemoteHelper.jsx')
  assert.ok(!/helperSend\b(?!Result)/.test(s.replace(/helperSendResult/g, '')))
  assert.match(s, /remoteSendOutcome\(res\)/)
  assert.match(s, /moveToRejected\(scope/)
  assert.match(s, /보내지 못한 보고/)
  // 보낼 보고가 없어도 주기적으로 배정을 다시 받아 교체와 종료를 알아챔
  assert.match(s, /readQueue\(scope\)\.length\) send\(\); else load\(\)/)
})

test('Q2 도우미 링크 화면: 바깥 레이아웃 main 안에 main 을 다시 두지 않음, 서명 링크에는 이 기기의 평시 표시를 숨김', () => {
  const s = src('src/pages/helper/RemoteHelper.jsx')
  assert.equal((s.match(/<main/g) || []).length, 0)
  const l = src('src/components/layout/HelperLayout.jsx')
  assert.match(l, /<main id="main"/)
  assert.match(l, /showLocalDispatchPill\(pathname\) && <DispatchStatusPill/)
  const re = new RegExp(l.match(/showLocalDispatchPill = \(pathname\) => \/(.+)\/\.test/)[1])
  assert.ok(re.test('/h/demo'))
  assert.ok(!re.test('/h/Dabc123.H-084.1794631434.sig'))
})

test('Q3 저장 대기(1.5초) 중 새로고침이나 탭 닫기: 기다리지 않고 바로 저장하고, 떠나는 저장은 역할 맞추기를 기다리지 않음', async () => {
  const s = src('src/store/useDispatchStore.js')
  assert.match(s, /addEventListener\?\.\('pagehide', flushPendingSave\)/)
  assert.match(s, /visibilityState === 'hidden'\) flushPendingSave\(\)/)
  assert.match(s, /syncSave\(\{ leaving: true \}\)/)
  const { saveRemote, setRoleAlign } = await import('../src/lib/dispatchSync.js')
  let aligned = 0
  setRoleAlign(async () => { aligned += 1 })
  const orig = globalThis.fetch
  const sent = []
  globalThis.fetch = async (url, init) => { sent.push(init?.method); return { ok: true, status: 200, json: async () => ({ dispatchId: 'Dqa00001', tokens: {} }) } }
  try {
    const d = { kind: 'drill', status: 'sent', result: null, remote: {} }
    await saveRemote(d, {}, { dispatchId: 'Dqa00001', rev: 2, leaving: true })
    assert.equal(aligned, 0)
    assert.deepEqual(sent, ['POST'])
    await saveRemote(d, {}, { dispatchId: 'Dqa00001', rev: 3 })
    assert.equal(aligned, 1)
  } finally { globalThis.fetch = orig; setRoleAlign(null) }
})

test('Q4 공공데이터 조회 실패: NO_KEY, HTTP 502 같은 내부 코드를 화면에 그대로 보이지 않음', async () => {
  const { openDataErrorText } = await import('../src/lib/openDataError.js')
  assert.equal(openDataErrorText('NO_KEY'), '연계 인증키 미설정')
  assert.equal(openDataErrorText('UPSTREAM'), '기관 서버 응답 오류')
  assert.equal(openDataErrorText('HTTP 502'), '서버 응답 오류')
  assert.equal(openDataErrorText('HTTP 404'), '요청 거부')
  assert.equal(openDataErrorText('Failed to fetch'), '연결 끊김')
  assert.equal(openDataErrorText(''), '사유 미확인')
  for (const code of ['NO_KEY', 'UPSTREAM', 'HTTP 500', 'TypeError: x']) assert.doesNotMatch(openDataErrorText(code), /[A-Z_]{3,}|HTTP/)
  for (const f of ['src/pages/console/OverviewPage.jsx', 'src/components/miri/FireRiskStrip.jsx', 'src/components/miri/PublicFactsCard.jsx', 'src/components/miri/DisasterAlertsCard.jsx']) {
    const s = src(f)
    assert.doesNotMatch(s, /\(\$\{[a-z]+\.error\}\)|\(\{s\.error\}\)|\(\{error\}\)|\$\{s\.error \|\|/, f)
  }
})

test('Q5 상황판, 개인정보 처리방침, 개방 API, 페이지 없음: 이전 화면 탭 제목이 남지 않게 제목을 정하고 상황판에 화면 제목(h1)을 둠', async () => {
  const { pageTitle } = await import('../src/hooks/usePageTitle.js')
  assert.equal(pageTitle('상황판'), '상황판 | 미리')
  for (const [f, t] of [['src/pages/console/MapPage.jsx', '상황판'], ['src/pages/public/PrivacyPage.jsx', '개인정보 처리방침'], ['src/pages/public/OpenApiPage.jsx', '개방 API'], ['src/pages/public/NotFoundPage.jsx', '페이지 없음']]) {
    assert.match(src(f), new RegExp(`usePageTitle\\('${t}'\\)`), f)
  }
  assert.match(src('src/pages/console/MapPage.jsx'), /<h1 className="sr-only">상황판<\/h1>/)
})

test('Q6 반복 단추 이름: 도우미 링크 44개와 대상자별 보고 단추를 화면 읽기 프로그램이 구별', () => {
  const d = src('src/pages/console/DispatchPage.jsx')
  assert.match(d, /aria-label=\{`\$\{h\} 배정 링크 열기\(새 창\)`\}/)
  assert.match(d, /aria-label=\{`\$\{h\} 배정 링크 복사`\}/)
  const r = src('src/pages/helper/RemoteHelper.jsx')
  assert.match(r, /aria-label=\{`\$\{c\} \$\{nx\[1\]\}`\}/)
  assert.match(r, /aria-label=\{`\$\{c\} 실패`\}/)
})

test('Q7 320 폭 발령 운영: 훈련 속도 선택(보기 전환)이 부모보다 넓어도 화면 전체가 가로로 밀리지 않음', () => {
  const s = src('src/components/ui/SegmentControl.jsx')
  assert.match(s, /'inline-flex max-w-full flex-wrap rounded-sm bg-mute p-1 gap-1'/)
})

test('Q8 320, 390 폭: 대상자 명부, 차량과 도우미 목록은 화면 폭 한 칸 안에서 목록만 가로로 넘기고, 현장 소식 반영 단추는 줄을 바꿈', () => {
  const r = src('src/pages/console/RosterPage.jsx')
  assert.match(r, /grid min-h-0 flex-1 grid-cols-\[minmax\(0,1fr\)\] gap-x-10 gap-y-4 lg:grid-cols-\[minmax\(0,1\.25fr\)_minmax\(400px,1fr\)\]/)
  assert.match(r, /aria-label="대상자 목록" className="flex min-h-0 min-w-0 flex-col max-lg:max-h-\[50vh\] max-lg:overflow-x-auto"/)
  const s = src('src/pages/console/ResourcesPage.jsx')
  assert.match(s, /const grid = 'grid min-h-0 flex-1 grid-cols-\[minmax\(0,1fr\)\]/)
  assert.match(s, /const listCls = 'flex min-h-0 min-w-0 flex-col max-lg:max-h-\[50vh\] max-lg:overflow-x-auto'/)
  assert.match(src('src/components/miri/NoteReview.jsx'), /ml-auto inline-flex max-w-full flex-wrap items-center justify-end gap-2/)
})

test('Q9 실제 아이폰 사파리처럼 창 높이가 낮은 세로 화면(320x700, 390x664, 375x548)은 옆 막대가 아니라 아래 탭 바, 듀오와 가로 자세는 그대로', async () => {
  const { layoutFor } = await import('../src/mobile/layout.js')
  const ios = (w, h) => layoutFor({ platform: 'ios', width: w, height: h }).bar
  assert.equal(ios(320, 700), 'bottom')
  assert.equal(ios(390, 664), 'bottom')
  assert.equal(ios(375, 548), 'bottom')
  assert.equal(ios(440, 700), 'bottom')
  assert.equal(ios(466, 678), 'side')
  assert.equal(ios(678, 466), 'side')
  assert.equal(ios(874, 402), 'side')
  assert.equal(ios(402, 874), 'bottom')
})

test('Q10 문서 센터와 시트: 단추가 여는 숨은 파일 칸은 Tab 순서와 화면 읽기에서 빠짐(이름 없는 단추로 잡히던 문제)', () => {
  assert.match(src('src/pages/workspace/WorkspaceHome.jsx'), /accept="\.hwp,\.hwpx,\.pdf,\.docx" className="sr-only" tabIndex=\{-1\} aria-hidden="true"/)
  assert.match(src('src/pages/workspace/SheetEditor.jsx'), /accept="\.csv,text\/csv" className="sr-only" tabIndex=\{-1\} aria-hidden="true"/)
})

test('Q11 문서, 시트, 설문 편집기와 설문 응답 화면: 탭 제목이 문서 센터로 남지 않고 문서 제목을 보임', () => {
  assert.match(src('src/pages/workspace/EditorFrame.jsx'), /usePageTitle\(title \|\| '문서'\)/)
  assert.match(src('src/pages/workspace/FormFillPage.jsx'), /usePageTitle\(form\?\.title \|\| '설문지'\)/)
})

test('Q12 설문 응답: 글 칸 이름이 "내 답변"이 아니라 질문 제목이고, 빈 필수 질문은 오류 문구와 연결되며 초점이 첫 빈 칸으로 이동', () => {
  const s = src('src/pages/workspace/FormRenderer.jsx')
  assert.equal((s.match(/aria-label=\{q\.title\} aria-invalid=\{errors\[q\.id\] \|\| undefined\} aria-describedby=\{errors\[q\.id\] \? `q-\$\{q\.id\}-err` : undefined\}/g) || []).length, 3)
  assert.match(s, /id=\{`q-\$\{q\.id\}-err`\}/)
  assert.match(s, /first\?\.querySelector\('input, textarea, button'\)\?\.focus\(\{ preventScroll: true \}\)/)
})

test('Q13 AI 읽기 꺼짐 안내: 오류 문구가 화면 단추 이름(예시 서류 읽기)과 같은 말을 씀', async () => {
  const { aiErrorMessage } = await import('../src/lib/aiErrors.js')
  assert.deepEqual(aiErrorMessage({ code: 'STORED_ONLY' }), { title: '저장된 읽기 결과만 사용 가능', desc: '예시 서류 읽기 선택' })
  assert.equal(aiErrorMessage({ code: 'NO_KEY' }, '소식').desc, '예시 소식 읽기 선택')
  for (const code of ['STORED_ONLY', 'NO_KEY', 'NEED_SESSION', 'NO_SESSION_CONFIG', 'X']) assert.doesNotMatch(JSON.stringify(aiErrorMessage({ code, message: 'm' })), /샘플/)
})
