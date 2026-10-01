# PATTERNS.md G-Chat 재사용 JSX 패턴

작성일 2026년 9월 6일. 에이전트는 아래 패턴을 그대로 복사해 쓴다. 임의 변형 금지. 클래스는 tailwind.config.js가 tokens.js에서 만든 것만 쓴다.

## 1. 페이지 컨테이너

```jsx
// 시민 면
<div className="mx-auto w-full max-w-page px-4 md:px-6 lg:px-8 xl:px-10 3xl:px-16">

// 관리자 면 콘텐츠
<div className="mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8">
```

## 2. 활자 클래스 (index.css @layer components)

```css
/* 8단계 값. 웨이트 사다리 400 / 600 / 700 / 800, 인접한 짝은 최소 200 차이 */
.type-display { font-size: clamp(30px, 2vw + 21px, 42px); font-weight: 700; letter-spacing: -0.035em; line-height: 1.14; }
.type-h1      { font-size: clamp(24px, 1vw + 19px, 32px); font-weight: 700; letter-spacing: -0.025em; line-height: 1.2; }
.type-h2      { font-size: clamp(18px, 0.5vw + 16px, 22px); font-weight: 600; letter-spacing: -0.02em; line-height: 1.25; }
.type-h3      { font-size: clamp(17px, 0.3vw + 15.5px, 19px); font-weight: 700; letter-spacing: -0.02em; line-height: 1.3; }
.type-kpi     { font-size: clamp(28px, 1.2vw + 22px, 40px); font-weight: 800; letter-spacing: -0.03em; line-height: 1.05; font-variant-numeric: tabular-nums; }
.type-body    { font-size: clamp(15px, 0.2vw + 14px, 17px); font-weight: 400; letter-spacing: -0.01em; line-height: 1.7; }
.type-body-sm { font-size: clamp(13px, 0.15vw + 12.5px, 14px); font-weight: 400; letter-spacing: -0.005em; line-height: 1.55; }
.type-caption { font-size: clamp(11px, 0.1vw + 10.5px, 12px); font-weight: 600; line-height: 1.4; }
.type-meta    { font-size: 12px; font-weight: 400; letter-spacing: 0.01em; line-height: 1.4; }
.type-count   { font-size: 10px; font-weight: 700; letter-spacing: 0.01em; line-height: 1; font-variant-numeric: tabular-nums; }
```

컴포넌트에서 text-[15px] 같은 임의 크기 금지. 위 열 클래스만.
index.css 와 tokens.typography 는 항상 같이 고친다. 값이 다르면 그 둘이 맞고 이 문서를 고친다.

## 3. 카드 베이스

```jsx
<div className="bg-page rounded-lg shadow-card p-4 lg:p-5">
```

border 클래스를 카드에 쓰지 않는다. shadow-card 링이 경계다. hover 가 필요한 카드(Link)는 `hover:bg-mute transition-colors duration-base`.

## 4. KPI 카드

```jsx
<Link to={to} className="block bg-page rounded-lg shadow-card p-6 hover:bg-mute transition-colors duration-base">
  <p className="type-caption text-text-meta">{label}</p>
  <p className="mt-2 type-kpi text-text-pri">{value}<span className="ml-1 type-h3 text-text-meta">{unit}</span></p>
  <div className="mt-3 flex items-center gap-2">
    <span className={`inline-flex items-center gap-1 type-caption ${delta >= 0 ? 'text-success-text' : 'text-danger-text'}`}>
      {delta >= 0 ? <ArrowUp size={16} /> : <ArrowDown size={16} />}{Math.abs(delta)}{unit}
    </span>
    <span className="type-meta text-text-meta">{deltaLabel}</span>
  </div>
  <p className={`mt-1 type-meta ${statusColor[status]}`}>{targetLabel}</p>
</Link>
```

## 5. 상태 필

```jsx
// 9단계. KRDS 3색 체계. 톤은 중립 주목 위험 셋뿐이다. 초록과 주황은 없다.
// 정상과 완료와 대기는 강조할 것이 아니라 기본이라 중립이다
// 9-1. 중립 면은 mute 가 아니라 line-def 다. mute 는 canvas 와 대비 1.04 라 회색 바탕에서 칩이 사라진다
const PILL = {
  neutral: 'bg-line-def text-text-sec',
  primary: 'bg-primary-soft text-primary-text',
  danger:  'bg-danger-soft text-danger-text'
}
const DOT = { neutral: 'bg-text-meta', primary: 'bg-primary', danger: 'bg-danger' }

<span className={`inline-flex items-center gap-1.5 h-6 px-2 rounded-xs type-caption ${PILL[tone]}`}>
  <span className={`h-1.5 w-1.5 shrink-0 rounded-full ${DOT[tone]}`} aria-hidden="true" />
  {label}
</span>
```

