// 시연용 합성 응답에 대한 평가 지표 계산. 실제 모델 성능이나 실제 사용자 결과를 뜻하지 않는다.
const normalized = (value = '') => String(value).replace(/\s+/g, ' ').trim()

export function evaluateNoteCases(cases) {
  const urgentCases = cases.filter((item) => item.expected.urgent)
  const urgentMisses = urgentCases.filter((item) => !item.predicted.urgent)
  const classified = cases.filter((item) => item.expected.status)
  const correctStatuses = classified.filter((item) => item.expected.status === item.predicted.status)
  const evidenceChecks = cases.filter((item) => item.expected.quote)
  const evidenceMatches = evidenceChecks.filter((item) => normalized(item.source).includes(normalized(item.predicted.quote)))
  const rate = (count, total) => total ? count / total : null
  return {
    label: '시연용 합성 응답 평가',
    counts: { cases: cases.length, urgent: urgentCases.length, classified: classified.length, evidence: evidenceChecks.length },
    urgentOmissionRate: rate(urgentMisses.length, urgentCases.length),
    urgentOmissionCount: urgentMisses.length,
    statusAccuracy: rate(correctStatuses.length, classified.length),
    statusCorrectCount: correctStatuses.length,
    evidenceMatchRate: rate(evidenceMatches.length, evidenceChecks.length),
    evidenceMatchCount: evidenceMatches.length
  }
}
