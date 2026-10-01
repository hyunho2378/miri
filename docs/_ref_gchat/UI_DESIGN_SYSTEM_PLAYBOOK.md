# UI 디자인 시스템 구축·전수검수 플레이북

> 최종 갱신: 2026-09-12  
> 기준 프로젝트: 한림대학교 디지털인문예술전공 웹사이트  
> 적용 범위: 공개 웹, 모바일, 관리자 대시보드, 폼, 목록·상세, 데이터 상태, 다국어

이 문서는 특정 화면의 스타일 설명서가 아니다. 여러 페이지를 계속 수정해도 일부 화면만 옛 색·간격·상태로 남지 않도록, **UI를 하나의 시스템으로 만들고 전체 파일에서 준수 여부를 검증하는 방법**을 정리한 재사용 가능한 운영 기준이다.

현재 프로젝트의 실제 코드와 최근 UI 개선 내역을 전수 조사해 작성했다. 다른 프로젝트에 사용할 때는 1부의 원칙과 4부의 검수 절차를 그대로 사용하고, 2부의 수치와 색상만 해당 브랜드 토큰으로 교체한다.

---

## 1. 가장 중요한 원칙

### 1.1 단일 진실 소스

UI 값은 다음 한 방향으로만 흐른다.

```text
브랜드·접근성 기준
  → 디자인 토큰
    → Tailwind/CSS 매핑
      → 공용 UI 컴포넌트
        → 도메인 컴포넌트
          → 페이지 조립
```

페이지가 색상, 여백, 그림자, 입력 상태를 직접 결정하기 시작하면 시스템이 끊긴다. 테마나 UI 규칙을 바꿀 때 페이지 수만큼 수정해야 한다면 이미 구조가 잘못된 것이다.

이 프로젝트의 기준 파일은 다음과 같다.

| 계층 | 현재 파일 | 책임 |
| --- | --- | --- |
| 의미 토큰 | `client/src/styles/tokens.js` | 색, 글자, 간격, 폭, 반경, 그림자, 모션 |
| 런타임 테마 | `client/src/index.css` | CSS 변수, 기본 상태, 포커스, safe area, reduced motion |
| 프레임워크 연결 | `client/tailwind.config.js` | 토큰을 유틸리티 클래스로 노출 |
| 공용 프리미티브 | `client/src/components/common/` | 버튼, 선택, 체크, 표, 상태 메시지 등 |
| 관리자 프리미티브 | `client/src/components/admin/FormControls.jsx` | 입력, 버튼, 토글, 페이지네이션 |
| 공용 레이아웃 | `client/src/components/layout/` | Container, Header, Footer, PageBanner |
| 페이지 | `client/src/pages/` | 콘텐츠와 조합만 담당 |

### 1.2 시각 상태와 데이터 상태를 모두 설계한다

컴포넌트는 기본 모양 하나로 끝나지 않는다. 버튼이라면 `default`, `hover`, `pressed`, `focus-visible`, `disabled`, `busy`가 있어야 한다. 데이터를 읽는 화면이라면 `loading`, `empty`, `error`, `offline`, `success`가 있어야 한다.

상태를 나중에 덧붙이면 페이지마다 표현이 달라진다. **컴포넌트 API를 만들 때 상태를 먼저 정의하고 기본 상태를 마지막에 그린다.**

### 1.3 모바일은 축소된 데스크톱이 아니다

모바일에서는 단순히 글자와 폭을 줄이지 않는다.

- 한 화면에 한 계층만 보여준다.
- 터치 영역과 실제 아이콘 크기를 분리한다.
- 키보드, 주소창, 노치, 홈 인디케이터를 고려한다.
- hover 없이도 선택·눌림·완료 상태를 이해할 수 있어야 한다.
- 표, 긴 단어, URL, 업로드 파일명이 페이지 전체를 밀어내지 않아야 한다.

### 1.4 UI 차이는 콘텐츠 차이에서만 나온다

공지와 자료실처럼 정보 구조가 같은 화면은 같은 상세 레이아웃과 첨부 행을 사용한다. 공개 화면과 관리자 화면도 브랜드 체계를 공유한다. 페이지별로 비슷한 클래스 문자열을 복사해 다른 UI를 만드는 것을 금지한다.

### 1.5 장식 실패가 기능 실패가 되면 안 된다

WebGL, Canvas, blur, reveal animation 같은 장식이 실패해도 헤더, 본문, 링크, 제출 버튼은 항상 보여야 한다. 핵심 UI는 CSS와 시맨틱 HTML만으로 작동해야 한다.

---

## 2. 현재 프로젝트의 디자인 규칙

이 장은 현재 DAH 사이트의 실측 기준이다. 다른 프로젝트에서는 값만 교체하고 역할과 구조는 유지한다.

## 2.1 색상과 표면

### 역할별 토큰

| 역할 | 현재 값 | 사용 |
| --- | --- | --- |
| `bg.base` | `#100D18` | 페이지 최하층 |
| `bg.elev` | `#171321` | 한 단계 올라온 표면 |
| `bg.panel` | `#211A31` | 카드, 입력, 패널 |
| `text.pri` | `#F7F5FC` | 제목, 핵심 정보 |
| `text.sec` | `#C9C3D5` | 본문, 보조 설명 |
| `text.meta` | `#938BA5` | 날짜, 캡션, 비활성 정보 |
| `purple.primary` | `#815FD7` | 주요 행동, 선택 상태 |
| `purple.mid` | `#A286E9` | 링크, 보조 상호작용 |
| `purple.light` | `#C8B9F2` | 어두운 배경의 제한적 강조 |
| `state.error` | `#FF6369` | 오류만 |
| `state.success` | `#4CC38A` | 성공만 |

