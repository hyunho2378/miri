import { preferencePatch } from '../../lib/helperConsent.js'
// 도우미 모바일 화면의 자료 모델. 시연(/m/h/demo)은 이 브라우저의 발령 상태, 실제 링크(/m/h/:token)는 서버 api 와 전송 대기열을 그대로 쓴다.
// 두 경로가 같은 모양(model)을 돌려주므로 화면은 한 벌로 iOS와 Android 를 함께 그린다.
import { useCallback, useEffect, useMemo, useState } from 'react'
import useNow, { useRealNow } from '../../hooks/useNow.js'
import { clockNow, helperGet, helperSendResult } from '../../lib/dispatchSync.js'
import { clearScope, enqueue, flush, moveToRejected, readQueue, readRejected } from '../../lib/reportQueue.js'
import { ackOf, helperBrief, indexStops, stepOf } from '../../lib/dispatchSim.js'
import { personDest } from '../../lib/assign.js'
import { HAZARD_KINDS } from '../../lib/scenario.js'
import { gradeOf, typeOf } from '../../lib/shortage.js'
import { personCare, shelterAccess, tripChecks } from '../../lib/tripChecks.js'
import { mergeChecks, tripCheckNotes } from '../../lib/tripChecks.js'
import useDispatchStore from '../../store/useDispatchStore.js'
import useMiriStore, { activeScenario } from '../../store/useMiriStore.js'
import { errorCodeOf } from './flow.js'

export function startDemoDispatch() {
  const s = useDispatchStore.getState()
  s.start({ kind: 'drill', speed: 60 })
  useDispatchStore.getState().runAssign()
  useDispatchStore.getState().confirmAndSend()
}

