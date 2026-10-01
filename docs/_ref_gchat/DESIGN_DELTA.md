# DESIGN_DELTA.md 봄내 원칙 이식 (1.5단계)

작성일 2026년 9월 6일. 봄내 헬퍼(Bomnae Helper CHUNCHEON VIVID v4) 시스템에서 검증된 원칙과 UI 프리미티브 패턴을 G-Chat 1단계 기반에 얹는다. 기존 DESIGN.md 는 계속 유효하고 이 문서는 달라지는 것과 새로 들어오는 것만 담는다. 여기 없는 규칙은 DESIGN.md 를 따른다.

봄내는 색과 폰트와 도메인(춘천 관광 셔틀)이 G-Chat 과 다르다. 가져오는 것은 구조와 패턴이지 봄내의 값이 아니다. 아래 유지 절이 그 경계다.

## 유지 (봄내 것을 가져오지 않는다)

- 색 전체. primary #2563EB 와 시스템/차트 색 그대로. 봄내 #0073EC 와 라인색(감자 닭갈비 호수)은 관광 노선 색이라 안 쓴다
- 폰트 Pretendard 단독. 봄내 Kanit/SUIT 는 태국어와 라틴 때문인데 우리는 한 영 일 중이고 Pretendard 가 일본어 중국어 글리프를 커버한다
- 지도(MapLibre), 셔틀 시뮬, 라인맵, 결제, GTS 투어 빌더 등 관광 도메인 컴포넌트 전부 안 가져온다
- 브레이크포인트, 타이포 스케일, IA, 라우트는 G-Chat 것 유지

## 변경 1. 무보더 원칙 강화

봄내 v3.1 무보더 원칙을 정식 채택한다. 우리 DESIGN.md 는 이미 카드에 shadow-card 링을 쓰고 border 를 안 쓰기로 했으나 다음을 명문화한다.

- 카드 좌측 상단 액센트 보더(1~2px 컬러 줄) 전면 금지. 어디에도 없다
- 카드가 흰 배경 위에서 안 떠 보이면 카드 bg 를 바꾸지 말고 섹션 배경을 canvas 나 subtle 로 깔아 대비를 만든다
- 깊이는 shadow 3단(sm/md/lg)으로만. 관리자 카드 기본 sm, hover md, 드로어/모달/시트 lg. 임의 그림자 금지
- 구분선은 리스트 항목 사이 등 내부 구획이 꼭 필요할 때만 line-sub 1px 수평 디바이더

이에 맞춰 tokens.shadow 를 3단으로 재정의한다(변경 3).

## 변경 2. Button variant 를 ring-inset 로

봄내 Button 의 secondary 처리를 가져온다. secondary 를 border 로 만들면 border-box 라도 시각 폭이 primary 와 미세하게 달라 CTA 가 나란히 있을 때 어긋난다. box-shadow inset ring 으로 만들면 콘텐츠 폭을 안 먹어 primary 와 padding height radius font 박스가 완전히 같다.

- primary: bg-primary text-inverse hover:bg-primary-hover
- secondary: bg-page text-primary ring-1 ring-inset ring-line-def hover:bg-mute. (봄내는 ring-primary 지만 우리 관리자 UI 에는 중립 secondary 가 많아 line-def 로. 프라이머리 강조 secondary 가 필요하면 variant `secondary-primary` 로 ring-primary)
- ghost: bg-transparent text-text-sec hover:bg-mute hover:text-text-pri
- danger: bg-danger text-inverse hover:bg-danger-text
- 공통: `pressable` 클래스로 press scale 0.97 (변경 4)

기존 1단계 Button 이 border 로 secondary 를 만들었으면 ring-inset 로 교체한다.

## 변경 3. tokens 스케일 명명 정비

봄내 스케일 명명을 일부 흡수한다. 값은 우리 것을 유지하되 라디우스와 그림자 명명을 맞춘다.

