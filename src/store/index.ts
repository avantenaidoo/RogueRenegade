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
  recentFiles: string[];

  addRecentFolder: (path: string) => void;
  addRecentFile: (path: string) => void;  
  removeRecentFolder: (path: string) => void;
  removeRecentFile: (path: string) => void;
}

const RECENT_FOLDERS_KEY = "rride:recent-folders";
const RECENT_FILES_KEY = "rride:recent-files";

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
  recentFolders: JSON.parse(localStorage.getItem(RECENT_FOLDERS_KEY) || "[]"),
  recentFiles: JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]"),

  addRecentFolder: (path) => {
    const current = get().recentFolders;

    const next = [
      path,
      ...current.filter(p => p !== path),
    ].slice(0, 10);

    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(next));
    set({ recentFolders: next });
  },

  addRecentFile: (path) => {
    const current = get().recentFiles;

    const next = [
      path,
      ...current.filter(p => p !== path),
    ].slice(0, 15);

    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
    set({ recentFiles: next });
  },

  removeRecentFolder: (path) => {
  const next = get().recentFolders.filter(p => p !== path);
  localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(next));
  set({ recentFolders: next });
},

removeRecentFile: (path) => {
  const next = get().recentFiles.filter(p => p !== path);
  localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
  set({ recentFiles: next });
},

}));

export const selectValidRecentFiles = (state: any) =>
  state.recentFiles.filter(
    (p: string) =>
      p &&
      p !== "untitled" &&
      typeof p === "string"
  );