원칙:

- 순수 검정과 순수 흰색을 넓은 면에 직접 하드코딩하지 않는다.
- 보라는 브랜드 장식의 기본 배경이 아니라 **행동, 선택, 중요한 고유 정보**에만 사용한다.
- 본문 전체를 보라로 만들지 않는다.
- 오류·성공색은 장식이나 브랜드 카드에 쓰지 않는다.
- 투명도와 색상 조합은 CSS 변수에서 결정한다. JSX에 `#HEX`, `rgb()`, 임의 shadow를 넣지 않는다.

### 밝은 읽기 표면

긴 공지·자료실 본문과 데이터 밀도가 높은 시트만 밝은 읽기 표면을 사용할 수 있다.

| 역할 | 현재 값 |
| --- | --- |
| 배경 | `#F7F5FC` |
| 내부 표면 | `#FFFFFF` |
| 구분 표면 | `#F2F0F6` |
| 본문 | `#211A31` |
| 강한 제목 | `#100D18` |
| 보조 텍스트 | `#625A70` |
| 링크·강조 | `#6844C4` |

밝은 표면에서도 헤더와 푸터는 다크 상태를 유지한다. 연보라는 밝은 배경에서 대비가 부족하므로 링크에 쓰지 않는다.

## 2.2 타이포그래피

폰트는 Pretendard 한 계열로 통일하고 역할은 크기·굵기·자간으로 구분한다.

| 역할 | 모바일 | 데스크톱 | 권장 굵기 |
| --- | ---: | ---: | ---: |
| Display XL | 40 | 64 | 700–900 |
| Display L | 32 | 48 | 700–800 |
| H1 | 26 | 36 | 700 |
| H2 | 20 | 28 | 700 |
| H3 | 17 | 22 | 600–700 |
| Body L | 16 | 17 | 400–600 |
| Body | 15 | 16 | 400–600 |
| Small | 13 | 14 | 400–600 |
| Caption | 12 | 12 | 400–600 |
| Label | 11 | 12 | 600–700 |

데스크톱 크기는 390px부터 1440px 사이에서 `clamp()`로 연속 보간한다. 브레이크포인트마다 글자가 갑자기 커지지 않게 한다.

행간과 자간:

- 제목: `1.25`, 자간 `-0.02em`
- 본문: `1.7`, 자간 `0`
- 목록: `1.6`
- eyebrow/label: 자간 `0.06em`
- 한국어는 `word-break: keep-all`
- 긴 URL과 영단어만 `overflow-wrap: anywhere`

문장 줄바꿈은 데이터에 `<br>`을 저장하지 않는다. 디자인상 반드시 나뉘어야 하는 문구만 화면 컴포넌트에서 특정 브레이크포인트에 줄바꿈을 삽입한다. 나머지는 폭과 타이포 토큰으로 자연스럽게 흐르게 한다.

## 2.3 간격 체계

기본 간격은 4pt 배수다.

```text
4, 8, 12, 16, 20, 24, 32, 40, 48, 56, 64, 80, 96, 128, 144, 160
```

예외:

- 모바일 터치 높이 `44px`는 접근성 목적의 의미 값이다. 현재 코드에서 `h-11`, `w-11`, `min-h-11`로 사용한다.
- 1px 헤어라인은 `border`, `h-px`, `w-px`로 사용한다.
- 아이콘 내부 정렬처럼 시각 보정이 꼭 필요한 2–3px은 컴포넌트 내부에만 허용한다.

금지:

- 페이지에서 `13px`, `27px`, `73px`처럼 새 간격을 즉흥적으로 만들기
- Tailwind 기본 숫자와 프로젝트 픽셀 토큰을 혼용하기
- 같은 의미의 여백에 페이지마다 다른 값 사용하기

현재 섹션 기준:

- 일반 섹션 상하: 모바일 80px → 데스크톱 128px 유동 보간
- PageBanner 다음 첫 콘텐츠: 모바일 40px → 데스크톱 56px
- 페이지 거터: 모바일 16px / 태블릿 24px / 데스크톱 32px

## 2.4 레이아웃, min/max, 브레이크포인트

### 화면 기준

```text
xs 320 / sm 390 / md 768 / lg 1024 / xl 1280
2xl 1440 / 3xl 1920 / 4xl 2560 / 5xl 3840
```

320px은 지원 하한이다. `html { min-width: 320px }`만 넣고 끝내지 말고 실제 320px에서 가로 넘침을 측정한다.

### 콘텐츠 폭

| 이름 | 최대폭 | 용도 |
| --- | ---: | --- |
| `page` | 1280px | 일반 목록, 그리드, 관리자 화면 |
| `lead` | 960px | 넓은 설명과 도입부 |
| `reading` | 760px | 장문 읽기 |
| `prose` | 720px | 본문 문단 |
| `wide` | 1440px | 예외적인 대형 시각 자료만 |

페이지 루트는 반드시 `Container`를 사용한다. 페이지마다 `max-w-[1180px]` 같은 별도 기준을 만들지 않는다.

### 넘침 방지 계약

