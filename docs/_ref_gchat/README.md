# G-Chat

공공시설 AI 민원 상담 SaaS. 프론트엔드(client)만 구현하며, 백엔드는 `docs/API_CONTRACT.md`에 맞춰 별도 서버로 붙는다.

## 구조

- `client/` React 18 + Vite + JSX + Tailwind. Vercel 배포.
- `server/` 백엔드 자리. 계약은 `docs/API_CONTRACT.md`.
- `docs/` DESIGN, IA, ROUTES, COMPONENTS, PATTERNS, PITFALLS, PROGRESS, API_CONTRACT.
- `.claude/skills/fullstack-product-setup/` 작업 규약.

## 실행

```bash
cd client
npm install
cp .env.example .env
npm run dev      # http://localhost:5173
npm run build
```

`VITE_USE_MOCK=true`면 `src/lib/mockStream.js`가 NDJSON 스트림을 흉내낸다. 백엔드가 붙으면 false로 바꾸고 `VITE_API_URL`만 교체한다.

## 규약

세션 시작 시 `docs/SESSION_HEADER.md`의 파일 순서대로 읽는다. 디자인 값의 단일 출처는 `client/src/tokens.js`.
