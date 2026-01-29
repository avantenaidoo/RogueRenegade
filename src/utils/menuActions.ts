import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { getCurrentWindow } from "@tauri-apps/api/window";
import { useEditorStore } from "../store";

export async function runMenuAction(action?: string) {
  if (!action) return;

  const store = useEditorStore.getState();
  const appWindow = getCurrentWindow();

  const activeIndex = store.activeTabIndex;
  const activeTab = store.tabs[activeIndex];

  switch (action) {
    /* ─────────────────────────────
       NEW FILE
       ───────────────────────────── */
    case "newFile":
      store.addTab("untitled", "");
      break;

    /* ─────────────────────────────
       OPEN FILE
       ───────────────────────────── */
    case "openFile": {
      const file = await open({ multiple: false });
      if (!file) return;

      const contents = await invoke<string>("read_file", { path: file });

      store.addTab(file as string, contents);
      store.addRecentFile(file as string);
      break;
    }

    /* ─────────────────────────────
       OPEN FOLDER
       ───────────────────────────── */
    case "openFolder": {
      const folder = await open({ directory: true });
      if (!folder) return;

      await invoke("allow_workspace_dir", { path: folder });
      store.setRepoPath(folder as string);
      store.addRecentFolder(folder as string);
      break;
    }

    /* ─────────────────────────────
       SAVE
       ───────────────────────────── */
    case "save": {
      if (!activeTab) return;

      // 🔥 UNTITLED FILE → FORCE SAVE AS
      if (activeTab.path === "untitled") {
        const newPath = await save();
        if (!newPath) return;

        // ⚠️ MUST UPDATE TAB FIRST
        store.updateTab(activeIndex, {
          path: newPath,
          dirty: false,
        });

        await invoke("write_file", {
          path: newPath,
          contents: activeTab.content,
        });

        store.addRecentFile(newPath);
        break;
      }

      // NORMAL SAVE
      await invoke("write_file", {
        path: activeTab.path,
        contents: activeTab.content,
      });

      store.markClean(activeTab.path);
      store.addRecentFile(activeTab.path);
      break;
    }

    /* ─────────────────────────────
       SAVE AS
       ───────────────────────────── */
    case "saveAs":
    case "save_as": {
      if (!activeTab) return;

      const newPath = await save();
      if (!newPath) return;

      await invoke("write_file", {
        path: newPath,
        contents: activeTab.content,
      });

      store.updateTab(activeIndex, {
        path: newPath,
        dirty: false,
      });

      store.addRecentFile(newPath);
      break;
    }

    /* ─────────────────────────────
       EXIT
       ───────────────────────────── */
    case "exit":
      await appWindow.close();
      break;

    default:
      console.warn("Unhandled menu action:", action);
  }
}
