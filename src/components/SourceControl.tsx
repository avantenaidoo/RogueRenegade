import React, { useEffect, useState, useRef, useCallback } from "react";
import { invoke } from "@tauri-apps/api/core";
import { useEditorStore } from "../store";

interface GitCommitNode {
  id: string;
  message: string;
  author: string;
  timestamp: number;
  parents: string[];
}

const MIN_HEIGHT = 120;
const MAX_HEIGHT = 500;
const DEFAULT_HEIGHT = 250;

const SourceControl: React.FC = () => {
  const focusedWorkspaceId = useEditorStore((s) => s.focusedWorkspaceId);
  const workspaces = useEditorStore((s) => s.workspaces);

  const [repoPath, setRepoPath] = useState<string>("");
  const [files, setFiles] = useState<string[]>([]);
  const [branch, setBranch] = useState<string>("Loading...");
  const [commitMessage, setCommitMessage] = useState("");
  const [commits, setCommits] = useState<GitCommitNode[]>([]);
  const [graphOpen, setGraphOpen] = useState(true);
  const [graphHeight, setGraphHeight] = useState(DEFAULT_HEIGHT);

  const resizing = useRef(false);
  const workspace = workspaces.find((w) => w.id === focusedWorkspaceId);

  // ───────────── DEBUG LOG ─────────────
  const lastDebugState = useRef({ repoPath: "", branch: "", filesLength: 0, commitsLength: 0 });
  const debugState = (context: string) => {
    if (
      repoPath !== lastDebugState.current.repoPath ||
      branch !== lastDebugState.current.branch ||
      files.length !== lastDebugState.current.filesLength ||
      commits.length !== lastDebugState.current.commitsLength
    ) {
      console.group(`[SOURCECONTROL DEBUG] ${context} — workspace: ${workspace?.id || "none"}`);
      console.log("workspace root_path:", workspace?.root_path || "MISSING / UNDEFINED");
      console.log("repoPath:", repoPath);
      console.log("branch:", branch);
      console.log("changed files count:", files.length);
      console.log("commits count:", commits.length);
      console.log("commits sample:", commits.slice(0, 2).map(c => c.message));
      console.groupEnd();

      lastDebugState.current = {
        repoPath,
        branch,
        filesLength: files.length,
        commitsLength: commits.length,
      };
    }
  };

  // ───────────── DETECT REPO ROOT ─────────────
  const detectRepoRoot = useCallback(async (path: string) => {
    if (!path) return;
    console.log("[SOURCECONTROL DETECT] Starting git_detect_root for:", path);
    try {
      const root = await invoke<string>("git_detect_root", { path });
      console.log("[SOURCECONTROL DETECT] Success - detected root:", root);
      setRepoPath(root || path);
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.warn("[SOURCECONTROL DETECT] git_detect_root FAILED:", errorMsg);
      setRepoPath(path);
    }
  }, []);

  // ───────────── LOAD FRESH GIT STATE ─────────────
  const loadGitState = useCallback(async (path: string, isRefresh = false) => {
    if (!path || !workspace?.id) {
      console.warn("[SOURCECONTROL LOAD] Cannot load - missing path or workspace.id");
      return;
    }

    console.log(`[SOURCECONTROL LOAD] ${isRefresh ? "REFRESH" : "NORMAL"} load started for path:`, path);

    try {
      const isRepo = await invoke<boolean>("git_is_repo", { repoPath: path });
      console.log("[SOURCECONTROL LOAD] git_is_repo returned:", isRepo);

      if (!isRepo) {
        console.log("[SOURCECONTROL LOAD] NOT A GIT REPO - clearing state");
        setBranch("Not a Git repository");
        setFiles([]);
        setCommits([]);
        sessionStorage.removeItem(`sourceControl_${workspace.id}`);
        debugState("Not a git repo");
        return;
      }

      console.log("[SOURCECONTROL LOAD] Repo confirmed - fetching branch/files/commits...");
      const [currentBranch, changedFiles, history] = await Promise.all([
        invoke<string>("git_get_current_branch", { repoPath: path }),
        invoke<string[]>("git_get_uncommitted_files", { repoPath: path }),
        invoke<GitCommitNode[]>("git_get_commit_graph", { repoPath: path }),
      ]);

      console.log("[SOURCECONTROL LOAD] Fetched data:", {
        branch: currentBranch,
        filesCount: changedFiles.length,
        commitsCount: history.length,
      });

      const newState = {
        branch: currentBranch,
        files: changedFiles,
        commits: history.slice(0, 50),
      };

      setBranch(prev => prev === newState.branch ? prev : newState.branch);
      setFiles(prev => JSON.stringify(prev) === JSON.stringify(newState.files) ? prev : newState.files);
      setCommits(prev => {
        const prevIds = prev.map(c => c.id).join(",");
        const newIds = newState.commits.map(c => c.id).join(",");
        return prevIds === newIds ? prev : newState.commits;
      });

      sessionStorage.setItem(
        `sourceControl_${workspace.id}`,
        JSON.stringify(newState)
      );

      debugState(isRefresh ? "Fresh git state after refresh" : "Git state loaded");
    } catch (err: unknown) {
      const errorMsg = err instanceof Error ? err.message : String(err);
      console.error("[SOURCECONTROL LOAD] Full load error:", errorMsg);
      setBranch("Git error");
      setFiles([]);
      setCommits([]);
      debugState("Git error");
    }
  }, [workspace?.id]);

  // ───────────── RESTORE FROM SESSIONSTORAGE ─────────────
  useEffect(() => {
    if (!workspace?.id || !workspace.root_path) {
      console.log("[SOURCECONTROL] Waiting for workspace (id/root_path missing)");
      return;
    }

    console.log("[SOURCECONTROL MOUNT/UPDATE] Workspace ready - root_path:", workspace.root_path);

    const key = `sourceControl_${workspace.id}`;
    const saved = sessionStorage.getItem(key);

    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        console.log("[SOURCECONTROL RESTORE] SessionStorage hit for key:", key, "data:", {
          branch: parsed.branch,
          filesCount: parsed.files?.length || 0,
          commitsCount: parsed.commits?.length || 0,
        });

        setBranch(parsed.branch || "Unknown");
        setFiles(parsed.files || []);
        setCommits(parsed.commits || []);
        debugState("Restored from sessionStorage");
      } catch (err: unknown) {
        const errorMsg = err instanceof Error ? err.message : String(err);
        console.warn("[SOURCECONTROL RESTORE] Invalid sessionStorage data - clearing key:", key, "error:", errorMsg);
        sessionStorage.removeItem(key);
      }
    } else {
      console.log("[SOURCECONTROL RESTORE] No saved git state in sessionStorage for key:", key);
    }

    setRepoPath(workspace.root_path);
  }, [workspace?.id, workspace?.root_path]);

  // ───────────── WORKSPACE ROOT CHANGE ─────────────
  useEffect(() => {
    if (workspace?.root_path) {
      console.log("[SOURCECONTROL ROOT CHANGE] root_path updated to:", workspace.root_path);
      detectRepoRoot(workspace.root_path);
    }
  }, [workspace?.root_path, detectRepoRoot]);

  // ───────────── REPO PATH READY → LOAD GIT ─────────────
  useEffect(() => {
    if (repoPath) {
      console.log("[SOURCECONTROL REPO PATH] repoPath set → triggering loadGitState:", repoPath);
      loadGitState(repoPath);
    }
  }, [repoPath, loadGitState]);

  // ───────────── WINDOW FOCUS / REFRESH ─────────────
  useEffect(() => {
    const onFocus = () => {
      if (repoPath && workspace?.id) {
        console.log("[SOURCECONTROL FOCUS] Window focus/refresh - reloading git for:", repoPath);
        loadGitState(repoPath, true);
      }
    };

    window.addEventListener("focus", onFocus);
    onFocus(); // Run once on mount

    return () => window.removeEventListener("focus", onFocus);
  }, [repoPath, workspace?.id, loadGitState]);

  // ───────────── COMMIT HANDLER ─────────────
  const handleCommit = async () => {
    if (!commitMessage.trim() || !repoPath) return;
    try {
      await invoke("git_commit_all", { repoPath, message: commitMessage });
      setCommitMessage("");
      loadGitState(repoPath);
    } catch (err: unknown) {
      console.error("[SOURCECONTROL COMMIT] Commit failed:", err instanceof Error ? err.message : String(err));
    }
  };

  // ───────────── GRAPH RESIZE ─────────────
  const startResize = () => (resizing.current = true);
  const stopResize = () => (resizing.current = false);
  const onMouseMove = (e: MouseEvent) => {
    if (!resizing.current) return;
    setGraphHeight((prev) => Math.min(MAX_HEIGHT, Math.max(MIN_HEIGHT, prev - e.movementY)));
  };
  useEffect(() => {
    window.addEventListener("mousemove", onMouseMove);
    window.addEventListener("mouseup", stopResize);
    return () => {
      window.removeEventListener("mousemove", onMouseMove);
      window.removeEventListener("mouseup", stopResize);
    };
  }, []);

  const toggleGraph = () => setGraphOpen((v) => !v);

  if (!workspace) {
    console.log("[SOURCECONTROL] No workspace found - returning null");
    return null;
  }

  console.log("[SOURCECONTROL RENDER] Rendering with:", {
    workspaceId: workspace.id,
    rootPath: workspace.root_path,
    focusedId: focusedWorkspaceId,
  });

  return (
    <div className="h-full flex flex-col bg-muted text-default border-default">
      <div className="px-3 py-2 border-b border-default text-sm font-semibold flex justify-between">
        <span>SOURCE CONTROL</span>
        <span className="text-xs opacity-60">{branch}</span>
      </div>

      <div className="border-b border-default p-2 flex flex-col gap-2">
        <textarea
          value={commitMessage}
          onChange={(e) => setCommitMessage(e.target.value)}
          placeholder="Commit message"
          className="bg-default border border-default text-default px-2 py-1 text-sm resize-none outline-none"
          rows={3}
        />
        <button
          onClick={handleCommit}
          className="bg-default border border-default px-2 py-1 text-sm hover:bg-neutral-500"
        >
          Commit
        </button>
      </div>

      <div className="flex-1 overflow-auto">
        <div className="px-3 py-2 text-sm border-b border-default">Changes</div>
        <div className="flex flex-col text-sm">
          {files.length
            ? files.map((file) => (
                <div key={file} className="px-3 py-1 hover:bg-neutral-500 cursor-pointer">
                  {file.split(/[\\/]/).pop()}
                </div>
              ))
            : <div className="text-neutral-400 text-sm py-2">No changes</div>}
        </div>
      </div>

      <div className="border-t border-default">
        <div
          onClick={toggleGraph}
          className="px-3 py-2 text-sm cursor-pointer flex justify-between hover:bg-neutral-500 select-none"
        >
          <span>History</span>
          <span className="text-xs opacity-60">{graphOpen ? "▾" : "▸"}</span>
        </div>

        {graphOpen && (
          <>
            <div
              onMouseDown={startResize}
              className="h-2 cursor-row-resize bg-default border-t border-b border-default"
            />
            <div style={{ height: graphHeight }} className="overflow-auto transition-all duration-150">
              <div className="flex flex-col text-sm px-3 pb-3">
                {commits.length
                  ? commits.map((commit, idx) => (
                      <div key={commit.id} className="flex items-start gap-3 py-1">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-default border border-default" />
                          {idx !== commits.length - 1 && <div className="flex-1 w-px bg-default opacity-50" />}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{commit.message}</span>
                          <span className="text-[10px] opacity-50">{commit.author}</span>
                        </div>
                      </div>
                    ))
                  : <div className="text-neutral-400 text-sm py-2">No commits yet</div>}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SourceControl;