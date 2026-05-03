use std::fs;
use std::io::Write;
use base64::{Engine as _, engine::general_purpose};
use tauri::Manager;

#[tauri::command]
async fn save_file(_app: tauri::AppHandle, path: String, content: String) -> Result<String, String> {
    let file_path = std::path::Path::new(&path);

    if let Some(parent) = file_path.parent() {
        if !parent.exists() {
            fs::create_dir_all(parent).map_err(|e: std::io::Error| e.to_string())?;
        }
    }

    let mut file = fs::File::create(file_path).map_err(|e: std::io::Error| e.to_string())?;
    file.write_all(content.as_bytes()).map_err(|e: std::io::Error| e.to_string())?;

    Ok(path)
}

#[tauri::command]
async fn read_file(path: String) -> Result<String, String> {
    let content = fs::read_to_string(&path).map_err(|e: std::io::Error| e.to_string())?;
    Ok(content)
}

#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    let exists = std::path::Path::new(&path).exists();
    Ok(exists)
}

#[tauri::command]
async fn export_to_pdf(html: String, output_path: String) -> Result<String, String> {
    Ok(format!("PDF export to {} with {} bytes", output_path, html.len()))
}

#[tauri::command]
async fn export_to_word(markdown: String, output_path: String) -> Result<String, String> {
    Ok(format!("Word export to {} with {} bytes", output_path, markdown.len()))
}

#[tauri::command]
async fn save_image(app: tauri::AppHandle, image_data: String, filename: String) -> Result<String, String> {
    let app_dir = app.path().app_data_dir().map_err(|e: tauri::Error| e.to_string())?;
    let images_dir = app_dir.join("images");

    if !images_dir.exists() {
        fs::create_dir_all(&images_dir).map_err(|e: std::io::Error| e.to_string())?;
    }

    let file_path = images_dir.join(&filename);

    let decoded = general_purpose::STANDARD
        .decode(image_data.split(',').last().unwrap_or(""))
        .map_err(|e: base64::DecodeError| e.to_string())?;

    let mut file = fs::File::create(&file_path).map_err(|e: std::io::Error| e.to_string())?;
    file.write_all(&decoded).map_err(|e: std::io::Error| e.to_string())?;

    Ok(file_path.to_string_lossy().to_string())
}

pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            save_file,
            read_file,
            file_exists,
            export_to_pdf,
            export_to_word,
            save_image,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}