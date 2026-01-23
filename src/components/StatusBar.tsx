import { useEffect, useState } from "react";
import { useEditorStore } from "../store";
import { getBranch } from "../utils/git";
import { readFile } from "../utils/fs";

export default function StatusBar() {
  const { tabs, activeTabIndex } = useEditorStore();
  const activeTab = tabs[activeTabIndex];

  const [branch, setBranch] = useState<string | null>(null);
  const [unsaved, setUnsaved] = useState(false);
  const [fileType, setFileType] = useState<string>("");

  // Update branch when active tab changes
  useEffect(() => {
    async function updateBranch() {
      if (!activeTab) return;
      const b = await getBranch(activeTab.path);
      setBranch(b);
    }
    updateBranch();
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

  // Get file type from extension
  useEffect(() => {
    if (!activeTab) return;
    const ext = activeTab.path.split(".").pop();
    setFileType(ext || "");
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
      </div>
      <div>Type: {fileType}</div>
    </div>
  );
}