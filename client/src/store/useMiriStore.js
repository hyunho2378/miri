// useMiriStore.js 미리 데이터 단일 저장소. 메모리 전용(localStorage 금지).
// VITE_USE_MOCK=true 에서는 가상 데이터로 시작하고 새로고침하면 초기 상태로 돌아간다.
import { create } from 'zustand'
import { planningGrade } from '../lib/intake.js'
const GRADE_OK = new Set(['walk', 'assist', 'wheelchair', 'bed'])
import { buildSeed } from '../mock/seed.js'
import { seedFieldNotes } from '../lib/notes.js'

const seed = buildSeed()

export const useMiriStore = create((set, get) => ({
  ...seed,
  // 현장 소식(글, 음성)에서 읽은 명부 변경 후보. 담당자가 반영해야 명부가 바뀐다
  fieldNotes: seedFieldNotes(seed.persons, seed.today),

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
    const planOf = (r) => {
      const p = r.gradeUncertain !== undefined && GRADE_OK.has(r.grade) ? { grade: r.grade, uncertain: r.gradeUncertain } : planningGrade(r)
      const tags = (r.tags || []).filter((t) => t !== 'gradeUncertain')
      return { grade: p.grade, tags: p.uncertain ? [...tags, 'gradeUncertain'] : tags, aiGrade: r.aiGrade || r.grade }
    }
    const persons = doc.results.map((r, i) => ({
      // 등급 미확정은 낮은 쪽(부축) 대신 휠체어로 잡고 확인 필요 태그(회신 R36, lib/intake.planningGrade)
      code: r.personCode, villageCode: doc.villageCode, ...planOf(r), gradeSource: 'ai', review: 'pending', docId: doc.id, docPos: i + 1, updatedAt: s.today
    }))
    return { intakeDocs: [doc, ...s.intakeDocs], persons: [...s.persons, ...persons] }
  }),
  nextDocId: () => `DOC-${String(100 + get().intakeDocs.length).padStart(4, '0')}`,

  // 현장 소식. action: apply | edit | reject. 반영과 수정은 명부를 바꾸고 제외는 명부를 그대로 둔다
  addFieldNote: (note) => set((s) => ({ fieldNotes: [note, ...s.fieldNotes] })),
  nextNoteId: () => `NOTE-${String(1 + get().fieldNotes.length).padStart(4, '0')}`,
  reviewFieldNote: (id, action, patch = {}) => set((s) => {
    const note = s.fieldNotes.find((n) => n.id === id)
    if (!note) return {}
    const status = action === 'reject' ? 'rejected' : action === 'edit' ? 'edited' : 'applied'
    const fieldNotes = s.fieldNotes.map((n) => (n.id === id ? { ...n, status, final: action === 'reject' ? null : patch, reviewedAt: s.today } : n))
    if (action === 'reject') return { fieldNotes }
    const persons = s.persons.map((p) => (p.code === note.personCode
      ? { ...p, grade: patch.grade, tags: patch.tags || [], gradeSource: 'note', review: 'confirmed', docId: note.id, updatedAt: s.today }
      : p))
    return { fieldNotes, persons }
  }),

  // 자원
  upsertVehicle: (v) => set((s) => ({
    vehicles: s.vehicles.some((x) => x.code === v.code) ? s.vehicles.map((x) => (x.code === v.code ? { ...x, ...v } : x)) : [...s.vehicles, v]
  })),
  removeVehicle: (code) => set((s) => ({ vehicles: s.vehicles.filter((v) => v.code !== code) })),
  upsertHelper: (h) => set((s) => ({
    helpers: s.helpers.some((x) => x.code === h.code) ? s.helpers.map((x) => (x.code === h.code ? { ...x, ...h } : x)) : [...s.helpers, h]
  })),
  removeHelper: (code) => set((s) => ({ helpers: s.helpers.filter((h) => h.code !== code) })),

  // 대피소 확인 항목(승강기와 진입로). liftAccess: true 있음, false 없음, null 미확인. 확인 날짜는 담당자 기록
  updateShelter: (code, patch) => set((s) => ({
    shelters: s.shelters.map((x) => (x.code === code ? { ...x, ...patch, liftCheckedAt: s.today } : x))
  })),

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
