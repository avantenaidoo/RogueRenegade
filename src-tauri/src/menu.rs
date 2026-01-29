use tauri::AppHandle;
use tauri::menu::{Menu, MenuItem, Submenu, IsMenuItem};
use std::sync::Mutex;

/* ─────────────────────────────
   RECENT FOLDERS STATE
   ───────────────────────────── */
static RECENT_FOLDERS: Mutex<Vec<String>> = Mutex::new(Vec::new());

/* ─────────────────────────────
   PUBLIC API
   ───────────────────────────── */
pub fn add_recent(path: String) {
    let mut recents = RECENT_FOLDERS.lock().unwrap();
    recents.retain(|p| p != &path);
    recents.insert(0, path);
    recents.truncate(10);
}

pub fn build_menu<R: tauri::Runtime>(app: &AppHandle<R>) -> Menu<R> {
    let recents = RECENT_FOLDERS.lock().unwrap();

    /* ───────────── OPEN RECENT ITEMS ───────────── */
    let mut recent_items: Vec<MenuItem<R>> = Vec::new();
    let mut recent_refs: Vec<&dyn IsMenuItem<R>> = Vec::new();

    for path in recents.iter() {
        let item = MenuItem::with_id(
            app,
            format!("open_recent:{}", path),
            path,
            true,
            None::<&str>,
        )
        .unwrap();

        recent_items.push(item);
    }

    for item in &recent_items {
        recent_refs.push(item);
    }

    let open_recent = Submenu::with_items(
        app,
        "Open Recent",
        true,
        &recent_refs,
    )
    .unwrap();

    /* ───────────── FILE MENU ───────────── */
    let open_file = MenuItem::with_id(
        app,
        "open_file",
        "Open File…",
        true,
        None::<&str>,
    )
    .unwrap();

    let open_folder = MenuItem::with_id(
        app,
        "open_folder",
        "Open Folder…",
        true,
        None::<&str>,
    )
    .unwrap();

    let file_menu = Submenu::with_items(
        app,
        "File",
        true,
        &[
            &open_file,
            &open_folder,
            &open_recent,
        ],
    )
    .unwrap();

    Menu::with_items(app, &[&file_menu]).unwrap()
}
