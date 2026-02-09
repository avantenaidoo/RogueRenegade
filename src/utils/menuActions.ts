import { invoke } from "@tauri-apps/api/core";
import { open, save } from "@tauri-apps/plugin-dialog";
import { useEditorStore } from "../store";
import { WebviewWindow } from "@tauri-apps/api/webviewWindow";


/* ✅ FIX: LOCAL NORMALIZE (DO NOT REMOVE) */
const normalize = (s: string) => s.replace(/\r\n/g, "\n");

export async function runMenuAction(action?: string) {
  console.log("[MENU ACTION FIRED]", action);
  if (!action) return;

  const store = useEditorStore.getState();

  const activeIndex = store.activeTabIndex;
  const activeTab = store.tabs[activeIndex];

  switch (action) {
    /* ─────────────────────────────
   NEW WINDOW (BLANK)
   ───────────────────────────── */
    case "newWindow": {
      console.log("[NEW WINDOW] about to create");

      const label = `rride-${Date.now()}`;
      console.log("[NEW WINDOW] label =", label);

      const win = new WebviewWindow(label, {
        url: "index.html?blank=true",
        title: "Rogue Renegade IDE",

        width: 1400,
        height: 900,
        minWidth: 1000,
        minHeight: 700,

        decorations: false, 
        transparent: false,
      });

      // 🔴 VERY IMPORTANT DEBUG HOOKS
      win.once("tauri://created", () => {
        console.log("[NEW WINDOW] CREATED OK");
      });

      win.once("tauri://error", (e) => {
        console.error("[NEW WINDOW] ERROR", e);
      });

      console.log("[NEW WINDOW] constructor finished");
      break;
    }

  /* ─────────────────────────────
   NEW TEXT FILE (UNTITLED)
   ───────────────────────────── */
    case "newTextFile":
      store.addTab("untitled", "");
      break;
/* ─────────────────────────────
   NEW FILE (CREATE ON DISK)
   ───────────────────────────── */
    case "newFile": {
      const newPath = await save();
      if (!newPath) return;

      await invoke("write_file", {
        path: newPath,
        contents: "",
      });

      store.addTab(newPath, "");
      store.addRecentFile(newPath);
      break;
    }
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

        store.updateTab(activeIndex, {
          path: newPath,
          savedContent: normalize(activeTab.content),
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

      store.updateTab(activeIndex, {
        savedContent: normalize(activeTab.content),
      });

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
        savedContent: normalize(activeTab.content),
      });

      store.addRecentFile(newPath);
      break;
    }

    /* ─────────────────────────────
       EXIT
       ───────────────────────────── */
    case "exit": {
      const store = useEditorStore.getState();

      await invoke("log_and_exit", {
        lastWorkspace: store.repoPath,
        openFiles: store.tabs.map(t => t.path),
        activeFile: store.tabs[store.activeTabIndex]?.path ?? null,
        cursors: store.tabs
          .filter(t => t.path && t.cursor)
          .map(t => ({
            path: t.path!,
            cursor: t.cursor!
          }))
      });

      break;
    }

    default:
      console.warn("Unhandled menu action:", action);
  }
}
