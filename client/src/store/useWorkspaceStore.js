// useWorkspaceStore.js 문서함(문서, 시트, 설문지) 저장소. 메모리 전용(브라우저 저장소 금지, ROUTES.md).
// 새로고침하면 처음 상태로 돌아간다. 실제 주민 개인정보를 넣지 않는다.
import { create } from 'zustand'
import { DOC_TEMPLATES, FORM_TEMPLATES, SHEET_TEMPLATES } from '../lib/workspaceTemplates.js'

let seq = 100
const nid = (p) => `${p}${++seq}`
const now = () => new Date().toISOString()

const fromDocTemplate = (t, title) => ({
  id: nid('d'), kind: 'doc', title: title || t.title, html: t.html, updatedAt: now(), createdAt: now(),
  versions: [{ at: now(), label: '처음 만듦', html: t.html }]
})
const fromSheetTemplate = (t, title) => ({
  id: nid('s'), kind: 'sheet', title: title || t.title,
  columns: t.columns.map((c) => ({ ...c })), rows: (t.rows || []).map((r) => [...r]),
  source: t.source || null, formId: null, updatedAt: now(), createdAt: now()
})
const fromFormTemplate = (t, title) => ({
  id: nid('f'), kind: 'form', title: title || t.title, desc: t.desc,
  questions: t.questions.map((q) => ({ ...q, id: nid('q'), options: q.options ? [...q.options] : undefined })),
  responses: [], open: true, sheetId: null, updatedAt: now(), createdAt: now()
})

function buildSeed() {
  const docs = [
    fromDocTemplate(DOC_TEMPLATES.find((t) => t.key === 'request'), '동해시 안전과 협조 요청서'),
    fromDocTemplate(DOC_TEMPLATES.find((t) => t.key === 'interview'), '망상동 담당자 인터뷰 기록')
  ]
  const sheets = [
    fromSheetTemplate(SHEET_TEMPLATES.find((t) => t.key === 'roster'), '대상자 명부'),
    fromSheetTemplate(SHEET_TEMPLATES.find((t) => t.key === 'accuracy'), '서류 읽기 정확도 검증표')
  ]
  const form = fromFormTemplate(FORM_TEMPLATES.find((t) => t.key === 'helper'), '망상동 대피 도우미 모집')
  const formSheet = {
    id: nid('s'), kind: 'sheet', title: `${form.title} (응답)`, columns: [], rows: [],
    source: 'form', formId: form.id, updatedAt: now(), createdAt: now()
  }
  form.sheetId = formSheet.id
  return { items: [...docs, ...sheets, form, formSheet] }
}

export const useWorkspaceStore = create((set, get) => ({
  ...buildSeed(),

  get: (id) => get().items.find((x) => x.id === id),

  create: (kind, templateKey, title) => {
    let item
    if (kind === 'doc') item = fromDocTemplate(DOC_TEMPLATES.find((t) => t.key === templateKey) || DOC_TEMPLATES[0], title)
    if (kind === 'sheet') item = fromSheetTemplate(SHEET_TEMPLATES.find((t) => t.key === templateKey) || SHEET_TEMPLATES[0], title)
    if (kind === 'form') item = fromFormTemplate(FORM_TEMPLATES.find((t) => t.key === templateKey) || FORM_TEMPLATES[0], title)
    set((s) => ({ items: [item, ...s.items] }))
    return item.id
  },

  update: (id, patch) => set((s) => ({
    items: s.items.map((x) => (x.id === id ? { ...x, ...patch, updatedAt: now() } : x))
  })),

  remove: (id) => set((s) => ({ items: s.items.filter((x) => x.id !== id && x.formId !== id) })),

  duplicate: (id) => {
    const src = get().items.find((x) => x.id === id)
    if (!src) return null
    const copy = JSON.parse(JSON.stringify(src))
    copy.id = nid(src.kind[0])
    copy.title = `${src.title} 사본`
    copy.createdAt = now(); copy.updatedAt = now()
    if (copy.kind === 'form') { copy.responses = []; copy.sheetId = null }
    set((s) => ({ items: [copy, ...s.items] }))
    return copy.id
  },

  // 문서 버전 저장. 같은 내용이면 건너뛴다
  saveVersion: (id, label) => set((s) => ({
    items: s.items.map((x) => {
      if (x.id !== id || x.kind !== 'doc') return x
      const last = x.versions[x.versions.length - 1]
      if (last && last.html === x.html) return x
      return { ...x, versions: [...x.versions, { at: now(), label: label || '자동 저장', html: x.html }].slice(-30) }
    })
  })),

  // 설문 응답. 연결 시트가 있으면 시트는 응답에서 다시 그린다(SheetEditor 가 formId 로 읽는다)
  submit: (formId, answers) => set((s) => ({
    items: s.items.map((x) => (x.id === formId
      ? { ...x, responses: [...x.responses, { id: nid('r'), at: now(), answers }] }
      : x))
  })),

  linkSheet: (formId) => {
    const form = get().items.find((x) => x.id === formId)
    if (!form) return null
    if (form.sheetId && get().items.some((x) => x.id === form.sheetId)) return form.sheetId
    const sheet = { id: nid('s'), kind: 'sheet', title: `${form.title} (응답)`, columns: [], rows: [], source: 'form', formId, updatedAt: now(), createdAt: now() }
    set((s) => ({ items: [sheet, ...s.items.map((x) => (x.id === formId ? { ...x, sheetId: sheet.id } : x))] }))
    return sheet.id
  }
}))

export default useWorkspaceStore