- radius: xs 6 추가(작은 배지/표 내부용). 기존 sm 6 → sm 은 10 으로. 최종 xs 6 / sm 10 / md 12 / lg 16 / xl 20 / full 9999. (봄내와 동일 스케일. 우리 기존 sm6 md10 lg14 xl20 을 이 6단으로 교체. 컴포넌트에서 쓰던 rounded-sm/md/lg 의 실제 값이 바뀌므로 1.5단계에서 ui/ 전수 확인)
- shadow: none / sm `0 2px 10px rgba(20,23,46,0.07)` / md `0 8px 28px rgba(20,23,46,0.12)` / lg `0 16px 48px rgba(20,23,46,0.18)`. 기존 card 는 sm 의 별칭으로 유지(shadow-card = shadow-sm 값), float 는 lg 로 매핑. 컴포넌트가 shadow-card shadow-float 를 쓰고 있으면 그대로 두되 tokens 에서 두 이름이 sm/lg 를 가리키게 한다
- spacing: 봄내는 px 유틸(h-48 px-24)을 tokens 배열로 쓴다. 우리는 Tailwind 기본 spacing(4의 배수)을 쓰므로 이 방식은 안 가져온다. 우리 방식 유지

## 변경 4. 모션 체계 정비

봄내 v4.1 모션 체계를 채택한다. 우리 DESIGN.md 모션 절과 대부분 같으나 다음을 맞춘다.

- easing 이름과 값: easeOut `cubic-bezier(0.23,1,0.32,1)`(진입 퇴장 기본), easeInOut `cubic-bezier(0.77,0,0.175,1)`(화면 내 이동), easeDrawer `cubic-bezier(0.32,0.72,0,1)`(시트 드로어), spring `cubic-bezier(0.32,1.32,0.5,1)`(스탬프 같은 모멘텀 결과 전용, 일반 UI 금지). 우리 기존 out/inOut/standard 를 이 이름과 값으로 교체
- duration: durPress 120 / durPop 180 / fast 160 / dur 280 / durSheet 360. UI 전환 상한 300ms 미만. 우리 기존 fast120 base200 enter240 page320 을 이 값으로 정렬(page320 → dur280 로 낮춤. 300 상한 준수)
- `pressable` 유틸리티: index.css 에 정의. `active:scale-[0.97]` + `transition-transform duration-[120ms]` + `motion-reduce:active:scale-100`. 버튼과 칩과 카드 클릭에 붙인다
- 팝 진입/퇴장: pop-panel(0.97→1 origin-top), pop-panel-exit(역재생), pop-instant(키보드 개시 무애니메이션). usePopExit 훅과 짝. FieldSelect/Select/LangMenu/드롭다운 공용

## 추가 1. 공유 동작 훅 (봄내 이식)

UI 프리미티브가 아니라 여러 컴포넌트가 공유하는 동작 훅이다. hooks/ 에 둔다.

- usePopExit(open, instant): 팝 퇴장 역재생. 닫힘 시 durPop 동안 마운트 유지하며 pop-panel-exit 재생 후 제거. instant 또는 reduced-motion 이면 즉시. Select/LangMenu/드롭다운/Tooltip 이 쓴다
- useBodyScrollLock(open): 오버레이 열림 시 body overflow hidden, 닫힐 때 이전 값 복원. Modal/Drawer/Toast 아님. 이미 우리 useFocusTrap 이 있으니 스크롤 락만 분리
- 우리 1단계 useFocusTrap 은 유지. 봄내엔 없지만 우리 게 더 낫다

## 추가 2. 커스텀 Select 를 봄내 FieldSelect 수준으로

우리 1단계 Select 는 이미 커스텀에 키보드 지원이 있다. 봄내 FieldSelect 의 다음 디테일을 흡수한다.

- 옵션에 아이콘 + 주 텍스트 + 보조 텍스트(코드/설명) 3단. 관리자 필터(시설 선택에 유형 배지, 부서 배정에 부서 코드)에 유용
- compact 변형: 라벨 좌 caption + 값 우측 정렬 한 줄(h-11). 필터 바 밀집 배치용
- 열릴 때 선택 옵션으로 하이라이트 이동 + scrollIntoView('nearest')
- detail 0(키보드 발화 클릭) 감지해 무애니메이션
- max-h 320 overflow. role listbox/option, aria-selected
- usePopExit 로 퇴장 애니메이션

