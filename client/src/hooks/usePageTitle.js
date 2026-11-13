// 화면 제목(브라우저 탭과 화면 읽기 프로그램이 읽는 제목). 다른 화면에서 넘어와도 이전 화면 제목이 남지 않게 한다
import { useEffect } from 'react'

export const pageTitle = (title) => (title ? `${title} | 미리` : '미리')
export default function usePageTitle(title) {
  useEffect(() => { document.title = pageTitle(title) }, [title])
}
