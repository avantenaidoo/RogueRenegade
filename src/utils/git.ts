import * as git from "isomorphic-git";
import LightningFS from "@isomorphic-git/lightning-fs";
import http from "isomorphic-git/http/web";
import path from "path";

// Use an in-memory FS for the browser
const fs = new LightningFS("fs"); // keep your FS instance

let dir = "";

// Initialize Git in a folder
export function initGit(rootPath: string) {
  dir = rootPath;
  console.log("Git initialized at", dir);
}

// Commit a file
export async function commit(filePath: string, message: string) {
  if (!dir) throw new Error("Git not initialized");
  try {
    await git.add({ fs, dir, filepath: filePath });
    await git.commit({
      fs,
      dir,
      message,
      author: { name: "User", email: "user@local" },
    });
    console.log("Committed", filePath);
  } catch (err) {
    console.error("Commit failed:", err);
  }
}

// Push changes
export async function push(remote = "origin", branch = "main") {
  if (!dir) throw new Error("Git not initialized");
  try {
    await git.push({ fs, http, dir, remote, ref: branch });
    console.log("Pushed to", remote);
  } catch (err) {
    console.error("Push failed:", err);
  }
}

// Pull changes
export async function pull(remote = "origin", branch = "main") {
  if (!dir) throw new Error("Git not initialized");
  try {
    await git.pull({ fs, http, dir, remote, ref: branch, singleBranch: true });
    console.log("Pulled from", remote);
  } catch (err) {
    console.error("Pull failed:", err);
  }
}

// Clone repository
export async function clone(url: string, localPath: string) {
  try {
    await git.clone({ fs, http, dir: localPath, url, singleBranch: true, depth: 1 });
    console.log("Cloned repo:", url);
  } catch (err) {
    console.error("Clone failed:", err);
  }
}

// --- NEW: Git status utilities ---

// Get current branch
export async function getCurrentBranch(): Promise<string | null> {
  try {
    if (!dir) return null;
    const branch = await git.currentBranch({ fs, dir, fullname: false });
    return branch || "detached";
  } catch (err) {
    console.error("Get branch failed:", err);
    return null;
  }
}

// Get list of files with uncommitted changes
export async function getUncommittedFiles(): Promise<string[]> {
  try {
    if (!dir) return [];
    const statusMatrix = await git.statusMatrix({ fs, dir });
    // statusMatrix = [ [filepath, HEAD, workingDir, stage], ... ]
    return statusMatrix
      .filter(row => row[1] !== row[2] || row[2] !== row[3]) // changed
      .map(row => row[0]);
  } catch (err) {
    console.error("Get uncommitted files failed:", err);
    return [];
  }
}

// Get branch name for the repo containing a file
export async function getBranch(filePath: string): Promise<string | null> {
  try {
    if (!filePath) return null;

    let current = path.dirname(filePath);

    // Walk up directories until we find .git
    while (current !== "/" && !(await fsExists(path.join(current, ".git")))) {
      current = path.dirname(current);
    }

    if (current === "/" || !(await fsExists(path.join(current, ".git")))) {
      return null; // Not a git repo
    }

    const branch = await git.currentBranch({
      fs,
      dir: current,
      fullname: false,
    });

    return branch ?? "detached";
  } catch (err) {
    console.error("Failed to get branch:", err);
    return null;
  }
}

async function fsExists(p: string): Promise<boolean> {
  try {
    await fs.promises.stat(p);
    return true;
  } catch {
    return false;
  }
}
