# COMPONENTS.md 미리 컴포넌트 명세

작성일 2026년 10월 2일. 기반은 G-Chat 컴포넌트 전체 복사본. 편집 패턴은 dah-website에서 구조만 이식. 값은 tokens.js(G-Chat 원본)만 사용.

출처 표기.
- [G] G-Chat 그대로 재사용. 수정 금지 대상은 별도 표시
- [G수정] G-Chat 파일을 미리 용도로 수정
- [D] dah-website 구조 이식. dah의 glass 클래스와 토큰은 가져오지 않고 G-Chat 토큰으로 재작성
- [신규] 미리 전용 신설

## 1. 트리

```
client/src/
  tokens.js                          [G] G-Chat 원본 그대로. 수정 금지
  index.css                          [G]
  App.jsx                            [G수정] ROUTES.md 라우트로 교체
  components/
    ui/                              [G] 18종 전부 재사용. 기반 파일, 2단계 병렬 중 수정 금지
      Avatar Badge Button Chip Drawer EmptyState IconButton Input Modal
      MultiSelect Pagination Select Skeleton Tabs Textarea Toast Toggle Tooltip
      TimeField.jsx                  [신규] 시각 입력. input type=time 대체
      SegmentControl.jsx             [D] 보기 전환(표/히트맵, 마을별/일괄)
    layout/
      PublicLayout.jsx TopNav.jsx Footer.jsx      [G수정] 소개 면 메뉴로 교체
      AdminLayout.jsx Sidebar.jsx Topbar.jsx      [G수정] 메뉴 3구획 9개, 전역 발령 띠 슬롯
      RequireAuth.jsx                              [G수정] role 속성 추가
      HelperLayout.jsx                             [신규]
      DispatchBanner.jsx                           [신규] 전역 발령 띠
    nav/  Logo UserMenu               [G수정] 로고 문구 미리
          LangSwitch                  [삭제 대상] 다국어 범위 밖
    dashboard/                        [G] KpiCard DataTable BarChart DonutChart Heatmap RankList
                                          StatusPill DateRangeTabs Reloading TrendChart chartUtils
                                      StatusPill 은 [G수정] 미리 상태 매핑 추가 (DESIGN 3절)
    chat/agent/                       [G] ToolTimeline ToolCard ToolDetails ResultCard
                                          서류 판독 진행 표시에 재사용
    chat/SourcePanel.jsx              [G] EvidencePanel 의 구조 원본
    edit/                             [D] dah 편집 도구
      EntityCrud.jsx                  필드 정의 기반 공용 CRUD 패널
      FormControls.jsx                Field PageHead ErrorText 등 폼 조각
      InlineEditBar.jsx               권한 있을 때만 렌더되는 추가 편집 정렬 바
      EditPencil.jsx                  행 단위 편집 진입
      DragHandle.jsx                  useDragSort 포함. 배정 수동 조정
      ExportButton.jsx                CSV 내보내기
    miri/                             [신규] 도메인 컴포넌트
      GradeChip.jsx
      ShortageValue.jsx
      ShortageTable.jsx
      DeadlineClock.jsx
      EvidencePanel.jsx
      ReviewRow.jsx
      IntakeUploader.jsx
      AssignmentBundle.jsx
      BaselineCompare.jsx
      AnomalyList.jsx
      TransportStatusTable.jsx
      HelperAssignmentCard.jsx
      HelperStepBar.jsx
      FailReportSheet.jsx
      MockDataBadge.jsx
  hooks/                              [G] useBodyScrollLock useFocusTrap useMediaQuery usePopExit useToast
                                      useChat                    [삭제 대상]
                                      useDispatchClock.js        [신규] 1초 틱, 가상 시간 배속
  lib/
    api.js format.js                  [G수정] 미리 엔드포인트와 mock 라우터
    shortage.js                       [신규] 부족분 계산 순수 함수 (API_CONTRACT 3절)
    assign.js                         [신규] 배정 최적화와 규칙 순서 기준선 (API_CONTRACT 4.2)
    anomaly.js                        [신규] 이상 탐지 규칙 (API_CONTRACT 4.3)
    mockStream.js stripMarkdown.js ics.js qr.js   [삭제 대상]
  store/
    useAuthStore.js useAdminUi.js     [G수정] role 추가
    useDispatchStore.js               [신규] 발령 상태 머신
    useChatUi.js useNotifications.js  [삭제 대상, useNotifications 는 이상 탐지 알림으로 수정 재사용 검토]
  i18n/                               [G수정] ko 단일. LangContext 유지, en ja zh 삭제
  mock/                               [신규 교체] API_CONTRACT 2절 스키마의 가상 데이터
  pages/                              ROUTES.md 표 기준 전면 교체
```

