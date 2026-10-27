// 승하차 민감도 행의 추천 배정 값을 화면을 멈추지 않고 채운다(발령 준비 화면 지연 줄이기).
// 같은 명부, 마을, 차량, 도우미 배열과 같은 설정과 시나리오면 앞서 구한 값을 바로 쓴다.
import { useEffect, useState } from 'react'
import { boardingRecommended } from '../lib/boardingOpt.js'

const roots = new WeakMap()
const bucketOf = (input) => {
  let node = roots
  for (const key of [input.persons, input.villages, input.vehicles, input.helpers]) {
    if (!node.has(key)) node.set(key, new WeakMap())
    node = node.get(key)
  }
  if (!node.has(roots)) node.set(roots, new Map())
  return node.get(roots)
}

export default function useBoardingRecommended(input, steps) {
  const store = bucketOf(input)
  const sig = JSON.stringify([input.settings, input.scenario, input.t0, steps])
  const [, bump] = useState(0)
  useEffect(() => {
    const out = store.get(sig) || {}
    store.set(sig, out)
    const todo = steps.filter((m) => !(m in out))
    if (!todo.length) return undefined
    let stopped = false
    let worker = null
    let timer = 0
    const put = (m, v) => { out[m] = v; if (!stopped) bump((x) => x + 1) }
    // 작업자를 못 쓰면 한 단계씩 쉬는 틈에 계산한다
    const fallback = () => {
      let i = 0
      const next = () => {
        if (stopped || i >= todo.length) return
        const m = todo[i++]
        if (!(m in out)) put(m, boardingRecommended(input, m))
        timer = setTimeout(next, 0)
      }
      timer = setTimeout(next, 0)
    }
    try {
      if (typeof Worker === 'undefined') throw new Error('no worker')
      worker = new Worker(new URL('../lib/boardingOpt.worker.js', import.meta.url), { type: 'module' })
      worker.onmessage = (e) => put(e.data.m, e.data.recommended)
      worker.onerror = () => { worker?.terminate(); worker = null; fallback() }
      worker.postMessage({ input, steps: todo })
    } catch {
      worker = null
      fallback()
    }
    return () => { stopped = true; clearTimeout(timer); worker?.terminate() }
  }, [store, sig]) // eslint-disable-line react-hooks/exhaustive-deps
  return store.get(sig) || {}
}