- flex/grid 자식 중 텍스트를 가진 항목에는 `min-w-0`을 준다.
- grid 가변열은 `minmax(0, 1fr)`를 사용한다.
- 이미지·영상·iframe은 `max-w-full`과 고정 aspect ratio를 가진다.
- 표와 코드 블록만 자체 `overflow-x-auto`를 허용한다.
- 페이지 전체의 가로 스크롤은 0이어야 한다.
- 파일명과 URL은 말줄임 또는 안전한 줄바꿈을 사용한다.
- `100vh` 대신 용도에 따라 `100svh` 또는 `100dvh`를 사용한다.

`svh`는 첫 화면 히어로처럼 안정적인 최소 뷰포트가 필요한 곳, `dvh`는 주소창·키보드 변화에 따라 실제 높이를 따라야 하는 전체 화면 시트에 사용한다.

## 2.5 반경, 보더, 그림자

- 기본 반경은 4px 하나로 통일한다.
- 완전한 pill 형태만 `rounded-full`을 허용한다.
- 카드 위계는 큰 그림자보다 표면 밝기와 1px 헤어라인으로 만든다.
- 퍼플 글로우는 주요 CTA와 일부 핵심 카드 hover에만 제한한다.
- 기본 카드가 계속 발광하지 않게 한다.
- hover에서 `scale()`로 확대하지 않는다. 주변 레이아웃이 흔들리고 AI 템플릿처럼 보이기 쉽다.
- blur는 핵심 가독성을 해치지 않는 제한된 글래스 표면에만 쓴다.
- 헤더 같은 핵심 내비게이션은 WebGL 효과에 의존하지 않는다.

## 2.6 모션

| 토큰 | 값 | 용도 |
| --- | --- | --- |
| fast | 150ms | 색, 보더, 작은 상태 변화 |
| base | 250ms | 메뉴, 패널, underline |
| slow | 400ms | 큰 표면 변화 |
| reveal | 600ms | 스크롤 등장 |
| easing | `cubic-bezier(0.22, 1, 0.36, 1)` | 공통 감속 |

원칙:

- 모션은 상태 변화를 설명해야 한다.
- 스크롤 reveal은 최대 24px 이동으로 제한한다.
- 리스트 stagger는 80ms이며 많은 항목에 무한 적용하지 않는다.
- `prefers-reduced-motion: reduce`에서는 animation, transition, smooth scroll을 제거한다.
- reveal 관찰이 실패해도 콘텐츠는 일정 시간 뒤 반드시 표시된다.
- 페이지 전환은 opacity만 사용하고 위치 이동을 넣지 않는다.

## 2.7 아이콘과 그래픽

아이콘은 두 종류로 구분한다.

1. **기능 아이콘**: 편집, 삭제, 다운로드, 이전, 검색처럼 이미 학습된 행동. 한 라이브러리의 일관된 stroke 규칙을 사용한다.
2. **개념·브랜드 아이콘**: 비전, 정체성, 전공의 의미를 설명하는 그래픽. 범용 AI 생성 아이콘이나 의미가 모호한 라이브러리 아이콘을 쓰지 않고 직접 SVG로 설계한다.

공통 규칙:

- 기능 아이콘은 대체로 16/20/24px 스케일을 사용한다.
- 아이콘만 있는 버튼은 실제 그림이 작아도 hit area는 모바일 44×44px이다.
- 의미 있는 아이콘 버튼에는 `aria-label`이 필요하다.
- 장식 SVG는 `aria-hidden="true"`로 둔다.
- stroke 굵기, viewBox, 시각 중심을 맞춘다.
- 한 화면에서 서로 다른 아이콘 라이브러리의 선 굵기를 섞지 않는다.

## 2.8 테마와 이스터에그

테마는 페이지 선택자나 컴포넌트별 예외 CSS로 바꾸지 않는다. `html[data-*]`에서 동일한 CSS 변수 값만 교체한다.

따라서 새 컴포넌트가 `bg-bg-panel`, `text-text-sec`, `border-border-subtle` 같은 의미 토큰을 사용하면 모든 테마를 자동으로 상속한다. 하드코딩한 색, SVG fill, Canvas 색상은 테마 전환에서 반드시 누락되므로 금지한다.

---

## 3. 컴포넌트 구조와 상태 계약

## 3.1 컴포넌트 계층

### Primitive

내용과 도메인을 모르는 가장 작은 UI다.

- Button
- Input / TextArea
- Select / DatePicker
- Checkbox / RadioCards / SegmentControl / Toggle
- Tag / Divider / GlassCard
- StateMessage / Toast
- Table / Pagination

### Composite

프리미티브 여러 개를 조합하지만 특정 페이지 데이터에는 묶이지 않는다.

- SearchBar
- BoardList
- ColumnFilter
- RichEditor / RichBody
- LoginModal
- EditControls

### Layout

- Container
- Header
- Footer
- PageBanner
- AdminLayout

### Domain

공지 첨부행, 전시 카드, 교수 카드처럼 특정 데이터 구조를 안다. 동일 패턴이 두 페이지 이상 나타나면 `components/content`, `components/board`, `components/forms` 같은 적절한 폴더로 승격한다.

### Page

라우팅, 데이터 호출, 권한, 컴포넌트 조합만 담당한다. 페이지 파일에 긴 버튼·입력 class 문자열이 생기면 공용 계층이 빠졌다는 신호다.

## 3.2 버튼 상태

