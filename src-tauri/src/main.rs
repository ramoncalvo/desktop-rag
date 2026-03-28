// RAG App — https://github.com/ramoncalvo
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct PythonBackend(Mutex<Option<Child>>);

fn find_python() -> String {
    // Try conda env first, then system python
    let candidates = [
        "python3",
        "python",
    ];

    // Check CONDA_PREFIX for the active conda env
    if let Ok(prefix) = std::env::var("CONDA_PREFIX") {
        let conda_python = format!("{}/bin/python", prefix);
        if std::path::Path::new(&conda_python).exists() {
            return conda_python;
        }
    }

    for cmd in candidates {
        if Command::new(cmd).arg("--version").output().is_ok() {
            return cmd.to_string();
        }
    }
    "python3".to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(PythonBackend(Mutex::new(None)))
        .setup(|app| {
            let cwd = std::env::current_dir().unwrap_or_default();
            let python = find_python();
            println!("[tauri] Using Python: {}", python);
            println!("[tauri] Working dir: {:?}", cwd);

            let python_child = Command::new(&python)
                .args(["-u", "backend/server.py"])
                .current_dir(&cwd)
                .spawn();

            match python_child {
                Ok(child) => {
                    let state: tauri::State<PythonBackend> = app.state();
                    *state.0.lock().unwrap() = Some(child);
                    println!("[tauri] Python backend started");
                }
                Err(e) => {
                    eprintln!("[tauri] Failed to start Python backend: {}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state: tauri::State<PythonBackend> = window.state();
                let mut guard = state.0.lock().unwrap();
                if let Some(ref mut child) = *guard {
                    let _ = child.kill();
                    let _ = child.wait();
                    println!("[tauri] Python backend stopped");
                }
                drop(guard);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
