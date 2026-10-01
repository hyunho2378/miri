# IA_PHASE5.md v2 에이전트 제품 확장 설계

작성일 2026년 9월 7일. 이 문서가 v1(계획서 내용을 화면으로 옮긴 설계)을 대체한다. v1 은 잘못된 방향이었다. 심사위원이 보는 것은 계획서를 읽어주는 페이지가 아니라 계획서가 주장한 제품이 실제로 되는가다.

5단계의 축은 하나다. 사업계획서가 G-Chat 을 "AI Agent 기반 공공시설 운영 플랫폼"(2-2)이라 했고 준비현황에 "AI Agent 설계 80%"라 적었다. 지금 화면은 답변 텍스트를 스트리밍하는 챗봇이다. 에이전트와 챗봇의 차이는 AI 가 무엇을 하고 있는지 단계가 보이고, 실행 전에 사용자가 허용하며, 실행 결과가 카드로 남는 것이다. 이 UI 를 만든다. 그 위에 계획서 2-2 AI Service 층의 기능(예약 연동 위치 안내 요금 안내 다국어 담당자 연결)이 도구로 얹힌다.

## 정리: v1 산출물 처리

- 삭제: /admin/billing, /about, /admin/roadmap 라우트와 페이지, insight/RoadmapStages GrowthTargets, mock/roadmap.json, mock/billing.json, i18n about 네임스페이스와 billing·roadmap 키(4언어 동시). 사이드바 인사이트 그룹에서 요금·플랜 로드맵 제거. TopNav 소개 메뉴 제거
- 유지하되 프레임 교체: /admin/insights /admin/reports /admin/forecast 는 실제 관리자 기능이다. 화면에서 "신규 수익상품" "기관별 계약" 같은 사업 프레임 문구를 전부 지우고 운영 개선 도구로만 서술. MilestoneChart PatternCard ForecastChart 유지
- 사이드바 인사이트 그룹은 데이터 자산화 / 운영 리포트 / 수요 예측 3개

## 1. 에이전트 도구 호출 UI (핵심)

### 개념

클로드가 Gmail 을 검색할 때 답변 안에 도구 카드가 뜨는 패턴을 그대로 가져온다. 답변은 텍스트 스트림 사이에 도구 이벤트가 끼어드는 타임라인이다.

```
[도구 카드] 예약 시스템 조회 · 천곡 실내테니스장 09.12        진행 중
[도구 카드] 예약 시스템 조회 · 3개 시간대 확인                펼치기
   18:00 코트A 가능 / 19:00 코트B 가능 / 20:00 마감
답변 텍스트 스트리밍
[실행 확인 카드] 09.12(토) 18:00 코트A / 야간 12,000원 + 조명 3,000원
   [예약하기] [다른 시간 보기]                                허용 전 실행 없음
[도구 카드] 예약 생성 · 완료 · R-2026-0912-018
[결과 카드] 예약 확정. 캘린더 추가 / 취소 규정 / 담당자 연락
[후속 질문 칩] 주차는 어떻게 하나요 / 취소는 언제까지 / 조명 요금은 왜 붙나요
```

### 도구 6종 (계획서 2-2 AI Service 층과 1:1)

| 도구 id | 이름 | 조회(읽기) | 실행(쓰기, 허용 필요) | 계획서 근거 |
|---|---|---|---|---|
| knowledge | 지식 검색 | 운영 매뉴얼·FAQ·공지·규정 검색. 결과가 근거 카드 | 없음 | RAG, 출처 표시(요구사항 2) |
| reservation | 예약 시스템 | 잔여 시간대 조회, 예약 상태 확인 | 예약 생성, 예약 취소 | 예약 연동(2-2), 요구사항 1, 경쟁사 표 "예약 API" |
| location | 위치 안내 | 주소·좌표·대중교통·주차 조회 | 없음. 지도 앱 딥링크는 사용자 클릭 | 위치 안내(2-2) |
| fee | 요금 계산 | 요금표 조회 + 인원·시간 계산 | 없음 | 요금 안내(2-2) |
| handoff | 담당자 연결 | 담당 부서·통화 가능 여부 조회 | 문의 티켓 생성 | HITL(요구사항 3) |
| translate | 언어 감지 | 질문 언어 감지, 답변 언어 결정 | 없음 | 다국어(경쟁사 표 4개 언어) |

