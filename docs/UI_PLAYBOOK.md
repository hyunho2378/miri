# UI_PLAYBOOK.md 미리 UI 시스템 구축과 전수검수 기준

작성일 2026년 10월 2일. 원본: DAH 웹사이트 "UI 디자인 시스템 구축 전수검수 플레이북"(2026-09-12). 원칙과 검수 절차는 원본 승계, 수치와 컴포넌트는 미리(G-Chat 토큰 기반) 값으로 교체.

이 문서는 화면 하나의 스타일 설명서가 아님. 화면을 계속 고쳐도 일부만 옛 굵기, 옛 카드, 옛 보더로 남지 않게 UI 를 하나의 시스템으로 만들고 전 파일 준수 여부를 검증하는 운영 기준.

값의 단일 출처는 `client/src/tokens.js`. 역할과 사용처는 `docs/DESIGN.md`. 이 문서는 구조와 검수. 셋이 다르면 tokens.js 기준으로 나머지를 고침.

---

## 1. 원칙

### 1.1 단일 진실 소스

```text
접근성 기준과 G-Chat 토큰
  → client/src/tokens.js
    → tailwind.config.js 와 index.css (.type-* 클래스, CSS 변수)
      → components/ui (프리미티브)
        → components/miri (도메인 컴포넌트)
          → pages (조합만)
```

| 계층 | 파일 | 책임 |
|------|------|------|
| 토큰 | client/src/tokens.js | 색, 활자, 간격, 반경, 그림자, 모션, z-index |
| 런타임 | client/src/index.css | 활자 클래스, 모션 변수, pressable, 포커스, reduced motion |
| 연결 | client/tailwind.config.js | 토큰을 유틸리티 클래스로 노출 |
| 프리미티브 | client/src/components/ui | Button, Card, Input, Select, Tabs, Toggle 등 |
| 레이아웃 | client/src/components/layout | AdminLayout, PublicLayout, HelperLayout, Sidebar, Topbar |
| 도메인 | client/src/components/miri | GradeChip, DeadlineClock, AssignmentBundle 등 |
| 페이지 | client/src/pages | 데이터 선택과 조합만 |

페이지가 색, 굵기, 표면, 상태 표현을 직접 결정하면 시스템 단절. 규칙 변경 시 페이지 수만큼 수정해야 하는 구조는 실패.

### 1.2 시각 상태와 데이터 상태를 함께 설계

버튼: default, hover, pressed, focus-visible, disabled, busy. 데이터 화면: loading, empty, error, success. 미리 추가 상태: 잠정(확인 대기 판독 포함), 기한 초과 예상, 발령 단계. 상태를 먼저 정의하고 기본 모양을 마지막에 그림.

### 1.3 모바일은 축소된 데스크톱이 아님

- 한 화면 한 계층. 도우미 화면은 한 번에 대상자 카드 하나만 펼침
- 터치 영역 44, 도우미 단계 버튼 56
- hover 없이 선택과 완료를 이해할 수 있어야 함
- 표, 긴 코드, 마을 이름이 페이지 전체를 밀어내지 않음

### 1.4 UI 차이는 콘텐츠 차이에서만

같은 정보 구조는 같은 컴포넌트. 페이지마다 비슷한 클래스 문자열을 복사해 다른 카드를 만드는 행위 금지.

### 1.5 장식 금지

액센트 보더, 그라데이션, 글로우, blur 없음. 공공 서비스의 신뢰는 장식이 아니라 숫자와 근거와 확인 상태에서 나옴.

---

## 2. 미리 디자인 규칙

### 2.1 색과 표면

2026-10-02 10단계 심각도 체계(DESIGN.md 3절). 쨍한 빨강 #E0001B 는 critical 면 전용. 값은 tokens.js.

| 층 | 토큰 | 쓰는 곳 |
|----|------|--------|
| 주색 | primary #2563EB | 주요 행동, 선택, 진행 중, 차트 주 계열 |
| 무채색 | text, line, mute, subtle, canvas | 나머지 전부 |
| 위험 | danger #E0001B (critical 면), danger-text #D10019 | 실패, 미배정, 소방 인계, 부족 발생 / 불가, 무응답 |
| 경고 | warning #EA580C, warning-text #B54708 | 기한 초과 예상, 협약 만료 임박, 신뢰도 하 |
| 완료 | success #16A34A, success-text #047857 | 확인 완료, 수락, 인계 완료, 기한 내 |

