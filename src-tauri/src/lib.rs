use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_fs::FsExt;
use std::fs;
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};

mod menu;

#[derive(Serialize, Deserialize, Debug, Clone)]
struct LastSession {
    last_workspace: Option<String>,
    last_file: Option<String>,
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

    // 🔥🔥🔥 THIS IS THE CRITICAL PART 🔥🔥🔥
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
    let repo = Repository::open(repo_path)
        .map_err(|e| e.to_string())?;

    let mut opts = StatusOptions::new();
    opts.include_untracked(true)
        .recurse_untracked_dirs(true)
        .include_ignored(false);

    let statuses = repo
        .statuses(Some(&mut opts))
        .map_err(|e| e.to_string())?;

    let files: Vec<String> = statuses
        .iter()
        .filter_map(|e| e.path().map(String::from))
        .collect();

    Ok(files)
}

#[tauri::command]
fn get_last_session(app: AppHandle) -> Result<LastSession, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| e.to_string())?;

    let path = dir.join("last_session.json");

    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read last_session.json: {}", e))?;

    let session: LastSession =
        serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse session: {}", e))?;

    println!("📤 get_last_session -> {:?}", session);
    Ok(session)
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

    let parent = repo
        .head()
        .ok()
        .and_then(|h| h.target())
        .and_then(|id| repo.find_commit(id).ok());

    match parent {
        Some(p) => {
            repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[&p])
                .map_err(|e| e.to_string())?;
        }
        None => {
            repo.commit(Some("HEAD"), &sig, &sig, &message, &tree, &[])
                .map_err(|e| e.to_string())?;
        }
    }

    Ok(())
}

/* ─────────────────────────────
   RECENT FOLDERS
   ───────────────────────────── */
#[tauri::command]
fn add_recent_folder(app: AppHandle, path: String) {
    menu::add_recent(path);
    let m = menu::build_menu(&app);
    app.set_menu(m).unwrap();
}

/* ─────────────────────────────
   OPEN RECENT
   ───────────────────────────── */
#[tauri::command]
fn open_recent(path: String) -> Result<(), String> {
    #[cfg(target_os = "windows")]
    {
        std::process::Command::new("explorer")
            .arg(path)
            .spawn()
            .map_err(|e| e.to_string())?;
    }
    Ok(())
}

#[tauri::command]
fn frontend_log(message: String) {
    println!("🌐 FRONTEND -> {}", message);
}


/* ─────────────────────────────
   EXIT + SAVE SESSION
   ───────────────────────────── */
#[tauri::command]
fn log_and_exit(app: AppHandle, last_workspace: Option<String>, last_file: Option<String>) {
    println!("🚪 EXIT REQUEST RECEIVED");

    let session = LastSession {
        last_workspace: last_workspace.clone(),
        last_file: last_file.clone(),
    };

    if let Some(ws) = &session.last_workspace {
        println!("📁 Last workspace before exit: {}", ws);
    } else {
        println!("📁 No workspace open at exit");
    }

    if let Some(file) = &session.last_file {
        println!("📄 Last active file before exit: {}", file);
    } else {
        println!("📄 No active file at exit");
    }

    // 🔥 PERSIST TO DISK (TAURI v2 CORRECT)
    match app.path().app_data_dir() {
        Ok(dir) => {
            let path = dir.join("last_session.json");

            match std::fs::create_dir_all(&dir)
                .and_then(|_| {
                    let json = serde_json::to_string_pretty(&session)?;
                    std::fs::write(&path, json)?;
                    Ok(())
                }) {
                Ok(_) => println!("💾 Last session saved to {:?}", path),
                Err(e) => eprintln!("❌ Failed to save last session: {}", e),
            }
        }
        Err(e) => {
            eprintln!("❌ Could not resolve app data directory: {}", e);
        }
    }

    println!("👋 Shutting down application now...");
    app.exit(0);
}

/* ─────────────────────────────
   STEP 10 — RESTORE LAST SESSION
   ───────────────────────────── */
fn restore_last_session(app: &AppHandle) {
    println!("🔁 Attempting to restore last session...");

    let dir = match app.path().app_data_dir() {
        Ok(d) => d,
        Err(e) => {
            eprintln!("❌ Could not resolve app data directory: {}", e);
            return;
        }
    };

    let path = dir.join("last_session.json");

    if !path.exists() {
        println!("ℹ️ No previous session found");
        return;
    }

    match std::fs::read_to_string(&path)
        .ok()
        .and_then(|contents| serde_json::from_str::<LastSession>(&contents).ok())
    {
        Some(session) => {
            println!("🔁 Restoring last session");

            if let Some(ws) = &session.last_workspace {
                println!("📁 Last workspace: {}", ws);
            }

            if let Some(file) = &session.last_file {
                println!("📄 Last file: {}", file);
            }

            app.emit("restore-last-session", session).unwrap();
        }
        None => {
            eprintln!("❌ Failed to parse last_session.json");
        }
    }
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
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file,
            allow_workspace_dir,
            get_uncommitted_files,
            get_current_branch,
            stage_and_commit,
            add_recent_folder,
            open_recent,
            log_and_exit,
            get_last_session,
            frontend_log 
        ])
        .setup(|app| {
            app.fs_scope()
                .allow_directory("C:\\Users\\avant", true)
                .expect("FS scope allow failed");

            println!("🔥 FS DEBUG: C:\\Users\\avant fully allowed");

            let menu = menu::build_menu(&app.handle());
            app.set_menu(menu).unwrap();

            println!("🟢 Tauri app setup complete!");

            // 🔥 STEP 10 — RESTORE ON STARTUP
            restore_last_session(&app.handle());

            app.handle().emit("app-ready", ()).unwrap();
            Ok(())
        })
        .on_menu_event(|app, event| {
            let id = event.id().as_ref();
            println!("🔥 MENU EVENT FIRED: {}", id);

            match id {
                "save" => {
                    app.emit("menu-save", ()).unwrap();
                }
                "save_as" => {
                    app.emit("menu-save-as", ()).unwrap();
                }
                "exit" => {
                    println!("🚪 EXIT MENU CLICKED");
                    app.emit("menu-exit", ()).unwrap();
                }
                _ => {
                    if let Some(path) = id.strip_prefix("open_recent:") {
                        app.emit("open-recent", path.to_string()).unwrap();
                    }
                }
            }
        })
        .on_window_event(|app, event| {
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                println!("🚪 WINDOW CLOSE REQUESTED (X / Alt+F4)");
                api.prevent_close();
                app.emit("menu-exit", ()).unwrap();
            }
        })
        .run(tauri::generate_context!())
        .expect("❌ Error while running Tauri application");
}