| 상태 | 시각 | 동작·시맨틱 |
| --- | --- | --- |
| default | 위계별 표면·보더·텍스트 | 주요 행동은 한 화면에 제한적으로 |
| hover | 한 단계 밝은 표면 또는 보더 | hover만으로 정보를 숨기지 않음 |
| pressed | 명도·채도 한 단계 하향 | `active:` 제공 |
| focus-visible | 2px ring + 2px offset | 키보드에서 항상 보임 |
| disabled | 비활성 텍스트·표면, 40% 수준 | native `disabled`, 클릭 불가 |
| busy | 라벨을 처리 중으로 변경 | `aria-busy`, 중복 제출 차단 |

Primary, Secondary, Ghost 세 위계만 사용한다. 삭제는 무조건 빨간 배경으로 만들지 말고, 위험 동작임을 문구·확인 과정·상태 색으로 표현한다.

링크와 버튼을 구분한다.

- 다른 위치로 이동: `<a>` 또는 router Link
- 현재 화면의 상태 변경·제출: `<button>`
- disabled가 필요한 이동처럼 보이는 UI는 버튼으로 다시 검토한다.

## 3.3 입력 상태

| 상태 | 요구사항 |
| --- | --- |
| default | 라벨과 입력 목적이 보임 |
| hover | 보더가 한 단계 선명해짐 |
| focused | 포커스 링과 보더, 라벨 유지 |
| filled | 값이 있어도 라벨이 사라지지 않음 |
| readonly | 읽기 가능, 편집 불가, disabled와 구분 |
| disabled | 제출·포커스 불가, 이유가 명확해야 함 |
| invalid | 오류 보더 + 구체적 오류 문구 |
| busy | 업로드·검증 진행 중 중복 행동 차단 |

오류 연결:

```jsx
<input
  aria-invalid={Boolean(error)}
  aria-describedby={error ? `${id}-error` : hint ? `${id}-hint` : undefined}
/>
{error && <p id={`${id}-error`} role="alert">{error}</p>}
```

placeholder는 라벨을 대체하지 않는다. 모바일 폼 입력 글자는 최소 16px로 유지해 iOS Safari의 자동 확대를 방지한다.

## 3.4 선택 컴포넌트

- Select: `role="listbox"`, option에 `aria-selected`
- Toggle: `role="switch"`, `aria-checked`
- 선택 버튼: `aria-pressed`
- Radio: 실제 radio input을 시각적으로 숨겨 native 키보드 동작 유지
- Checkbox: 실제 checkbox input 유지
- Tab: 탭 UI를 쓴다면 `tablist`, `tab`, `tabpanel` 관계를 구현

선택 상태는 보라색 하나만으로 표시하지 않는다. 채움, 보더, 체크 표시, 굵기 중 하나 이상을 함께 쓴다.

## 3.5 비동기 데이터 상태

목록과 상세는 다음 상태를 빠짐없이 정의한다.

```text
idle → loading → success
                ├─ data 있음
                └─ empty
        ├─ error → retry
        └─ offline → fallback 또는 안내
```

규칙:

- 상태가 바뀌어도 같은 콘텐츠 영역 안에서 교체한다.
- loading과 empty의 최소 높이를 같게 해 레이아웃 이동을 줄인다.
- error는 `role="alert"`와 재시도 수단을 제공한다.
- loading/offline/success 안내는 `role="status"`, `aria-live="polite"`를 사용한다.
- 서버 오류를 빈 결과로 위장하지 않는다.
- 오프라인 정적 폴백을 썼다면 사용자에게 동기화 대기 상태를 알린다.
- 저장 성공 메시지는 문서 흐름을 밀지 않는 Toast를 사용한다.

## 3.6 모달, 메뉴, 포털

모달·전체 메뉴:

- `role="dialog"`, `aria-modal="true"`, 접근 가능한 제목을 연결한다.
- 열릴 때 첫 의미 있는 요소로 포커스를 이동한다.
- Tab과 Shift+Tab을 내부에서 순환시킨다.
- Escape로 닫는다.
- 닫을 때 원래 트리거로 포커스를 돌린다.
- 열려 있는 동안 body 스크롤을 잠근다.
- 작은 화면에서는 `max-height: calc(100dvh - 여백)`과 내부 스크롤을 사용한다.
- 하단 safe area를 침범하지 않는다.

드롭다운:

- 부모 overflow에 잘리지 않도록 body portal을 사용할 수 있다.
- 열릴 때 위치를 측정하고 scroll/resize 시 재계산한다.
- 뷰포트 좌우 8px 이상 여백 안으로 clamp한다.
- 바깥 클릭, Escape, Tab 종료를 처리한다.
- 열고 닫아도 원래 표·폼 레이아웃은 움직이지 않는다.

## 3.7 헤더와 모바일 내비게이션

데스크톱 헤더와 모바일 메뉴는 같은 정보를 다른 밀도로 보여준다.

모바일 현재 규칙:

- 헤더 바에는 로고와 메뉴 트리거만 둔다.
- 접수, 언어, 로그인·관리자 같은 유틸은 열린 메뉴 안으로 이동한다.
- 모든 하위 메뉴를 한 화면에 아코디언으로 쌓지 않는다.
- 루트 메뉴 → 하위 메뉴의 한 단계 드릴다운으로 컨텍스트를 유지한다.
- 하위 화면에는 명확한 뒤로 가기를 제공한다.
- 닫기 아이콘은 범용 햄버거 패키지 대신 사이트에 맞춘 두 선 glyph를 사용한다.
- 모바일에서 데스크톱 폭으로 리사이즈되면 메뉴와 body lock을 정리한다.
- 현재 비공개인 콘텐츠는 메뉴에서도 제거하고 직접 URL도 VisibilityGate로 막는다.

