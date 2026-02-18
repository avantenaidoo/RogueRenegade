use tauri::{AppHandle, Emitter, Manager, RunEvent};
use tauri_plugin_fs::FsExt;
use std::fs;
use git2::{Repository, StatusOptions};
use serde::{Deserialize, Serialize};
use device_id::get_device_id;
use device_keys::{get_or_create_device_key, public_key_base64};
use crate::request_signing::sign_request;
use workspace::create_default_workspace;





/* ─────────────────────────────
   AUTH MODELS
   ───────────────────────────── */

#[derive(Serialize, Deserialize, Debug, Clone, PartialEq)]
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
mod device_id;
mod blocked;
mod device_keys;
mod request_signing;
mod terminal;
mod workspace;




/* ─────────────────────────────
   AUTH STATE
   ───────────────────────────── */



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
   USER / ACCOUNT MODELS
   ───────────────────────────── */

    #[derive(Serialize)]
    struct SignupResponse {
        success: bool,
        message: String,
    }


    #[derive(Serialize, Deserialize, Debug, Clone, Copy, PartialEq, Eq)]
    pub enum ApprovalStatus {
        Pending,
        Approved,
        Rejected,
    }


#[derive(Serialize, Deserialize, Clone)]
pub struct Account {
    pub account_id: String,
    pub username: String,
    pub created_at: String,
}

#[derive(Serialize, Deserialize, Clone)]
pub struct User {
    pub user_id: String,
    pub email: String,
    pub password_hash: String,
    pub approval_status: ApprovalStatus,
    pub accounts: Vec<Account>,
    pub created_at: String,
}


/* ─────────────────────────────
   USER STORAGE HELPERS
   ───────────────────────────── */

fn users_path(app: &AppHandle) -> Result<std::path::PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    Ok(dir.join("users.json"))
}

fn load_users(app: &AppHandle) -> Result<Vec<User>, String> {
    let path = users_path(app)?;

    if !path.exists() {
        return Ok(vec![]);
    }

    let contents = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let users: Vec<User> = serde_json::from_str(&contents).map_err(|e| e.to_string())?;
    Ok(users)
}

