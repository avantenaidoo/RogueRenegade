import { create } from "zustand";

interface FileTab {
  path: string;
  content: string;
}

interface EditorState {
  tabs: FileTab[];
  activeTabIndex: number;
  dirtyFiles: string[];
  addTab: (path: string, content: string) => void;
  updateTab: (index: number, content: string) => void;
  setActiveTab: (index: number) => void;
  closeTab: (index: number) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabIndex: 0,
  dirtyFiles: [],
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
  updateTab: (index, content) => {
    set(state => {
      const tabs = [...state.tabs];
      tabs[index].content = content;

      // Mark as dirty if not already
      const dirtyFiles = new Set(state.dirtyFiles);
      dirtyFiles.add(tabs[index].path);

      return { tabs, dirtyFiles: Array.from(dirtyFiles) };
    });
  },
  setActiveTab: index => set({ activeTabIndex: index }),
  closeTab: index =>
    set(state => {
      const tabs = [...state.tabs];
      const closedTab = tabs.splice(index, 1)[0];
      let newIndex = state.activeTabIndex;
      if (index < newIndex) newIndex -= 1;
      if (newIndex >= tabs.length) newIndex = tabs.length - 1;

      // Remove from dirtyFiles if open tab closed
      const dirtyFiles = state.dirtyFiles.filter(f => f !== closedTab.path);

      return { tabs, activeTabIndex: newIndex, dirtyFiles };
    }),
  markDirty: (path: string) =>
    set(state => ({
      dirtyFiles: Array.from(new Set([...state.dirtyFiles, path])),
    })),
  markClean: (path: string) =>
    set(state => ({
      dirtyFiles: state.dirtyFiles.filter(f => f !== path),
    })),
}));