읽기 도구는 자동 실행하고 카드로 보인다. 쓰기 도구는 반드시 실행 확인 카드를 거친다. 사용자가 허용하지 않으면 아무것도 바뀌지 않는다. 이 게이트가 공공 서비스 신뢰의 핵심이고, "AI 가 멋대로 예약했다"는 민원을 원천 차단한다.

### 도구 카드 상태

pending(대기) → running(진행, 스피너 + 진행 문구) → done(완료, 접힘, 요약 한 줄, 펼치면 상세) → error(실패, 사유 + 담당자 연결 제안). 쓰기 도구는 running 전에 awaiting(허용 대기, 실행 확인 카드)이 있다. 사용자가 거부하면 declined(취소됨)로 접힌다.

여러 도구가 연속되면 "도구 3개 사용" 요약 행으로 접히고 펼치면 타임라인. 스트리밍 중에는 진행 카드가 항상 펼쳐진 채 최신 하나만 보인다.

### API_CONTRACT 확장

NDJSON 에 tool 이벤트를 추가한다. 순서는 자유(텍스트 사이에 끼어든다).

```
{"type":"tool","id":"t1","tool":"reservation","phase":"running","label":"예약 시스템 조회","detail":"천곡 실내테니스장 09.12"}
{"type":"tool","id":"t1","phase":"done","summary":"3개 시간대 확인","result":{"slots":[{"time":"18:00","court":"A","status":"open","fee":15000}]}}
{"type":"token","token":"토요일 저녁 "}
{"type":"action","id":"a1","tool":"reservation","op":"create","title":"09.12(토) 18:00~19:00 천곡 실내테니스장 코트A","lines":["야간 요금 12,000원","조명 사용료 3,000원"],"confirmLabel":"예약하기","alternatives":[{"label":"다른 시간 보기","prompt":"다른 시간대도 보여줘"}]}
{"type":"followups","items":["주차는 어떻게 하나요","취소는 언제까지 되나요"]}
{"type":"done","messageId":"...","autoResolved":true,"confidence":0.9}
```

허용은 별도 요청이다. POST /api/chat/action {actionId, messageId, approve:true|false, args?} → 스트리밍 응답으로 tool running→done + 결과 카드 + 텍스트. 이 응답이 같은 답변 아래에 이어 붙는다(새 말풍선이 아니라 같은 타임라인 연장).

기존 sources 이벤트는 knowledge 도구의 done 결과로 흡수한다. 근거 카드는 그대로 우측 열에 뜨되 knowledge 도구 카드를 펼치면 같은 목록이 나온다. 후방 호환: sources 만 오면 knowledge 도구 done 으로 간주.

mockStream 이 6종 도구 시나리오를 전부 재현한다. 질문 의도별 시나리오 표를 mock 에 둔다(예약 / 운영시간 / 요금 인원 / 위치 / 자료없음→handoff / 외국어).

### 컴포넌트

chat/agent/ 폴더.

- ToolCard: 6종 공통. tool 별 lucide 아이콘(BookOpen CalendarCheck MapPin Calculator UserRoundCheck Languages), phase 별 표시, 펼침 시 tool 별 상세 렌더러
- ToolTimeline: 한 답변 안의 도구 카드 묶음. 접힘/펼침, 진행 중 최신 하나만 노출
- ActionCard: 실행 확인. 제목, 라인 항목, 확인 버튼(primary), 대안 버튼(secondary → 프롬프트 전송), 거부 후 declined 상태
- ResultCard: 실행 결과. 예약 카드(예약번호·일시·시설·요금·캘린더 .ics·취소 규정), 티켓 카드(접수번호·부서·전화)
- FollowupChips: 후속 질문 3개. 클릭 시 전송
- tool 상세 렌더러: SlotList(예약 시간대), LocationDetail(주소·교통·주차·지도 딥링크 네이버/카카오), FeeBreakdown(항목별 합계), KnowledgeHits(근거 목록. SourcePanel 과 같은 데이터), HandoffDetail(부서·통화 가능), LangDetect(감지 언어·답변 언어)

