# SESSION_HEADER.md

미리(Team 오아시스)의 모든 Claude Code, Codex, Aside 작업 프롬프트는 아래로 시작함. 문서를 새로 만들거나 이름을 바꾸면 이 목록을 즉시 갱신. 이 목록에 없는 문서를 근거로 삼지 않음. docs/_ref_gchat/ 은 참고 보관본이며 근거 문서 아님.

```
아래 작업을 순서대로 실행해라.
세션 시작. 작업 전 아래 파일을 순서대로 전부 읽어라. 읽지 않고 작업하면 규약 위반이다.

[표준: 항상]
1. CLAUDE.md
2. .claude/skills/fullstack-product-setup/SKILL.md
3. .claude/skills/fullstack-product-setup/PITFALLS.md

[프로젝트 문서: 항상]
4. docs/PLAN.md  (기획서. 서비스 정의와 결정의 기준. 화면 문서와 충돌 시 이쪽이 우선)
5. docs/DESIGN.md
6. client/src/tokens.js
7. docs/IA.md
8. docs/ROUTES.md
9. docs/COMPONENTS.md
10. docs/PATTERNS.md
11. docs/PROGRESS.md
12. AGENTS.md

[작업 성격별: 해당하면 반드시]
- 계산, 배정, 이상 탐지, AI 판독, 백엔드, DB, API, mock 데이터 → docs/API_CONTRACT.md
- 화면 문구, 시드 데이터, 정책 근거와 수치 인용 → docs/SOURCE.md (문자 그대로 복사, 요약 금지)
- 모션과 반응형 → docs/DESIGN.md 14절(모션)과 9절(브레이크포인트). 별도 MOTION.md RESPONSIVE.md 없음
- G-Chat 원래 구조 확인이 필요할 때만 → docs/_ref_gchat/ (값이 아니라 구조만 참고)

작업 후 PROGRESS.md 를 갱신하고, 기획 내용이 바뀌었으면 PLAN.md 해당 절과 8절 변경 이력을 갱신하고, 금지 항목 grep 결과와 반응형 확인 폭을 숫자로 보고한다.
```

CLAUDE.md 와 AGENTS.md 는 G-Chat 에서 복사한 고정 파일. 새로 만들지 않음. AGENTS.md 의 PHASE 구조는 PROGRESS.md 단계(1 기반 단독, 2 화면 병렬, 3 통합 단독)로 읽음.
