use portable_pty::{
    CommandBuilder,
    NativePtySystem,
    PtySize,
    PtySystem,
    MasterPty,
};
use std::{
    collections::{HashMap, VecDeque},
    io::{Read, Write},
    sync::{Arc, Mutex},
    thread,
};
use tauri::{AppHandle, Emitter};
use uuid::Uuid;

type Writer = Box<dyn Write + Send>;

//
// ─────────────────────────────────────────────
// Terminal Structs
// ─────────────────────────────────────────────
//

pub struct Terminal {
    pub writer: Writer,
    pub master: Box<dyn MasterPty + Send>,
    pub buffer: VecDeque<String>,
    pub is_ready: bool,
}

#[derive(Clone, Debug)]
#[allow(dead_code)]
pub struct TerminalMeta {
    pub id: String,
    pub shell: String,
    pub cwd: Option<String>,
}

//
// ─────────────────────────────────────────────
// Global State
// ─────────────────────────────────────────────
//

static TERMINALS: once_cell::sync::Lazy<Arc<Mutex<HashMap<String, Terminal>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

static TERMINAL_META: once_cell::sync::Lazy<Arc<Mutex<HashMap<String, TerminalMeta>>>> =
    once_cell::sync::Lazy::new(|| Arc::new(Mutex::new(HashMap::new())));

//
// ─────────────────────────────────────────────
// Helpers
// ─────────────────────────────────────────────
//

fn system_home_dir() -> Option<String> {
    std::env::var("HOME")
        .or_else(|_| std::env::var("USERPROFILE"))
        .ok()
}

fn resolve_shell(shell: Option<String>) -> (String, CommandBuilder) {
    if let Some(s) = shell {
        let name = s.clone();
        (name.clone(), CommandBuilder::new(s))
    } else if cfg!(target_os = "windows") {
        let powershell_path = std::env::var("WINDIR")
            .map(|w| format!("{}\\System32\\WindowsPowerShell\\v1.0\\powershell.exe", w))
            .unwrap_or_else(|_| "powershell.exe".into());

        let shell = if std::path::Path::new(&powershell_path).exists() {
            powershell_path
        } else {
            std::env::var("ComSpec").unwrap_or("cmd.exe".into())
        };

        ("powershell".into(), CommandBuilder::new(shell))
    } else {
        let shell = std::env::var("SHELL").unwrap_or("/bin/bash".into());
        ("bash".into(), CommandBuilder::new(shell))
    }
}

//
// ─────────────────────────────────────────────
// Spawn Terminal
// ─────────────────────────────────────────────
//

#[tauri::command]
pub fn terminal_spawn(
    app: AppHandle,
    shell: Option<String>,
    cwd: Option<String>,
) -> Result<(String, String), String> {
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

    // MUST be mutable — wait() requires &mut self
    let mut child = pair
        .slave
        .spawn_command(cmd)
        .map_err(|e| e.to_string())?;

    let mut reader = pair.master.try_clone_reader().map_err(|e| e.to_string())?;
    let writer = pair.master.take_writer().map_err(|e| e.to_string())?;

    let id = Uuid::new_v4().to_string();

    TERMINALS.lock().unwrap().insert(
        id.clone(),
        Terminal {
            writer,
            master: pair.master,
            buffer: VecDeque::new(),
            is_ready: false,
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

    //
    // Reader thread
    //
    thread::spawn(move || {
        let mut buf = [0u8; 8192];

        loop {
            match reader.read(&mut buf) {
                Ok(0) => break,
                Ok(n) => {
                    let output = String::from_utf8_lossy(&buf[..n]).to_string();

                    let mut terminals = TERMINALS.lock().unwrap();
                    if let Some(term) = terminals.get_mut(&id_clone) {
                        if term.is_ready {
                            let _ = app_clone.emit("terminal-output", (id_clone.clone(), output));
                        } else {
                            term.buffer.push_back(output);
                        }
                    } else {
                        break;
                    }
                }
                Err(_) => break,
            }
        }

        // Wait on child to avoid zombies
        let _ = child.wait();
    });

    Ok((id, shell_name))
}

//
// ─────────────────────────────────────────────
// Write to Terminal
// ─────────────────────────────────────────────
//

#[tauri::command]
pub fn terminal_write(id: String, data: String) -> Result<(), String> {
    let mut terminals = TERMINALS.lock().unwrap();
    let term = terminals.get_mut(&id).ok_or("Terminal not found")?;
    term.writer
        .write_all(data.as_bytes())
        .map_err(|e| e.to_string())?;
    term.writer.flush().ok();
    Ok(())
}

//
// ─────────────────────────────────────────────
// Resize Terminal
// ─────────────────────────────────────────────
//

#[tauri::command]
pub fn terminal_resize(id: String, rows: u16, cols: u16) -> Result<(), String> {
    let terminals = TERMINALS.lock().unwrap();
    let term = terminals.get(&id).ok_or("Terminal not found")?;

    term.master
        .resize(PtySize {
            rows,
            cols,
            pixel_width: 0,
            pixel_height: 0,
        })
        .map_err(|e| e.to_string())
}

//
// ─────────────────────────────────────────────
// Frontend Ready → Flush Buffer
// ─────────────────────────────────────────────
//

#[tauri::command]
pub fn terminal_ready(app: AppHandle, id: String) -> Result<(), String> {
    let mut terminals = TERMINALS.lock().unwrap();
    let term = terminals.get_mut(&id).ok_or("Terminal not found")?;

    term.is_ready = true;

    while let Some(chunk) = term.buffer.pop_front() {
        let _ = app.emit("terminal-output", (id.clone(), chunk));
    }

    Ok(())
}

//
// ─────────────────────────────────────────────
// Kill Terminal
// ─────────────────────────────────────────────
//

#[tauri::command]
pub fn terminal_kill(id: String) -> Result<(), String> {
    let mut terminals = TERMINALS.lock().unwrap();

    if let Some(term) = terminals.remove(&id) {
        drop(term.master); // closing PTY kills process
    }

    TERMINAL_META.lock().unwrap().remove(&id);
    Ok(())
}

#[tauri::command]
pub fn terminal_redraw(_id: String) -> Result<(), String> {
    // Frontend redraw placeholder — nothing actually needed here
    Ok(())
}
