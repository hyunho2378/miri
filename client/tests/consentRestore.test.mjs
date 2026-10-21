// node tests/consentRestore.test.mjs GPT 11차 M1: 서버에 접수된 참여 철회가 새로고침 뒤 복원 직후에도, 발령 종료 뒤에도 후보 제외에 남아야 한다
import assert from 'node:assert/strict'
const g = globalThis
g.window = { location: { pathname: '/console/roster' } }
g.localStorage = g.localStorage || { getItem: () => null, setItem: () => {}, removeItem: () => {} }
let n = 0
const ok = async (name, fn) => { await fn(); n += 1; console.log('ok', name) }
const T0 = Date.UTC(2026, 9, 21, 5, 0)

const { useMiriStore } = await import('../src/store/useMiriStore.js')
const { useDispatchStore, applyPreferenceReports } = await import('../src/store/useDispatchStore.js')
const { crewEligible } = await import('../src/lib/assign.js')

const helperCode = useMiriStore.getState().helpers.find((h) => crewEligible(h))?.code
const snap = { status: 'sent', kind: 'drill', speed: 60, realStart: T0, vStart: T0, issuedAt: T0, arrivals: {}, result: { assignments: [], unassigned: [] }, events: {}, ackOverride: {}, handovers: {}, fireRequests: [] }
const withdraw = { type: 'preference', helper: helperCode, consent: false, roles: [], at: T0 + 60000 }

function fakeFetch(reports, calls) {
  return async (url, init = {}) => {
    const u = String(url)
    calls.push(`${init.method || 'GET'} ${u}`)
    const res = (status, j) => ({ ok: status < 300, status, json: async () => j })
    if (/action=state/.test(u) && (!init.method || init.method === 'GET')) return res(200, { dispatchId: 'Dtest01', rev: 3, state: snap, reports })
    return res(200, {})
  }
}

await ok('시드에 후보 도우미가 있다', async () => {
  assert.ok(helperCode, '후보 도우미 코드')
})

await ok('복원 직후 서버의 철회 보고가 명부 도우미에 반영되어 후보에서 빠진다(주기 조회를 기다리지 않음)', async () => {
  const realFetch = g.fetch
  const calls = []
  g.fetch = fakeFetch([withdraw], calls)
  try {
    useDispatchStore.setState({ status: 'idle' })
    assert.equal(crewEligible(useMiriStore.getState().helpers.find((h) => h.code === helperCode)), true, '복원 전에는 후보')
    assert.equal(await useDispatchStore.getState().restoreRemote(), true)
    const h = useMiriStore.getState().helpers.find((x) => x.code === helperCode)
    assert.equal(h.consent, false, '철회 반영')
    assert.equal(crewEligible(h), false, '후보 제외')
  } finally { g.fetch = realFetch }
})

await ok('철회 뒤 다시 동의한 보고가 나중이면 마지막 보고 기준으로 되돌아온다(시각 순 적용)', async () => {
  const again = { type: 'preference', helper: helperCode, consent: true, roles: ['ride'], at: T0 + 120000 }
  applyPreferenceReports([again, withdraw])
  const h = useMiriStore.getState().helpers.find((x) => x.code === helperCode)
  assert.equal(h.consent, true)
  assert.deepEqual(h.roles, ['ride'])
  applyPreferenceReports([withdraw])
})

await ok('발령 종료 때 서버 기록을 지우기 전에 마지막 보고를 받아 철회를 명부에 남긴다', async () => {
  const realFetch = g.fetch
  const calls = []
  // 종료 직전에 접수된 철회(주기 조회 전)
  const other = useMiriStore.getState().helpers.find((h) => h.code !== helperCode && crewEligible(h))
  assert.ok(other)
  g.fetch = fakeFetch([{ type: 'preference', helper: other.code, consent: false, roles: [], at: T0 + 180000 }], calls)
  try {
    useDispatchStore.setState({ status: 'sent', remote: { state: 'saved', dispatchId: 'Dtest01', rev: 3 }, realStart: T0, vStart: T0, speed: 1, result: { assignments: [], unassigned: [] }, events: {}, scopeCodes: [] })
    useDispatchStore.getState().close()
    await new Promise((r) => setTimeout(r, 50))
    const h = useMiriStore.getState().helpers.find((x) => x.code === other.code)
    assert.equal(h.consent, false, '종료 직전 철회 반영')
    const getIdx = calls.findIndex((c) => c.startsWith('GET') && /action=state/.test(c))
    const delIdx = calls.findIndex((c) => c.startsWith('DELETE'))
    assert.ok(getIdx >= 0 && delIdx > getIdx, '조회 뒤 삭제')
  } finally { g.fetch = realFetch }
})

console.log(`\n${n}개 시험 통과`)
process.exit(0)
