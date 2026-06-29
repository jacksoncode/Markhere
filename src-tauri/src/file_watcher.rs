// External file-change watching.
//
// Markhere is a file-backed editor, so a file edited by another program
// (git pull, another editor, a sync client) must not be silently overwritten.
// This module watches the single currently-open file and emits a
// `file-changed` event to the frontend when it changes on disk. The frontend
// decides whether to reload or warn about a conflict.

use notify_debouncer_mini::{new_debouncer, DebounceEventResult, Debouncer};
use notify::{RecommendedWatcher, RecursiveMode};
use std::path::Path;
use std::sync::Mutex;
use std::time::Duration;
use tauri::{AppHandle, Emitter};

/// Holds the active debouncer plus the path it is watching. Replacing the
/// watch (opening a new file) drops the previous debouncer, which stops its
/// background thread.
struct WatchState {
    debouncer: Option<Debouncer<RecommendedWatcher>>,
    path: Option<String>,
}

static WATCH_STATE: Mutex<WatchState> = Mutex::new(WatchState {
    debouncer: None,
    path: None,
});

#[derive(Clone, serde::Serialize)]
struct FileChangedPayload {
    path: String,
}

/// Begin watching `path` for external modifications. Any previously watched
/// file is released first — only one file is watched at a time.
#[tauri::command]
pub async fn watch_file(app: AppHandle, path: String) -> Result<(), String> {
    let watch_path = Path::new(&path).to_path_buf();
    if !watch_path.exists() {
        return Err(format!("Cannot watch non-existent file: {}", path));
    }

    let emit_path = path.clone();
    let app_handle = app.clone();

    let mut debouncer = new_debouncer(
        Duration::from_millis(400),
        move |res: DebounceEventResult| {
            if let Ok(events) = res {
                if !events.is_empty() {
                    let _ = app_handle.emit(
                        "file-changed",
                        FileChangedPayload {
                            path: emit_path.clone(),
                        },
                    );
                }
            }
        },
    )
    .map_err(|e| format!("Failed to create file watcher: {}", e))?;

    debouncer
        .watcher()
        .watch(&watch_path, RecursiveMode::NonRecursive)
        .map_err(|e| format!("Failed to watch file: {}", e))?;

    let mut state = WATCH_STATE
        .lock()
        .map_err(|_| "Watcher state lock poisoned".to_string())?;
    // Dropping the old debouncer (if any) stops the previous watch.
    state.debouncer = Some(debouncer);
    state.path = Some(path);
    Ok(())
}

/// Stop watching the current file, if any.
#[tauri::command]
pub async fn unwatch_file() -> Result<(), String> {
    let mut state = WATCH_STATE
        .lock()
        .map_err(|_| "Watcher state lock poisoned".to_string())?;
    state.debouncer = None;
    state.path = None;
    Ok(())
}