점은 장식이라 aria-hidden 이다. 색으로만 뜻을 전하지 않는다는 규칙은 필 안 텍스트 라벨이 지킨다.
상태 문자열 → tone 매핑은 StatusPill.jsx 한 곳. IA.md 상태 표 기준.

**정색을 배경으로 채우는 곳은 배지가 아니다.** primary 버튼과 아바타, danger 버튼과 알림 카운트 넷뿐이고
전부 흰 글자 4.5:1 을 넘는다. 그 밖에서 `bg-primary` `bg-danger` 를 면으로 쓰지 않는다.

셀처럼 안에 라벨을 넣을 수 없는 자리는 중립을 명도 두 단계로 나눈다. 이 매핑도 StatusPill 에 있다.

```jsx
import { cellFill } from '../dashboard/StatusPill.jsx'
// 여유 mute / 예약됨 primary-soft / 마감 danger-soft / 유지보수 line-def
<span className={clsx('block h-8 w-10 rounded-xs', cellFill(state))} title={`${date} ${hour} ${label}`} />
```

```jsx
// 알림 카운트. 벨 우상단 밖에 걸친다. Badge 를 쓰면 높이가 20px 이라 20px 벨을 덮는다
<span className="relative inline-flex">
  <Bell size={20} aria-hidden="true" />
  {unread > 0 && (
    <span className="absolute -right-1.5 -top-1.5 inline-flex h-4 min-w-4 items-center justify-center
                     rounded-full bg-danger px-1 ring-2 ring-page type-count text-text-inverse">{unread}</span>
  )}
</span>
```

## 6. 버튼

```jsx
const BASE = 'inline-flex items-center justify-center gap-2 rounded-md font-medium transition-[background-color,color] duration-base active:scale-[0.97] motion-reduce:active:scale-100 disabled:opacity-40 disabled:cursor-not-allowed disabled:active:scale-100'
const SIZE = { sm: 'h-8 px-3 type-caption', md: 'h-10 px-4 type-body-sm', lg: 'h-11 px-5 type-body-sm' }
const VARIANT = {
  primary:   'bg-primary text-text-inverse hover:bg-primary-hover',
  secondary: 'bg-page text-text-pri shadow-card hover:bg-mute',
  ghost:     'bg-transparent text-text-sec hover:bg-mute hover:text-text-pri',
  danger:    'bg-danger text-text-inverse hover:bg-danger-text'
}
```

## 7. 입력 필드

```jsx
<div>
  <label htmlFor={id} className="block type-caption text-text-sec mb-1.5">{label}</label>
  <div className={`flex items-center h-11 px-3 rounded-md bg-page border transition-colors duration-base
                   ${error ? 'border-danger' : 'border-line-def hover:border-line-strong'}
                   focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-line`}>
    {leftIcon && <span className="mr-2 text-text-meta">{leftIcon}</span>}
    <input id={id} className="flex-1 min-w-0 bg-transparent outline-none type-body-sm text-text-pri placeholder:text-text-ter" />
  </div>
  {error ? <p className="mt-1 type-caption text-danger-text">{error}</p>
         : hint && <p className="mt-1 type-meta text-text-meta">{hint}</p>}
</div>
```

## 8. 챗봇 대형 입력창

```jsx
<div className="flex items-center gap-3 p-3 pl-4 rounded-xl bg-page border border-line-def
                focus-within:border-primary focus-within:ring-2 focus-within:ring-primary-line
                transition-colors duration-base">
  <textarea ref={taRef} rows={2} aria-label="G-Chat에 질문하기"
    className="flex-1 min-w-0 resize-none bg-transparent outline-none py-2 min-h-14 max-h-[200px] overflow-y-auto
               type-body text-text-pri placeholder:text-text-ter" />
  <button aria-label="전송" disabled={streaming || !input.trim()}
    className={`w-11 h-11 shrink-0 inline-flex items-center justify-center rounded-full transition-colors duration-base
                active:scale-[0.97] motion-reduce:active:scale-100
                ${input.trim() && !streaming ? 'bg-primary text-text-inverse hover:bg-primary-hover' : 'bg-primary-soft text-primary cursor-not-allowed'}`}>
    <ArrowUp size={20} />
  </button>
</div>
```

