use portable_pty::{
    CommandBuilder,
    NativePtySystem,
    PtySize,
    PtySystem,
    MasterPty,
};
use std::{
    collections::HashMap,
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

type Writer = Box<dyn Write + Send>;

pub struct Terminal {
    pub writer: Writer,
    pub master: Box<dyn MasterPty + Send>,
}

static TERMINALS: once_cell::sync::Lazy<Arc<Mutex<HashMap<String, Terminal>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

fn default_shell() -> CommandBuilder {
    if cfg!(target_os = "windows") {
        CommandBuilder::new("powershell.exe")
    } else {
        let shell = std::env::var("SHELL").unwrap_or("/bin/bash".into());
        CommandBuilder::new(shell)
    }
}

#[tauri::command]
pub fn terminal_spawn(app: AppHandle, shell: Option<String>) -> Result<String, String> {
    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

    let cmd = match shell {
        Some(s) => CommandBuilder::new(s),
        None => default_shell(),
    };

    let mut child = pair.slave.spawn_command(cmd).map_err(|e| e.to_string())?;
    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    
    let master = pair.master;
    let writer = master.take_writer().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();
    
    TERMINALS.lock().unwrap().insert(
        id.clone(),
        Terminal {
            writer,
            master,
        },
    );

    let app_clone = app.clone();
    let id_clone = id.clone();

    thread::spawn(move || {
        let mut buf = [0u8; 4096];
        while let Ok(n) = reader.read(&mut buf) {
            if n == 0 {
                break;
            }
            let output = String::from_utf8_lossy(&buf[..n]).to_string();
            let _ = app_clone.emit("terminal-output", (id_clone.clone(), output));
        }
        let _ = child.wait();
    });

    Ok(id)
}

#[tauri::command]
pub fn terminal_write(id: String, data: String) -> Result<(), String> {
    let mut terms = TERMINALS.lock().unwrap();
    let term = terms.get_mut(&id).ok_or("Terminal not found")?;
    term.writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())
}

#[tauri::command]
pub fn terminal_kill(id: String) {
    TERMINALS.lock().unwrap().remove(&id);
}

#[tauri::command]
pub fn terminal_resize(id: String, rows: u16, cols: u16) -> Result<(), String> {
    let terms = TERMINALS.lock().unwrap();
    let term = terms.get(&id).ok_or("Terminal not found")?;

    term.master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}
