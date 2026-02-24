import { useEffect, useState } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../store";

export default function GitStatus() {
  const { tabs, repoPath } = useEditorStore();

  const [branch, setBranch] = useState<string | null>(null);
  const [gitDirtyFiles, setGitDirtyFiles] = useState<string[]>([]);
  const [isGitRepo, setIsGitRepo] = useState(false);

  function basename(path: string) {
    return path.split(/[\\/]/).pop() ?? path;
  }

const updateStatus = async () => {
  if (!repoPath) {
    setBranch(null);
    setGitDirtyFiles([]);
    setIsGitRepo(false);
    return;
  }

  try {
    const repo = await invoke<boolean>("git_is_repo", { repoPath });
    setIsGitRepo(repo);

    if (!repo) {
      setBranch(null);
      setGitDirtyFiles([]);
      return;
    }

    const currentBranch = await invoke<string>("git_get_current_branch", { repoPath });
    const uncommitted = await invoke<string[]>("git_get_uncommitted_files", { repoPath });

    setBranch(currentBranch);
    setGitDirtyFiles(uncommitted);
  } catch (err) {
    console.error("GitStatus error:", err);
    setBranch(null);
    setGitDirtyFiles([]);
    setIsGitRepo(false);
  }
};

useEffect(() => {
  updateStatus();
  const id = setInterval(updateStatus, 3000);
  return () => clearInterval(id);
}, [repoPath]);

  useEffect(() => {
    const handler = () => updateStatus();
    window.addEventListener("workspace-changed", handler);
    return () => window.removeEventListener("workspace-changed", handler);
  }, []);

  // Editor dirty files
  const editorDirty = tabs.filter(t => t.dirty).map(t => t.path);

  // Only show git dirty for files that exist in editor dirty list
  const effectiveGitDirty = gitDirtyFiles.filter(gitPath =>
    editorDirty.some(editorPath => basename(editorPath) === basename(gitPath))
  );

  const allDirty = Array.from(new Set([...editorDirty, ...effectiveGitDirty]));

  const label = (filePath: string) => {
    const name = basename(filePath);
    const editor = editorDirty.some(p => basename(p) === name);
    const git = effectiveGitDirty.some(p => basename(p) === name);

    if (editor && git) return `${name} (unsaved + git)`;
    if (editor) return `${name} (unsaved)`;
    return `${name} (git)`;
  };

  return (
    <div className="h-full px-3 flex items-center gap-3 text-xs bg-muted text-default border-t border-default">
      {allDirty.length > 0 && <span className="w-2 h-2 rounded-full bg-red-500" />}

      <div>
        Branch:{" "}
        <span className="font-semibold">
          {isGitRepo ? branch ?? "DETACHED" : "No Git repo"}
        </span>
      </div>

      <div className="truncate max-w-[60%]">
        {allDirty.length > 0 ? (
          <span className="text-red-400">{allDirty.map(label).join(", ")}</span>
        ) : (
          "Clean"
        )}
      </div>
    </div>
  );
}
