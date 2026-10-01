# COMPONENTS.md G-Chat 컴포넌트 명세

작성일 2026년 9월 6일. 경로는 client/src 기준. 스타일 값은 DESIGN.md와 tokens.js를 따르고 여기서는 구조, props, 반응형 변형, 상태만 적는다. 동해사이에서 검증된 컴포넌트는 출처를 적고 로직을 옮길 때 수정 금지 범위를 표시한다.

## 트리

```
components/
├── layout/
│   ├── PublicLayout.jsx      TopNav + Outlet + Footer. / 는 h-screen 고정, 나머지는 min-h-screen
│   ├── AdminLayout.jsx       Sidebar + Topbar + Outlet. canvas 배경
│   ├── TopNav.jsx            시민 헤더. useChatUi.panelOpen 으로 폭 전환
│   ├── Sidebar.jsx           관리자 240 / 레일 64 / 드로어
│   ├── Topbar.jsx            관리자 상단바. 타이틀, 기간 탭, 검색, 알림, 리포트
│   └── Footer.jsx            시민 푸터. 기관 정보, 개인정보처리방침
├── nav/
│   ├── Logo.jsx
│   ├── LangSwitch.jsx        4개 언어 드롭다운
│   └── UserMenu.jsx          관리자 프로필 드롭다운
├── chat/
│   ├── ChatHero.jsx          idle / leaving / chat 3상태 컨테이너 (동해사이 SovereignHero 이식)
│   ├── Composer.jsx          대형 입력창 + 전송 버튼
│   ├── SuggestionChips.jsx   추천 질문 4개
│   ├── MessageList.jsx       대화 스크롤 영역. 앵커, 스페이서, 아래로 가기
│   ├── UserBubble.jsx
│   ├── AnswerText.jsx        마크다운 렌더러 (동해사이 이식)
│   ├── AnswerSkeleton.jsx    대기 스켈레톤 + 문구 회전
│   ├── SourcePanel.jsx       근거 카드 목록
│   ├── ActionBar.jsx         복사 / 담당자 연결 / 도움 여부
│   ├── FacilityStatusCard.jsx 실시간 시설 상태 인라인 카드
│   ├── HandoffCard.jsx       담당자 연결 인라인 카드 + 폼
│   └── NoticeCard.jsx        공지 인라인 카드
├── dashboard/
│   ├── KpiCard.jsx
│   ├── TrendChart.jsx        꺾은선. SVG 직접 그림
│   ├── BarChart.jsx          막대. SVG
│   ├── DonutChart.jsx        도넛 + 범례 표. SVG
│   ├── Heatmap.jsx           시간대 × 요일
│   ├── RankList.jsx          Top N 랭크
│   ├── DataTable.jsx         정렬, 열 숨김, 행 클릭, 모바일 카드 전환
│   ├── DateRangeTabs.jsx     7일 30일 분기
│   ├── StatusPill.jsx
│   ├── ReviewQueueCard.jsx   검토 대기 요약
│   └── WeekCalendar.jsx      예약 현황 주간 그리드
├── facility/
│   ├── FacilityCard.jsx      시민 면 카드
│   ├── FacilityAdminCard.jsx 관리자 면 카드 (상담 건수, 예약 상태)
│   └── HoursTable.jsx        요일별 운영시간
└── ui/
    ├── Button.jsx
    ├── IconButton.jsx
    ├── Input.jsx
    ├── Textarea.jsx
    ├── Select.jsx            커스텀. 네이티브 select 금지
    ├── MultiSelect.jsx
    ├── Chip.jsx
    ├── Badge.jsx
    ├── Tabs.jsx
    ├── Toggle.jsx
    ├── Modal.jsx
    ├── Drawer.jsx
    ├── Toast.jsx
    ├── EmptyState.jsx
    ├── Skeleton.jsx
    ├── Pagination.jsx
    ├── Avatar.jsx
    └── Tooltip.jsx
```

차트 라이브러리 안 쓴다. recharts 같은 것을 넣으면 색과 폰트가 토큰 밖으로 샌다. 필요한 차트는 4종이고 SVG로 충분하다.

---

## layout

### PublicLayout.jsx
- `/` 에서 `h-screen flex flex-col`, 푸터 숨김. 챗봇이 한 화면에 고정돼야 한다
- 그 외 `min-h-screen`, 푸터 노출
- `<main className="flex-1 min-h-0 flex flex-col">` 안에 Outlet

