import { create } from "zustand";

interface FileTab {
  path: string;
  content: string;
}

interface EditorState {
  tabs: FileTab[];
  activeTabIndex: number;
  addTab: (path: string, content: string) => void;
  updateTab: (index: number, content: string) => void;
  setActiveTab: (index: number) => void;
  closeTab: (index: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabIndex: 0,
  addTab: (path, content) => {
    const existingIndex = get().tabs.findIndex(t => t.path === path);
    if (existingIndex >= 0) {
      set({ activeTabIndex: existingIndex });
    } else {
      set(state => ({
        tabs: [...state.tabs, { path, content }],
        activeTabIndex: state.tabs.length,
      }));
    }
  },
  updateTab: (index, content) =>
    set(state => {
      const tabs = [...state.tabs];
      tabs[index].content = content;
      return { tabs };
    }),
  setActiveTab: index => set({ activeTabIndex: index }),
  closeTab: index =>
    set(state => {
      const tabs = [...state.tabs];
      tabs.splice(index, 1);
      let newIndex = state.activeTabIndex;
      if (index < newIndex) newIndex -= 1;
      if (newIndex >= tabs.length) newIndex = tabs.length - 1;
      return { tabs, activeTabIndex: newIndex };
    }),
}));