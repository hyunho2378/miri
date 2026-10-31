# figma_progress.md (피그마 쪽 작업 기록)
- 2026. 11. 1. P0 시작. 파일 Miri(aWTIYw8qx594JnY9EHZYr1) 비어 있음 확인(페이지 1, 변수 0).
- 2026. 11. 1. P1~P3 토큰: 변수 컬렉션 6개 생성. Primitive 50(ios 24, m3 26), Color 42(전부 Primitive 별칭, 직접 색 0), Spacing 22, Radius 6, layout 10, Type 36(Desktop, Mobile 두 모드). 효과 스타일 shadow/sm,md,lg 3. 글자 스타일 type/* 12(크기와 행간은 Type 변수에 연결, Pretendard GOV). 이름 규칙: 코드 tokens.js 키와 같은 경로, 점(.)은 변수 이름에 못 써서 밑줄(space/0_5). 근거 파일 code_plan/tokens_resolved.json.
- 2026. 11. 1. P2 페이지 구조: Cover, Getting Started, Foundations 구분선과 4페이지(Color, Typography, Spacing and Layout, Radius and Elevation), Components 구분선과 Components, Screens 구분선과 Screens / Console, Decisions, Archive 구분선. 내용이 있는 페이지는 Foundations / Color(견본 42개, Color 변수 연결)와 Screens / Console. 나머지는 빈 상태.
- 2026. 11. 1. P5 As-is 전사(폭 1440): 콘솔 12개 화면(C-01 Overview, C-02 Intake, C-03 Roster, C-04 Map, C-05 Resources, C-06 Shortage, C-07 Dispatch, C-08 Handover, C-09 Notes, C-10 Records, C-12 Settings, C-13 Workspace). 화면 하나 = 섹션 하나. 후처리 responsive 643곳, charts 1, tables 2, sections 12, 겹침 0. 감사(PP.audit): 글자 1367개 전부 글자 스타일 없음(As-is라 아직 연결 안 함), 가운데 정렬 아님 1146 프레임, 절대 위치 174, 12 미만 글자 57, 그룹 0, 홀수 또는 소수 0, 500 굵기 0.
- 알려진 어긋남: C-01 막대 그래프. 빌더가 justify-end 칸을 Hug로 지어 바깥 상자가 72~100px, 앱은 189px. 막대 위 숫자(104, 75, 59)가 위로 넘침. 픽셀 차이 6%(홈, 전사 직후). 해결 후보: 해당 칸을 측정 높이로 고정하는 후처리.
- 아직 안 함: C-00 Login, C-11 RecordDetail(데이터 의존), 휴대폰 M-01~M-08, 공개 P-01~P-02, 폭 1920과 1024, 변형(Breakpoint, Role) 세트 묶기, 이름표(data-figma), 컴포넌트 부품(P4), 측정과 원장(P7~P9), 반응형 점검(P10).
- 열린 충돌: 수업 규칙 '12 미만 글자 금지'와 코드 tokens.js(count 10px, 모바일 caption 11px). 사용자 결정 필요.
- 2026. 11. 1. 사용자 결정 D-02: 피그마를 바꾸면 코드도 같이 바꾸고, 깃허브에도 올려 세 곳을 맞춘다. 개인 파일 확정, Aside가 직접 전사 확정.
- 2026. 11. 1. 보정: 전사 도구가 만든 보조 상자(Spacing)가 Hug 라 안의 막대 칸이 접히는 문제를 '자식 기준 높이 고정'(pinFn2)으로 해결. 홈 픽셀 차이 6.1% → 4.2%. 상황판 지도(WebGL)는 캔버스만 남기고 캡처한 이미지를 Map Page 맨 뒤 'Map / Terrain'으로 깔아 37% → 2.9%.
- 2026. 11. 1. 폭: 콘솔 12개 화면을 1024, 1440, 1920 세 폭으로 'Screens / Console'에 올림(폭마다 같은 보정). 추가 C-00 Login, C-11 RecordDetail(1440). 소개 P-01 OpenApi, P-02 Privacy는 'Screens / Public'. 휴대폰은 'Screens / Mobile'(작업자 B, 360폭 8화면, 아이폰 402폭 미작업). 작업자 C 가 만든 중복 WIP 페이지는 삭제.
- 2026. 11. 1. 부품: UI 부품 19개 컴포넌트 세트 + 아이콘 10개(작업자 D, D2). iOS 27 키트에서 Meta+c, Meta+v 복사 방식 확인.
- 2026. 11. 1. 커버: 레퍼런스(AX.S Public GitLab Rebuild_DS 커버, 노드 11043:9965)를 구조까지 읽고 같은 구성으로 제작. 알파 변수 color/alpha/inverse25, inverse75 추가, 글자 스타일 cover/* 8개. 노드 3:22512.

## 2026. 11. 1. 국내 이전 계획 문구와 시속 2km 근거 반영 (D-02 코드와 피그마 같은 값)
- 코드: client/src/mock/seed.js S-1 근거 문구(같은 경로 실측 약 시속 1.2km, 2019년 고성과 속초 시속 5.1km, 시속 2km는 그 사이 가정값, 8.2km급은 S-3), client/src/pages/public/PrivacyPage.jsx 제6조 마지막 문장 빨간 굵은 글씨(text-danger-text), client/public/diagrams/system-architecture.html 하단 빨간 문장 한 줄(docs/diagrams 사본 동일)
- 피그마: Screens / Public, P-02 Privacy, 노드 6:11517 같은 문장, Pretendard Bold, 채움 color/danger/text(VariableID:2:182) 연결, 두 줄이 되어 상위 프레임 높이 28 증가(Breakpoint=1440 3620에서 3648)
- S-1 근거 문구는 피그마 화면에 대응 요소가 없음(지도 요약 패널 문구)