### AdminLayout.jsx
- `grid lg:grid-cols-[240px_1fr] md:grid-cols-[64px_1fr]` 
- 768 미만은 사이드바 숨김, Topbar 좌측 햄버거로 Drawer(좌측)
- 768 미만 진입 시 상단에 배너 한 줄: 관리 기능은 데스크톱에서 편집하기를 권장합니다. 닫기 가능, 세션 내 한 번만(zustand)
- 인증 가드는 ROUTES.md

### TopNav.jsx (동해사이 이식)
- sticky top-0 z-nav, page 배경, 하단 line-sub
- 높이 nav-m / lg:nav
- 좌 Logo, 우 데스크톱 메뉴(시설 안내 / 공지 / 자주 묻는 질문) + LangSwitch. 모바일 햄버거 → 풀스크린 메뉴
- `panelOpen` 이면 컨테이너 `!max-w-none` 으로 확장. transition max-width page/ease-out. 유일한 레이아웃 속성 애니메이션 예외

### Sidebar.jsx
- 240: 상단 기관명(설정값) + 로고, 메뉴 10개(IA 표), 하단 UserMenu
- 64 레일: 아이콘만, hover 시 Tooltip 라벨
- 활성 항목: primary-soft 배경, primary-text 글자, 좌측 3px primary 바
- 검토 대기 수는 상담 로그 / 담당자 인계 / 지식베이스 항목 우측 Badge 로 표시

### Topbar.jsx
- 높이 topbar, page 배경, 하단 line-sub, sticky
- 좌: 햄버거(md-) + 페이지 타이틀 h1 + 브레드크럼(선택)
- 우: 슬롯. 페이지가 DateRangeTabs, 검색, 버튼을 넣는다. `actions` prop

---

## chat

### ChatHero.jsx (SovereignHero 이식)

수정 금지 로직 (동해사이 PROGRESS_CHATBOT 1~7차 검증분)
- phase idle → leaving(240ms) → chat 전환
- 새 질문 상단 앵커: `lastQRef.offsetTop - 24` 로 컨테이너 scrollTo, rAF + 450ms 재확정
- 동적 하단 스페이서: 스트리밍 중 `clientHeight - (마지막답변바닥 - 마지막질문top)`, 완료 후 min(needed, 24vh, 160px)
- 아래로 가기 버튼은 마지막 메시지 기준 dist > 120
- 답변 완료 후 textarea 재포커스
- 스트리밍 중 Composer와 칩 잠금
- 근거 카드는 스트리밍 끝난 뒤에만

바꾸는 것
- 다크 배경 없음. page 배경
- 사이드바 레일 56 에 새 대화 + (로그인 없음) 
- 답변 행 grid `lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px]`
- 인라인 카드 슬롯: AnswerText 아래, SourcePanel 위. message.cards 배열을 종류별 컴포넌트로
- `?facility=id` 쿼리로 진입하면 idle 헤드라인이 `{시설명}에 대해 물어보세요` 로 바뀌고 칩이 시설 맞춤 4개로 바뀐다
- `?q=` 쿼리는 Composer 프리필

props 없음. useChat 훅과 useChatUi 스토어 사용.

### Composer.jsx
- props: value, onChange, onSubmit, disabled, placeholder, autoFocus
- textarea rows 2, min-h 56, max-h 200, scrollHeight 로 자동 확장
- 우측 전송 IconButton 44 원형. 빈 값이면 primary-soft/primary, 값 있으면 primary/inverse
- Enter 전송, Shift+Enter 줄바꿈, isComposing 229 가드(한글 조합 중 전송 금지)
- 컨테이너 radius xl, border line-def, focus-within border primary + ring primary-line
- 하단 좌측 meta: `{기관명} 공식 자료로만 답합니다`

### SuggestionChips.jsx
- props: items[{label, question}], onPick, disabled
- 데스크톱 4개 한 줄 flex-wrap, 모바일 grid-cols-2
- Chip variant outline, 높이 40, radius full, 좌측 lucide 아이콘(Clock, CreditCard, CalendarCheck, MapPin)

### MessageList.jsx
- ChatHero 에서 분리한 스크롤 영역. ref 와 앵커 로직을 여기 둔다
- 각 답변 행 = `AnswerRow`: 본문 열 + 근거 열

