# 미리

재난취약자를 대피 기한 안에 옮길 차와 사람이 몇 명분 부족한지 평시에 계산하고, 대피 발령 시 차량과 도우미와 대상자를 묶어 배정하는 담당자용 웹 서비스. Team 오아시스, 한림대학교 서비스디자인 2026-2 텀과제.

기반 코드는 G-Chat(공공시설 AI 민원 상담 SaaS) 저장소 전체 복사본. 편집 패턴은 dah-website 구조 이식.

## 구조

- `client/` React 18 + Vite + JSX + Tailwind. Vercel 배포
- `server/` 백엔드 자리. 계약은 `docs/API_CONTRACT.md`
- `docs/PLAN.md` 기획서 기준본. 수업 진행에 따라 계속 갱신
- `docs/` DESIGN, IA, ROUTES, COMPONENTS, PATTERNS, API_CONTRACT, SOURCE, PITFALLS, PROGRESS, SESSION_HEADER
- `docs/_ref_gchat/` G-Chat 원본 문서 보관 (참고용)
- `.claude/skills/fullstack-product-setup/` 작업 규약

## 실행

```bash
cd client
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
npm run build
```

`VITE_USE_MOCK=true`면 가상 데이터로 동작. 부족분 계산과 배정 최적화와 이상 탐지는 서버 없이 프론트에서 실행. 백엔드가 붙으면 false로 바꾸고 `VITE_API_URL`만 교체.

## 규약

세션 시작 시 `docs/SESSION_HEADER.md`의 파일 순서대로 읽음. 디자인 값의 단일 출처는 `client/src/tokens.js`(G-Chat 원본). 원문 인용은 `docs/SOURCE.md` 문자 그대로.
