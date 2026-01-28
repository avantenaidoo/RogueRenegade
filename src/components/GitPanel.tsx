// src/components/GitPanel.tsx
import { useState, useEffect } from "react";
import { useEditorStore } from "../store";
import { invoke } from "@tauri-apps/api/core";
import {
  runTestsLocally,
  runTestsCloud,
} from "../utils/testRunner";

export default function GitPanel() {
  const [message, setMessage] = useState("");
  const [repoUrl, setRepoUrl] = useState("");

  const updateTab = useEditorStore((state) => state.updateTab);
  const { tabs, activeTabIndex, markClean } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  function getRepoPath(filePath: string) {
    return filePath.split("/").slice(0, -1).join("/");
  }

  async function handleCommit() {
    if (!activeTab || !message.trim()) return;

    const repoPath = getRepoPath(activeTab.path);

    await invoke("stage_and_commit", {
      repoPath,
      filePath: activeTab.path,
      message,
    });

    markClean(activeTab.path);

    const branch = await invoke<string>("get_current_branch", {
      repoPath,
    });

    updateTab(activeTabIndex, { branch });
    setMessage("");
  }

  async function handlePush() {
    if (!activeTab) return;

    const repoPath = getRepoPath(activeTab.path);

    await invoke("git_push", { repoPath });
  }

  async function handlePull() {
    if (!activeTab) return;

    const repoPath = getRepoPath(activeTab.path);

    await invoke("git_pull", { repoPath });
  }

  async function handleClone() {
    if (!repoUrl) return;

    await invoke("git_clone", {
      url: repoUrl,
      targetPath: "/cloned-repo",
    });
  }

  async function handleRunTestsLocal() {
    if (!activeTab) return;
    await runTestsLocally(activeTab.content);
  }

  async function handleRunTestsCloud() {
    if (!activeTab) return;
    await runTestsCloud(activeTab.content);
  }

  useEffect(() => {
    const observer = new MutationObserver(() => {});
    const container = document.getElementById("git-panel-container");
    if (container) {
      observer.observe(container, { attributes: true, subtree: true });
    }
    return () => observer.disconnect();
  }, []);

  return (
    // <div
    //   id="git-panel-container"
    //   className="border-t border-(--border) dark:border-(--border-dark)
    //              p-2 max-h-40 overflow-y-auto flex flex-col gap-1"
    // >
    <div className="h-full w-full flex items-center justify-center border-t border-(--border) dark:border-(--border-dark)">
      <input
        className="px-2 py-0.5 text-sm border border-(--border) dark:border-(--border-dark)
                   rounded bg-(--bg-main) dark:bg-(--bg-main-dark)
                   text-(--text-main) dark:text-(--text-main-dark)"
        placeholder="Commit message"
        value={message}
        onChange={(e) => setMessage(e.target.value)}
      />

      <div className="flex gap-1">
        <button
          className="flex-1 px-2 py-0.5 text-sm bg-(--button-bg) dark:bg-(--button-bg-dark)
                     text-(--text-main) dark:text-(--text-main-dark) rounded"
          onClick={handleCommit}
        >
          Commit
        </button>

        <button
          className="flex-1 px-2 py-0.5 text-sm bg-(--button-bg) dark:bg-(--button-bg-dark)
                     text-(--text-main) dark:text-(--text-main-dark) rounded"
          onClick={handlePush}
        >
          Push
        </button>

        <button
          className="flex-1 px-2 py-0.5 text-sm bg-(--button-bg) dark:bg-(--button-bg-dark)
                     text-(--text-main) dark:text-(--text-main-dark) rounded"
          onClick={handlePull}
        >
          Pull
        </button>
      </div>

      <div className="flex gap-1">
        <button
          className="flex-1 px-2 py-0.5 text-sm bg-(--button-bg) dark:bg-(--button-bg-dark)
                     text-(--text-main) dark:text-(--text-main-dark) rounded"
          onClick={handleRunTestsLocal}
        >
          Tests (Local)
        </button>

        <button
          className="flex-1 px-2 py-0.5 text-sm bg-(--button-bg) dark:bg-(--button-bg-dark)
                     text-(--text-main) dark:text-(--text-main-dark) rounded"
          onClick={handleRunTestsCloud}
        >
          Tests (Cloud)
        </button>
      </div>

      <input
        className="px-2 py-0.5 text-sm border border-(--border) dark:border-(--border-dark)
                   rounded bg-(--bg-main) dark:bg-(--bg-main-dark)
                   text-(--text-main) dark:text-(--text-main-dark)"
        placeholder="Repo URL"
        value={repoUrl}
        onChange={(e) => setRepoUrl(e.target.value)}
      />

      <button
        className="px-2 py-0.5 text-sm bg-(--button-bg) dark:bg-(--button-bg-dark)
                   text-(--text-main) dark:text-(--text-main-dark) rounded"
        onClick={handleClone}
      >
        Clone
      </button>
    </div>
  );
}