### AnswerText.jsx (동해사이 이식, 수정 금지)
- renderRich: 문단 / 하이픈 불릿 / 번호 / 볼드 / 파이프 표
- 출처 칩은 G-Chat 에서는 문단별로 안 붙인다. SourcePanel 에 모은다. `showSources` 기본 false
- props: text, compact

### AnswerSkeleton.jsx
- 문구 회전 2.2s: 공식 자료 찾는 중 / 운영 매뉴얼 확인 중 / 답변 정리 중
- 바 3개 skeleton 애니메이션

### SourcePanel.jsx
- props: sources[{id, title, kind, updatedAt, url, facilityId}]
- 헤더 caption: 이 답변의 근거 N건
- 카드: 종류 Badge(운영 매뉴얼 / 공지 / FAQ / 예약 시스템 / 규정), 제목 h3 line-clamp-1, 갱신일 meta, 90일 초과 시 text-sec 굵은 글자 `오래된 자료일 수 있습니다`(9단계. 경고색을 없애고 무채색 강조로 바꿨다), 우측 원형 ArrowRight
- 3개까지 노출, 더 보기 버튼
- 모바일에서는 답변 아래, 상단 line-sub 로 구분

### ActionBar.jsx
- 복사(Copy→Check 전환), 담당자 연결(UserRoundCheck, 텍스트 라벨 동반), 도움이 됐어요(ThumbsUp), 아니에요(ThumbsDown)
- 담당자 연결은 항상 보인다. 아이콘+라벨 버튼. 나머지는 IconButton
- onHandoff, onVote(up|down) 콜백. 투표는 useChat 이 로그에 기록

### FacilityStatusCard.jsx
- props: facility{name, todayHours, status, reservation, reservationUrl}
- 좌 시설명 h3 + 오늘 운영시간 body-sm, 우 StatusPill 예약 상태
- 하단 예약하기 Button secondary → 새 창. 마감이면 disabled + 대기 안내
- shadow-card, radius lg, 패딩 16

### HandoffCard.jsx
- 답변 아래 인라인. enter 애니메이션
- 상단: 담당 부서명, 전화(tel 링크), 운영시간, 지금 통화 가능 여부 StatusPill
- 하단: 문의 남기기 폼. Input 이름, Input 연락처, Textarea 내용, 개인정보 동의 Toggle(privacy 링크), Button primary 접수
- 접수 성공 시 카드가 접수 완료 상태로 바뀌고 접수 번호 표시. Toast

### NoticeCard.jsx
- 공지 제목, 날짜, 관련 시설 Badge, 원문 보기 링크

---

## dashboard

### KpiCard.jsx
- props: label, value, unit, delta, deltaLabel, target, targetLabel, status(달성|근접|미달), to
- 라벨 caption text-meta / 값 kpi tabular / 증감 caption + ArrowUp/Down / 목표 문구 meta
- status 에 따라 목표 문구 색. 미달 danger-text
- 카드 전체 Link. hover mute 배경. 카운트업 최초 1회

### TrendChart.jsx
- props: series[{name, color, points[]}], labels[], height, yFormat
- SVG viewBox 유동. 세로 격자 line-sub, 라벨 meta
- 계열별 path. 마우스 hover 시 세로 가이드 + Tooltip(모든 계열 값)
- 범례 상단 우측. 색 점 + 라벨
- 진입 시 stroke-dashoffset 애니메이션 1회

### BarChart.jsx
- 그룹 막대 지원(도입 전 사후 비교). scaleY 진입

### DonutChart.jsx
- props: items[{label, value, status}]
- 중앙 총합 kpi. 우측 범례 표(라벨, 값, 비중, StatusPill)
- 조각 색 chart-1~4 순환, 5개 넘으면 기타로 합침

### Heatmap.jsx
- 7행(요일) × 24열(시). 셀 색 primary 알파 5단계. 툴팁 건수
- 모바일은 가로 스크롤 컨테이너 안에서만 스크롤(전역 가로 스크롤 금지)

### RankList.jsx
- props: items[{rank, label, count, delta, facility}], onAction, actionLabel
- 행: 순위 숫자(tabular, 1~3 primary-text), 라벨 body-sm, 건수 h3 tabular, 증감 caption, 우측 ghost 버튼(FAQ로 등록)
- 막대: 라벨 아래 얇은 2px 바로 상대 비중