우리 Select 에 이 디테일을 얹는다. 색과 라디우스는 우리 토큰.

## 추가 3. 다국어 골격 (봄내 구조 + 언어 교체)

봄내 다국어 시스템을 가져오되 언어를 한 영 일 중으로 바꾼다. 봄내는 en/ko/th 3개다.

구조
- src/i18n/LangContext.jsx: in-memory Context. lang ∈ 'ko'|'en'|'ja'|'zh'. **기본 ko**(봄내는 en 기본이나 우리는 공단 시민 서비스라 한국어 기본). t(key) 는 점 경로 파싱, 미존재 시 key 반환 + console.warn. html lang 동기화. localStorage 금지
- src/i18n/LangSwap.jsx: 같은 grid 셀에 4개 언어 겹침, 비활성 invisible. 레이아웃 시프트 0. **폭 기준은 한국어**(봄내는 EN 기준이나 우리 주 사용자가 한국어). 4개로 확장
- 네임스페이스 분할: src/i18n/{ko,en,ja,zh}/{common,chat,facility,admin,legal}.js 를 각 언어 index 가 병합. 4개 언어 키 완전 동형
- 네임스페이스 매핑: common(nav, meta, status, 공통 버튼) / chat(상담 홈, 추천질문, 신뢰문구, 답변 액션, 담당자 연결) / facility(시설 안내, 상세, 상태 라벨) / admin(관리자 전 화면. 심사용은 한국어 위주지만 키는 4개 다 채운다) / legal(개인정보처리방침)
- 공지와 자주 묻는 질문 화면 문구는 `common.notice.*` `common.faq.*` 아래 둔다. 3단계에서 6번째 네임스페이스로 분리할지 검토했고 **common 유지로 확정**했다. 분리는 순수 이동이라 얻는 것이 없고 파일만 4개 늘어난다

규칙
- UI 하드코딩 문자열 0. 전부 t() 또는 LangSwap
- 카피에 줄표(— –) 금지. 마침표 쉼표 접속사로 잇는다. 하이픈은 복합어만
- 답변 텍스트 자체는 다국어 사전이 아니라 백엔드가 질문 언어로 생성한다(API_CONTRACT). i18n 은 UI 문자열만
- ja zh 초안은 ko/en 기반 기계 번역 허용하되 PROGRESS 준비물에 네이티브 검수 등재. 심사 발표는 한국어라 ja zh 는 언어 전환이 동작하는 것을 보이는 수준이면 된다
- LangSwitch(TopNav): lucide Globe IconButton → 드롭다운. 한국어/English/日本語/中文 각 언어 자기 표기. 현재 언어 primary + Check 아이콘. 국기 이모지 금지. usePopExit 로 퇴장

## 1.5단계 작업 범위

1단계 파일 수정 대상이다. 소유 계약상 지금 단독으로 반영하고 2단계 병렬이 시작되기 전에 확정한다.

수정: tokens.js(radius 6단, shadow 3단, motion easing/duration 정비), index.css(pressable, pop-panel 3종, easing 변수 정렬), ui/Button(ring-inset variant), ui/Select(FieldSelect 디테일 흡수), ui/ 전수(radius 값 변경 영향 확인)
신설: hooks/usePopExit, hooks/useBodyScrollLock, i18n/ 전체(LangContext, LangSwap, 4언어 × 5네임스페이스), nav/LangSwitch
문서: DESIGN.md 에 이 델타 반영 표기, PROGRESS 1.5단계 기록, IA 상태표에 booked(info) 추가

절대 안 바꾸는 것: 색 토큰 값, 폰트, 브레이크포인트, 타이포 스케일, useChat 스트리밍 로직, App 라우트, mock 데이터
