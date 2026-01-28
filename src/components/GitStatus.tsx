// src/components/GitStatus.tsx
import { useEffect, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { getCurrentBranch, getUncommittedFiles } from "../utils/git";
import { useEditorStore } from "../store";

export default function GitStatus() {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [gitDirtyFiles, setGitDirtyFiles] = useState<string[]>([]);

  function dirname(path: string) {
    return path.split("/").slice(0, -1).join("/");
  }

  function basename(path: string) {
    return path.split("/").pop() ?? path;
  }

  async function isGitRepo(path: string) {
    try {
      return await exists(`${path}/.git`);
    } catch {
      return false;
    }
  }

  async function updateStatus() {
    if (!activeTab) {
      setBranch(null);
      setGitDirtyFiles([]);
      return;
    }

    const repoPath = dirname(activeTab.path);

    if (!(await isGitRepo(repoPath))) {
      setBranch(null);
      setGitDirtyFiles([]);
      return;
    }

    try {
      setBranch(await getCurrentBranch(repoPath));
      setGitDirtyFiles(await getUncommittedFiles(repoPath));
    } catch {
      setBranch(null);
      setGitDirtyFiles([]);
    }
  }

  useEffect(() => {
    updateStatus();
    const id = setInterval(updateStatus, 3000);
    return () => clearInterval(id);
  }, [activeTab]);

  /* ───────────── DIRTY MERGE (VS CODE STYLE) ───────────── */

  const editorDirty = tabs.filter(t => t.dirty).map(t => t.path);

  const allDirty = Array.from(
    new Set([...editorDirty, ...gitDirtyFiles])
  );

  function label(filePath: string) {
    const name = basename(filePath);

    const editor = editorDirty.some(p => basename(p) === name);
    const git = gitDirtyFiles.some(p => basename(p) === name);

    if (editor && git) return `${name} (unsaved + git)`;
    if (editor) return `${name} (unsaved)`;
    return `${name} (git)`;
  }

  return (
    <div className="h-full px-3 flex items-center gap-3 text-xs bg-muted text-default border-t border-default">
      {/* GLOBAL DIRTY DOT */}
      {allDirty.length > 0 && (
        <span className="w-2 h-2 rounded-full bg-red-500" />
      )}

      <div>
        Branch:{" "}
        <span className="font-semibold">
          {branch ?? "No Git repo"}
        </span>
      </div>

      <div className="truncate max-w-[60%]">
        {allDirty.length > 0 ? (
          <span className="text-red-400">
            {allDirty.map(label).join(", ")}
          </span>
        ) : (
          "Clean"
        )}
      </div>
    </div>
  );
}
