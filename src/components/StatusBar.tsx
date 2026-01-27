import { useEffect, useState } from "react";
import { exists } from "@tauri-apps/plugin-fs";
import { getCurrentBranch } from "../utils/git";
import { useEditorStore } from "../store";

export default function StatusBar() {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);

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

  async function updateGitInfo() {
    if (!activeTab) {
      setBranch(null);
      return;
    }

    const repoPath = getRepoPath(activeTab.path);

    // ✅ HARD GUARD — NO GIT, NO CALLS
    const hasGit = await isGitRepo(repoPath);
    if (!hasGit) {
      setBranch(null);
      return;
    }

    try {
      const currentBranch = await getCurrentBranch(repoPath);
      setBranch(currentBranch);
    } catch (err) {
      console.error("StatusBar git update failed:", err);
      setBranch(null);
    }
  }

  useEffect(() => {
    updateGitInfo();
  }, [activeTab]);

  return (
    <div className="h-6 px-2 flex items-center justify-between text-xs bg-muted border-t border-default">
      <div>
        {branch ? `Branch: ${branch}` : "Not a Git repository"}
      </div>
      <div>Rogue Renegade IDE</div>
    </div>
  );
}
