# 미리 개발 안내

[README](../README.md)에서 옮긴 개발자용 안내입니다. 품질 관리, 기술 스택, 실행과 환경 변수, 배포, 개방 API, 저장소 구조, 자료 생성 스크립트, 인수인계, 참고 산출물과 라이선스를 담습니다. 서비스 설명은 [OVERVIEW.md](OVERVIEW.md)에 있습니다.

## 목차

- 품질 관리
- 기술 스택
- 개발 환경
- 참고 산출물과 라이선스

---

## 품질 관리

| 항목 | 내용 |
| --- | --- |
| 자동 시험 | `npm test` 하나로 `client/tests` 전체 266개를 돌립니다(계산 규칙, 회귀, 서버 권한, 체험 기록, 디자인 토큰, 화면 크기 규격). 푸시할 때마다 GitHub Actions(`.github/workflows/test.yml`)가 같은 시험을 돌립니다. |
| 계산 기준 | 평일 낮 발령 기준선 216명(평시 계산과 차량 조건 통일) |
| 한글 파일 | 저장 전 구조 검사(validateHwpx, kordoc 조판) |
| 배포 | main 푸시 시 Vercel 자동 배포, GitHub 커밋 상태 확인 |

---

## 기술 스택

| 영역 | 구성 |
| --- | --- |
| 화면 | React 18, Vite, Tailwind CSS, React Router, Zustand, KRDS 색과 서체(Pretendard GOV) |
| 3D 상황판 | three.js, Web Worker, Delaunator, Constrainautor, earcut |
| 2D 지도 | MapLibre GL JS |
| 한글 문서 | kordoc(HWPX 생성과 조판), 서버 서식 적용과 구조 검사 |
| 법령 | korean-law-mcp, 법제처 Open API |
| AI | 네이버 클라우드 CLOVA OCR, HyperCLOVA X HCX-005, CLOVA Speech Recognition, API Gateway |
| 서버 | Vercel 서버리스 함수(서울 icn1), Upstash Redis(문서함, 호출량) |
| 정적 배포 사본 | 네이버 클라우드 Object Storage |

- 부족분 계산과 배정: 브라우저 내 순수 함수
- 지도, 지형, 건물: 사전 생성 정적 파일

---

## 개발 환경

### 실행

```bash
git clone https://github.com/hyunho2378/miri.git
cd miri/client
npm install
npm run dev        # http://localhost:5173
npm test           # 자동 시험 266개
node --test        # 같은 266개
npm run build
```

- 개발 중 `/api` 요청: 배포 서버 전달(`VITE_API_PROXY`로 변경)
- 키 없는 실행: 시연용 자료 기반 전체 화면 동작

### 환경 변수(Vercel 서버 전용)

| 변수 | 용도 | 미설정 시 |
| --- | --- | --- |
| `NCP_OCR_INVOKE_URL`, `NCP_OCR_SECRET` | CLOVA OCR 서류 글자 인식(`api/intake.js`) | 판독 서버 미연결 안내, 내장 시연 서류로 확인 흐름 |
| `NCP_CLOVASTUDIO_KEY` | HyperCLOVA X 문구 분류(`api/intake.js`, `api/note.js`) | 같음 |
| `NCP_CSR_CLIENT_ID`, `NCP_CSR_CLIENT_SECRET` | CLOVA Speech Recognition 음성 받아쓰기(`api/note.js`) | 음성 입력 안내, 글 입력 동작 |
| `MIRI_DEMO_CODE`, `MIRI_SESSION_SECRET` | 시연 세션 발급과 서명 쿠키(`api/session.js`, `api/_guard.js`) | 비공개 경로와 AI 호출 차단 |
| `MIRI_ALLOWED_ORIGINS` | 허용 출처 목록(`api/_guard.js`) | 기본 배포 주소 |
| `UPSTASH_REDIS_REST_URL`, `UPSTASH_REDIS_REST_TOKEN` (또는 `KV_REST_API_URL`, `KV_REST_API_TOKEN`) | 문서함 저장, AI 호출량 집계 | 문서함 브라우저 저장, AI 호출 503 |
| `DATA_GO_KR_KEY` | 공공데이터포털 조회(`api/opendata.js`) | 카드별 미조회 사유 표시 |
| `SAFETYDATA_KEY` | 재난안전데이터공유플랫폼 긴급재난문자 조회(`api/opendata.js?kind=alerts`) | 재난문자 카드 승인 대기와 신청일 표시 |
| `LAW_OC`, `LAW_MCP_URL` | 법제처 Open API와 법령 서버(`api/law.js`) | 내장 핵심 법령과 공개 서버 기본값 |
| `MIRI_WS_PREFIX` | 문서함 시험용 키 접두어 | 기본값 `miri:ws` |
| `AI_LIVE` | 서류 판독과 현장 소식의 실시간 AI 호출 스위치(`api/_ncp.js`) | 기본값은 꺼짐이며, 외부 AI를 부르지 않고 저장된 판독 결과로 시연합니다 |

