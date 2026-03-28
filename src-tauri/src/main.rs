// RAG App — https://github.com/ramoncalvo
#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

use std::process::{Child, Command};
use std::sync::Mutex;
use tauri::Manager;

struct BackendProcess(Mutex<Option<Child>>);

fn find_node() -> String {
    // Check NVM
    if let Ok(nvm_dir) = std::env::var("NVM_DIR") {
        let default_node = format!("{}/versions/node/default/bin/node", nvm_dir);
        if std::path::Path::new(&default_node).exists() {
            return default_node;
        }
    }

    // Check common paths
    for cmd in ["node", "/usr/local/bin/node"] {
        if Command::new(cmd).arg("--version").output().is_ok() {
            return cmd.to_string();
        }
    }
    "node".to_string()
}

fn main() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .manage(BackendProcess(Mutex::new(None)))
        .setup(|app| {
            let cwd = std::env::current_dir().unwrap_or_default();
            let node = find_node();
            println!("[tauri] Using Node: {}", node);
            println!("[tauri] Working dir: {:?}", cwd);

            let child = Command::new(&node)
                .args(["backend/dist/main.js"])
                .current_dir(&cwd)
                .spawn();

            match child {
                Ok(c) => {
                    let state: tauri::State<BackendProcess> = app.state();
                    *state.0.lock().unwrap() = Some(c);
                    println!("[tauri] NestJS backend started");
                }
                Err(e) => {
                    eprintln!("[tauri] Failed to start backend: {}", e);
                }
            }

            Ok(())
        })
        .on_window_event(|window, event| {
            if let tauri::WindowEvent::Destroyed = event {
                let state: tauri::State<BackendProcess> = window.state();
                let mut guard = state.0.lock().unwrap();
                if let Some(ref mut child) = *guard {
                    let _ = child.kill();
                    let _ = child.wait();
                    println!("[tauri] Backend stopped");
                }
                drop(guard);
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
