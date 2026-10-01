// useChatUi.js 대화 진입 여부. TopNav 가 panelOpen 으로 폭을 넓힌다(DESIGN.md 모션 예외 1건).
// 6단계에서 대화 목록을 얹었다. TopNav(시민 헤더)가 모바일 목록을 열어야 하는데
// ChatPage 와 TopNav 는 형제라 props 로 못 넘긴다. 그래서 목록을 여기에 둔다.
import { create } from 'zustand'

export const useChatUi = create((set) => ({
  panelOpen: false,
  setPanelOpen: (panelOpen) => set({ panelOpen }),

  // 이번 세션 대화 목록. 메모리다. 새로고침하면 사라진다(웹스토리지 금지)
  conversations: [],
  activeId: null,
  listOpen: false,                                  // 모바일 드로어
  setConversations: (conversations) => set({ conversations }),
  setActiveId: (activeId) => set({ activeId }),
  setListOpen: (listOpen) => set({ listOpen }),
  // ChatPage 가 넣어 두는 조작 핸들. TopNav 가 목록에서 대화를 고를 때 쓴다
  handlers: { pick: null, create: null },
  setHandlers: (handlers) => set({ handlers })
}))

export default useChatUi
