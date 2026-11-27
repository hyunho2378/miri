// api.js 환경값 한 곳. VITE_USE_MOCK=true 면 가상 데이터 저장소(store/useMiriStore)로 동작한다.
// 백엔드 계약은 docs/API_CONTRACT.md 5절. 서버가 붙으면 이 파일에 fetch 래퍼를 둔다.
import { REGION_ID, DEFAULT_REGION_ID, REGION } from '../regions/index.js'
export const USE_MOCK = import.meta.env.VITE_USE_MOCK === 'true'
export const API_URL = import.meta.env.VITE_API_URL || ''
// 빌드 환경 변수 기관명(VITE_ORG_NAME)은 기본 지역(동해시)일 때만 쓴다. 다른 시군을 고르면 그 지역 설정의 기관명을 쓴다
export const ORG_NAME = REGION_ID === DEFAULT_REGION_ID ? (import.meta.env.VITE_ORG_NAME || REGION.org.name) : REGION.org.name
