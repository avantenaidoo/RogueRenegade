import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

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

  /* ───── TAB PERSISTENCE ───── */
  restoreTabs: () => Promise<void>;
}

const RECENT_FOLDERS_KEY = "rride:recent-folders";
const RECENT_FILES_KEY = "rride:recent-files";

const OPEN_TABS_KEY = "rride:open-tabs";
const ACTIVE_TAB_KEY = "rride:active-tab";

export const useEditorStore = create<EditorState>((set, get) => ({
  /* ───── EDITOR STATE ───── */
  tabs: [],
  activeTabIndex: 0,

  addTab: (path, content) => {
    const existingIndex = get().tabs.findIndex(t => t.path === path);
    if (existingIndex >= 0) {
      localStorage.setItem(ACTIVE_TAB_KEY, String(existingIndex));
      set({ activeTabIndex: existingIndex });
      return;
    }

    set(state => {
      const nextTabs = [
        ...state.tabs,
        { path, content, branch: null, dirty: false },
      ];

      localStorage.setItem(
        OPEN_TABS_KEY,
        JSON.stringify(nextTabs.map(t => t.path))
      );
      localStorage.setItem(
        ACTIVE_TAB_KEY,
        String(nextTabs.length - 1)
      );

      return {
        tabs: nextTabs,
        activeTabIndex: nextTabs.length - 1,
      };
    });
  },

  /* 🔥 FIXED: updateTab can now CREATE tabs safely */
  updateTab: (index, updates) =>
    set(state => {
      const tabs = [...state.tabs];

      if (!tabs[index]) {
        if (!updates.path || updates.content === undefined) {
          console.warn("⚠️ updateTab called for missing tab without path/content");
          return state;
        }

        tabs[index] = {
          path: updates.path,
          content: updates.content,
          branch: updates.branch ?? null,
          dirty: updates.dirty ?? false,
        };
      } else {
        tabs[index] = { ...tabs[index], ...updates };
      }

      localStorage.setItem(
        OPEN_TABS_KEY,
        JSON.stringify(tabs.map(t => t.path))
      );

      return { tabs };
    }),

  setActiveTab: index => {
    localStorage.setItem(ACTIVE_TAB_KEY, String(index));
    set({ activeTabIndex: index });
  },

  closeTab: index =>
    set(state => {
      const tabs = [...state.tabs];
      tabs.splice(index, 1);

      let newIndex = state.activeTabIndex;
      if (index < newIndex) newIndex -= 1;
      if (newIndex >= tabs.length) newIndex = tabs.length - 1;

      localStorage.setItem(
        OPEN_TABS_KEY,
        JSON.stringify(tabs.map(t => t.path))
      );
      localStorage.setItem(
        ACTIVE_TAB_KEY,
        String(Math.max(newIndex, 0))
      );

      return { tabs, activeTabIndex: Math.max(newIndex, 0) };
    }),

  markDirty: path =>
    set(state => ({
      tabs: state.tabs.map(tab =>
        tab.path === path ? { ...tab, dirty: true } : tab
      ),
    })),

  markClean: path =>
    set(state => ({
      tabs: state.tabs.map(tab =>
        tab.path === path ? { ...tab, dirty: false } : tab
      ),
    })),

  /* ───── WORKSPACE ───── */
  repoPath: null,
  setRepoPath: path => set({ repoPath: path }),

  /* ───── RECENTS ───── */
  recentFolders: JSON.parse(localStorage.getItem(RECENT_FOLDERS_KEY) || "[]"),
  recentFiles: JSON.parse(localStorage.getItem(RECENT_FILES_KEY) || "[]"),

  addRecentFolder: path => {
    const current = get().recentFolders;
    const next = [path, ...current.filter(p => p !== path)].slice(0, 10);
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(next));
    set({ recentFolders: next });
  },

  addRecentFile: path => {
    const current = get().recentFiles;
    const next = [path, ...current.filter(p => p !== path)].slice(0, 15);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
    set({ recentFiles: next });
  },

  removeRecentFolder: path => {
    const next = get().recentFolders.filter(p => p !== path);
    localStorage.setItem(RECENT_FOLDERS_KEY, JSON.stringify(next));
    set({ recentFolders: next });
  },

  removeRecentFile: path => {
    const next = get().recentFiles.filter(p => p !== path);
    localStorage.setItem(RECENT_FILES_KEY, JSON.stringify(next));
    set({ recentFiles: next });
  },

  /* ───── TAB RESTORE ───── */
  restoreTabs: async () => {
    const rawTabs = JSON.parse(
      localStorage.getItem(OPEN_TABS_KEY) || "[]"
    ) as string[];

    const activeIndex = Number(
      localStorage.getItem(ACTIVE_TAB_KEY) || 0
    );

    const restored: FileTab[] = [];

    for (const path of rawTabs) {
      if (path === "untitled") continue;

      try {
        const contents = await invoke<string>("read_file", { path });
        restored.push({
          path,
          content: contents,
          branch: null,
          dirty: false,
        });
      } catch {
        // file deleted → skip
      }
    }

    set({
      tabs: restored,
      activeTabIndex: Math.min(activeIndex, restored.length - 1),
    });
  },
}));

export const selectValidRecentFiles = (state: any) =>
  state.recentFiles.filter(
    (p: string) =>
      p &&
      p !== "untitled" &&
      typeof p === "string"
  );
