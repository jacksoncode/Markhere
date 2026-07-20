use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

use crate::decode_file_bytes;

#[tauri::command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    Ok(metadata.len())
}

/// Clamp `pos` down to the nearest UTF-8 char boundary in `bytes` (valid UTF-8
/// assumed). Used so chunk ranges never cut a multibyte character in half.
fn clamp_utf8_boundary(bytes: &[u8], pos: usize) -> usize {
    if pos >= bytes.len() {
        return bytes.len();
    }
    let s = std::str::from_utf8(bytes).unwrap();
    let mut p = pos;
    while p > 0 && !s.is_char_boundary(p) {
        p -= 1;
    }
    p
}

#[tauri::command]
pub async fn read_file_chunk(
    path: String,
    offset: u64,
    length: usize,
) -> Result<String, String> {
    let offset = offset as usize;
    let bytes = fs::read(&path).map_err(|e| format!("Failed to read file: {}", e))?;
    let total = bytes.len();

    if offset >= total {
        return Ok(String::new());
    }
    let end = std::cmp::min(offset + length, total);

    // Fast path: UTF-8 files. Byte offsets map directly to char boundaries, so
    // we clamp both ends and slice losslessly (no truncation errors).
    if std::str::from_utf8(&bytes).is_ok() {
        let s = clamp_utf8_boundary(&bytes, offset);
        let e = clamp_utf8_boundary(&bytes, end);
        return Ok(String::from_utf8_lossy(&bytes[s..e]).into_owned());
    }

    // Non-UTF-8 (e.g. GBK/ANSI): decode with a small leading overlap so a
    // multibyte character straddling the start of the range is not truncated.
    // The trailing edge may produce at most one replacement char when a
    // character spills into the next chunk.
    let overlap = std::cmp::min(offset, 4);
    let start = offset - overlap;
    let decoded = decode_file_bytes(&bytes[start..end]);
    let overlap_chars = decode_file_bytes(&bytes[start..offset]).chars().count();
    let content: String = decoded.chars().skip(overlap_chars).collect();
    Ok(content)
}

/// 递归扫描目录中所有 .md 文件，返回完整路径列表
#[tauri::command]
pub async fn list_markdown_files(dir_path: String) -> Result<Vec<String>, String> {
    let mut files: Vec<String> = Vec::new();
    let base = Path::new(&dir_path);

    if !base.is_dir() {
        return Err(format!("Not a directory: {}", dir_path));
    }

    scan_dir_recursive(base, &mut files)
        .map_err(|e| format!("Failed to scan directory: {}", e))?;

    // 按路径排序以保证稳定性
    files.sort();
    Ok(files)
}

fn scan_dir_recursive(dir: &Path, output: &mut Vec<String>) -> Result<(), std::io::Error> {
    for entry in fs::read_dir(dir)? {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // 跳过隐藏目录和 node_modules
            if let Some(name) = path.file_name().and_then(|n| n.to_str()) {
                if name.starts_with('.') || name == "node_modules" { continue; }
            }
            scan_dir_recursive(&path, output)?;
        } else if path.extension().map_or(false, |ext| ext == "md") {
            output.push(path.to_string_lossy().to_string());
        }
    }
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::{NamedTempFile, TempDir};

    #[tokio::test]
    async fn test_get_file_size() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"Hello, world!").unwrap();
        let path = file.path().to_str().unwrap().to_string();
        let size = get_file_size(path).await.unwrap();
        assert_eq!(size, 13);
    }

    #[tokio::test]
    async fn test_read_file_chunk() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"0123456789ABCDEFGHIJ").unwrap();
        let path = file.path().to_str().unwrap().to_string();
        assert_eq!(read_file_chunk(path.clone(), 0, 10).await.unwrap(), "0123456789");
        assert_eq!(read_file_chunk(path, 10, 10).await.unwrap(), "ABCDEFGHIJ");
    }

    #[tokio::test]
    async fn test_read_file_chunk_gbk_boundary() {
        // "A中B" where 中 is GBK bytes [0xD6, 0xD0].
        let gbk = [0x41u8, 0xD6, 0xD0, 0x42];
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(&gbk).unwrap();
        let path = file.path().to_str().unwrap().to_string();

        // Normal UTF-8 path is untouched.
        let mut f2 = NamedTempFile::new().unwrap();
        f2.write_all("0123456789ABCDEFGHIJ".as_bytes()).unwrap();
        let p2 = f2.path().to_str().unwrap().to_string();
        assert_eq!(read_file_chunk(p2.clone(), 0, 10).await.unwrap(), "0123456789");
        assert_eq!(read_file_chunk(p2, 10, 10).await.unwrap(), "ABCDEFGHIJ");

        // GBK: a whole-file read decodes correctly.
        assert_eq!(read_file_chunk(path.clone(), 0, 4).await.unwrap(), "A中B");
        // Chunk covering the complete 中 (bytes 1..3) decodes to "中".
        assert_eq!(read_file_chunk(path.clone(), 1, 2).await.unwrap(), "中");
        // Chunk starting mid-character (bytes 2..4) drops the partial leading
        // byte and yields "B" instead of hard-failing.
        assert_eq!(read_file_chunk(path.clone(), 2, 2).await.unwrap(), "B");
        // Offset past EOF returns empty instead of erroring.
        assert_eq!(read_file_chunk(path, 100, 10).await.unwrap(), "");
    }

    #[tokio::test]
    async fn test_list_markdown_files() {
        let dir = TempDir::new().unwrap();
        let base = dir.path();

        fs::write(base.join("a.md"), "# A").unwrap();
        fs::write(base.join("b.md"), "# B").unwrap();
        fs::write(base.join("c.txt"), "not md").unwrap();

        // subdirectory
        let sub = base.join("sub");
        fs::create_dir(&sub).unwrap();
        fs::write(sub.join("d.md"), "# D").unwrap();

        // hidden dir should be skipped
        let hidden = base.join(".hidden");
        fs::create_dir(&hidden).unwrap();
        fs::write(hidden.join("e.md"), "# E").unwrap();

        let files = list_markdown_files(base.to_str().unwrap().to_string()).await.unwrap();
        assert_eq!(files.len(), 3); // a.md, b.md, sub/d.md
    }
}
