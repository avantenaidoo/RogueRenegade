import { useEffect, useState } from "react";
import { getCurrentBranch, getUncommittedFiles, initGit } from "../utils/git";
import { useEditorStore } from "../store";

interface GitStatusProps {
  onDirtyFilesChange?: (files: string[]) => void;
}

export default function GitStatus({ onDirtyFilesChange }: GitStatusProps) {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);

  // NEW: whether branch modal is open
  const [isBranchModalOpen, setIsBranchModalOpen] = useState(false);

  async function updateStatus() {
    if (!activeTab) {
      setBranch(null);
      setDirtyFiles([]);
      onDirtyFilesChange?.([]);
      return;
    }

    const folder = activeTab.path.split("/").slice(0, -1).join("/");
    initGit(folder);

    const currentBranch = await getCurrentBranch();
    const uncommitted = await getUncommittedFiles();

    setBranch(currentBranch);
    setDirtyFiles(uncommitted);
    onDirtyFilesChange?.(uncommitted);
  }

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 3000);
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="border-t border-default p-1 text-sm flex justify-between bg-muted text-default">
      {/* 👈 Clickable branch */}
      <div>
        Branch:{" "}
        <button
          className="underline text-blue-500 hover:text-blue-700"
          onClick={() => setIsBranchModalOpen(true)}
        >
          {branch || "N/A"}
        </button>
      </div>

      <div>
        {dirtyFiles.length > 0 ? `Uncommitted: ${dirtyFiles.join(", ")}` : "Clean"}
      </div>

      {/* 👈 Simple branch switcher modal placeholder */}
      {isBranchModalOpen && (
        <div className="absolute top-10 left-10 p-4 bg-muted text-default border shadow-lg z-50">
          <h4 className="font-bold mb-2">Switch Branch (Placeholder)</h4>
          <p>Here you can later list branches and allow switching.</p>
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
