# 플랫폼 서비스 API 조사

> **확인일: 2026. 10. 19.** 플랫폼 상단에 서비스 이용기간 0일이 표시됐다. 본 문서는 카탈로그를 읽기 전용으로 조사했으며 API를 신청하거나 호출하지 않았다. 승인 상태와 이용 조건은 확인되지 않았다. 아래 링크는 플랫폼 카탈로그가 연결한 원본 제공처 문서다.

## 조사 범위

`https://digitalsolveup.kr/service-api` 목록의 8개 분류, 47개 항목을 확인했다. 플랫폼에는 세부 호출 명세가 거의 없고 원본 서비스 문서 링크가 제공된다. 필드 및 갱신 주기 및 승인 여부는 해당 원본 문서에서 확인해야 한다.

## 기존 미리 API와의 구분

| 플랫폼 분류 / 항목 | 미리 코드 상태 | 미리 적용 지점과 판단 |
|---|---|---|
| 지도: 네이버 맵, 카카오 맵, 구글 맵, TMAP | **새로 가능** | 현재 상황판은 기존 지도 구현을 사용한다. 플랫폼 카탈로그 API를 직접 호출하는 기능은 확인하지 못했다. 다른 지도 API를 연결하기 전 기존 지도와 중복, 비용, 접근성, 동해시 범위를 비교한다. |
| 지하철 밀집도 6종 | **해당 없음** | 동해시의 재난취약자 차량 이송 배정에는 직접 적용 근거가 없다. |
| 장소 및 상권 혼잡도 6종 | **새로 가능, 우선순위 낮음** | 혼잡 보조 정보로 검토 가능하나 대피로 통행 가능성 또는 이송 완료 시각을 보장하지 않는다. |
| 간편 인증 4종: 모바일 신분증, 토스, 카카오톡, 통합인증 | **새로 가능, 보류** | 실제 담당자 인증 체계와 기관 협의가 없으므로 현재 보강 범위에는 넣지 않는다. |
| 간편 로그인 4종: 네이버, 카카오, 구글, GitHub | **해당 없음 또는 보류** | 현재 서비스는 시연 로그인 구조를 사용한다. 실제 공공기관 인증으로 간주하지 않는다. |
| 교통 7종: 대중교통 경로, 교통정보, 경로안내, CCTV, 예측 및 소통정보, 카카오 길찾기 | **새로 가능** | 상황판의 도로 및 이동 보조 정보 후보. 현재 `client/api/opendata.js`는 이 카탈로그의 API를 호출하지 않는다. OSRM 도로 왕복 시간 기반과 대조 후 사용 여부 결정. |
| 기상기후: 기상관측, OpenWeather, Windy 등 | **일부 겹침, 새로 가능** | 미리는 공공데이터포털의 기상특보와 단기예보를 `client/api/opendata.js`에서 사용한다. 카탈로그의 기상청 API Hub, OpenWeather, Windy 호출은 확인되지 않았다. |
| 인공지능: ETRI 언어 및 음성 및 이미지 분석, ChatGPT, 이미지 생성, 얼굴 인식, 공간 분류 | **일부 겹침, 새로 가능** | 서류 읽기와 현장 소식은 2026. 10. 20.부터 네이버 클라우드 국내 AI(CLOVA OCR, HyperCLOVA X HCX-005, CLOVA Speech)를 호출한다(67aa51c). 키가 없으면 503 `NO_KEY`를 반환한다. ETRI 및 OpenAI 및 SKT AI 연동은 현재 코드에서 확인하지 못했다. 얼굴 인식은 미리 목적상 사용하지 않는다. |

## 카탈로그에 표시된 52개 항목

### 지도 4종

| 항목 | 원본 문서 |
|---|---|
| 네이버 맵 | https://www.ncloud.com/product/applicationService/maps |
| 카카오 맵 | https://developers.kakao.com/product/map |
| 구글 맵 | https://console.cloud.google.com/apis/library/maps-backend.googleapis.com?pli=1&project=regal-crowbar-743 |
| TMAP | https://openapi.sk.com/products/detail?svcSeq=4&menuSeq=331 |

### 지하철 밀집도 6종

| 항목 | 원본 문서 |
|---|---|
| 진입 역 기준 열차 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=54&menuSeq=309 |
| 진입 기준 칸 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=54&menuSeq=310 |
| 진입 역 기준 칸별 하차 비율 | https://openapi.sk.com/products/detail?svcSeq=54&menuSeq=311 |
| 실시간 열차 및 칸 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=54&menuSeq=307 |
| 요일별 지하철 출구 통행자 수 | https://openapi.sk.com/products/detail?svcSeq=54&menuSeq=417 |
| 시간대별 지하철 출구 통행자 수 | https://openapi.sk.com/products/detail?svcSeq=54&menuSeq=418 |

### 장소 혼잡도 6종

| 항목 | 원본 문서 |
|---|---|
| 실시간 장소 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=56&menuSeq=302 |
| 시간대별 장소 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=56&menuSeq=303 |
| 통계성 장소 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=56&menuSeq=304 |
| 실시간 상권 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=56&menuSeq=420 |
| 시간대별 상권 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=56&menuSeq=421 |
| 통계성 상권 혼잡도 | https://openapi.sk.com/products/detail?svcSeq=56&menuSeq=422 |

### 간편 인증 4종

