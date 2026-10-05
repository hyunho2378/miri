// 공공데이터 레이어를 켰을 때만 조회한다. 결과 상태를 부모로 올린다(화면에는 아무것도 그리지 않음)
import { useEffect } from 'react'
import useOpenData from '../../hooks/useOpenData.js'

export default function OpenDataLoader({ kind, onChange }) {
  const state = useOpenData(kind)
  useEffect(() => { onChange(kind, state) }, [kind, state]) // eslint-disable-line react-hooks/exhaustive-deps
  return null
}