### 배포

| 프로젝트 | 루트 | 주소 |
| --- | --- | --- |
| miri | `client/` | miri-indol.vercel.app |
| miri-case | `case/` | miri-case.vercel.app |

### 개방 API

| 요청 | 응답 |
| --- | --- |
| `GET /api/open?kind=summary` | 동해시 기준 수치(인구, 장기요양, 임시주거시설)와 출처 |
| `GET /api/open?kind=villages` | 마을 37곳 집결지, 추정 대상자 수, 지정 대피소, 왕복 시간 |
| `GET /api/open?kind=shelters` | 이재민 임시주거시설 27곳 |
| `GET /api/open?kind=facilities` | 노인요양시설, 주야간보호, 동 행정복지센터 |
| `GET /api/open?kind=scenarios` | 확산 시나리오 목록 |
| `GET /api/open?kind=scenario&id=S-1` | 시나리오별 마을 부족분, 대피소 배정, 필요 추가 차량 |

### 저장소 구조

```text
client/            서비스
  api/             서버리스 함수(서류 판독, 현장 소식, 공공데이터 중계, 법령, 한글 문서, 문서함, 개방 API, 세션)
  src/pages/       담당자 화면(console), 문서함(workspace), 도우미 화면(helper), 공개 화면(public)
  src/lib/         부족분 계산, 배정, 이상 탐지, 인수인계서 원본
  src/three/       3D 상황판(지형, 건물, 바탕 지도, 지명)
  src/mock/        공개 자료 기반 정적 데이터와 시연용 데이터
  scripts/         공개 자료, 지형, 한글 양식 치수, 핵심 법령 생성 스크립트
  public/terrain/  지형, 바탕 지도, 건물 파일
  public/diagrams/ 도식 5종(편집 가능 HTML)
  tests/           계산 규칙과 회귀 시험
case/              사례 소개 사이트
tools/             바탕 지도와 건물 생성 스크립트
docs/              기획, 설계, 보고서, 공모전, 사용자 체험 자료
server/            백엔드 확장 자리(계약 docs/API_CONTRACT.md)
```

### 자료 생성 스크립트

| 결과 | 스크립트 |
| --- | --- |
| 동해시 공개 자료(인구, 장기요양, 대피소, 집결지, 왕복 시간) | `client/scripts/build-donghae-data.mjs` |
| 마을 지형 | `client/scripts/build-village-terrain.mjs` |
| 바탕 지도와 지명 | `tools/bake-basemap/bake.js` |
| 건물 196,111동 | `tools/bake-buildings/extract.cjs` |
| 한글 양식 치수(`hwpMetrics.json`) | `client/scripts/bake-hwp-metrics.mjs` |
| 핵심 법령 11개 1,026조문(`public/law/core.json`) | `client/scripts/bake-law-core.mjs` |

### 인수인계

| 순서 | 문서 |
| --- | --- |
| 1 | 문서함 상단 프로젝트 인수인계서(원본 `client/src/lib/handoverDoc.js`) |
| 2 | 디자인 기준 `docs/DESIGN.md`, 화면 경로 `docs/ROUTES.md`, 주의 사항 `docs/PITFALLS.md` |
| 3 | 작업 단위별 인수인계서 판 번호 갱신과 변경 이력 기록 |

---

## 참고 산출물과 라이선스

### 참고 공공 산출물(gitlab.aigov.go.kr)

| 산출물 | 작성 | 참고 내용 | 라이선스 |
| --- | --- | --- | --- |
| kordoc, korean-law-mcp, archhub-mcp | 서울특별시 광진구 류승인 | 한글 문서 생성과 조판, 법령 조회와 인용 검증, 건축물대장 | MIT |
| 표준주소실록 gjdong 제설 상황실 | 같은 작성자 | GIS건물통합정보 활용 방식, README 구성 | |
| STAY UP 현장 상황판 | 완주소방서 김무영 | 검증 상태 상단 표시, 판정 표시의 색과 모양 병행 | Apache-2.0 |

### 라이선스

| 대상 | 조건 |
| --- | --- |
| 코드 | [MIT](../LICENSE) |
| 국토교통부 GIS건물통합정보, KOSIS, 공공데이터포털 | 공공누리 출처표시 |
| OpenStreetMap | ODbL |
| vuski/admdongkor | 저장소 LICENSE-DATA |
| Mapzen, AWS Terrain Tiles | 출처 표시 |
