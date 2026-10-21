// 시험용 Upstash 대신 메모리 저장소. api/dispatch.js 의 Lua 스크립트 두 개(APPEND_LUA, SAVE_LUA)는 같은 동작을 JS 로 한 번에 실행해
// 원자 처리를 흉내 낸다(JS 는 한 스레드라 중간에 다른 요청이 끼지 않음). fail 옵션으로 장애를 재현한다.
import { APPEND_LUA, SAVE_LUA } from '../api/dispatch.js'

export function fakeRedis(fail = {}) {
  const kv = new Map(); const lists = new Map()
  const api = {
    kv, lists, fail,
    async get(k) { if (fail.get) throw new Error('get 실패'); return kv.has(k) ? kv.get(k) : null },
    async set(k, v, o = {}) { if (fail.set) throw new Error('set 실패'); if (o.nx && kv.has(k)) return null; kv.set(k, v); return 'OK' },
    async rpush(k, v) { if (fail.rpush) throw new Error('rpush 실패'); const l = lists.get(k) || []; l.push(v); lists.set(k, l); return l.length },
    async lrange(k) { return [...(lists.get(k) || [])] },
    async ltrim() { return 'OK' },
    async expire() { return 1 },
    async del(...ks) { ks.forEach((k) => { kv.delete(k); lists.delete(k) }); return ks.length },
    async incr(k) { const v = (kv.get(k) || 0) + 1; kv.set(k, v); return v },
    async eval(script, keys, args) {
      if (fail.eval) throw new Error('eval 실패')
      if (script === APPEND_LUA) {
        if (kv.has(keys[0])) return [0, kv.get(keys[0])]
        kv.set(keys[0], args[1])
        const l = lists.get(keys[1]) || []; l.push(args[0]); lists.set(keys[1], l)
        return [1, l.length]
      }
      if (script === SAVE_LUA) {
        const [closed, idOwner, rev, state, assign, owner] = keys
        const [sid, r, st, as, id] = args
        if (kv.has(closed)) return [0, 'closed']
        if (kv.has(idOwner) && kv.get(idOwner) !== sid) return [0, 'owner']
        if (kv.has(rev) && Number(kv.get(rev)) >= Number(r)) return [0, 'stale']
        kv.set(idOwner, sid); kv.set(rev, r); kv.set(state, st); kv.set(assign, as); kv.set(owner, id)
        return [1, 'ok']
      }
      throw new Error('알 수 없는 스크립트')
    }
  }
  return api
}