표면 위계.

| 표면 | 클래스 | 용도 |
|------|--------|------|
| 캔버스 | bg-canvas | 담당자 면 바탕 |
| 카드 | Card (bg-page + shadow-card) | 모든 흰 표면 |
| 강조 카드 | Card tone="primary" / "danger" | 진행 중 안내, 실패 알림. 배경 톤만 바뀜 |
| 내부 구획 | bg-subtle 또는 bg-mute | 카드 안 보조 영역 |
| 떠 있는 층 | shadow-float | 드로어, 모달, 드롭다운, 토스트 |

#### 액센트 보더 금지 (2026-10-02 사용자 지시)

- 카드, 목록 행, 사이드바 활성 메뉴, 알림의 좌측 또는 상단 컬러 줄 전면 금지
- 현재 항목 표시는 배경 톤(bg-primary-soft) + 글자 굵기(type-strong) + 라벨("현재", "진행 중")로 함
- 허용되는 선: 내부 구분선 line-sub 1px, 포커스 링, 탭 하단 선택 표시, 입력창 포커스 테두리, 판독 근거 영역 표시(문서 이미지 위 하이라이트)

### 2.2 활자와 굵기 위계

Pretendard Variable 단독. 굵기 사다리 네 단 400 / 600 / 700 / 800. 500 금지.

| 클래스 | 크기 | 굵기 | 용도 |
|--------|------|------|------|
| type-display | 30~42 | 800 | 소개 면 헤드라인 |
| type-kpi | 28~40 | 800 | 부족분, 남은 시간 같은 핵심 숫자 |
| type-h1 | 24~32 | 700 | 페이지 단독 제목(로그인, 도우미) |
| type-h2 | 18~22 | 700 | 상단바 페이지 제목, 섹션 제목 |
| type-h3 | 17~19 | 700 | 카드 제목 |
| type-body-strong | 15~17 | 600 | 본문 크기 강조 |
| type-body | 15~17 | 400 | 본문, 도우미 화면 |
| type-strong | 13~14 | 600 | 표 셀 강조값, 버튼, 탭, 활성 메뉴 |
| type-body-sm | 13~14 | 400 | 표 셀, 설명 |
| type-caption | 11~12 | 600 | 라벨, 배지, 표 헤더 |
| type-meta | 12 | 400 | 시각, 출처, 보조 설명 |

규칙.
- font-medium, font-semibold, font-bold 직접 사용 금지. 굵기는 위 클래스로만 지정 (예외: Button 프리미티브 내부)
- 인접 짝은 200 이상 차이: 라벨 caption 600 대 값 kpi 800, 카드 제목 h3 700 대 본문 400, 강조 strong 600 대 meta 400
- 한 카드 안 굵기는 최대 세 단계
- 숫자는 전부 tabular-nums

### 2.3 간격

8pt 기반 4 8 12 16 20 24 32 40 48 64 80 96. 터치 44(min-h-11). 페이지 패딩 xs 16, md 24, lg 32. 카드 패딩 Card padding 속성(sm md lg)으로만.

### 2.4 레이아웃과 넘침 방지

브레이크포인트 xs 320 / sm 390 / md 768 / lg 1024 / xl 1280 / 2xl 1440 / 3xl 1920 / 4xl 2560 / 5xl 3840.

| 폭 | 값 | 용도 |
|----|-----|------|
| max-w-wide | 1600 | 담당자 면 콘텐츠 |
| max-w-page | 1400 | 소개 면 |
| max-w-text | 720 | 장문 |
| 도우미 면 | 480 | 휴대폰 화면 |

- flex, grid 자식 텍스트에 min-w-0
- 가변 열은 minmax(0, 1fr)
- 표만 자체 가로 스크롤 허용. 페이지 가로 스크롤 0
- 100vh 대신 100dvh

### 2.5 반경과 그림자

반경 6단 xs 6 / sm 10 / md 12 / lg 16 / xl 20 / full. 카드 lg, 입력과 버튼 md, 배지 xs, 칩 full. 그림자 sm(카드) md(카드 hover) lg(떠 있는 층). hover scale 금지.

### 2.6 모션

press 120 / fast 160 / pop 180 / dur 280 / sheet 360. transform 과 opacity 만. 긴급성을 깜빡임이나 흔들림으로 표현하지 않음. reduced motion 시 전 애니메이션 0.01ms.

### 2.7 아이콘

