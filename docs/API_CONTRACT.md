# API_CONTRACT.md 미리 데이터와 계산과 API 계약

작성일 2026년 10월 2일. 프론트(client)는 VITE_USE_MOCK=true에서 lib/api.js mock 라우터로 이 계약을 흉내냄. 백엔드가 붙으면 VITE_API_URL만 교체.

## 1. 구성

| 영역 | 기본값 | 비고 |
|------|--------|------|
| 프론트 | React 18 + Vite + JSX + Tailwind, Vercel | G-Chat 그대로 |
| 백엔드 | Node.js + Express, Render | 스킬 기본값. 계획서 PDF는 FastAPI. 확정 필요 (PROGRESS 확인 필요 4) |
| DB | PostgreSQL (Neon) | 비파괴 시드, DROP 금지 |
| AI 판독 | 멀티모달 LLM API, 서버 호출만 | 키는 서버 환경변수. 프론트 노출 금지 |
| 배정 최적화 | lib/assign.js 순수 함수 | 프론트와 서버 공용. mock 모드에서도 실제 계산 |
| 이상 탐지 | lib/anomaly.js 순수 함수 | 같은 방식 |

계산 로직(부족분, 배정, 이상 탐지)은 서버 없이 동작. 시연 안정성과 재현성 확보 목적. LLM 판독만 서버 의존이며 mock 모드에서는 고정 판독 결과 반환.

## 2. 데이터 모델

모든 id는 문자열 코드. 대상자 이름 주소 연락처 필드 없음 (SOURCE B 개인정보 설계). 가상 데이터는 `isMock: true`.

```js
Dong        { code: 'MS', name: '망상동' }                        // 동해시 행정동 10개
Village     { code: 'MS-03', dongCode: 'MS', label: '망상동 가상마을 3', forestAdjacent: true, shelterCode: 'SH-02' }
Shelter     { code: 'SH-02', name: '가상 대피소 2', dongCode: 'MS' }
RoundTrip   { villageCode: 'MS-03', shelterCode: 'SH-02', minutes: 50 } // 마을에서 대피소 왕복, 승차 하차 포함
Person      { code: 'MS-03-017', villageCode: 'MS-03', grade: 'bed'|'wheelchair'|'assist'|'walk',
              tags: ['oxygen','guardian'], gradeSource: 'ai'|'manual', review: 'pending'|'confirmed'|'edited'|'rejected',
              docId: 'DOC-0012' | null, updatedAt }
VehicleType { key: 'ambulance'|'bedVan'|'liftVan'|'car'|'bus', label, capacity: { bed: 1, wheelchair: 0, assist: 0, walk: 0 } }
Vehicle     { code: 'V-07', type: 'liftVan', owner: 'fire'|'city'|'facility'|'contract', contractUntil, baseDong, available: true }
Helper      { code: 'H-031', villages: ['MS-03'], grades: ['assist','walk'], channel: 'sms', lastAck }
Scenario    { id, name, arrivals: { 'MS-03': '2026-04-05T14:00' } | { all: '+8h' }, prepMinutes: 60, windowHours: 8, completeBeforeHours: 0, extraVehicles: { liftVan: 2 } }
Dispatch    { id, kind: 'real'|'drill', status: 'standby'|'assigned'|'sent'|'moving'|'closed', startedAt, closedAt, arrivals }
Assignment  { dispatchId, vehicleCode, helperCode, trips: [ { index: 1, personCodes: [...], departAt, finishAt } ], reasons: [...] }
Ack         { dispatchId, helperCode, answer: 'accept'|'decline'|'none', reason, at }
StepEvent   { dispatchId, personCode, step: 'depart'|'arrive'|'board'|'handover'|'fail', reason, memo, at }
Handover    { dispatchId, personCodes: [...], sentAt, receiver: '동해소방서' }
IntakeDoc   { id, kind: 'plan'|'card'|'etc', pages, status: 'reading'|'pending'|'done', results: [IntakeResult] }
IntakeResult{ docId, personCode, grade, tags, quote, quoteMatched: true, confidence: 'high'|'mid'|'low', cropBox }
```

차종 탑승 정원(capacity)은 등급별 한 번에 태우는 인원. 기본값은 설정 화면에서 수정. 원문 공식은 정원 1 가정이라 정원 변수를 추가함 (3절).

## 3. 부족분 계산 (lib/shortage.js)

### 3.1 원문 공식 (SOURCE B 문자 그대로)

- 부족분은 대상자 수에서 8시간 안 이송 가능 인원을 뺀 값
- 이송 가능 인원은 보유 차량 수에 왕복 가능 횟수를 곱한 값
- 왕복 가능 횟수는 준비 1시간을 뺀 7시간을 왕복 시간으로 나눈 값
- 계산 예시: 침상 환자 12명에 침상 차량 2대이고 왕복 2시간이면 이송 가능 인원 6명으로 부족분 6명

### 3.2 구현식