| 항목 | 원본 문서 |
|---|---|
| 모바일 신분증 | https://dev.mobileid.go.kr/mip/dfs/useguide/apiusemethod.do |
| 토스 인증 | https://toss.im/tosscert/docs/guides/overview |
| 카카오톡 인증 | https://business.kakao.com/info/kakaotalkwallet |
| 통합인증 | https://sign-service.inicis.com/#info |

### 간편 로그인 4종

| 항목 | 원본 문서 |
|---|---|
| 네이버 로그인 | https://developers.naver.com/docs/login/overview/overview.md |
| 카카오 로그인 | https://developers.kakao.com/product/kakaoLogin |
| 구글 로그인 | https://cloud.google.com/identity-platform/docs/web/google?hl=ko |
| GitHub 로그인 | https://gist.github.com/ninanung/2ad24c760e81401ed65f13f634a25e73 |

### 교통 7종

| 항목 | 원본 문서 |
|---|---|
| 대중교통 경로탐색 | https://openapi.sk.com/products/detail?svcSeq=59&menuSeq=392 |
| 교통 정보 | https://openapi.sk.com/products/detail?svcSeq=4&menuSeq=36 |
| 경로 안내 | https://openapi.sk.com/products/detail?svcSeq=4&menuSeq=37 |
| 교통 CCTV 영상 | https://www.its.go.kr/opendata/opendataList?service=cctv |
| 교통 예측 정보 | https://www.its.go.kr/opendata/opendataList?service=fcTraffic |
| 교통 소통 정보 | https://www.its.go.kr/opendata/opendataList?service=traffic |
| 길찾기 | https://developers.kakaomobility.com/product/api |

### 기상기후 9종

| 항목 | 원본 문서 |
|---|---|
| 기상관측 지상 및 해양 및 항공 | https://apihub.kma.go.kr/ |
| 현재 기상 데이터 | https://openweathermap.org/current |
| 세계 강수 지도 | https://openweathermap.org/api/global-precipitation-map-forecast |
| 세계 기상 알람 | https://openweathermap.org/api/push-weather-alerts |
| 태양 복사 조도 | https://openweathermap.org/api/solar-energy-prediction |
| 시간당 기상예측 | https://openweathermap.org/api/hourly-forecast |
| 날씨지도 과거 및 현재 및 예측 | https://openweathermap.org/api/weather-map-1h |
| 특정 좌표 기상예측 | https://api.windy.com/point-forecast |
| 지도 기상예측 | https://api.windy.com/map-forecast |

### 인공지능 7종

| 항목 | 원본 문서 |
|---|---|
| ETRI 언어분석 기술 | https://aiopen.etri.re.kr/guide/WiseNLU |
| ETRI 음성인식기술 | https://aiopen.etri.re.kr/guide/Recognition |
| ETRI 이미지 인식 기술 | https://aiopen.etri.re.kr/guide/od |
| ChatGPT | https://platform.openai.com/docs/guides/gpt |
| 이미지 생성 | https://platform.openai.com/docs/guides/images |
| 얼굴 인식 | https://openapi.sk.com/products/detail?svcSeq=50&menuSeq=144 |
| 공간 분류 | https://openapi.sk.com/products/detail?svcSeq=20&menuSeq=333 |

## 코드에서 확인한 기존 외부 연계

- `client/api/opendata.js`: 공공데이터포털 원본의 산불위험예보, 민방위 대피시설, 장기요양기관, 응급환자이송업, 기상특보, 단기예보를 호출한다. 이는 digitalsolveup 카탈로그 API를 경유하지 않는 직접 연계다.
- `client/api/open.js`: 미리의 개방 API. 플랫폼 서비스 API와 별개다.
- `client/api/law.js`: 법령 인용 검증 서비스 호출.
- `client/api/hwpx.js`, `parse.js`, `workspace.js`: 문서 생성 및 판독 및 저장 기능.
- `client/api/intake.js`, `note.js`, `_ncp.js`: 네이버 클라우드 국내 AI 기반 서류 읽기와 현장 소식 판독(사진은 CLOVA OCR까지만, 언어 모델에는 가린 글자만). 키가 없으면 503 `NO_KEY` 응답.
- 플랫폼의 교통, 지도, 인증, ETRI/OpenAI AI 서비스 연계는 코드에서 확인하지 못했다.

## 승인 후 기록란

| 단계 | 기록 |
|---|---|
| 플랫폼 사용 신청일과 승인일 | 확인 후 기입 |
| 원본 서비스 계정 및 키 발급 상태 | 확인 후 기입. 키 값은 기록 금지 |
| 적용 대상 데이터와 API | 승인 뒤 확정 |
| 연결 환경변수 이름 | 이름만 기입. 비밀값 금지 |
| 시험 요청 시각과 결과 | 승인 뒤 실제 결과만 기입 |
| 출처 시각 및 오류 대체 규칙 | 원본 문서 확인 뒤 기입 |

## 심사 기준별 쓰임

- 활용성: 기존 원본 API 호출과 플랫폼 카탈로그 항목을 구분하고, 승인 뒤 신규 자원을 어디에 연결할지 기록한다.
- 유용성: 도로 및 기상 및 시설 자원의 실제 값과 시각을 담당자 화면에 함께 표시한다.
- 협력성: API 사업자나 공공기관과의 협의 전에는 협력 실적으로 표현하지 않는다.
- 충실성: 세부 호출 명세가 플랫폼에 없으므로 원본 안내를 열어 검증하기 전까지 필드와 갱신 주기를 공란으로 둔다.
