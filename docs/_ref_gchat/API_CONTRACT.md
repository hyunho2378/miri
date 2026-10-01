# API_CONTRACT.md 프론트와 백엔드 계약

프론트(현호)와 백엔드(송준하) 사이 약속. 프론트는 이 형태만 기대한다. 백엔드가 붙기 전에는 lib/mockStream.js 와 mock JSON 이 같은 형태로 응답한다. 형태를 바꾸려면 이 문서를 먼저 바꾼다.

베이스 URL `VITE_API_URL`. 모든 경로는 `/api` 아래. 인증은 httpOnly 쿠키 `gchat_session`. 응답 JSON. 날짜는 ISO 8601. 숫자는 number.

## 상담

### POST /api/chat  (스트리밍, NDJSON)

요청
```json
{
  "message": "국민체육센터 오늘 몇 시까지 해요",
  "history": [{ "role": "user", "content": "..." }, { "role": "assistant", "content": "..." }],
  "facilityId": "fac-001",
  "lang": "ko",
  "sessionId": "uuid"
}
```
history 는 최근 8개. facilityId lang sessionId 는 선택.

응답 `Content-Type: application/x-ndjson`. 한 줄에 JSON 하나. 순서는 sources → cards → token... → done.

```
{"type":"sources","sources":[{"id":"doc-12","title":"국민체육센터 운영 매뉴얼 2026","kind":"manual","updatedAt":"2026-07-01","url":"/docs/doc-12","facilityId":"fac-001"}]}
{"type":"cards","cards":[{"type":"facility","facilityId":"fac-001"}]}
{"type":"token","token":"국민체육센터는 "}
{"type":"token","token":"오늘 "}
{"type":"done","messageId":"msg-9f2","autoResolved":true,"confidence":0.91}
```

kind 는 manual | notice | faq | reservation | regulation.
cards type 은 facility | notice | handoff. handoff 는 서버가 자료 없음 판단 시 보내면 프론트가 HandoffCard 를 자동으로 연다. 사용자가 담당자 연결 버튼을 누르면 서버 신호 없이도 연다.

서버 책임
- byte-fallback 토큰(`<0xEC>` 류)은 서버에서 완성 글자로 조립해 보낸다. 프론트는 조립하지 않는다.
- 답변은 마크다운 최소화. 볼드, 하이픈 불릿, 번호, 파이프 표만. 제목 기호 코드블록 금지. 프론트가 걸러내지만 기대하지 않는다.
- 톤은 합니다체 공식 안내문. 해요체 금지. AI 자기 언급 금지. 확인 안 된 사실 금지, 자료에 없으면 없다고 하고 handoff 카드를 보낸다.
- 질문 언어를 감지해 같은 언어로 답한다. lang 이 오면 그 언어를 우선한다.
- history 가 있고 검색 0건이면 히스토리 맥락으로 이어 답한다(후속 질문 거절 방지).
- **쓰기 도구는 action 이벤트 없이 실행하지 않는다.** 예약 생성, 예약 취소, 티켓 생성, 발송은 전부 /api/chat/action 의 approve:true 를 받은 뒤에만 수행한다. 이 게이트를 건너뛴 실행은 계약 위반이다. 공공 서비스에서 "AI 가 멋대로 예약했다"는 민원을 원천 차단하는 장치다.
- 읽기 도구(knowledge location fee translate 와 reservation·handoff 의 조회)는 자동 실행한다. 결과는 tool done 으로 보낸다.

### 도구 이벤트 (5단계 추가)

G-Chat 은 챗봇이 아니라 에이전트다. 답변은 텍스트 스트림 사이에 도구 이벤트가 끼어드는 타임라인이다. 프론트는 이벤트가 온 순서를 그대로 보존해 그린다.

도구 6종. 계획서 2-2 AI Service 층과 1:1 이다.

| tool | 조회(자동 실행) | 실행(허용 필요) |
|---|---|---|
| knowledge | 매뉴얼·FAQ·공지·규정 검색 | 없음 |
| reservation | 잔여 시간대·예약 상태 조회 | 예약 생성, 예약 취소 |
| location | 주소·교통·주차 조회 | 없음 |
| fee | 요금표 조회와 인원 계산 | 없음 |
| handoff | 담당 부서·통화 가능 조회 | 문의 티켓 생성 |
| translate | 질문 언어 감지 | 없음 |

