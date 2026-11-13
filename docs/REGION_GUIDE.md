# 새 시군 추가 방법

미리는 시군 한 곳의 자료와 이름을 지역 설정 파일 하나에 모아 두고, 앱 전체가 지금 고른 지역 설정 하나만 읽는다. 기본 지역은 동해시이고, 삼척시 설정은 두 번째 지역이 파일 하나로 켜지는지 확인하려고 넣은 견본이다.

## 1. 구조

| 파일 | 내용 |
| --- | --- |
| `client/src/regions/index.js` | 지역 등록부(REGIONS), 지역 고르기, 설정 검사(validateRegion) |
| `client/src/regions/donghae.js` | 동해시 설정. 실제 공개 자료 파일(`mock/donghaeData.js`, `mock/geoDonghae.js`, `mock/villageTerrain.js`, `data/roadRoutes.js`, `data/forestFireHistory.js`)을 가리키고 시나리오, 시연 서류, 훈련 기록, 차량 배치, 기관 이름을 담음 |
| `client/src/regions/samcheok.js` | 삼척시 견본 설정. 행정동 이름과 코드, 경계만 실제 자료이고 나머지는 시험용 가상 자료 |
| `client/src/regions/samcheok.geo.js` | 삼척시 행정동 경계(자동 생성) |
| `client/src/regions/data.js` | 현재 지역 자료를 예전 이름(TEMP_SHELTERS, VILLAGES 등)으로 내보내는 연결 파일 |
| `client/scripts/build-region-geo.mjs` | 시군 코드로 행정동 경계 파일을 만드는 도구 |
| `client/tests/region.test.mjs` | 지역 설정 검사, 두 지역 전환, 지역 간 자료 섞임 시험 |

화면과 계산 모듈은 `regions/data.js` 또는 `regions/index.js` 의 `REGION` 만 읽는다. `mock/donghaeData.js` 를 직접 읽는 화면 코드는 없다(시험 파일과 동해시 설정 파일만 읽음).

## 2. 지역 고르기

우선순위는 다음과 같다.

1. 주소 인자 `?region=samcheok`. 한 번 열면 그 탭에서는 주소를 옮겨도 유지됨(탭 저장소 `miri:region`)
2. 빌드 환경 변수 `VITE_REGION=samcheok`
3. 서버 함수와 시험은 환경 변수 `MIRI_REGION=samcheok`
4. 지정이 없거나 등록되지 않은 이름이면 동해시

웹 작업자(추천 배정 계산)는 주소를 읽지 못하므로 작업자 이름에 지역을 실어 넘긴다(`useBoardingRecommended.js`). 공공데이터 조회는 기본 지역이 아니면 `/api/opendata?kind=...&region=<id>` 로 부르고, 응답의 `region` 이름표가 현재 지역과 다르면 화면에 쓰지 않는다.

## 3. 필요한 자료

| 칸 | 자료 | 받는 곳 |
| --- | --- | --- |
| `codes.sgg`, `codes.sido`, `codes.sigungu` | 시군구 코드 5자리 | 행정안전부 행정표준코드(법정동 코드) |
| `codes.openGov`, `openData.ambulanceOrg` | 개방자치단체코드 | 행정안전부 지방행정 인허가 자료 |
| `map.dongGeo`, `map.bbox`, `map.outline` | 행정동 경계 | vuski/admdongkor 행정동 경계(통계청 경계 가공본) |
| `map.weatherPoint` | 시청 위경도 | 시청 누리집 또는 OpenStreetMap |
| `dongs` | 행정동 이름과 영문 2자 코드 | 행정동 경계 자료 |
| `data.VILLAGES` | 법정동 마을, 집결지 경로당 좌표, 추정 대상자 수, 대피소별 주행 시간 | 공공데이터포털 마을회관및경로당 표준데이터, KOSIS 주민등록인구, 건축HUB 건축물 통계, OSRM 도로 주행 시간 |
| `data.TEMP_SHELTERS` | 이재민 임시주거시설 | 행정안전부 국민재난안전포털 `acmdfcltyList_<시군구 코드>.json` |
| `data.LTC`, `data.DONG_STATS` | 장기요양 등급 판정과 급여이용, 행정동 인구 | KOSIS(국민건강보험공단 노인장기요양보험통계, 행정안전부 주민등록인구) |
| `data.LTC_RESIDENTIAL`, `data.LTC_DAYCARE` | 노인요양시설, 주야간보호기관 정원과 현원 | 국민건강보험공단 장기요양기관 검색 |
| `data.DONG_CENTERS` | 행정복지센터 위치 | 시청 누리집 |
| `terrain` | 마을 고도, 바다 거리, 경사 | 수치표고모델(지진해일, 침수, 산사태, 대설 시나리오에 필요) |
| `roads` | 마을과 대피소 사이 도로 경로 | 카카오모빌리티 길찾기(없으면 직선으로 표시) |
| `fireHistory` | 산불 이력 | 산림청 산불통계데이터(공공데이터포털 15121380)에서 그 시군 행 |
| `org` | 기관명, 시장, 담당 부서, 시청, 관할 소방서, 우편번호, 주소, 전화 앞자리 | 시청 누리집 |
| `fleet` | 차종별 차량의 소속 동 | 기관 조사(조사 전에는 가정값으로 두고 화면에 가정이라 표시) |
| `scenarios` | 재난 시나리오 정의 | 지역 재난 기록과 보도 |
| `openData` | 공공데이터 조회 인자(산불위험예보 시군 코드, 주소 검색어, 응급실 시군 이름 등) | 각 오픈 API 명세 |

