import { create } from "zustand";
import { invoke } from "@tauri-apps/api/core";
import type { Workspace } from "../utils/workspace";

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
  messages: ChatMessage[];
  draft: string;
  attachments: ChatAttachment[];
}

/* ───────────────────────────────────────────── */
/* 🔥🔥🔥 CHAT MESSAGE TYPES — ADD ONLY 🔥🔥🔥 */
/* ───────────────────────────────────────────── */

interface ChatAttachment {
  path: string;
  name: string;
}

interface ChatMessage {
  id: string;
  chatId: string;
  senderId: string;
  senderName: string;
  text: string;
  attachments: ChatAttachment[];
  timestamp: number;
}
/* ───────────────────────────────────────────── */

export interface Collaborator {
  id: string;
  name: string;
}

/* 🔥🔥🔥 REMOTE CURSOR TYPE — ADD ONLY 🔥🔥🔥 */
export interface RemoteCursor {
  userId: string;
  file: string;
  lineNumber: number;
  column: number;
}

interface EditorState {
  /* ───── EDITOR ───── */
  tabs: FileTab[];
  activeTabIndex: number;

// 🔥 WORKSPACE-SCOPED TABS
tabsByWorkspace: Record<string, FileTab[]>;
activeTabIndexByWorkspace: Record<string, number>;
switchWorkspace: (path: string) => Promise<void>;
  addTab: (path: string, content: string) => void;
  updateTab: (index: number, updates: Partial<FileTab>) => void;
  setActiveTab: (index: number) => void;
  closeTab: (index: number) => void;

  markDirty: (path: string) => void;
  markClean: (path: string) => void;

  /* ───── WORKSPACE ───── */
  repoPath: string | null;
  setRepoPath: (path: string) => void;

  /* ───── WORKSPACES ───── */
  workspaces: Workspace[];

  // CURRENT BEHAVIOR (kept)
  activeWorkspaceId: string | null;

  // 🔥 FUTURE-PROOF (ADDED)
  activeWorkspaceIds: string[];
  focusedWorkspaceId: string | null;

  loadWorkspaces: () => Promise<void>;
  setActiveWorkspace: (id: string) => void;
  focusWorkspace: (id: string) => void;


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

  addChatMessage: (chatId: string, message: ChatMessage) => void;
  updateChatDraft: (chatId: string, draft: string) => void;
  addChatAttachment: (chatId: string, attachment: ChatAttachment) => void;
  clearChatInput: (chatId: string) => void;

  /* 🔥🔥🔥 CHAT PANEL LAYOUT STATE — ADD ONLY 🔥🔥🔥 */
  isChatMaximized: boolean;
  toggleChatMaximized: () => void;
  /* ───────────────────────────────────────────── */

  /* 🔥🔥🔥 COLLAB USERS — ADD ONLY 🔥🔥🔥 */
  users: Collaborator[];
  setUsers: (users: Collaborator[]) => void;

