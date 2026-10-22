// 벤치 전용 가상 문장 생성기. 정답지가 아니다(전문가 검증 전, 생성 규칙이 곧 정답).
// 학습용(train)과 시험용(test) 표현 묶음을 따로 두어 같은 문장이 양쪽에 들어가지 않게 한다(누설 방지).
// 경계 사례(두 등급 사이)는 지시문 규칙 6에 따라 높은 등급을 정답으로 둔다.

export function mulberry32(a) {
  return () => { a |= 0; a = (a + 0x6D2B79F5) | 0; let t = Math.imul(a ^ (a >>> 15), 1 | a); t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t; return ((t ^ (t >>> 14)) >>> 0) / 4294967296 }
}

const BANK = {
  train: {
    walk: ['혼자 걸어서 대문까지 나옴', '지팡이 없이 스스로 걸음', '보행에 문제 없음, 계단도 혼자 오르내림', '혼자 이동 가능하나 길 안내 필요', '스스로 걸어 마을회관까지 다녀옴'],
    assist: ['지팡이를 짚고 천천히 걸음', '보행기를 밀며 짧은 거리 이동', '한쪽 팔을 부축하면 걸을 수 있음', '다른 사람 손을 잡고 걸음', '계단은 부축이 있어야 내려감'],
    wheelchair: ['휠체어에 앉은 채로 이동', '수동 휠체어 사용, 서지 못함', '전동 휠체어로 집 안 이동', '걷지 못해 휠체어로만 외출', '휠체어에서 차로 옮겨 앉을 때 도움 필요'],
    bed: ['와상 상태로 침대에서 생활', '누운 채로만 이동 가능', '상체를 세우지 못함, 들것 필요', '침대에서 일어나지 못함', '욕창 관리 중, 누워서만 지냄']
  },
  test: {
    walk: ['현관까지 다른 도움 없이 걸어 나옴', '산책을 혼자 다님', '걷는 데 어려움 없음', '본인 걸음으로 차량까지 이동'],
    assist: ['보행 보조기에 의지해 걸음', '팔짱을 끼고 걸으면 이동 가능', '거동 불편, 부축 필요', '지팡이 짚고 쉬어 가며 걸음'],
    wheelchair: ['휠체어 없이는 이동 불가', '리프트 차량에 휠체어째 탑승', '하반신 마비로 휠체어 사용', '오래 서 있지 못해 휠체어 탐'],
    bed: ['스트레처로 옮겨야 함', '앉은 자세 유지 불가, 누워서 이송', '와상, 체위 변경 필요', '침상 생활, 일어나 앉지 못함']
  }
}
// 경계 사례: 높은 등급이 정답
const BOUNDARY = {
  train: [['가끔 휠체어를 쓰고 평소엔 부축으로 걸음', 'wheelchair'], ['부축 또는 휠체어', 'wheelchair'], ['지팡이로 걷지만 컨디션 나쁠 땐 누워 지냄', 'bed']],
  test: [['컨디션 따라 보행기 또는 휠체어', 'wheelchair'], ['대부분 혼자 걷지만 먼 거리는 부축', 'assist'], ['휠체어 사용, 최근 앉아 있기 힘들어함', 'bed']]
}
const FILLER = ['보호자 연락 필요.', '산소 장비 사용.', '비상 가방 준비함.', '청력 저하로 크게 말해야 함.', '상시 복약 중.', '치매 초기, 같은 질문 반복.', '', '', '']

export function makeSet(split, n, seed) {
  const rnd = mulberry32(seed)
  const pick = (a) => a[Math.floor(rnd() * a.length)]
  const out = []
  for (let i = 0; i < n; i++) {
    let text, truth
    if (rnd() < 0.15) { const [t, g] = pick(BOUNDARY[split]); text = t; truth = g } else {
      truth = pick(Object.keys(BANK[split])); text = pick(BANK[split][truth])
    }
    const f = pick(FILLER)
    out.push({ id: `${split}-${i + 1}`, set: `syn-${split}`, text: rnd() < 0.5 ? `${text}. ${f}`.trim() : `${f} ${text}.`.trim(), truth, det: true })
  }
  return out
}
