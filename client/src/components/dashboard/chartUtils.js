// 차트 4종이 공유하는 계산 도우미. 라이브러리 없이 SVG 로 그리므로 크기 측정과 축 계산이 필요하다.
// COMPONENTS.md 트리에 없는 파일이다. 네 컴포넌트에 같은 코드를 복사하지 않으려고 뺐다(PROGRESS 기록).
import { useEffect, useLayoutEffect, useRef, useState } from 'react'

// 컨테이너 실제 픽셀 폭을 재서 SVG 를 그 크기로 그린다.
// viewBox 스케일링으로 늘리면 320px 에서 축 글자가 5px 이 된다
export function useChartSize(height) {
  const ref = useRef(null)
  const [width, setWidth] = useState(0)

  useLayoutEffect(() => {
    const el = ref.current
    if (!el) return undefined
    const ro = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)))
    ro.observe(el)
    setWidth(Math.round(el.getBoundingClientRect().width))
    return () => ro.disconnect()
  }, [])

  return { ref, width, height }
}

// 마운트 다음 프레임에 true. CSS transition 으로 진입 애니메이션을 한 번만 태운다.
// prefers-reduced-motion 은 index.css 전역 규칙이 transition-duration 을 0.01ms 로 만들어 즉시 끝난다
export function useEnterOnce() {
  const [entered, setEntered] = useState(false)
  useEffect(() => {
    const raf = requestAnimationFrame(() => setEntered(true))
    return () => cancelAnimationFrame(raf)
  }, [])
  return entered
}

// 축 상단을 보기 좋은 값으로 올린다
export function niceMax(value) {
  if (!value || value <= 0) return 10
  const exp = Math.floor(Math.log10(value))
  const base = 10 ** exp
  const step = value / base <= 2 ? 0.5 : value / base <= 5 ? 1 : 2
  return Math.ceil(value / (base * step)) * base * step
}

export const linePath = (points, x, y) =>
  points.map((v, i) => `${i === 0 ? 'M' : 'L'}${x(i)},${y(v)}`).join(' ')

// 7단계. 꺾은선의 각진 모서리를 monotone cubic(Fritsch-Carlson)으로 눕힌다.
// 일반 Catmull-Rom 은 오버슈트가 생겨 0 아래로 내려가는 가짜 골짜기를 그린다. 건수 데이터라 그러면 안 된다.
// x 간격이 일정하다는 전제(모든 차트가 등간격 축이다)에서 접선을 조화평균으로 제한한다
export function smoothPath(points, x, y) {
  const n = points.length
  if (n < 3) return linePath(points, x, y)
  const dx = x(1) - x(0)
  const slope = []
  for (let i = 0; i < n - 1; i += 1) slope.push((y(points[i + 1]) - y(points[i])) / dx)
  const m = [slope[0]]
  for (let i = 1; i < n - 1; i += 1) {
    const a = slope[i - 1]
    const b = slope[i]
    m.push(a * b <= 0 ? 0 : (2 * a * b) / (a + b))
  }
  m.push(slope[n - 2])

  let d = `M${x(0)},${y(points[0])}`
  for (let i = 0; i < n - 1; i += 1) {
    d += ` C${x(i) + dx / 3},${y(points[i]) + (m[i] * dx) / 3}`
      + ` ${x(i + 1) - dx / 3},${y(points[i + 1]) - (m[i + 1] * dx) / 3}`
      + ` ${x(i + 1)},${y(points[i + 1])}`
  }
  return d
}

// 선 아래 면. 그라데이션은 금지라 단색 알파로만 채운다(fillOpacity)
export const areaPath = (d, xStart, xEnd, yBase) => `${d} L${xEnd},${yBase} L${xStart},${yBase} Z`

// 축 라벨이 겹치지 않게 건너뛸 간격
export const labelStep = (count, width, per = 56) =>
  Math.max(1, Math.ceil(count / Math.max(1, Math.floor(width / per))))
