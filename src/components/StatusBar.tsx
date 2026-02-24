import { useEffect, useState } from "react";
import { getCurrentBranch, isGitRepo } from "../utils/git";
import { useEditorStore } from "../store";

export default function StatusBar() {
  const repoPath = useEditorStore((state) => state.repoPath);

  const [branch, setBranch] = useState<string | null>(null);
  const [isRepo, setIsRepo] = useState(false);

  const updateGitInfo = async () => {
    if (!repoPath) {
      setBranch(null);
      setIsRepo(false);
      return;
    }

    const repo = await isGitRepo(repoPath);
    setIsRepo(repo);

    if (!repo) {
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
  };

  useEffect(() => {
    updateGitInfo();
  }, [repoPath]);

  return (
    <div className="flex-1 px-3 flex items-center justify-end text-xs bg-muted border-t border-default">
      <div>
        {isRepo ? `Branch: ${branch ?? "DETACHED"}` : "No Git repo"}
      </div>
      <div>Rogue Renegade IDE</div>
    </div>
  );
}