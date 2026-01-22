import { useState, useEffect } from "react";
import { useEditorStore } from "../store";
import { commit, push, pull, clone, initGit } from "../utils/git";

export default function GitPanel() {
  const [message, setMessage] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const { tabs, activeTabIndex, markClean } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  async function handleCommit() {
    if (!activeTab) return;
    const folder = activeTab.path.split("/").slice(0, -1).join("/");
    initGit(folder);
    await commit(activeTab.path, message);
    markClean(activeTab.path); // ✅ clear red dot after commit
  }

  // =========================
  // 🔍 DEBUG MUTATION OBSERVER
  // =========================
  useEffect(() => {
    const observer = new MutationObserver((mutations) => {
      mutations.forEach((m) => {
        if (m.type === "attributes") {
          const el = m.target as HTMLElement;
          const styles = getComputedStyle(el);
          console.log("🟢 MUTATION OBSERVER:", el.tagName, el.className);
          console.log("    bg:", styles.backgroundColor, "color:", styles.color);
        }
      });
    });

    const container = document.getElementById("git-panel-container");
    if (container) {
      observer.observe(container, {
        attributes: true,
        attributeFilter: ["class", "style"],
        subtree: true,
      });
    }

    return () => observer.disconnect();
  }, []);

  return (
    <div
      id="git-panel-container"
      className="border-t border-(--border) dark:border-(--border-dark) p-2 flex flex-col gap-2"
    >
      <input
        className="px-2 py-1 border border-(--border) dark:border-(--border-dark) rounded bg-(--bg-main) dark:bg-(--bg-main-dark) text-(--text-main) dark:text-(--text-main-dark)"
        placeholder="Commit message"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <button
        className="px-2 py-1 bg-(--button-bg) dark:bg-(--button-bg-dark) text-(--text-main) dark:text-(--text-main-dark) rounded hover:bg-(--button-hover-bg) dark:hover:bg-(--button-hover-bg-dark)"
        onClick={handleCommit}
      >
        Commit
      </button>
      <button
        className="px-2 py-1 bg-(--button-bg) dark:bg-(--button-bg-dark) text-(--text-main) dark:text-(--text-main-dark) rounded hover:bg-(--button-hover-bg) dark:hover:bg-(--button-hover-bg-dark)"
        onClick={() => push()}
      >
        Push
      </button>
      <button
        className="px-2 py-1 bg-(--button-bg) dark:bg-(--button-bg-dark) text-(--text-main) dark:text-(--text-main-dark) rounded hover:bg-(--button-hover-bg) dark:hover:bg-(--button-hover-bg-dark)"
        onClick={() => pull()}
      >
        Pull
      </button>
      <input
        className="px-2 py-1 border border-(--border) dark:border-(--border-dark) rounded bg-(--bg-main) dark:bg-(--bg-main-dark) text-(--text-main) dark:text-(--text-main-dark)"
        placeholder="Repo URL"
        value={repoUrl}
        onChange={e => setRepoUrl(e.target.value)}
      />
      <button
        className="px-2 py-1 bg-(--button-bg) dark:bg-(--button-bg-dark) text-(--text-main) dark:text-(--text-main-dark) rounded hover:bg-(--button-hover-bg) dark:hover:bg-(--button-hover-bg-dark)"
        onClick={() => clone(repoUrl, "/cloned-repo")}
      >
        Clone
      </button>
    </div>
  );
}