기존 FacilityStatusCard HandoffCard NoticeCard 는 유지하되 도구 결과 렌더러로 재배치. HandoffCard 의 폼 제출은 handoff 도구의 쓰기 실행이 된다(action 이벤트 경유).

### 시민 경험 규칙

- 답변 첫 토큰 전에 도구 카드가 먼저 뜬다. 사용자는 AI 가 무엇을 찾는지 보며 기다린다. 스켈레톤은 도구 카드가 없을 때만
- 쓰기 실행은 사용자 클릭 없이 절대 일어나지 않는다. 확인 카드는 실행 내용을 사람이 읽을 수 있는 문장으로 전부 보인다(요금 포함)
- 실행 완료 후 결과 카드는 대화가 이어져도 그 자리에 남는다
- 후속 질문 칩은 답변 완료 후에만. 스트리밍 중 금지
- 도구 실패 시 담당자 연결 도구를 자동 제안(읽기)하되 티켓 생성은 여전히 허용 게이트
- 질문 언어 감지 도구는 첫 답변에만 카드로 보이고 이후는 숨긴 채 답변 언어만 유지. 감지 언어와 UI 언어가 다르면 "UI 도 English 로 바꿀까요" 칩

## 2. 시민 경험 확장 (도구 UI 위에)

| 기능 | 내용 | 파일 |
|---|---|---|
| 채팅 안 예약 완결 | reservation 도구 조회→확인→생성. 외부 이동 없음. 결과 카드에 .ics 다운로드 | agent/, mockStream 시나리오 |
| 위치 안내 | location 도구. 주소·대중교통·주차 + 네이버/카카오 지도 딥링크 | LocationDetail |
| 요금 계산 | fee 도구. "성인 2 청소년 1" 파싱 → 항목별 합계. 감면(경차 등) 반영 | FeeBreakdown |
| 후속 질문 | followups 이벤트. 답변마다 3개 | FollowupChips |
| 다국어 답변 | translate 도구. mock 도 질문 언어로 답변(en ja zh 시나리오) | mockStream |
| 세션 만족도 | 답변 3회 후 또는 새 대화 시 NPS 0~10 카드 1회. H2 원천 | chat/NpsCard, POST /api/chat/nps |
| 대화 목록 | 좌측 레일에 이번 세션 대화 목록(메모리). 새 대화 유지 | ChatPage 레일 |
| 현장 QR 진입 | /?facility=id&src=qr → 헤드라인이 "{시설명} 앞이시군요" + 그 시설 칩 4개(오늘 운영시간·지금 예약·요금·주차) | ChatPage |

## 3. 응용 강화 (SaaS 로서)

| 기능 | 내용 | 계획서 근거 | 파일 |
|---|---|---|---|
| 기관 온보딩 위저드 | /admin/onboarding. 4단계: 기관 정보(기관명·로고·연락처) → 시설 등록(CSV 업로드 또는 수기) → 운영 매뉴얼 업로드(pdf docx hwpx) → KB 구축(도구 카드 패턴으로 "문서 분석 중 → 청크 84개 → 임베딩 → 완료") → 챗봇 미리보기(시뮬레이터 임베드) → 개통. "2~4주 구축"을 20분짜리 화면으로 | 경쟁사 표 "운영 매뉴얼 업로드만으로 구축", "데이터 교체만으로 신규 기관" | pages/admin/OnboardingPage, admin/onboarding/ 스텝 컴포넌트 |
| 웹 임베드 위젯 | /widget 라우트. 공단 홈페이지에 iframe 으로 붙이는 FAB 챗봇(동해사이 SovereignChat 패턴, 우하단 원형 → 패널). 설정 채널 탭에서 임베드 코드 실제 생성(기관 id 포함) | 3-1 "웹 연동" | pages/public/WidgetPage, chat/WidgetShell, SettingsPage 채널 탭 |
| 시설 QR | 시설 편집 화면에 QR 생성(SVG, /?facility=id&src=qr). 인쇄용 A5 안내판 미리보기 | 오프라인 터치포인트 | FacilityEditPage, lib/qr.js(의존성 없이 SVG 생성) |

## 4. 관리자 도구 심화

