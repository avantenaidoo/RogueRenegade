import { create } from "zustand";
import { getBranch } from "../utils/git";

interface FileTab {
  path: string;
  content: string;
  branch?: string | null;
}

interface EditorState {
  tabs: FileTab[];
  activeTabIndex: number;
  dirtyFiles: string[];
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
  addTab: async (path, content) => {
    const existingIndex = get().tabs.findIndex(t => t.path === path);
    if (existingIndex >= 0) {
      set({ activeTabIndex: existingIndex });
    } else {
      const branch = await getBranch(path);

      set(state => ({
        tabs: [...state.tabs, { path, content, branch }],
        activeTabIndex: state.tabs.length,
      }));
    }
  },
  updateTab: (index, updates) => {
    set(state => {
      const tabs = [...state.tabs];
      tabs[index] = { ...tabs[index], ...updates };

      // If content changed, mark as dirty
      if (updates.content !== undefined) {
        const dirtyFiles = new Set(state.dirtyFiles);
        dirtyFiles.add(tabs[index].path);
        return { tabs, dirtyFiles: Array.from(dirtyFiles) };
      }

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