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
#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct TerminalMeta {
    pub id: String,
    pub shell: String,
    pub cwd: Option<String>,
}




static TERMINALS: once_cell::sync::Lazy<Arc<Mutex<HashMap<String, Terminal>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

static TERMINAL_META: once_cell::sync::Lazy<
    Arc<Mutex<HashMap<String, TerminalMeta>>>
> = once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));


fn system_home_dir() -> Option<String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()
}

/// Spawn the **OS-declared default shell**
/// - Windows: %ComSpec% (usually cmd.exe)
/// - macOS/Linux: $SHELL, fallback to /bin/sh


fn resolve_shell(shell: Option<String>) -> (String, CommandBuilder) {
    if let Some(s) = shell {
        let name = s.clone();
        (name.clone(), CommandBuilder::new(s))
    } else if cfg!(target_os = "windows") {
        let shell = std::env::var("ComSpec").unwrap_or("cmd.exe".into());
        ("cmd".into(), CommandBuilder::new(shell))
    } else {
        let shell = std::env::var("SHELL").unwrap_or("/bin/bash".into());
        ("bash".into(), CommandBuilder::new(shell))
    }
}


#[tauri::command]
pub fn terminal_spawn(
    app: AppHandle,
    shell: Option<String>,
    cwd: Option<String>,
) -> Result<(String, String), String> {
    let cwd_dbg = cwd.clone();

    let pty_system = NativePtySystem::default();
    let pair = pty_system
        .openpty(PtySize {
            rows: 24,
            cols: 80,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())?;

        let (shell_name, mut cmd) = resolve_shell(shell);

        if let Some(dir) = cwd.clone().or_else(system_home_dir) {
            cmd.cwd(dir);
        }


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

    TERMINAL_META.lock().unwrap().insert(
        id.clone(),
        TerminalMeta {
            id: id.clone(),
            shell: shell_name.clone(),
            cwd,
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

    println!("[TERMINAL][BE] spawned id={} cwd={:?}", id, cwd_dbg);

    Ok((id, shell_name))
}


#[tauri::command]
#[allow(dead_code)]
pub fn terminal_meta(id: String) -> Result<TerminalMeta, String> {
    TERMINAL_META
        .lock()
        .unwrap()
        .get(&id)
        .cloned()
        .ok_or("Terminal meta not found".to_string())
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
    TERMINAL_META.lock().unwrap().remove(&id);
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
