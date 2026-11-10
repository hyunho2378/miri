// 저장소 어댑터들(표준 Redis, Object Storage)이 같이 쓰는 값 해석 규칙. Upstash 클라이언트 결과 모양과 같게 맞춘다
// Upstash 의 기본 해석 규칙과 같게 맞춘다(pkg/util.ts parseRecursive)
export function parseValue(v) {
  if (Array.isArray(v)) return v.map(parseValue)
  if (typeof v !== 'string') return v
  try {
    const p = JSON.parse(v)
    if (typeof p === 'number' && p.toString() !== v) return v
    return p
  } catch { return v }
}
export const serialize = (v) => (typeof v === 'string' ? v : JSON.stringify(v))

export function hashOf(arr) {
  if (!arr || !arr.length) return null
  const out = {}
  for (let i = 0; i < arr.length; i += 2) {
    const v = arr[i + 1]
    const unsafe = !Number.isNaN(Number(v)) && !Number.isSafeInteger(Number(v))
    if (unsafe) { out[arr[i]] = v; continue }
    try { out[arr[i]] = JSON.parse(v) } catch { out[arr[i]] = v }
  }
  return out
}