삭제 대상은 2단계에서 페이지 교체와 함께 제거. 1단계에서는 지우지 않음 (빌드 유지).

## 2. layout

### AdminLayout.jsx [G수정]
- G-Chat 구조 유지. Sidebar 240 + Topbar 56 + 콘텐츠 max 1600
- Topbar 아래 DispatchBanner 슬롯. useDispatchStore.status가 평시가 아니면 렌더

### Sidebar.jsx [G수정]
- 메뉴 정의 배열을 IA.md 4절 표로 교체. 구획 라벨 3개(평시 준비 / 발령 대응 / 기록 관리)
- role=dong이면 시 관리자 전용 메뉴(소방 인계, 설정) 숨김
- 판독 확인 대기 건수를 서류 판독 메뉴 우측 count 인디케이터로 표시

### Topbar.jsx [G수정]
- 우측: 발령 상태 필, MockDataBadge, 알림(이상 탐지), UserMenu

### DispatchBanner.jsx [신규]
- 주목 soft 배경 한 줄. 발령 종류(실제 / 훈련), 경과 시간, 가장 이른 마을 기한까지 남은 시간, 발령 운영 바로가기
- role="status". 기한 초과 예상 마을 발생 시 danger soft로 전환

### HelperLayout.jsx [신규]
- 상단 바 56(로고, 발령 상태 필) + 본문 max 480 중앙. Footer 없음

### RequireAuth.jsx [G수정]
- props: role(선택). 미충족 시 /console 이동 + 토스트

## 3. miri 도메인 컴포넌트

### GradeChip.jsx
- props: grade('bed'|'wheelchair'|'assist'|'walk'), size('sm'|'md')
- 중립 Badge + lucide 아이콘(BedSingle Accessibility HandHelping Footprints) + 라벨(침상 휠체어 부축 도보)
- 등급 상수와 정렬 순서는 lib/shortage.js의 GRADES 하나만 사용

### ShortageValue.jsx
- props: value, byGrade, provisional(잠정 건수)
- 0이면 "부족 없음" 중립, 1 이상이면 "부족 N명" danger 글자. byGrade는 caption 한 줄
- provisional > 0이면 잠정 배지 + Tooltip

### ShortageTable.jsx
- DataTable 래퍼. 열: 동, 마을, 대상자(등급별), 이송 가능(등급별), 부족분
- 보기 전환 SegmentControl: 표 / 히트맵(Heatmap 재사용, 마을 × 등급)
- 768 미만 카드 전환은 DataTable 규칙 그대로

### DeadlineClock.jsx
- props: dispatchDeadline(발령 기한 D), completeDeadline(이송 완료 기한 E), now, dispatched(boolean), finishEta(마지막 이송 완료 예상), compact
- 발령 전은 D까지, 발령 후는 E까지 남은 시간이 주 숫자. kpi 또는 h3(compact). 기한 시각 meta. D에서 E까지 진행 막대(scaleX)
- finishEta > E이면 danger와 "기한 초과 예상" 라벨. 이 전환 순간만 role="status" 공지

### EvidencePanel.jsx
- G-Chat SourcePanel 구조 재사용. 근거 열 예약 규칙(PITFALLS 1) 그대로
- 내용: 문서 크롭 이미지(alt 필수), 추출 문구(원문 하이라이트), 판정 등급, 신뢰도 라벨(상 중 하), 원문 대조 결과(일치 / 불일치)