// 시연: 이 브라우저의 발령 상태에서 내 배정(manualHelper)을 꺼낸다
export function useDemoModel() {
  const d = useDispatchStore()
  const data = useMiriStore()
  const vnow = useNow()
  return useMemo(() => {
    if (d.status === 'closed') return { phase: 'closed' }
    if (d.status === 'idle') return { phase: 'idle' }
    if (d.status === 'standby' || d.status === 'assigned') return { phase: 'preparing' }
    const me = d.manualHelper
    const mine = d.result?.assignments.find((a) => a.helperCodes.includes(me))
    if (!me || !mine) return { phase: 'none' }
    const stops = indexStops(d.result)
    const sc = activeScenario(data)
    const brief = helperBrief({ result: d.result, me, scenario: sc, villages: data.villages, hazardLabel: HAZARD_KINDS[sc?.kind]?.label })
    const villageOf = (code) => d.result?.ctx?.vmap?.[code] || data.villages.find((v) => v.code === code)
    const shelterBy = Object.fromEntries(data.shelters.map((x) => [x.code, x]))
    const personsBy = Object.fromEntries(data.persons.map((p) => [p.code, p]))
    const trips = [...mine.trips].sort((a, b) => a.index - b.index)
    const checkCtx = { persons: personsBy, shelters: shelterBy, villages: data.villages, scenario: sc, villageShelter: (c) => villageOf(c)?.shelterCode }
    const checks = Object.fromEntries(trips.map((t) => [t.index, tripChecks({ trip: t, ...checkCtx })]))
    const merged = mergeChecks(Object.values(checks))
    const tripOf = {}
    for (const t of trips) for (const c of t.personCodes) tripOf[c] = t
    const shelterFor = (code) => {
      const t = tripOf[code]
      const dest = t && personDest(code, t, d.result?.ctx)
      return shelterBy[dest] || shelterBy[villageOf(t?.village)?.shelterCode] || null
    }
    const vehicle = data.vehicles.find((v) => v.code === mine.vehicleCode)
    const reports = []
    const ack = ackOf(d, me, vnow)
    if (ack.answer && ack.answer !== 'none') reports.push({ type: 'ack', answer: ack.answer, reason: ack.reason, at: ack.at || vnow })
    for (const c of trips.flatMap((t) => t.personCodes)) {
      const st = d.events[c]?.step || stepOf(d, c, vnow, stops) || 'wait'
      if (st !== 'wait') reports.push({ type: 'step', personCode: c, step: st, reason: d.events[c]?.reason, at: d.events[c]?.at || 0 })
    }
    return {
      phase: 'ready', demo: true, helper: me,
      preference: (consent,roles) => { const patch=preferencePatch({consent,roles},Date.now()); if(patch) data.upsertHelper({code:me,...patch}) }, drill: d.kind === 'drill', now: vnow,
      disaster: brief?.disaster || '산불', completeBy: brief?.completeBy ?? null, villages: brief?.villages || [],
      meetPlace: `${brief?.meetVillage || '-'} 첫 대상자 댁`, vehicle: vehicle ? `${vehicle.code}, ${typeOf(vehicle.type)?.label || ''}`.replace(/, $/, '') : mine.vehicleCode,
      coHelpers: brief?.coHelpers || [], officerContact: data.settings?.officerContact || '발령 담당자, 문자 회신',
      notes: tripCheckNotes(merged).map((n) => n.text),
      trips: trips.map((t) => ({
        index: t.index, village: villageOf(t.village)?.label || t.village, departAt: t.departAt, finishAt: t.finishAt,
        personCodes: t.personCodes, routeCheck: !!checks[t.index]?.routeCheck, routeBasis: checks[t.index]?.routeBasis === 'road' ? 'road' : 'line'
      })),
      codes: trips.flatMap((t) => t.personCodes),
      detail: (code) => {
        const p = personsBy[code]
        if (!p) return null
        const care = personCare(p)
        const sh = shelterFor(code)
        const acc = shelterAccess(sh)
        return {
          grade: gradeOf(p.grade)?.label || p.grade, care, shelter: sh?.name || '대피소', lift: acc.liftLabel, night: acc.nightLabel,
          routeCheck: !!checks[tripOf[code]?.index]?.routeCheck, guardianPhone: data.privateInfo?.[code]?.guardianPhone || null,
          village: villageOf(tripOf[code]?.village)?.label || ''
        }
      },
      reports, pending: 0, queue: [],
      ack: (answer, reason, memo) => useDispatchStore.getState().helperAck(me, answer, reason, memo),
      step: (code, step, extra = {}) => {
        useDispatchStore.getState().report(code, step, extra.reason, extra.memo)
        if (extra.care) useDispatchStore.setState((s) => ({ events: { ...s.events, [code]: { ...s.events[code], care: extra.care } } }))
      },
      resend: async () => ({ sent: 0, left: 0 })
    }
  }, [d, data, vnow])
}

