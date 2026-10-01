# PROGRESS.md 미리 진행 상태

기준 일정. 서비스디자인 최종 발표 2026-12-14(월). Double Diamond 일정은 Team 오아시스 계획서(Google Docs) 기준. 발견 9.30~10.18 / 정의 10.19~10.30 / 발전 11.2~11.22 / 전달 11.23~12.14.

컨텍스트 85% 도달 시 여기 기록 후 중단. 재시작 시 이 파일부터 읽음.

## 단계

### 0. SETUP  [x]  2026-10-02
- G-Chat 저장소 전체를 miri/로 복사. 코드와 설정과 문서 전부
- G-Chat 전용 문서는 docs/_ref_gchat/ 으로 보관 (DESIGN DESIGN_DELTA IA ROUTES COMPONENTS PATTERNS PROGRESS API_CONTRACT SESSION_HEADER tokens IA_PHASE5 UI_DESIGN_SYSTEM_PLAYBOOK README _bomnae_ref screenshots)
- .claude/skills/fullstack-product-setup/SKILL.md 를 사용자 계정 최신본으로 교체. PITFALLS.md 는 G-Chat 원본 유지 (docs/PITFALLS.md 와 동일)
- tokens.js 는 G-Chat 원본 그대로 (사용자 결정 2026-10-02: 색은 G-Chat)
- 미리 문서 신설: DESIGN IA ROUTES COMPONENTS PATTERNS API_CONTRACT SOURCE PROGRESS SESSION_HEADER
- client/package.json name, .env.example, index.html title 교체
- npm install 완료, 빌드 결과는 아래 검증 기록

### 1. 기반 (단독)  [x]  2026-10-02
나머지가 의존하는 파일. 한 에이전트가 확정 후 2단계 시작.
- lib/shortage.js: GRADES 상수, 3.2 구현식, 원문 예시 단위 테스트 (침상 12, 차량 2, 왕복 120 → 부족 6)
- lib/assign.js: 기준선 배정 + 지역 탐색 최적화 + 사유 템플릿 + 기준선 비교. 단위 테스트
- lib/anomaly.js: 4.3 규칙 7개
- mock/: 고정 시드 생성 스크립트와 결과 JSON (동 10, 마을 18, 대피소, 왕복표, 대상자, 차량, 도우미, 판독 샘플)
- lib/api.js mock 라우터 교체 (API_CONTRACT 5절)
- store/useDispatchStore.js 발령 상태 머신, hooks/useDispatchClock.js 가상 시간 배속
- App.jsx 라우트 교체 (ROUTES.md), layout 수정 (Sidebar 메뉴, Topbar, DispatchBanner, HelperLayout, RequireAuth role)
- StatusPill 미리 상태 매핑 추가
- ui/TimeField 신설, SegmentControl 과 edit/ 이식 (dah 구조, G-Chat 토큰)
- i18n ko 단일화 (en ja zh 삭제, LangSwitch 제거)
- G-Chat 전용 페이지와 컴포넌트와 mock 삭제 (COMPONENTS.md 삭제 대상)

### 2. 화면 (병렬)  [x]  2026-10-02
파일 소유 계약. 각자 자기 페이지와 miri/ 하위 자기 컴포넌트만 수정. 기반 파일(tokens, ui, layout, lib, store, index.css) 수정 금지. 필요하면 PROGRESS 에 요청 기록.

| 에이전트 | 페이지 | 소유 컴포넌트 |
|----------|--------|--------------|
| A 평시 준비 | Overview Roster Intake Resources Shortage | GradeChip ShortageValue ShortageTable EvidencePanel ReviewRow IntakeUploader AnomalyList |
| B 발령 대응 | Dispatch Handover Records RecordDetail | DeadlineClock AssignmentBundle BaselineCompare TransportStatusTable |
| C 도우미와 소개 | HelperPage IntroPage PrivacyPage Settings Login NotFound | HelperAssignmentCard HelperStepBar FailReportSheet MockDataBadge |

GradeChip 과 DeadlineClock 은 다른 에이전트도 사용. 소유자만 수정.

### 3. 통합과 배포 (단독)  [ ]
- server/ Express + Neon + LLM 판독 엔드포인트 (API_CONTRACT 4.1, 5절)
- 비파괴 시드, cross-origin 쿠키 설정 (PITFALLS 29)
- Vercel 프론트, Render 백엔드 배포. 실제 배포 URL 육안 검증
- 반응형 320 390 768 1024 1280 1440 1920 2560 3840 캡처
- 금지 항목 grep 0건 보고, 대비 실측, 키보드 전 기능 도달

### 4. 검증 (Deliver)  [ ]
- AI 판독 정확도: 가상 대피계획서 정답셋 대비 등급 일치율, unknown 비율, 근거 불일치 비율
- 배정 최적화: 기준선 대비 미이송 차이, 계산 시간
- 부족분 계산: 수기 계산 대조
- 사용성 평가: 과업 테스트 (가능하면 동해시 담당자)

## 확인 필요

