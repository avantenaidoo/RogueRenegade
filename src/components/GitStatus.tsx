import { useEffect, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { getCurrentBranch, getUncommittedFiles } from "../utils/git";
import { useEditorStore } from "../store";

interface GitStatusProps {
  onDirtyFilesChange?: (files: string[]) => void;
}

export default function GitStatus({ onDirtyFilesChange }: GitStatusProps) {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);
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
      setDirtyFiles([]);
      onDirtyFilesChange?.([]);
      return;
    }

    const repoPath = getRepoPath(activeTab.path);

    // ✅ HARD GUARD — NO GIT, NO STATUS
    const hasGit = await isGitRepo(repoPath);
    if (!hasGit) {
      setBranch(null);
      setDirtyFiles([]);
      onDirtyFilesChange?.([]);
      return;
    }

    try {
      const currentBranch = await getCurrentBranch(repoPath);
      const uncommitted = await getUncommittedFiles(repoPath);

      setBranch(currentBranch);
      setDirtyFiles(uncommitted);
      onDirtyFilesChange?.(uncommitted);
    } catch (err) {
      console.error("Git status update failed:", err);
      setBranch(null);
      setDirtyFiles([]);
      onDirtyFilesChange?.([]);
    }
  }

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    // <div className="border-t border-default p-1 text-sm flex justify-between bg-muted text-default">
    <div className="h-full px-3 flex items-center text-xs bg-muted text-default border-t border-default">
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

      <div>
        {dirtyFiles.length > 0
          ? `Uncommitted: ${dirtyFiles.join(", ")}`
          : "Clean"}
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