## 9. 사용자 말풍선

```jsx
<div className="flex justify-end">
  <p className="max-w-[85%] px-4 py-3 rounded-lg bg-primary-soft text-text-pri font-medium type-body whitespace-pre-wrap">
    {content}
  </p>
</div>
```

## 10. 답변 행 (본문 + 근거)

```jsx
<div className="lg:grid lg:grid-cols-[minmax(0,1fr)_320px] xl:grid-cols-[minmax(0,1fr)_340px] lg:gap-8 lg:items-start animate-flow-down">
  <div className="min-w-0">
    {content === '' ? <AnswerSkeleton /> : <AnswerText text={stripMarkdown(content)} />}
    {cards.map((c) => <InlineCard key={c.id} card={c} />)}
    {showSources && <div className="lg:hidden mt-4 pt-4 border-t border-line-sub"><SourcePanel sources={sources} /></div>}
    {!streamingThis && <ActionBar ... />}
  </div>
  <div className="hidden lg:block min-w-0">{showSources && <SourcePanel sources={sources} />}</div>
</div>
```

근거 열은 근거가 없어도 렌더된다. 폭이 안 바뀌어야 점프가 없다.

## 11. 근거 카드

```jsx
<a href={url} target="_blank" rel="noreferrer"
   className="group block rounded-lg bg-subtle hover:bg-mute transition-colors duration-base p-3">
  <div className="flex items-start gap-3">
    <div className="min-w-0 flex-1">
      <Badge tone={KIND_TONE[kind]}>{kind}</Badge>
      <p className="mt-1.5 type-h3 text-text-pri line-clamp-1">{title}</p>
      <p className="mt-0.5 type-meta text-text-meta">갱신 {formatDate(updatedAt)}
        {isStale(updatedAt) && <span className="ml-2 text-warning-text">오래된 자료일 수 있습니다</span>}
      </p>
    </div>
    <span className="shrink-0 self-center w-7 h-7 inline-flex items-center justify-center rounded-full
                     bg-primary-soft text-primary group-hover:bg-primary group-hover:text-text-inverse transition-colors duration-base">
      <ArrowRight size={16} />
    </span>
  </div>
</a>
```

## 12. 표 (DataTable 내부)

```jsx
<div className="overflow-x-auto rounded-lg shadow-card bg-page">
  <table className="w-full text-left tabular-nums">
    <thead>
      <tr className="bg-subtle">
        <th className="px-4 py-3 type-caption font-semibold text-text-meta">{label}</th>
      </tr>
    </thead>
    <tbody>
      <tr className="border-t border-line-sub hover:bg-mute transition-colors duration-base cursor-pointer">
        <td className="px-4 py-3 type-body-sm text-text-pri">{cell}</td>
      </tr>
    </tbody>
  </table>
</div>
```

768 미만 카드 전환

```jsx
<ul className="md:hidden space-y-3">
  <li className="bg-page rounded-lg shadow-card p-4">
    <p className="type-h3 text-text-pri">{firstColValue}</p>
    <dl className="mt-3 grid grid-cols-[auto_1fr] gap-x-4 gap-y-1.5">
      <dt className="type-caption text-text-meta">{label}</dt><dd className="type-body-sm text-text-sec">{value}</dd>
    </dl>
  </li>
</ul>
```

## 13. 탭

```jsx
<div role="tablist" className="flex gap-1 border-b border-line-sub">
  <button role="tab" aria-selected={active}
    className={`relative h-10 px-3 type-body-sm font-medium transition-colors duration-base
                ${active ? 'text-text-pri' : 'text-text-meta hover:text-text-sec'}`}>
    {label}
    {active && <span className="absolute left-0 right-0 -bottom-px h-0.5 bg-primary" />}
  </button>
</div>
```

## 14. 드로어

```jsx
<div className="fixed inset-0 z-drawer">
  <div className="absolute inset-0 bg-text-pri/40 animate-fade-in" onClick={onClose} />
  <aside role="dialog" aria-modal="true"
    className="absolute right-0 top-0 h-full w-[clamp(360px,40vw,560px)] max-w-full bg-page shadow-float flex flex-col animate-slide-in-right">
    <header className="h-14 px-5 flex items-center justify-between border-b border-line-sub">
      <h2 className="type-h2 text-text-pri">{title}</h2>
      <IconButton aria-label="닫기" onClick={onClose}><X size={20} /></IconButton>
    </header>
    <div className="flex-1 overflow-y-auto p-5">{children}</div>
    {footer && <footer className="p-4 border-t border-line-sub flex justify-end gap-2">{footer}</footer>}
  </aside>
</div>
```