열린 결정 목록은 PLAN.md 6절이 기준. 여기에는 개발 진행에 걸리는 항목만 둠.
- 팀원별 2단계 에이전트 담당 (A B C) 배정
- 이송 완료 기한, 차종 정원은 기본값으로 개발 진행. 인터뷰 결과 나오면 설정값만 교체

## 결정 기록

- 2026-10-02 화면 용어 동 담당자 확정 (읍면 표기 폐기). PLAN 7절 1
- 2026-10-02 AI 3종(서류 판독, 배정 최적화, 이상 탐지) 확정. 배정 안내문 생성 기능 폐기. PLAN 7절 2
- 2026-10-02 docs/PLAN.md 신설. 기획서 기준본, 작업하며 계속 갱신

- 2026-10-02 색과 시각 값은 G-Chat tokens.js 원본 그대로 (사용자 지시)
- 2026-10-02 별도 MOTION.md RESPONSIVE.md 없음. DESIGN.md 14절과 9절이 대신함 (G-Chat 선례)
- 2026-10-02 다국어 범위 밖. i18n 구조는 ko 단일로 유지 (문구 중앙 관리 목적)
- 2026-10-02 계산 로직은 순수 함수로 프론트에서 실행. 서버 없이 시연 가능
- 2026-10-02 원문 부족분 공식에 차종별 탑승 정원 변수 추가. 정원 1 이면 원문과 동일 결과
- 2026-10-02 마을별 부족분 화면값은 배정 결과의 미이송 수. 등급 단위 공식은 상한 추정과 추가 차량 산출용

## 검증 기록

(빌드와 grep 결과를 날짜와 함께 숫자로 기록)

- 2026-10-02 빌드 미검증. Aside 샌드박스가 rolldown 네이티브 바이너리(.node) 로드를 막아 vite build 실패. 코드 문제 아님. 사용자 터미널에서 SETUP_PROMPT 1절 실행 필요
- 2026-10-02 금지 항목 grep (client/src): localStorage 0, TypeScript 0, hover scale 0, transition-all 0, type=date/time 0, gradient 0, tokens.js 밖 hex 0
- 2026-10-02 미리 문서 글쓰기 금지 항목 (문자 단위 검사): 가운데점 0, 줄표 0, "것" 0, "니다" 0, 이모지 0. SOURCE.md 는 원문 보관이라 검사 제외
- 2026-10-02 GitHub: github.com/hyunho2378/miri main 브랜치 push 완료 (275 파일)
- 2026-10-02 Vercel: hyunho2378's projects, 프로젝트 miri, Root Directory client, Vite 프리셋, 환경변수 VITE_USE_MOCK=true VITE_ORG_NAME=동해시. 배포 성공. 도메인 miri-indol.vercel.app. Vercel 빌드는 정상 통과 (로컬 샌드박스 빌드 실패는 환경 문제로 확정)
- 2026-10-02 배포 URL 확인: / /privacy /admin/login /facilities 직접 진입 404 없음. 화면은 아직 G-Chat 그대로 (1단계 기반 작업 전)
- 2026-10-02 미리 전체 구현 배포 (커밋 335ea74). G-Chat 화면과 코드 전부 제거, 15개 라우트 미리 화면으로 교체
- 2026-10-02 단위 테스트 8개 통과: 원문 예시 부족 6, 기준선과 최적화 동일 결과, 최적화 결과가 기준선보다 나쁘지 않음, 원문 대조 신뢰도 하, 이상 탐지 5규칙
- 2026-10-02 가상 데이터 기준 결과: 대상자 332명, 규칙 순서 부족 48명(침상 24 휠체어 24), AI 배정 최적화 41명(7명 감소), 리프트 승합차 2대와 침상 승합차 2대 추가 시 부족 0
- 2026-10-02 로컬 브라우저 확인: 13개 경로 콘솔 오류 0. 320 390 768 폭 요소 잘림 0, 9개 폭(320~3840) 가로 스크롤 0. 발령 개시 → AI 배정 → 전송 → 도우미 수락 → 단계 보고 클릭 시연 확인
- 2026-10-02 금지 grep (client/src): 가운데점 0(tokens.js 주석 1건 제외), 줄표 0, 이모지 0, tokens 밖 hex 0, localStorage 0, transition-all 0, hover scale 0, type=date/time 0, 네이티브 select 0, 그라데이션 0, backdrop-blur 0
- 2026-10-02 배포본 확인: miri-indol.vercel.app 현황판 정상, /api/intake 503 NO_KEY(키 미설정 정상 응답), 직접 진입 200

## 남은 작업
- Vercel 환경변수 GEMINI_API_KEY 설정 시 실제 서류 사진 판독 동작 (지금은 샘플 서류 판독만)
- 인쇄 전용 CSS (소방 인계, 기록 상세)
- 백엔드(서버 저장). 지금은 브라우저 메모리라 새로고침하면 초기 가상 데이터로 복귀
- 사용성 평가와 판독 정확도 측정 (Deliver 단계)
