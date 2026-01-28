import { create } from "zustand";

interface FileTab {
  path: string;
  content: string;
  branch?: string | null;
  dirty: boolean;
}

interface EditorState {
  /* ───── EDITOR ───── */
  tabs: FileTab[];
  activeTabIndex: number;

  addTab: (path: string, content: string) => void;
  updateTab: (index: number, updates: Partial<FileTab>) => void;
  setActiveTab: (index: number) => void;
  closeTab: (index: number) => void;

  markDirty: (path: string) => void;
  markClean: (path: string) => void;

  /* ───── WORKSPACE ───── */
  repoPath: string | null;
  setRepoPath: (path: string) => void;

  /* ───── RECENTS ───── */
  recentFolders: string[];
  addRecentFolder: (path: string) => void;
}

const RECENTS_KEY = "rride:recent-folders";

export const useEditorStore = create<EditorState>((set, get) => ({
  /* ───── EDITOR STATE ───── */
  tabs: [],
  activeTabIndex: 0,

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

  updateTab: (index, updates) =>
    set(state => {
      const tabs = [...state.tabs];
      tabs[index] = { ...tabs[index], ...updates };
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

      return { tabs, activeTabIndex: Math.max(newIndex, 0) };
    }),

  markDirty: (path) =>
    set(state => ({
      tabs: state.tabs.map(tab =>
        tab.path === path ? { ...tab, dirty: true } : tab
      ),
    })),

  markClean: (path) =>
    set(state => ({
      tabs: state.tabs.map(tab =>
        tab.path === path ? { ...tab, dirty: false } : tab
      ),
    })),

  /* ───── WORKSPACE ───── */
  repoPath: null,
  setRepoPath: (path) => set({ repoPath: path }),

  /* ───── RECENTS ───── */
  recentFolders: JSON.parse(localStorage.getItem(RECENTS_KEY) || "[]"),

  addRecentFolder: (path) => {
    const current = get().recentFolders;

    const next = [
      path,
      ...current.filter(p => p !== path),
    ].slice(0, 10); // keep last 10 like VS Code

    localStorage.setItem(RECENTS_KEY, JSON.stringify(next));
    set({ recentFolders: next });
  },
}));