### DataTable.jsx
- props: columns[{key, label, width, sortable, hideBelow('md'|'lg'), render}], rows, onRowClick, rowKey, empty, page, pageSize
- 헤더 subtle 배경 caption 600. 정렬 아이콘 ChevronsUpDown
- 768 미만: 각 행을 카드로. 첫 열이 카드 타이틀, 나머지 라벨-값 2열
- hideBelow 열은 해당 폭 미만에서 숨김
- 빈 상태 EmptyState

### DateRangeTabs.jsx
- 7일 / 30일 / 분기. Tabs 컴포넌트 pill 변형. useAdminUi.range 전역

### StatusPill.jsx
- props: status, label, size(sm|md)
- 점 8 + caption. IA 상태 표의 색 매핑을 여기 한 곳에 둔다. 다른 곳에서 색 매핑 금지

### ReviewQueueCard.jsx
- 3행: 아이콘, 라벨, 건수 Badge, ArrowRight. 각 행 Link

### WeekCalendar.jsx
- 열 7일, 행 시간대(설정된 운영시간 범위만). 셀 상태 4종 색. 클릭 시 Tooltip 상세
- 커스텀 날짜 이동 버튼. 네이티브 date 금지

---

## facility

### FacilityCard.jsx
- 사진 16:10, 없으면 mute + 유형 아이콘 24
- 사진 위 좌상단 유형 Badge, 우상단 StatusPill
- 시설명 h3, 오늘 운영시간 body-sm text-sec, 예약 가능 caption
- 별점 리뷰수 절대 없음
- 전체 Link. hover 시 사진 없음. 배경 없음. 카드 링 line-def → line-strong 색 변화만

### FacilityAdminCard.jsx
- 사진 작게 좌측 72, 우측 시설명 + 유형 + StatusPill, 하단 오늘 상담 N건 / 예약 상태 / 최근 갱신 meta

### HoursTable.jsx
- 요일 7행, 시간 셀. 휴관일 danger-text. 오늘 행 primary-soft 배경

---

## ui

### Button.jsx
- variant primary / secondary / ghost / danger. size sm(32) md(40) lg(44)
- 좌우 아이콘 슬롯. loading 시 스피너 + disabled
- press scale 0.97. hover 배경만
- `as` prop 으로 Link 렌더

### IconButton.jsx
- size 32 / 40 / 44. radius full 기본, md 옵션. aria-label 필수(없으면 콘솔 경고)

### Input.jsx / Textarea.jsx
- label, hint, error, leftIcon, rightSlot. 높이 44. error 시 border danger + 아래 caption danger-text
- 라벨 association `htmlFor` 필수

### Select.jsx / MultiSelect.jsx
- 버튼 트리거 + 드롭다운(z-dropdown, shadow-float, radius md). 키보드 방향키, Enter, Esc, 타이핑 점프
- MultiSelect 는 선택 항목을 Chip 으로 트리거 안에 표시

### Chip.jsx
- variant outline / filled / selected. 높이 32(필터) 40(추천 질문). radius full

### Badge.jsx
- tone neutral / primary / danger 셋. soft 배경 + text 색 짝. radius xs. caption 600(9단계)

### Tabs.jsx
- variant underline(기본) / pill. 키보드 좌우. 인디케이터 transform 이동

### Toggle.jsx
- 44×24, thumb translateX 애니메이션. 라벨 필수

### Modal.jsx
- 중앙, max-w 560, radius xl, shadow-float. 배경 딤 rgba 16,16,16,0.4. Esc 닫기, 포커스 트랩, 열릴 때 첫 포커스 요소
- 헤더 h2, 본문, 푸터 버튼 우측 정렬

### Drawer.jsx
- side right(기본) / left. 폭 clamp(360px, 40vw, 560px). translateX 진입. 포커스 트랩
- 헤더 타이틀 + 닫기, 본문 스크롤, 푸터 sticky

### Toast.jsx
- 우상단(데스크톱) / 상단 중앙(모바일). tone 4종. 4초 자동 닫힘. 여러 개 스택

### EmptyState.jsx
- unDraw SVG(primary 단색) 96 + h3 + body-sm + 선택 Button

### Skeleton.jsx
- 블록 / 텍스트 줄 / 카드 프리셋

### Pagination.jsx
- 이전 다음 + 페이지 숫자. tabular

### Avatar.jsx
- 이니셜 원형. 크기 24/32/40

### Tooltip.jsx
- hover와 focus 둘 다. 300ms 지연. z-dropdown
