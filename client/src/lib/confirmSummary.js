// 발령 중 실수 방지 확인 요약(플랫폼 AI 협업 툴 셀 41 검토 반영).
// 전송과 소방 인계는 누르면 바로 실행되어, 누르기 전에 몇 명에게 무엇이 가는지 한눈에 보이게 한다. 숫자 산식은 바꾸지 않는다

export function sendConfirmLines(result) {
  const assignments = result?.assignments || []
  const assigned = assignments.reduce((s, a) => s + (a.trips || []).reduce((t, tr) => t + (tr.personCodes?.length || 0), 0), 0)
  const helpers = new Set(assignments.flatMap((a) => a.helperCodes || [])).size
  const unassigned = (result?.unassigned || []).length
  const lines = [`차량 ${assignments.length}대${helpers ? `, 도우미 ${helpers}명` : ''}에게 배정표를 보냅니다(이송 배정 ${assigned}명).`]
  if (unassigned > 0) lines.push(`기한 안에 옮기지 못하는 ${unassigned}명은 소방 인계 목록에 남습니다.`)
  lines.push('보낸 뒤에는 이송 진행 화면으로 바뀝니다.')
  return lines
}

export function handoverConfirmLines(rows, picked, labelOf = (v) => v, at = '') {
  const set = new Set(picked)
  const chosen = rows.filter((r) => set.has(r.code))
  const byVillage = {}
  for (const r of chosen) byVillage[r.village] = (byVillage[r.village] || 0) + 1
  const villages = Object.entries(byVillage).sort((a, b) => b[1] - a[1] || String(a[0]).localeCompare(String(b[0])))
    .map(([v, n]) => `${labelOf(v)} ${n}명`).join(', ')
  const lines = [`선택한 구조 대상 ${chosen.length}명의 목록을 동해소방서에 넘깁니다.`]
  if (villages) lines.push(`마을별: ${villages}`)
  if (at) lines.push(`목록 기준 시각 ${at}`)
  return lines
}
