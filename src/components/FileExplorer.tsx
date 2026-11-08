import { useState, useEffect } from "react";
import { readDir } from "@tauri-apps/plugin-fs";
import { listen } from "@tauri-apps/api/event";
import { invoke } from "@tauri-apps/api/core"; // ← ADD THIS IMPORT
import { useEditorStore } from "../store";

type FileNode = {
  name: string;
  path: string;
  isDirectory: boolean;
  children?: FileNode[];
};

const IGNORED_DIRS = new Set([
  ".git",
  "node_modules",
  "target",
  ".tauri",
]);

export default function FileExplorer() {
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const repoPath = useEditorStore((s) => s.repoPath);
  const addTab = useEditorStore((s) => s.addTab);

  const workspaceName = repoPath
    ? repoPath.replace(/\\/g, "/").split("/").pop()
    : null;

  async function loadDir(dirPath: string): Promise<FileNode[]> {
    const entries = await readDir(dirPath);

    return entries
      .filter((e) => e.name && !IGNORED_DIRS.has(e.name))
      .map((e) => ({
        name: e.name!,
        path: `${dirPath}/${e.name}`,
        isDirectory: e.isDirectory,
      }))
      .sort((a, b) => {
        if (a.isDirectory && !b.isDirectory) return -1;
        if (!a.isDirectory && b.isDirectory) return 1;
        return a.name.localeCompare(b.name);
      });
  }

  async function reloadTree() {
    if (!repoPath) return;
    const rootTree = await loadDir(repoPath);
    setTree(rootTree);
    setExpanded(new Set([repoPath]));
  }

  // Initial load
  useEffect(() => {
    reloadTree();
  }, [repoPath]);

  // Listen for save events
  useEffect(() => {
    const unlisten = listen("fs-refresh", () => {
      console.log("🔄 FS refresh received");
      reloadTree();
    });

    return () => {
      unlisten.then((f) => f());
    };
  }, [repoPath]);

  async function toggleDir(node: FileNode) {
    const next = new Set(expanded);

    if (next.has(node.path)) {
      next.delete(node.path);
      setExpanded(next);
      return;
    }

    next.add(node.path);
    setExpanded(next);

    if (!node.children) {
      node.children = await loadDir(node.path);
      setTree([...tree]);
    }
  }

  async function openFile(node: FileNode) {
    if (node.isDirectory) {
      await toggleDir(node);
      return;
    }

    try {
      console.log(`[OPEN] Reading file via Rust: ${node.path}`);
      const content = await invoke<string>("read_file", { path: node.path });

      console.log(`[OPEN] Rust read_file length: ${content.length}`);
      console.log(`[OPEN] Content starts: ${content.substring(0, 150)}...`);
      console.log(`[OPEN] Is data URI? ${content.startsWith("data:image/")}`);

      addTab(node.path, content);
    } catch (err) {
      console.error(`[OPEN ERROR] Failed to open ${node.path}:`, err);
    }
  }

  function renderNodes(nodes: FileNode[], depth = 0) {
    return nodes.map((node) => (
      <div key={node.path}>
        <div
          onClick={() => openFile(node)}
          style={{ paddingLeft: depth * 14 }}
          className="cursor-pointer flex items-center gap-1 hover:bg-muted"
        >
          <span>
            {node.isDirectory
              ? expanded.has(node.path)
                ? "📂"
                : "📁"
              : "📄"}
          </span>
          <span>{node.name}</span>
        </div>

        {node.isDirectory &&
          expanded.has(node.path) &&
          node.children &&
          renderNodes(node.children, depth + 1)}
      </div>
    ));
  }

  return (
    <div className="h-full w-full overflow-y-auto p-2">
      {!repoPath && (
        <div className="text-xs text-muted italic">
          No folder opened
        </div>
      )}

      {repoPath && (
        <>
          <div className="font-semibold mb-2">
            📦 {workspaceName}
          </div>
          {renderNodes(tree)}
        </>
      )}
    </div>
  );
}