fn save_users(app: &AppHandle, users: &Vec<User>) -> Result<(), String> {
    let path = users_path(app)?;

    std::fs::write(
        &path,
        serde_json::to_string_pretty(users).unwrap(),
    ).map_err(|e| e.to_string())?;

    Ok(())
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

    if !path.exists() {
        println!("📭 No last_session.json — returning empty session");
        return Ok(LastSession {
            last_workspace: None,
            open_files: vec![],
            active_file: None,
            cursors: vec![],
        });
    }

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
fn signup_user(
    app: AppHandle,
    email: String,
    username: String,
    password_hash: String,
) -> Result<SignupResponse, String> {
    let mut users = load_users(&app)?;

    if users.iter().any(|u| u.email == email) {
        return Ok(SignupResponse {
            success: false,
            message: "Email already registered".into(),
        });
    }

    if users.iter().any(|u| {
        u.accounts.iter().any(|a| a.username == username)
    }) {
        return Ok(SignupResponse {
            success: false,
            message: "Username already taken".into(),
        });
    }

    let account = Account {
        account_id: uuid::Uuid::new_v4().to_string(),
        username,
        created_at: chrono::Utc::now().to_rfc3339(),
    };

    let is_first_user = users.is_empty();

    let user = User {
        user_id: uuid::Uuid::new_v4().to_string(),
        email,
        password_hash,
        approval_status: if is_first_user {
            ApprovalStatus::Approved
        } else {
            ApprovalStatus::Pending
        },
        accounts: vec![account],
        created_at: chrono::Utc::now().to_rfc3339(),
    };


    users.push(user);
    save_users(&app, &users)?;

    Ok(SignupResponse {
        success: true,
        message: "Signup successful. Awaiting approval.".into(),
    })
}

#[derive(Serialize)]
struct LoginResponse {
    success: bool,
    message: String,
    accounts: Vec<StoredAccount>,
}

#[derive(Serialize)]
struct PendingAccount {
    account_id: String,
    username: String,
    email: String,
}


#[tauri::command]
fn login_user(
    app: AppHandle,
    identifier: String, // email OR username
    password_hash: String,
) -> Result<LoginResponse, String> {

    let users = load_users(&app)?;

    let user = users
    .iter()
    .find(|u| {
        u.email == identifier
            || u.accounts.iter().any(|a| a.username == identifier)
    })
    .ok_or("User not found")?;

    if user.password_hash != password_hash {
        return Ok(LoginResponse {
            success: false,
            message: "Invalid password".into(),
            accounts: vec![],
        });
    }

    match user.approval_status {
        ApprovalStatus::Rejected => {
            return Ok(LoginResponse {
                success: false,
                message: "Access denied by administrator".into(),
                accounts: vec![],
            });
        }
        ApprovalStatus::Pending => {
            return Ok(LoginResponse {
                success: false,
                message: "Account pending approval".into(),
                accounts: vec![],
            });
        }
        _ => {}
    }

    let accounts: Vec<StoredAccount> = user
        .accounts
        .iter()
        .map(|a| StoredAccount {
            account_id: a.account_id.clone(),
            username: a.username.clone(),
            status: match user.approval_status {
                ApprovalStatus::Approved => AccountStatus::Approved,
                ApprovalStatus::Pending => AccountStatus::Pending,
                ApprovalStatus::Rejected => AccountStatus::Rejected,
            },
            last_used: chrono::Utc::now().timestamp(),
        })
        .collect();

    let mut auth_state = load_auth_state(&app)?;
    auth_state.accounts = accounts.clone();

    // ✅ AUTO-SELECT if only ONE approved account
    let approved_accounts: Vec<_> = auth_state
        .accounts
        .iter()
        .filter(|a| a.status == AccountStatus::Approved)
        .collect();

    if approved_accounts.len() == 1 {
        auth_state.active_account_id =
            Some(approved_accounts[0].account_id.clone());
    } else {
        auth_state.active_account_id = None;
    }

    save_auth_state(&app, &auth_state)?;

    Ok(LoginResponse {
        success: true,
        message: "Login successful".into(),
        accounts,
    })
}

#[tauri::command]
fn auth_logout(app: AppHandle) -> Result<(), String> {
    let mut auth = load_auth_state(&app)?;

    // 🔴 ONLY LOGOUT — DO NOT DELETE ACCOUNTS
    auth.active_account_id = None;

    save_auth_state(&app, &auth)?;
    Ok(())
}



#[tauri::command]
fn auth_switch_account(app: AppHandle) -> Result<AuthStateFile, String> {
    let mut state = load_auth_state(&app)?;
    state.active_account_id = None;
    save_auth_state(&app, &state)?;
    Ok(state)
}

#[tauri::command]
fn auth_get_state(app: AppHandle) -> Result<AuthStateFile, String> {
    load_auth_state(&app)
}

#[tauri::command]
fn auth_select_account(
    app: AppHandle,
    account_id: String,
) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("auth_state.json");

    let mut state: AuthStateFile =
        serde_json::from_str(&std::fs::read_to_string(&path).map_err(|e| e.to_string())?)
            .map_err(|e| e.to_string())?;

    // ensure account exists
    let account = state
        .accounts
        .iter_mut()
        .find(|a| a.account_id == account_id)
        .ok_or("Account not found")?;

    if account.status != AccountStatus::Approved {
        return Err("Account is not approved".into());
    }

    account.last_used = chrono::Utc::now().timestamp();
    state.active_account_id = Some(account_id);

    std::fs::write(
        &path,
        serde_json::to_string_pretty(&state).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    Ok(())
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

#[tauri::command]
fn auth_approve_account(app: AppHandle, email: String) -> Result<(), String> {
    let mut users = load_users(&app)?;

    let user = users
        .iter_mut()
        .find(|u| u.email == email)
        .ok_or("User not found")?;

    user.approval_status = ApprovalStatus::Approved;

    save_users(&app, &users)?;
    Ok(())
}


#[tauri::command]
fn auth_reject_account(app: AppHandle, email: String) -> Result<(), String> {
    let mut users = load_users(&app)?;

    let mut found = false;

    for user in users.iter_mut() {
        if user.email == email {
            user.approval_status = ApprovalStatus::Rejected;
            found = true;
            break;
        }
    }

    if !found {
        return Err("Account not found".into());
    }

    save_users(&app, &users)?;
    Ok(())
}

#[tauri::command]
fn auth_get_pending_accounts(app: AppHandle) -> Result<Vec<PendingAccount>, String> {
    let users = load_users(&app)?;

    let mut pending = Vec::new();

    for user in users {
        if user.approval_status == ApprovalStatus::Pending {
            for acc in user.accounts {
                pending.push(PendingAccount {
                    account_id: acc.account_id.clone(),
                    username: acc.username.clone(),
                    email: user.email.clone(),
                });
            }
        }
    }

    Ok(pending)
}

/* ─────────────────────────────
   EXIT + SAVE SESSION
   ───────────────────────────── */
fn save_session_internal(
    app: &AppHandle,
    last_workspace: Option<String>,
    open_files: Vec<String>,
    active_file: Option<String>,
    cursors: Vec<CursorEntry>,
) -> Result<(), String> {
    let session = LastSession {
        last_workspace: last_workspace.clone(),
        open_files: open_files.clone(),
        active_file: active_file.clone(),
        cursors,
    };

    if let Some(ws) = &session.last_workspace {
        menu::add_recent(ws.clone());
    }

    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let path = dir.join("last_session.json");

    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    std::fs::write(
        &path,
        serde_json::to_string_pretty(&session).unwrap(),
    )
    .map_err(|e| e.to_string())?;

    println!("💾 Session saved to {:?}", path);
    Ok(())
}

#[tauri::command]
fn save_session(
    app: AppHandle,
    last_workspace: Option<String>,
    open_files: Vec<String>,
    active_file: Option<String>,
    cursors: Vec<CursorEntry>,
) -> Result<(), String> {
    println!("💾 save_session (window close)");
    save_session_internal(
        &app,
        last_workspace,
        open_files,
        active_file,
        cursors,
    )
}



#[tauri::command]
fn log_and_exit(
    app: AppHandle,
    last_workspace: Option<String>,
    open_files: Vec<String>,
    active_file: Option<String>,
    cursors: Vec<CursorEntry>,
) {
    println!("🚪 EXIT REQUEST RECEIVED");

    if let Err(e) = save_session_internal(
        &app,
        last_workspace,
        open_files,
        active_file,
        cursors,
    ) {
        eprintln!("❌ Failed to save session: {}", e);
    }

    println!("👋 Shutting down application now...");
    app.exit(0);
}


#[tauri::command]
async fn ping_server() -> Result<String, String> {
    // ── payload ─────────────────────────────
    let payload = serde_json::json!({
        "ping": "hello"
    });

    let body = serde_json::to_vec(&payload)
        .map_err(|e| e.to_string())?;

    // ── device signing key ───────────────────
    let signing_key = get_or_create_device_key()
        .map_err(|e| e.to_string())?;

    // ── STEP 11: SIGN REQUEST ─────────────────
    let signed = sign_request(
        &signing_key,
        "main-2025-01",
        "POST",
        "/ping",
        &body,
    ).map_err(|e| e.to_string())?;

    // ── HTTP SEND ────────────────────────────
    let client = reqwest::Client::new();
    let mut request = client
        .post("https://your-api-domain.com/ping")
        .body(body);

    for (k, v) in signed.headers {
        request = request.header(k, v);
    }

    let res = request
        .send()
        .await
        .map_err(|e| e.to_string())?;

    Ok(res.text().await.map_err(|e| e.to_string())?)
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
            signup_user,
            login_user,
            auth_select_account,
            auth_logout,
            auth_switch_account,
            auth_approve_account,
            auth_get_pending_accounts,
            auth_reject_account,
            get_device_id,
            blocked::blocked_get_state,
            blocked::blocked_add_device,
            blocked::blocked_remove_device,
            blocked::blocked_add_account,
            blocked::blocked_remove_account,
            blocked::is_device_blocked,
            blocked::blocked_ban_account_and_device,
            ping_server,
            terminal::terminal_spawn,
            terminal::terminal_write,
            terminal::terminal_kill,
            terminal::terminal_resize,
            workspace::get_workspaces,
            save_session,
            terminal::terminal_ready,
            terminal::terminal_redraw,
        ])
        .setup(|app| {

            // ──────────────── WORKSPACE INIT ────────────────
            let ws = create_default_workspace();
            println!("📁 Default workspace created: {:?}", ws.root_path);

            // ──────────────── DEVICE CRYPTO ID INIT ────────────────
            let verifying_key = get_or_create_device_key()
                .expect("❌ Failed to initialize device cryptographic identity");

            let device_public_key = public_key_base64(&verifying_key);

            println!("🔑 DEVICE PUBLIC KEY: {}", device_public_key);


            app.fs_scope()
                .allow_directory("C:\\Users\\avant", true)
                .expect("FS scope allow failed");

            app.set_menu(menu::build_menu(&app.handle()))?;


            // ──────────────── AUTH STATE INIT ────────────────
            let app_data_dir = app.path().app_data_dir().expect("Failed to get app data dir");
            let auth_path = app_data_dir.join("auth_state.json");
            let _ = device_id::get_device_id(app.handle().clone());
            let _ = blocked::load_blocked_state(app.handle());


            if !auth_path.exists() {
                let initial_state = AuthStateFile {
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
        .build(tauri::generate_context!())
        .expect("❌ Error while building Tauri application")
        .run(|_app_handle, event| {
            if let RunEvent::ExitRequested { .. } = event {
                println!("🚪 Exit requested — allowing shutdown");
            }
        });
}
