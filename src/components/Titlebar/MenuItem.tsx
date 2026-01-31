import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { exists } from "@tauri-apps/plugin-fs";
import { useEditorStore } from "../../store";
import { runMenuAction } from "../../utils/menuActions";

export function MenuItem({ item, closeMenu }: any) {
  const [open, setOpen] = useState(false);

  const recentFolders = useEditorStore(s => s.recentFolders);
  const recentFiles = useEditorStore(s => s.recentFiles);

  /* ───── PRUNE INVALID RECENTS ON OPEN ───── */
  useEffect(() => {
    if (!open || !item.submenu) return;

    const store = useEditorStore.getState();

    (async () => {
      for (const path of store.recentFolders) {
        if (!(await exists(path))) {
          store.removeRecentFolder(path);
        }
      }

      for (const path of store.recentFiles) {
        if (!(await exists(path))) {
          store.removeRecentFile(path);
        }
      }
    })();
  }, [open, item.submenu]);

  if (item.type === "separator") {
    return <div className="h-px bg-zinc-700 my-1" />;
  }

  return (
    <div
      className="relative px-3 py-1 flex justify-between hover:bg-neutral-500 cursor-pointer"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={() => {
        if (!item.submenu) {
          runMenuAction(item.action);
          closeMenu();
        }
      }}
    >
      <span>{item.label}</span>
      {item.submenu && <span>▶</span>}

      {item.submenu && open && (
        <div className="absolute left-full top-0 bg-default border-zinc-700 min-w-65 z-50">

          {/* ───── RECENT FOLDERS ───── */}
          {recentFolders.map(path => (
            <div
              key={path}
              className="px-3 py-1 hover:bg-neutral-500 cursor-pointer truncate"
              onClick={async (e) => {
                e.stopPropagation();
                closeMenu();

                const store = useEditorStore.getState();

                await invoke("allow_workspace_dir", { path });
                store.setRepoPath(path);
              }}
            >
              {path}
            </div>
          ))}

          {recentFolders.length > 0 && recentFiles.length > 0 && (
            <div className="h-px bg-zinc-700 my-1" />
          )}

          {/* ───── RECENT FILES ───── */}
          {recentFiles.map(path => (
            <div
              key={path}
              className="px-3 py-1 hover:bg-neutral-500 cursor-pointer truncate"
              onClick={async (e) => {
                e.stopPropagation();
                closeMenu();

                const store = useEditorStore.getState();

                const contents = await invoke<string>("read_file", { path });
                store.addTab(path, contents);
                store.addRecentFile(path);
              }}
            >
              {path}
            </div>
          ))}

        </div>
      )}
    </div>
  );
}
