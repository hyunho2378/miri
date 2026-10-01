# PITFALLS.md 실전에서 터진 것과 방지책

동해사이 프로젝트 챗봇 7차 수정(2026-08-24~25)과 리브랜딩에서 실제로 발생한 문제다. 모든 작업 전에 읽는다. 여기 적힌 걸 다시 겪으면 규약 위반이다.

## 챗봇

1. **근거 열이 나중에 생기면 본문이 점프한다.** 우측 aside 를 근거 있을 때만 렌더하면 첫 카드가 뜰 때 본문 폭이 340 줄어든다. → 답변 행마다 grid 두 열을 항상 렌더한다. 근거 없어도 우측 트랙 예약.
2. **scrollIntoView smooth 는 스트리밍 중 어긋난다.** 토큰 유입으로 레이아웃이 커지는 동안 부드러운 스크롤이 목표를 놓친다. → 컨테이너를 `scrollTo({top: q.offsetTop - 24})` 직접 호출. rAF 뒤 한 번, 450ms 뒤 `behavior:'auto'` 로 재확정.
3. **자동 바닥 추적은 읽는 사람을 끌어내린다.** → 스트리밍 중 바닥 follow 제거. 새 질문만 상단 앵커. 아래로 가기 버튼은 사용자가 누른다.
4. **고정 `min-h-[85vh]` 스페이서는 완료 후 흰 여백을 남긴다.** → 동적 스페이서. 스트리밍 중 `clientHeight - (마지막답변바닥 - 마지막질문top)`, 완료 후 min(needed, 24vh, 160px). useLayoutEffect 로 paint 전 확정.
5. **스페이서를 줄이면 브라우저가 scrollTop 을 clamp 한다.** → 다음 프레임에 `min(질문앵커, maxScroll)` 로 재보정.
6. **아래로 가기 버튼이 빈 스페이서 때문에 잘못 뜬다.** → 감지는 컨테이너 바닥이 아니라 마지막 메시지 요소 기준.
7. **한글 조합 중 Enter 가 전송된다.** → `e.nativeEvent.isComposing || e.keyCode === 229` 면 return.
8. **스트리밍 중 근거 카드가 미리 떠서 흔들린다.** → `showCards = cards.length > 0 && !(streaming && isLast)`.
9. **스트리밍 중 중복 전송.** → Composer 와 칩을 streaming 동안 disabled. 훅 send 도 streaming 이면 return.
10. **답변 후 포커스가 사라진다.** → 전송 직후 focus, `useEffect(opened && !streaming → focus)`. 첫 전환은 textarea 리마운트라 후자가 잡는다.
11. **모델 마크다운이 그대로 노출된다.** 별표, 샵, 홑별표 강조, 짝 안 맞는 볼드. → lib/stripMarkdown.js 를 그대로 쓴다. 렌더러는 문단/불릿/번호/표/볼드만. react-markdown 도입 금지(토큰 밖 스타일 샘).
12. **불릿 마커를 지우면 목록이 문단이 된다.** → `* ` 를 `- ` 로 정규화만 하고 지우지 않는다.
13. **볼드 뒤 조사가 틀린다.** (무릉별유천지을) → fixJosa. 볼드 뒤 조사만 받침 판별로 교정. 범위를 볼드 뒤로 한정해 멀쩡한 문장을 안 깨뜨린다.
14. **한글이 `<0xEC>` 바이트로 깨져 온다.** llama.cpp 계열 byte-fallback. → 서버 책임. API_CONTRACT 에 명시. 프론트는 `decoder.decode(value, {stream:true})` + EOF 에 `decoder.decode()` flush.
15. **NDJSON 마지막 줄이 EOF 에서 빠진다.** → 루프 종료 후 buffer 잔여를 processLine.
16. **후속 질문("아까 그거")이 자료 없음으로 거절된다.** → history 를 매 요청에 보낸다(최근 8개). 서버 책임이지만 프론트가 안 보내면 못 한다.
17. **TopNav 와 본문 좌측 기준선이 안 맞는다.** → 헤더도 본문과 같은 컨테이너 클래스를 쓴다. 별도 px 값 금지.

## 레이아웃

18. **가로 스크롤.** 원인 대부분은 `w-screen`, 100vw + 패딩, min-w 없는 flex 자식, 히트맵 같은 넓은 표. → 넓은 것은 자기 `overflow-x-auto` 컨테이너 안에서만. flex 자식 `min-w-0`.
19. **4K 에서 콘텐츠가 늘어진다.** → max-width 유지, 여백이 늘어나는 게 정답. 폰트 clamp 상한.
20. **`transition-all`.** layout 속성까지 애니메이션돼 버벅인다. → 속성 명시.
21. **네이티브 select 가 OS 마다 다르게 보인다.** → 커스텀 Select.
22. **모바일 표가 깨진다.** → 768 미만 카드 전환. hideBelow 열 숨김.

## 데이터와 문구

23. **원문을 요약해서 넣는다.** 가장 치명적. → SOURCE.md 문자 그대로. 시드 후 3건 문자 대조.
24. **기관명 하드코딩.** 두 번째 기관에 못 판다. → VITE_ORG_NAME 과 설정값.
25. **hex 직접 입력.** 리브랜딩 때 전수 grep 해야 했다. → tokens.js 경유. index.html theme-color 1건 예외.
26. **이모지.** json 과 md 에도 숨어든다. → 전 확장자 grep.
27. **별점 리뷰수.** 공공 서비스에 안 맞고 검증 불가. → 금지.

## 배포

28. **Vercel 새로고침 404.** → client/vercel.json rewrites.
29. **cross-origin 쿠키.** 프론트 Vercel 백엔드 Render 면 `sameSite:'none'` + `secure` + `trust proxy` 전부. CORS origin 끝 슬래시 없이. 백엔드 붙을 때 API_CONTRACT 참조.
30. **환경값 하드코딩.** → .env 만. `import.meta.env.VITE_*`.

## 에이전트

31. **병렬 에이전트가 같은 파일을 만진다.** → 파일 소유 계약 명시. 기반 파일(tokens, ui/, index.css)은 1단계 단독 확정 후 아무도 수정 금지.
32. **"확인했다"로 끝낸다.** → 320/390/768/1024/1280/1440/1920/2560/3840 각 폭 캡처. 금지 항목 grep 결과를 숫자로 보고.
33. **컨텍스트 85% 넘어서 중간에 끊긴다.** → PROGRESS.md 에 완료/진행중/다음 기록 후 대기.
