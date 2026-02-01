import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";

interface FileTab {
  path: string;
  content: string;
  savedContent: string; // 🔥 baseline for dirty comparison
  branch?: string | null;
  dirty: boolean;
  cursor?: {
    lineNumber: number;
    column: number;
  };
}

/* ───────────────────────────────────────────── */
/* 🔥🔥🔥 CHAT TYPES — ADD ONLY 🔥🔥🔥 */
/* ───────────────────────────────────────────── */
interface ChatTab {
  id: string;
  title: string;
}
/* ───────────────────────────────────────────── */

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

  /* ───── COLLABORATION UI ───── */
  showCollaboration: boolean;
  setShowCollaboration: (open: boolean) => void;
  toggleCollaboration: () => void;

  /* ───────────────────────────────────────────── */
  /* 🔥🔥🔥 CHAT STATE — ADD ONLY 🔥🔥🔥 */
  /* ───────────────────────────────────────────── */
  chatTabs: ChatTab[];
  activeChatId: string;

  addChatTab: () => void;
  setActiveChat: (id: string) => void;
  closeChatTab: (id: string) => void;
  /* ───────────────────────────────────────────── */

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

/* 🔥 cursor persistence */
const CURSOR_MAP_KEY = "rride:cursor-map";

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

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
        {
          path,
          content,
          savedContent: normalize(content),
          branch: null,
          dirty: false,
        },
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

  updateTab: (index, updates) =>
    set(state => {
      const tabs = [...state.tabs];
      const tab = tabs[index];

      if (!tab) {
        if (!updates.path || updates.content === undefined) {
          console.warn("⚠️ updateTab called for missing tab without path/content");
          return state;
        }

        tabs[index] = {
          path: updates.path,
          content: updates.content,
          savedContent: updates.content,
          branch: updates.branch ?? null,
          dirty: false,
        };
      } else {
        const nextContent =
          updates.content !== undefined
            ? normalize(updates.content)
            : tab.content;

        const nextSaved =
          updates.savedContent !== undefined
            ? normalize(updates.savedContent)
            : tab.savedContent;

        tabs[index] = {
          ...tab,
          ...updates,
          content: nextContent,
          savedContent: nextSaved,
          dirty: nextContent !== nextSaved,
        };
      }

      if (updates.cursor) {
        const map = JSON.parse(
          localStorage.getItem(CURSOR_MAP_KEY) || "{}"
        );
        map[tabs[index].path] = updates.cursor;
        localStorage.setItem(CURSOR_MAP_KEY, JSON.stringify(map));
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

  /* ───── COLLABORATION UI ───── */
  showCollaboration: false,
  setShowCollaboration: open => set({ showCollaboration: open }),
  toggleCollaboration: () =>
    set(state => ({ showCollaboration: !state.showCollaboration })),

  /* ───────────────────────────────────────────── */
  /* 🔥🔥🔥 CHAT STATE — ADD ONLY 🔥🔥🔥 */
  /* ───────────────────────────────────────────── */
  chatTabs: [{ id: "chat-1", title: "Chat 1" }],
  activeChatId: "chat-1",

  addChatTab: () =>
    set(state => {
      const id = `chat-${Date.now()}`;
      return {
        chatTabs: [
          ...state.chatTabs,
          { id, title: `Chat ${state.chatTabs.length + 1}` },
        ],
        activeChatId: id,
      };
    }),

  setActiveChat: id => set({ activeChatId: id }),

  closeChatTab: id =>
    set(state => {
      const remaining = state.chatTabs.filter(t => t.id !== id);

      return {
        chatTabs: remaining,
        activeChatId:
          state.activeChatId === id
            ? remaining[remaining.length - 1]?.id ?? ""
            : state.activeChatId,
      };
    }),
  /* ───────────────────────────────────────────── */

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

  restoreTabs: async () => {
    const rawTabs = JSON.parse(
      localStorage.getItem(OPEN_TABS_KEY) || "[]"
    ) as string[];

    const activeIndex = Number(
      localStorage.getItem(ACTIVE_TAB_KEY) || 0
    );

    const cursorMap = JSON.parse(
      localStorage.getItem(CURSOR_MAP_KEY) || "{}"
    );

    const restored: FileTab[] = [];

    for (const path of rawTabs) {
      if (path === "untitled") continue;

      try {
        const contents = await invoke<string>("read_file", { path });
        restored.push({
          path,
          content: contents,
          savedContent: normalize(contents),
          branch: null,
          dirty: false,
          cursor: cursorMap[path],
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
