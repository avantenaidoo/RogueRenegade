use tauri::{AppHandle, Emitter};
use tauri_plugin_fs::FsExt; // 🔥 REQUIRED FOR fs_scope()
use std::fs;
use git2::{Repository, StatusOptions};

// ---------------------------
// GREET COMMAND
// ---------------------------
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ---------------------------
// FS COMMANDS
// ---------------------------
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

// 🔥 RUNTIME FS SCOPE EXTENSION (THIS IS THE KEY)
#[tauri::command]
fn allow_workspace_dir(app: AppHandle, path: String) -> Result<(), String> {
    app.fs_scope()
        .allow_directory(&path, true)
        .map_err(|e| e.to_string())?;

    println!("✅ FS access granted for {}", path);
    Ok(())
}

// ---------------------------
// GIT COMMANDS
// ---------------------------
#[tauri::command]
fn get_uncommitted_files(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| format!("Failed to get statuses: {}", e))?;

    Ok(statuses
        .iter()
        .filter_map(|e| e.path().map(|p| p.to_string()))
        .collect())
}

#[tauri::command]
fn get_current_branch(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let branch = match repo.head() {
        Ok(head) => head
            .shorthand()
            .unwrap_or("DETACHED")
            .to_string(),
        Err(_) => "NO_COMMITS".to_string(),
    };

    Ok(branch)
}

#[tauri::command]
fn stage_and_commit(
    repo_path: String,
    file_path: String,
    message: String,
) -> Result<(), String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    let mut index = repo.index().map_err(|e| e.to_string())?;
    index
        .add_path(std::path::Path::new(&file_path))
        .map_err(|e| e.to_string())?;
    index.write().map_err(|e| e.to_string())?;

    let tree_id = index.write_tree().map_err(|e| e.to_string())?;
    let tree = repo.find_tree(tree_id).map_err(|e| e.to_string())?;

    let sig = repo.signature().map_err(|e| e.to_string())?;

    let parent_commit = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .and_then(|id| repo.find_commit(id).ok());

    match parent_commit {
        Some(parent) => {
            repo.commit(
                Some("HEAD"),
                &sig,
                &sig,
                &message,
                &tree,
                &[&parent],
            )
            .map_err(|e| e.to_string())?;
        }
        None => {
            repo.commit(
                Some("HEAD"),
                &sig,
                &sig,
                &message,
                &tree,
                &[],
            )
            .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

// ---------------------------
// RUN FUNCTION
// ---------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            allow_workspace_dir,
            get_uncommitted_files,
            get_current_branch,
            stage_and_commit
        ])
        .setup(|app| {
            println!("🟢 Tauri app setup complete!");
            app.handle().emit("app-ready", ()).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Error while running Tauri application");
}
