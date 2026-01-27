import { useState } from "react";
import { readDir, readTextFile } from "@tauri-apps/plugin-fs";
import { open } from "@tauri-apps/plugin-dialog";
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
  const [rootPath, setRootPath] = useState<string | null>(null);
  const [tree, setTree] = useState<FileNode[]>([]);
  const [expanded, setExpanded] = useState<Set<string>>(new Set());

  const addTab = useEditorStore((s) => s.addTab);
  const setRepoPath = useEditorStore((s) => s.setRepoPath);

  // ---------- LOAD DIRECTORY ----------
  async function loadDir(dirPath: string): Promise<FileNode[]> {
    const entries = await readDir(dirPath);

    const nodes: FileNode[] = [];

    for (const entry of entries) {
      if (!entry.name || IGNORED_DIRS.has(entry.name)) continue;

      const fullPath = `${dirPath}/${entry.name}`;

      nodes.push({
        name: entry.name,
        path: fullPath,
        isDirectory: entry.isDirectory,
      });
    }

    return nodes.sort((a, b) => {
      if (a.isDirectory && !b.isDirectory) return -1;
      if (!a.isDirectory && b.isDirectory) return 1;
      return a.name.localeCompare(b.name);
    });
  }

  // ---------- PICK ROOT ----------
  async function pickRoot() {
    const selected = await open({
      directory: true,
      multiple: false,
    });

    if (!selected) return;

    const root = selected.toString();

    setRepoPath(root);
    setRootPath(root);

    const rootTree = await loadDir(root);
    setTree(rootTree);
    setExpanded(new Set([root]));
  }

  // ---------- TOGGLE FOLDER ----------
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

  // ---------- OPEN FILE ----------
  async function openFile(node: FileNode) {
    if (node.isDirectory) {
      await toggleDir(node);
      return;
    }

    const content = await readTextFile(node.path);
    addTab(node.path, content);
  }

  // ---------- RENDER TREE ----------
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
    <div className="w-60 border-r p-2 overflow-auto">
      {!rootPath && (
        <button
          className="mb-2 underline text-blue-500"
          onClick={pickRoot}
        >
          Open Folder
        </button>
      )}

      {rootPath && (
        <>
          <div className="font-semibold mb-1">📦 {rootPath.split("/").pop()}</div>
          {renderNodes(tree)}
        </>
      )}
    </div>
  );
}
