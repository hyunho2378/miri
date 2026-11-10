# server

백엔드 자리. 계약은 `docs/API_CONTRACT.md`. 스택 확정 전 (PROGRESS 확인 필요 4).

## 네이버 클라우드 이전 준비(코드만, 배포 전)

- 저장소: `MIRI_STORE` 미설정이면 지금처럼 Upstash. `MIRI_STORE=ncpobject` 면 Object Storage(`client/api/_objectStore.js`), `MIRI_STORE=redis` 면 표준 Redis
- Object Storage 환경 변수 이름: `NCP_OBJECT_BUCKET`, `NCP_OBJECT_ACCESS_KEY`, `NCP_OBJECT_SECRET_KEY`, 선택 `NCP_OBJECT_ENDPOINT`(기본 https://kr.object.ncloudstorage.com), `NCP_OBJECT_REGION`(기본 kr-standard), `MIRI_OBJECT_PREFIX`(기본 `_miri-store/`)
- 독립 서버: `node server/index.mjs`
- Cloud Functions 묶음: `node server/build-action.mjs --verify` 로 `server/dist/ncp-action.zip`(진입점 `server/ncpAction.cjs` 의 main, 액션 하나가 `/api/<이름>` 전부 처리)
- 액션 점검만: `node server/action-smoke.mjs [풀어 놓은 묶음 폴더]`
