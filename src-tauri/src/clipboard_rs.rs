use base64::{Engine as _, engine::general_purpose};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use arboard::Clipboard;

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
pub async fn read_clipboard_image() -> Result<String, String> {
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    let image = clipboard.get_image()
        .map_err(|e| format!("No image in clipboard: {}", e))?;

    // Return raw RGBA bytes as base64 (frontend handles conversion to PNG)
    Ok(general_purpose::STANDARD.encode(image.bytes))
}

#[cfg(any(target_os = "android", target_os = "ios"))]
#[tauri::command]
pub async fn read_clipboard_image() -> Result<String, String> {
    Err("Clipboard image not supported on mobile".to_string())
}

#[cfg(test)]
mod tests {
    #[test]
    fn test_read_clipboard_image_unsupported() {
    }
}