## 3.8 관리자 화면

관리자라고 디자인 시스템을 포기하지 않는다.

- 공개 화면과 동일한 토큰, 포커스, 버튼, 입력을 사용한다.
- 관리자 전용 프리미티브는 `FormControls`에서 제공한다.
- 저장 버튼은 필수값이 충족되지 않으면 disabled다.
- 서버 처리 중 `aria-busy`와 중복 실행 방지를 함께 적용한다.
- 긴 사이드바는 독립 스크롤 영역이며 `.dah-scrollbar`를 사용한다.
- 사이드바는 라우트 이동 때 재마운트되지 않아 스크롤 위치를 유지해야 한다.
- 표 필터·토스트·드롭다운은 표 크기를 바꾸지 않는다.
- 터치 기기에서 HTML draggable에 의존하지 않고 추가·이동 버튼을 제공한다.
- 공개 페이지의 콘텐츠에는 권한이 있을 때 직접 편집 버튼이 보여야 한다.

## 3.9 다국어와 콘텐츠

- 국문과 영문은 같은 컴포넌트 구조를 사용한다.
- 언어 전환 때문에 카드 폭, 헤더 순서, 정보 위계가 바뀌지 않는다.
- 영문 데이터가 없으면 국문을 임의 기계 번역하지 않는다. 한국어 전용임을 명시하거나 정책에 맞게 폴백한다.
- 페이지 라벨뿐 아니라 empty/error/button/aria-label도 번역 대상이다.
- DB 콘텐츠는 `title/title_en`, `body/body_en`처럼 명시적 필드 계약을 따른다.
- 언어 전환은 같은 의미의 경로로 이동하며 페이지 등장 애니메이션을 다시 실행하지 않는다.

---

## 4. 새 프로젝트에 디자인 시스템을 적용하는 순서

## 4.1 1단계: 화면보다 먼저 인벤토리 작성

다음을 전부 찾는다.

1. 라우트와 페이지
2. 헤더·푸터·공통 배너
3. 버튼·링크·입력·선택·토글
4. 카드·목록·표·상세 본문
5. 모달·드롭다운·토스트
6. loading/empty/error/offline/success
7. 관리자 전용 UI
8. 모바일 전용 분기
9. 하드코딩 색·간격·shadow·font
10. 페이지 로컬에 복제된 class 문자열

먼저 수정하면 비슷한 컴포넌트를 놓친다. 인벤토리 뒤에 구조화한다.

## 4.2 2단계: 반복 요소를 의미별로 묶기

겉모양이 같다고 하나로 묶는 것이 아니라 **행동과 상태 계약이 같은 것**을 묶는다.

좋은 통합:

- 공지 첨부 버튼 + 자료실 첨부 버튼 → AttachmentActions
- 관리자 페이지마다 복제된 아이콘 버튼 → IconButton
- 관리자 패널 class → AdminPanel
- 목록과 상세의 비동기 안내 → StateMessage
- 공개 폼과 상담 폼 입력 → 동일 Field/Input 계약

나쁜 통합:

- 클릭 카드와 단순 정보 카드를 props 수십 개로 억지 통합
- 외부 링크와 제출 버튼을 같은 태그로 렌더
- 서로 다른 데이터 구조를 `type` 분기 하나로 거대한 컴포넌트에 몰기

승격 기준:

- 동일 class/행동이 2곳: 공용 후보
- 3곳 이상: 특별한 이유가 없으면 공용화
- 접근성 로직이 있는 UI: 한 곳뿐이어도 공용화 우선
- 페이지에서 80자 이상의 상태 class 문자열 반복: 구조 점검

## 4.3 3단계: 컴포넌트 API에 상태를 넣기

```jsx
<Button
  variant="primary"
  size="regular"
  disabled={!valid}
  busy={saving}
>
  저장
</Button>
```

API는 색 이름이 아니라 의미를 받는다.

- `purpleButton` 금지 → `variant="primary"`
- `grayText` 금지 → `tone="secondary"`
- `isRed` 금지 → `state="error"`
- `width="760px"` 금지 → `measure="reading"`

## 4.4 4단계: 중앙 토큰부터 변경

디자인 변경 순서:

1. 토큰 값 수정
2. Tailwind/CSS 연결 확인
3. 공용 컴포넌트 시각 확인
4. 모든 사용처 회귀 확인
5. 남은 하드코딩 검색

페이지를 먼저 고치고 나중에 토큰을 맞추면 중복 예외가 남는다.

## 4.5 5단계: 한 종류씩 전체 이관

예:

```text
Button 전체 검색 → 공용 Button으로 이관 → 상태 검수
Input 전체 검색 → 공용 Field/Input으로 이관 → 오류 연결 검수
Select 전체 검색 → 공용 Select로 이관 → 키보드 검수
Loading 전체 검색 → StateMessage로 이관 → 레이아웃 검수
```

페이지 단위로 조금씩 고치기보다 컴포넌트 종류 단위로 전 파일을 이관해야 누락이 줄어든다.

## 4.6 6단계: 중복 삭제 후 재검색

공용화를 끝낸 뒤 기존 class 상수와 CSS 선택자를 삭제한다. 사용처가 0인 토큰, 컴포넌트, 스타일도 제거한다.

완료 조건은 “새 컴포넌트를 만들었다”가 아니라 “이전 구현이 더 이상 검색되지 않는다”이다.

---

## 5. 전수검수 방법

## 5.1 정적 코드 검수

저장소 루트에서 실행한다.

