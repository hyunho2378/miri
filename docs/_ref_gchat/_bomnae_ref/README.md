# 봄내 이식 참조 원본

봄내 헬퍼(Team 5, STATION C Glocal Solverthon)에서 검증된 컴포넌트 원본이다. DESIGN_DELTA.md 의 이식 지시가 가리키는 실제 코드다. 문자 그대로 참고하되 색 라디우스 폰트 언어는 G-Chat 토큰과 DESIGN_DELTA 규칙으로 바꾼다. 봄내 도메인 문자열(춘천 라인 관광)은 가져오지 않는다.

- FieldSelect.jsx: 커스텀 셀렉트. 우리 Select 가 흡수할 디테일(아이콘+주+보조, compact, 하이라이트 이동, detail0 무애니, listbox)
- Button.jsx: ring-inset secondary
- Chip.jsx: 무보더 면색 칩
- usePopExit.js, useBodyScrollLock.js: 공유 동작 훅. 그대로 이식(tokens import 경로만 우리 것으로)
- LangContext.jsx, LangSwap.jsx: 다국어 골격. en/ko/th → ko/en/ja/zh, 기본 ko, 폭 기준 ko 로 바꿔 이식
- LangMenu.jsx → nav/LangSwitch 로. 3언어 → 4언어