lucide-react 단독, stroke 1.75, 크기 16 20 24 32 48. 아이콘 버튼은 IconButton + aria-label. 등급 아이콘은 GradeChip 한 곳(BedSingle Accessibility HandHelping Footprints).

### 2.8 페이지 골격 (2026-10-02 3차, 모든 담당자 화면 동일)

페이지마다 머리와 버튼 위치가 달라지는 것을 막기 위한 고정 골격. 이 순서 밖의 구조를 만들지 않음.

| 순서 | 영역 | 컴포넌트 | 들어가는 것 |
|------|------|----------|------------|
| 1 | 상단바 | Topbar (PageShell title, actions) | 페이지 제목. 페이지 전체에 걸친 주요 행동 1개까지. 다른 화면으로 가는 링크 버튼은 두지 않음(사이드바와 중복) |
| 2 | 페이지 탭 | Tabs | 같은 화면 안 데이터 전환(차량, 도우미)이 있을 때만 |
| 3 | 본문 | Card, TableCard, MetricCard | 섹션은 카드 단위. 카드 밖 구획 제목이 필요할 때만 SectionTitle |

카드 머리 규칙
- 제목(type-h3) 옆 meta 에 건수나 기준값(332명, 가용 17 / 20대)
- 오른쪽 actions 에 그 카드에만 해당하는 행동(추가, 일괄 확인, 저장)
- 필터는 머리 아래 toolbar 줄. Select 와 MultiSelect 는 compact
- desc 는 제목에 없는 사실이 있을 때만. 제목을 풀어 쓰는 부제와 동작 설명 문장 금지
- 표는 TableCard 로만. DataTable 은 표면이 없고 TableCard 안에서만 렌더(카드 안 카드 금지)

### 2.9 레퍼런스 반영 (make-interfaces-feel-better, emil-design-eng, apple-design, material-3)

| 규칙 | 미리 적용 |
|------|----------|
| 동심 반경: 바깥 반경 = 안쪽 반경 + 여백 | SegmentControl, NumberStepper 바깥 sm(10) + 여백 4 + 안쪽 xs(6) |
| 깊이는 그림자, 구조는 선 | 카드 깊이는 shadow-card, 표 행 구분은 line-sub 1px, 입력창은 ring |
| 누름 피드백 scale 0.96 | .pressable:active 0.96 (0.95 미만 금지, hover 확대 금지 유지) |
| 숫자 tabular-nums | 표, KPI, 시계, 건수 |
| 제목 text-wrap balance, 본문 pretty | index.css 전역 |
| 글꼴 antialiased | html 전역 |
| 빈번한 상호작용에 애니메이션 금지 | 행 hover 와 탭 전환은 색 변화만 |
| 모션만으로 상태 전달 금지 | 상태 변화는 색, 아이콘, 라벨 동반 |
| 터치 영역 44, 데스크톱 최소 40 | min-h-11 md:min-h-0 패턴 유지 |
| 같은 표면 위 아이콘 세트 하나 | lucide 단독 |
| MD3 tonal surface | 강조 카드는 tone(primary, danger, mute) 배경만, 테두리 없음 |

---

## 3. 컴포넌트 계층과 상태 계약

### 3.1 프리미티브 (components/ui)

| 컴포넌트 | 대체 대상 | 계약 |
|----------|----------|------|
| Card | 페이지의 bg-page rounded-lg shadow-card 직접 작성 | title meta desc actions toolbar eyebrow media, padding sm md lg none, tone default primary danger mute |
| TableCard | DataTable 직접 사용, 표 위 건수 줄, 원시 table | title count actions filters + DataTable props, 또는 children(히트맵) |
| FilterBar | 필터 Select 를 그리드로 나열 | toolbar 안. Select, MultiSelect compact |
| SectionTitle | 카드 밖 h2 직접 작성 | title desc actions |
| KeyValue | dl grid-cols-[auto_1fr] 직접 작성 | items [{label, value, strong}] |
| NumberStepper | 페이지 로컬 Stepper | label value onChange min max step unit hint format |
| Disclosure | details 직접 작성 | summary, defaultOpen |
| ChoiceChips | 사유 선택 칩 직접 구현 | options value onChange label, role=radiogroup, 선택은 채움 + 체크 |
| Checkbox | 페이지 input checkbox | 실제 input 유지, 터치 44 |
| Button | 원시 button | variant primary secondary ghost danger, size sm md lg xl(56 도우미), loading |
| IconButton | 아이콘 원시 button | aria-label 필수 |
| Select, MultiSelect | 네이티브 select | listbox, 키보드 |
| SegmentControl | 보기 전환 버튼 묶음 | radiogroup |
| Tabs, Toggle, Modal, Drawer, Toast, Tooltip, EmptyState, Pagination, Badge, Chip, ExportButton | G-Chat 원본 | |

