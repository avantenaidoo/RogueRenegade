import { useState } from "react";
import { openFolder } from "../utils/openFolder";
import { openFile } from "../utils/openFile";
import { useEditorStore } from "../store";
import { invoke } from "@tauri-apps/api/core";

export default function TitleBar() {
  const [openMenu, setOpenMenu] = useState<null | "file">(null);
  const [showRecents, setShowRecents] = useState(false);

  const recentFolders = useEditorStore(s => s.recentFolders);
  const setRepoPath = useEditorStore(s => s.setRepoPath);

  async function openRecent(path: string) {
    setOpenMenu(null);
    setShowRecents(false);

    await invoke("allow_workspace_dir", { path });
    setRepoPath(path);
  }

  return (
    <div
      data-tauri-drag-region
      className="h-9 flex items-center justify-between bg-muted text-default border-b border-default select-none relative"
    >
      {/* LEFT */}
      <div className="flex items-center gap-3 px-3">
        <div data-tauri-drag-region className="w-6 h-6 flex items-center justify-center">
          <img src="/RRLogo.png" className="w-4 h-4" draggable={false} />
        </div>

        {/* MENU BAR */}
        <div className="flex items-center gap-3 text-xs relative">
          {/* FILE */}
          <button
            className="px-1 rounded hover:bg-default/10"
            onClick={() => {
              setOpenMenu(openMenu === "file" ? null : "file");
              setShowRecents(false);
            }}
          >
            File
          </button>

          {openMenu === "file" && (
            <div className="absolute top-6 left-0 z-50 w-48 bg-muted border border-default shadow-lg">
              <button
                className="w-full text-left px-3 py-1 hover:bg-default/10"
                onClick={() => {
                  setOpenMenu(null);
                  openFile();
                }}
              >
                Open File…
              </button>

              <button
                className="w-full text-left px-3 py-1 hover:bg-default/10"
                onClick={() => {
                  setOpenMenu(null);
                  openFolder();
                }}
              >
                Open Folder…
              </button>

              {recentFolders.length > 0 && (
                <>
                  <div className="my-1 border-t border-default" />

                  {/* OPEN RECENT (CLICK-BASED) */}
                  <button
                    className="w-full text-left px-3 py-1 hover:bg-default/10 flex justify-between items-center"
                    onClick={() => setShowRecents(v => !v)}
                  >
                    <span>Open Recent</span>
                    <span>▶</span>
                  </button>

                  {showRecents && (
                    <div className="absolute top-[72px] left-full ml-1 w-56 bg-muted border border-default shadow-lg z-50">
                      {recentFolders.map(path => (
                        <button
                          key={path}
                          className="w-full text-left px-3 py-1 hover:bg-default/10 truncate"
                          onClick={() => openRecent(path)}
                        >
                          {path.split("/").pop()}
                        </button>
                      ))}
                    </div>
                  )}
                </>
              )}
            </div>
          )}

          {/* OTHER MENUS — UNTOUCHED */}
          {[
            "Edit",
            "Selection",
            "View",
            "Go",
            "Run",
            "Terminal",
            "Help",
          ].map(item => (
            <button
              key={item}
              className="px-1 rounded hover:bg-default/10"
            >
              {item}
            </button>
          ))}
        </div>
      </div>

      {/* CENTER */}
      <div data-tauri-drag-region className="text-xs text-muted">
        rogue-renegade-ide
      </div>

      {/* RIGHT */}
      <div data-tauri-drag-region className="flex">
        {["—", "▢", "✕"].map((icon, i) => (
          <button
            key={i}
            className="w-10 h-9 flex items-center justify-center hover:bg-default/10"
          >
            {icon}
          </button>
        ))}
      </div>
    </div>
  );
}
