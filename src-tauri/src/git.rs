use git2::{
    Repository,
    StatusOptions,
    Signature,
    IndexAddOption,
    Sort,
    DiffOptions,
    DiffFormat,
    TreeWalkMode,
    TreeWalkResult,
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
        Err(_) => return Ok(Vec::new()),
    };

    let head_oid = match head.target() {
        Some(oid) => oid,
        None => return Ok(Vec::new()),
    };

    let mut revwalk = match repo.revwalk() {
        Ok(r) => r,
        Err(e) => return Err(format!("Revwalk error: {}", e)),
    };

    if let Err(e) = revwalk.push(head_oid) {
        return Err(format!("Failed to push head: {}", e));
    }

    if let Err(e) = revwalk.set_sorting(Sort::TOPOLOGICAL | Sort::TIME) {
        return Err(format!("Sort error: {}", e));
    }

    let mut commits = Vec::new();
    for oid_result in revwalk {
        let oid = match oid_result {
            Ok(o) => o,
            Err(e) => return Err(e.to_string()),
        };

        let commit = match repo.find_commit(oid) {
            Ok(c) => c,
            Err(e) => return Err(e.to_string()),
        };

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

/* ─────────────────────────────
   GET FILES CHANGED IN A COMMIT
   ───────────────────────────── */
#[command]
pub fn git_get_commit_files(repo_path: String, commit_id: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let commit_id_parsed = match commit_id.parse::<git2::Oid>() {
        Ok(id) => id,
        Err(_) => return Err("Invalid commit ID".to_string()),
    };

    let commit = match repo.find_commit(commit_id_parsed) {
        Ok(c) => c,
        Err(e) => return Err(format!("Commit not found: {}", e)),
    };

    let mut files = Vec::new();

    if commit.parent_count() == 0 {
        // Initial commit - all files added
        let tree = match commit.tree() {
            Ok(t) => t,
            Err(e) => return Err(format!("No tree: {}", e)),
        };

        match tree.walk(TreeWalkMode::PreOrder, |_, entry| {
            if let Some(name) = entry.name() {
                files.push(name.to_string());
            }
            TreeWalkResult::Ok
        }) {
            Ok(_) => (),
            Err(e) => return Err(format!("Tree walk failed: {}", e)),
        };
    } else {
        let parent = match commit.parent(0) {
            Ok(p) => p,
            Err(e) => return Err(format!("No parent: {}", e)),
        };

        let parent_tree = match parent.tree() {
            Ok(t) => t,
            Err(e) => return Err(format!("Parent tree failed: {}", e)),
        };

        let commit_tree = match commit.tree() {
            Ok(t) => t,
            Err(e) => return Err(format!("Commit tree failed: {}", e)),
        };

        let diff = match repo.diff_tree_to_tree(Some(&parent_tree), Some(&commit_tree), None) {
            Ok(d) => d,
            Err(e) => return Err(format!("Diff failed: {}", e)),
        };

        match diff.foreach(
            &mut |delta, _| {
                if let Some(old) = delta.old_file().path() {
                    files.push(old.to_string_lossy().to_string());
                }
                if let Some(new) = delta.new_file().path() {
                    if !files.contains(&new.to_string_lossy().to_string()) {
                        files.push(new.to_string_lossy().to_string());
                    }
                }
                true
            },
            None,
            None,
            None,
        ) {
            Ok(_) => (),
            Err(e) => return Err(format!("Diff foreach failed: {}", e)),
        };
    }

    Ok(files)
}

/* ─────────────────────────────
   GET DIFF FOR A FILE IN A COMMIT
   ───────────────────────────── */
#[command]
pub fn git_get_commit_diff_for_file(repo_path: String, commit_id: String, file_path: String) -> Result<String, String> {
    let repo = Repository::open(&repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let commit_id_parsed = match commit_id.parse::<git2::Oid>() {
        Ok(id) => id,
        Err(_) => return Err("Invalid commit ID".to_string()),
    };

    let commit = match repo.find_commit(commit_id_parsed) {
        Ok(c) => c,
        Err(e) => return Err(format!("Commit not found: {}", e)),
    };

    let parent = commit.parent(0).ok();

    let mut diff_opts = DiffOptions::new();
    diff_opts.pathspec(file_path.as_str());

    let diff = match parent {
        Some(p) => {
            let parent_tree = match p.tree() {
                Ok(t) => t,
                Err(e) => return Err(format!("Parent tree failed: {}", e)),
            };
            let commit_tree = match commit.tree() {
                Ok(t) => t,
                Err(e) => return Err(format!("Commit tree failed: {}", e)),
            };
            match repo.diff_tree_to_tree(Some(&parent_tree), Some(&commit_tree), Some(&mut diff_opts)) {
                Ok(d) => d,
                Err(e) => return Err(format!("Diff failed: {}", e)),
            }
        }
        None => {
            let commit_tree = match commit.tree() {
                Ok(t) => t,
                Err(e) => return Err(format!("Commit tree failed: {}", e)),
            };
            match repo.diff_tree_to_tree(None, Some(&commit_tree), Some(&mut diff_opts)) {
                Ok(d) => d,
                Err(e) => return Err(format!("Diff failed: {}", e)),
            }
        }
    };

    let mut diff_content = String::new();
    match diff.print(DiffFormat::Patch, |_, _, line| {
        let content = String::from_utf8_lossy(line.content());
        diff_content.push_str(&content);
        true
    }) {
        Ok(_) => (),
        Err(e) => return Err(format!("Diff print failed: {}", e)),
    };

    Ok(diff_content)
}