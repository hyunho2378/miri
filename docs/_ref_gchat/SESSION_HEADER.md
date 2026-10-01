# SESSION_HEADER.md

G-Chat 의 모든 Claude Code 작업 프롬프트는 아래로 시작한다. 문서를 새로 만들거나 이름을 바꾸면 이 목록을 즉시 갱신한다. 이 목록에 없는 문서를 근거로 삼지 않는다.

```
세션 시작. 작업 전 아래 파일을 순서대로 전부 읽어라. 읽지 않고 작업하면 규약 위반이다.

[표준 — 항상]
1. CLAUDE.md
2. .claude/skills/fullstack-product-setup/SKILL.md
3. .claude/skills/fullstack-product-setup/PITFALLS.md

[프로젝트 문서 — 항상]
4. docs/DESIGN.md
4-1. docs/DESIGN_DELTA.md  (1.5단계 봄내 이식 델타. DESIGN.md 와 다르면 이쪽이 우선)
5. client/src/tokens.js
6. docs/IA.md
7. docs/ROUTES.md
8. docs/COMPONENTS.md
9. docs/PATTERNS.md
10. docs/PROGRESS.md
11. AGENTS.md

[작업 성격에 따라 — 해당하면 반드시]
- 챗봇·스트리밍·근거·인계 카드 작업 → docs/API_CONTRACT.md
- 시설·FAQ·공지 데이터 시드 → client/src/mock/README.md (원문 무결성 규칙)
- 모션·반응형은 docs/DESIGN.md 의 모션 절과 브레이크포인트 절에 있다. 별도 MOTION.md RESPONSIVE.md 없음
- 다국어·Select·Button·팝 애니메이션 이식 원본 → docs/_bomnae_ref/ (README.md 부터. 값이 아니라 구조만 가져온다)

작업 후 PROGRESS.md 를 갱신하고, 금지 항목 grep 결과와 반응형 확인 폭을 숫자로 보고한다.
```

CLAUDE.md 와 AGENTS.md 는 동해사이 프로젝트 것을 그대로 복사한다. 고정 파일이라 새로 만들지 않는다. AGENTS.md 의 PHASE 1 에이전트 분배만 PROGRESS.md 2단계 소유 계약으로 읽는다.