**tool 이벤트**. 같은 id 가 여러 번 오면 상태 갱신이다. phase 는 `running` → `done` 또는 `error`.

```
{"type":"tool","id":"t1","tool":"reservation","phase":"running","label":"예약 시스템 조회","detail":"천곡 실내테니스장 09.12"}
{"type":"tool","id":"t1","phase":"done","summary":"3개 시간대 확인","result":{"slots":[{"time":"18:00","court":"A","status":"open","fee":15000}]}}
```

- `id` 필수. 갱신 이벤트는 id 로 찾는다. `tool` `label` 은 첫 이벤트에만 있으면 된다
- `phase: "error"` 면 `message` 에 사용자 문장을 담는다. 프론트가 담당자 연결을 제안하되 티켓 생성은 여전히 허용 게이트를 거친다
- `result` 는 tool 별로 형태가 다르다. knowledge 는 `{sources:[...]}`, reservation 은 `{slots:[...]}` 또는 `{reservation:{...}}`, location 은 `{address, transit[], parking, links:{naver,kakao}}`, fee 는 `{items:[{label,count,unit,amount}], total}`, handoff 는 `{department, phone, hours, callable}`, translate 는 `{detected, answerLang}`

**action 이벤트**. 쓰기 도구는 이 이벤트 없이 실행하지 않는다.

```
{"type":"action","id":"a1","tool":"reservation","op":"create","title":"09.12(토) 18:00~19:00 천곡 실내테니스장 코트A","lines":["야간 요금 12,000원","조명 사용료 3,000원"],"confirmLabel":"예약하기","alternatives":[{"label":"다른 시간 보기","prompt":"다른 시간대도 보여줘"}]}
```

- `op` 는 `create` | `cancel`. `lines` 는 사람이 읽고 판단할 내용 전부(요금 포함)
- `fields` 가 있으면 확인 카드가 입력 폼을 그린다(handoff 티켓의 이름·연락처·내용). 값은 approve 요청의 `args` 로 돌아간다
- `alternatives` 는 거부 대신 다른 길이다. 누르면 그 `prompt` 를 새 질문으로 보낸다

**followups 이벤트**. 답변이 끝난 뒤에만 노출한다.

```
{"type":"followups","items":["주차는 어떻게 하나요","취소는 언제까지 되나요","조명 요금은 왜 붙나요"]}
```

**sources 후방 호환**. 기존 `sources` 이벤트는 knowledge 도구의 done 으로 흡수한다. 프론트는 `sources` 만 와도 knowledge 도구가 done 된 것으로 간주하고 근거 카드를 그린다. 백엔드는 둘 중 하나만 보낸다.

### POST /api/chat/action  (스트리밍, NDJSON)

허용 또는 거부. 허용해야만 쓰기가 실행된다.

```json
{ "actionId": "a1", "messageId": "msg-9f2", "approve": true, "args": { "name": "홍길동" } }
```

응답은 /api/chat 과 같은 NDJSON 이고 **같은 답변의 타임라인에 이어 붙는다**. 새 말풍선이 아니다.

```
{"type":"tool","id":"t2","tool":"reservation","phase":"running","label":"예약 생성"}
{"type":"tool","id":"t2","phase":"done","summary":"예약 완료","result":{"reservation":{"code":"R-2026-0912-018","facilityId":"fac-008","date":"2026-09-12","time":"18:00~19:00","court":"A","total":15000,"cancelBy":"2026-09-11"}}}
{"type":"token","token":"예약이 확정되었습니다. "}
{"type":"done","messageId":"msg-9f2"}
```

`approve:false` 면 서버는 아무것도 바꾸지 않고 즉시 done 을 보낸다. 프론트는 그 action 을 declined 로 접는다.

### POST /api/chat/nps

```json
{ "sessionId": "uuid", "score": 9 }
```

score 0~10. H2 이용자 만족도 NPS 의 원천이다. 세션당 1회.

### POST /api/chat/feedback
```json
{ "messageId": "msg-9f2", "vote": "up" }
```
vote up | down. NPS 와 정확도 리뷰 큐 원천.

