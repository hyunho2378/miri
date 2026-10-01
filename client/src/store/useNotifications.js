// useNotifications.js 알림 센터 상태. 메모리다. 새로고침하면 다시 만들어진다(웹스토리지 금지).
// 알림은 지어내지 않는다. 색인 로그·KPI·인계 대기 같은 mock 상태에서 파생한다.
// 설정 알림 탭에서 끈 유형은 아예 만들지 않는다.
import { create } from 'zustand'

let seq = 0
const add = (list, item) => { list.push({ id: `n-${++seq}`, read: false, ...item }); return list }

// 설정값 기본. 설정 알림 탭이 저장하면 그 값이 온다
const DEFAULTS = { alertIndex: true, alertAccuracy: 85, alertHandoff: true }

export const useNotifications = create((set, get) => ({
  items: [],
  ready: false,

  // 화면 진입 때 한 번 만든다. 같은 세션에서 다시 만들지 않는다
  build: ({ index, kpi, handoff, settings }) => {
    if (get().ready) return
    const cfg = { ...DEFAULTS, ...(settings || {}) }
    const list = []

    if (cfg.alertIndex) {
      for (const log of (index?.logs || []).slice(0, 3)) {
        if (log.result === 'success') continue
        add(list, { type: 'indexFailed', at: log.at, to: '/admin/knowledge?tab=index', vars: { message: log.message || '' } })
      }
    }

    const threshold = Number(cfg.alertAccuracy) || DEFAULTS.alertAccuracy
    if (kpi?.accuracy && kpi.accuracy.value < threshold) {
      add(list, {
        type: 'accuracyDrop', at: new Date().toISOString(), to: '/admin/analytics?tab=accuracy',
        vars: { value: kpi.accuracy.value, threshold }
      })
    }

    if (cfg.alertHandoff) {
      const waiting = (handoff || []).filter((h) => h.status === 'wait')
      if (waiting.length) {
        add(list, { type: 'handoffNew', at: waiting[0].createdAt, to: '/admin/handoff?tab=wait', vars: { n: waiting.length } })
      }
    }

    list.sort((a, b) => String(b.at).localeCompare(String(a.at)))
    set({ items: list, ready: true })
  },

  // 온보딩 개통처럼 화면이 직접 만드는 알림
  push: (item) => set((s) => ({ items: [{ id: `n-${++seq}`, read: false, at: new Date().toISOString(), ...item }, ...s.items] })),

  markRead: (id) => set((s) => ({ items: s.items.map((n) => (n.id === id ? { ...n, read: true } : n)) })),
  markAllRead: () => set((s) => ({ items: s.items.map((n) => ({ ...n, read: true })) }))
}))

export const unreadCount = (items) => items.filter((n) => !n.read).length

export default useNotifications