### 파일과 라우트 인벤토리

```bash
rg --files client/src/pages -g '*.jsx'
rg --files client/src/components -g '*.jsx'
rg -n "path:|<Route" client/src
```

### 하드코딩 색과 효과

```bash
rg -n "#[0-9a-fA-F]{3,8}|rgba?\(|hsla?\(" client/src \
  -g '*.jsx' -g '*.js' -g '*.css'

rg -n "shadow-\[|drop-shadow\(|blur-\[|backdrop-blur-\[" client/src \
  -g '*.jsx' -g '*.css'
```

허용 위치는 토큰 파일, 런타임 CSS 변수, 브랜드 데이터처럼 이유가 명확한 곳뿐이다.

### native 컨트롤과 페이지 우회

```bash
rg -n "<(button|input|textarea|select)\b" \
  client/src/pages client/src/components -g '*.jsx'

rg -n "const (ICON_BTN|PANEL|PILL|PILL_BTN|BTN|INPUT|BUTTON_BASE|ATTACH_LINK|FIELD)\s*=" \
  client/src -g '*.jsx'
```

native 요소 자체가 나쁜 것은 아니다. 실제 input을 숨겨 시맨틱을 보존하는 Checkbox/Radio는 올바르다. 문제는 페이지가 공용 상태 계약을 우회하는 경우다.

### 임의 min/max와 arbitrary value

```bash
rg -n "(w|min-w|max-w|h|min-h|max-h|gap|p[trblxy]?|m[trblxy]?)-\[[^]]+\]" \
  client/src -g '*.jsx'
```

각 결과는 다음 중 하나여야 한다.

- 계산식: `100dvh`, safe area, header 높이
- 콘텐츠 고유 aspect ratio
- 포털 위치 clamp
- 디자인 토큰으로 표현할 수 없는 근거 있는 값

근거 없는 값이면 토큰으로 올린다.

### 상태와 접근성

```bash
rg -n "disabled=|aria-busy|aria-invalid|aria-live|role=\"alert\"" client/src
rg -n "focus-visible:|hover:|active:" client/src -g '*.jsx'
rg -n "prefers-reduced-motion|safe-area|100dvh|100svh" client/src
```

검색 결과가 많다는 사실만으로 통과하지 않는다. 각 인터랙티브 요소가 자신의 모든 상태를 실제로 갖는지 확인한다.

### 상세 데이터 상태

```bash
rg -n "loading|empty|error|offline|success|StateMessage" \
  client/src/pages -g '*.jsx'
```

raw `<p>불러오는 중</p>`가 남아 있으면 StateMessage 또는 해당 도메인의 공통 상태 표면으로 통합할 후보이다.

## 5.2 브라우저 자동 측정

각 공개 라우트와 관리자 핵심 라우트를 다음 폭에서 확인한다.

```text
320, 390, 768, 1024, 1280, 1440, 1920, 2560, 3840
```

최소 검사항목:

```js
const root = document.documentElement
const horizontalOverflow = root.scrollWidth > root.clientWidth

const smallTargets = [...document.querySelectorAll(
  'button, a[href], input, select, textarea, [role="button"], [role="switch"]'
)].filter((el) => {
  const r = el.getBoundingClientRect()
  if (!r.width || !r.height) return false
  return r.width < 44 || r.height < 44
})
```

주의:

- 문장 안의 인라인 링크는 44px 예외가 가능하다.
- 데스크톱의 조밀한 표 도구는 24px 이상과 충분한 간격으로 별도 판정할 수 있다.
- 요소가 `display:none`인 상태는 검사에서 제외한다.
- 스크롤 가능한 표 내부의 overflow는 허용하지만 페이지 루트 overflow는 실패다.

## 5.3 상호작용 검수

각 컴포넌트에서 마우스만 확인하지 않는다.

### 키보드

- Tab 순서가 시각 순서와 일치하는가
- 포커스 링이 보이는가
- Enter/Space로 실행되는가
- Select에서 방향키/Home/End가 작동하는가
- Escape로 메뉴·모달이 닫히는가
- 닫은 뒤 트리거로 포커스가 돌아오는가
- sticky header나 toast가 포커스를 가리지 않는가

### 터치

- 44×44px 영역을 확보했는가
- 인접 대상 사이를 잘못 누르기 어렵게 했는가
- hover에만 있는 기능이 없는가
- 스와이프·드래그 외 대체 버튼이 있는가
- iOS 입력 포커스 시 화면이 확대되지 않는가
- 가로·세로 회전에서 safe area를 지키는가

### 포인터

- 클릭 가능한 카드만 hover 반응이 있는가
- 눌림 상태가 즉시 보이는가
- 투명 레이어가 클릭을 가로채지 않는가
- 드롭다운이 스크롤·리사이즈 후에도 트리거에 붙어 있는가

## 5.4 데이터·네트워크 검수

정상 데이터만 보고 끝내지 않는다.

1. 느린 네트워크로 loading 확인
2. 0건 응답으로 empty 확인
3. 4xx/5xx로 error와 재시도 확인
4. API 중단으로 offline/fallback 확인
5. 저장을 빠르게 두 번 눌러 중복 차단 확인
6. 업로드 중 저장 차단 확인
7. 긴 제목·긴 이메일·긴 파일명 확인
8. 한글만, 영문만, 영문 누락 데이터 확인
9. 권한 없음·세션 만료 확인

## 5.5 시각 회귀 검수

다음 화면은 기준 캡처를 유지한다.