### ReviewRow.jsx
- 서류 판독 확인 대기열의 한 행. [문서 크롭 | 판정 필드 편집 | EvidencePanel]
- 동작: 확인 / 수정 후 확인 / 반려. 키보드 단축키 없음(오조작 방지)

### IntakeUploader.jsx
- 드래그 앤 드롭 + 파일 선택 버튼(라벨 연결된 sr-only input). 이미지와 PDF. 문서 종류 Select
- 업로드 후 문서별 ToolTimeline 진행 표시

### AssignmentBundle.jsx
- 배정표의 차량 단위 묶음 카드. 헤더: 차량 코드, 차종, 도우미 코드, 회차 수, 예상 완료 시각(DeadlineClock compact)
- 본문: 회차별 대상자 순서 목록(GradeChip, 마을, 코드). DragHandle로 묶음 사이 이동
- 하단 접힘: 배정 사유(AI) 목록

### BaselineCompare.jsx
- 한 줄 비교: 규칙 순서 배정 대비 미이송 N명 감소, 마지막 완료 M분 단축. 차이가 없으면 "규칙 순서와 동일한 결과"
- 펼침: 두 배정의 마을별 미이송 비교 표

### AnomalyList.jsx
- 이상 탐지 항목 목록. 항목: ShieldAlert 아이콘, 규칙 이름, 대상(코드 또는 마을), 감지 값, 조치 링크
- 현황판에서는 상위 5건, 전체는 Drawer

### TransportStatusTable.jsx
- 발령 운영의 실시간 현황. 열: 대상자, 마을, 등급, 도우미, 단계, 최근 보고 시각
- 실패 행은 상단 고정. 행 동작: 재배정 / 소방 인계

### HelperAssignmentCard.jsx
- 도우미 면 대상자 카드. 순번, 코드, GradeChip, 주소 상세, 필요 장비와 주의사항, 보호자 연락처(tel 링크)
- 현재 카드만 펼침, 완료 카드는 접힘 + 완료 시각

### HelperStepBar.jsx
- 하단 고정 단계 버튼 영역. 다음 단계 버튼 하나 primary 56 높이 + 실패 보고 ghost
- 단계: 출발 → 도착 → 탑승 완료 → 대피소 인계 완료. 버튼 탭 시 낙관적 갱신, 실패 시 되돌리고 alert

### FailReportSheet.jsx
- Modal(바텀시트 아님). 사유 칩 단일 선택 + 선택 메모 Textarea + 보고 버튼

### MockDataBadge.jsx
- VITE_USE_MOCK=true일 때만 "가상 데이터" 중립 배지

## 4. edit [D]

dah 구조 이식 규칙.
- dah의 glass 클래스(bg-glass-bg, backdrop-blur 등) 전부 제거. G-Chat 토큰 클래스로 재작성 (backdrop-blur 금지)
- dah의 useAuth().canEdit(type) 대신 useAuthStore role 기반 canEdit(resource)
- 비권한 시 미렌더 원칙 유지(숨김이 아니라 null 반환)

### EntityCrud.jsx
- props: resource, fields(필드 정의 배열), rows, onSave, onDelete, sortable
- 필드 kind: text / number / select(커스텀 Select) / multiselect / toggle / time(TimeField) / tags
- 명부, 차량, 도우미, 대피소, 마을 편집이 공유

### InlineEditBar.jsx / EditPencil.jsx
- 목록 상단 추가 편집 정렬 바, 행 단위 연필. 권한 없으면 미렌더

### DragHandle.jsx
- useDragSort 포함. 키보드 대체 수단(위로 아래로 버튼) 필수

### ExportButton.jsx
- rows와 columns를 CSV로 다운로드. 소방 인계와 이송 기록에서 사용. 파일명에 기관명과 시각

## 5. ui 추가분

### TimeField.jsx [신규]
- 시 분 두 칸 커스텀 입력. 24시간제. 화살표 키 증감. 라벨 연결 필수
- 네이티브 input type=time 사용 금지

### SegmentControl.jsx [D]
- 2~3개 보기 전환. role="radiogroup". 활성 primary-soft 배경
