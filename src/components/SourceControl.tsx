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
    try {
      const root = await invoke<string>("git_detect_root", { path });
      setRepoPath(root || path);
    } catch {
      setRepoPath(path);
    }
  }, []);

  // ───────────── LOAD GIT STATE ─────────────
  const loadGitState = useCallback(async (path: string) => {
    if (!path) return;
    try {
      const isRepo = await invoke<boolean>("git_is_repo", { repoPath: path });
      if (!isRepo) {
        setBranch("Not a Git repository");
        setFiles([]);
        setCommits([]);
        sessionStorage.removeItem(`sourceControl_${workspace?.id}`);
        debugState("Not a Git repo");
        return;
      }

      const [currentBranch, changedFiles, history] = await Promise.all([
        invoke<string>("git_get_current_branch", { repoPath: path }),
        invoke<string[]>("git_get_uncommitted_files", { repoPath: path }),
        invoke<GitCommitNode[]>("git_get_commit_graph", { repoPath: path }),
      ]);

      setBranch(currentBranch);
      setFiles(changedFiles);
      setCommits(history.slice(0, 50));

      sessionStorage.setItem(
        `sourceControl_${workspace?.id}`,
        JSON.stringify({
          branch: currentBranch,
          files: changedFiles,
          commits: history.slice(0, 50),
        })
      );

      debugState("Git state loaded");
    } catch {
      setBranch("Git error");
      setFiles([]);
      setCommits([]);
      debugState("Git error");
    }
  }, [workspace?.id]);

  // ───────────── RESTORE SESSION ─────────────
  useEffect(() => {
    if (!workspace?.root_path) return;

    const saved = sessionStorage.getItem(`sourceControl_${workspace.id}`);
    if (saved) {
      try {
        const parsed = JSON.parse(saved);
        setBranch(parsed.branch || "Unknown");
        setFiles(parsed.files || []);
        setCommits(parsed.commits || []);
        debugState("Restored from sessionStorage");
      } catch {}
    }

    setRepoPath(workspace.root_path);
  }, [workspace?.root_path]);

  // ───────────── DETECT ROOT ON WORKSPACE CHANGE ─────────────
  useEffect(() => {
    if (workspace?.root_path) detectRepoRoot(workspace.root_path);
  }, [workspace?.root_path, detectRepoRoot]);

  // ───────────── LOAD GIT WHEN REPO PATH READY ─────────────
  useEffect(() => {
    if (repoPath) loadGitState(repoPath);
  }, [repoPath, loadGitState]);

  // ───────────── REFRESH ON FOCUS ─────────────
  useEffect(() => {
    const onFocus = () => {
      if (repoPath) loadGitState(repoPath);
    };
    window.addEventListener("focus", onFocus);
    return () => window.removeEventListener("focus", onFocus);
  }, [repoPath, loadGitState]);

  // ───────────── COMMIT HANDLER ─────────────
  const handleCommit = async () => {
    if (!commitMessage.trim() || !repoPath) return;
    try {
      await invoke("git_commit_all", { repoPath, message: commitMessage });
      setCommitMessage("");
      loadGitState(repoPath);
    } catch {}
  };

  // ───────────── RESIZE ─────────────
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

  if (!workspace) return null;

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
          {files.length ? (
            files.map((file) => (
              <div
                key={file}
                className="px-3 py-1 hover:bg-neutral-500 cursor-pointer"
                // You can later add onClick to open diff in editor here
              >
                {file.split(/[\\/]/).pop()}
              </div>
            ))
          ) : (
            <div className="text-neutral-400 text-sm py-2 px-3">No changes</div>
          )}
        </div>
      </div>

      <div className="border-t border-default">
        <div
          onClick={toggleGraph}
          className="px-3 py-2 text-sm cursor-pointer flex justify-between hover:bg-neutral-500 select-none"
        >
          <span>Graph</span>
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
                {commits.length ? (
                  commits.map((commit, idx) => (
                    <div key={commit.id} className="py-1">
                      <div className="flex items-start gap-3">
                        <div className="flex flex-col items-center">
                          <div className="w-2 h-2 rounded-full bg-default border border-default" />
                          {idx !== commits.length - 1 && (
                            <div className="flex-1 w-px bg-default opacity-50" />
                          )}
                        </div>
                        <div className="flex flex-col">
                          <span className="text-xs font-medium">{commit.message}</span>
                          <span className="text-[10px] opacity-50">{commit.author}</span>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="text-neutral-400 text-sm py-2">No commits yet</div>
                )}
              </div>
            </div>
          </>
        )}
      </div>
    </div>
  );
};

export default SourceControl;