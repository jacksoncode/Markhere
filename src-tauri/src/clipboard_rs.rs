use std::io::Cursor;
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

    // arboard ImageData: width, height, bytes (RGBA)
    let img = image::RgbaImage::from_raw(
        image.width as u32,
        image.height as u32,
        image.bytes.to_vec(),
    ).ok_or("Failed to create image from clipboard data")?;

    let mut png_buffer = Cursor::new(Vec::new());
    img.write_to(&mut png_buffer, image::ImageFormat::Png)
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;

    let png_bytes = png_buffer.into_inner();
    Ok(general_purpose::STANDARD.encode(&png_bytes))
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