자료가 아직 없는 칸은 지어내지 않는다. 비워 두거나 `sample: true` 와 "시험용 가상 자료" 표시를 단 최소 견본으로 둔다. `codes.openGov` 처럼 비워 둔 공공데이터 인자는 서버가 상류를 부르지 않고 `503 REGION` 으로 돌려준다.

## 4. 추가 절차

1. 행정동 경계 파일 만들기

   ```
   cd client
   node scripts/build-region-geo.mjs <시군구 코드> src/regions/<id>.geo.js <행정동코드>=<영문2자>,...
   ```

   지금 원본(`mock/geoRegion.js`)은 동해시와 접경 시군(강릉, 삼척, 정선, 태백)만 담는다. 그 밖의 시군은 같은 vuski 원본 GeoJSON 에서 시군 코드로 걸러 넣는다.

2. `src/regions/<id>.js` 만들기. `samcheok.js` 를 복사해 칸을 채운다. 실제 공개 자료를 받으면 `scripts/build-donghae-data.mjs` 처럼 그 시군용 생성 스크립트를 만들어 `mock/<id>Data.js` 를 만들고 설정에서 가리킨다.

3. `src/regions/index.js` 의 `REGIONS` 에 한 줄 추가

   ```js
   import gangneung from './gangneung.js'
   export const REGIONS = { donghae, samcheok, gangneung }
   ```

4. 검사

   ```
   cd client
   npm test
   MIRI_REGION=<id> node -e "import('./src/regions/index.js').then(m => console.log(m.validateRegion(m.REGION)))"
   ```

   `validateRegion` 은 필수 칸 누락, 시군구 코드 자릿수, 지도 범위 순서, 마을과 대피소와 차량의 동이 이 지역 동 목록 안에 있는지, 마을 코드 중복, 시작 시나리오 존재를 본다. 빈 배열 `[]` 이 나와야 한다.

5. 화면 확인. 개발 서버를 띄우고 `http://localhost:5173/console?region=<id>` 를 연다. 운영 기준의 기관과 사용자 탭에서 기관명과 행정동 목록, 상황판 2D 지도에서 시군 경계를 본다.

## 5. 아직 동해시 전용으로 남은 부분

| 위치 | 내용 | 다른 지역에서 보이는 모습 |
| --- | --- | --- |
| `src/three/Region3D.js`, `src/mock/geoRegion.js`, `src/three/proj.js` | 3D 지도의 지형, 바탕 사진, 건물, 첫 카메라 위치가 동해시와 접경 5개 시군 범위로 구워져 있음 | 삼척시는 범위 안이라 지형은 보이나 첫 화면이 동해시 쪽을 비춤. 범위 밖 시군은 3D 자료를 새로 구워야 함 |
| `src/mock/geoPlaces.js` | 3D 지명(OpenStreetMap) | 같은 5개 시군 범위 |
| `src/lib/docTemplates.js` | 공문 서식의 "안전과", "안전과장" 부서 이름 | 동해시 부서 이름 그대로 |
| `src/lib/handoverDoc.js` | 인수인계 문서의 작업 이력과 자료 출처(동해시 기록) | 이력 문서라 그대로 둠. 대상 지역 한 줄만 지역 설정을 읽음 |
| `src/mock/realReadings.js`, `src/lib/shortage.js` | 동해시 면담과 실제 서류 판독 예시 | 근거 기록이라 그대로 둠 |
| `src/store/useWorkspaceStore.js` | 문서함 견본 제목 | 동해시 견본 그대로 |
| `api/_ncp.js` | 서류 판독 가림 처리에서 지우지 않을 낱말 목록에 "동해" | 다른 시군 이름은 가림 대상이 될 수 있음 |
| `api/opendata.js` `parseAlerts` 기본값 | 함수 기본 인자 '동해시'(서버 호출은 지역 인자를 넘김) | 서버 경로에서는 영향 없음 |

