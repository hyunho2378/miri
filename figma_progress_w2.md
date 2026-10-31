# figma_progress_w2.md (작업자 W2, Foundations 페이지, 2026. 11. 1.)
레퍼런스: AX.S Public GitLab Rebuild_DS 의 Foundations 6페이지(개요, 색상, 타이포그래피, 레이아웃, 형태와 고도, 아이콘). 구성은 같고 문장과 값은 미리 것.
- 구성: 짙은 회색 섹션 안에 흰 문서 프레임(폭 1016). 위에 남색 헤더(제목 type/display, 설명 type/body), 아래 본문(안쪽 여백 64, 블록 간격 64, 블록 제목 type/h2, 설명 type/body, 회색 견본 패널, 값 표).
- Foundations / Typography: 스타일가이드_타이포그래피 13:4. 글꼴과 굵기, 스타일 사다리 12개, 값 표(데스크톱, 모바일).
- Foundations / Spacing and Layout: 스타일가이드_레이아웃 13:239. 간격 막대 14개(폭을 space 변수에 연결), 뼈대 치수 표, 페이지 좌우 여백 표, 브레이크포인트 표.
- Foundations / Radius and Elevation: 스타일가이드_형태 13:564, 스타일가이드_고도 13:666. 반경 견본 6개(Radius 변수 연결), 코드 사용 횟수 표, 그림자 견본 3개(효과 스타일 적용).
- Foundations / Iconography: 스타일가이드_아이콘 13:688. 크기 5단계, 콘솔 전사본에서 모은 아이콘 44개와 사용 횟수.
- Foundations / Color: 스타일가이드_색상(Primitive 50, Color 44 견본, 대비 표). 부모가 만든 Color / Semantic 프레임은 같은 섹션에 보존.
- 못 한 것: Foundations / Overview 페이지는 빈 페이지만 만듦.
- 알려진 불일치: tokens.js topbar 56, sidebar 240 대 화면 실측 64, 220(표에 둘 다 적음). type/count 10px 는 12 미만 규칙과 충돌(사용자 결정 대기).
