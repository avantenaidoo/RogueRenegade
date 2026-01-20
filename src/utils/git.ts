import * as git from "isomorphic-git";
import { fs } from "memfs"; // Node FS
import http from "isomorphic-git/http/web"; // Required for remote operations
//import { readFile, saveFile } from "./fs";

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
    await git.push({
      fs,
      http,
      dir,
      remote,
      ref: branch,
    });
    console.log("Pushed to", remote);
  } catch (err) {
    console.error("Push failed:", err);
  }
}

// Pull changes
export async function pull(remote = "origin", branch = "main") {
  if (!dir) throw new Error("Git not initialized");
  try {
    await git.pull({
      fs,
      http,
      dir,
      remote,
      ref: branch,
      singleBranch: true,
    });
    console.log("Pulled from", remote);
  } catch (err) {
    console.error("Pull failed:", err);
  }
}

// Clone repository
export async function clone(url: string, localPath: string) {
  try {
    await git.clone({
      fs,
      http,
      dir: localPath,
      url,
      singleBranch: true,
      depth: 1,
    });
    console.log("Cloned repo:", url);
  } catch (err) {
    console.error("Clone failed:", err);
  }
}