```
발령 기한 D = 도달 예측 − windowHours                      // 기본 도달 8시간 전
이송 완료 기한 E = 도달 예측 − completeBeforeHours         // 기본 도달 시각
가용 시간 W = (E − D) − prepMinutes                         // 기본 480 − 60 = 420분
왕복 가능 횟수 trips(v, 마을) = floor(W ÷ roundTrip(마을))     // 소수 버림. 예시 7 ÷ 2 = 3.5 → 3
등급 g 이송 가능 인원 = Σ (g 호환 차량 v) trips × capacity(v, g)
등급 g 부족분 = max(0, 대상자 수(g) − 이송 가능 인원(g))
```

- 원문 예시 재현 검증 필수: 침상 12명, 침상 차량 2대(정원 1), 왕복 120분 → trips 3 → 이송 가능 6 → 부족분 6. 단위 테스트 1번 케이스
- 마을별 계산은 차량을 마을 사이에 공유하므로 단순 합산이 과대 추정. 마을별 부족분 화면값은 4.2 배정 결과의 미이송자 수를 사용하고, 3.2식은 등급 단위 상한 추정과 필요 추가 차량 산출에만 사용
- 필요 추가 차량 = 등급 g 부족분 ÷ (trips × capacity) 올림. 차종은 g 호환 차종 중 설정 우선순위 첫 번째
- 확인 대기 판독 건은 계산에 포함하되 provisional 건수로 따로 반환

### 3.3 미확정 사항

- 8시간 창의 끝: 산불 도달 시각까지인지, 위험구역 전 주민 대피(도달 5시간 전)까지인지. 원문 공식이 7시간(8 − 준비 1)을 쓰므로 completeBeforeHours 0 기본. 5로 바꾸면 가용 시간이 2시간으로 줄어 부족분이 크게 늘어남. 동해시 담당자 확인 항목
- 차종별 정원과 호환표: 동해소방서와 요양시설 자문 전 가정값. 화면에 "가정값" 표기

## 4. AI 기능

### 4.1 서류 판독 (멀티모달 LLM)

목적. 종이 대피계획서와 대피카드의 수기 정보를 이송 등급과 특이사항으로 구조화. 사람이 한 건씩 옮겨 적는 반복 노동 대체.

처리 순서.
1. 업로드 문서 페이지 이미지화
2. LLM 호출 1회당 1페이지. 출력은 JSON 스키마 강제
3. 원문 대조: 판정 근거 문구(quote)가 같은 응답의 전사문(transcript)에 문자 그대로 있는지 서버가 검사. 없으면 quoteMatched false, confidence low 강제
4. 규칙 대조: 특이사항과 등급 모순(예: 등급 도보인데 "누운 상태" 문구) 감지 시 confidence 한 단계 하향
5. 결과는 review pending으로 저장. 담당자 확인 전 확정 아님

출력 스키마.
```json
{
  "transcript": "페이지 전체 전사문",
  "persons": [
    { "personHint": "문서 안 대상자 구분 표기", "grade": "bed|wheelchair|assist|walk|unknown",
      "tags": ["oxygen","guardian","dementia","hearing"], "quote": "판정 근거 원문 문구",
      "confidence": "high|mid|low", "box": [x, y, w, h] }
  ]
}
```

프롬프트 규칙.
- 등급 정의는 SOURCE B 이송 등급 표 문구 그대로 시스템 프롬프트에 포함
- 근거 문구가 없으면 grade unknown. 추측 금지
- 이름 주소 연락처는 출력하지 않음 (personHint는 문서 내 순번 등 비식별 표기)

평가 (Deliver 단계). 가상 대피계획서 정답셋 대비 등급 일치율, unknown 비율, 근거 불일치 비율, 담당자 수정률.

### 4.2 배정 최적화 (lib/assign.js)

목적. 제한된 차량과 도우미로 기한 안에 최대한 많은 사람을, 이송 난도가 높은 사람부터 옮기는 조합 탐색. 규칙 순서 정렬만으로는 차량 공유, 회차, 마을별 기한 차이를 동시에 다루지 못함.

입력. 대상자(확정 + 잠정), 차량, 도우미, 왕복 시간표, 마을별 발령 기한 D와 이송 완료 기한 E(3.2), 준비 시간.

제약.
- 차량은 호환 등급만, 회차당 정원 이내
- 회차는 순차. 다음 회차 출발 = 이전 회차 완료
- 첫 회차 출발 ≥ 발령 시각 + 준비 시간
- 각 회차의 완료 시각 ≤ 해당 회차 대상자 마을의 이송 완료 기한 E
- 도우미는 지원 가능 등급과 담당 마을 우선, 한 시점에 차량 하나
- 휠체어 2명 도우미, 침상은 구급대원 조건 (SOURCE B 표). 구급대원은 소방 차량 탑승 인력으로 가정

목적함수 (사전식 우선순위).
1. 등급 가중 미이송 최소화 (침상 4, 휠체어 3, 부축 2, 도보 1)
2. 미이송 인원 최소화
3. 마지막 이송 완료 시각 최소화
4. 도우미 부담 편차 최소화

