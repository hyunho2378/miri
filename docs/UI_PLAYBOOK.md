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

G-Chat 9단계 KRDS 3색 체계 그대로(사용자 결정 2026-10-02). 값은 tokens.js.

| 층 | 토큰 | 쓰는 곳 |
|----|------|--------|
| 주색 | primary #2563EB | 주요 행동, 선택, 진행 중, 차트 주 계열 |
| 무채색 | text, line, mute, subtle, canvas | 나머지 전부 |
| 위험 | danger #E11414 | 부족 발생, 기한 초과, 실패, 미이송, 신뢰도 하 |

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

---

## 3. 컴포넌트 계층과 상태 계약

### 3.1 프리미티브 (components/ui)

| 컴포넌트 | 대체 대상 | 계약 |
|----------|----------|------|
| Card | 페이지의 bg-page rounded-lg shadow-card 직접 작성 | title desc actions eyebrow, padding sm md lg none, tone default primary danger mute |
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
