# figma_progress_console_wip.md (작업자 C, 2026. 11. 1.)
페이지 'Screens / Console WIP'. 부모가 'Screens / Console'로 합치고 Breakpoint 변형 세트로 묶는다. push, 배포 없음(D-03). 코드 수정 없음.

## 만든 것 (섹션 16개, 프레임 28개, 겹침 0)
- 콘솔 12화면 x 폭 1920과 1024 = 24개. 이름 'Console / C-01 Overview / 1920' 형식.
- 추가 4개(폭 1440): C-00 Login, C-11 RecordDetail(/console/records/R-1792026000000, 이송 기록 첫 줄을 눌러 들어감), P-01 OpenApi, P-02 Privacy.
- 후처리: responsive 1522곳, charts 1, tables 11, sections 16.
- 노드 id 전체: 세션 tmp/c/ids.json

## 못 한 것
- C-04 Map 지도 이미지(Map / Terrain) 깔기: 안 함. 1920, 1024 상황판은 지도 칸이 비어 있음(좌측 패널과 라벨만).
- 홈 막대 그래프 Hug 높이 보정: 안 함(1920, 1024 모두 해당 가능성).
- H.diff 픽셀 차이 표: 안 만듦.
- P-01 OpenApi는 첫 호출이 시간 초과였으나 프레임은 생김. 앱 쪽 /open 로딩이 느림(수십 초).
- 로그인(C-00)은 목업이 시 관리자로 시작해도 /console/login 이 열려 전사됨.
