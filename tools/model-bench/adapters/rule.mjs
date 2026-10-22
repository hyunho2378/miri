// 규칙 기반 기준선(D). 판독 지시문(client/api/intake.js SYSTEM)의 등급 정의 낱말에서 만든 낱말 목록.
// 홀드아웃 글을 보고 고치지 않는다(작성 시 HO2-01, HO2-03 문장 일부를 본 상태에서 고정, 2026-10-22).
// 여러 등급 낱말이 함께 나오면 더 높은 등급을 고르고 근거 약함(low)으로 둔다(지시문 규칙 6과 같음).

const UNREADABLE = /판\s*독\s*불\s*가|읽\s*을\s*수\s*없|식\s*별\s*불\s*가|얼\s*룩/
const NEG_HELP = /(붙잡|잡|부축|도움|보조)[가-힣]*\s*(않|없이|없고|없음)/g
const NEG_WHEEL = /휠체어[가-힣\s]{0,6}(필요\s*없|쓰지\s*않|안\s*씀|사용하지\s*않)/g

const CUES = {
  bed: [/와상/, /누운\s*(상태|채)/, /누워/, /들것/, /침대에서\s*(못|일어나지|일어날\s*수\s*없)/, /앉(을|지)\s*수\s*없/, /앉지\s*못/, /스트레처/],
  wheelchair: [/휠체어/, /휠\s*체어/],
  assist: [/지팡이/, /보행기/, /보행\s*보조/, /부축/, /붙잡/, /잡아\s*(드려|줘|주)/, /손을\s*잡/, /거동\s*불편/, /도움을\s*받아\s*걷/, /천천히\s*걷/],
  walk: [/혼자\s*(걸|이동|나오|움직)/, /스스로\s*(걷|걸|이동)/, /독립\s*보행/, /자립\s*보행/, /걸어서\s*이동\s*가능/, /보행\s*가능/]
}
const ORDER = ['bed', 'wheelchair', 'assist', 'walk']

export function ruleGrade(text = '') {
  const t0 = String(text).replace(/\s+/g, ' ')
  if (!t0.trim()) return { pred: 'unknown', conf: 'low', quote: '' }
  if (UNREADABLE.test(t0)) return { pred: 'unknown', conf: 'low', quote: '' }
  const t = t0.replace(NEG_HELP, ' ').replace(NEG_WHEEL, ' ')
  const hits = ORDER.filter((g) => CUES[g].some((re) => re.test(t)))
  if (!hits.length) return { pred: 'unknown', conf: 'low', quote: '' }
  const pred = hits[0]
  const conf = hits.length > 1 ? 'low' : 'mid'
  const m = CUES[pred].map((re) => t.match(re)).find(Boolean)
  return { pred, conf, quote: m ? m[0] : '' }
}

export const ruleAdapter = { id: 'rule', label: '규칙 기반 기준선', kind: 'rule', run: async (item) => ruleGrade(item.text) }
