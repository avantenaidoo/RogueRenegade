import { useEffect, useState } from "react";
import { getCurrentBranch, getUncommittedFiles, initGit } from "../utils/git";
import { useEditorStore } from "../store";

export default function GitStatus() {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [dirtyFiles, setDirtyFiles] = useState<string[]>([]);

  async function updateStatus() {
    if (!activeTab) {
      setBranch(null);
      setDirtyFiles([]);
      return;
    }

    const folder = activeTab.path.split("/").slice(0, -1).join("/");
    initGit(folder);

    const currentBranch = await getCurrentBranch();
    const uncommitted = await getUncommittedFiles();

    setBranch(currentBranch);
    setDirtyFiles(uncommitted);
  }

  useEffect(() => {
    updateStatus();
    const interval = setInterval(updateStatus, 3000); // auto-refresh every 3s
    return () => clearInterval(interval);
  }, [activeTab]);

  return (
    <div className="border-t border-default p-1 text-sm flex justify-between bg-muted text-default">
      <div>Branch: {branch || "N/A"}</div>
      <div>
        {dirtyFiles.length > 0 ? `Uncommitted: ${dirtyFiles.join(", ")}` : "Clean"}
      </div>
    </div>
  );
}