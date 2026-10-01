// useMiriStore.js 미리 데이터 단일 저장소. 메모리 전용(localStorage 금지).
// VITE_USE_MOCK=true 에서는 가상 데이터로 시작하고 새로고침하면 초기 상태로 돌아간다.
import { create } from 'zustand'
import { buildSeed } from '../mock/seed.js'

const seed = buildSeed()

export const useMiriStore = create((set, get) => ({
  ...seed,

  // 명부
  updatePerson: (code, patch) => set((s) => ({
    persons: s.persons.map((p) => (p.code === code ? { ...p, ...patch, updatedAt: s.today } : p))
  })),
  addPerson: (person, info) => set((s) => ({
    persons: [...s.persons, { gradeSource: 'manual', review: 'confirmed', tags: [], updatedAt: s.today, ...person }],
    privateInfo: info ? { ...s.privateInfo, [person.code]: info } : s.privateInfo
  })),
  removePerson: (code) => set((s) => ({ persons: s.persons.filter((p) => p.code !== code) })),

  // 서류 판독. action: confirm | edit | reject
  reviewResult: (docId, personCode, action, patch = {}) => set((s) => {
    const review = action === 'confirm' ? 'confirmed' : action === 'edit' ? 'edited' : 'rejected'
    const persons = s.persons.map((p) => (p.code === personCode
      ? { ...p, ...patch, review, gradeSource: action === 'edit' ? 'manual' : p.gradeSource, updatedAt: s.today }
      : p))
    const intakeDocs = s.intakeDocs.map((d) => {
      if (d.id !== docId) return d
      const results = d.results.map((r) => (r.personCode === personCode ? { ...r, ...patch, review } : r))
      return { ...d, results, status: results.every((r) => r.review && r.review !== 'pending') ? 'done' : 'pending' }
    })
    return { persons, intakeDocs }
  }),
  addIntakeDoc: (doc) => set((s) => {
    const persons = doc.results.map((r, i) => ({
      code: r.personCode, villageCode: doc.villageCode, grade: r.grade === 'unknown' ? 'assist' : r.grade, tags: r.tags || [],
      gradeSource: 'ai', review: 'pending', docId: doc.id, docPos: i + 1, updatedAt: s.today
    }))
    return { intakeDocs: [doc, ...s.intakeDocs], persons: [...s.persons, ...persons] }
  }),
  nextDocId: () => `DOC-${String(100 + get().intakeDocs.length).padStart(4, '0')}`,

  // 자원
  upsertVehicle: (v) => set((s) => ({
    vehicles: s.vehicles.some((x) => x.code === v.code) ? s.vehicles.map((x) => (x.code === v.code ? { ...x, ...v } : x)) : [...s.vehicles, v]
  })),
  removeVehicle: (code) => set((s) => ({ vehicles: s.vehicles.filter((v) => v.code !== code) })),
  upsertHelper: (h) => set((s) => ({
    helpers: s.helpers.some((x) => x.code === h.code) ? s.helpers.map((x) => (x.code === h.code ? { ...x, ...h } : x)) : [...s.helpers, h]
  })),
  removeHelper: (code) => set((s) => ({ helpers: s.helpers.filter((h) => h.code !== code) })),

  // 마을과 설정
  updateVillage: (code, patch) => set((s) => ({ villages: s.villages.map((v) => (v.code === code ? { ...v, ...patch } : v)) })),
  updateSettings: (patch) => set((s) => ({ settings: { ...s.settings, ...patch } })),

  // 시나리오
  saveScenario: (sc) => set((s) => ({
    scenarios: s.scenarios.some((x) => x.id === sc.id) ? s.scenarios.map((x) => (x.id === sc.id ? sc : x)) : [...s.scenarios, sc]
  })),
  removeScenario: (id) => set((s) => ({
    scenarios: s.scenarios.filter((x) => x.id !== id),
    activeScenarioId: s.activeScenarioId === id ? s.scenarios[0].id : s.activeScenarioId
  })),
  setActiveScenario: (activeScenarioId) => set({ activeScenarioId }),

  addRecord: (rec) => set((s) => ({ records: [rec, ...s.records] }))
}))

export const activeScenario = (s) => s.scenarios.find((x) => x.id === s.activeScenarioId) || s.scenarios[0]
export const villageLabel = (s, code) => s.villages.find((v) => v.code === code)?.label || code
export const dongName = (s, code) => s.dongs.find((d) => d.code === code)?.name || code

export default useMiriStore