### POST /api/handoff
```json
{ "messageId": "msg-9f2", "facilityId": "fac-001", "name": "홍길동", "phone": "010-0000-0000", "content": "...", "consent": true }
```
응답 `{ "ticketId": "HO-2026-0912-014", "department": "체육시설팀", "phone": "033-000-0000", "hours": "09:00~18:00" }`

## 시민 조회

- GET /api/facilities?type= → FacilityCard 배열. 필드는 mock/facilities.json 과 같다
- GET /api/facilities/:id
- GET /api/facilities/:id/status → `{ "status":"normal|maintenance|closed", "todayHours":"06:00~22:00", "reservation":"open|stable|limited|full", "reservationUrl":"https://...", "syncedAt":"..." }`
- GET /api/notices, /api/notices/:id
- GET /api/faq?cat=
- GET /api/settings/public → `{ "orgName":"...", "logoUrl":"...", "headline":{"ko":"...","en":"..."}, "suggestions":[...], "trustLine":"...", "languages":["ko","en","ja","zh"] }`

## 관리자

인증
- POST /api/auth/login `{ email, password }` → 쿠키 세팅, `{ user:{ id, name, email, role, facilities[] } }`
- GET /api/auth/me
- POST /api/auth/logout

대시보드
- GET /api/admin/kpi?range=7d|30d|quarter → mock/kpi.json 형태
- GET /api/admin/trend?range= → `{ labels[], series:[{key:"auto",points[]},{key:"handoff",...},{key:"unresolved",...}] }`
- GET /api/admin/top-questions?range=&limit=5
- GET /api/admin/facility-share?range=
- GET /api/admin/review-queue → `{ accuracy: 12, handoff: 3, knowledge: 5 }`
- GET /api/admin/report?range= → PDF

로그
- GET /api/admin/logs?range=&facilityId=&result=&lang=&vote=&page=&pageSize= → `{ rows[], total }`
- GET /api/admin/logs/:id → 전체 대화 + sources + review
- PUT /api/admin/logs/:id/review `{ verdict:"correct|wrong|hold", note }`
- GET /api/admin/logs/sample?week= → 이번 주 리뷰 샘플 20건
- POST /api/admin/logs/:id/to-faq → 지식베이스 승인 대기 생성

인계
- GET /api/admin/handoff?status=wait|progress|done
- PUT /api/admin/handoff/:id `{ status, department, note }` → 완료 시 서버가 처리시간 기록

지식베이스
- GET /api/admin/knowledge/docs, POST (multipart: file, kind, facilityIds[]), DELETE /:id
- GET /api/admin/knowledge/pending, PUT /:id `{ action:"approve|reject|edit", question, answer }`
- GET /api/admin/knowledge/index-status, POST /api/admin/knowledge/reindex

FAQ
- GET /api/admin/faq, POST, PUT /:id, DELETE /:id

시설
- GET /api/admin/facilities, GET /:id, POST, PUT /:id
- GET /api/admin/facilities/:id/logs → 최근 운영 로그
- POST /api/admin/facilities/:id/reservation-test → 연동 상태 확인

예약 현황
- GET /api/admin/reservations?facilityId=&from=&to= → `{ slots:[{ date, hour, status:"open|booked|full|maintenance" }], syncedAt }`

분석
- GET /api/admin/analytics/:tab?range= tab = auto | nps | handoff | accuracy. 각각 `{ trend, breakdown:{ byFacility[], byHour[][], byLang[], byType[] }, rows[] }`
- GET /api/admin/analytics/:tab/export?range= → CSV

사용자
- GET /api/admin/users, POST /invite, PUT /:id, DELETE /:id

설정
- GET /api/admin/settings, PUT /api/admin/settings/:tab (org | policy | lang | channel | alert)

## 에러

`{ "error": { "code": "NOT_FOUND", "message": "사용자에게 보여줄 문장" } }`. 401 이면 프론트가 /admin/login 으로 보낸다. message 는 그대로 Toast 에 띄우므로 사용자 문장으로 쓴다.

## 배포 시 (cross-origin)

프론트 Vercel, 백엔드 Render 면 쿠키 `sameSite:'none', secure:true`, express `trust proxy 1`, `NODE_ENV=production`, CORS origin 정확히(끝 슬래시 없음), `credentials:true`. 프론트 fetch 는 `credentials:'include'`.
