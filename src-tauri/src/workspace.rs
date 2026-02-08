use std::{
    collections::HashMap,
    sync::{Arc, Mutex},
};

use once_cell::sync::Lazy;
use uuid::Uuid;

#[derive(Clone, serde::Serialize)]
pub struct Workspace {
    pub id: String,
    pub root_path: String,
}

pub static WORKSPACES: Lazy<Arc<Mutex<HashMap<String, Workspace>>>> =
    Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

pub fn create_default_workspace() -> Workspace {
    let id = Uuid::new_v4().to_string();

    let root_path = std::env::current_dir()
        .unwrap()
        .to_string_lossy()
        .to_string();

    let ws = Workspace {
        id: id.clone(),
        root_path,
    };

    WORKSPACES
        .lock()
        .unwrap()
        .insert(id.clone(), ws.clone());

    ws
}

#[tauri::command]
pub fn get_workspaces() -> Vec<Workspace> {
    WORKSPACES
        .lock()
        .unwrap()
        .values()
        .cloned()
        .collect()
}
