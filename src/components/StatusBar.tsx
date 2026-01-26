import { useEffect, useState } from "react";
import { useEditorStore } from "../store";
import { getBranch, getRepoStatus } from "../utils/git";
import { readFile } from "../utils/fs";

export default function StatusBar() {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [fileType, setFileType] = useState<string>("");
  const [staged, setStaged] = useState(0);
  const [unstaged, setUnstaged] = useState(0);
  const [repoRoot, setRepoRoot] = useState("");

  const [cursorPos, setCursorPos] = useState({ line: 1, col: 1 });

  // Update branch + repo status
  useEffect(() => {
    async function updateGitInfo() {
      if (!activeTab) return;
      const b = await getBranch(activeTab.path);
      setBranch(b);
      const status = await getRepoStatus(activeTab.path);
      setStaged(status.staged);
      setUnstaged(status.unstaged);
      setRepoRoot(status.repoRoot);
    }
    updateGitInfo();
  }, [activeTab]);

  // Check for unsaved changes
  useEffect(() => {
    if (!activeTab) return;
    async function checkUnsaved() {
      try {
        const savedContent = await readFile(activeTab.path);
        setUnsaved(savedContent !== activeTab.content);
      } catch {
        setUnsaved(true);
      }
    }
    checkUnsaved();
  }, [activeTab?.content]);

  // File type
  useEffect(() => {
    if (!activeTab) return;
    const ext = activeTab.path.split(".").pop();
    setFileType(ext || "");
  }, [activeTab]);

  // Cursor position listener
  useEffect(() => {
    if (!activeTab) return;

    const listener = (e: any) => {
      if (!e?.position) return;
      setCursorPos({ line: e.position.lineNumber, col: e.position.column });
    };

    // Listen for Monaco editor cursor change
    const monacoEditor = document.querySelector(".monaco-editor") as any;
    monacoEditor?.addEventListener("cursorPositionChanged", listener);

    return () => monacoEditor?.removeEventListener("cursorPositionChanged", listener);
  }, [activeTab]);

  if (!activeTab) return null;

  return (
    <div
      style={{
        height: "24px",
        background: "#f3f3f3",
        borderTop: "1px solid #ccc",
        display: "flex",
        justifyContent: "space-between",
        alignItems: "center",
        padding: "0 10px",
        fontSize: 12,
        color: "#555",
      }}
    >
      <div>
        {branch && <span>Branch: {branch}</span>}
        {unsaved && <span style={{ color: "red", marginLeft: 10 }}>● Unsaved</span>}
        <span style={{ marginLeft: 10 }}>
          Staged: {staged} | Unstaged: {unstaged}
        </span>
      </div>
      <div>
        {repoRoot && <span>{repoRoot}</span>} | Type: {fileType} | Ln {cursorPos.line}, Col {cursorPos.col}
      </div>
    </div>
  );
}