// 평시 소방 인계 미리보기(플랫폼 AI 협업 툴 셀 58 검토 반영). 발령 전에도 소방에 넘어갈 예상 구조 대상을 보인다.
// 값은 부족분 계산 결과에서만 가져오고 숫자 기본값을 두지 않는다.
const n = (x) => Number(x).toLocaleString('ko-KR')

export function handoverPreview({ baseline, recommended, byVillage, villageName, extraLine, top = 5 }) {
  if (!Number.isFinite(baseline) || !Number.isFinite(recommended)) throw new Error('기준 배정과 추천 배정 값이 필요합니다')
  const rows = Object.entries(byVillage || {}).map(([code, r]) => ({ name: villageName(code), total: r.total || 0 })).filter((x) => x.total > 0).sort((a, b) => b.total - a.total)
  const head = rows.slice(0, top).map((x) => `${x.name} ${n(x.total)}명`)
  const rest = rows.slice(top)
  if (rest.length) head.push(`외 ${rest.length}곳 ${n(rest.reduce((s, x) => s + x.total, 0))}명`)
  const line1 = `예상 구조 대상 ${n(baseline)}명(기준 배정), 추천 배정 시 ${n(recommended)}명`
  const line2 = [head.join(', '), extraLine ? `${extraLine} 협약 시 0명` : null].filter(Boolean).join(', ')
  return { line1, line2, villageSum: rows.reduce((s, x) => s + x.total, 0) }
}
