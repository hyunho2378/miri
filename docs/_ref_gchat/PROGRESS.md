# PROGRESS.md G-Chat 진행 상태

마감 기준. 1차 서류(개발보고서 HWP, 스크린샷 포함) 2026-09-21(월) 10:00. 2차 발표평가 11월 중순, 시제품 시연 + 1분 영상.

컨텍스트 85% 도달 시 여기 기록하고 중단. 재시작 시 이 파일부터 읽는다.

## 단계

### 0. SETUP  [x]  2026-09-06
SETUP_PROMPT.md 실행 완료. 빌드 통과(vite 8.2.2, 966ms), 토큰 클래스 확인(bg-primary→#2563EB, p-4→16px, font-pretendard), 금지 grep 0건.
- React 18.3.1 고정(create-vite 기본 19에서 내림). Vite 8 + @vitejs/plugin-react 6 조합 빌드 정상
- npm audit: react-router-dom v6 moderate 2건. v6 유지 결정(v7은 breaking). SSR 미사용이라 hydration 건은 해당 없음, open redirect 건은 외부 입력 URL을 Link/navigate 에 넣지 않는 것으로 회피

### 1. 기반 (단독)  [x]  2026-09-06
- tokens.js → tailwind.config.js 매핑 완료(colors/spacing/radius/shadow/screens/zIndex/maxWidth/transitionDuration/transitionTimingFunction). hex 직접 입력 0
- index.css: type-* 9종, 애니메이션 keyframes 6 + 클래스 9, prefers-contrast 대응, html/body overflow-x clip
- ui/ 18종 + dashboard/StatusPill 완료
- lib/format.js lib/api.js(mock 라우터) 완료. lib/stripMarkdown.js lib/mockStream.js 는 시드 그대로 사용
- hooks/useChat.js useMediaQuery.js useToast.js, store/useChatUi useAuthStore useAdminUi(useTopbar 포함) 완료
- App.jsx 라우트 21개 등록(시민 7 + 관리자 12 + NotFound). ChatPage 즉시 로드, 나머지 lazy. ScrollToTop 은 App.jsx 안 소형 컴포넌트
- pages/ 20개는 스텁. 실제 화면은 2단계

**1단계에서 내린 결정 (2단계에서 되돌리지 않는다)**
- `hooks/useFocusTrap.js` 신설. Modal 과 Drawer 가 같은 트랩을 쓴다. 두 번 복사하지 않으려고 뺐다. COMPONENTS.md 트리에 없는 파일이라 여기 기록한다
- `public/images/illustrations/empty.svg` 신설. EmptyState 기본 일러스트. 정식 unDraw 자산이 오면 교체한다. **hex 직접 입력 2번째 예외**(1번째는 index.html theme-color). SVG 자산이라 tokens 를 import 할 수 없다
- 이징 클래스 이름은 DESIGN.md 모션 표대로 `ease-out` `ease-in-out` `ease-standard`. tokens.motion.easing 의 inOut 키를 in-out 으로 매핑했다
- prefers-contrast: more 는 CSS 변수가 아니라 `.border-line-sub` `.bg-line-sub` `.text-text-meta` 유틸리티 재정의로 적용했다. 컴포넌트가 var 를 쓰지 않기 때문. 컴포넌트가 CSS 변수를 쓰게 되면 그때 변수 방식으로 바꾼다
- StatusPill STATUS 에 `booked`(예약됨, info) 를 추가했다. IA.md 상태 정의 표에는 없지만 API_CONTRACT 예약 현황 셀 상태가 open|booked|full|maintenance 다. IA.md 상태 표에 반영 필요
- `useTopbar({title, actions})` 는 의존성 배열에 title 만 둔다. actions 는 매 렌더 새 JSX 라 넣으면 무한 루프가 난다. actions 를 바꾸려면 title 도 같이 바뀌는 구조로 쓰거나 2단계에서 슬롯 방식으로 바꾼다
- `client/.env` 생성(.gitignore 대상). VITE_USE_MOCK=true 가 없으면 Vite 가 mock 분기를 빌드에서 통째로 제거한다. 새 환경에서는 `cp .env.example .env` 가 먼저다
- lib/api.js 의 mock JSON 은 정적 import 가 아니라 동적 import 다. 실서버 전환 시 main 번들에서 빠진다(현재 mock 청크 6개 분리, main 176KB)

### 1.5 봄내 이식 (단독)  [x]  2026-09-06
DESIGN_DELTA.md 의 1.5단계 작업 범위 그대로. 1단계 파일을 고치는 마지막 단독 작업이다. 여기부터 2단계 병렬이 시작된다.

**수정**
- tokens.js radius 6단(xs 6 / sm 10 / md 12 / lg 16 / xl 20 / full). 기존 sm 6 이 xs 로 내려가고 sm md lg 값이 전부 커졌다
- tokens.js shadow 3단(sm md lg). card 는 sm, float 는 lg 별칭으로 tailwind.config 에서 매핑. 컴포넌트는 shadow-card shadow-float 를 그대로 쓴다
- tokens.js motion easing 4종(out inOut drawer spring), duration 5종(press 120 / fast 160 / pop 180 / dur 280 / sheet 360). page 320 은 dur 280 으로 내렸다
- tailwind.config.js transitionDuration/TimingFunction 재매핑. ease-standard 는 사라지고 ease-drawer ease-spring 이 들어왔다
- index.css :root 모션 변수 9개(tokens 와 1:1), .pressable, .pop-panel / .pop-panel-exit / .pop-instant
- ui/Button variant 5종을 ring-inset 으로. secondary-primary 추가. 박스 치수는 variant 무관 동일(측정 확인)
- ui/Select 에 봄내 FieldSelect 디테일 흡수. ui/MultiSelect 도 같은 팝 규약으로
- ui/ 전수 radius 재확인. Badge StatusPill Skeleton Tooltip Select MultiSelect 옵션의 rounded-sm 을 rounded-xs 로 옮겼다(원래 의도가 6px 이었다)
- duration-base 11곳을 duration-fast 로. 토큰에서 base 가 사라졌으므로 안 고치면 조용히 기본 150ms 로 떨어진다

**신설**
- hooks/usePopExit.js, hooks/useBodyScrollLock.js (봄내 원본 이식. tokens import 경로만 교체)
- i18n/ 전체. LangContext.jsx, LangSwap.jsx, {ko,en,ja,zh} x {common,chat,facility,admin,legal} 20개 + 언어별 index 4개. 322키 x 4언어
- components/nav/LangSwitch.jsx (봄내 LangMenu 이식. 3언어에서 4언어로)
- components/layout/TopNav.jsx 골격. LangSwitch 자리만 잡았다. 본체는 2단계 에이전트 A

**1.5단계에서 내린 결정과 발견**
- **LangSwap 은 span 마다 lang 속성이 있어야 시프트가 0 이 된다.** 처음엔 봄내 원본대로 grid 겹침만 했는데 320/768/1440 전 폭에서 ja zh 로 바꿀 때 인접 요소가 3~4px 밀렸다. html lang 이 바뀌면 브라우저의 CJK 글꼴 선택이 달라져 숨은 항목의 폭까지 변하기 때문이다. 각 span 에 lang 을 박아 해결했다. 봄내 원본에 없는 수정이다
- LangSwap 셀 폭은 4언어 최댓값이다. DESIGN_DELTA 의 "폭 기준 ko" 를 문자 그대로 하려면 다른 언어를 absolute 로 빼야 하는데 그러면 ko 보다 긴 언어가 잘린다. 잘림 없이 시프트 0 을 택했다. ko 는 설계 기준이지 폭 상한이 아니다
- t(key, vars) 로 두 번째 인자를 받는다. `{org}` 치환용. 기관명은 사전이 아니라 설정값에서 오므로 사전에는 자리표시자만 있다
- IconButton 에 forwardRef 를 붙였다. LangSwitch 가 닫을 때 트리거로 포커스를 되돌려야 한다
- Modal Drawer 에 useBodyScrollLock 적용. Drawer side=left 가 오른쪽에서 들어오던 1단계 버그를 slideInLeft 로 고쳤다. 2단계 모바일 사이드바가 이 경로를 쓴다
- index.css 애니메이션 클래스가 CSS 변수를 참조하도록 바뀌었다. 클래스 이름은 그대로지만 값이 달라졌다. **PATTERNS.md 17절의 리터럴 cubic-bezier 와 ms 값은 이제 옛 값이다.** 클래스만 쓰고 값은 index.css 를 본다
- docs 정리. 1.5 zip 이 루트와 `docs 2` 에 이중으로 풀려 있어 docs/ 로 합쳤다. DESIGN_DELTA.md 와 _bomnae_ref/ 는 docs/ 아래다. SESSION_HEADER.md 에 4-1 항목으로 추가했다

**ja zh 네이티브 검수 준비물 (심사 전)**
- 대상: client/src/i18n/ja/*.js, client/src/i18n/zh/*.js 각 322키. 기계 번역 초안이다
- ko 와 en 은 검수 불필요. ja zh 만 원어민 1인씩
- 우선순위 1: common.status(22개), chat(상담 홈 문구와 추천 질문), facility. 시민이 보는 면이다
- 우선순위 2: legal.privacy(법적 문구라 오역 위험이 크다)
- 우선순위 3: admin. 심사 발표는 한국어라 후순위
- 검수자에게 줄 것: 각 파일과 대응하는 ko 원문. 키 구조를 바꾸지 말 것과 줄표 금지를 같이 전달한다

### 2. 병렬 (파일 소유 계약)  [x]  2026-09-06  A B C 전부 완료
**1단계와 1.5단계 파일은 아무도 수정하지 않는다.** tailwind.config.js, index.css, tokens.js, ui/ 전부, dashboard/StatusPill.jsx, lib/, hooks/ 전부(useChat useMediaQuery useToast useFocusTrap usePopExit useBodyScrollLock), store/, App.jsx, **i18n/ 전부**, **nav/LangSwitch.jsx**.
i18n 키를 추가해야 하면 ko en ja zh 네 사전에 같이 넣는다. 한 언어만 고치면 동형 검증이 깨진다.
문자열은 하드코딩하지 않는다. t() 또는 LangSwap 이다. 새 화면 문구는 ko 를 먼저 쓰고 나머지 3개를 같은 키로 채운다.
고쳐야 하면 아래 "1단계 파일 수정 요청" 에 한 줄 적고 3단계에서 단독 반영한다.
layout/PublicLayout AdminLayout RequireAuth 는 지금 골격만 있다. 담당 에이전트가 채운다(1단계 파일 아님).
- 에이전트 A 시민 면: layout/PublicLayout TopNav Footer, nav/*, chat/* 전부, pages/public/* 전부, facility/FacilityCard HoursTable
- 에이전트 B 관리자 골격 + 대시보드: layout/AdminLayout Sidebar Topbar RequireAuth, dashboard/KpiCard TrendChart BarChart DonutChart Heatmap RankList DateRangeTabs ReviewQueueCard, pages/admin/DashboardPage LoginPage AnalyticsPage
- 에이전트 C 관리자 운영 화면: dashboard/DataTable WeekCalendar, facility/FacilityAdminCard, pages/admin/LogsPage HandoffPage KnowledgePage FaqAdminPage FacilitiesAdminPage FacilityEditPage ReservationsPage UsersPage SettingsPage
- 누구도 1단계 파일을 수정하지 않는다. 필요하면 PROGRESS 에 요청 적고 3단계에서 단독 반영


#### 2-A 시민 면 (에이전트 A)  [x]  2026-09-06
담당 파일만 썼다. 1단계 1.5단계 파일과 다른 에이전트 파일은 읽기만 했다.

**작성**
- layout/PublicLayout(설정을 한 번만 불러 Outlet context 로 내림), TopNav(panelOpen max-width 전환, 모바일 풀스크린 메뉴), Footer
- nav/Logo, nav/UserMenu(관리자 프로필 드롭다운. Sidebar 와 Topbar 가 쓴다)
- chat/ 13종: ChatHero Composer SuggestionChips MessageList UserBubble AnswerText AnswerSkeleton SourcePanel ActionBar FacilityStatusCard HandoffCard NoticeCard
- facility/FacilityCard, facility/HoursTable
- pages/public/ 8종: ChatPage FacilitiesPage FacilityDetailPage NoticesPage NoticeDetailPage FaqPage PrivacyPage NotFoundPage

**PITFALLS 대응 위치**
- 1 근거 열 항상 렌더 → MessageList 답변 행 grid 두 열 고정. 근거 0건에도 우측 트랙 예약(측정: grid-template-columns 704px 340px 유지)
- 2 앵커 → MessageList `c.scrollTo({top: q.offsetTop - 24})` rAF 1회 + 450ms 재확정. scrollIntoView smooth 미사용
- 3 바닥 추적 없음 → 스트리밍 중 스크롤 위치가 질문 앵커에 그대로 있음(측정: scrollTop 326 = anchorTarget 326)
- 4 동적 스페이서 → useLayoutEffect. 스트리밍 중 clientHeight - (답변바닥 - 질문top), 완료 후 min(needed, 24vh, 160)
- 5 재보정 → 완료 직후 두 프레임 뒤 min(앵커, maxScroll)(측정: 앵커 326, maxScroll 174 → scrollTop 174)
- 6 아래로 가기 → 마지막 메시지 요소 기준 dist > 120. 숨김 상태에서 tabIndex -1
- 7 한글 조합 Enter → Composer `isComposing || keyCode 229` 이면 return
- 8 스트리밍 중 근거와 인라인 카드 숨김 → `show = !(streaming && isLast)`
- 9 스트리밍 중 Composer 와 칩 잠금
- 10 답변 완료 후 textarea 재포커스
- 11 stripMarkdown 경유 후 AnswerText 렌더. react-markdown 미도입
- 17 헤더도 본문과 같은 컨테이너 클래스

**에이전트 A 가 내린 결정**
- i18n 키 322 → 356(34키 x 4언어 동시 추가). 네임스페이스는 5종 유지했다. 공지와 FAQ 화면 문구는 새 네임스페이스를 만들지 않고 `common.notice.*` `common.faq.*` 아래 뒀다. 6종으로 늘리는 것은 DESIGN_DELTA 결정 변경이라 병렬 단계에서 단독으로 하지 않았다
- FAQ 카테고리와 시설 유형 라벨(typeLabel)은 mock 데이터의 한국어 원문을 그대로 쓴다. 데이터 다국어는 범위 밖(IA.md)
- 언어는 메모리 상태라 전체 새로고침하면 ko 로 돌아간다. SPA 내부 이동에서는 유지된다(측정 완료). localStorage 금지의 결과이며 정상이다
- HoursTable 은 휴관을 문자열 비교하지 않는다. 시각 범위 패턴이 없으면 휴관으로 본다. 데이터 원문이 언어별로 다를 수 있어서다
- SourcePanel 헤더는 `chat.answer.sourceCount` 한 문장이다. `이 답변의 근거` 와 `근거 N건` 을 겹쳐 쓰다가 중복이 나와 문구를 합쳤다(4언어 동시 수정)
- 사용자 말풍선도 답변과 같은 grid 에 넣었다. 대화 컬럼 전체 폭에 우측 정렬하면 근거 열 위로 떠서 답변과 어긋난다
- NotFoundPage 는 담당 목록에 이름이 없지만 pages/public/ 안이라 손댔다. 1단계 스텁의 하드코딩 한국어를 i18n 으로 옮긴 것뿐이다
- 시설 사진 파일이 없어 FacilityCard 는 onError 로 유형 아이콘 대체 면을 그린다


#### 2-B 관리자 골격 + 대시보드 (에이전트 B)  [x]  2026-09-06
담당 파일만 썼다. 1단계 1.5단계 파일과 A C 담당 파일은 읽기만 했다. nav/UserMenu 는 A 완성분을 붙이기만 했다.

**작성**
- layout/AdminLayout(lg 240 / md 레일 64 / md 미만 Drawer, 데스크톱 권장 배너), layout/Sidebar, layout/Topbar, layout/RequireAuth(로딩 화면 추가)
- dashboard/ 8종 + 도우미: KpiCard TrendChart BarChart DonutChart Heatmap RankList DateRangeTabs ReviewQueueCard, chartUtils.js
- pages/admin/ 3종: DashboardPage LoginPage AnalyticsPage

**KPI 4장은 사업계획서 4대 가설 그대로다**
- H1 민원 자동처리율 63.8% / 목표 60% 이상 / 달성
- H2 이용자 만족도 NPS 24p / 목표 +20p / 달성
- H3 담당자 응대시간 41분 / 도입 전 92분 대비 55.4% 감소. 목표 50% 감소 / 달성
- H4 응답 정확도 88.4% / 목표 90% 유지 / 근접(warning)
지표명은 i18n admin.dashboard.* 에 있고 문자 단위로 사업계획서와 같다. 화면에서 바꾸지 않는다.

**에이전트 B 가 내린 결정**
- `dashboard/chartUtils.js` 신설. 크기 측정(ResizeObserver) 축 계산 진입 플래그를 차트 4종이 공유한다. COMPONENTS.md 트리에 없는 파일이라 여기 기록한다. 네 파일에 같은 코드를 복사하지 않으려고 뺐다
- **차트는 viewBox 스케일링이 아니라 ResizeObserver 로 실제 픽셀 폭에 맞춰 그린다.** viewBox 를 늘리면 320px 에서 축 글자가 5px 이 되어 못 읽는다
- **미해결 계열은 chart-3 이 아니라 chart-4 파선이다.** DESIGN.md 차트 표는 3계열을 chart-1/2/3 으로 두지만 chart-3(#DBEAFE)은 흰 배경 대비 약 1.2:1 이라 2px 선이 보이지 않는다. chart-4(#C5CAD1, 약 1.7:1)로 올리고 파선을 더했다. DESIGN.md 가 요구한 "색으로만 구분하지 않는다"를 패턴으로 충족한다. **차트 팔레트 대비는 3단계에서 재검토 대상이다**(3계열을 흰 배경에서 3:1 로 만들려면 팔레트 자체를 손봐야 한다)
- 도넛은 색이 chart-1~4 넷뿐이라 기타가 생기면 실제 조각을 셋만 둔다. 넷 + 기타로 두면 기타가 chart-1 과 같은 색이 된다(검증 중 발견해 수정)
- KpiCard 에 `invertDelta` 를 뒀다. 담당자 응대시간은 줄어드는 것이 좋은 지표라 증감 색을 뒤집는다
- LoginPage 는 `state.from` 의 쿼리까지 살린다. `/admin/analytics?tab=nps` 딥링크가 로그인 뒤 그대로 열린다(검증 완료)
- Topbar actions 슬롯은 stale 될 수 있다(useTopbar 가 title 만 의존). **슬롯에는 자기 상태를 스스로 읽는 컴포넌트만 넣는다.** DateRangeTabs 가 useAdminUi.range 를 직접 읽는 이유다. 페이지 지역 상태를 클로저로 잡은 JSX 를 넣으면 안 된다
- 분석의 언어별 질문 유형별은 API 응답에 없다. 상담 로그 260건을 클라이언트에서 집계했다. 없는 수치를 지어내지 않았다
- CSV 는 화면에 보이는 표를 클라이언트에서 만들어 내려받는다. 백엔드 export 가 붙으면 그 주소로 바꾼다
- i18n 키 356 → 392(36키 x 4언어 동시 추가. admin.unit admin.topbar admin.sidebar admin.topic 등)


#### 2-C 관리자 운영 화면 (에이전트 C)  [x]  2026-09-06
담당 파일만 썼다. 1단계 1.5단계 파일과 A B 담당 파일은 읽기만 했다. StatusPill 도 읽기만 했다.

**작성**
- dashboard/DataTable(정렬 열숨김 행클릭 모바일 카드전환 페이지네이션), dashboard/WeekCalendar
- facility/FacilityAdminCard
- pages/admin/ 9종: LogsPage HandoffPage KnowledgePage FaqAdminPage FacilitiesAdminPage FacilityEditPage ReservationsPage UsersPage SettingsPage

**사업계획서와 이어지는 곳**
- LogsPage 드로어의 정확도 리뷰(정답 오답 보류 + 메모)가 H4 응답 정확도의 원천이다. `?review=1` 샘플 리뷰 모드는 20건을 순서대로 넘기며 저장하면 다음 건으로 넘어간다
- HandoffPage 완료 처리가 H3 담당자 응대시간의 원천이다. 완료 탭에 처리 시간이 분 단위로 보인다
- KnowledgePage 승인 대기 탭이 Human in the loop 다. 질의 로그에서 만들어진 FAQ 후보를 승인 수정 반려로 판단한다
- FacilitiesAdminPage 최근 운영 로그와 오늘 상담 건수는 요구사항 4(반복 질문을 숫자로)를 시설 단위로 잇는다

**에이전트 C 가 내린 결정과 발견**
- **DataTable 모바일 카드에서 button 안 button 이 나왔다.** 카드 전체를 button 으로 감싸니 셀 안의 Toggle 이 중첩됐다(React validateDOMNesting 경고로 검출). 카드는 div 로 두고 제목만 버튼으로 바꿨다
- 행 Enter 는 `e.target === e.currentTarget` 일 때만 처리한다. 셀 안 버튼에서 올라온 Enter 를 행 클릭으로 가로채면 안 된다
- **정렬과 페이지는 DataTable 이 전체 행 위에서 처리한다.** 그래서 페이지가 `pageSize=1000` 으로 전체를 받아온다. 서버 페이지 안에서만 정렬하면 사용자를 속인다. 백엔드가 붙어 실제 페이징을 하면 정렬도 서버로 넘겨야 한다
- 정확도 리뷰는 네이티브 radio 를 sr-only 로 감추고 라벨을 칩처럼 그린다. 그룹 의미와 방향키 이동을 브라우저가 준다. 커스텀 버튼 그룹으로 다시 만들지 않았다
- 인계 부서 목록은 시설 데이터에서 파생한다(`[...new Set(facilities.map(f => f.department))]`). 부서명을 화면에 박지 않는다
- **상담 로그 mock 에는 답변 본문이 없다.** 지어내지 않고 "백엔드 연결 후 표시됩니다" 안내로 두었다. `open.answer` 가 오면 그대로 그린다
- WeekCalendar 셀 색은 StatusPill 의 `statusTone(status)` 을 받아 tone 에서 면색으로만 매핑한다. 상태에서 색으로 가는 매핑은 StatusPill 한 곳이다
- 시설 관리 요약 4장과 오늘 상담 건수는 상담 로그를 집계해 만든다. 없는 수치를 지어내지 않았다
- i18n 키 392 → 450(58키 x 4언어 동시 추가)

### 3. 통합 (단독)  [x]  2026-09-06  배포만 남음
2단계 등재 대기 항목을 전부 반영하고 통합 검증했다. 1단계 파일도 단독으로 고쳤다.

**1) mock 쓰기 읽기 계약 정합 (lib/api.js, logs.json)**
- `POST /api/handoff` → `{ticketId, department, phone, hours}`. **접수 건이 관리자 인계 목록에 실제로 쌓인다.** 시연 왕복의 연결 지점이다
- `GET /api/admin/logs/:id` → 전체 대화(history) + sources[] + review. 드로어 답변 영역이 채워진다
- logs.json 260행에 `answer` 시드를 채웠다. topic 과 시설 데이터로 만든 합니다체 한 문장이고 질문 언어에 맞춘다(ko 230 en 14 zh 9 ja 7). unresolved 는 자료 없음 문구, handoff 는 인계 안내 문구. mock/README.md 에 기록
- 관리자 쓰기 전 경로가 갱신된 객체를 돌려준다. 화면은 낙관적 업데이트가 아니라 응답으로 반영한다(LogsPage HandoffPage KnowledgePage FaqAdminPage)
- 인계 완료 시 서버가 접수부터 지금까지를 `handleMinutes` 로 계산해 돌려준다. H3 지표의 원천
- **지식베이스 승인이 FAQ 를 실제로 만든다.** 승인 대기에서 빠지고 faqs 배열에 들어간다
- mock 은 `structuredClone` 사본을 세션 메모리에 두고 쓰기를 쌓는다. 새로고침하면 초기화된다
- 검토 대기 큐를 대시보드와 사이드바가 같은 계산(`reviewQueue`)으로 본다. 사이드바 배지는 라우트가 바뀔 때마다 다시 센다

**2) 차트 팔레트 대비 (tokens.js, DESIGN.md)**
- chart-1 #2563EB 5.17:1 유지 / chart-2 #93C5FD 1.80 → **#3B82F6 3.68:1** / chart-3 #DBEAFE 1.22 → **#7C838C 3.83:1** / chart-4 #C5CAD1 1.65 → **#A8AEB6 2.24:1**(기준선 전용, 데이터 계열 아님)
- 데이터 3계열 전부 흰 배경 3:1 이상. WCAG 2.2 1.4.11 충족
- **계열 간 상호 대비는 명도만으로 1.4를 넘길 수 없다.** 흰 배경 3:1 을 만족하는 색이 좁은 명도 구간에 몰리기 때문이다(탐색 결과 최댓값 1.30). 그래서 chart-3 을 파랑이 아닌 중립색으로 두어 색상으로 구분되게 했다
- TrendChart 미해결 계열을 chart-4 파선에서 **chart-3 파선**으로 되돌렸다. 이제 색이 보이고 패턴 중복도 유지된다
- DESIGN.md 차트 색 표에 대비값과 조정 이유를 적었다

**3) i18n 네임스페이스 — common 유지 확정**
- 공지와 FAQ 문구는 `common.notice.*` `common.faq.*` 에 그대로 둔다. 6번째 네임스페이스로 분리하면 순수 이동인데 파일만 4개 늘어난다. DESIGN_DELTA.md 네임스페이스 절에 결정 기록
- 키 450개, ko en ja zh 차집합 0 유지

**4) 통합 중 추가로 고친 것**
- **상태 색 매핑을 StatusPill 한 곳으로 완전히 모았다.** KpiCard 가 `STATUS_TEXT` 를, WeekCalendar 가 `FILL` 을, HoursTable 이 휴관 색을 각자 갖고 있었다. StatusPill 에 `TONE_TEXT` `TONE_FILL` 을 두고 셋 다 거기서 받아 간다. 이제 상태에서 색으로 가는 길은 StatusPill 파일 하나뿐이다(grep 0 확인)
- **TopNav 데스크톱 메뉴를 LangSwap 으로 바꿨다.** `t()` 로 그리니 언어를 바꿀 때 메뉴 항목이 서로 밀렸다(1440 에서 631 → 710 → 762). LangSwap 은 1.5단계에서 만들어 두고 앱에서 아무도 안 쓰고 있었다. 이제 768 1024 1440 전 폭에서 시프트 0


### 4. 크래프트 패스 (단독)  [x]  2026-09-06
기능을 더하지 않고 완성도만 올렸다. 여백 위계 정렬 절제된 마이크로 모션 밀도만 손댔다.

**1) 자산 교체**
- 시설 유형 플레이스홀더 5종 `public/images/facilities/type-{sports,culture,tourism,parking,etc}.svg`. 320x200, mute 면 + line-def 테두리 + 유형 아이콘 48(text-ter). **카드가 깨진 이미지를 띄우던 상태가 사라졌다**
- 파일명 규칙은 그대로다. facilities.json 의 `image` 는 여전히 `/images/facilities/fac-001.jpg` 이고, 그 파일이 없을 때만 유형 플레이스홀더로 떨어진다. 실사진을 그 경로에 넣으면 즉시 반영된다
- 일러스트 4종 `empty.svg` `no-results.svg` `not-found.svg` `login.svg`. primary 단색 + primary-line 보조. 빈 상태와 404 와 로그인에만 쓴다
- 브랜드 마크 `public/logo-mark.svg`. **파비콘으로 연결했다.** 지금까지 모든 페이지 로드에서 `/favicon.ico` 404 가 났었고 이제 4xx 응답 0 이다
- 자산 10개 전부 tokens 값만 쓴다(아래 자산 색 표). SVG 는 tokens 를 import 할 수 없어 hex 가 들어가는 유일한 예외다

**2) 마이크로 인터랙션**
- 스트리밍 커서. 마지막 토큰 뒤 2px 캐럿 하나. **reduced-motion 에서는 줄이는 게 아니라 `display: none` 으로 지운다.** 스트리밍 동안만 존재하는 상태 표시라 스켈레톤과 같은 성격의 예외로 본다(DESIGN.md 무한 반복 금지의 두 번째 예외. 기록해 둔다)
- 근거 카드 stagger 진입(80ms 시작, 70ms 간격), ActionBar 지연 진입, 인라인 카드 지연 진입
- 토스트가 들어올 때 흘러들고 사라지기 직전 스스로 빠진다. 스토어를 고치지 않고 두 번째 애니메이션을 3720ms 지연으로 걸었다
- 드로어 딤을 패널과 같은 sheet 시간으로 맞췄다. 층이 따로 놀지 않는다
- `aria-busy` 를 스트리밍 중 답변 영역에 붙였다

**3) 밀도와 위계**
- 상담 홈 idle 수직 리듬을 넓혔다(헤드라인 mt-4 서브, mt-10 lg:mt-12 입력창, mt-5 칩, mt-12 lg:mt-14 신뢰 문구). 입력창이 주인공이 되게
- 웨이트 공존 측정: 대시보드 4단(400/500/600/700), 상담 로그 4단, 상담 홈 3단, 시설 안내 3단. DESIGN 의 최소 3단 조건 충족
- 4K 3840 에서 시민 콘텐츠 1400 고정 좌우 여백 1220, 관리자 1600 고정 여백 1240. 늘어나지 않는다

**4) 빈 상태 전수**
- 상담 로그 필터 0, FAQ 검색 0, 인계 탭별 3종(대기 처리중 완료), 지식 승인 대기 0, 시설 유형 필터 0, FAQ 카테고리 0, 404. 각각 문구와 일러스트를 상황에 맞게 나눴다(검색은 no-results, 404 는 not-found)
- i18n 8키 추가(450 → 458). ko en ja zh 동시

**크래프트 중 발견해 고친 것**
- **인계 상태를 바꿔도 목록에서 안 빠졌다.** 처리 중 탭에서 완료로 바꿔도 카드가 그대로 남아 탭이 거짓말을 했다. 응답 status 가 현재 탭과 다르면 목록에서 제거한다
- **시설 카드 유형 배지가 안 보였다.** 중립 배지(mute 면)가 플레이스홀더 배경(mute)과 같은 회색이었다. page 면 + shadow-card 로 띄웠다. 배지 텍스트 대비 10.52:1
- 스트리밍 커서 폭을 `w-[2px]` 에서 spacing 토큰 `w-0.5` 로 바꿨다. 토큰에 2px 이 있는데 임의값을 쓸 이유가 없다

**자산 색이 tokens 와 일치하는지 (SVG 는 tokens import 불가라 유일한 hex 예외)**

| 자산 | 색 | 토큰 |
|------|-----|------|
| logo-mark.svg | #2563EB / #FFFFFF | primary / page |
| illustrations/empty no-results not-found login | #2563EB / #BFDBFE | primary / primary.line |
| facilities/type-* 5종 | #F0F2F5 / #DDE1E6 / #9A9EA5 | mute / line.def / text.ter |

자산 10개, tokens 밖 색 0건. 스크립트로 tokens.js 와 대조했다.

### 5-0. 확장 골격 (단독)  [x]  2026-09-06
5단계 병렬(D·E)이 붙을 라우트와 메뉴와 사전만 깐다. 새 화면의 내용은 만들지 않았다. 스텁 6개가 제목과 소제목과 "준비 중입니다" 한 줄만 그린다.

**신설**
- pages/admin/InsightsPage ReportsPage ForecastPage RoadmapPage BillingPage, pages/public/AboutPage. 전부 스텁
- i18n/{ko,en,ja,zh}/about.js. 6번째 네임스페이스. 각 언어 index.js 병합에 등록

**수정**
- App.jsx 라우트 6개 추가. 전부 lazy. 관리자 4종은 전체 역할 블록, billing 은 users settings 와 같은 `RequireAuth roles={['admin']}` 블록 안. /about 은 PublicLayout 공개
- Sidebar.jsx MENU 배열 → GROUPS 3구획(운영 8, 인사이트 5, 설정 2). 240 레일은 소제목(caption text-meta) + line-sub 구분선, 64 레일은 구분선만. billing 은 useAuthStore 역할이 admin 일 때만 렌더
- TopNav.jsx MENU 에 /about 추가. 데스크톱은 LangSwap, 모바일은 t(). 둘 다 같은 배열에서 나온다
- i18n 22키 × 4언어 추가(458 → 480). admin.nav 5, admin.sidebar 그룹 3, 화면별 title desc 10, common.nav.about, common.meta.preparing, about.title, about.desc
- IA.md 관리자 표를 구획·역할 열 포함 15행으로 교체, 시민 면에 /about 6번 추가. ROUTES.md 6행 추가

**5-0 에서 내린 결정**
- **스텁이 제목만 그리면 화면이 빈다.** 제목은 관리자 Topbar 가 이미 그리므로 본문에 소제목 한 줄과 "준비 중입니다" 를 넣었다. 심사 중 우연히 들어가도 고장으로 보이지 않는다. D·E 가 본문을 채우면 `common.meta.preparing` 줄만 지운다
- **관리자 스텁도 useTopbar 를 부른다.** 안 부르면 Topbar 가 직전 화면 제목을 그대로 들고 있는다
- **billing 만 역할로 가린다.** users 와 settings 도 admin 전용 라우트인데 사이드바에는 지금도 전 역할에 보이고 클릭하면 /admin 으로 튕긴다. 5-0 범위 밖이라 안 고쳤다. D·E 나 6단계에서 `roles` 필드를 두 항목에 붙이면 끝난다(GROUPS 항목에 이미 필드가 있다)
- **사이드바가 세로로 넘친다.** 15항목 + 소제목 3 + 구분선 2 = 842px 다. 1440×900 에서 nav 가용 높이 723px 라 설정 구획이 스크롤 아래로 내려간다. overflow-y-auto 라 잘리지는 않고 1080 높이에서는 전부 보인다. 항목을 더 늘리려면 구획 접기가 필요하다
- **Footer 에는 소개를 안 넣었다.** Footer.jsx 는 5-0 담당 파일이 아니다. 필요하면 D·E 가 넣는다

**IA_PHASE5.md 문제**
- 루트 `IA_PHASE5.md` 의 내용이 `docs/DESIGN_DELTA.md` 의 옛 사본이다(3단계에서 추가한 줄 하나만 없고 나머지 전부 동일). 5단계 설계가 아니다
- 5-0 은 프롬프트에 적힌 6경로·3구획·아이콘·역할 명세를 설계 원본으로 삼아 실행했다. 그 결과를 IA.md 표에 확정으로 적었다
- 담당 파일이 아니라 덮어쓰지 않았다. D·E 를 붙이기 전에 실제 5단계 설계를 이 파일에 다시 넣어야 한다

**5단계 병렬 소유 계약 (D·E)**
- **1~4단계 파일과 5-0 이 만진 파일은 아무도 수정하지 않는다.** tokens.js, tailwind.config.js, index.css, ui/ 전부, dashboard/StatusPill.jsx, lib/, hooks/, store/, i18n/ 사전 구조, App.jsx, Sidebar.jsx, TopNav.jsx
- 새 화면 문구 키는 각자 자기 화면 것만 추가한다. 추가는 ko en ja zh 4개 동시
- D: 데이터 자산화(insights), 운영 리포트(reports) / E: 수요 예측(forecast), 요금·플랜(billing), 로드맵(roadmap), 소개(about)
- 공통 컴포넌트가 필요하면 만들지 말고 PROGRESS 의 "1단계 파일 수정 요청" 에 적는다. 통합 때 단독으로 반영한다

### 5-D. 인사이트 운영 (병렬)  [x]  2026-09-06
IA_PHASE5.md 소유 계약의 D 담당분. 계획서 4-1 ①②③ 과 3-1 3-4 3-6 을 화면으로 증명한다. E 담당(BillingPage AboutPage RevenueModelCard PipelineDiagram StageTransition billing.json about 네임스페이스)은 읽지도 쓰지도 않았다.

**신설**
- insight/MilestoneChart.jsx 자동처리율 상승 곡선. 실측 실선(chart-1) + 마일스톤 목표선 파선(chart-4) + 60 80 90 마커
- insight/PatternCard.jsx 발견 패턴 카드. 패턴 근거 권고 예상효과 4단
- insight/ForecastChart.jsx 실측 실선 + 예측 파선 + 신뢰구간 음영. 예측 구간은 같은 chart-1 이고 파선과 음영으로만 구분한다
- insight/RoadmapStages.jsx 4단계 시장확대 진척. 현재 단계 강조
- insight/GrowthTargets.jsx 연도별 목표 표. 행마다 자기 최대값 기준 막대
- pages/admin/InsightsPage ReportsPage ForecastPage RoadmapPage 4종 본문(5-0 스텁의 준비 중 줄 제거)
- mock/insights.json patterns.json reports.json forecast.json roadmap.json
- i18n admin 네임스페이스 124키 x 4언어(480 → 604)

**5-D 에서 내린 결정**
- **예측값은 지어내지 않고 logs.json 260건에서 뽑았다.** 완전한 4주(08.10~09.06)의 시설별 실측 주간 건수를 기준선으로 삼고 시설 유형별 배수를 곱해 4주를 예측했다. 추석 연휴(09.24~26)가 든 09.21 주가 피크다. 화면에 "최근 31일 상담 260건의 요일과 시간대 분포를 확장해 계산했습니다" 로 근거를 적는다
- **패턴 4건의 근거 수치도 전부 로그 실측이다.** 묵호항 주말 일평균 1.63 대 평일 1.0(1.6배), 야간 21~02시 64건 24.6%(자동처리 45건), 요금 문의 75건 28.8%(비자동 28건), 망상 예약 문의 36건 83.7%. 계획서 예시(성수기 주차 문의 급증)가 실제로 데이터에 있었다
- **권고 인력 규칙을 화면에 적었다.** 처음엔 기준선 차이를 8로 나눠 전 행이 2명으로 똑같이 나왔다. 반올림 오차가 인력 권고가 되는 셈이라 규칙을 바꿨다. 지금은 예상 민원량 8건당 1명이고 평시보다 10% 이상 늘어나는 주차와 시설만 표에 올린다(15행). 규칙 문장을 표 위에 노출해 숫자를 검증할 수 있게 했다
- **성숙도를 100 에서 자르지 않는다.** 초과 달성이 안 보여서 자동처리율 106% NPS 120% 응대시간 111% 정확도 98% 로 실제 비율을 적는다. 막대 폭만 100 에서 멈춘다
- **GrowthTargets 막대는 한 색이다.** 행마다 단위와 최대값이 달라 색을 나누면 계열처럼 보인다. 행 이름이 구분하므로 chart-1 하나로 뒀다
- **패턴 카드 제목에 break-keep 을 넣었다.** 한국어 제목이 낱말 중간에서 끊겼다(성수기 주말 묵호항 공영주 / 차장). 프로젝트 첫 사용이다
- **mock JSON 에 한글이 0자다.** 값은 키와 수치만 두고 문장은 전부 i18n 이 조립한다. 4언어 전환이 데이터 수정 없이 된다

**1단계 파일 수정 요청 (통합 때 단독으로 반영)**
- lib/api.js 에 5단계 라우트 5개가 없다. 지금은 페이지가 mock JSON 을 직접 동적 import 한다(각 페이지 상단 load 상수, 주석 표기). 백엔드 전환 시 페이지마다 한 줄만 바뀌도록 격리해 뒀다
  - `GET /api/admin/insights` → insights.json
  - `GET /api/admin/patterns` → patterns.json
  - `GET /api/admin/reports` → reports.json
  - `GET /api/admin/forecast` → forecast.json
  - `GET /api/admin/roadmap` → roadmap.json
- mock/README.md 에 5단계 파일 5종 설명 추가 필요(D 담당 파일이 아니라 손대지 않았다). 요지: 수치는 logs.json 260건 실측에서 파생했고 문장은 i18n 에 있다

**E 와 통합할 때 확인할 것**
- 관리자 면에는 언어 전환기가 없다. i18n 4언어를 검증하려면 시민 면 LangSwitch 로 바꾼 뒤 관리자 화면으로 이동해야 한다(LangProvider 가 BrowserRouter 위에 있어 유지된다). 관리자 면에도 전환기를 둘지는 통합 때 판단
- 인사이트 4화면 캡처는 scratchpad 의 d-insights d-reports d-forecast d-roadmap d-report-drawer 다. 개발보고서 스크린샷 세트(docs/screenshots/)에 넣을지는 E 완료 후 통합에서 정한다

### 5-1. 에이전트 도구 UI (단독 선행)  [x]  2026-09-07
IA_PHASE5.md v2. 5단계의 축이 바뀌었다. 계획서가 G-Chat 을 "AI Agent 기반 공공시설 운영 플랫폼"이라 했으므로 챗봇이 아니라 에이전트로 보여야 한다. 에이전트와 챗봇의 차이는 셋이다. AI 가 무엇을 하는지 단계가 보이고, 실행 전에 사용자가 허용하고, 실행 결과가 카드로 남는다.

**v1 산출물 정리**
- 삭제: /about /admin/billing /admin/roadmap 라우트와 페이지, insight/RoadmapStages GrowthTargets, mock/roadmap.json, i18n about 네임스페이스(4언어)와 billing·roadmap 키, 사이드바 요금·플랜 로드맵, TopNav 소개 메뉴
- 프레임 교체: insights 와 reports 의 "신규 수익상품" "기관별 계약" 문구를 운영 개선 도구 서술로 바꿨다(4언어). IR 문구는 발표 PPT 가 할 일이다
- MilestoneChart PatternCard ForecastChart 와 insights/reports/forecast 3화면은 실제 관리자 기능이라 유지

**신설**
- chat/agent/ 5종: ToolCard(6종 아이콘·phase·펼침), ToolTimeline(접힘·스트리밍 중 최신만), ActionCard(확인·대안·거부·폼), ResultCard(예약·티켓), FollowupChips
- chat/agent/ToolDetails.jsx: 상세 렌더러 6종(SlotList LocationDetail FeeBreakdown KnowledgeHits HandoffDetail LangDetect) 을 한 파일에 named export 로 뒀다. 전부 20줄 안쪽이고 ToolCard 말고 쓰는 곳이 없다
- lib/ics.js: 예약 결과의 캘린더 파일. 의존성 없이 RFC 5545 최소 형태
- 스텁 4종: pages/public/WidgetPage, pages/admin/OnboardingPage SimulatorPage NoticesAdminPage
- i18n chat.agent 41키 + chat.tool 6 + chat.widget 2 + admin nav/화면 9 = 4언어 동시(480 → 630)

**수정(1단계 파일)**
- API_CONTRACT.md: tool·action·followups 이벤트, POST /api/chat/action(스트리밍), POST /api/chat/nps, sources 후방 호환, 백엔드 책임에 "쓰기 도구는 action 이벤트 없이 실행 금지"
- hooks/useChat.js: timeline[] 과 approveAction 과 sendNps 추가. **기존 읽기 루프와 토큰 처리는 한 줄도 안 바꿨다.** processLine 을 applyEvent 로 빼고 consume 을 send 와 approveAction 이 공유한다
- lib/api.js: actionStream, /api/chat/nps, 5단계 mock 라우트 4개(D 요청분), mocks 에 insights patterns reports forecast 적재
- lib/mockStream.js: 6종 도구 시나리오와 mockActionStream 신설
- App.jsx: 라우트 3개 삭제, 4개 추가. /widget 은 PublicLayout 밖이다(iframe 안에서 헤더와 푸터가 보이면 안 된다)
- Sidebar.jsx: 16개를 3구획으로, 소제목 클릭 접기. store/useAdminUi 에 collapsed 와 toggleGroup
- components/chat/MessageList.jsx: 타임라인 순서대로 ToolTimeline·AnswerText·ActionCard·ResultCard 배치, FollowupChips. **PITFALLS 1~8 스크롤 로직은 그대로다**

**5-1 에서 내린 결정**
- **쓰기는 상태를 가진 쪽이 한다.** 처음엔 mockStream 이 api.js 를 되import 해 티켓을 만들었다. 티켓 번호는 나오는데 관리자 목록에는 안 쌓였다. Vite dev 가 HMR 로 api.js 를 다시 서빙하면 모듈 인스턴스가 갈려 mocks 가 둘이 되기 때문이다. 지금은 api.js 가 자기 mockRequest 를 createTicket 콜백으로 넘긴다. 상태를 가진 인스턴스는 하나뿐이다
- **타임라인과 content 를 함께 쌓는다.** timeline 은 순서 보존용이고 content 문자열은 복사 버튼과 history 와 후방 호환용이다. 둘 중 하나만 두면 기존 기능이 깨진다
- **도구 카드는 텍스트를 나눈다.** 도구가 토큰 사이에 끼면 text 조각이 새로 시작된다. 연속 토큰만 같은 조각에 이어 붙인다
- **예약 시나리오에서 시설 상태 카드를 안 보낸다.** 외부 예약 시스템 버튼이 채팅 안 예약과 부딪힌다. 운영시간 시나리오에서는 그대로 보낸다
- **외국어 질문의 시설 매칭은 유형 낱말로 한다.** 한국어 시설명이 없는 질문은 tennis 網球 テニス 같은 낱말로 찾는다. 없으면 기본 시설이다
- **무한 반복 애니메이션 예외가 셋이 됐다.** 스켈레톤, 스트리밍 커서, 진행 스피너. 셋 다 상태 표시이고 장식이 아니다. ToolCard 스피너는 motion-reduce:animate-none 으로 끈다. ui/Button 의 loading 스피너는 1단계 파일이라 안 건드렸고 같은 처리가 필요하다(아래 요청)
- **관리자 면에는 언어 전환기가 없다.** 4언어 검증은 시민 면에서 언어를 바꾼 뒤 SPA 로 이동해야 한다(LangProvider 가 BrowserRouter 위)

**남긴 요청(6단계 단독)**
- ui/Button.jsx 의 loading 스피너에 motion-reduce:animate-none 추가. 1단계 파일이라 5-1 범위 밖
- mock/README.md 에 5단계 파일 설명 추가(D 요청 유지)

**5단계 병렬 소유 계약 (F·G)**
- **agent/ 는 읽고 쓰되 수정하지 않는다.** ToolCard ToolTimeline ActionCard ResultCard FollowupChips ToolDetails 는 5-1 확정분이다. 고칠 것이 있으면 PROGRESS 에 적고 6단계 단독에서 반영한다
- 1~4단계 파일과 5-1 이 만진 파일(useChat api.js mockStream App.jsx Sidebar MessageList useAdminUi API_CONTRACT)도 수정 금지
- **5-F 시민**: pages/public/ChatPage(레일 대화목록·QR 진입·NPS), WidgetPage, chat/WidgetShell, chat/NpsCard, 시민 i18n
- **5-G 관리자**: OnboardingPage, SimulatorPage, NoticesAdminPage, HandoffPage 확장, KnowledgePage 드로어, Topbar 알림, store/useNotifications, FacilityEditPage QR, lib/qr.js, SettingsPage 채널 탭, 관리자 i18n
- 문구 키는 각자 자기 화면 것만. 추가는 ko en ja zh 4개 동시

### 5-F. 시민 경험 (병렬)  [x]  2026-09-07
IA_PHASE5.md v2 의 2절 시민 경험 확장과 3절 웹 임베드 위젯. 5-1 이 만든 agent/ 도구 UI 위에 얹는다. 동결 파일은 읽기만 했다(타임스탬프로 확인. 전부 5-1 시각 그대로).

**신설**
- chat/ConversationRail.jsx: 이번 세션 대화 목록. 56 레일 + 240 겹침 패널. 모바일용 ConversationList 도 같이 내보낸다
- chat/NpsCard.jsx: 0~10 버튼 11개(44px) + 한 줄 코멘트. H2 이용자 만족도 NPS 원천
- chat/WidgetShell.jsx: 임베드 위젯. FAB 56 → 패널 clamp(360,30vw,420) x clamp(480,70vh,640)

**수정(담당 파일)**
- pages/public/ChatPage.jsx: 대화 목록 상태, QR 진입 판정, NPS 조건
- components/chat/ChatHero.jsx: 레일·QR 헤드라인과 칩·NPS 배치·모바일 드로어. 스트리밍 로직 부위는 손대지 않았다
- pages/public/WidgetPage.jsx: 5-1 스텁을 WidgetShell 로 채움. 쿼리 org lang 처리
- i18n chat.rail 6 + chat.qr 6 + chat.nps 10 + chat.widget 5 = 27키 x 4언어(630 → 657)

**5-F 에서 내린 결정**
- **대화 하나에 ChatHero 하나를 마운트한다.** useChat 은 대화 하나만 아는 훅이고 수정 금지 파일이다. 대화를 바꿀 때 언마운트하면 답변과 도구 카드가 사라지므로 숨긴 대화도 마운트를 유지한다. 숨은 동안은 clientHeight 가 0 이라 스페이서 계산이 어긋나므로, 다시 보일 때 MessageList 의 key 를 바꿔 마운트해 앵커와 스페이서를 새로 잡는다(PITFALLS 4·5)
- **레일 펼침은 레이아웃이 아니라 겹침이다.** 56 에서 240 으로 폭을 늘리면 대화 열이 다시 흘러 앵커와 스페이서가 흔들린다. DESIGN.md 도 레이아웃 속성 애니메이션을 금지한다(TopNav max-width 가 유일한 예외). 그래서 240 패널을 absolute 로 띄운다. 실측으로 대화 열 좌측 기준선이 펼침 전후 178 로 같다
- **모바일 대화 목록은 대화 화면 안에서 연다.** 설계는 TopNav 좌측 메뉴 아이콘이라고 했으나 TopNav 는 5-F 담당 파일이 아니다. 하단 Composer 위의 목록 버튼으로 Drawer(left) 를 연다. TopNav 진입이 필요하면 6단계에서 옮긴다
- **NPS 는 제출해도 카드를 지우지 않는다.** 처음엔 제출 즉시 부모가 언마운트해 아무 확인도 안 보였다. 지금은 NpsCard 가 스스로 감사 문구로 접힌다
- **위젯은 MessageList 를 쓰지 않는다.** MessageList 는 lg 뷰포트에서 근거를 우측 320 열로 뺀다. 420 패널을 데스크톱에서 직접 열면 그 열이 패널 안으로 들어와 본문이 뭉개진다. 그래서 위젯은 같은 agent 컴포넌트를 쓰되 배치만 단일 열로 다시 짰다. agent/ 는 수정하지 않았다. iframe 안에서는 뷰포트가 좁아 패널이 iframe 을 가득 채운다(실측 460x700)
- **QR 칩 순서를 아이콘에 맞췄다.** SuggestionChips 는 [시계 카드 달력 핀] 순서로 아이콘을 돌린다. 운영시간·요금·예약·주차 순으로 두어야 뜻과 아이콘이 맞는다
- **위젯 postMessage 는 마운트 때 close 를 한 번 보낸다.** 부모가 처음에 iframe 을 접어 둘 수 있어야 한다. 개발 모드에서 두 번 오는 것은 StrictMode 가 효과를 두 번 실행하기 때문이고 프로덕션 빌드에서는 한 번이다

**임베드 코드 형식 (5-G 설정 채널 탭이 이 형식을 만든다)**
```html
<iframe src="{origin}/widget?org={기관id}&lang=ko" title="G-Chat"
        style="position:fixed;right:0;bottom:0;width:460px;height:700px;border:0"></iframe>
<script>
  window.addEventListener('message', function (e) {
    if (!e.data || e.data.source !== 'g-chat-widget') return
    var f = document.querySelector('iframe[title="G-Chat"]')
    f.style.width = e.data.type === 'open' ? '460px' : '96px'
    f.style.height = e.data.type === 'open' ? '700px' : '96px'
  })
</script>
```
`lang` 은 ko en ja zh. 위젯이 열리고 닫힐 때 `{source:'g-chat-widget', type:'open'|'close'}` 를 부모에 보낸다.

### 5-G. 관리자 도구 (병렬)  [x]  2026-09-07
IA_PHASE5.md v2 의 3절 온보딩·QR 과 4절 관리자 도구 심화. 5-1 의 agent/ 카드를 관리자 화면에서도 쓴다.
동결 파일은 읽기만 했다. F 담당 파일도 손대지 않았다.

**신설**
- lib/qr.js: 의존성 없는 QR 인코더. 바이트 모드, 오류정정 L, 버전 1~10. GF(256) 리드솔로몬, 마스크 8종 벌점 평가
- store/useNotifications.js, admin/NotificationCenter.jsx: 알림 4유형. mock 상태에서 파생
- admin/onboarding/{OrgStep,FacilitiesStep,ManualStep,BuildStep,PreviewStep}.jsx
- admin/SimulatorChat.jsx: ChatHero 가 F 담당이라 chat/ 하위와 agent/ 를 조합해 관리자용으로 다시 짰다
- admin/FacilityQrCard.jsx

**수정(담당 파일)**
- pages/admin/OnboardingPage SimulatorPage NoticesAdminPage 채움
- HandoffPage: AI 제안 부서와 답변 초안과 발송 게이트
- KnowledgePage: 문서 드로어(청크·사용 질문·90일 경보·재색인)
- FacilityEditPage: QR 카드, SettingsPage: 채널 탭, Topbar: 알림 벨
- i18n admin 159키 x 4언어(657 → 816)

**5-G 에서 내린 결정**
- **QR 은 알고리즘을 직접 구현했다.** 의존성 0 규율 때문이다. 공표된 값으로 대조했다. RS 생성 다항식 7개와 10개, 형식 정보 비트(L 마스크 0 과 5)가 규격 표와 같다. 여기에 자체 디코더를 붙여 왕복 검증했다. 마스크를 풀고 지그재그로 읽어 원본 URL 이 그대로 나온다
- **QR 색 기본값을 없앴다.** 처음엔 `dark = '#000000'` 처럼 기본값을 뒀는데 그게 이 저장소의 유일한 하드코딩 hex 가 됐다. 지금은 호출부가 tokens 값을 반드시 넘긴다(text.pri #101010, page #FFFFFF)
- **시뮬레이터는 쓰기 확인 카드를 버튼 없이 보여 준다.** 관리자가 시험하다가 실제 예약이나 티켓을 만들면 안 된다. 시뮬레이션 배지와 안내 문구만 남기고 확인 버튼을 아예 그리지 않는다
- **발송 뒤 카드를 2.6초 두고 뺀다.** 상태가 완료로 바뀌면 기존 로직이 대기 탭에서 행을 바로 지웠고, 그래서 발송 결과 카드를 볼 수 없었다. 결과를 보여 준 뒤에 뺀다. 탭은 여전히 거짓말하지 않는다
- **발송 확인 버튼 라벨.** ActionCard 는 tool 로 라벨을 고른다. handoff 를 쓰면 "문의 접수"가 되어 발송에 안 맞아 목록에 없는 tool 을 넘겨 중립 라벨을 쓴다. API_CONTRACT 에 confirmLabel 필드가 이미 있으니 ActionCard 가 그걸 쓰게 하는 편이 낫다(6단계 요청)
- **공지 날짜는 로컬 기준이다.** toISOString 은 UTC 라 새벽에 하루 전으로 밀린다
- **QR 카드는 320 에서 위아래로 쌓는다.** 나란히 두면 카드가 9px 넘쳤다

**mock 쓰기 라우트가 없어 낙관적으로 동작하는 화면**
api.js 가 동결이라 아래는 화면 상태만 갱신한다. 새로고침하면 사라진다. 6단계에서 라우트를 넣으면 그대로 붙는다.
- 공지 생성·수정, 문서 재색인 1건, 온보딩 개통(설정 org 만 실제 PUT), 시뮬레이터 FAQ 후보 생성, 인계 답변 발송

### 6. 통합 (단독)  [x]  2026-09-07
5단계까지 낙관적 업데이트로만 돌던 것을 mock 계약으로 못 박고, F·G 가 등재한 요청 8건을 닫았다. 이번에는 동결 파일을 수정했다.

**mock 라우트 (api.js)**
- `POST /api/admin/notices`, `PUT /api/admin/notices/:id` 공지 저장. 저장하면 시민 `/api/notices` 가 바뀌고 지식베이스에 notice 문서로 함께 들어간다
- `POST /api/admin/knowledge/docs/:id/reindex` 문서 1건 재색인
- `GET /api/admin/knowledge/docs/:id` 청크 목록
- `POST /api/admin/onboarding` 기관 개통. 기관명이 설정에 들어가 시민 헤드라인과 신뢰 문구가 바뀐다
- `POST /api/admin/handoff/:id/reply` 답변 발송. 완료 처리와 처리 시간 기록을 서버가 한다
- `POST /api/admin/logs/:id/to-faq` 는 **새로 만들지 않았다.** 1단계 라우트가 이미 있었고 내가 같은 경로를 뒤에 또 만들어 죽은 코드가 되어 있었다. 원래 것을 body 를 받게 넓히고 중복을 지웠다
- 다섯 화면(공지·지식베이스·온보딩·시뮬레이터·인계)이 낙관적 갱신 대신 이 응답을 쓴다

**나머지 요청**
- ActionCard 가 `confirmLabel` 을 쓴다. 예약 "예약하기", 티켓 "문의 접수", 인계 발송 "문의자에게 발송" 세 라벨이 각각 정확하다. mockStream 과 HandoffPage 가 키를 보낸다
- ui/Button 스피너에 `motion-reduce:animate-none`. 전 스피너 grep 결과 누락 0
- 모바일 대화 목록을 TopNav 좌측 아이콘으로 옮겼다. ChatPage 와 TopNav 가 형제라 useChatUi 에 목록과 조작 핸들을 올려 잇는다. 대화가 없으면 아이콘도 없다
- SuggestionChips 가 칩의 `iconName` 으로 아이콘을 고른다. 순서 순환을 버렸다
- mock/README 에 5단계 규칙 기록, ROUTES 에 5단계 쿼리 표 추가

**6단계에서 내린 결정**
- **중복 라우트는 조용히 죽는다.** mockRequest 는 첫 매칭만 실행한다. to-faq 를 두 번 등록해 두고 새 것이 도는 줄 알았다. 라우트를 추가하기 전에 같은 경로가 있는지 먼저 본다
- **HMR 이 붙은 dev 에서는 모듈 인스턴스가 갈릴 수 있다.** 검증 스크립트가 `import('/src/lib/api.js')` 로 새로 부르면 앱이 쓰는 mocks 와 다른 사본을 본다. **화면에 그려진 값으로 확인해야 한다.** 5-1 에서 한 번 겪고 6단계에서 또 겪었다
- 온보딩 개통은 4단계 구축을 마쳐야 열린다. 자료를 올리지 않으면 구축 버튼이 잠기고 다음도 막힌다. 의도한 순서다

### 5단계 완료 (2026-09-07)
5-0 골격 → 5-1 에이전트 도구 UI → 5-F 시민 · 5-G 관리자 병렬. 라우트 25개, i18n 816키 x 4언어, 의존성 추가 0.
남은 것은 6단계 단독(위 "1단계 파일 수정 요청" 목록 반영)과 발표 준비다.

### 5. 발표 준비와 확장 (11월)  [ ]
- 백엔드 연동, VITE_USE_MOCK=false
- 1분 시연 영상 시나리오: 칩 클릭 → 스트리밍 → 근거 카드 → 시설 상태 카드 예약하기 → 담당자 연결 → 관리자 대시보드에서 방금 상담이 로그와 KPI 에 반영
- 이 시나리오는 4단계까지 mock 으로 전 구간 검증했다. 백엔드가 붙으면 같은 흐름이 실데이터로 돈다
- 확장 후보(범위 밖으로 기록만): 카카오톡 채널 실연동, 시설 데이터 다국어, 자체 예약 처리, 다크 모드, 오프라인 sLLM 시연 모드

## 심사 데모 관리자 자동인증 (2026-09-20)

심사 데모에서 로그인 절차를 없앴다. `/admin/login` 이든 `/admin/*` 어디든 로그인 화면과 입력 없이 곧바로 관리자 화면이 뜬다.
**`VITE_USE_MOCK=true` 일 때만 적용되고, `false`(백엔드 실연동)는 기존 로그인 로직을 그대로 탄다.**

| 파일 | 변경 |
|------|------|
| `lib/api.js` | `USE_MOCK` 을 export. mock 스위치가 두 곳에서 갈리지 않게 한 곳을 공유한다 |
| `store/useAuthStore.js` | mock 이면 초기값이 `user = mock 관리자(admin)`, `ready = true`. `fetchMe` 와 `logout` 은 mock 에서 no-op |
| `components/layout/RequireAuth.jsx` | 가드는 남기고 mock 이면 `<Outlet />` 을 바로 돌려준다(역할 가드 포함) |
| `App.jsx` | mock 이면 `/admin/login` → `/admin`. `/admin/dashboard` 별칭 추가. mock 에서만 알 수 없는 `/admin/*` → `/admin` |
| `pages/admin/LoginPage.jsx` | **손대지 않았다.** 백엔드 연동 때 복원용으로 그대로 둔다 |

### 함정 하나. fetchMe 가 데모 인증을 지운다

store 초기값만 인증됨으로 두면 부족하다. `App.jsx` 가 마운트할 때 `fetchMe()` 를 부르고,
mock 의 `/api/auth/me` 는 항상 401 이라 `catch` 에서 `user: null` 로 덮는다. 새로고침 직후 잠깐 대시보드가 보이다가
로그인으로 튕긴다. mock 이면 `fetchMe` 를 즉시 반환시켜 막았다.

### 검증 (프로덕션 빌드를 `vite preview` 로 서빙해 새 진입으로 확인)

| 항목 | 결과 |
|------|------|
| 직접 진입 11경로 | `/admin/login` `/admin` `/admin/dashboard` `/admin/logs` `/admin/analytics?tab=nps` `/admin/knowledge` `/admin/users` `/admin/settings` `/admin/onboarding` `/admin/foo` `/admin/foo/bar` 전부 로그인 없이 표시 |
| 로그인 필드 | 11경로 전부 `input[type=password]` **0개** |
| 새로고침 | 11경로 전부 같은 화면 유지 |
| 쿼리 보존 | `/admin/analytics?tab=nps` 가 쿼리까지 그대로 열린다 |
| 로그아웃 클릭 | 메뉴 항목이 실제로 눌리고, 결과는 `/admin` 대시보드. 인증이 풀리지 않는다. 새로고침 뒤에도 유지 |
| 웹스토리지 | localStorage 0, sessionStorage 0, cookie 0. 초기값만으로 유지된다 |
| **`VITE_USE_MOCK=false` 빌드** | `/admin/login` 은 "관리자 로그인" 폼, `/admin` 과 `/admin/logs` 는 `/admin/login` 으로 리다이렉트. 분기 정상 |
| 가로 스크롤 | 29경로 x 9폭 = **261건 중 0** |
| PITFALLS 1~17 | 앵커 24px, 스페이서 148 → 432 → 0, 조합 Enter 미전송(3 → 3), 재포커스 TEXTAREA |
| i18n | 4언어 각 830, 차집합 0. `admin.login.*` 키 그대로 |
| 금지 grep | 22항목 위반 0 |
| 빌드 / `git diff --check` | 통과. 의존성 추가 0(deps 7 devDeps 5) |

### 알아둘 것

- **배포본에서 켜려면 Vercel 환경변수 `VITE_USE_MOCK=true` 가 필요하다.** `.env` 는 `.gitignore` 라 저장소에 없고,
  Vite 는 빌드 시점에 값을 박는다. push 뒤 Vercel 이 다시 빌드해야 반영된다
- 데모 모드에서 **알 수 없는 `/admin/*` 는 404 가 아니라 대시보드로 간다.** 심사위원이 주소를 잘못 쳐도 튕기지 않게 한 것이다.
  이전 단계의 "삭제 라우트 3개 NotFound" 검증은 `/admin/billing` `/admin/roadmap` 에 한해 mock 에서는 더 이상 성립하지 않는다.
  `VITE_USE_MOCK=false` 에서는 기존대로 로그인 가드가 먼저 막는다
- 검증은 프로덕션 빌드를 로컬에서 서빙해 했다. 배포 URL 은 PROGRESS 에 기록돼 있지 않아 배포본 직접 접속은 하지 못했다

## 9-2 UI 디자인 시스템 전수검수 (UI_DESIGN_SYSTEM_PLAYBOOK 실행, 2026-09-13)

루트 `UI_DESIGN_SYSTEM_PLAYBOOK.md` 를 G-Chat 에 실행했다. 플레이북은 다른 프로젝트(한림대 DAH) 기준 문서이고
"1부 원칙과 4부 적용 순서와 5부 전수검수를 그대로 쓰고 2부 수치만 해당 브랜드 토큰으로 교체한다"고 되어 있다.
2부(색 타이포 간격)는 이미 9단계까지 우리 토큰으로 확정돼 있어 그대로 두고, **4부 적용 순서와 5부 전수검수를 실행**했다.

### 인벤토리 (플레이북 4.1)

| 항목 | 수 |
|------|---:|
| JSX 전체 | 106 |
| 페이지 JSX | 27 |
| 컴포넌트 JSX | 75 |
| 라우트 | 33 |
| 페이지 로컬 class 상수(ICON_BTN PANEL PILL 류) | **0** |
| 임의 shadow/blur | **0** |
| arbitrary value | 20종. 전부 clamp calc 뷰포트 clamp 등 근거 있는 값 |

플레이북이 DAH 부채로 든 "페이지 로컬 class 상수 복제"는 우리 쪽에 없다. 프리미티브 계층이 이미 서 있다.

### 찾은 결함과 수정

| # | 결함 | 근거 | 수정 |
|---|------|------|------|
| 1 | **390px 조작 대상 173건이 44px 미만** | 5.2 | 프리미티브 7종에 `min-h-11 min-w-11 md:min-h-0 md:min-w-0`. Button IconButton Chip Tabs Pagination Toggle DataTable 모바일 행 |
| 2 | 푸터 링크가 20px 높이 | 5.2 | 내비 링크라 문장 안 링크 예외가 아니다. 44 확보 |
| 3 | Input 안쪽 native input 이 20px | 5.2 | 래퍼는 44 인데 위아래 12px 이 죽어 있었다. `h-full` |
| 4 | Pagination 이 320 에서 가로 넘침 | 5.2 | 1번 수정의 회귀. `flex-wrap` |
| 5 | **서버 오류를 빈 결과로 위장** 11곳 | 3.5 | `catch(() => setRows([]))` → `setFailed(true)`. EmptyState 에 `tone="error"` + `onRetry` 신설 |
| 6 | `role="alert"` 0건, 재시도 수단 0건 | 3.5 5.4 | 오류 표면이 `role="alert"` 과 다시 시도 버튼을 담당 |
| 7 | 로딩이 보조기술에 안 알려짐 | 3.5 | Skeleton 막대는 aria-hidden 유지, 컨테이너에 `role="status" aria-live="polite" aria-label=불러오는 중` |
| 8 | Select 에 `aria-invalid` 없음 | 3.3 | error 일 때 부여. Input Textarea 와 계약 통일 |
| 9 | **aria-label 한국어 하드코딩 6건** | 3.9 | Toast Modal Drawer Pagination. `common.action.close` 와 신설 `common.a11y.*` 로. aria 도 번역 대상이다 |
| 10 | 상담 홈이 `h-screen` | 2.4 | 모바일 주소창과 키보드에 높이가 따라와야 한다. `h-dvh` |

i18n 5키 x 4언어 신설(`common.a11y.pagination/prevPage/nextPage`, `common.error.loadTitle/loadDesc`).

### 검증

| 항목 | 방법 | 결과 |
|------|------|------|
| **터치 타깃** | 390px 19경로 전수 실측 | **173건 → 7건**(2종). 남은 둘은 플레이북이 인정한 예외다 |
| 남은 예외 1 | 실측 | 입력 필드 안쪽 input 300x42. 보더 2px 를 뺀 값이고 **필드 자체는 44** 다 |
| 남은 예외 2 | 실측 | `sr-only` 파일 입력 1x1. 보이는 드롭존이 대신 타깃이다 |
| **오류 상태** | 백엔드를 죽은 포트로 돌려 실제로 실패시킴 | 시민 3화면 전부 `role="alert"` + "자료를 불러오지 못했습니다" + "다시 시도" |
| **재시도 동작** | 실패 요청 수 계수 | 6 → 7 → 8. 누를 때마다 실제로 다시 요청한다 |
| 로딩 알림 | 전환 직후 실측 | `role="status"` 1개, `aria-live="polite"`, 라벨 "불러오는 중" |
| **가로 넘침** | 25경로 x 9폭 | **225건 중 0** |
| 200% 확대 | 640 논리폭 x dsf2, 4화면 | 가로 넘침 0, 내용 유지 |
| h1 | 25경로 | 24/25 가 정확히 1개. `/widget` 은 접힌 말풍선이라 0(임베드 위젯, 페이지 아님) |
| **키보드** | 실제 키 입력 | 모달 Enter 열기, 포커스 진입, 타이핑 중 포커스 유지, **Esc 닫기**, **트리거로 포커스 복귀**, body 스크롤 락 복원 |
| Tab 순서 | 상담 홈 8탭 | 자동 포커스된 입력창 → 추천 칩 → 문서 래핑 → 헤더. DOM 순서와 같다 |
| PITFALLS 1~17 | 3문답 x 상태 3종 | 앵커 24px, 스페이서 148 → 432 → 0, 조합 Enter 미전송, 재포커스 TEXTAREA |
| i18n | 4언어 | 각 **830**, 차집합 **0** |
| 금지 grep | 22항목 | **전부 0**. aria-label 한국어 하드코딩도 0 |
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| 캡처 | 390px | 38 시민 시설 안내, 39 관리자 상담 로그 |

### 플레이북 항목 중 하지 않은 것

**5.6 `npm run lint`.** 이 저장소에 ESLint 설정이 없다. 린터를 새로 붙이면 devDependency 와 설정 파일이 늘고,
그것은 전수검수가 아니라 별도 결정이다. 검수 범위 밖으로 두고 여기 남긴다.
`npm run build` 와 `git diff --check` 는 통과한다.

### 이번에 판단한 것

- **44 는 세로만이 아니라 가로도 44 다.** 처음에 `min-h-11` 만 넣었더니 짧은 라벨(적용 공지 7일)이
  가로 43 으로 남아 20건이 살아남았다. `min-w-11` 을 같이 넣어야 끝난다
- **터치 타깃을 키우면 좁은 폭에서 넘친다.** Pagination 이 320 에서 한 줄에 안 들어갔다.
  접근성 수정은 반드시 9폭 회귀를 다시 돌려야 한다
- **입력 필드는 래퍼가 44 라도 부족하다.** 안쪽 native input 이 20px 이면 위아래 12px 을 눌러도 포커스가 안 간다.
  래퍼 높이만 보고 통과시키면 안 된다
- **모달 Esc 검증은 document 에 이벤트를 쏘면 안 된다.** useFocusTrap 은 다이얼로그 노드에 리스너를 건다.
  document 에 dispatch 하면 닫히지 않아 결함처럼 보이지만, 실제 키보드는 포커스가 안에 있어 정상 동작한다.
  **실제 키 입력(page.keyboard)으로 확인해야 한다.** 네 번째 검증 도구 함정이다
- 오류 상태는 mock 으로는 검증할 수 없다. `VITE_API_URL` 을 죽은 포트로 돌려 실제로 실패시켜야 계약이 확인된다

## 9-1 tint 명도 조정 검증 결과 (2026-09-07)

soft 배경이 너무 연해 칩과 배지의 배경이 흰 바탕에서도 회색 바탕에서도 보이지 않았다. 구글식으로 "채우되 또렷하게" 올렸다.

### 바꾼 값

| 자리 | 이전 | 이후 | soft 대 page | soft 대 canvas | 글자 대 soft |
|------|------|------|------|------|------|
| primary-soft | #EFF6FF | **#D6E4FD** | 1.088 → **1.282** | 1.014 → **1.195** | primary-text **6.80:1** |
| danger-soft | #FEEBEB | **#FBD8D8** | 1.148 → **1.319** | 1.069 → **1.229** | danger-text **4.61:1** |
| danger-text | #D01818 | **#C21A1A** | | | soft 를 올린 만큼 내려 4.5:1 유지 |
| 중립 배지 면 | mute #F0F2F5 | **line-def #DDE1E6** | 1.122 → **1.314** | 1.045 → **1.224** | text-sec **8.01:1** |

`TONE_FILL.neutral` 은 mute 로 남겼다. 예약 캘린더의 여유 셀이 쓰는 값이고, 유지보수 셀(line-def)과 갈라야 한다.
배지 면만 line-def 로 올렸다.

### 검증

| 항목 | 방법 | 결과 |
|------|------|------|
| **칩 대 바탕 대비** | 6화면 배지 전수, 배지 면과 실제 바탕색을 조상에서 찾아 계산 | 5개 조합 전부 **1.195 ~ 1.319**. 이전 최저 1.014 |
| 흰 바탕 맥락 | 카드 위 배지 | primary 1.282 / 중립 1.314 / 위험 1.319 |
| 회색 바탕 맥락 | canvas(사이드바) subtle(표 헤더) 위 배지 | primary 1.195 / 중립 1.247 |
| **글자 대비** | 같은 실측 | primary **6.80**, 중립 **8.01**, 위험 **4.61**. 셋 다 4.5:1 이상 |
| **사이드바 숫자 배지** | 배지 3개 실측 + aside 요소 캡처 | 12 / 4 / 5 전부 `rgb(214,228,253)` 면에 `rgb(30,64,175)` 글자. canvas 위에서 칩 형태로 보인다 |
| 활성 메뉴 | 실측 | 같은 면. 대시보드 항목이 채워진 칩으로 읽힌다 |
| **색 인벤토리** | 8화면 유채색 전수 | **미분류 0**. 전부 primary 계열과 danger 계열이다. 화면당 종수가 1~2 늘어난 것은 tint 가 이제 유채색 판정(채도 16 초과)에 잡히기 때문이다. 회색기가 빠졌다는 뜻이다 |
| 빌드 | npm run build | 통과. 의존성 추가 0 |
| PITFALLS 1~17 | 3문답 x 상태 3종 | 앵커 24px, 스페이서 148 → 432 → 0, 조합 Enter 미전송, 재포커스 TEXTAREA |
| 가로 스크롤 | 26경로 x 9폭 | **234건 중 0** |
| i18n | 4언어 | 각 825, 차집합 **0** |
| 금지 grep | 23항목 | **전부 0**(초록 주황 info 클래스 0 포함) |
| 캡처 | 1440 | 36 사이드바(숫자 배지와 활성 메뉴), 37 대시보드(배지 배경) |

### 검증 도구 함정 하나 더

**sticky 사이드바가 들어간 페이지 전체 캡처에서 사이드바 배지가 빠져 찍혔다.** DOM 실측은 배지 3개를
정상 값으로 잡는데 같은 실행의 페이지 캡처에는 안 나왔다. `aside` 요소를 직접 캡처하니 정상으로 나왔고
배지 자리 픽셀을 읽어 확인했다. 캡처 도구 쪽 문제이고 제품 문제가 아니다.
**요소 캡처와 실측값이 일치하면 그것을 믿는다.** HMR 모듈 인스턴스(5-1, 6단계)에 이은 세 번째 검증 도구 함정이다.

## 9단계 KRDS 3색 체계 전환 검증 결과 (2026-09-07)

**색이 너무 많아 위계가 없었다.** 파랑 초록 주황 빨강 회색을 동시에 쓰니 무엇을 봐야 하는지 알 수 없었다.
대한민국 정부 디자인 시스템 KRDS 원칙으로 재편했다. **주색 파랑 하나 + 무채색 + 위험 빨강, 3색 체계다.**
**success(초록)와 warning(주황)과 info 토큰을 지웠다.** 주황과 갈색과 초록은 화면에서 완전히 사라졌다.

색은 위계다. 강조할 것 하나에만 색을 쓰고 나머지는 전부 무채색이다.

### A. 상태 매핑 재설계 (StatusPill 단일 출처)

색이 아니라 의미의 중립 / 주목 / 위험 셋으로 바꿨다. 22개 상태를 전부 재매핑했다.

| 톤 | 배지 | 점 | 상태 |
|------|------|------|------|
| 중립 | mute + text-sec | text-meta | 정상 유지보수 여유 안정적 제한됨 자동처리 대기 완료 색인됨 정답 보류 달성 근접 |
| 주목 | primary-soft + primary-text | primary | 예약됨 인계 처리 중 |
| 위험 | danger-soft + danger-text | danger | 휴관 마감 미해결 실패 오답 미달 |

정상과 완료와 대기는 강조할 것이 아니라 기본이라 무채색이다. 색을 쓰면 그것이 주목해야 할 것이라는 뜻이 된다.

| 항목 | 방법 | 결과 |
|------|------|------|
| **배지 전수** | 8화면 순회, 렌더된 배경과 글자 실측 | **21종이 정확히 3톤**. 초록 0, 주황 0 |
| 배지 대비 | 같은 순회 | 최소 **4.78:1**(danger-text 대 danger-soft). 중립 9.38:1, 주목 8.36:1 |
| 정색 배경 배지 | grep | Badge.jsx StatusPill.jsx 에 `text-text-inverse` **0건** |
| 토큰 잔존 | tokens.js | `success:` **0**, `warning:` **0**, `info:` **0** |
| 클래스 잔존 | 전 소스 grep | `*-success` **0**, `*-warning` **0**, `*-info` **0** |

### B. 색 인벤토리 (렌더된 화면에서 실제로 쓰인 유채색)

채도 판정은 렌더된 색의 최대 채널 - 최소 채널이 16 을 넘는지로 했다. 무채색 계열은 여기 안 잡힌다.

| 화면 | 유채색 종수 | 계열 | 실제 색 |
|------|------|------|------|
| 상담 홈 | **1** | 파랑 | primary |
| 인계 | **3** | 파랑+빨강 | primary, primary-text, danger |
| 대시보드 | **4** | 파랑+빨강 | primary, primary-text, danger, danger-text |
| 상담 로그 | **5** | 파랑+빨강 | primary, primary-text, danger, danger-text, danger-soft |
| 시설 안내 | **5** | 파랑+빨강 | 같음 |
| 지식베이스 | **5** | 파랑+빨강 | 같음 |
| 예약 캘린더 | **5** | 파랑+빨강 | 같음 |
| 분석 | **6** | 파랑+빨강 | primary, primary-text, heat-1~3(단일 파랑 스케일), danger |

**여덟 화면 전부 파랑 계열과 빨강 계열 둘뿐이다.** 초록 주황 갈색 보라 청록 0건.

### C. 차트 재적용

| 토큰 | 8단계 | 9단계 | 흰 배경 |
|------|------|------|------|
| chart-1 | #2563EB | #2563EB | 5.17:1 |
| chart-2 | #0284C7(azure) | **#505358** HSL(218,5%,33%) | 7.72:1 |
| chart-3 | #6366F1(indigo) | **#72767E** HSL(220,5%,47%) | 4.56:1 |
| chart-4 | #8A929C | **#8F9299** HSL(222,5%,58%) | 3.12:1 |
| 부정 계열 | 없음 | **danger #E11414** | 4.87:1 |

회색 셋의 채도를 5% 대로 낮춰 기존 무채색 토큰(text line)과 같은 계열로 맞췄다.
처음에 채도 8~11% 로 잡았더니 색 인벤토리에서 유채색으로 잡혔다. 파란 회색은 주 계열과 경쟁한다.

| 항목 | 방법 | 결과 |
|------|------|------|
| **트렌드 3계열** | 렌더된 stroke 실측 | 자동처리 `primary` 2.5px / 인계 `rgb(80,83,88)` 2.5px / 미해결 `danger` 2px **파선** |
| **도넛** | 조각 stroke 실측 | `primary` / `rgb(80,83,88)` / `rgb(114,118,126)` / `rgb(143,146,153)`. **1등만 파랑, 나머지 회색 3단계** |
| **랭크 목록** | 막대와 번호 실측 | 1등 막대 `primary` + 번호 `primary-text`, 2~5등 막대 `line-strong` + 번호 `text-ter`. **강조는 1등 하나** |
| 히트맵 | 8단계 유지 | 단일 파랑 명도 스케일 4단계 + mute(데이터 없음) |
| 막대 | 유지 | 이번 기간 파랑, 비교 기간 회색 |
| 두께 마커 area | 7·8단계 유지 | 꺾은선 2.5px, 마커 r3.5, area fill-opacity 0.1 |

### D. 상태 색 쓰던 화면 전수 점검

| 자리 | 이전 | 이후 |
|------|------|------|
| 대시보드 검토 대기 큐 배지 | 주황 | 남은 건수 > 0 이면 **primary**, 0 이면 중립 |
| 사이드바 큐 배지 | 주황 | **primary** |
| 예약 캘린더 범례 | 여유 초록 / 예약됨 파랑 / 마감 빨강 / 유지보수 주황 4색 | 여유 mute / 예약됨 primary-soft / 마감 danger-soft / **유지보수 line-def**. 유채색 2 + 무채색 2단계 |
| KPI 델타 | 증가 초록 / 감소 빨강 | 좋은 방향 **text-sec**, 나쁜 방향 danger. 긍정은 강조하지 않는다 |
| KPI 목표 문구 | 달성 초록 / 근접 주황 / 미달 빨강 | 달성 근접 **중립**, 미달 danger |
| 랭크 증감 | 증가 초록 / 감소 빨강 | **무채색**. 질문이 늘어난 게 좋은 것도 나쁜 것도 아니다. 방향은 화살표가 전한다 |
| 근거 카드 오래된 자료 | 주황 글자 | **text-sec 굵은 글자** |
| 관리자 데스크톱 권장 배너 | 주황 면 | **mute 면 + text-sec** |
| 지식베이스 오래된 문서 알림 | 주황 면 | **mute 면 + text-sec** |
| 온보딩 재구축 안내 | info 면 | **primary-soft 면** |
| 구축 실패 건수 | 주황 글자 | **danger 글자** |
| 확인 아이콘(답변 복사, NPS 완료, 예약 결과) | 초록 | **primary** |
| 문서 종류 배지(운영 매뉴얼 공지 FAQ) | 공지만 info | **전부 중립**. 종류는 상태가 아니라 라벨이라 글자로 나눈다 |
| 토스트 | success warning danger info 4톤 | **중립 주목 위험 3톤**. 완료는 primary, 실패와 입력 오류는 danger, 그 밖은 중립 |
| 시뮬레이터 배지, 부서 배지 | 주황 / info | **중립** |
| 패턴 카드 심각도, 인사이트 지표 | 주황 / 초록 | 높음 **primary**, 보통 중립 / 지표 **primary** |

| 항목 | 방법 | 결과 |
|------|------|------|
| StatusPill 밖 상태 색 정의 | grep | **0건**. 색으로 가는 길은 StatusPill 한 파일뿐이다(cellFill 포함) |
| 캘린더 4상태 구분 | 셀 실측 | 네 면이 전부 다르다(primary-soft 37칸 / mute 36 / line-def 22 / danger-soft 17). 범례 견본이 셀과 같은 면이다 |

### 전체 회귀

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| PITFALLS 1~17 | 3문답 x 상태 3종 | 앵커 **전부 24px**, 스페이서 148 → 432 → 0, 잠금 true → false, 조합 Enter 미전송, 재포커스 TEXTAREA |
| NPS 소멸 | 회귀 | 2.7초 opacity 0.008 → 3.3초 DOM 제거 |
| 라우트 | 26경로 | 25 렌더. `/widget` 은 접힌 말풍선이라 스크립트가 실패로 센다(6단계부터 같다) |
| 삭제 라우트 | 3개 | **3/3 NotFound** |
| 가로 스크롤 | 26경로 x 9폭 | **234건 중 0** |
| i18n | 앱 사전 인스턴스 | ko/en/ja/zh 각 **825**, 차집합 **0** |
| 콘솔 | 전 검증 흐름 | pageerror 0, i18n 미존재 키 0 |
| 금지 grep | 25항목 | **전부 0**. 초록 클래스 0, 주황 클래스 0, info 클래스 0, tokens 밖 hex 0 |
| 캡처 | 1440 | 33 대시보드, 34 예약 캘린더, 35 시설 안내 |

### 캡처 육안 확인 문구

- **33-dashboard-9.png** 유채색이 파랑과 빨강뿐이다. 트렌드는 자동처리 파랑 실선, 인계 회색 실선, 미해결 빨강 파선이다.
  도넛은 1등 국민체육센터만 파랑이고 2~4등은 회색 명도차다. 랭크 목록도 1등 막대만 파랑이고 2등 아래는 회색이다.
  KPI 증가분은 회색이고 감소분(응답 정확도 -1.2%)만 빨강이다. 상태 배지 "정상"은 회색 tint 다. 초록과 주황이 없다
- **34-reservations-9.png** 캘린더 네 상태가 전부 다른 면이다. 여유는 아주 연한 회색, 예약됨은 연파랑,
  마감은 연빨강, 유지보수는 한 단계 진한 회색이다. 범례 견본이 셀과 같은 면이라 색 키가 맞는다
- **35-facilities-9.png** 시설 카드 유형 배지와 상태 배지가 전부 회색 tint 다. 유채색은 활성 메뉴와 필터 칩의 파랑뿐이다

### 이번에 판단한 것

- **정상은 강조할 것이 아니라 기본이다.** 정상 완료 자동처리 색인됨 정답을 전부 중립으로 내렸다.
  초록으로 칠하면 "여기를 보라"는 뜻이 되는데 정상은 볼 필요가 없는 상태다
- **주황이 갈 곳은 둘뿐이었다.** 부정(구축 실패)은 danger 로, 나머지(대기 보류 유지보수 권장 배너)는 중립으로 갔다.
  대기와 보류는 나쁜 상태가 아니라 아직 처리 안 된 상태라 위험색을 쓰면 과장이다
- **캘린더는 라벨을 넣을 수 없어 중립이 두 상태(여유 유지보수)에서 겹쳤다.** 색을 늘리지 않고
  중립을 명도 두 단계로 갈랐다(mute / line-def). 매핑은 StatusPill.cellFill 한 곳이다
- **차트 회색의 채도가 8~11% 면 유채색으로 읽힌다.** 처음 잡은 값이 색 인벤토리에서 잡혀 5% 대로 내렸다.
  기존 text 와 line 토큰이 전부 5~6% 대라 그 계열에 맞춘 것이다

## 8단계 색과 타이포 재조정 검증 결과 (2026-09-07)

**7단계 색 방향이 틀렸다.** 배지를 정색 배경 + 흰 글자로 채웠고, 그 조합이 흰 글자 4.5:1 을 강제해
네 색을 전부 어둡게 눌러야 했다. 특히 앰버가 갈색(#B85C00)이 되어 화면 전체가 탁해졌다.
8단계에서 되돌렸다. 방향은 구글 리니어식 모던, 연한 tint 배경 + 채도 높고 선명한 글자다.
정색은 배경으로 쓰지 않으므로 대비 제약에서 풀려나 채도를 최대로 올릴 수 있다.

### A. 상태 색 (탁함 제거)

| 토큰 | 7단계(탁함) | 8단계 정색 HSL | 흰 배경 | soft | 글자 HSL | 글자 대 soft |
|------|------|------|------|------|------|------|
| success | #0A853D | **#16A34A** (142,**76%**,36%) | 3.30:1 | **#E7F8EE** | **#0A7C3C** (146,**85%**,26%) | **4.81:1** |
| warning | #B85C00(갈색) | **#EA8600** (34,**100%**,46%) | 2.66:1 | **#FEF4E4** | **#A85C05** (32,**94%**,34%) | **4.59:1** |
| danger | #DE1B1B | **#E11414** (0,**84%**,48%) | 4.87:1 | **#FEEBEB** | **#D01818** (0,**79%**,45%) | **4.78:1** |
| info | #2563EB | #2563EB (221,**83%**,53%) | 5.17:1 | **#E9F0FE** | **#1D4ED8** (224,**76%**,48%) | **5.86:1** |

**채도(S)가 넷 다 76% 이상이다.** S 가 낮으면 회색기가 돌아 탁해 보인다. 7단계 값은 명도를 눌러
채도를 유지한 것처럼 보였지만 실제로는 어두워서 탁했다. soft 도 회색기 없이 색상이 살아 있다
(S 55 / 93 / 90 / 91%).

| 항목 | 방법 | 결과 |
|------|------|------|
| **배지 전수** | 7화면 순회, 렌더된 배경과 글자 실측 | **22종**. 최소 대비 **4.59:1**, 흰 글자 배지 **0건** |
| 상태 필 점 | 같은 순회 | **14종**에 6px 정색 점. aria-hidden 이고 뜻은 라벨이 전한다 |
| neutral | 같은 순회 | 시설 유형 배지 mute 배경 + text-sec **9.38:1** |
| 정색 배경 잔존 | grep | 배지 파일 **0건**. 남은 셋은 danger 버튼(4.87:1), 알림 카운트(4.87:1), 아바타(5.17:1) 로 전부 의도한 곳이고 전부 AA |

### B. 차트 색

| 토큰 | 7단계 | 8단계 | 흰 배경 | 비고 |
|------|------|------|------|------|
| chart-1 | #2563EB | #2563EB | 5.17:1 | 색상 221 |
| chart-2 | #0284C7 | #0284C7 | 4.10:1 | 색상 199 |
| chart-3 | #55606E(중립 슬레이트) | **#6366F1** | 4.47:1 | 색상 239. 파랑 3계열이 색상으로 갈린다 |
| chart-4 | #A8AEB6 | **#8A929C** | 3.15:1 | 유일한 중립색. 기타 조각과 기준선 |
| heat-1~3 | S 83% | **S 92%** (#9DBEFB #71A1F9 #4583F7) | 1.88 / 2.57 / 3.59 | 최저 단계도 회색빛 없는 연파랑 |

| 항목 | 방법 | 결과 |
|------|------|------|
| 도넛 조각 | 렌더된 stroke 실측 | `rgb(37,99,235)` / `rgb(2,132,199)` / `rgb(99,102,241)` / `rgb(138,146,156)`. **회색 조각 1개**(기타), 파랑 3개 |
| 도넛 대비 | 같은 실측 | 5.17 / 4.10 / 4.47 / 3.15 **전부 3:1 이상** |
| 히트맵 | 셀 168개 색 집계 | **5색**. mute 12칸 + heat 71 / 27 / 28 / 30칸 |
| 7단계 유지분 | 렌더 실측 | 꺾은선 2.5px, 마커 21개 r3.5, area fill-opacity 0.1, 막대 두께 그대로 |

### C. 알림 카운트

| 항목 | 방법 | 결과 |
|------|------|------|
| 크기 | 실측 | 벨 20x20, 칩 **16x16**(두 자리면 min-w 를 넘겨 알약) |
| 겹침 | 사각형 교집합 넓이 | **25%**(우상단 사분면). 7단계는 20px 배지가 벨 폭을 거의 다 덮었다 |
| 활자 | 실측 | **10px / 700** (type-count 신설) |
| 색 | 실측 | `rgb(225,20,20)` 배경 + 흰 글자 **4.87:1**. page 색 2px 링으로 벨 획과 분리 |

### D. 아바타

| 항목 | 방법 | 결과 |
|------|------|------|
| 색 | 실측 | `rgb(37,99,235)` 배경 + 흰 글자 **5.17:1**, 웨이트 700. 이전은 primary-soft 배경 + primary-text 글자였다 |
| 적용 범위 | 컴포넌트 | Avatar.jsx 한 곳. 사이드바 프로필과 UserMenu 가 이 컴포넌트를 쓴다 |

### E. 타이포 위계

| 토큰 | 7단계 | 8단계 |
|------|------|------|
| display | clamp(28,40) 700 / -0.03em | **clamp(30,42) 700 / -0.035em** |
| h1 | clamp(22,30) 700 / -0.02em | **clamp(24,32) 700 / -0.025em** |
| h3 | clamp(16,18) 700 / -0.015em | **clamp(17,19) 700 / -0.02em** |
| kpi | clamp(26,36) **700** / -0.02em | **clamp(28,40) 800 / -0.03em** |
| caption | **500** | **600** |
| count | 없음 | **10px / 700** 신설 |

| 항목 | 방법 | 결과 |
|------|------|------|
| **KPI 카드 위계** | 1440 실측 | 라벨 **11.94px/600 text-sec** → 값 **39.28px/800** → 목표 문구 **12px/400**. 인접 짝이 200 과 400 차이 |
| KPI 라벨 색 | 실측 | `rgb(61,63,69)` = text-sec. 이전 text-meta 보다 한 단계 진하다 |
| 카드 타이틀 대 본문 | 시설 카드 실측 | h3 **19px/700** 대 body-sm **14px/400**. 크기 5px, 웨이트 300 차이 |
| **3웨이트 공존** | 화면별 집계 | 관리자 **5종**(400 500 600 700 800), 시설 안내 **4종**, 상담 홈 **3종** |
| 320 하한 | 320 실측 | display 30px/700, KPI 라벨 11px/600, KPI 값 28px/800. 잘림 없음 |

### 전체 회귀

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| PITFALLS 1~17 | 3문답 x 상태 3종 | 앵커 **전부 24px**, 스페이서 148 → 432 → 0, 잠금 true → false, 조합 Enter 미전송, 재포커스 TEXTAREA |
| NPS 소멸 | 7단계 회귀 | 2.7초 opacity 0.008 → 3.3초 DOM 제거 |
| 라우트 | 26경로 | 25 렌더. `/widget` 은 접힌 말풍선이라 스크립트가 실패로 센다(6단계부터 같다) |
| 삭제 라우트 | 3개 | **3/3 NotFound** |
| 가로 스크롤 | 26경로 x 9폭 | **234건 중 0**. 활자를 키운 뒤에도 320 에서 넘치지 않는다 |
| ja zh 가로 스크롤 | 5경로 x 9폭 x 2언어 | **90건 중 0**. 헤드라인 680 = 컨테이너 680, 2줄 |
| i18n | 앱 사전 인스턴스 | ko/en/ja/zh 각 **825**, 차집합 **0** |
| 콘솔 | 전 검증 흐름 | pageerror 0, i18n 미존재 키 0 |
| 금지 grep | 22항목 | **전부 0**. tokens.js 밖 hex **0** |
| 캡처 | 1440 | 30 대시보드, 31 시설 안내, 32 상담 로그 |

### 캡처 육안 확인 문구

- **30-dashboard-8.png** 배지가 연녹 tint + 진녹 글자 + 정색 점이다. 7단계의 꽉 찬 초록 면이 사라졌다.
  KPI 숫자가 800 이라 라벨과 덩어리가 갈리고, 도넛은 파랑 3 + 회색 1 이다. 사이드바 아바타가 정색 파랑이고
  알림 카운트가 벨 우상단에 작게 붙어 벨 모양이 그대로 보인다
- **31-facilities-8.png** 정상 배지가 연녹, 유지보수가 연앰버다. 갈색기가 없다. 카드 타이틀 19px/700 이
  본문 14px/400 과 확실히 갈린다
- **32-logs-8.png** 표 안 상태 필 세 종류(자동처리 인계 미해결)가 전부 tint 라 행이 차분하고,
  점 색으로 종류가 즉시 갈린다. 7단계에서는 같은 표가 색 면으로 가득 차 탁했다

## 7단계 QA 수정 패스 검증 결과 (2026-09-07)

배포본 실사용 피드백에서 나온 결함을 잡았다. 방향은 "쨍하고 선명하게"고 규율(그라데이션 금지, 토큰 밖 hex 금지,
hover scale 금지, 색으로만 구분 금지)은 그대로다. 수정한 것은 tokens.js 와 차트 컴포넌트와 i18n 과 그 소비처다.

> **아래 A 절(색)은 8단계에서 정정했다.** 배지를 정색 배경 + 흰 글자로 바꾼 것이 잘못이었다.
> 그 조합이 흰 글자 4.5:1 을 강제해 네 색을 전부 어둡게 눌렀고 화면이 탁해졌다.
> 8단계 절의 색 표가 현재 값이다. B 절(그래프 두께 마커 area 도넛 기하)과 C 절(동작 정합)은 그대로 유효하다.

### A. 색 대비표 (변경한 색 전부)

| 토큰 | 이전 | 이후 | 흰 배경 대비 | 그 색 위 흰 글자 |
|------|------|------|------|------|
| success | #16A34A (3.30:1) | **#0A853D** | **4.73:1** | 4.73:1 |
| warning | #D97706 (3.19:1) | **#B85C00** | **4.60:1** | 4.60:1 |
| danger | #DC2626 (4.83:1) | **#DE1B1B** | **4.91:1** | 4.91:1 |
| info | #2563EB | #2563EB(유지) | 5.17:1 | 5.17:1 |
| success-soft | #F0FDF4 | **#DCFCE7** | 1.10:1 | 진한 글자 6.49:1 |
| warning-soft | #FFFBEB | **#FEF3C7** | 1.11:1 | 진한 글자 6.37:1 |
| danger-soft | #FEF2F2 | **#FEE2E2** | 1.22:1 | 진한 글자 6.80:1 |
| info-soft | #EFF6FF | **#DBEAFE** | 1.22:1 | 진한 글자 7.15:1 |
| chart-2 | #3B82F6 (3.68:1) | **#0284C7** | **4.10:1** | |
| chart-3 | #7C838C (3.83:1) | **#55606E** | **6.39:1** | |
| chart-heat-1 | (primary/20 알파) | **#A2BCF6** | 1.90:1 | |
| chart-heat-2 | (primary/40 알파) | **#789FF2** | 2.61:1 | |
| chart-heat-3 | (primary/65 알파) | **#4E81EF** | 3.68:1 | |
| chart-heat-4 | (primary) | **#2563EB** | 5.17:1 | |

대비는 대칭이라 흰 배경 4.5:1 을 넘기면 그 색 위 흰 글자도 같은 값이다. 그래서 정색 하나로 배지 배경과 점과 차트를 다 쓴다.
primary-soft 는 건드리지 않았다. 사용자 말풍선과 칩이 쓰는 브랜드 색이고 상태 색이 아니다.

| 항목 | 방법 | 결과 |
|------|------|------|
| 배지 렌더 | 6화면 순회하며 상태 필과 배지 전수 실측 | 정상·자동처리·색인됨·여유·게시 `rgb(10,133,61)` 흰 글자 / 유지보수·미해결·대기·제한됨 `rgb(184,92,0)` 흰 글자 / 휴관·마감·실패 `rgb(222,27,27)` 흰 글자 / 인계·예약됨·부서 `rgb(37,99,235)` 흰 글자. **점(dot) 0개** |
| neutral 유지 | 같은 순회 | 시설 유형 배지(체육 문화 관광 주차) `rgb(240,242,245)` + text-sec. 사진 위 배지가 bg 를 덮어쓰므로 흰 글자로 바꾸지 않았다 |

### B. 그래프

| 항목 | 방법 | 결과 |
|------|------|------|
| 꺾은선 굵기 | 렌더된 path 실측 | 주 계열 **2.5**, 보조 계열 **2.5**, 파선(미해결) **2** |
| 곡선 | path d 검사 | monotone cubic. `C` 세그먼트 존재. 오버슈트 없음 |
| 마커 | circle 실측 | **21개**(7일 x 3계열), r **3.5**, 채움 계열색, 테두리 page 색 1.5. 점 간격 24px 미만이면 안 그린다 |
| area 채움 | path 속성 | fill `rgb(37,99,235)` + **fill-opacity 0.1**. 단색 알파다(그라데이션 아님) |
| 랭크 막대 | 실측 | 트랙 높이 **6px**, radius full, 채움 `rgb(37,99,235)` |
| 도넛 | 실측 | 시작각 `rotate(-90 88 88)` = **12시**, 링 두께 **30**, 첫 조각 오프셋 **-2.5**(간격의 절반), 조각 사이 간격 **5 / 5 / 5** 로 일정 |
| 히트맵 | 셀 168개 색 집계 | **5색**(mute 12칸 + heat 1~4 = 71 / 27 / 28 / 30칸). 알파 없음 |
| 막대 | BarChart | 최대 폭 72, 그룹 폭의 78% |
| 진입 애니메이션 | reduced-motion 에뮬레이션 | transition-duration `1e-05s`, area opacity 1, 마커 21개 노출, 도넛 오프셋 적용. 최종 상태로 즉시 그려진다 |

**도넛 stroke-linecap 은 butt 로 뒀다.** 프롬프트는 round 를 지시했으나 링 두께가 30 이라 기하가 성립하지 않는다.
둥근 캡은 양 끝에 STROKE/2 씩 더 그리므로 간격을 보이게 하려면 조각마다 35px 넘게 잘라야 하고,
네 조각이면 원의 30% 가 사라진다. 목표(끊김 없음, 간격 일정)는 균일한 5px 간격으로 달성했다.

### C. 동작·정합

| 항목 | 방법 | 결과 |
|------|------|------|
| **기간 탭 전체 리셋** | 30일 클릭 후 120ms 시점 관찰 | KPI 라벨 **4개 유지**, 사이드바 유지, 차트 **2개 유지**, **스켈레톤 0**, aria-busy 3(차트·표만). 프로브 DOM 노드 `isConnected` 전환 전후 **true**(언마운트 없음) |
| 분석 내부 탭 | 같은 방법 | h2 노드 유지, 스켈레톤 0 |
| 리로드 완료 | 1.4초 후 | aria-busy 0, 데이터 교체 |
| **기관명 4언어** | 언어 전환 후 실측 | ja 헤드라인 `東海市施設管理公団の公共施設について何でもお尋ねください`, 푸터 `東海市施設管理公団`, 신뢰 문구까지 전부 일본어. VITE_ORG_NAME 은 ko 폴백으로만 |
| **시설명 4언어** | 같은 방법 | ja 상세 h1 `国民体育センター`. facilities.json 에 name_en/ja/zh 8건 x 3언어 추가. 없으면 ko 폴백 |
| **상태 라벨** | 같은 방법 | 유형 배지 `スポーツ`, 상태 `通常 / メンテナンス`, 예약 `安定 / 残りわずか / 空きあり`, 운영시간 `チェックイン 14:00 チェックアウト 11:00` |
| **한국어 잔존** | ja·zh·en x 6화면 DOM 텍스트 노드 전수 | 상담 홈 **0**, 시설 안내 **0**, 시설 상세 **0**, 공지 **0**, 자주 묻는 질문 **0** |
| CJK 줄바꿈 | ja·zh 헤드라인 실측 | h1 폭 680 = 컨테이너 680, 2줄. `break-keep` 은 한국어 어절 규칙이라 ja·zh 에서 되돌린다 |
| ja·zh 가로 스크롤 | 5경로 x 9폭 x 2언어 | **90건 중 0** |
| **NPS 감사 문구** | 제출 후 시간 관찰 | 제출 직후 opacity 1 → **2.7초 opacity 0.004** → **3.3초 DOM 에서 제거**. 접힘이 아니라 소멸. reduced-motion 이면 페이드 없이 즉시 |
| **입력창 화살표** | 버튼 중심 - 컨테이너 중심 | 기본 2행 **0.0px**, 4행(높이 131) **0.0px**. `items-center`(PATTERNS 8번 원형) |
| **헤더 3링크** | 각 링크 텍스트 상자 실측 | top 전부 **21.2**, 중심 전부 **32.0**, 좌우 패딩 전부 **12px** |
| **메뉴 그룹 중앙** | nav 중심 vs 헤더 중심 | **720.0 = 720.0**. 좌우 그룹에 같은 flex 기저를 줬다 |

### 전체 회귀

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| PITFALLS 1~17 | 3문답 x 상태 3종 | 앵커 **전부 24px**, 스페이서 147 → 431 → 0, 잠금 true → false, 조합 Enter 미전송(3 → 3), 재포커스 TEXTAREA |
| 라우트 | 26경로 진입 | 25 렌더. `/widget` 은 접힌 말풍선이라 본문이 짧아 스크립트가 실패로 세지만 화면은 정상(6단계와 같다) |
| 삭제 라우트 | 3개 | **3/3 NotFound** |
| 가로 스크롤 | 26경로 x 9폭 | **234건 중 0** |
| i18n | 앱 사전 인스턴스 | ko/en/ja/zh 각 **825**(+8: facility.hours 2, common.faq.cat 6), **차집합 0** |
| 콘솔 | 전 검증 흐름 | pageerror 0, i18n 미존재 키 0 |
| 금지 grep | 21항목 | **전부 0**(하드코딩 hex 포함. 걸린 2건은 금지 규칙을 적은 주석) |
| 캡처 | 1440 | 25 대시보드, 26 분석 히트맵, 27 시민 홈, 28 시민 홈 일본어, 29 시설 안내 일본어 |

### 이번에 잡은 것과 판단

- **`break-keep` 이 일본어 중국어에서 줄바꿈을 아예 막는다.** 한국어 어절 보존 규칙(word-break: keep-all)인데
  CJK 는 낱말 사이에 공백이 없어 한 줄이 통째로 컨테이너를 넘친다. 1440 일본어 홈에서 헤드라인이 680 컨테이너를 735 로 넘었다.
  index.css 에 `html[lang='ja'] .break-keep, html[lang='zh'] .break-keep { word-break: normal }` 한 줄로 13곳을 한 번에 고쳤다
- **번역하지 않는 원문에는 `lang="ko"` 를 박았다.** 주소, 이용 안내, 부서명, 공지 제목과 본문, FAQ 질문과 답변이다.
  원문 무결성(PITFALLS 23)을 지키면서 그 부분만 한국어임을 선언한다(WCAG 3.1.2). 검증 스크립트도 이 선언을 기준으로 센다
- **추천 질문 칩은 mock 이 key 를 주고 화면이 사전에서 문장을 꺼낸다.** 라벨만 번역하면 질문은 한국어로 나가 답변 언어가 어긋난다.
  질문까지 현재 언어로 보내고 시설명도 그 언어 이름을 붙인다. mockStream 의 location 의도 정규식에 `directions|get there|交通|路线|行き方` 를 더했다
- **도넛 round 캡은 기하가 성립하지 않아 채택하지 않았다**(위 B 절)

## 6단계 통합 검증 결과 (2026-09-07)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| **mock 7라우트** | 각 라우트 직접 호출 | 공지 생성(목록 6 → 7, 지식베이스 13 → 14), 재색인, 청크 42개, 개통(설정 반영), FAQ 후보(5 → 6), 발송(완료 + handleMinutes) 전부 정상 |
| 상태 유지 | SPA 이동으로만 확인 | 시민 면에서 만든 것이 관리자 면에 그대로 보인다. 새로고침 초기화는 설계대로 |
| **confirmLabel 3종** | 각 화면 버튼 문자열 | 예약 **"예약하기"**, 티켓 **"문의 접수"**, 인계 발송 **"문의자에게 발송"** |
| 스피너 reduced-motion | grep + 빌드 CSS | `animate-spin` 중 `motion-reduce` 누락 **0**. CSS 에 `@media (prefers-reduced-motion:reduce){.motion-reduce\:animate-none{animation:none}}` 존재 |
| **TopNav 모바일 목록** | 390 | 대화 전 아이콘 없음 → 대화 후 노출, 대화 화면 안 버튼 제거됨, Drawer(left) 좌측 0 에서 열림 |
| 칩 아이콘 | 기본 칩 실측 | 시설 운영시간 → `lucide-clock`, 이용 요금 안내 → `lucide-credit-card`. 뜻과 일치 |
| **통합 왕복** | 한 페이지 로드 안에서 | 개통(기관명 변경) → **시민 헤드라인 "삼척시 시설관리공단"** → QR 진입 → 예약 **R-2026-0912-675** → 자료없음 → 티켓 **HO-2026-0907-008** → 인계 목록 등장 → 제안 적용 → 초안 → 발송 → 완료 탭 처리 시간 → 공지 작성·색인 → **시민 /notices 반영** → 지식베이스 문서 등재 → 시뮬레이터 FAQ 후보 → **승인 대기 5 → 6, 사이드바 배지 5 → 6** → 대시보드 기관명 반영 |
| **PITFALLS 1~17** | 3문답 × 상태 3종 | 앵커 간격 **전부 24px**, 스페이서 147 → 431 → 0, 잠금 true → false, 조합 Enter 미전송(3 → 3), 재포커스 TEXTAREA |
| **25 라우트** | 전 경로 진입 | 25/25 렌더. `/widget` 은 닫힌 상태라 본문이 없고 FAB 만 있는 것이 정상 |
| 삭제 라우트 | /about /admin/billing /admin/roadmap | **3/3 NotFound** |
| **가로 스크롤** | 25경로 × 9폭(320~3840) | **225건 중 0** |
| i18n | 앱 사전 인스턴스 | ko/en/ja/zh 각 **817**, **차집합 0**, 줄표 0 |
| 키보드 | 온보딩·드로어·알림·QR 모달 | 도달 전부 포커스 링, 알림 벨 도달 |
| 콘솔 | 전 흐름 | pageerror 0, i18n 미존재 키 0 |
| **금지 grep** | 21항목 | **전부 0**. 하드코딩 hex 도 0(QR 색 기본값 제거 후 tokens 외 hex 없음) |

### 발표 스크린샷 세트 (docs/screenshots/, 1440 기준 + 모바일 390)

4단계까지 01~15, 6단계에서 5단계분 16~24 를 더해 **24장**이다.

| 번호 | 화면 |
|---|---|
| 01~04 | 시민 상담 홈 idle·답변, 시설 안내, 시설 상세 |
| 05~11 | 관리자 대시보드, 로그 드로어, 지식베이스 승인, 시설 관리, 예약 현황, 분석 히트맵, 설정 |
| 12~14 | 모바일 상담·대시보드·로그 카드 |
| 15 | 관리자 로그인 |
| **16~18** | **에이전트 도구 왕복 3컷.** 도구 진행 → 실행 확인 게이트 → 예약 결과 카드 |
| **19** | 웹 임베드 위젯 |
| **20** | 알림 센터 |
| **21** | 상담 시뮬레이터(오답 검토) |
| **22~23** | 기관 온보딩 구축 진행 · 미리보기와 개통 |
| **24** | 시설 QR 인쇄용 안내판 |

크래프트 전후 비교는 before-craft/ 에 4장.

## 5-G 관리자 도구 검증 결과 (2026-09-07)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5). QR 라이브러리 0 |
| **QR 알고리즘** | 공표값 대조 | RS gen(7) `1,127,122,154,164,11,68,117` 일치, gen(10) 일치, 형식 정보 L/mask0 `111011111000100` 일치, L/mask5 일치 |
| **QR 왕복** | 자체 디코더로 마스크 해제 후 재파싱 | 버전 3(29모듈), 모드 4(바이트), 길이 46, **디코드 결과가 원본 URL 과 완전 일치** |
| QR 구조 | 매트릭스 검사 | 파인더 3개·타이밍 패턴·항상 어두운 모듈 전부 정상 |
| QR 렌더 | 화면 실측 | viewBox 0 0 37 37(29+여백 8), rect 235개, fill **rgb(16,16,16)=text.pri**, 배경 **#FFFFFF=page** |
| 인쇄 안내판 | A5 비율 실측 | 0.705 = 148/210 정확 일치. 기관명·시설명·문구·QR·연락처 |
| **온보딩 5스텝** | 파일 업로드까지 실제 왕복 | 스텝 5개, 재구축 모드에서 기관명·시설 8곳 프리필 |
| CSV 파싱 | 오류 행 포함 4행 | 파싱 4행, **오류 2행**을 표에서 danger 면으로 표시. 오류 분류 name·type·columns 정확 |
| **BuildStep phase 전이** | 실제 파일 2건 업로드 후 | 문서 분석 → 청크 분할 → 임베딩 → 색인 4단, running 스피너 확인, 요약 문서 2건·청크 42개·시설 4곳·실패 2건 |
| 구축 소요 시간 | 타이머 | 00:10 표시(계획서 2~4주 대비 증명) |
| PreviewStep | 시뮬레이터 임베드 | 시험 질문 칩과 개통 버튼 |
| **시뮬레이터 쓰기 차단** | 예약 질문 후 | **확인 버튼 없음**, 시뮬레이션 배지와 "쓰기 실행은 시뮬레이터에서 하지 않습니다" |
| 시뮬레이터 검토 | 오답 선택 | 라디오 3종, 오답 시 사유 Select 등장, 요약 질문 1건 정답률 0% |
| 근거 이동·FAQ | 버튼 | 근거 문서 링크(knowledge?id=), FAQ 후보 생성 토스트 |
| **공지 CRUD → 색인** | 새 공지 저장 | 색인 중 카드 → **색인 완료**, 목록 6행 → 7행, 새 행 초안·색인됨 |
| **인계 AI 제안** | 대기 탭 | 제안 부서 배지 + 근거(시설·키워드) + 적용 버튼 |
| **인계 초안 → 발송 게이트** | 초안 생성 후 | 진행 스피너 → 초안 Textarea → 확인 카드("문의자에게 발송할까요" + 허용 전 미실행 문구) |
| 발송 결과 | 승인 | 결과 카드 노출 후 2.6초 뒤 대기 탭에서 제거(2건 → 1건). 완료 탭 4건, **처리 시간 표시** |
| **지식베이스 드로어** | 문서 행 클릭 | 메타·청크 미리보기 10개 페이지·사용 질문 10건·재색인(진행 → 완료) |
| **알림 4유형** | 관리자 진입 | 미읽음 배지 2, 인계 접수·색인 실패 항목, 모두 읽음 → 배지 사라짐 |
| **임베드 코드** | 설정 채널 탭 | 5-F 의 /widget 형식과 일치(`/widget?org=&lang=`, postMessage 스크립트 포함), 언어·크기 옵션, 복사 |
| 카카오톡·QR 탭 | 같은 화면 | 미연동 필, ID·키 입력, 연동 테스트 안내. 시설 관리 링크 |
| 가로 스크롤 | 7화면 × 9폭(320~3840) | **63건 중 0**. 내부 넘침도 0(남은 것은 sr-only 파일 입력과 truncate 뿐) |
| 키보드 | Tab 22회 | 22개 도달 전부 포커스 링. 알림 벨 도달. 스텝·드로어·모달·QR 크기 라디오 도달 |
| i18n | 앱 사전 인스턴스 | ko/en/ja/zh 각 **816**, **차집합 0**, 줄표 0 |
| 콘솔 | 전 흐름 | pageerror 0, i18n 미존재 키 0 |
| 금지 grep | 19항목 | **전부 0**(qr.js 색 기본값 제거로 하드코딩 hex 도 0) |

캡처는 scratchpad 의 g-1-build g-2-build-done g-3-preview g-4-simulator g-5-handoff-draft g-6-doc-drawer g-7-qr-board g-8-channel g-9-notify.
재현 스크립트는 qrtest.mjs, v5g.mjs, v5gb~h.mjs.

## 5-F 시민 경험 검증 결과 (2026-09-07)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| **동결 파일 무수정** | 파일 타임스탬프 대조 | useChat api.js mockStream App.jsx Sidebar MessageList useAdminUi agent/ 전부 5-1 시각 그대로 |
| 레일 폭 | 실측 | 접힘 **56**, 펼침 패널 **240**, position **absolute**(겹침) |
| **레일 펼침 레이아웃 영향** | 대화 열 좌측 기준선 | 펼침 전 **178** → 펼침 후 **178**. 밀림 0 |
| 대화 전환 | 대화 2개 만들고 첫 대화 클릭 | 첫 대화 내용만 표시, 둘째 대화 내용 없음. 상태 독립 |
| 새 대화 | 새 대화 클릭 | idle 복귀 + 직전 대화 NPS 노출 |
| 모바일 목록 | 390 에서 드로어 | 레일 0개(숨김), Drawer(left) 폭 360 좌측 0, 대화 2건 표시 |
| **QR 진입** | /?facility=fac-008&src=qr | 헤드라인 "천곡 실내테니스장 앞이시군요", 서브 문구, 칩 4개 |
| QR 칩 매칭 | 예약 칩 클릭 | 예약 시스템 조회 도구 → 실행 확인 카드. 시설도 천곡 실내테니스장으로 정확 |
| **NPS 조건** | 답변 3회 후 | 카드 노출, 버튼 **11개**, 터치 타깃 **44px** |
| NPS 스트리밍 중 | 4번째 질문 진행 중 | **미노출** |
| NPS 제출 | 9점 선택 → 보내기 | 코멘트 입력 등장, aria-checked 인덱스 9, 제출 후 감사 문구로 접힘 |
| **위젯 FAB** | /widget 1440 | 56x56, 우하단 16/16. TopNav·Footer **없음** |
| 위젯 패널 | 열기 | **420x630**(clamp), 헤더 기관명, 칩 4개 |
| 위젯 대화 | 예약 질문 → 예약하기 | 도구 카드 → 실행 확인 → 결과 카드 R-2026-0912-762. 패널 가로 넘침 **0** |
| 위젯 모바일 | 390 | **390x844 전체 화면** |
| **postMessage** | 실제 iframe 부모에서 수신 | 열기 시 `open`, 닫기 시 `close` 수신. iframe 안 패널 460x700, 넘침 0 |
| **PITFALL 2 앵커** | 3문답 × 상태 4종 | 질문 상단 간격 **전부 24px**(스트리밍 중·완료 후·레일 펼침 후 포함) |
| **PITFALL 4·5 스페이서** | 같은 흐름 | 147 → 431(스트리밍) → 0(완료) |
| **PITFALL 7 조합 Enter** | keyCode 229 | 전송 안 됨(말풍선 3개 그대로) |
| **PITFALL 9·10** | 스트리밍 중/후 | disabled true → false + textarea 재포커스 |
| 가로 스크롤 | 대화 9폭 + 위젯 9폭 | **18건 중 0** |
| 키보드 | Tab 24회 | 23개 도달 전부 포커스 링. 대화 목록·새 대화 도달. NPS 버튼 11개 role=radio |
| i18n | 앱 사전 인스턴스 | ko/en/ja/zh 각 **657**, **차집합 0**, 줄표 0, 키릴 문자 0 |
| 콘솔 | 전 흐름 | pageerror 0, i18n 미존재 키 0 |
| 금지 grep | 17항목(담당 파일) | **전부 0** |

캡처는 scratchpad 의 f-1-qr f-2-rail f-3-nps f-4-widget f-5-widget-mobile.
재현 스크립트는 v5f.mjs v5fb~g.mjs.

## 5-1 에이전트 도구 UI 검증 결과 (2026-09-07)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. **의존성 추가 0**(deps 7 devDeps 5) |
| **도구 phase 전이** | 질문 직후 400ms 와 완료 후 비교 | running(스피너 + 진행 중 필) → done(요약 한 줄 + 펼침) 6 시나리오 전부 |
| **삽입 순서** | 타임라인 DOM 순서 | 도구 카드 → 답변 텍스트 → 실행 확인 카드 → 후속 질문. 도구가 첫 토큰보다 먼저 뜬다 |
| **허용 전 쓰기 미실행** | 확인 카드 상태에서 mock 인계 목록 조회 | 대기 2건 그대로. 폼과 게이트 문구 노출 |
| **허용 후 타임라인 연장** | 예약하기 클릭 | **새 말풍선 0**(사용자 말풍선 1개 유지). 같은 답변에 예약 생성 도구 + 결과 카드 이어짐 |
| 예약 왕복 | 조회 → 확인 → 예약하기 → 결과 | 예약번호 R-2026-0912-681, 시설·일시·금액·취소 가능일 표시 |
| .ics | buildIcs 출력 검증 | CRLF, DTSTART 20260912T180000, DTEND 20260912T190000, 쉼표 이스케이프 전부 정상 |
| **거부 경로** | 취소 클릭 | declined 접힘 + "실행하지 않았습니다", 확인 버튼 사라짐, **인계 대기 2건 불변** |
| **자료없음 → 티켓 → 관리자** | 한 세션 안에서 SPA 이동 | 접수번호 HO-2026-0907-008, 관리자 대기 **2건 → 3건**, 김민수/010-0000-5678/문의 내용 일치 |
| followups | 스트리밍 중과 완료 후 | 완료 후에만 3개 노출 |
| 외국어 3종 | en ja zh 순수 질문 | translate 카드 먼저(言語検出·语言检测 진행 중) → 그 언어로 답변. 시설도 유형 낱말로 정확히 매칭 |
| **PITFALL 2 앵커** | 3문답 × 상태 4종 실측 | 질문 상단 간격 **전부 24px**(스트리밍 중·완료 후·도구 펼친 뒤 포함) |
| **PITFALL 4·5 스페이서** | 같은 흐름 | 147 → 431(스트리밍) → 0(완료). 동적 유지 |
| **PITFALL 7 조합 Enter** | keyCode 229 로 Enter | 전송 안 됨(말풍선 1개 그대로) |
| **PITFALL 9·10 잠금·재포커스** | 스트리밍 중과 후 | 중 disabled true, 후 false + textarea 포커스 |
| 삭제 라우트 | /about /admin/billing /admin/roadmap 직접 진입 | 3/3 NotFound |
| 사이드바 | 링크와 그룹 | 16개 3구획. 인사이트 접기 → 16 → 13, aria-expanded false |
| 새 스텁 | 4경로 | 제목 렌더. **/widget 은 TopNav·Footer 없음** |
| i18n 동형 | 앱 사전 인스턴스 | ko 630 / en 630 / ja 630 / zh 630, **차집합 0**. 삭제 키 6개 잔존 0. 줄표 0 |
| 가로 스크롤 | 대화 화면 9폭(320~3840) | **9건 중 초과 0**, 내부 넘침 0 |
| 키보드 | Tab 30회 | 도달 29개 전부 포커스 링. 도구 펼침·예약하기·취소 전부 도달 |
| 콘솔 | 전 흐름 | pageerror 0, i18n 미존재 키 0 |
| 금지 grep | 18항목 | **전부 0**(무한 애니메이션은 스켈레톤·커서·스피너 3예외) |

캡처는 scratchpad 의 e-1-tool-running e-2-action e-3-result e-4-handoff e-5-en e-6-ja.
재현 스크립트는 v51.mjs v51b~h.mjs, ics.mjs.

## 5-D 인사이트 운영 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 의존성 추가 0(deps 7 devDeps 5) |
| 4화면 렌더 | 진입 후 본문 길이와 제목 | 4/4. 콘솔 오류 0, i18n 미존재 키 0 |
| **계획서 문장 대조** | 화면 텍스트에서 문자열 포함 검사 | 7문장 전부 존재, 누락 0 |
| 4-1 표제문 | insights 상단 | "상담 데이터를 자산으로 전환하여 응대 고도화, 운영 컨설팅, 수요 예측으로 확장합니다." |
| 4-1 ① | insights 블록 1 | "미해결 질문 → FAQ 자동 생성 → 자동처리율 지속 상승 (60→80→90%)" |
| 4-1 ② | insights 블록 2 | "민원 패턴 분석 → 성수기 O시간대 주차 문의 급증 → 안내판·인력 배치 개선" |
| 4-1 ③ | insights 블록 3 + forecast 상단 | "축적 데이터 기반 민원량 예측 → 기관 인력 운영 계획 지원" |
| 3-1 | reports 상단 | "민원 통계, 이용 패턴 분석, 운영 개선 리포트 제공" + 기관별 계약 수익상품 표기 |
| 3-4 | roadmap 상단 + 4단계 카드 | 동해시 실증 / 강원권 확대 / 전국 확대 / 공기업·관광공사 |
| **계획서 숫자** | 화면 실측 | 자동처리율 마커 60 80 90, 도입 기관 3 10 25, 예상 매출 1 5 15억원 |
| 예측 구간 표기 | SVG 속성과 계산 색 | 실측 실선과 예측 파선이 **같은 색**(rgb 37,99,235 = chart-1), 파선 6 4, 음영 fill chart-1 @0.16. 색으로 구분하지 않는다 |
| 마일스톤 차트 | 같은 방식 | 목표선 chart-4(168,174,182) 파선, 실측 chart-1 실선, 마커 3개 |
| 범례 | 각 차트 | 예측 3항목(실측 예측 신뢰구간), 마일스톤 2항목. 예측 표식도 파선으로 그린다 |
| 인력 권고 근거 | 표 위 문장 | "예상 민원량 8건당 1명을 권고합니다. 평시보다 10% 이상 늘어나는 주차와 시설만 표에 올립니다." 15행, 권고 1~2명 |
| 예측 근거 | 화면 문장 | "최근 31일 상담 260건의 요일과 시간대 분포를 확장해 계산했습니다" |
| 가로 스크롤 | 4경로 × 9폭(320~3840) | **36건 중 초과 0**, 내부 넘침 0(넓은 표는 자기 overflow-x-auto 안) |
| 4K 여백 | 3840 실측 | 콘텐츠 1600 고정, 좌 1240 우 1000 |
| 키보드 | reports 에서 Tab 25회 | 도달 21개 전부 포커스 링. 행 클릭 → 드로어 → Esc 닫힘 |
| 드로어 쿼리 | 행 클릭 | ?id=rep-2026-09, 섹션 4개(요약 민원 통계 이용 패턴 분석 다음 조치) |
| **i18n 동형** | 앱 사전 인스턴스 키 평탄화 | ko 604 / en 604 / ja 604 / zh 604, **차집합 0**. 줄표 0 |
| 4언어 전환 | 시민 면에서 언어 변경 후 4화면 이동 | 제목과 표제문 4언어 전부 전환, html lang ko en ja zh |
| 금지 grep | 20항목(담당 파일 기준) | **전부 0**. mock JSON 한글 0자 |

재현 스크립트는 scratchpad 의 v5d.mjs v5d2.mjs v5dfinal.mjs v5dlang.mjs v5dwidth.mjs, 데이터 생성은 gen5d.mjs gen5d2.mjs.

## 5-0 확장 골격 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 의존성 추가 0(deps 7 devDeps 5) |
| 신규 6경로 스텁 | 진입 후 제목·본문 길이 측정 | 6/6 렌더. Topbar 제목 5종 정확, 본문 31~47자. 빈 화면 0 |
| 콘솔 | pageerror + console.error + i18n missing key | 0건 |
| billing 역할 가드 | 로그인 후 스토어 역할을 operator 로 바꿔 진입 | 사이드바에서 사라짐(15 → 14), /admin/billing → /admin 리다이렉트, insights 는 그대로 진입 |
| 사이드바 240 | 링크·소제목·구분선 수 | 링크 15, 소제목 3(운영 인사이트 설정), 구분선 2 |
| 사이드바 64 레일 | 같은 항목 | 링크 15, 소제목 0, 구분선 2, 레일 폭 64 |
| 사이드바 390 드로어 | 드로어 열고 측정 | 링크 15, 소제목 3 |
| 활성 표시 | /admin/insights 진입 | aria-current=page 1개, bg primary-soft, 좌측 바 있음 |
| 사이드바 세로 | 높이 768/900/1080 × 폭 768/1440 | 1080 에서 전부 보임. 900 이하는 스크롤(842 > 723). 잘림 없음 |
| /about 비로그인 | 직접 진입 | 200, h1 "G-Chat 소개". 가드 통과 |
| TopNav 소개 | /faq 에서 메뉴 클릭 | /about 이동. 메뉴 4개 |
| 소개 4언어 | LangSwitch 전환 | html lang ko en ja zh, h1 4종 전부 전환 |
| TopNav 시프트 | 768/1024/1440 × 4언어 항목 좌표 | 전 폭 시프트 0(항목 4개로 늘린 뒤에도) |
| 가로 스크롤 | 신규 6경로 × 9폭(320~3840) | 54건 중 초과 0 |
| i18n 동형 | 앱이 쓰는 사전 인스턴스에서 키 평탄화 | ko 480, en ja zh 각 480. 차집합 0. 신규 22키 4언어 전부 존재 |
| 금지 grep | 20항목 | 전부 0. 오탐 3건 확인(주석의 localStorage 글자, `d30` 이 `d3` 에 걸림, Badge Toast 의 tone 변형은 status 매핑이 아님) |

캡처는 scratchpad 의 p5-sidebar-1440 p5-rail-768 p5-drawer-390 p5-about-1440. 재현 스크립트는 v50.mjs v50b.mjs.

## 4단계 크래프트 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 731ms, main 252.36kB(gzip 80.22). **의존성 추가 0**(deps 7 devDeps 5) |
| 절대 원칙 grep | 하드코딩 hex, 임의 색, 그라데이션, backdrop-blur, hover:scale, transition-all, 임의 radius z-index 폰트크기, 무한 반복(스켈레톤 커서 외), 이모지 | **전항목 0** |
| 자산 색 | 스크립트로 tokens.js 대조 | 자산 10개, tokens 밖 색 **0건** |
| 시설 이미지 | 9폭 x 20경로, 스크롤로 지연 로딩까지 해소 후 검사 | **미로드 0**. 깨진 이미지 0 |
| 4xx 응답 | 전 흐름 네트워크 감시 | **0건**(favicon 404 해소) |
| 콘솔 오류 | 전 흐름 | 0건 |
| img alt | 다중 행 포함 정규식 | img 4개 전부 alt 보유. 일러스트는 빈 문자열, 시설 사진은 시설명 |
| 가로 스크롤 | 20경로 x 9폭(320~3840) | **180건 중 초과 0** |
| 스트리밍 커서 | 스트리밍 중 / 완료 후 / reduced-motion | 표시 + caretBlink / 제거 / **display none** |
| 근거 stagger | animationDelay 실측 | 80ms 150ms 220ms |
| 토스트 | 계산된 animation | flowDown 진입 + toastOut 0.16s 3.72s 지연 퇴장 |
| 빈 상태 | 7종 캡처 | 필터 검색 탭별 문구와 일러스트가 상황에 맞게 갈림 |
| 웨이트 공존 | 계산된 font-weight 집계 | 대시보드 4단, 로그 4단, 상담 홈 3단, 시설 안내 3단 |
| 4K 여백 | 3840 실측 | 시민 1400 고정 여백 1220, 관리자 1600 고정 여백 1240 |
| prefers-contrast: more | CDP 에뮬레이션 | text-meta #6B6F76 → #3D3F45, line-sub #ECEEF1 → #DDE1E6 |
| prefers-reduced-motion | CDP 에뮬레이션 | 커서 제거, 행 진입 0.01ms, KPI 즉시 63.8%, 차트 transition 0.01ms |
| 시연 왕복 재확인 | 질문 → 접수 → 인계 목록 → 완료 → 완료 탭 | 커서 표시, 접수번호 HO-2026-0906-008, 대기 목록 등장, **완료 시 목록에서 제거**, 완료 탭에서 처리 시간 1분 |
| i18n | 사전 번들 비교 | ko 458 기준, en ja zh 차집합 0 |
| 대비 | 실제 색값 계산 | 시설명 19.03 / 운영시간 10.52 / 예약 캡션 5.05 / 유형 배지 10.52 (전부 4.5 이상) |

크래프트 전후 비교 캡처는 `docs/screenshots/before-craft/` 와 같은 이름의 최종본을 나란히 본다(상담 홈, 시설 안내, 시설 상세, 대시보드 4장). 로그인 화면 `15-admin-login.png` 을 세트에 추가했다.

## 3단계 통합 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 664ms, main 251.97kB(gzip 80.08). 의존성 7개 그대로, 추가 0 |
| 전 경로 렌더 | 21경로 SPA 순회 | 전부 렌더. 빈 화면 0 |
| **시연 왕복** | 시민 질문 → 인계 접수 → 관리자 목록 → 완료 → 대시보드 | 아래 왕복 표 참조. 전 구간 mock 으로 동작 |
| 가로 스크롤 | 20경로 x 9폭(320~3840) | **180건 중 초과 0** |
| 네이티브 컨트롤 | 같은 180건 로드에서 집계 | select 0, input[type=date] 0 |
| 키보드 도달 | Tab 순회 3화면 | 상담 로그 47/49, FAQ 관리 48/48, 상담 홈 10/10. outline 누락 0 (미도달 2는 DateRangeTabs roving tabindex) |
| 드로어 트랩 | Tab 8회 + Esc | 8회 전부 내부, Esc 닫힘 |
| 모달 트랩 | Tab 8회 + Esc | 8회 전부 내부, Esc 닫힘 |
| i18n 동형 | 방출된 사전 번들 비교 | ko 450 기준, en ja zh 차집합 0 |
| i18n 4언어 화면 | 시민 관리자 순회 | 헤드라인 메뉴 Topbar KPI 4장 전부 전환, html lang 동기화 |
| LangSwap 시프트 | 768 1024 1440 x 4언어 | 인접 요소 x 좌표 1종. **시프트 0** |
| 차트 대비 | 실제 색값으로 WCAG 계산 | chart-1 5.17 / chart-2 3.68 / chart-3 3.83 전부 3:1 이상 |
| 상태 색 단일 출처 | 상태 코드 + 색 클래스 동시 등장 grep | StatusPill 외 **0건** |
| SPA 딥링크 | 프로덕션 빌드를 preview 로 띄워 11경로 직접 요청 | 전부 HTTP 200 + index 번들. 새로고침 404 0건 |
| 금지 grep | 아래 표 | 코드 기준 전부 0 |
| 콘솔 오류 | 전 흐름 | 0건(favicon 404 제외) |

**금지 항목 grep** 하드코딩 hex 0 · 임의 색(bg/text/fill/stroke-[#) 0 · localStorage 0 · TS 문법 0 · 이모지 0 · i18n 줄표 0 · transition-all 0 · hover:scale 0 · active:scale(pressable 밖) 0 · z-[ 0 · 네이티브 select/date 0 · 그라데이션 backdrop-blur 0 · text-[NN 0 · 차트 표 라이브러리 0 · lucide 외 아이콘 0 · 별점 리뷰수 0 · 사라진 토큰 0 · 기관명 하드코딩 0

### 시연 왕복 (발표 1분 영상 시나리오)

| 단계 | 확인한 것 |
|------|-----------|
| 1 상담 홈에서 시설 컨텍스트 질문 | 스트리밍 답변 + 근거 2건 + 시설 상태 카드 |
| 2 담당자 연결 접수 | 접수 완료 + **접수 번호 HO-2026-0906-008 화면 표시** |
| 3 관리자 인계 대기 탭 | 그 건이 목록에 있음(대기 3건). 이름 연락처 문의 내용 일치 |
| 4 완료 처리 | 완료 필 + **처리 시간 1분 기록**(H3 지표 원천) |
| 5 완료 탭 | 같은 건이 완료 탭으로 이동, 처리 시간 유지 |
| 6 대시보드 검토 대기 큐 | 인계 미처리 수가 줄어 사이드바 배지와 같은 값 |
| 7 지식베이스 승인 | 승인한 질문이 **FAQ 관리 목록에 실제로 생김**(HITL) |
| 8 상담 로그 드로어 | 답변 본문 + 근거 2건 표시. 자리표시자 아님 |
| 9 정확도 리뷰 저장 | 정답 선택 저장, 응답 기반 반영(H4 지표 원천) |

### 개발보고서 스크린샷 세트 (docs/screenshots/, 1440 기준 + 모바일 390)

| 파일 | 화면 | 사업계획서 별첨 대응 |
|------|------|------|
| 01-citizen-chat-idle.png | 상담 홈 idle | 채팅 화면 |
| 02-citizen-chat-answer.png | 상담 chat. 근거 + 시설 상태 카드 + 담당자 연결 인라인 | 채팅 화면 |
| 03-citizen-facilities.png | 시설 안내 | |
| 04-citizen-facility-detail.png | 시설 상세 | |
| 05-admin-dashboard.png | 대시보드. KPI 4장 | 관리자 대시보드 |
| 06-admin-logs-drawer.png | 상담 로그 드로어. 정확도 리뷰 | 민원 통계 |
| 07-admin-knowledge-pending.png | 지식베이스 승인 대기(HITL) | |
| 08-admin-facilities.png | 시설 관리 | 시설 관리 |
| 09-admin-reservations.png | 예약 현황 주간 캘린더 | |
| 10-admin-analytics-heatmap.png | 분석 자동처리 탭 + 시간대 요일 히트맵 | 민원 통계 |
| 11-admin-settings.png | 설정 기관 탭 | |
| 12-mobile-chat.png | 390 상담 chat | |
| 13-mobile-dashboard.png | 390 대시보드 | |
| 14-mobile-logs-cards.png | 390 상담 로그 카드 전환 | |

KPI 4장 이름 최종 확인: 민원 자동처리율 / 이용자 만족도 NPS / 담당자 응대시간 / 응답 정확도. 사업계획서 지표명과 문자 일치.

## 2단계 에이전트 C 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 705ms, main 247.00kB(gzip 78.65). 의존성 추가 0 |
| 상담 로그 | 1440 DOM | 필터 4종(시설 처리결과 언어 만족도), 표 헤더 8열, 20행, 페이지네이션 |
| 로그 드로어 | 행 클릭 | `?id=log-0229` 쿼리 반영, 섹션 4개(질문 답변 사용한 출처 정확도 리뷰), radiogroup + radio 3개, 메모, FAQ 등록 |
| 정확도 리뷰 | 정답 선택 | 토스트 "정확도 리뷰를 저장했습니다", radio checked=correct |
| 드로어 접근성 | Tab 6회 + Esc | 6회 전부 다이얼로그 내부, Esc 로 닫힘 |
| 샘플 리뷰 모드 | `?review=1` | 모드 필, 진행 표시 "0 / 20건", 20건, 전체 목록 복귀 버튼 |
| 담당자 인계 | 완료 탭 | 카드 3건, 처리 시간 분 표시, 원 대화 링크(`/admin/logs?id=`), 부서와 상태 Select |
| 인계 상태 변경 | Select 로 완료 선택 | 토스트 "상태를 변경했습니다" |
| 지식베이스 HITL | 승인 대기 탭 | 5건. 질문 제안답변 근거문서 발생건수 + 승인 수정 반려 버튼. 승인 시 카드가 승인 상태로 전환 |
| 문서 업로드 | 모달 | 파일 입력 accept=".pdf,.docx,.hwpx,.md", 종류 Select + 시설 MultiSelect |
| 색인 상태 | 탭 | 지금 재색인 버튼, 색인 로그 3행 |
| FAQ 관리 | 1440 | 카테고리 칩 7개, 검색, 12행, 노출 Toggle. 행 클릭 드로어(입력 2 텍스트영역 1 Select 2) |
| 시설 관리 | 1440 | 요약 4장(활성 시설 오늘의 상담 예약 가능 비율 이슈 발생), 카드 8개, 최근 운영 로그 10행 |
| 시설 편집 | fac-001 | 섹션 4개, 입력 22개, 요일 7개, 네이티브 date 0 select 0 |
| 예약 현황 | 1440 | 주간 그리드 7행 x 16시간 = 112셀, 범례 4상태, 이전/다음 주 버튼, 네이티브 date 0 |
| 주간 이동 | 버튼 클릭 | 09.08~09.14 → 09.15~09.21 → 09.01~09.07 → 이번 주로 복귀. 행 날짜도 함께 이동 |
| 사용자 | 1440 | 사용자 5행, 역할별 권한 표 10행, 초대 모달 |
| 설정 | 탭 5개 | 기관 상담정책 다국어 채널 알림 전부 렌더. 기관명 입력의 hint 가 시민 면 헤드라인을 그대로 보여준다 |
| DataTable 카드 전환 | 390 | 표 display none, 카드 20개, 첫 열이 제목, 나머지 라벨-값 dl, 가로 스크롤 없음 |
| 네이티브 컨트롤 | 9경로 x 9폭 전 로드에서 집계 | select 0, input[type=date] 0 |
| 가로 스크롤 | 9경로 x 9폭(320~3840) | 81건 중 초과 0. 표와 캘린더는 자기 overflow-x-auto 안에서만 |
| 키보드 도달 | Tab 순회(FAQ 관리) | 48/48 도달, focus-visible outline 누락 0 |
| i18n 관리자 4언어 | 시민 면 전환 후 SPA 이동 | Topbar 와 표 헤더 전부 전환(상담 로그 / Chat logs / 相談ログ / 咨询日志) |
| 담당 파일 하드코딩 문자열 | 한글 리터럴 스캔 | 12개 파일 0건 |
| 콘솔 오류 | 전 흐름 | 0건(favicon 404 제외). React DOM 중첩 경고는 수정 후 0 |

## 2단계 에이전트 B 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 645ms, main 295.88kB(gzip 97.10). 의존성 추가 0 |
| 인증 가드 | 비로그인으로 /admin/analytics?tab=nps 진입 | /admin/login 리다이렉트 |
| 로그인 실패 | 잘못된 비밀번호 | 화면 유지 + 인라인 오류 문구 |
| 로그인 성공 + 딥링크 | admin@gchat.dev / gchat1234 | /admin/analytics?tab=nps 로 복귀(쿼리 보존) |
| KPI 4장 이름 | DOM 텍스트 대조 | 민원 자동처리율 / 이용자 만족도 NPS / 담당자 응대시간 / 응답 정확도 문자 일치 |
| KPI 값과 목표선 | DOM | 63.8% 24p 41분 88.4%. 목표 60% 이상, +20p, 도입 전 92분 대비 55.4% 감소 목표 50% 감소, 90% 유지 |
| KPI 링크 | href | 각각 /admin/analytics?tab=auto nps handoff accuracy |
| 차트 라이브러리 | package.json + grep | 0건. SVG 직접(svg[role=img] 2종에 aria-label) |
| 색으로만 구분 금지 | 범례 텍스트 | 자동처리 인계 미해결 3개 라벨 노출 + 미해결은 파선 |
| TrendChart hover | 마우스 이동 | 세로 가이드 + 3계열 값 툴팁(자동처리49 인계17 미해결7) |
| 도넛 | 범례 표 | chart-1~4 색 중복 0, 기타 합침, 상태 필 잘림 없음 |
| RankList | DOM | Top 5, 각 행 FAQ로 등록 버튼 |
| 검토 대기 큐 | 링크 | /admin/logs?review=1, /admin/handoff?tab=wait, /admin/knowledge?tab=pending |
| reduced-motion | Chrome 미디어 에뮬레이션 | 80ms 시점 KPI 가 이미 63.8%(카운트업 없음), 차트 transition-duration 1e-05s |
| 분석 4탭 | auto nps handoff accuracy | 각 추이 + 분해 3표 + 데이터 표 + CSV. auto 에 히트맵 168셀(7x24), nps 에 도입 전후 막대 2개 |
| 사이드바 3형태 | 1440 / 800 / 390 | 240 라벨 노출 / 64 레일 라벨 없음 / 숨김 + 햄버거 + 배너 |
| 사이드바 활성 | 계산값 | bg rgb(239,246,255) = primary-soft, 좌측 3px 바 있음 |
| 검토 대기 배지 | DOM + 계산값 | 상담 로그 12, 담당자 인계 2, 지식베이스 5. bg-warning-soft |
| 모바일 드로어 | 390 햄버거 | 좌측 x=0, animate-slide-in-left, 메뉴 10개 |
| 가로 스크롤 | 4경로 x 9폭(320~3840) | 36건 중 초과 0. 히트맵은 자기 overflow-x-auto 안에서만 스크롤 |
| 키보드 도달 | Tab 순회 | 26/26 도달, outline 누락 0. 의도적 제외 2(DateRangeTabs roving tabindex) |
| i18n 관리자 4언어 | 시민 면에서 전환 후 SPA 이동 | Topbar KPI 4장 사이드바 메뉴 전부 전환, html lang 동기화 |
| 담당 파일 하드코딩 문자열 | 한글 리터럴 스캔(주석 제외) | 16개 파일 0건 |
| 콘솔 오류 | 전 흐름 | 0건(favicon 404 제외) |

## 2단계 에이전트 A 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 858ms, main 280.49kB(gzip 92.90) |
| idle 화면 | 1440 캡처 + DOM 확인 | 헤드라인에 기관명, 추천 칩 4개, 신뢰 문구, 대형 입력창 |
| 스트리밍 중 | 칩 클릭 350ms 후 | 스켈레톤 노출, Composer disabled, 칩 사라짐, 근거 0, 인라인 카드 0, ActionBar 0 |
| 근거 열 점프 | grid-template-columns 측정 | 스트리밍 중과 완료 후 모두 704px 340px. 폭 변화 0 |
| 완료 후 | DOM 확인 | 근거 카드 2건, ActionBar 노출, 담당자 연결 버튼, textarea 재포커스 |
| 시설 컨텍스트 | /?facility=fac-001 → 칩 클릭 | 헤드라인 시설명, 질문에 시설명 결합, FacilityStatusCard(정상/안정적/예약하기) 렌더 |
| 담당자 연결 | ActionBar 버튼 | 인라인 카드 오픈, 부서 체육시설팀, tel 링크 033-000-0001, 통화 가능 필, 페이지 이동 없음 |
| 인계 폼 | 빈 상태 제출 → 동의 없이 제출 → 정상 제출 | 필수 오류 2건 표시, 동의 없이는 차단, 제출 후 접수 완료 상태로 전환 |
| 새 질문 앵커 | 두 번째 질문 전송 | 스트리밍 중 scrollTop 326 = 앵커 326 |
| 완료 후 재보정 | 스페이서 축소 뒤 | 앵커 326, maxScroll 174, scrollTop 174(clamp 보정 동작) |
| 아래로 가기 | 1024x420, 3개 답변 | 상단에서 opacity 1 tabIndex 0, 클릭 시 마지막 메시지 하단으로, 바닥에서 opacity 0 tabIndex -1 |
| 한글 조합 Enter | keyCode 229 + isComposing | 조합 중 전송 안 됨, 조합 종료 후 전송됨 |
| TopNav 폭 전환 | max-width 계산값 | idle 1400px → chat none, transition max-width 0.28s |
| 모바일 390 | 레이아웃 확인 | 레일 display none, 새 대화 버튼 노출, 근거는 답변 아래, 가로 스크롤 없음 |
| 가로 스크롤 | 10경로 x 9폭(320~3840) | 90건 중 초과 0 |
| i18n 4언어 | SPA 내부 이동으로 4언어 순회 | 헤드라인 칩 상태 필 개인정보처리방침 전부 전환, html lang 동기화 |
| 키보드 도달 | Tab 순회 | 시설 안내 22/22, 상담 홈 10/10, focus-visible outline 누락 0 |
| 별점 리뷰수 | 전 페이지 텍스트 검사 | 0건 |
| 담당 폴더 하드코딩 문자열 | 한글 리터럴 스캔(주석 제외) | 0건 |
| 콘솔 오류 | 전 흐름 | 0건(favicon 404 제외) |

## 1.5단계 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 550ms, main 220.47kB(gzip 76.14) |
| 토큰 반영 | tailwind.config 해석 + 빌드된 CSS 대조 | radius xs6 md12 lg16 xl20, shadow-card=sm, shadow-float=lg, duration-fast 0.16s 전부 일치 |
| Button 박스 동일성 | 5 variant 의 width height padding radius font border 측정 | 치수 조합 1종. 전부 동일 |
| LangSwap 시프트 | 320/768/1440 x 4언어, 인접 마커 2개 x 좌표 측정 | 폭별 좌표 1종. 시프트 0 (span lang 수정 후) |
| html lang 동기화 | 4언어 전환 | ko en ja zh 전부 일치 |
| i18n 키 동형 | 방출된 파일을 번들해 키 집합 비교 | ko 322 기준, en ja zh 누락 0 초과 0 |
| i18n 위생 | 빈 문자열 줄표 이모지 검사 | 0건. 자기 표기 4언어 동일 |
| Select 키보드 | ArrowDown Enter Escape + 하이라이트 이동 | 열림, activedescendant opt-0 에서 opt-1 로 이동, Enter 선택, Esc 닫힘 |
| Select 디테일 | 아이콘 보조텍스트 max-h compact | 아이콘 있음, 보조텍스트 있음, max-height 320px, compact h 44 |
| 팝 애니메이션 | 실제 마우스 클릭 vs 키보드 | 마우스는 pop-panel 진입 후 퇴장 70ms 시점 pop-panel-exit 유지, 300ms 뒤 제거. 키보드는 pop-instant 즉시 |
| LangSwitch | 마우스 열기 + 방향키 Enter | 4개 자기 표기, 현재 언어 aria-selected, 선택 시 html lang 변경 |
| pressable | 계산된 transition | transform, background-color, color, box-shadow / 0.12s / cubic-bezier(0.23,1,0.32,1) |
| 가로 스크롤 | 6경로 x 9폭(320~3840) | 54건 중 초과 0 |

## 1단계 검증 결과 (2026-09-06)

| 항목 | 방법 | 결과 |
|------|------|------|
| 빌드 | npm run build | 통과. 529ms, 1695 modules |
| 가로 스크롤 | Chrome 헤드리스로 6경로 x 9폭(320~3840) scrollWidth 측정 | 54건 중 초과 0 |
| 폰트 | document.fonts 확인 | Pretendard Variable loaded |
| 키보드 도달 | Tab 순회로 실제 포커스 수집 | 27/27 도달, focus-visible outline 누락 0. 의도적 제외 4(disabled 2, Tabs roving tabindex 2) |
| 포커스 트랩 | Modal/Drawer 열고 Tab 8회 + Esc | 첫 포커스 진입, 전부 다이얼로그 내부, Esc 닫힘 |
| Select 키보드 | ArrowDown/Enter/Esc | 열림·선택·닫힘 전부 동작. 네이티브 select 0, date input 0 |
| mock 라우터 | esbuild 로 node 번들 후 24개 단언 | 전부 통과 |
| NDJSON 파서 | mockChatStream 을 useChat 과 같은 방식으로 파싱 | 토큰 조립·sources·cards·done 전부 통과 |
| 금지 grep | 아래 표 | 코드 기준 전부 0 |

재현 명령은 scratchpad 의 verify.mjs focus.mjs apicheck.mjs. 영구 보관하지 않았다(생성 파일 목록 밖). 3단계에서 다시 필요하면 같은 방식으로 만든다.

## 이번 세션 완료
- **심사 데모 관리자 자동인증.** mock 일 때만 store 초기값을 인증됨으로 두고 가드와 로그인 라우트에 분기를 더했다. 로그인 페이지 파일은 보존
- **9-2 UI 디자인 시스템 전수검수.** 플레이북 4부 5부 실행. 터치 타깃 173건 → 7건, 오류 상태와 재시도 신설, aria 하드코딩 제거. **9-2 완료**
- **9-1 tint 명도 조정.** soft 배경이 바탕에 묻혀 칩 형태가 안 보이던 것을 한 단계 올렸다. 중립 배지 면은 mute 에서 line-def 로. **9-1 완료**
- **9단계 KRDS 3색 체계 전환.** success(초록)와 warning(주황) 토큰 제거, 상태 22종 3단계 재매핑, 차트 무채색화, 도넛과 랭크 1등만 강조. **9단계 완료**
- **8단계 색과 타이포 재조정.** 7단계 색 방향 정정(정색 배지 → tint 배지), 차트 회색 축소, 알림 카운트, 아바타, 웨이트 사다리. **8단계 완료**
- **7단계 QA 수정 패스.** 상태 색 채도와 정색 배지, 차트 품질(꺾은선 마커 area 도넛 히트맵), 탭 전환 리셋 제거, 4언어 완전화, NPS 소멸, 입력창과 헤더 정렬. **7단계 완료**
- **6단계 통합.** mock 7라우트, confirmLabel, 스피너, TopNav 목록, 칩 아이콘, 통합 왕복 회귀, 스크린샷 24장. **6단계 완료**
- **5-G 관리자 도구.** 온보딩 위저드, 시뮬레이터, 공지 관리, 인계 초안 게이트, 문서 드로어, 알림, QR, 채널 탭. **5단계 완료**
- **5-F 시민 경험.** 대화 목록 레일, QR 진입, NPS 카드, 임베드 위젯. G 대기
- **5-1 에이전트 도구 UI.** 도구 6종 UI, 실행 허용 게이트, mock 6 시나리오, v1 정리. F·G 대기
- **5-D 인사이트 운영.** insight 컴포넌트 5종, 관리자 화면 4종, mock 5종, i18n 124키 × 4언어. E 대기
- **5-0 확장 골격.** 라우트 6개, 사이드바 3구획 15항목, 소개 메뉴, i18n 22키 × 4언어, 스텁 6종. 화면 내용은 D·E 대기
- **4단계 크래프트 패스.** 자산 10종 신설, 마이크로 인터랙션, 빈 상태 전수, 밀도 위계 조정. 발견 결함 3건 수정
- **3단계 통합.** mock 계약 정합, 차트 팔레트 대비, 상태 색 단일 출처, TopNav LangSwap, 통합 검증, 스크린샷 14장
- 2단계 에이전트 C 관리자 운영 화면. 신설 12종 파일, i18n 58키 x 4언어 추가. **2단계 A B C 전부 완료**
- 2단계 에이전트 B 관리자 골격 + 대시보드 + 분석. 신설 16종 파일, i18n 36키 x 4언어 추가
- 2단계 에이전트 A 시민 면 전부. 신설 24종 파일, i18n 34키 x 4언어 추가
- 1.5단계 봄내 이식 전부. 수정 6종 + 신설 26종 파일, 문서 4종 갱신(DESIGN IA SESSION_HEADER PROGRESS)

## 이전 세션 완료
- docs 8종 + SETUP_PROMPT + mock 7종 + lib 시드 2종 작성
- SETUP 실행: client 스캐폴드, tailwind/postcss/vite/vercel/env 설정, 폴더 트리, server/README.md, 루트 .gitignore README.md, .claude/skills/fullstack-product-setup 복사

## 다음 작업
- **Vercel 배포**(현호). 아래 "남은 것" 의 명령과 설정 그대로
- 배포 URL 에서 육안 검증 후 개발보고서에 docs/screenshots/ 15장 삽입
- 1차 서류 마감 2026-09-21(월) 10:00
- **Vercel 배포**(현호). 아래 "남은 것" 의 명령과 설정 그대로. 5단계에서 화면이 늘었으니 배포 후 25경로 직접 진입으로 404 없는지 확인
- **백엔드 실연동**(송준하, 11월). `VITE_USE_MOCK=false` 와 `VITE_API_URL` 교체. API_CONTRACT 의 tool·action·followups·nps 이벤트를 서버가 그대로 보내면 프론트는 그대로 돈다
- **ja zh 네이티브 검수.** 825키로 늘었다. 우선순위는 chat.agent(도구 UI)와 chat·facility, 다음이 admin
- 시설 실사진, 카카오톡 채널 실연동(설정 채널 탭이 자리만 잡아 뒀다)
- 1차 서류 마감 2026-09-21(월) 10:00

## 남은 것

**배포 (현호)**
- Vercel 배포가 안 됐다. 이 환경에 vercel CLI 도 자격증명도 없다. 빌드와 SPA 폴백은 확인했다(프로덕션 빌드를 preview 로 띄워 11경로 직접 요청, 전부 200)
- 명령: `cd client && npx vercel login && npx vercel --prod`
- Vercel 프로젝트 설정: Root Directory `client`, Build Command `npm run build`, Output `dist`
- 환경변수: `VITE_USE_MOCK=true`, `VITE_ORG_NAME=동해시 시설관리공단`, `VITE_API_URL` 은 백엔드 붙기 전까지 비워 둔다
- 배포 후 `/admin/logs` 직접 진입으로 새로고침 404 없는지 육안 확인

**백엔드 실연동 (송준하, 11월)**
- `VITE_USE_MOCK=false` 로 바꾸고 `VITE_API_URL` 만 교체하면 된다. lib/api.js 의 분기 하나다
- 실서버가 붙으면 버려질 것: logs.json 의 answer 시드, mock 세션 메모리 상태
- DataTable 은 전체 행을 받아 클라이언트에서 정렬하고 나눈다. 서버가 실제 페이징을 하면 정렬 키도 서버로 넘겨야 한다

**ja zh 네이티브 검수 (심사 전)**
- client/src/i18n/{ja,zh}/*.js 각 825키. 기계 번역 초안이다
- 우선순위 1 common.status 와 chat 과 facility, 2 legal.privacy, 3 admin

**그 밖**
- 시설 사진이 없어 카드가 전부 유형 아이콘 대체 면이다. 실제 사진이 오면 public/images/facilities/ 에 넣는다
- public/images/illustrations/empty.svg 는 임시다. 정식 unDraw 자산으로 교체
- 시설 데이터 다국어는 이름만 했다. 주소 요금 항목 이용 안내 부서명은 원문이라 `lang="ko"` 로 선언만 해 뒀다. 공단이 다국어 원문을 주면 그때 채운다
- 차트 계열 간 상호 대비는 1.4가 상한이다. 더 벌리려면 DESIGN.md 의 "프라이머리 단색 계열 + 회색" 제약을 풀어야 한다. 지금은 색상과 파선과 범례로 구분한다

## 1단계 파일 수정 요청 (2단계 에이전트가 여기 적는다)

**전부 6단계에서 반영했다(2026-09-07). 열린 요청 없음.**
- ~~api.js 5단계 조회 라우트~~ 5-1 반영
- ~~api.js 5-G 쓰기 라우트 7개~~ 6단계 반영. to-faq 는 1단계 라우트가 이미 있어 그것을 넓혔다
- ~~ui/Button 스피너 motion-reduce~~ 6단계 반영
- ~~mock/README 5단계 설명~~ 6단계 반영
- ~~TopNav 모바일 대화 목록~~ 6단계 반영
- ~~SuggestionChips 아이콘~~ 6단계 반영. iconName 필드로 바꿨다
- ~~ActionCard confirmLabel~~ 6단계 반영

## 결정 기록
- 2026-09-06 Vite+React 채택(사업계획서 Remix 표기와 다름. 백엔드 붙을 때 API_CONTRACT 만 맞추면 됨)
- 2026-09-06 프라이머리 #2563EB
- 2026-09-06 IA 전체 범위. 담당자 인계 메뉴 신설, AI 챗봇 메뉴 → 상담 로그 + 설정/상담 정책
- 2026-09-06 차트 라이브러리 미도입. SVG 직접
- 2026-09-06 봄내 이식은 구조만. 색 폰트 브레이크포인트 타이포 스케일 IA 라우트는 G-Chat 것 유지(DESIGN_DELTA 유지 절)
- 2026-09-06 다국어 기본 ko. 봄내는 en 기본이나 공단 시민 서비스라 한국어가 먼저다
- 2026-09-06 mock 시설 데이터는 가상. 실제 공단 시설 목록 확보 시 SOURCE.md 로 교체
- 2026-09-06 차트 없이 SVG 직접이라 recharts 미도입 유지. 1단계에서 추가 의존성 0개
- 2026-09-06 3단계에서 차트 팔레트 대비 재조정(chart-2 #3B82F6, chart-3 #7C838C, chart-4 #A8AEB6). 데이터 3계열 흰 배경 3:1 이상
- 2026-09-06 i18n 네임스페이스 5종 유지 확정. 공지와 FAQ 는 common 아래
- 2026-09-06 상태 색 매핑은 StatusPill 파일 하나. TONE_TEXT TONE_FILL 도 여기서 나간다
- 2026-09-06 SVG 자산은 tokens import 불가라 hex 가 들어간다. 자산 색은 반드시 tokens 값과 같아야 하고 PROGRESS 의 자산 색 표로 대조한다
- 2026-09-06 무한 반복 애니메이션 예외는 둘이다. 스켈레톤과 스트리밍 커서. 커서는 reduced-motion 에서 display none 으로 지운다
- 2026-09-06 관리자 메뉴 15개는 3구획(운영 인사이트 설정)으로 나눈다. 64 레일에서는 소제목 없이 구분선만
- ~~2026-09-06 i18n 6번째 네임스페이스 about 신설~~ **철회.** 5-1 에서 /about 화면째 삭제. 네임스페이스는 5종으로 돌아왔다
- 2026-09-07 IA_PHASE5 v2 채택. IR 화면이 아니라 에이전트 제품을 만든다. 심사위원이 보는 것은 계획서를 읽어주는 페이지가 아니라 계획서가 주장한 제품이 실제로 되는가다
- 2026-09-07 쓰기 도구는 실행 확인 카드 없이 실행하지 않는다. API_CONTRACT 백엔드 책임에 명문화했다. 공공 서비스에서 "AI 가 멋대로 예약했다"는 민원을 원천 차단하는 장치다
- 2026-09-07 무한 반복 애니메이션 예외는 셋이다. 스켈레톤, 스트리밍 커서, 진행 스피너
- ~~2026-09-07 7단계에서 상태 배지를 soft 배경 + 진한 글자에서 정색 배경 + 흰 글자로 바꿨다~~ **8단계에서 철회.** 정색 배경은 흰 글자 4.5:1 을 강제하고 그 제약이 네 색을 전부 어둡게 눌러 화면을 탁하게 만든다. 배지는 tint 배경 + 진한 글자로 돌아갔다
- 2026-09-07 정색은 점과 아이콘과 차트 전용이다. 면으로 채우는 곳은 danger 버튼과 알림 카운트와 아바타 셋뿐이고 셋 다 흰 글자 4.5:1 을 넘는다. 그래서 danger 정색만 4.5:1 하한을 지킨다
- 2026-09-07 색을 고를 때 대비보다 HSL 채도를 먼저 본다. 채도가 낮으면 대비를 맞춰도 회색기가 돌아 탁하다. 상태 4색과 글자 4색 전부 S 76% 이상이다
- 2026-09-07 **KRDS 3색 체계로 전환. success(초록)와 warning(주황)과 info 토큰을 제거했다.** 유채색은 primary 와 danger 둘뿐이고 나머지는 전부 무채색이다. 색이 다섯 계열이면 위계가 없다
- 2026-09-07 긍정과 기본 상태(정상 완료 대기 보류)는 무채색이다. 색을 쓰면 주목하라는 뜻이 되는데 정상은 볼 필요가 없는 상태다
- 2026-09-07 강조는 하나다. 도넛과 랭크 목록에서 1등만 주색이고 나머지는 무채색 명도차다
- 2026-09-13 터치 타깃은 프리미티브에서만 정한다. 페이지가 높이를 다시 정하면 44 규칙이 화면마다 갈린다
- 2026-09-13 서버 오류를 빈 결과로 위장하지 않는다. 오류는 role=alert 과 재시도 수단을 함께 둔다
- 2026-09-13 aria-label 도 번역 대상이다. 눈에 보이는 문자열만 grep 하면 속성에 숨은 하드코딩을 놓친다
- 2026-09-07 tint 배경은 흰 바탕과 회색 바탕 두 맥락에서 모두 1.2 이상이어야 칩 형태가 보인다. 흰 배경만 보고 정하면 canvas 위에서 사라진다. 중립 배지 면이 mute 가 아니라 line-def 인 이유다
- 2026-09-07 차트 회색은 채도 5% 대다. 8~11% 면 파란 회색으로 읽혀 주 계열과 경쟁한다
- 2026-09-07 웨이트 사다리는 400 / 600 / 700 / 800 이고 인접해 놓이는 짝은 최소 200 차이가 난다. 400 과 500 만 인접하면 위계가 서지 않는다
- 2026-09-07 도넛 stroke-linecap 은 butt 다. 링 두께 30 에서 둥근 캡은 조각마다 35px 을 먹어 네 조각이면 원의 30% 가 사라진다
- 2026-09-07 데이터에 실린 다국어 값은 lib/lang.js 가 고른다. UI 문자열은 i18n 사전, 백엔드가 주는 값(기관명 시설명 운영시간 낱말)은 이 파일 하나다
- 2026-09-07 번역하지 않는 원문에는 lang="ko" 를 박는다. 원문 무결성과 WCAG 3.1.2 를 동시에 만족하는 유일한 방법이다

## 확인 필요 (현호 → 송준하)
- 동해시장상이 지자체 주최 수상이면 「동일·유사 아이템 소명서」 필요. 공고 유의사항
- 송준하 명의 사업자등록 없어야 예비창업자 자격. 사실증명 발급 시간 걸림
- 공단 시설 목록과 운영 매뉴얼 원문
