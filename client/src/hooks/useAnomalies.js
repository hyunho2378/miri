// useAnomalies.js 이상 탐지 결과. 데이터와 발령 상태가 바뀌면 다시 계산
import { useMemo } from 'react'
import { detectAnomalies } from '../lib/anomaly.js'
import { ackOf, vnowOf } from '../lib/dispatchSim.js'
import useDispatchStore from '../store/useDispatchStore.js'
import useMiriStore from '../store/useMiriStore.js'

export default function useAnomalies(now) {
  const data = useMiriStore()
  const d = useDispatchStore()
  return useMemo(() => {
    let dispatch = null
    if (d.result && d.status !== 'closed') {
      const vnow = vnowOf(d)
      const acks = {}
      for (const h of d.result.assignments.flatMap((a) => a.helperCodes)) acks[h] = ackOf(d, h, vnow)
      dispatch = { result: d.result, sentAt: d.sentAt, acks, now: vnow }
    }
    return detectAnomalies({ persons: data.persons, vehicles: data.vehicles, helpers: data.helpers, villages: data.villages, settings: data.settings, now: data.today, dispatch })
  }, [data.persons, data.vehicles, data.helpers, data.villages, data.settings, data.today, d, Math.floor((now || 0) / 30000)]) // eslint-disable-line react-hooks/exhaustive-deps
}
