use tauri::{AppHandle, Manager};
use serde::{Deserialize, Serialize};
use std::fs;
use std::path::PathBuf;
use uuid::Uuid;


#[derive(Debug, Serialize, Deserialize)]
struct DeviceIdFile {
    device_id: String,
}

const DEVICE_ID_FILE_NAME: &str = "device_id.json";

#[tauri::command]
pub fn get_device_id(app: AppHandle) -> Result<String, String> {
    let app_data_dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?;

    let file_path: PathBuf = app_data_dir.join(DEVICE_ID_FILE_NAME);

    if file_path.exists() {
        let contents = fs::read_to_string(&file_path)
            .map_err(|e| format!("Failed to read device_id file: {}", e))?;

        let parsed: DeviceIdFile = serde_json::from_str(&contents)
            .map_err(|e| format!("Failed to parse device_id file: {}", e))?;

        return Ok(parsed.device_id);
    }

    let new_device_id = Uuid::new_v4().to_string();

    let payload = DeviceIdFile {
        device_id: new_device_id.clone(),
    };

    fs::create_dir_all(&app_data_dir)
        .map_err(|e| format!("Failed to create app data dir: {}", e))?;

    fs::write(
        &file_path,
        serde_json::to_string_pretty(&payload).unwrap(),
    )
    .map_err(|e| format!("Failed to write device_id file: {}", e))?;

    Ok(new_device_id)
}
