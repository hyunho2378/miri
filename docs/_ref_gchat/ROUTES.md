# ROUTES.md G-Chat 라우팅

React Router v6. `client/src/App.jsx` 한 곳에 전부 등록한다. 페이지 컴포넌트는 `React.lazy` 로 분할하되 상담 홈(`/`)은 즉시 로드한다. 첫 화면이 늦으면 안 된다.

## 시민 면 (PublicLayout)

| 경로 | 페이지 | 비고 |
|------|--------|------|
| / | pages/public/ChatPage | 쿼리 `?facility=id` 시설 컨텍스트, `?q=` 질문 프리필 |
| /facilities | FacilitiesPage | 쿼리 `?type=` 필터 |
| /facilities/:id | FacilityDetailPage | 쿼리 `?tab=guide|fee|reserve|map` |
| /notices | NoticesPage | |
| /notices/:id | NoticeDetailPage | |
| /faq | FaqPage | 쿼리 `?cat=` |
| /privacy | PrivacyPage | |
| /widget | WidgetPage | 공개. iframe 임베드용이라 PublicLayout 밖이다. 5단계 스텁 |
| * | NotFoundPage | EmptyState + 상담 홈 버튼 |

## 관리자 면 (AdminLayout, 가드)

| 경로 | 페이지 | 역할 |
|------|--------|------|
| /admin/login | admin/LoginPage | 공개. 인증 상태면 /admin 으로 |
| /admin | DashboardPage | 전체 |
| /admin/logs | LogsPage | 전체. 쿼리 `?id=` 드로어 오픈, `?review=1` 샘플 리뷰 모드 |
| /admin/handoff | HandoffPage | 전체. 쿼리 `?tab=wait|progress|done` |
| /admin/knowledge | KnowledgePage | 관리자, 운영자. `?tab=docs|pending|index` |
| /admin/faq | FaqAdminPage | 관리자, 운영자 |
| /admin/facilities | FacilitiesAdminPage | 관리자, 운영자 |
| /admin/facilities/:id | FacilityEditPage | 관리자, 운영자. `new` 는 신규 |
| /admin/reservations | ReservationsPage | 전체 |
| /admin/analytics | AnalyticsPage | 전체. `?tab=auto|nps|handoff|accuracy` |
| /admin/insights | InsightsPage | 전체. 5단계 스텁 |
| /admin/reports | ReportsPage | 전체. 5단계 스텁 |
| /admin/forecast | ForecastPage | 전체. 5단계 스텁 |
| /admin/simulator | SimulatorPage | 전체. 5단계 스텁 |
| /admin/notices | NoticesAdminPage | 관리자, 운영자. 5단계 스텁 |
| /admin/onboarding | OnboardingPage | 관리자만. 5단계 스텁 |
| /admin/users | UsersPage | 관리자만 |
| /admin/settings | SettingsPage | 관리자만. `?tab=org|policy|lang|channel|alert` |

역할 3종: admin(기관 관리자), operator(운영자), reviewer(검토자). 검토자는 로그·인계·분석·대시보드·예약만.

5단계 설계 원본은 IA_PHASE5.md v2(에이전트 제품 확장)다. 라우트는 시민 9 + 관리자 16 = 25개다.

| 5단계 화면 | 쿼리 |
|---|---|
| /widget | `?org=` 기관 id, `?lang=` 초기 언어 |
| / | `?src=qr` 현장 QR 진입(헤드라인과 칩이 시설 맞춤으로 바뀐다) |
| /admin/notices | `?id=` 드로어 오픈, `__new__` 는 새 공지 |
| /admin/knowledge | `?id=` 문서 상세 드로어 |
| /admin/reports | `?id=` 리포트 드로어 |

## 가드

```jsx
// components/layout/RequireAuth.jsx
export default function RequireAuth({ roles }) {
  const { user, ready } = useAuthStore()
  const loc = useLocation()
  if (!ready) return <LoadingScreen />
  if (!user) return <Navigate to="/admin/login" state={{ from: loc }} replace />
  if (roles && !roles.includes(user.role)) return <Navigate to="/admin" replace />
  return <Outlet />
}
```

App.jsx 구조

```jsx
<Routes>
  <Route element={<PublicLayout />}>
    <Route index element={<ChatPage />} />
    ...
  </Route>
  <Route path="/admin/login" element={<LoginPage />} />
  <Route path="/admin" element={<RequireAuth />}>
    <Route element={<AdminLayout />}>
      <Route index element={<DashboardPage />} />
      <Route path="logs" element={<LogsPage />} />
      ...
      <Route element={<RequireAuth roles={['admin']} />}>
        <Route path="users" element={<UsersPage />} />
        <Route path="settings" element={<SettingsPage />} />
      </Route>
    </Route>
  </Route>
  <Route path="*" element={<NotFoundPage />} />
</Routes>
```

## 인증 저장

httpOnly 쿠키. 프론트는 `/api/auth/me` 로 세션 확인만 한다. useAuthStore 는 메모리 상태. localStorage 금지.

mock 모드(VITE_USE_MOCK=true)에서는 lib/api.js 가 `admin@gchat.dev / gchat1234` 를 통과시키고 user 를 메모리에 둔다. 새로고침하면 로그아웃된다. 정상이다.

## 스크롤

라우트 변경 시 window.scrollTo(0,0). ScrollToTop 컴포넌트. `/` 는 내부 스크롤 컨테이너라 무관.

## 쿼리 규칙

탭과 필터는 URL 쿼리에 둔다. 새로고침과 링크 공유가 되어야 한다. useSearchParams 로 읽고 쓴다. 드로어 오픈 상태(`?id=`)도 쿼리다. 뒤로가기로 닫힌다.
