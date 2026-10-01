// rng.js 고정 시드 난수. 같은 시드면 같은 결과(가상 데이터 재현성, 배정 최적화 재현성)
export function mulberry32(seed) {
  let a = seed >>> 0
  return function next() {
    a |= 0
    a = (a + 0x6d2b79f5) | 0
    let t = Math.imul(a ^ (a >>> 15), 1 | a)
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296
  }
}

export const pickOne = (r, arr) => arr[Math.floor(r() * arr.length)]
export const intIn = (r, min, max) => min + Math.floor(r() * (max - min + 1))

export function shuffle(r, arr) {
  const a = [...arr]
  for (let i = a.length - 1; i > 0; i -= 1) {
    const j = Math.floor(r() * (i + 1))
    ;[a[i], a[j]] = [a[j], a[i]]
  }
  return a
}
