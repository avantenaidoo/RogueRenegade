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
      className="relative px-3 py-1 flex justify-between items-center hover:bg-neutral-500 cursor-pointer whitespace-nowrap"
      onMouseEnter={() => setOpen(true)}
      onMouseLeave={() => setOpen(false)}
      onClick={(e) => {
        e.preventDefault();
        e.stopPropagation();

        if (!item.submenu) {
          const editorActions = [
            "undo",
            "redo",
            "cut",
            "copy",
            "paste",
          ];

          if (item.action && editorActions.includes(item.action)) {
            window.dispatchEvent(
              new CustomEvent("editor-command", {
                detail: { action: item.action },
              })
            );
          } else {
            runMenuAction(item.action);
          }

          closeMenu();
        }
      }}
    >
      <span className="truncate">{item.label}</span>
      {item.shortcut && (
        <span className="ml-4 text-muted text-xs">{item.shortcut}</span>
      )}

      {item.submenu && <span>▶</span>}

      {item.submenu && open && (
        <div className="absolute left-full top-0 bg-default border-zinc-700 min-w-65 z-50">
          {/* ───── RECENT FOLDERS ───── */}
          {recentFolders.map(path => (
            <div
              key={path}
              className="px-3 py-1 hover:bg-neutral-500 cursor-pointer truncate"
              onClick={async (e) => {
                e.preventDefault();
                e.stopPropagation();
                closeMenu();

                const store = useEditorStore.getState();

                await store.switchWorkspace(path);
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
                e.preventDefault();
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