방법.
1. 기준선(baseline): SOURCE B 배정 규칙 그대로. 침상부터 도보 순, 같은 등급 안 도달 시각 빠른 마을 우선, 차량은 가용 순 탐욕 배정
2. 최적화: 기준선을 초기해로 두고 지역 탐색(대상자 이동, 교환, 회차 재구성) 반복. 시드 고정으로 같은 입력이면 같은 결과
3. 시간 상한 2초(브라우저). 상한 도달 시 그때까지 최선 해 반환
4. 결과에 기준선 대비 지표 차이와 묶음별 사유 생성. 사유는 계산 과정의 사실만 문장화(템플릿). LLM 생성 문장 아님

출력.
```js
{ assignments: [Assignment], unassigned: [{ personCode, reason: 'capacity'|'deadline'|'noCompatibleVehicle' }],
  metrics: { weightedUnserved, unserved, lastFinishAt, helperLoadStd },
  baseline: { metrics }, diff: { unserved: -4, lastFinishMinutes: -35 } }
```

검증. 원문 예시(3.1)에서 기준선과 최적화 모두 미이송 6. 차량이 마을 사이에 공유되는 가상 시나리오에서 최적화가 기준선보다 나쁘지 않음(단위 테스트로 보장, 초기해가 기준선이므로).

정직성 규칙. 화면에서 "AI 배정"으로 부르되 설명 문구는 "제약 조건 최적화"로 표기. 결과가 기준선과 같으면 같다고 표기.

### 4.3 이상 탐지 (lib/anomaly.js)

| 규칙 | 감지 조건 | 조치 링크 |
|------|----------|----------|
| 판독 장기 미확인 | review pending 14일 경과 | 서류 판독 |
| 등급 특이사항 모순 | 도보 또는 부축인데 tags에 bedridden | 대상자 명부 |
| 중복 의심 | 같은 마을, 같은 문서 위치, 같은 등급 2건 이상 | 대상자 명부 |
| 협약 만료 임박 | contractUntil 30일 이내 | 차량과 도우미 |
| 도우미 과다 배정 | 담당 대상자 수 > 가용 시간 안 처리 가능 수 | 차량과 도우미 |
| 기한 초과 예상 | 발령 중 마을의 마지막 finishAt > 이송 완료 기한 E | 발령 운영 |
| 무응답 도우미 | 전송 후 10분 무응답 | 발령 운영 |

규칙 기반 탐지임을 화면 설명에 명시. 임계값은 설정 화면 값.

## 5. 엔드포인트

공통. JSON. 인증은 httpOnly 쿠키 세션. 오류는 `{ error: { code, message } }`와 HTTP 상태. 서버 오류를 빈 배열로 위장 금지.

| 메서드 | 경로 | 역할 |
|--------|------|------|
| POST | /api/auth/login | 로그인 |
| POST | /api/auth/logout | 로그아웃 |
| GET | /api/me | 현재 사용자와 role |
| GET | /api/dongs, /api/villages, /api/shelters, /api/roundtrips | 기준 데이터 |
| GET POST PATCH | /api/persons | 명부. dong 담당자는 본인 동만 |
| GET POST PATCH | /api/vehicles, /api/helpers | 자원 |
| GET POST | /api/scenarios | 부족분 시나리오 |
| POST | /api/intake/docs | 문서 업로드, 판독 시작 |
| GET | /api/intake/docs/:id | 판독 진행과 결과 |
| POST | /api/intake/results/:id/review | 확인 / 수정 / 반려 |
| POST | /api/dispatches | 발령 개시 (city) |
| PATCH | /api/dispatches/:id | 도달 예측 갱신, 상태 전이 |
| POST | /api/dispatches/:id/assignments | 배정 확정 저장 |
| POST | /api/dispatches/:id/send | 도우미 링크 발송 (mock은 로그) |
| GET | /api/dispatches/:id/live | 실시간 현황 (5초 폴링. SSE는 2차) |
| POST | /api/dispatches/:id/handover | 소방 인계 기록 |
| POST | /api/dispatches/:id/close | 종료. 도우미 토큰 무효화, 도우미 노출 정보 삭제 |
| GET | /api/h/:token | 도우미 배정 조회 |
| POST | /api/h/:token/ack | 수락 또는 불가 |
| POST | /api/h/:token/steps | 단계 보고, 실패 보고 |

## 6. 가상 데이터 (client/src/mock)

- 동 10개는 실제 행정동 이름. 마을은 "가상마을 N" 표기로 실제 마을명 사용 안 함
- 산림 연접 마을 수 18은 SOURCE A 5절 수치. 마을 18개 생성
- 대상자 수와 등급 분포는 가상 값. 실제 통계로 오인되지 않게 화면에 가상 데이터 배지
- 차량 6대는 소방 구급차 수 SOURCE A 5절 수치. 그 외 시청, 시설, 협약 차량은 가상
- 생성 스크립트는 고정 시드. 재생성 시 같은 결과. 파일 상단 주석에 생성 규칙 기록
- 가상 대피계획서 이미지 세트와 정답 JSON은 AI 판독 평가용으로 별도 폴더 (client/src/mock/intake/)