| 기능 | 내용 | 계획서 근거 | 파일 |
|---|---|---|---|
| 상담 시뮬레이터 | /admin/simulator. 관리자가 시민 입장으로 질문 → 같은 도구 UI 로 답변·근거 확인 → 오답 표시 → 해당 근거 문서로 바로 이동 또는 FAQ 생성. 상단에 KB 버전·언어 선택. 목업 사이드바 "AI 챗봇"이 이것 | Human Review, H4 | pages/admin/SimulatorPage(ChatHero 재사용, 관리자 모드 플래그) |
| 공지사항 관리 | /admin/notices. CRUD, 관련 시설, 게시 기간, 게시 즉시 KB 색인 도구 카드("색인 중 → 완료") | 3-4 "공지사항 관리" | pages/admin/NoticesAdminPage |
| 인계 자동 분류·답변 초안 | 인계 카드에 AI 제안 부서(근거: 시설·키워드) + "답변 초안 생성" 도구 → 초안 → [발송 확인] 게이트. 발송은 mock | 3-4 "민원 자동 접수/배정", "행정 문서 초안 작성" | HandoffPage 확장, agent/ 재사용 |
| 지식베이스 문서 상세 | 문서 행 → 드로어: 청크 미리보기(번호·텍스트·임베딩 상태), 이 문서가 근거로 쓰인 최근 질문 10건, 갱신일 90일 경보, 재색인 도구 카드 | 2-2 Chunking, FAQ 개선 | KnowledgePage 드로어 |
| 알림 센터 | Topbar 벨 → 드롭다운: 색인 실패·정확도 하락(설정 기준 미만)·인계 접수·온보딩 완료. 읽음 처리. 설정 알림 탭과 연동 | 설정 알림 | layout/Topbar 알림, store/useNotifications |

## 라우트 변경

추가: /widget(공개), /admin/onboarding(admin), /admin/simulator(전체), /admin/notices(운영자 이상)
삭제: /about, /admin/billing, /admin/roadmap
사이드바: 운영 그룹에 공지사항 관리(예약 현황 앞)·상담 시뮬레이터(분석 뒤) 추가. 인사이트 3개. 설정 그룹에 기관 온보딩 추가. 운영 10 인사이트 3 설정 3 = 16. 세로 넘침 대응으로 그룹 접기(useAdminUi 에 접힘 상태, 소제목 클릭)

## 소유 계약 (5단계 v2)

단독 선행 5-1 (1단계 파일 수정 포함):
- API_CONTRACT tool/action/followups/nps 이벤트 명세
- hooks/useChat: tool·action·followups 이벤트 파싱, 타임라인 상태, approveAction(actionId, approve, args) 추가. 기존 스트리밍 로직(PITFALLS 1~17)은 절대 수정 금지, 이벤트 분기만 추가
- lib/api.js: /api/chat/action, /api/chat/nps, 5단계 mock 라우트(D 요청분 5개 + 새 것)
- lib/mockStream.js: 6종 도구 시나리오
- chat/agent/ 전체 컴포넌트
- v1 산출물 삭제·프레임 교체
- App.jsx 라우트, Sidebar 그룹 접기
- 이 작업이 끝나야 병렬이 시작된다

병렬 5-F 시민: ChatPage(레일 대화목록·QR 진입·NPS)·WidgetPage·WidgetShell·NpsCard·시민 i18n
병렬 5-G 관리자: OnboardingPage·SimulatorPage·NoticesAdminPage·HandoffPage 확장·KnowledgePage 드로어·Topbar 알림·useNotifications·FacilityEditPage QR·lib/qr.js·SettingsPage 채널 탭·관리자 i18n

F·G 는 agent/ 를 읽고 쓴다(사용). agent/ 자체 수정은 6단계 단독.

## 절대 안 하는 것

- IR 페이지(요금·소개·매출 로드맵). 발표 PPT 가 할 일이다
- 쓰기 도구의 자동 실행. 허용 게이트 없는 예약·티켓·발송 금지
- 계획서 밖 도구(결제 등). 6종만
- 도구 카드에 색·모션 남발. 진행 스피너와 접힘 애니메이션만. 규율 유지
- mock 결과를 지어내기보다 facilities/logs/knowledge 데이터에서 파생