### 3.2 도메인 (components/miri)

GradeChip, ShortageValue, ShortageTable, DeadlineClock, MetricCard, EvidencePanel, ReviewRow, IntakeUploader, AssignmentBundle, BaselineCompare, TransportStatusTable, StepIndicator, AnomalyList, AnomalyBell, DispatchBanner, DispatchStatusPill, MockDataBadge, HelperAssignmentCard, HelperStepBar, FailReportSheet, PageShell.

도메인 컴포넌트도 표면은 Card, 접힘은 Disclosure, 키값은 KeyValue 를 씀. 같은 패턴이 두 페이지 이상이면 도메인 컴포넌트로 승격, 세 곳 이상이면 반드시 승격.

### 3.3 페이지

데이터 선택, 권한, 조합만. 페이지에 원시 button input select textarea, 긴 상태 클래스 문자열, 로컬 Stepper 가 생기면 공용 계층 누락 신호.

### 3.4 상태 계약

| 대상 | 상태 | 표현 |
|------|------|------|
| 버튼 | default hover pressed focus disabled busy | Button 프리미티브가 전부 보유 |
| 선택 | 선택됨 | 채움(primary-soft) + 굵기 600 또는 체크. 색 하나로만 표시 금지 |
| 현재 항목 | 현재 | 배경 톤 + type-strong + 라벨. 액센트 보더 금지 |
| 데이터 | 비어 있음, 오류 | EmptyState. 오류는 role=alert + 재시도 |
| 진행 안내 | 판독 중, 배정 계산 | role=status aria-live=polite |
| 잠정 | 확인 대기 포함 | StatusPill provisional |

상태 색 매핑은 StatusPill 한 파일.

---

## 4. 적용 순서

1. 인벤토리: 라우트, 표면, 버튼, 입력, 접힘, 키값, 굵기, 보더, 하드코딩
2. 의미별 묶기: 행동과 상태 계약이 같은 것끼리
3. 프리미티브 API 에 상태 포함: 색 이름이 아니라 의미(variant tone)
4. 토큰부터 변경 → 프리미티브 → 사용처
5. 종류 단위 전체 이관: Card 전부 → Disclosure 전부 → KeyValue 전부 → 굵기 전부
6. 이전 구현이 검색되지 않을 때 완료

---

## 5. 전수검수

### 5.1 정적 검수 (자동)

```bash
cd client
node scripts/ui-audit.mjs      # 위반 0건이어야 통과
node tests/logic.test.mjs      # 계산 로직
```

ui-audit 규칙.

| 규칙 | 검출 | 예외 |
|------|------|------|
| 액센트 보더 | border-l, border-t-2 이상, w-[3px], ring-2 ring-primary, border-primary | components/ui(포커스 상태), ReviewRow 판독 영역 표시 |
| 굵기 직접 지정 | font-thin ~ font-black | Button 프리미티브 |
| 카드 표면 직접 작성 | bg-page rounded-lg shadow-card | ui, dashboard, MetricCard |
| details 직접 사용 | details 태그 | Disclosure |
| 키값 dl 직접 작성 | grid-cols-[auto_1fr] | KeyValue, DataTable |
| 페이지 원시 컨트롤 | pages 의 button input select textarea | 없음 |
| 페이지 로컬 스테퍼 | pages 의 function Stepper | 없음 |
| hex 직접 입력 | 6자리 hex | tokens.js |
| 금지 속성 | transition-all, hover scale, hover translate, 웹스토리지, date time 입력, 그라데이션, backdrop-blur | 없음 |
| 금지 문자 | 가운데점, 줄표, 이모지 | tokens.js 주석 |
| 니다체 | 니다 | 없음 |

### 5.2 브라우저 측정

경로 13개 × 폭 9개(320 390 768 1024 1280 1440 1920 2560 3840).
- 페이지 가로 스크롤 0
- 화면 밖으로 잘린 요소 0 (표 내부 스크롤 제외)
- 390 폭 주요 조작 대상 44 미만 0 (문장 안 링크 예외)
- 콘솔 오류 0

