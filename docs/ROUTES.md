# ROUTES.md 미리 라우팅

React Router v6. App.jsx 한 곳에 등록. 소개 화면만 즉시 로드, 나머지 lazy. 새로고침과 직접 진입 404 방지는 client/vercel.json rewrites (PITFALLS 28).

## 표

| 경로 | 페이지 파일 | 레이아웃 | 가드 | 로드 |
|------|-----------|---------|------|------|
| / | pages/public/IntroPage.jsx | PublicLayout | 없음 | 즉시 |
| /privacy | pages/public/PrivacyPage.jsx | PublicLayout | 없음 | lazy |
| /console/login | pages/console/LoginPage.jsx | 없음 | 로그인 상태면 /console 이동 | lazy |
| /console | pages/console/OverviewPage.jsx | AdminLayout | RequireAuth | lazy |
| /console/roster | pages/console/RosterPage.jsx | AdminLayout | RequireAuth | lazy |
| /console/intake | pages/console/IntakePage.jsx | AdminLayout | RequireAuth | lazy |
| /console/resources | pages/console/ResourcesPage.jsx | AdminLayout | RequireAuth | lazy |
| /console/shortage | pages/console/ShortagePage.jsx | AdminLayout | RequireAuth | lazy |
| /console/dispatch | pages/console/DispatchPage.jsx | AdminLayout | RequireAuth | lazy |
| /console/handover | pages/console/HandoverPage.jsx | AdminLayout | RequireAuth role=city | lazy |
| /console/records | pages/console/RecordsPage.jsx | AdminLayout | RequireAuth | lazy |
| /console/records/:id | pages/console/RecordDetailPage.jsx | AdminLayout | RequireAuth | lazy |
| /console/settings | pages/console/SettingsPage.jsx | AdminLayout | RequireAuth role=city | lazy |
| /h/:token | pages/helper/HelperPage.jsx | HelperLayout | 토큰 검증 (서버) | lazy |
| * | pages/public/NotFoundPage.jsx | PublicLayout | 없음 | lazy |

## 가드

- RequireAuth: G-Chat 컴포넌트 재사용. 미로그인 시 /console/login?next=원래경로. 세션은 httpOnly 쿠키, 클라이언트 상태는 zustand 메모리만 (localStorage 금지)
- role 속성: city(시 관리자) / dong(동 담당자). 권한 없으면 /console로 이동 + 토스트
- 동 담당자는 데이터 조회 시 본인 동으로 서버가 필터. 프론트 필터는 표시 보조일 뿐 권한 수단 아님
- 도우미 토큰: 발령마다 새로 발급, 발령 종료 시 무효. 무효 토큰은 HelperPage가 종료 안내 상태 렌더 (404 아님)
- /h/demo: VITE_USE_MOCK=true일 때만 데모 도우미 배정 렌더

## 쿼리 파라미터

| 경로 | 파라미터 | 용도 |
|------|---------|------|
| /console/roster | dong, village, grade, review | 필터 상태 공유 |
| /console/intake | doc | 특정 문서 확인 화면 열기 |
| /console/shortage | scenario | 저장 시나리오 열기 |
| /console/dispatch | drill=1 | 훈련 발령 |

## 레이아웃 공통

- 라우트 전환 시 ScrollToTop (G-Chat App.jsx 내부 소형 컴포넌트 재사용)
- 페이지 진입 애니메이션: DESIGN.md 모션 표 페이지 진입
- 발령 진행 중 전역 발령 띠는 AdminLayout이 store에서 읽어 렌더
