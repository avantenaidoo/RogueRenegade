import { useState } from "react";
import { useEditorStore } from "../store";
import { commit, push, pull, clone, initGit } from "../utils/git";

export default function GitPanel() {
  const [message, setMessage] = useState("");
  const [repoUrl, setRepoUrl] = useState("");
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  async function handleCommit() {
    if (!activeTab) return;
    const folder = activeTab.path.split("/").slice(0, -1).join("/");
    initGit(folder);
    await commit(activeTab.path, message);
  }

  return (
    <div style={{ borderTop: "1px solid gray", padding: "5px" }}>
      <input
        placeholder="Commit message"
        value={message}
        onChange={e => setMessage(e.target.value)}
      />
      <button onClick={handleCommit}>Commit</button>
      <button onClick={() => push()}>Push</button>
      <button onClick={() => pull()}>Pull</button>
      <input
        placeholder="Repo URL"
        value={repoUrl}
        onChange={e => setRepoUrl(e.target.value)}
      />
      <button onClick={() => clone(repoUrl, "/cloned-repo")}>Clone</button>
    </div>
  );
}