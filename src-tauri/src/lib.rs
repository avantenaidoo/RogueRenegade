use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_fs::FsExt;
use std::fs;
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};

mod menu;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct CursorEntry {
    path: String,
    cursor: CursorPosition,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct CursorPosition {
    #[serde(rename = "lineNumber")]
    line_number: u32,
    column: u32,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct LastSession {
    #[serde(default)]
    last_workspace: Option<String>,

    #[serde(default)]
    open_files: Vec<String>,

    #[serde(default)]
    active_file: Option<String>,

    #[serde(default)]
    cursors: Vec<CursorEntry>,
}

/* ─────────────────────────────
   GREET COMMAND
   ───────────────────────────── */
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

/* ─────────────────────────────
   FS COMMANDS
   ───────────────────────────── */
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    println!("📖 read_file called -> {}", path);
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(app: AppHandle, path: String, contents: String) -> Result<(), String> {
    println!("💾 write_file called -> {}", path);
    fs::write(&path, contents).map_err(|e| e.to_string())?;
    app.emit("fs-refresh", ()).unwrap();
    Ok(())
}

#[tauri::command]
fn allow_workspace_dir(app: AppHandle, path: String) -> Result<(), String> {
    println!("🛂 allow_workspace_dir -> {}", path);

    app.fs_scope()
        .allow_directory(&path, true)
        .map_err(|e| e.to_string())?;

    println!("✅ FS access granted for {}", path);
    Ok(())
}

/* ─────────────────────────────
   GIT COMMANDS
   ───────────────────────────── */
#[tauri::command]
fn get_uncommitted_files(repo_path: String) -> Result<Vec<String>, String> {
    let repo = Repository::open(repo_path).map_err(|e| e.to_string())?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo.statuses(Some(&mut opts)).map_err(|e| e.to_string())?;

    Ok(statuses
        .iter()
        .filter_map(|e| e.path().map(String::from))
        .collect())
}

#[tauri::command]
fn get_current_branch(repo_path: String) -> Result<String, String> {
    let repo = Repository::open(repo_path)
        .map_err(|e| format!("Failed to open repo: {}", e))?;

    let branch = match repo.head() {
        Ok(head) => head.shorthand().unwrap_or("DETACHED").to_string(),
        Err(_) => "NO_COMMITS".to_string(),
    };

    Ok(branch)
}

/* ─────────────────────────────
   SESSION
   ───────────────────────────── */
#[tauri::command]
fn get_last_session(app: AppHandle) -> Result<LastSession, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("last_session.json");

    let contents = fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read last_session.json: {}", e))?;

    let session: LastSession =
        serde_json::from_str(&contents).map_err(|e| format!("Failed to parse session: {}", e))?;

    println!("📤 get_last_session -> {:?}", session);
    Ok(session)
}

#[tauri::command]
fn frontend_log(message: String) {
    println!("🌐 FRONTEND -> {}", message);
}

/* ─────────────────────────────
   EXIT + SAVE SESSION
   ───────────────────────────── */
#[tauri::command]
fn log_and_exit(
    app: AppHandle,
    last_workspace: Option<String>,
    open_files: Vec<String>,
    active_file: Option<String>,
    cursors: Vec<CursorEntry>,
) {
    println!("🚪 EXIT REQUEST RECEIVED");

    let session = LastSession {
        last_workspace: last_workspace.clone(),
        open_files: open_files.clone(),
        active_file: active_file.clone(),
        cursors,
    };

    if let Some(ws) = &session.last_workspace {
        println!("📁 Last workspace before exit: {}", ws);
        menu::add_recent(ws.clone());
    }

    println!("📂 Open files:");
    for f in &session.open_files {
        println!("   • {}", f);
    }

    if let Some(active) = &session.active_file {
        println!("⭐ Active file: {}", active);
    }

    println!("📍 Saved cursors:");
    for c in &session.cursors {
        println!(
            "   • {} @ line {}, col {}",
            c.path, c.cursor.line_number, c.cursor.column
        );
    }

    match app.path().app_data_dir() {
        Ok(dir) => {
            let path = dir.join("last_session.json");
            if let Err(e) = fs::create_dir_all(&dir)
                .and_then(|_| fs::write(&path, serde_json::to_string_pretty(&session)?))
            {
                eprintln!("❌ Failed to save last session: {}", e);
            } else {
                println!("💾 Last session saved to {:?}", path);
            }
        }
        Err(e) => eprintln!("❌ Could not resolve app data directory: {}", e),
    }

    println!("👋 Shutting down application now...");
    app.exit(0);
}

/* ─────────────────────────────
   RUN
   ───────────────────────────── */
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            allow_workspace_dir,
            get_uncommitted_files,
            get_current_branch,
            log_and_exit,
            get_last_session,
            frontend_log
        ])
        .setup(|app| {
            app.fs_scope()
                .allow_directory("C:\\Users\\avant", true)
                .expect("FS scope allow failed");

            app.set_menu(menu::build_menu(&app.handle()))?;

            println!("🔥 FS DEBUG: C:\\Users\\avant fully allowed");
            println!("🟢 Tauri app setup complete!");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Error while running Tauri application");
}
