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

    store.addRecentFile(file as string);
    store.addTab(file as string, contents);

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

      let path = activeTab.path;

      // UNTITLED → FORCE SAVE AS
      if (path === "untitled") {
        const newPath = await save();
        if (!newPath) return;

        path = newPath;

        store.updateTab(activeIndex, { path });
      }

      await invoke("write_file", {
        path,
        contents: activeTab.content
      });

      store.markClean(path);
      break;
    }

    /* ─────────────────────────────
       SAVE AS
       ───────────────────────────── */
    case "saveAs": {
      if (!activeTab) return;

      const newPath = await save();
      if (!newPath) return;

      await invoke("write_file", {
        path: newPath,
        contents: activeTab.content
      });

      store.updateTab(activeIndex, { path: newPath });
      store.markClean(newPath);
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