## 6. 동해시에 고정돼 있던 곳(정리 전 ncp-move2, d961121 기준)

코드 줄 137곳(주석 줄 제외, 파일 40개)과 지역 자료 파일 6개(`mock/donghaeData.js`, `mock/geoDonghae.js`, `mock/geoRegion.js`, `mock/geoPlaces.js`, `mock/villageTerrain.js`, `data/roadRoutes.js`). 아래 줄 번호는 정리 전 기준이다.

| 묶음 | 파일과 줄 | 바꾼 방법 |
| --- | --- | --- |
| 행정동과 마을, 대피소, 시설 자료 | `mock/seed.js` 13, 14, 19~23 / `lib/geo.js` 5, 6 / `lib/docVars.js` 11 / `lib/shortageCalc.js` 8 / `lib/rosterCount.js` 4 / `lib/dataNotes.js` 5 / `components/miri/RosterPrint.jsx` 7 / `pages/console/MapPage.jsx` 26 / `ShortagePage.jsx` 34 / `SettingsPage.jsx` 17 / `api/open.js` 10 | `regions/data.js` 로 읽음 |
| 지도 중심과 범위, 동 경계 | `lib/geo.js` 5, 9 / `components/map/MapCanvas.jsx` 10, 27, 33, 309 / `components/miri/RosterMap.jsx` 7, 23 / `three/Region3D.js` 11, 18, 20 | `REGION.map` 으로 읽음(MapCanvas, RosterMap 은 geo.js 를 거쳐 바뀜) |
| 차량 기본값 | `mock/seed.js` 183~199 | `REGION.fleet` |
| 명부 시연 자료(시나리오, 서류, 훈련 기록, 이상 탐지 마을) | `mock/seed.js` 47, 48, 165~170, 222~266, 276~334 | `REGION.scenarios`, `intakeDocs`, `sampleUpload`, `drills`, `demo` |
| 도로 경로, 지형, 산불 이력 | `lib/tripChecks.js` 6 / `mock/seed.js` 14 / `components/miri/PublicFactsCard.jsx` 7 | `REGION.roads`, `terrain`, `fireHistory` |
| 공공데이터 시군 인자 | `api/opendata.js` 19, 20, 26, 34, 45, 63, 87, 127, 132, 142, 151, 153, 227 | `REGION.openData`, `?region=` 인자 |
| 기관명과 문서 출력 | `mock/seed.js` 31 / `lib/api.js` 5 / `lib/docVars.js` 82 / `lib/docTemplates.js` 36, 37, 51, 65, 67, 111, 124, 147, 184, 202, 213, 242, 244, 288, 289, 290, 340, 357, 432, 433, 434, 438 / `pages/workspace/DocEditor.jsx` 521, 872 / `pages/public/PrivacyPage.jsx` 14, 122, 167 / `lib/handoverDoc.js` 32 | `REGION.org` |
| 화면 문구의 시군과 소방서 이름 | `components/miri/PublicFactsCard.jsx` 20~45 / `OpenDataCard.jsx` 16 / `FireRiskStrip.jsx` 50, 76 / `DisasterAlertsCard.jsx` 17, 22, 33 / `components/map/Map3D.jsx` 47, 80 / `LayerPanel.jsx` 69 / `MapCanvas.jsx` 527 / `pages/console/OverviewPage.jsx` 82 / `RosterPage.jsx` 306 / `HandoverPage.jsx` 215 / `DispatchPage.jsx` 458, 513 / `MapPage.jsx` 62, 366 / `SettingsPage.jsx` 42, 50, 121, 133 / `mobile/field/FieldScreens.jsx` 94, 108, 556, 560, 562 / `store/useDispatchStore.js` 370, 379 / `lib/confirmSummary.js` 22 / `lib/rosterCount.js` 51 | `REGION.name`, `shortName`, `org.fire` |
| 동 담당자 데모 계정 | `store/useAuthStore.js` 13 | `REGION.demo.dongUser` |
| 공공데이터 마지막 정상 수신 보관 이름 | `lib/freshness.js` 53 | 기본 지역 외에는 지역 이름표를 붙여 따로 보관 |
| 동 범위 거르기 | `api/_scope.js` | 동 코드 영문 2자 규칙만 써서 지역과 무관. 설정 검사가 같은 규칙(영문 대문자 2자)을 강제 |
| 남겨 둔 곳 | 5절 표 | 그대로 |

동해시 기준 수치(대상 848명, 기준 배정 이동 불가 291명, 추천 배정 267명 등)와 산식은 바꾸지 않았다. 정리 전후 `buildSeed()` 결과 전체와 문서 서식 출력의 해시가 같음을 확인했고, 기존 시험 336개가 모두 통과한다.