// 실제 링크: 본인 배정만 서버에서 받고, 보고는 대기열에 먼저 넣은 뒤 보낸다(회신 R34)
export function useRemoteModel(token) {
  const scope = useMemo(() => String(token || '').split('.').slice(0, 2).join('.'), [token])
  const [res, setRes] = useState(null)
  const [error, setError] = useState(null)
  const [queue, setQueue] = useState(() => readQueue(scope))
  const [lastOk, setLastOk] = useState(null)
  // 실제 시각을 받아 배정 요약의 발령 시계(brief.clock)로 한 번만 바꾼다. 이 브라우저의 담당자 발령 상태와 섞지 않는다
  const now = useRealNow(1000)

  const load = useCallback(async () => {
    try { const r = await helperGet(token); setRes(r); setError(null); setLastOk(Date.now()) } catch (e) {
      const code = errorCodeOf(e)
      setError((prev) => (code === 'NETWORK' && res ? prev : { code, message: e.message }))
    }
  }, [token, res])
  const [rejected, setRejected] = useState(() => readRejected(scope))
  const send = useCallback(async () => {
    // 503, 429, 네트워크는 대기열에 남겨 다시 보냄. 종료, 교체, 만료는 화면 상태를 바꾸고 대기열은 보존.
    // 그 밖의 영구 거부(400, 409)는 지우지 않고 '보내지 못한 보고'로 옮겨 사유를 보여 줌
    const r = await flush(scope, async (it) => {
      const res = await helperSendResult(token, it)
      if (res.kind === 'ok') { setLastOk(Date.now()); return true }
      if (res.kind === 'retry') return false
      const code = errorCodeOf({ status: res.status, code: res.code })
      if (code === 'CLOSED' || code === 'NO_ASSIGNMENT' || code === 'EXPIRED' || code === 'BAD_TOKEN') { setError({ code, message: res.message }); return false }
      moveToRejected(scope, it.key, res.message || res.code || `HTTP ${res.status}`)
      return false
    })
    setQueue(readQueue(scope))
    setRejected(readRejected(scope))
    if (r.sent) { setLastOk(Date.now()); load() }
    return r
  }, [scope, token, load])

  useEffect(() => { load(); send() }, []) // eslint-disable-line react-hooks/exhaustive-deps
  useEffect(() => {
    const on = () => send()
    window.addEventListener('online', on)
    const t = setInterval(() => { if (readQueue(scope).length) send(); else load() }, 15_000)
    return () => { window.removeEventListener('online', on); clearInterval(t) }
  }, [send, load, scope])

  // 종료, 만료 링크는 휴대폰에 남은 보고와 인계 기록을 지운다(H0 안내 이행)
  useEffect(() => { if (error && (error.code === 'CLOSED' || error.code === 'EXPIRED')) { clearScope(scope); setQueue([]); setRejected([]) } }, [error, scope])
  return useMemo(() => {
    if (error && error.code !== 'NETWORK') return { phase: 'error', error }
    if (!res) return error ? { phase: 'error', error } : { phase: 'loading' }
    const b = res.brief || {}
    const vclock = Math.round(clockNow(b.clock, now))
    const push = (item) => {
      enqueue(scope, { ...item, at: Math.round(clockNow(b.clock)) })
      setQueue(readQueue(scope))
      return send()
    }
    const trips = (b.trips || []).map((t) => ({ index: t.index, village: t.village, departAt: t.departAt, finishAt: t.finishAt, personCodes: t.personCodes || [], routeCheck: !!t.routeCheck, routeBasis: t.routeBasis === 'road' ? 'road' : 'line' }))
    return {
      phase: 'ready', demo: false, helper: res.helper,
      preference: (consent,roles) => push({type:'preference',consent,roles}), drill: !!b.drill, now: vclock || now,
      disaster: b.disaster || '산불', completeBy: b.completeBy ?? null, villages: b.villages || [],
      meetPlace: `${b.meetVillage || '-'} 첫 대상자 댁`, vehicle: b.vehicleCode || '-', coHelpers: b.coHelpers || [],
      officerContact: b.officerContact || '발령 담당자, 문자 회신', notes: Array.isArray(b.notes) ? b.notes.filter((x) => typeof x === 'string').slice(0, 8) : [], trips,
      codes: b.personCodes || trips.flatMap((t) => t.personCodes),
      // 실제 링크는 이름, 주소, 건강 정보를 휴대폰으로 보내지 않는다. 상세는 담당자 문자와 현장 확인
      detail: () => null, expiresAt: res.expiresAt,
      reports: [...(res.reports || []), ...queue], pending: queue.length, queue, rejected, lastOk, offlineError: error?.code === 'NETWORK',
      ack: (answer, reason, memo) => push({ type: 'ack', answer, reason, memo }),
      step: (code, step, extra = {}) => push({ type: 'step', personCode: code, step, reason: extra.reason, memo: extra.memo, care: extra.care }),
      resend: send
    }
  }, [res, error, queue, rejected, scope, send, now, lastOk])
}
