// src/utils/git.ts
import { invoke } from "@tauri-apps/api/core";

const repoRootCache = new Map<string, string | null>();

/**
 * Get the actual git repository root for any file/folder path inside it.
 * Uses the backend git_detect_root command (which now walks up parents).
 * Includes fallback: if direct call fails, tries parent dirs up to 5 levels.
 */
export async function getRepoRoot(fileOrFolderPath: string): Promise<string | null> {
  const cacheKey = fileOrFolderPath;

  // Cache lookup
  if (repoRootCache.has(cacheKey)) {
    const cached = repoRootCache.get(cacheKey);
    // cached is string | null | undefined, but has() already checked existence
    // so it can only be string | null here → safe to return as-is
    if (cached !== undefined) {
      if (cached) console.log("[git] Cache hit for repo root:", cached);
      return cached;
    }
  }

  let testPath = fileOrFolderPath;

  // If it's likely a file path, start from its containing directory
  const lastSlash = Math.max(testPath.lastIndexOf('/'), testPath.lastIndexOf('\\'));
  if (lastSlash > 0) {
    testPath = testPath.substring(0, lastSlash);
  }

  const candidates = [testPath];

  // Build fallback candidates: go up max 5 levels
  let current = testPath;
  for (let i = 0; i < 5; i++) {
    const ls = Math.max(current.lastIndexOf('/'), current.lastIndexOf('\\'));
    if (ls <= 0) break;
    current = current.substring(0, ls);
    if (current && current.length > 3) { // avoid root drive like C:\
      candidates.push(current);
    }
  }

  console.log("[git] Trying repo root detection on candidates:", candidates);

  for (const candidate of candidates) {
    try {
      const root = await invoke<string>("git_detect_root", { path: candidate });
      if (root && root.trim()) {
        console.log("[git] SUCCESS: detected repo root at", root);
        repoRootCache.set(cacheKey, root);
        return root;
      }
    } catch (err) {
      console.warn("[git] git_detect_root failed for", candidate, "→", err);
    }
  }

  console.error("[git] Could NOT detect any git root for path:", fileOrFolderPath);
  repoRootCache.set(cacheKey, null);
  return null;
}

/**
 * Check if a folder is a Git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  try {
    return await invoke<boolean>("git_is_repo", { repoPath });
  } catch (err) {
    console.warn("[git] isGitRepo failed:", err);
    return false;
  }
}

/**
 * Get current branch name for a repo
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  try {
    const branch = await invoke<string>("git_get_current_branch", { repoPath });
    return branch?.trim() || "DETACHED";
  } catch (err) {
    console.warn("[git] getCurrentBranch failed:", repoPath, err);
    return "error";
  }
}

/**
 * Get list of uncommitted / changed files (relative paths)
 */
export async function getUncommittedFiles(repoPath: string): Promise<string[]> {
  try {
    return await invoke<string[]>("git_get_uncommitted_files", { repoPath });
  } catch (err) {
    console.warn("[git] getUncommittedFiles failed:", err);
    return [];
  }
}

/**
 * Stage a file and commit it (placeholder – implement in Rust if needed)
 */
export async function stageAndCommit(
  repoPath: string,
  filePath: string,
  message: string
): Promise<void> {
  try {
    await invoke("stage_and_commit", { repoPath, filePath, message });
  } catch (err) {
    console.error("[git] stageAndCommit failed:", err);
  }
}

// Optional – implement these in Rust when ready
export async function gitPush(repoPath: string): Promise<void> {
  await invoke("git_push", { repoPath }).catch(err => console.error("[git] push failed:", err));
}

export async function gitPull(repoPath: string): Promise<void> {
  await invoke("git_pull", { repoPath }).catch(err => console.error("[git] pull failed:", err));
}

export async function gitClone(url: string, targetPath: string): Promise<void> {
  await invoke("git_clone", { url, targetPath }).catch(err => console.error("[git] clone failed:", err));
}