### 5.3 상호작용

키보드 Tab 순서, 포커스 링, Escape 닫기와 포커스 복귀, Select 방향키. 터치 44, hover 전용 기능 없음.

### 5.4 시연 시나리오

1. 서류 판독: 샘플 판독 → 확인 → 명부 반영
2. 부족분 계산: 추가 협약 차량 → 부족분 0
3. 발령: 개시 → AI 배정 → 전송 → 도우미 수락 → 단계 보고 → 실패 → 재배정 또는 소방 인계 → 종료 → 기록

---

## 6. 미리 전수조사 결과

### 2026-10-02 1차 (전체 구현 직후)

| 항목 | 건수 |
|------|------|
| 액센트 보더 | 3 (사이드바 활성 좌측 바, 도우미 현재 카드 링, 업로더 드래그 테두리) |
| 굵기 직접 지정 | 32 (font-medium 18, font-semibold 23, font-bold 1 중 프리미티브 외) |
| 카드 표면 직접 작성 | 21 |
| details 직접 사용 | 5 |
| 키값 dl 직접 작성 | 6 |
| 페이지 원시 컨트롤 | 2 |
| 페이지 로컬 스테퍼 | 2 (부족분 계산, 설정에 각각 별도 구현) |
| 니다체 | 1 |
| 합계 | 71 |

위계 결함: 상단바 페이지 제목(h2 600)이 카드 제목(h3 700)보다 가벼움. 500 굵기 혼용.

조치: h2 700 으로 상향, display 800, type-strong 과 type-body-strong 신설, 500 폐기. 프리미티브 Card SectionTitle KeyValue NumberStepper Disclosure ChoiceChips Checkbox 신설, Button xl 추가, 사이드바 좌측 바 제거.

### 2026-10-02 2차 (이관 후)

| 항목 | 건수 |
|------|------|
| ui-audit 위반 | 0 (11개 규칙 전부 통과. 카드 표면 규칙은 shadow-card 단독 검출로 강화) |
| 13개 경로 × 9개 폭 가로 스크롤과 화면 밖 잘림 | 0 |
| 콘솔 오류 | 0 |
| 단위 테스트 | 8 통과 |

이관 내용: 카드 표면 21곳 Card 로, 접힘 5곳 Disclosure 로, 키값 6곳 KeyValue 로, 로컬 스테퍼 2개 NumberStepper 로(긴 목록은 layout inline), 사유 칩 ChoiceChips 로, 도우미 단계 버튼 Button xl 로, 체크박스 Checkbox 로. 사이드바 활성 좌측 바, 도우미 현재 카드 링, 업로더 드래그 테두리 제거.

프리미티브 추가 옵션: SectionTitle size lg, eyebrow, descSize, id / KeyValue size lg / Card media / NumberStepper layout inline.

남은 과제: 클릭형 선택 카드 프리미티브(OptionCard) 미작성. 로그인 데모 계정 선택은 Link 로 구현.

### 2026-10-02 3차 크리틱 (레퍼런스 3종 대조, 1440 캡처 12화면)

AI가 만든 화면처럼 보이는 원인

| 원인 | 근거 위치 | 조치 |
|------|----------|------|
| 모든 카드 제목 아래 부제(desc 24곳). 제목을 다시 풀어 쓴 문장 | 현황판 마을별 부족분 "산림 연접 마을 전체", 이상 탐지 임계값 "규칙 기반 탐지 기준" 등 | 정보 없는 desc 삭제. 건수와 기준은 meta 로 |
| 표가 카드 안의 카드. DataTable 이 자체 흰 표면과 그림자를 가지고 Card 안에 다시 들어감 | DataTable.jsx:52, 현황판, 부족분 계산, 발령, 기록 상세 | DataTable 표면 제거, TableCard 로 통일 |
| 화면 안 설명서 | 서류 판독 "판독 원칙" 카드, 발령 단계 카드 위 문장, ShortageTable 머리 문장 | 삭제. 규칙은 동작(신뢰도 표시, 버튼 비활성)으로 보여 줌 |
| 아이콘 타일(연한 색 사각형 안 아이콘) | LoginPage.jsx:37 | 삭제. 텍스트 행 + 화살표 |
| 4칸 KPI + 파란 안내 띠 + 2열 카드의 템플릿 배치 | 현황판 | 파란 띠 삭제, 배정 최적화 결과는 총 부족분 카드 보조 줄로 |
| 같은 행동이 화면마다 다른 이름 | "시나리오 변경"(현황판) 과 "시나리오 바꾸기"(발령) | "시나리오 변경" 하나로 |

