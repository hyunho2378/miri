// terrain.worker.js 지형 조각과 건물 입체를 화면 흐름을 막지 않고 만든다. 동해시 조각부터 보낸다.
import { makeDem, buildPiece } from './terrainBuild.js'
import { buildBuildings, readBuildings } from './buildingBuild.js'

self.onmessage = async (e) => {
  const { data, meta, pieces, spacing, first, buildings } = e.data
  const dem = makeDem(data, meta)
  const order = [...pieces].sort((a, b) => (first.includes(a.sgg) ? 0 : 1) - (first.includes(b.sgg) ? 0 : 1))
  let n = 0
  for (const p of order) {
    const r = buildPiece(p, dem, spacing[p.sgg] || 0.2)
    n += 1
    self.postMessage({ type: 'piece', piece: r, n, total: order.length }, [r.pos.buffer, r.col.buffer, r.idx.buffer, r.line.buffer, r.wallPos.buffer, r.wallCol.buffer, r.wallIdx.buffer])
  }
  self.postMessage({ type: 'done' })
  // 건물: 동해시 파일을 먼저 받아 세우고(첫 화면), 접경 시군 파일을 이어서 받는다. parts 가 없으면 한 파일
  const urls = buildings?.parts?.length ? buildings.parts : buildings?.url ? [buildings.url] : []
  if (!urls.length) return
  try {
    const withBox = pieces.map((p) => {
      let b = [180, 90, -180, -90]
      for (const poly of p.coordinates) for (const [x, y] of poly[0]) b = [Math.min(b[0], x), Math.min(b[1], y), Math.max(b[2], x), Math.max(b[3], y)]
      return { code: p.code, coordinates: p.coordinates, bbox: b }
    })
    let total = 0
    for (let k = 0; k < urls.length; k++) {
      const res = await fetch(urls[k])
      if (!res.ok) throw new Error(`건물 파일 ${res.status}`)
      const buf = await res.arrayBuffer()
      const list = buildBuildings(readBuildings(buf, buildings.bbox), withBox, dem.sample)
      for (const r of list) self.postMessage({ type: 'buildings', b: r }, [r.pos.buffer, r.idx.buffer, r.bid.buffer, r.info.buffer])
      total += list.reduce((s, r) => s + r.count, 0)
      if (k < urls.length - 1) self.postMessage({ type: 'buildingsPart', n: k + 1, of: urls.length, total })
    }
    self.postMessage({ type: 'buildingsDone', total })
  } catch (err) {
    self.postMessage({ type: 'buildingsError', message: String(err?.message || err) })
  }
}
