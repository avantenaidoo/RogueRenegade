// src/utils/git.ts
import { invoke } from "@tauri-apps/api/core";

/**
 * Check if a folder is a Git repository
 */
export async function isGitRepo(repoPath: string): Promise<boolean> {
  return await invoke("git_is_repo", { repoPath });
}

/**
 * Get current branch name for a repo
 */
export async function getCurrentBranch(repoPath: string): Promise<string> {
  return await invoke("git_get_current_branch", { repoPath });
}

/**
 * Get list of uncommitted / changed files
 */
export async function getUncommittedFiles(repoPath: string): Promise<string[]> {
  return await invoke("git_get_uncommitted_files", { repoPath });
}

/**
 * Stage a file and commit it
 */
export async function stageAndCommit(
  repoPath: string,
  filePath: string,
  message: string
): Promise<void> {
  await invoke("stage_and_commit", {
    repoPath,
    filePath,
    message,
  });
}

/**
 * OPTIONAL – only works if you implemented these Rust commands
 */
export async function gitPush(repoPath: string): Promise<void> {
  await invoke("git_push", { repoPath });
}

export async function gitPull(repoPath: string): Promise<void> {
  await invoke("git_pull", { repoPath });
}

export async function gitClone(url: string, targetPath: string): Promise<void> {
  await invoke("git_clone", { url, targetPath });
}
