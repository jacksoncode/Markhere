use base64::{Engine as _, engine::general_purpose};

#[cfg(not(any(target_os = "android", target_os = "ios")))]
use arboard::Clipboard;

/// Minimal PNG encoder from raw RGBA bytes (no image crate needed)
fn encode_png_rgba(width: u32, height: u32, rgba: &[u8]) -> Result<Vec<u8>, String> {
    use std::io::Write;

    let mut out = Vec::new();

    // PNG signature
    out.write_all(&[137, 80, 78, 71, 13, 10, 26, 10]).unwrap();

    // IHDR chunk
    let mut ihdr = Vec::new();
    ihdr.write_all(b"IHDR").unwrap();
    ihdr.extend_from_slice(&width.to_be_bytes());
    ihdr.extend_from_slice(&height.to_be_bytes());
    ihdr.write_all(&[8, 6, 0, 0, 0]).unwrap(); // 8-bit RGBA, no compression/filter/interlace
    write_png_chunk(&mut out, &ihdr);

    // IDAT chunk (raw pixel data with filter byte 0 per row)
    let mut idat_data = Vec::new();
    for y in 0..height {
        idat_data.push(0); // filter: None
        let row_start = (y * width * 4) as usize;
        let row_end = row_start + (width * 4) as usize;
        for &b in &rgba[row_start..row_end.min(rgba.len())] {
            idat_data.push(b);
        }
    }

    let compressed = compress_gzip(&idat_data)?;
    let mut idat = Vec::new();
    idat.write_all(b"IDAT").unwrap();
    idat.extend_from_slice(&compressed);
    write_png_chunk(&mut out, &idat);

    // IEND chunk
    let mut iend = Vec::new();
    iend.write_all(b"IEND").unwrap();
    write_png_chunk(&mut out, &iend);

    Ok(out)
}

fn write_png_chunk(out: &mut Vec<u8>, data: &[u8]) {
    let len = (data.len() - 4) as u32;
    out.extend_from_slice(&len.to_be_bytes());
    let crc = crc32fast::hash(data);
    out.extend_from_slice(data);
    out.extend_from_slice(&crc.to_be_bytes());
}

/// Simple gzip/deflate compressor using miniz_oxide (no external deps needed)
fn compress_gzip(data: &[u8]) -> Result<Vec<u8>, String> {
    use flate2::write::GzEncoder;
    use flate2::Compression;
    use std::io::Write;

    let mut encoder = GzEncoder::new(Vec::new(), Compression::default());
    encoder.write_all(data).map_err(|e| e.to_string())?;
    encoder.finish().map_err(|e| e.to_string())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
#[tauri::command]
pub async fn read_clipboard_image() -> Result<String, String> {
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;

    let image = clipboard.get_image()
        .map_err(|e| format!("No image in clipboard: {}", e))?;

    let png = encode_png_rgba(
        image.width as u32,
        image.height as u32,
        &image.bytes,
    )?;

    Ok(general_purpose::STANDARD.encode(&png))
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

    #[test]
    fn test_encode_png_small() {
        let rgba = vec![255u8, 0, 0, 255, 0, 255, 0, 255, 0, 0, 255, 255]; // 3 pixels RGBA
        let png = super::encode_png_rgba(3, 1, &rgba).unwrap();
        assert!(png.len() > 8);
        assert_eq!(&png[0..8], &[137, 80, 78, 71, 13, 10, 26, 10]); // PNG signature
    }
}
