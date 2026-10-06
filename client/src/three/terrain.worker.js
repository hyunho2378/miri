// terrain.worker.js 지형 조각을 화면 흐름을 막지 않고 만든다. 동해시 조각부터 보낸다.
import { makeDem, buildPiece } from './terrainBuild.js'

self.onmessage = (e) => {
  const { data, meta, pieces, spacing, first } = e.data
  const dem = makeDem(data, meta)
  const order = [...pieces].sort((a, b) => (first.includes(a.sgg) ? 0 : 1) - (first.includes(b.sgg) ? 0 : 1))
  let n = 0
  for (const p of order) {
    const r = buildPiece(p, dem, spacing[p.sgg] || 0.2)
    n += 1
    self.postMessage({ type: 'piece', piece: r, n, total: order.length }, [r.pos.buffer, r.col.buffer, r.idx.buffer, r.line.buffer, r.wallPos.buffer, r.wallCol.buffer, r.wallIdx.buffer])
  }
  self.postMessage({ type: 'done' })
}
