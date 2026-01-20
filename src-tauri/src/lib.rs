use tauri::Emitter;   // Required for app_handle.emit
use std::fs;          // Standard Rust filesystem

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
    fs::read_to_string(&path).map_err(|e| e.to_string())
}

#[tauri::command]
fn write_file(path: String, contents: String) -> Result<(), String> {
    fs::write(&path, contents).map_err(|e| e.to_string())
}

// ---------------------------
// RUN FUNCTION (MAIN ENTRYPOINT)
// ---------------------------
#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        // Initialize plugins
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_dialog::init()) // <-- ADD THIS LINE
        // Register commands callable from JS/TS
        .invoke_handler(tauri::generate_handler![
            greet,
            read_file,
            write_file
        ])
        .setup(|app| {
            println!("🟢 Tauri app setup complete!");
            let app_handle = app.handle();
            // Emit event to frontend
            app_handle.emit("app-ready", ()).unwrap();
            Ok(())
        })
        .run(tauri::generate_context!())
        .expect("❌ Error while running Tauri application");
}
