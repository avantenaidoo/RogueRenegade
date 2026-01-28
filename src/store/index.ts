import { create } from "zustand";

interface FileTab {
  path: string;
  content: string;
  branch?: string | null;
  dirty?: boolean; // 🔴 REQUIRED FOR RED DOT
}

interface EditorState {
  tabs: FileTab[];
  activeTabIndex: number;
  dirtyFiles: string[];

  repoPath: string | null;
  setRepoPath: (path: string) => void;

  addTab: (path: string, content: string) => void;
  updateTab: (index: number, updates: Partial<FileTab>) => void;
  setActiveTab: (index: number) => void;
  closeTab: (index: number) => void;
  markDirty: (path: string) => void;
  markClean: (path: string) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  tabs: [],
  activeTabIndex: 0,
  dirtyFiles: [],

  repoPath: null,
  setRepoPath: (path) => set({ repoPath: path }),

  addTab: (path, content) => {
    const existingIndex = get().tabs.findIndex(t => t.path === path);
    if (existingIndex >= 0) {
      set({ activeTabIndex: existingIndex });
      return;
    }

    set(state => ({
      tabs: [
        ...state.tabs,
        { path, content, branch: null, dirty: false },
      ],
      activeTabIndex: state.tabs.length,
    }));
  },

  updateTab: (index, updates) => {
    set(state => {
      const tabs = [...state.tabs];
      tabs[index] = { ...tabs[index], ...updates };
      return { tabs };
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

      const dirtyFiles = state.dirtyFiles.filter(f => f !== closedTab.path);

      return { tabs, activeTabIndex: newIndex, dirtyFiles };
    }),

  markDirty: (path) =>
    set(state => ({
      tabs: state.tabs.map(tab =>
        tab.path === path ? { ...tab, dirty: true } : tab
      ),
      dirtyFiles: Array.from(new Set([...state.dirtyFiles, path])),
    })),

  markClean: (path) =>
    set(state => ({
      tabs: state.tabs.map(tab =>
        tab.path === path ? { ...tab, dirty: false } : tab
      ),
      dirtyFiles: state.dirtyFiles.filter(f => f !== path),
    })),
}));
