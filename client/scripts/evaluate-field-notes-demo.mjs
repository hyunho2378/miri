// 주의: 아래 응답과 정답은 전부 시연용 합성 자료다. 실제 서비스 정확도 지표로 인용하지 않는다.
import { evaluateNoteCases } from '../src/lib/noteEvaluation.js'

const cases = [
  { id: 'D-01', source: '혼자 서지 못하고 휠체어를 탑니다', expected: { urgent: true, status: 'wheelchair', quote: true }, predicted: { urgent: true, status: 'wheelchair', quote: '휠체어를 탑니다' } },
  { id: 'D-02', source: '침대에서 일어나지 못합니다', expected: { urgent: true, status: 'bed', quote: true }, predicted: { urgent: false, status: 'assist', quote: '일어나지 못합니다' } },
  { id: 'D-03', source: '호흡 보조 장비를 계속 사용합니다', expected: { urgent: true, status: 'bed', quote: true }, predicted: { urgent: true, status: 'bed', quote: '호흡 보조 장비를 계속 사용합니다' } },
  { id: 'D-04', source: '두 사람이 부축해야 이동할 수 있습니다', expected: { urgent: true, status: 'assist', quote: true }, predicted: { urgent: false, status: 'walk', quote: '부축해야 이동할 수 있습니다' } },
  { id: 'D-05', source: '지팡이를 짚고 혼자 걸으십니다', expected: { urgent: false, status: 'walk', quote: true }, predicted: { urgent: false, status: 'walk', quote: '지팡이를 짚고 혼자 걸으십니다' } },
  { id: 'D-06', source: '지난달과 달라진 점이 없습니다', expected: { urgent: false, status: 'unchanged', quote: false }, predicted: { urgent: false, status: 'unchanged', quote: '' } },
  { id: 'D-07', source: '낮에는 보호자와 연락이 되지 않습니다', expected: { urgent: false, status: 'contact-risk', quote: true }, predicted: { urgent: false, status: 'contact-risk', quote: '낮에는 보호자와 연락이 되지 않습니다' } },
  { id: 'D-08', source: '요즘 휠체어를 사용한다고 들었습니다', expected: { urgent: false, status: 'wheelchair', quote: true }, predicted: { urgent: false, status: 'wheelchair', quote: '계속 침대에 누워 있습니다' } }
]

console.log(JSON.stringify(evaluateNoteCases(cases), null, 2))