화면 사이 불일치

| 항목 | 화면별 현재 | 통일 기준 |
|------|------------|----------|
| 추가 버튼 위치 | 명부, 차량: 표 위 건수 줄 오른쪽. 서류 판독: 구획 제목 오른쪽. 부족분: 카드 머리 | 해당 카드 머리 actions |
| 건수 표기 | 명부 "332명" 맨 글자, 차량 "가용 17대 / 전체 20대" 맨 글자, 서류 판독 제목 안 "7건" | 카드 meta |
| 필터 | 명부만 라벨 달린 Select 5개 그리드, 다른 화면 없음 | TableCard filters + compact |
| 표 | DataTable 9곳, 원시 table 4곳(설정 차종 정원, 부족분 시나리오 비교, 개인정보, 배정 비교) | 전부 TableCard |
| 상단바 버튼 | 현황판만 "부족분 계산" 링크 버튼 | 상단바에는 그 화면의 주요 행동만 |

공통 컴포넌트 신설과 수정: Card(meta, toolbar), TableCard, FilterBar, MultiSelect compact, DataTable 표면 제거와 모바일 행 목록, SegmentControl NumberStepper 동심 반경, pressable 0.96, 오류 경계(ErrorBoundary, 렌더 오류 시 흰 화면 방지).

발견한 기능 결함: 공공데이터 응답이 JSON 이 아니면 현황판 카드가 렌더 오류를 내고 오류 경계가 없어 앱 전체가 흰 화면. useOpenData 응답 형식 검사와 ErrorBoundary 로 수정.

ui-audit 추가 규칙: 원시 표, DataTable 직접 사용, 아이콘 타일, 설명 문장(desc 28자 이상, 본문 문장 44자 이상).

3차 이관 결과
- ui-audit 15개 규칙 위반 0, 단위 테스트 8 통과
- 12개 경로 × 8개 폭(320~3840) 가로 넘침 0, 흰 화면 0, 콘솔 오류 0
- 표 13곳 전부 TableCard. 카드 안 카드 0
- 추가 수정: Select MultiSelect Input compact, EmptyState compact, 본문 없는 Card, 발령 단계 카드 안 중복 상태 표시 삭제, 배정 계산 시간 줄 삭제, 자정 넘긴 완료 시각 익일 표기(fmtHMFrom)

---

## 7. 화면별 체크리스트

모든 화면
- [ ] 페이지는 PageShell(담당자) 또는 레이아웃 컨테이너 정렬선
- [ ] h1 하나, 제목 위계 순서
- [ ] 액센트 보더 없음
- [ ] 굵기는 활자 클래스로만
- [ ] 320 가로 스크롤 없음

버튼과 링크
- [ ] 이동은 Link, 행동은 Button
- [ ] 모바일 44, 도우미 단계 56
- [ ] 아이콘 버튼 aria-label

폼
- [ ] 라벨 항상 표시, placeholder 라벨 대용 금지
- [ ] 저장 불가 조건이면 disabled
- [ ] 오류는 필드와 연결

데이터
- [ ] 비어 있음과 오류 상태
- [ ] 잠정값 표시
- [ ] 긴 코드와 마을 이름 넘침 없음

모달과 드로어
- [ ] 포커스 트랩, Escape, 복귀, 스크롤 잠금

---

## 8. 완료 정의

1. 새 값은 토큰 또는 프리미티브에 들어감
2. 같은 패턴 사용 파일 전수 검색
3. ui-audit 위반 0건
4. 시각 상태와 데이터 상태 확인
5. 9개 폭 가로 스크롤 0
6. 키보드, 터치, reduced motion 확인
7. 시연 시나리오 3개 끝까지 동작
8. 빌드 통과, 배포 URL 육안 확인
9. 바뀐 규칙을 이 문서와 DESIGN.md 에 반영

---

## 9. 참고 기준

- Apple Human Interface Guidelines Layout, Accessibility, Buttons
- Material Design 3 State layers
- WCAG 2.2 (Target Size, Focus Visible, Focus Appearance)

WCAG 2.5.8 AA 최소 타깃은 24px. 미리는 모바일 주요 조작 44, 도우미 단계 버튼 56 을 내부 기준으로 사용.
