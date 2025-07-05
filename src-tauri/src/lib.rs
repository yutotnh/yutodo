use std::process::Command;

#[cfg(target_os = "windows")]
use std::os::windows::process::CommandExt;

#[cfg(test)]
mod tests;

// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
#[tauri::command]
fn greet(name: &str) -> String {
    format!("Hello, {}! You've been greeted from Rust!", name)
}

#[tauri::command]
fn spawn_new_instance() -> Result<String, String> {
    // 現在の実行ファイルのパスを取得
    let current_exe = std::env::current_exe()
        .map_err(|e| format!("Failed to get current executable path: {}", e))?;
    
    println!("Attempting to spawn new instance from: {:?}", current_exe);
    
    // プラットフォーム別の処理
    #[cfg(target_os = "windows")]
    {
        // Windowsでは、新しいプロセスを独立して起動
        match Command::new(&current_exe)
            .creation_flags(0x00000010) // CREATE_NEW_CONSOLE
            .spawn()
        {
            Ok(child) => {
                let pid = child.id();
                println!("Successfully spawned new process with PID: {}", pid);
                Ok(format!("New process spawned with PID: {}", pid))
            }
            Err(e) => {
                eprintln!("Failed to spawn new process: {}", e);
                Err(format!("Failed to spawn new process: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "macos")]
    {
        // macOSでは、openコマンドを使用して新しいインスタンスを起動
        match Command::new("open")
            .arg("-n") // 新しいインスタンスを起動
            .arg("-a") // アプリケーションを指定
            .arg(&current_exe)
            .spawn()
        {
            Ok(child) => {
                let pid = child.id();
                println!("Successfully spawned new process with PID: {}", pid);
                Ok(format!("New process spawned with PID: {}", pid))
            }
            Err(e) => {
                eprintln!("Failed to spawn new process: {}", e);
                Err(format!("Failed to spawn new process: {}", e))
            }
        }
    }
    
    #[cfg(target_os = "linux")]
    {
        // Linuxでは、通常のspawnを使用
        match Command::new(&current_exe)
            .spawn()
        {
            Ok(child) => {
                let pid = child.id();
                println!("Successfully spawned new process with PID: {}", pid);
                Ok(format!("New process spawned with PID: {}", pid))
            }
            Err(e) => {
                eprintln!("Failed to spawn new process: {}", e);
                Err(format!("Failed to spawn new process: {}", e))
            }
        }
    }
    
    #[cfg(not(any(target_os = "windows", target_os = "macos", target_os = "linux")))]
    {
        Err("Unsupported platform".to_string())
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![greet, spawn_new_instance])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