  /* 🔥🔥🔥 REMOTE CURSORS — ADD ONLY 🔥🔥🔥 */
  remoteCursors: Record<string, RemoteCursor>;
  setRemoteCursor: (cursor: RemoteCursor) => void;
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

// 🔥 WORKSPACE-SCOPED TAB PERSISTENCE
const OPEN_TABS_BY_WORKSPACE_KEY = "rride:open-tabs-by-workspace";
const ACTIVE_TAB_BY_WORKSPACE_KEY = "rride:active-tab-by-workspace";


/* 🔥 cursor persistence */
const CURSOR_MAP_KEY = "rride:cursor-map";

const normalize = (s: string) => s.replace(/\r\n/g, "\n");

export const useEditorStore = create<EditorState>((set, get) => ({

  /* ───── WORKSPACES ───── */
  workspaces: [],
  activeWorkspaceId: null,

  // 🔥 ADDED (does NOT break existing logic)
  activeWorkspaceIds: [],
  focusedWorkspaceId: null,

  loadWorkspaces: async () => {
    const workspaces = await invoke<Workspace[]>("get_workspaces");

    const firstId = workspaces[0]?.id ?? null;

    set({
      workspaces,

      // existing behavior preserved
      activeWorkspaceId: firstId,

      // new future-proof state
      activeWorkspaceIds: firstId ? [firstId] : [],
      focusedWorkspaceId: firstId,
    });
  },

  setActiveWorkspace: id =>
    set({
      activeWorkspaceId: id,
      focusedWorkspaceId: id,
      activeWorkspaceIds: [id],
    }),

  // 🔥 NEW — used later, not yet by UI
  focusWorkspace: id => {
    set(state => ({
      focusedWorkspaceId: id,
      activeWorkspaceIds: state.activeWorkspaceIds.includes(id)
        ? state.activeWorkspaceIds
        : [...state.activeWorkspaceIds, id],
    }));

    // 🔥 AUTO-RESTORE TABS FOR THIS WORKSPACE
    get().restoreTabs();
  },




  /* ───── EDITOR STATE ───── */
  tabs: [],
  activeTabIndex: 0,

  // 🔥 WORKSPACE-SCOPED
  tabsByWorkspace: {},
  activeTabIndexByWorkspace: {},


  addTab: (path, content) => {
    const wsId = get().focusedWorkspaceId;
    if (!wsId) return;

    const tabs = get().tabs;
    const existingIndex = tabs.findIndex(t => t.path === path);

    if (existingIndex >= 0) {
      set(state => ({
        activeTabIndex: existingIndex,
        activeTabIndexByWorkspace: {
          ...state.activeTabIndexByWorkspace,
          [wsId]: existingIndex,
        },
      }));
      return;
    }

    set(state => {
      const nextTabs = [
        ...tabs,
        {
          path,
          content,
          savedContent: normalize(content),
          branch: null,
          dirty: false,
        },
      ];

      const nextIndex = nextTabs.length - 1;

      const nextTabsByWs = {
        ...state.tabsByWorkspace,
        [wsId]: nextTabs,
      };

      const nextActiveByWs = {
        ...state.activeTabIndexByWorkspace,
        [wsId]: nextIndex,
      };

      // 🔥 PERSIST
      localStorage.setItem(
        OPEN_TABS_BY_WORKSPACE_KEY,
        JSON.stringify(
          Object.fromEntries(
            Object.entries(nextTabsByWs).map(([id, tabs]) => [
              id,
              tabs.map(t => t.path),
            ])
          )
        )
      );

      localStorage.setItem(
        ACTIVE_TAB_BY_WORKSPACE_KEY,
        JSON.stringify(nextActiveByWs)
      );

      return {
        tabs: nextTabs,
        activeTabIndex: nextIndex,
        tabsByWorkspace: nextTabsByWs,
        activeTabIndexByWorkspace: nextActiveByWs,
      };

    });
  },


  updateTab: (index, updates) =>
    set(state => {
      const wsId = state.focusedWorkspaceId;
      if (!wsId) return state;

      const tabs = [...(state.tabsByWorkspace[wsId] ?? [])];
      const tab = tabs[index];

      if (!tab) {
        if (!updates.path || updates.content === undefined) {
          console.warn("⚠️ updateTab called for missing tab without path/content");
          return state;
        }

        const normalized = normalize(updates.content);

        tabs[index] = {
          path: updates.path,
          content: normalized,
          savedContent: normalized,
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
          dirty: nextContent !== nextSaved, // 🔥 UNDO FIX
        };
      }

      // cursor persistence unchanged
      if (updates.cursor) {
        const map = JSON.parse(
          localStorage.getItem(CURSOR_MAP_KEY) || "{}"
        );
        map[tabs[index].path] = updates.cursor;
        localStorage.setItem(CURSOR_MAP_KEY, JSON.stringify(map));
      }

      return {
        tabs, // legacy mirror
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [wsId]: tabs,
        },
      };
    }),


    setActiveTab: index => {
      const wsId = get().focusedWorkspaceId;
      if (!wsId) return;

      set(state => {
        const nextActive = {
          ...state.activeTabIndexByWorkspace,
          [wsId]: index,
        };

        localStorage.setItem(
          ACTIVE_TAB_BY_WORKSPACE_KEY,
          JSON.stringify(nextActive)
        );

        return {
          activeTabIndex: index,
          activeTabIndexByWorkspace: nextActive,
        };
      });

  },


  closeTab: index =>
    set(state => {
      const wsId = state.focusedWorkspaceId;
      if (!wsId) return state;

      const tabs = [...state.tabs];
      tabs.splice(index, 1);

      let newIndex = state.activeTabIndex;
      if (index < newIndex) newIndex -= 1;
      if (newIndex >= tabs.length) newIndex = tabs.length - 1;

      const finalIndex = Math.max(newIndex, 0);

      const nextTabsByWs = {
        ...state.tabsByWorkspace,
        [wsId]: tabs,
      };

      const nextActiveByWs = {
        ...state.activeTabIndexByWorkspace,
        [wsId]: finalIndex,
      };

      localStorage.setItem(
        OPEN_TABS_BY_WORKSPACE_KEY,
        JSON.stringify(
          Object.fromEntries(
            Object.entries(nextTabsByWs).map(([id, tabs]) => [
              id,
              tabs.map(t => t.path),
            ])
          )
        )
      );

      localStorage.setItem(
        ACTIVE_TAB_BY_WORKSPACE_KEY,
        JSON.stringify(nextActiveByWs)
      );

      return {
        tabs,
        activeTabIndex: finalIndex,
        tabsByWorkspace: nextTabsByWs,
        activeTabIndexByWorkspace: nextActiveByWs,
      };

    }),


  markDirty: path =>
    set(state => {
      const wsId = state.focusedWorkspaceId;
      if (!wsId) return state;

      const update = (tabs: FileTab[]) =>
        tabs.map(tab =>
          tab.path === path ? { ...tab, dirty: true } : tab
        );

      return {
        tabs: update(state.tabs),
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [wsId]: update(state.tabsByWorkspace[wsId] ?? []),
        },
      };
    }),


  markClean: path =>
    set(state => {
      const wsId = state.focusedWorkspaceId;
      if (!wsId) return state;

      const update = (tabs: FileTab[]) =>
        tabs.map(tab =>
          tab.path === path ? { ...tab, dirty: false } : tab
        );

      return {
        tabs: update(state.tabs),
        tabsByWorkspace: {
          ...state.tabsByWorkspace,
          [wsId]: update(state.tabsByWorkspace[wsId] ?? []),
        },
      };
    }),


  /* ───── WORKSPACE ───── */
  repoPath: null,
  setRepoPath: path => set({ repoPath: path }),

  /* ───── COLLABORATION UI ───── */
  showCollaboration: false,
  setShowCollaboration: open => set({ showCollaboration: open }),
  toggleCollaboration: () =>
    set(state => ({ showCollaboration: !state.showCollaboration })),

  /* 🔥🔥🔥 CHAT STATE — UNTOUCHED 🔥🔥🔥 */
  chatTabs: [
    {
      id: "chat-1",
      title: "Chat 1",
      messages: [],
      draft: "",
      attachments: [],
    },
  ],
  activeChatId: "chat-1",

  addChatTab: () =>
    set(state => {
      const id = `chat-${Date.now()}`;
      return {
        chatTabs: [
          ...state.chatTabs,
          {
            id,
            title: `Chat ${state.chatTabs.length + 1}`,
            messages: [],
            draft: "",
            attachments: [],
          },
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

  addChatMessage: (chatId, message) =>
    set(state => ({
      chatTabs: state.chatTabs.map(t =>
        t.id === chatId
          ? { ...t, messages: [...t.messages, message] }
          : t
      ),
    })),

  updateChatDraft: (chatId, draft) =>
    set(state => ({
      chatTabs: state.chatTabs.map(t =>
        t.id === chatId ? { ...t, draft } : t
      ),
    })),

  addChatAttachment: (chatId, attachment) =>
    set(state => ({
      chatTabs: state.chatTabs.map(t =>
        t.id === chatId
          ? { ...t, attachments: [...t.attachments, attachment] }
          : t
      ),
    })),

  clearChatInput: chatId =>
    set(state => ({
      chatTabs: state.chatTabs.map(t =>
        t.id === chatId
          ? { ...t, draft: "", attachments: [] }
          : t
      ),
    })),

  /* 🔥🔥🔥 CHAT PANEL LAYOUT STATE — UNTOUCHED 🔥🔥🔥 */
  isChatMaximized: false,
  toggleChatMaximized: () =>
    set(state => ({ isChatMaximized: !state.isChatMaximized })),

  /* 🔥🔥🔥 USERS — ADDED 🔥🔥🔥 */
  users: [],
  setUsers: users => set({ users }),

  /* 🔥🔥🔥 REMOTE CURSORS — ADDED 🔥🔥🔥 */
  remoteCursors: {},
  setRemoteCursor: cursor =>
    set(state => ({
      remoteCursors: {
        ...state.remoteCursors,
        [cursor.userId]: cursor,
      },
    })),

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
    const wsId = get().focusedWorkspaceId;
    if (!wsId) return;

    const tabsByWorkspace = JSON.parse(
      localStorage.getItem(OPEN_TABS_BY_WORKSPACE_KEY) || "{}"
    ) as Record<string, string[]>;

    const activeByWorkspace = JSON.parse(
      localStorage.getItem(ACTIVE_TAB_BY_WORKSPACE_KEY) || "{}"
    ) as Record<string, number>;

    const paths = tabsByWorkspace[wsId] ?? [];
    const activeIndex = activeByWorkspace[wsId] ?? 0;

    const cursorMap = JSON.parse(
      localStorage.getItem(CURSOR_MAP_KEY) || "{}"
    );

    const restored: FileTab[] = [];

    for (const path of paths) {
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

    set(state => ({
      tabs: restored,
      activeTabIndex: Math.min(activeIndex, restored.length - 1),

      tabsByWorkspace: {
        ...state.tabsByWorkspace,
        [wsId]: restored,
      },

      activeTabIndexByWorkspace: {
        ...state.activeTabIndexByWorkspace,
        [wsId]: Math.min(activeIndex, restored.length - 1),
      },
    }));
  },

  switchWorkspace: async (path: string) => {
  const state = get();

  // 1️⃣ Allow Tauri access
  await invoke("allow_workspace_dir", { path });

  // 2️⃣ Find or create workspace
  const existing = state.workspaces.find(
    w => w.root_path === path
  );

  const workspace: Workspace =
    existing ??
    {
      id: crypto.randomUUID(),
      root_path: path,
    };

  if (!existing) {
    set(s => ({
      workspaces: [...s.workspaces, workspace],
    }));
  }

  const wsId = workspace.id;


  // 3️⃣ Switch workspace identity
  set({
    repoPath: path,
    activeWorkspaceId: wsId,
    focusedWorkspaceId: wsId,
  });

  // 4️⃣ Bind editor state to this workspace
  set(state => ({
    tabs: state.tabsByWorkspace[wsId] ?? [],
    activeTabIndex: state.activeTabIndexByWorkspace[wsId] ?? 0,
  }));

  // 5️⃣ Recents
  state.addRecentFolder(path);

  // 6️⃣ GLOBAL WORKSPACE CHANGE SIGNAL
  window.dispatchEvent(
    new CustomEvent("workspace-changed", {
      detail: { root_path: path, workspaceId: wsId },
    })
  );

},


}));

export const selectValidRecentFiles = (state: any) =>
  state.recentFiles.filter(
    (p: string) =>
      p &&
      p !== "untitled" &&
      typeof p === "string"
  );
