// queueStatus.js 도우미 휴대폰 전송 대기 요약(플랫폼 AI 협업 툴 셀 47 검토 반영)
// 대기 보고뿐 아니라 서버가 받지 않은 보고만 남은 경우도 홈에 보이게 하고, 마지막 연결 시각과 보관 시각을 함께 보여 준다.
import { fmtHM } from './time.js'

const lastLine = (lastOk) => (lastOk ? `마지막 연결 ${fmtHM(lastOk)}` : '아직 연결 기록 없음')

// m: { pending, rejected, lastOk }. 보일 것이 없으면 null
export function queueSummary(m) {
  const p = m?.pending || 0
  const r = m?.rejected?.length || 0
  if (!p && !r) return null
  if (p && r) return { title: `전송 대기 ${p}건, 보내지 못한 보고 ${r}건`, subtitle: `연결되면 자동 전송, 보내지 못한 보고는 담당자에게 전화로 알림. ${lastLine(m.lastOk)}` }
  if (p) return { title: `전송 대기 ${p}건`, subtitle: `연결되면 자동 전송. ${lastLine(m.lastOk)}` }
  return { title: `보내지 못한 보고 ${r}건`, subtitle: '담당자에게 전화로 알림' }
}

// 전송 대기 목록 한 줄 부제: 보관 시각 함께
export function queueRowSubtitle(q) {
  return q?.at ? `전송 대기, ${fmtHM(q.at)} 보관` : '전송 대기'
}
