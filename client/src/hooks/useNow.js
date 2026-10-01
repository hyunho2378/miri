// useNow.js 1초 틱. 발령 중이면 가상 시각을 돌려준다
import { useEffect, useState } from 'react'
import { vnowOf } from '../lib/dispatchSim.js'
import useDispatchStore from '../store/useDispatchStore.js'

export default function useNow(intervalMs = 1000) {
  const [, setTick] = useState(0)
  useEffect(() => {
    const id = setInterval(() => setTick((x) => x + 1), intervalMs)
    return () => clearInterval(id)
  }, [intervalMs])
  const d = useDispatchStore()
  return d.status === 'idle' || d.status === 'closed' ? Date.now() : vnowOf(d)
}