## 15. 모달

```jsx
<div className="fixed inset-0 z-modal flex items-center justify-center p-4">
  <div className="absolute inset-0 bg-text-pri/40 animate-fade-in" onClick={onClose} />
  <div role="dialog" aria-modal="true" className="relative w-full max-w-[560px] bg-page rounded-xl shadow-float animate-pop-in">
    <header className="px-6 pt-6"><h2 className="type-h2 text-text-pri">{title}</h2></header>
    <div className="px-6 py-4">{children}</div>
    <footer className="px-6 pb-6 flex justify-end gap-2">{footer}</footer>
  </div>
</div>
```

## 16. 빈 상태

```jsx
<div className="py-16 flex flex-col items-center text-center">
  <img src="/images/illustrations/empty.svg" alt="" className="w-24 h-24" />
  <p className="mt-4 type-h3 text-text-pri">{title}</p>
  <p className="mt-1 type-body-sm text-text-meta max-w-[320px]">{desc}</p>
  {action && <div className="mt-5">{action}</div>}
</div>
```

## 17. 애니메이션 클래스 (index.css)

```css
@keyframes flowDown { from { opacity: 0; transform: translateY(-6px); } to { opacity: 1; transform: translateY(0); } }
@keyframes fadeIn { from { opacity: 0; } to { opacity: 1; } }
@keyframes slideInRight { from { transform: translateX(100%); } to { transform: translateX(0); } }
@keyframes popIn { from { opacity: 0; transform: scale(0.98); } to { opacity: 1; transform: scale(1); } }
@keyframes pageEnter { from { opacity: 0; transform: translateY(8px); } to { opacity: 1; transform: translateY(0); } }
@keyframes skeleton { 0%, 100% { background-color: theme('colors.line.def'); } 50% { background-color: theme('colors.text.ter'); } }

.animate-flow-down { animation: flowDown 240ms cubic-bezier(0.16,1,0.3,1); }
.animate-flow-down-late { animation: flowDown 240ms cubic-bezier(0.16,1,0.3,1) 80ms backwards; }
.animate-fade-in { animation: fadeIn 200ms cubic-bezier(0.2,0,0,1); }
.animate-slide-in-right { animation: slideInRight 240ms cubic-bezier(0.16,1,0.3,1); }
.animate-pop-in { animation: popIn 240ms cubic-bezier(0.16,1,0.3,1); }
.page-enter { animation: pageEnter 320ms cubic-bezier(0.16,1,0.3,1); }
.skeleton-bar { animation: skeleton 1.4s ease-in-out infinite; }
.skeleton-bar-2 { animation-delay: 0.18s; }
.skeleton-bar-3 { animation-delay: 0.36s; }
```

Tailwind duration 토큰: `duration-fast` 120, `duration-base` 200, `duration-enter` 240, `duration-page` 320 을 tailwind.config.js transitionDuration 에 등록한다.

## 18. 관리자 페이지 골격

```jsx
export default function XxxPage() {
  useTopbar({ title: '상담 로그', actions: <DateRangeTabs /> })   // Topbar 슬롯 등록 훅
  return (
    <div className="page-enter mx-auto w-full max-w-wide px-4 md:px-6 lg:px-8 py-6 lg:py-8 space-y-6">
      ...
    </div>
  )
}
```

## 19. 리로드 중 데이터 유지 (7단계)

기간 탭이나 분석 탭을 바꿀 때 데이터를 null 로 되돌리면 트리가 통째로 언마운트돼 화면 전체가 깜빡인다.
이전 데이터를 그대로 두고 차트와 표 영역만 흐리게 둔다.

```jsx
const [data, setData] = useState(null)
const [busy, setBusy] = useState(true)
useEffect(() => {
  let alive = true
  setBusy(true)                                   // setData(null) 하지 않는다
  get(url).then((d) => { if (!alive) return; setData(d); setBusy(false) })
          .catch(() => { if (alive) setBusy(false) })
  return () => { alive = false }
}, [range, tab])

if (!data) return <Skeleton .../>                 // 첫 진입에만 스켈레톤

<Reloading busy={busy} className="mt-4"><TrendChart ... /></Reloading>
```

`Reloading` 은 `aria-busy` 와 `opacity-40 transition-opacity duration-fast` 만 건다.
페이지 골격, KPI 카드 라벨, 사이드바는 언마운트되지 않는다.

## 20. 데이터에 실린 다국어 값 (7단계)