- 홈 상단과 섹션 연결
- PageBanner가 있는 일반 페이지
- 공지·자료실 밝은 상세 본문
- 카드 그리드
- 긴 표와 필터 패널
- 공개 폼과 오류 상태
- 로그인 모달
- 관리자 대시보드와 사이드바
- 모바일 루트 메뉴와 하위 메뉴
- 1920px 대표 화면

각 캡처에서 정렬선, 헤더 높이, 컨테이너 좌우선, 본문 폭, 푸터 하단 여백, focus/selected/disabled 상태를 비교한다.

## 5.6 빌드와 정적 품질

```bash
cd client
npm run lint
npm run build
git diff --check
```

빌드 과정이 sitemap 같은 생성 파일을 변경하면 의도한 데이터 갱신인지 확인한다. API가 잠든 상태에서 상세 URL이 빠진 생성물을 그대로 커밋하지 않는다.

---

## 6. 현재 DAH 프로젝트 전수조사 결과

2026-09-12 기준 정적 조사 결과:

| 항목 | 결과 |
| --- | ---: |
| JSX 전체 | 114개 |
| 페이지 JSX | 56개 |
| 컴포넌트 JSX | 53개 |
| Page에서 Container 사용 | 31개 파일 |
| Page에서 PageBanner 사용 | 26개 파일 |
| `focus-visible` 선언 | 203건 |
| hover 선언 | 248건 |
| pressed/active 선언 | 29건 |
| `disabled` 사용 | 65건 |
| `aria-invalid` 사용 | 13건 |
| `aria-live` 사용 | 15건 |
| `role="alert"` 사용 | 10건 |

수량은 품질을 보장하는 점수가 아니라 누락을 찾기 위한 기준선이다.

### 확인된 강점

- 색·표면·타이포·간격·모션이 `tokens.js`를 중심으로 연결돼 있다.
- 기본 테마와 이스터에그가 같은 컴포넌트 토큰을 공유한다.
- 4pt 간격 체계에서 벗어나 Tailwind 기본값에 우연히 의존하던 수치 유틸리티를 제거했다.
- Container, PageBanner, Header, Footer가 공개 화면의 큰 정렬선을 통일한다.
- Select, DatePicker, Checkbox, RadioCards, SegmentControl이 공용화돼 있다.
- 전역 focus-visible, disabled, readonly, invalid, busy 기본 규칙이 있다.
- 모바일 입력 16px, safe area, reduced motion이 전역 처리된다.
- 모바일 메뉴는 드릴다운, 포커스 트랩, Escape, body lock, 리사이즈 정리를 지원한다.
- 320px과 390px의 21개 공개 경로에서 페이지 가로 overflow 0을 확인했다.
- 390px의 노출된 주요 조작 대상에서 44px 미만 항목 0을 확인했다.
- 1920px 소개 화면의 정렬과 의도한 문장 줄바꿈을 확인했다.
- lint 오류 없이 production build가 통과한다.

### 다음 통합에서 우선 처리할 부채

#### P1 — 중복 컴포넌트

1. `NewsDetail`과 `ResourceDetail`의 `ATTACH_LINK`와 첨부 행을 하나의 `AttachmentRow`로 승격한다.
2. 여러 관리자 파일의 `ICON_BTN`을 `IconButton`으로 통합한다.
3. 여러 관리자 파일의 `PANEL`을 `AdminPanel`로 통합한다.
4. `InlineEditBar`와 `EditControls`의 `PILL`을 하나의 편집 액션 프리미티브로 합친다.
5. `EntriesSheet`와 `FormResponsesSheet`의 `BTN`, CELL, 시트 헤더 구조를 공용 시트 프리미티브로 분리한다.

#### P1 — 데이터 상태

다음 상세 화면은 아직 raw loading 문구를 사용하므로 `StateMessage` 또는 `DetailState`로 통합한다.

- ShowcaseDetail
- ContestDetail
- ExhibitionDetail
- LectureDetail
- ClubDetail
- NewsDetail
- ResourceDetail
- People 일부 빈 상태
- Achievements 일부 빈 상태

#### P2 — 폼 프리미티브 우회

`Consult`, `ShowcaseSubmit`, 일부 접수·편집 화면에는 페이지 로컬 `inputCls` 또는 직접 input이 남아 있다. 실제 native input을 유지하되, 시각·오류·busy 계약은 공용 `Field/Input/TextArea/FileInput/SubmitButton`으로 이관한다.

#### P2 — Button API

공개용 `common/Button.jsx`는 현재 링크 중심이다. 다음 개편에서 action button과 link button을 같은 시각 API 아래 분리하고 `disabled`, `busy`, `size`, `iconOnly` 계약을 명시한다. HTML 태그 선택은 역할에 맞게 유지한다.

#### P2 — PageBanner 예외 기록

PageBanner가 없는 라우트가 의도적인 전용 레이아웃인지, 단순 누락인지 route matrix에서 명시한다. 공모전·특강처럼 사용자 요구로 공통 배너를 제외한 경우에는 “예외”를 문서화해 다음 자동 통합에서 되살아나지 않게 한다.

#### P3 — 오래된 문서 정리

기존 `docs/client/DESIGN.md`, `COMPONENTS.md`에는 과거 모노크롬 색상, 이전 폰트, 이전 모바일 메뉴 설명이 일부 남아 있다. 구현 기준은 이 문서와 실제 `tokens.js`로 삼고, 오래된 문서는 역사 자료로 표시하거나 제거한다.

---

