// 지도 마을 인원 라벨 겹침 회피(회신 R34: 상황판 지도에서 마을별 인원 숫자가 겹침).
// 화면 좌표의 라벨 상자를 우선순위(선택, 인원 많은 순) 대로 놓고, 겹치면 위, 아래, 오른쪽, 왼쪽으로 한 칸씩 옮겨 보고
// 그래도 겹치면 숨긴다. 선택한 마을은 숨기지 않는다. 지도 확대 수준이 바뀌면 다시 계산한다.
const GAP = 2
const overlap = (a, b) => a.x < b.x + b.w + GAP && b.x < a.x + a.w + GAP && a.y < b.y + b.h + GAP && b.y < a.y + a.h + GAP

export function placeLabels(items, { selected } = {}) {
  const order = [...items].sort((a, b) => (b.code === selected) - (a.code === selected) || (b.priority || 0) - (a.priority || 0) || String(a.code).localeCompare(String(b.code)))
  const placed = []
  const out = {}
  for (const it of order) {
    const offsets = [[0, 0], [0, -(it.h + GAP)], [0, it.h + GAP], [it.w / 2 + GAP, 0], [-(it.w / 2 + GAP), 0]]
    let done = false
    for (const [dx, dy] of offsets) {
      const box = { x: it.x - it.w / 2 + dx, y: it.y - it.h / 2 + dy, w: it.w, h: it.h }
      if (!placed.some((p) => overlap(p, box))) {
        placed.push(box); out[it.code] = { dx, dy, hidden: false }; done = true; break
      }
    }
    if (!done) {
      if (it.code === selected) { placed.push({ x: it.x - it.w / 2, y: it.y - it.h / 2, w: it.w, h: it.h }); out[it.code] = { dx: 0, dy: 0, hidden: false } }
      else out[it.code] = { dx: 0, dy: 0, hidden: true }
    }
  }
  return out
}
