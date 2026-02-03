use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use tauri::{AppHandle, Manager};

#[derive(Debug, Serialize, Deserialize, Default)]
pub struct BlockedState {
    pub blocked_devices: Vec<String>,
    pub blocked_accounts: Vec<String>,
}

fn blocked_file_path(app: &AppHandle) -> PathBuf {
    let dir = app
        .path()
        .app_data_dir()
        .expect("failed to resolve app data dir");

    if !dir.exists() {
        fs::create_dir_all(&dir).expect("failed to create app data dir");
    }

    dir.join("blocked.json")
}

pub fn load_blocked_state(app: &AppHandle) -> BlockedState {
    let path = blocked_file_path(app);

    if !path.exists() {
        let state = BlockedState::default();
        save_blocked_state(app, &state);
        return state;
    }

    let contents =
        fs::read_to_string(&path).expect("failed to read blocked.json");

    serde_json::from_str(&contents)
        .unwrap_or_else(|_| BlockedState::default())
}

pub fn save_blocked_state(app: &AppHandle, state: &BlockedState) {
    let path = blocked_file_path(app);

    let json = serde_json::to_string_pretty(state)
        .expect("failed to serialize blocked state");

    fs::write(path, json).expect("failed to write blocked.json");
}

#[tauri::command]
pub fn blocked_get_state(app: AppHandle) -> BlockedState {
    load_blocked_state(&app)
}

#[tauri::command]
pub fn blocked_add_device(app: AppHandle, device_id: String) -> BlockedState {
    let mut state = load_blocked_state(&app);

    if !state.blocked_devices.contains(&device_id) {
        state.blocked_devices.push(device_id);
        save_blocked_state(&app, &state);
    }

    state
}

#[tauri::command]
pub fn blocked_remove_device(app: AppHandle, device_id: String) -> BlockedState {
    let mut state = load_blocked_state(&app);

    state.blocked_devices.retain(|d| d != &device_id);
    save_blocked_state(&app, &state);

    state
}

#[tauri::command]
pub fn blocked_add_account(app: AppHandle, account_id: String) -> BlockedState {
    let mut state = load_blocked_state(&app);

    if !state.blocked_accounts.contains(&account_id) {
        state.blocked_accounts.push(account_id);
        save_blocked_state(&app, &state);
    }

    state
}

#[tauri::command]
pub fn blocked_remove_account(
    app: AppHandle,
    account_id: String,
) -> BlockedState {
    let mut state = load_blocked_state(&app);

    state
        .blocked_accounts
        .retain(|a| a != &account_id);

    save_blocked_state(&app, &state);
    state
}
