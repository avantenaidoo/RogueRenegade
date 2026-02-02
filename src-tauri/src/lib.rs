use tauri::{AppHandle, Emitter, Manager};
use tauri_plugin_fs::FsExt;
use std::fs;
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};

/* ─────────────────────────────
   AUTH MODELS
   ───────────────────────────── */

#[derive(Serialize, Deserialize, Debug, Clone)]
enum AccountStatus {
    Pending,
    Approved,
    Rejected,
    Suspended,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct StoredAccount {
    account_id: String,
    username: String,
    status: AccountStatus,
    last_used: i64,
}

#[derive(Serialize, Deserialize, Debug, Default)]
struct AuthStateFile {
    active_account_id: Option<String>,
    accounts: Vec<StoredAccount>,
}


mod menu;

/* ─────────────────────────────
   AUTH STATE
   ───────────────────────────── */
#[derive(Serialize, Deserialize, Debug, Clone)]
struct AuthState {
    is_authenticated: bool,
    active_account_id: Option<String>,
    accounts: Vec<UserAccount>,
}

#[derive(Serialize, Deserialize, Debug, Clone)]
struct UserAccount {
    id: String,
    username: String,
    email: String,
    approved: bool,
}


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

/* ─────────────────────────────
   AUTH STATE FILE
   ───────────────────────────── */

fn auth_state_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("auth_state.json"))
}

fn load_auth_state(app: &AppHandle) -> Result<AuthStateFile, String> {
    let path = auth_state_path(app)?;

    if !path.exists() {
        return Ok(AuthStateFile::default());
    }

    let contents = std::fs::read_to_string(&path)
        .map_err(|e| format!("Failed to read auth_state.json: {}", e))?;

    serde_json::from_str(&contents)
        .map_err(|e| format!("Failed to parse auth_state.json: {}", e))
}

fn save_auth_state(app: &AppHandle, state: &AuthStateFile) -> Result<(), String> {
    let path = auth_state_path(app)?;
    std::fs::create_dir_all(path.parent().unwrap())
        .map_err(|e| e.to_string())?;

    std::fs::write(
        &path,
        serde_json::to_string_pretty(state).unwrap(),
    )
    .map_err(|e| e.to_string())
}


#[tauri::command]
fn frontend_log(message: String) {
    println!("🌐 FRONTEND -> {}", message);
}

/* ─────────────────────────────
   AUTH COMMANDS
   ───────────────────────────── */

#[tauri::command]
fn auth_get_state(app: AppHandle) -> Result<AuthStateFile, String> {
    load_auth_state(&app)
}

#[tauri::command]
fn auth_set_active_account(
    app: AppHandle,
    account_id: String,
) -> Result<(), String> {
    let mut state = load_auth_state(&app)?;

    if !state.accounts.iter().any(|a| a.account_id == account_id) {
        return Err("Account not found".into());
    }

    state.active_account_id = Some(account_id);
    save_auth_state(&app, &state)
}

#[tauri::command]
fn auth_clear_account(
    app: AppHandle,
    account_id: String,
) -> Result<(), String> {
    let mut state = load_auth_state(&app)?;
    state.accounts.retain(|a| a.account_id != account_id);

    if state.active_account_id.as_deref() == Some(&account_id) {
        state.active_account_id = None;
    }

    save_auth_state(&app, &state)
}

#[tauri::command]
fn auth_mark_account_status(
    app: AppHandle,
    account_id: String,
    status: AccountStatus,
) -> Result<(), String> {
    let mut state = load_auth_state(&app)?;

    let account = state
        .accounts
        .iter_mut()
        .find(|a| a.account_id == account_id)
        .ok_or("Account not found")?;

    account.status = status;
    save_auth_state(&app, &state)
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
   AUTH COMMANDS
   ───────────────────────────── */

#[tauri::command]
fn get_auth_state(app: AppHandle) -> Result<AuthState, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("auth_state.json");

    let contents =
        std::fs::read_to_string(&path).map_err(|e| format!("Read failed: {}", e))?;

    let state: AuthState =
        serde_json::from_str(&contents).map_err(|e| format!("Parse failed: {}", e))?;

    Ok(state)
}

#[tauri::command]
fn set_authenticated(
    app: AppHandle,
    account_id: String,
) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("auth_state.json");

    let mut state: AuthState = serde_json::from_str(
        &std::fs::read_to_string(&path).map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    state.is_authenticated = true;
    state.active_account_id = Some(account_id);

    std::fs::write(
        &path,
        serde_json::to_string_pretty(&state).unwrap(),
    ).map_err(|e| e.to_string())?;

    Ok(())
}

#[tauri::command]
fn logout(app: AppHandle) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("auth_state.json");

    let mut state: AuthState = serde_json::from_str(
        &std::fs::read_to_string(&path).map_err(|e| e.to_string())?
    ).map_err(|e| e.to_string())?;

    state.is_authenticated = false;
    state.active_account_id = None;

    std::fs::write(
        &path,
        serde_json::to_string_pretty(&state).unwrap(),
    ).map_err(|e| e.to_string())?;

    Ok(())
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
            frontend_log,
            auth_get_state,
            auth_set_active_account,
            auth_clear_account,
            auth_mark_account_status,
            get_auth_state,
            set_authenticated,
            logout
        ])
        .setup(|app| {
            app.fs_scope()
                .allow_directory("C:\\Users\\avant", true)
                .expect("FS scope allow failed");

            app.set_menu(menu::build_menu(&app.handle()))?;


            // ──────────────── AUTH STATE INIT ────────────────
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let auth_path = app_data_dir.join("auth_state.json");

            if !auth_path.exists() {
                let initial_state = AuthState {
                    is_authenticated: false,
                    active_account_id: None,
                    accounts: vec![],
                };

                std::fs::create_dir_all(&app_data_dir).expect("Failed to create app data dir");
                std::fs::write(
                    &auth_path,
                    serde_json::to_string_pretty(&initial_state).unwrap(),
                )
                .expect("Failed to write auth_state.json");

                println!("🔐 auth_state.json created");
            } else {
                println!("🔐 auth_state.json already exists");
            }



            println!("🔥 FS DEBUG: C:\\Users\\avant fully allowed");
            println!("🟢 Tauri app setup complete!");

            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Error while running Tauri application");
}
