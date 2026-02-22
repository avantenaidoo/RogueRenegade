use git2::{
    Repository,
    StatusOptions,
    Signature,
    IndexAddOption,
    Sort,
};
use tauri::command;
use serde::Serialize;

#[derive(Serialize)]
pub struct GitCommitNode {
    pub id: String,
    pub message: String,
    pub author: String,
    pub timestamp: i64,
    pub parents: Vec<String>,
}

/* ─────────────────────────────
   CHECK IF DIRECTORY IS A GIT REPO
   ───────────────────────────── */
#[command]
pub fn git_is_repo(repo_path: String) -> Result<bool, String> {
    Ok(Repository::open(&repo_path).is_ok())
}

/* ─────────────────────────────
   DETECT GIT ROOT (SAFE)
   ───────────────────────────── */
#[allow(dead_code)]
#[command]
pub fn git_detect_root(path: String) -> Result<String, String> {
    let p = std::path::Path::new(&path);

    // ONLY check inside the folder, do NOT climb parents
    if p.join(".git").exists() {
        Ok(p.to_string_lossy().to_string())
    } else {
        Err("No Git repository found in this workspace".into())
    }
}




/* ─────────────────────────────
   INIT REPO
   ───────────────────────────── */
#[command]
pub fn git_init_repo(repo_path: String) -> Result<(), String> {
    Repository::init(&repo_path)
        .map_err(|e| format!("Failed to init repo: {}", e))?;
    Ok(())
}

/* ─────────────────────────────
   GET CURRENT BRANCH
   ───────────────────────────── */
#[command]
pub fn git_get_current_branch(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let head_ref = repo.head();
    let branch_name = match head_ref {
        Ok(reference) => reference.shorthand().unwrap_or("DETACHED").to_string(),
        Err(_) => "NO_COMMITS".to_string(),
    };

    Ok(branch_name)
}

/* ─────────────────────────────
   GET UNCOMMITTED FILES
   ───────────────────────────── */
#[command]
pub fn git_get_uncommitted_files(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get statuses: {}", e))?;

    let files = statuses
        .iter()
        .filter_map(|entry| entry.path().map(|p| p.to_string()))
        .collect();

    Ok(files)
}

/* ─────────────────────────────
   COMMIT ALL CHANGES
   ───────────────────────────── */
#[command]
pub fn git_commit_all(repo_path: String, message: String) -> Result<(), String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let mut index = repo
        .index()
        .map_err(|e| format!("Failed to get index: {}", e))?;

    index
        .add_all(["*"].iter(), IndexAddOption::DEFAULT, None)
        .map_err(|e| format!("Failed to add files: {}", e))?;

    index.write().map_err(|e| format!("Failed to write index: {}", e))?;
    let tree_id = index.write_tree().map_err(|e| format!("Failed to write tree: {}", e))?;
    let tree = repo.find_tree(tree_id).map_err(|e| format!("Failed to find tree: {}", e))?;

    let signature = Signature::now("Rogue Renegade IDE", "noreply@rogue.local")
        .map_err(|e| format!("Failed to create signature: {}", e))?;

    // --- SAFELY get parent commit ---
    let parent_commit = {
        if let Ok(head_ref) = repo.head() {
            head_ref.target()
                .and_then(|oid| repo.find_commit(oid).ok())
        } else {
            None
        }
    };

    if let Some(parent) = parent_commit {
        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &[&parent],
        )
        .map_err(|e| format!("Commit failed: {}", e))?;
    } else {
        repo.commit(
            Some("HEAD"),
            &signature,
            &signature,
            &message,
            &tree,
            &[],
        )
        .map_err(|e| format!("Initial commit failed: {}", e))?;
    }

    Ok(())
}

/* ─────────────────────────────
   GET COMMIT GRAPH
   ───────────────────────────── */
#[command]
pub fn git_get_commit_graph(repo_path: String) -> Result<Vec<GitCommitNode>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let head = match repo.head() {
        Ok(h) => h,
        Err(_) => return Ok(Vec::new()), // empty repo
    };

    let head_oid = head.target().ok_or("HEAD has no target")?;
    let mut revwalk = repo.revwalk().map_err(|e| format!("Revwalk error: {}", e))?;
    revwalk.push(head_oid).map_err(|e| format!("Failed to push head: {}", e))?;
    revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME).map_err(|e| format!("Sort error: {}", e))?;

    let mut commits = Vec::new();
    for oid in revwalk {
        let oid = oid.map_err(|e| e.to_string())?;
        let commit = repo.find_commit(oid).map_err(|e| e.to_string())?;
        commits.push(GitCommitNode {
            id: commit.id().to_string(),
            message: commit.summary().unwrap_or("").to_string(),
            author: commit.author().name().unwrap_or("").to_string(),
            timestamp: commit.time().seconds(),
            parents: commit.parents().map(|p| p.id().to_string()).collect(),
        });
    }

    Ok(commits)
}