UI 문자열은 i18n 사전이, 백엔드가 주는 값(기관명, 시설명, 운영시간 낱말)은 `lib/lang.js` 가 맡는다.

```jsx
import { facilityName, hoursText, pickText } from '../../lib/lang.js'
const { t, lang } = useLang()

pickText(settings?.orgName, lang)     // 문자열이면 그대로, 객체면 현재 언어. 없으면 ko
facilityName(facility, lang)          // name_en name_ja name_zh, 없으면 name
hoursText(value, t)                   // 휴관 24시간 입실~퇴실 같은 낱말만 사전 표기로. 시각 범위는 그대로
```

번역하지 않는 원문(주소, 이용 안내, 공지 본문, FAQ 질문과 답변, 부서명)에는 `lang="ko"` 를 박는다.
원문 무결성 규칙(PITFALLS 23)을 지키면서 그 부분만 한국어임을 선언한다(WCAG 3.1.2 Language of Parts).

## 21. 모바일 터치 타깃 (9-2)

플레이북 5.2. 모바일 조작 대상은 44x44 다. 데스크톱 밀도는 그대로 두므로 `md:` 에서 되돌린다.
프리미티브에만 넣는다. 페이지가 개별 높이를 다시 정하지 않는다.

```jsx
// Button SIZE
sm: 'h-8 min-h-11 min-w-11 md:min-h-0 md:min-w-0 px-3 type-caption'
// IconButton SIZE. 그림은 작아도 hit area 는 44
sm: 'w-8 h-8 min-w-11 min-h-11 md:min-w-0 md:min-h-0'
// Tabs / Chip / Pagination 도 같은 규칙
```

세로만 44 로 맞추면 짧은 라벨(적용, 공지, 7일)이 가로 43 으로 남는다. `min-w-11` 을 같이 둔다.
Input 은 래퍼가 44 라도 안쪽 native input 에 `h-full` 이 없으면 위아래 12px 을 눌러도 포커스가 안 간다.
Pagination 은 버튼이 44 가 되면 320 에서 한 줄에 안 들어가므로 `flex-wrap` 이 필요하다.

예외는 둘뿐이다. 문장 안 인라인 링크, 그리고 보이는 라벨이 대신 타깃이 되는 `sr-only` 파일 입력이다.

## 22. 데이터 상태와 재시도 (9-2)

플레이북 3.5. **서버 오류를 빈 결과로 위장하지 않는다.** `catch(() => setRows([]))` 금지.

```jsx
const [rows, setRows] = useState(null)
const [failed, setFailed] = useState(false)
const [reload, setReload] = useState(0)

useEffect(() => {
  let alive = true
  setFailed(false)
  get(url).then((r) => { if (alive) setRows(r) })
          .catch(() => { if (alive) setFailed(true) })
  return () => { alive = false }
}, [deps, reload])

{failed ? (
  <EmptyState tone="error" onRetry={() => { setRows(null); setFailed(false); setReload((n) => n + 1) }} />
) : rows === null ? <Skeleton .../> : rows.length === 0 ? <EmptyState .../> : <List />}
```

`EmptyState tone="error"` 가 `role="alert"` 과 기본 문구와 재시도 버튼을 담당한다. 빈 결과와 같은 표면이라 상태가 바뀌어도 레이아웃이 크게 움직이지 않는다.
`Skeleton` 은 막대가 `aria-hidden` 이고 컨테이너가 `role="status" aria-live="polite"` 로 불러오는 중임을 알린다.

## 절대 금지 패턴

- `text-[15px]` 임의 활자 크기. type-* 만
- `bg-[#...]` `text-[#...]` 임의 색
- `border` 를 카드 경계로. shadow-card 만
- `hover:scale-*` `hover:-translate-y-*`
- `transition-all`. 속성 명시
- `z-[999]`. z 토큰 7단만
- `<select>` `<input type="date">` 노출
- `localStorage`
- 상태 색 매핑을 StatusPill 밖에서 다시 정의
- `success` `warning` `info` 클래스. 9단계에서 토큰째 지웠다. 유채색은 primary 와 danger 둘뿐이다
- 도넛과 랭크에서 1등 밖에 파랑을 쓰는 것. 강조는 하나다
- 기관명 문자열 하드코딩
- `catch(() => setRows([]))`. 오류를 빈 결과로 위장하는 것
- `aria-label="닫기"` 처럼 aria 속성에 문자열 하드코딩. aria 도 번역 대상이다
- 페이지에서 터치 타깃 높이를 다시 정하는 것. 프리미티브가 정한다
