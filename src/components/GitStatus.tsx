import { useEffect, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { getCurrentBranch, getUncommittedFiles } from "../utils/git";
import { useEditorStore } from "../store";

export default function GitStatus() {
  const {
    tabs,
    activeTabIndex,
    dirtyFiles: editorDirtyFiles,
  } = useEditorStore();

  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [gitDirtyFiles, setGitDirtyFiles] = useState<string[]>([]);
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  function getRepoPath(filePath: string) {
    return filePath.split("/").slice(0, -1).join("/");
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

    const repoPath = getRepoPath(activeTab.path);

    const hasGit = await isGitRepo(repoPath);
    if (!hasGit) {
      setBranch(null);
      setGitDirtyFiles([]);
      return;
    }

    try {
      const currentBranch = await getCurrentBranch(repoPath);
      const uncommitted = await getUncommittedFiles(repoPath);

      setBranch(currentBranch);
      setGitDirtyFiles(uncommitted);
    } catch (err) {
      console.error("Git status update failed:", err);
      setBranch(null);
      setGitDirtyFiles([]);
    }
  }

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  // ─────────────────────────────────────────────
  // 🔴 DIRTY STATE MERGE (VS CODE STYLE)
  // ─────────────────────────────────────────────
  const editorSet = new Set(editorDirtyFiles);
  const gitSet = new Set(gitDirtyFiles);

  const allDirtyFiles = Array.from(
    new Set([...editorDirtyFiles, ...gitDirtyFiles])
  );

  const isDirty = allDirtyFiles.length > 0;

  function fileLabel(file: string) {
    const name = file.split("/").pop();
    if (editorSet.has(file) && gitSet.has(file)) return `${name} (unsaved + git)`;
    if (editorSet.has(file)) return `${name} (unsaved)`;
    return `${name} (git)`;
  }

  return (
    <div className="h-full px-3 flex items-center gap-3 text-xs bg-muted text-default border-t border-default">
      {/* 🔴 GLOBAL DIRTY DOT */}
      {isDirty && <span className="w-2 h-2 rounded-full bg-red-500" />}

      <div>
        Branch:{" "}
        <button
          className="underline text-blue-500 hover:text-blue-700"
          onClick={() => setIsBranchModalOpen(true)}
          disabled={!branch}
        >
          {branch ?? "Not a Git repo"}
        </button>
      </div>

      <div className="truncate max-w-[60%]">
        {isDirty ? (
          <span className="text-red-400">
            {allDirtyFiles.map(fileLabel).join(", ")}
          </span>
        ) : (
          "Clean"
        )}
      </div>

      {isBranchModalOpen && (
        <div className="absolute top-10 left-10 p-4 bg-muted text-default border shadow-lg z-50">
          <h4 className="font-bold mb-2">Switch Branch (Placeholder)</h4>
          <p>Branch switching UI goes here.</p>
          <button
            className="mt-2 px-2 py-1 bg-default hover:bg-muted"
            onClick={() => setIsBranchModalOpen(false)}
          >
            Close
          </button>
        </div>
      )}
    </div>
  );
}