## 7. 화면별 완료 체크리스트

### 모든 화면

- [ ] 페이지 루트가 Container 정렬선을 따른다.
- [ ] h1은 하나이며 제목 위계가 순서대로다.
- [ ] 임의 HEX, rgb, shadow, font, spacing이 없다.
- [ ] 320px에서 페이지 가로 스크롤이 없다.
- [ ] 200% 확대에서 내용과 기능이 사라지지 않는다.
- [ ] KR/EN 전환 시 구조가 유지된다.
- [ ] Header와 Footer 사이에 불필요한 빈 화면이 없다.
- [ ] 관리자 권한이 있으면 필요한 직접 편집 동작이 보인다.

### 버튼과 링크

- [ ] default/hover/pressed/focus/disabled/busy 상태가 있다.
- [ ] 모바일 hit area가 44×44px 이상이다.
- [ ] 행동이면 button, 이동이면 link다.
- [ ] 아이콘 버튼에 aria-label이 있다.
- [ ] 외부 링크는 새 창 여부와 보안 속성을 확인했다.

### 폼

- [ ] 제출 가능 조건을 코드로 정의했다.
- [ ] 빈 필수값일 때 제출 버튼이 disabled다.
- [ ] 오류가 해당 필드와 연결된다.
- [ ] 입력 라벨이 항상 보인다.
- [ ] readonly와 disabled가 구분된다.
- [ ] 서버 제출 중 중복 실행이 차단된다.
- [ ] 모바일 입력 글자가 16px 이상이다.
- [ ] 긴 오류 문구와 키보드가 열린 상태에서도 버튼에 접근 가능하다.

### 목록과 상세

- [ ] loading/empty/error/offline/success가 모두 정의됐다.
- [ ] 오류에는 재시도가 있다.
- [ ] 상태 전환 때 레이아웃이 크게 움직이지 않는다.
- [ ] 긴 제목·메타·파일명이 넘치지 않는다.
- [ ] 미리보기와 다운로드가 실제로 다른 동작을 한다.
- [ ] 브라우저에서 볼 수 없는 형식은 미리보기 불가를 명확히 표시한다.

### 모달과 메뉴

- [ ] 포커스가 내부에 갇히고 닫은 뒤 복귀한다.
- [ ] Escape와 명시적 닫기 버튼이 작동한다.
- [ ] 배경 스크롤이 잠기고 닫을 때 복원된다.
- [ ] safe area와 `100dvh`를 고려했다.
- [ ] 모바일에서 한 번에 한 정보 계층만 보인다.
- [ ] reduced motion에서 즉시 전환된다.

### 관리자

- [ ] 모든 콘텐츠 유형이 대시보드에 노출된다.
- [ ] 공개/비공개 상태가 서버 데이터와 일치한다.
- [ ] 추가뿐 아니라 편집·삭제·정렬 권한이 역할별로 맞다.
- [ ] 긴 사이드바가 독립적으로 스크롤된다.
- [ ] 표 필터와 토스트가 레이아웃을 밀지 않는다.
- [ ] 저장 실패·업로드 실패·세션 만료가 빈 화면이 되지 않는다.

---

## 8. Definition of Done

UI 작업은 다음을 모두 만족해야 완료다.

1. 새 값이 토큰 또는 공용 컴포넌트에 들어갔다.
2. 같은 패턴을 사용하는 모든 파일을 검색했다.
3. 이전 class·컴포넌트·CSS 사용처가 0인지 재검색했다.
4. 모든 시각 상태와 데이터 상태를 확인했다.
5. 320/390/768/1024/1440/1920에서 핵심 화면을 확인했다.
6. 모바일 터치, 키보드, 포커스 복귀, reduced motion을 확인했다.
7. loading/empty/error/offline과 긴 데이터로 시험했다.
8. lint, build, `git diff --check`가 통과했다.
9. 생성 파일과 비밀값이 커밋에 섞이지 않았다.
10. 변경된 규칙을 이 문서 또는 해당 컴포넌트 계약에 반영했다.

“한 화면이 예뻐졌다”는 완료 조건이 아니다. **다음에 전체 테마나 상태 규칙을 바꿔도 한 곳에서 안전하게 바뀌는 구조**가 완료 조건이다.

---

## 9. 참고 기준

- Apple Human Interface Guidelines — Layout: https://developer.apple.com/design/human-interface-guidelines/layout
- Apple Human Interface Guidelines — Accessibility: https://developer.apple.com/design/human-interface-guidelines/accessibility
- Apple Human Interface Guidelines — Buttons: https://developer.apple.com/design/human-interface-guidelines/buttons
- Material Design 3 — State layers: https://m3.material.io/foundations/interaction/states/state-layers
- Material Design 3 — Buttons: https://m3.material.io/components/buttons/guidelines
- WCAG 2.2: https://www.w3.org/TR/WCAG22/
- WCAG 2.2 Target Size: https://www.w3.org/WAI/WCAG22/Understanding/target-size-minimum
- WCAG Focus Visible: https://www.w3.org/WAI/WCAG22/Understanding/focus-visible
- WCAG Focus Appearance: https://www.w3.org/WAI/WCAG22/Understanding/focus-appearance.html

웹의 법적·접근성 최소 기준과 제품의 사용성 목표는 다를 수 있다. WCAG 2.5.8의 AA 최소 타깃은 24×24 CSS px이지만, 이 프로젝트는 모바일 주요 조작에 Apple의 44×44pt 권장을 더 엄격한 내부 기준으로 사용한다.
