// 초안(적용하지 않음). 공개 링크(miri-indol.vercel.app)는 그대로 두고 /api 요청만 네이버 클라우드로 넘긴다.
// 켜는 법: 이 파일을 client/middleware.js 로 복사하고 Vercel 환경 변수 MIRI_API_ORIGIN 에 네이버 클라우드 API 주소
// (예: https://xxxx.apigw.ntruss.com/miri/v1 또는 https://api.도메인)를 넣어 다시 배포한다.
// 끄는 법: MIRI_API_ORIGIN 을 지우고 다시 배포하면 Vercel 함수(client/api)가 그대로 응답한다.
// vercel.json 의 rewrites 는 환경 변수로 켜고 끌 수 없어서, 환경 변수를 읽을 수 있는 미들웨어 방식을 쓴다.
import { next, rewrite } from '@vercel/edge'

export const config = { matcher: '/api/:path*' }

export default function middleware(request) {
  const origin = process.env.MIRI_API_ORIGIN
  if (!origin) return next()
  const u = new URL(request.url)
  return rewrite(new URL(`${origin.replace(/\/+$/, '')}${u.pathname}${u.search}`))
}
