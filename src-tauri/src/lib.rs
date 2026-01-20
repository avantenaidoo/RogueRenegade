// src-tauri/src/lib.rs

use tauri::Manager; // Needed for emitting events

// ---------------------------
// GREET COMMAND
// ---------------------------
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

// ---------------------------
// FS PLUGIN COMMANDS
// ---------------------------
#[tauri::command]
fn read_file(path: String) -> Result<String, String> {
    tauri_plugin_fs::read_text_file(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    tauri_plugin_fs::write_text_file(&path, &contents).map_err(|e| e.to_string())
}

// ---------------------------
// RUN FUNCTION (MAIN ENTRYPOINT)
// ---------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Existing plugin
        .plugin(tauri_plugin_opener::init())
        // FS plugin added here
        .plugin(tauri_plugin_fs::init())
        // Commands that can be invoked from JS/TS
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file
        ])
        .setup(|app| {
            println!("🟢 Tauri app setup complete!");
            let app_handle = app.handle();
            // You can emit events to frontend here if needed
            app_handle.emit("app-ready", ()).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Error while running Tauri application");
}
