use std::fs::{self, File};
use std::io::{Read, Seek, SeekFrom};
use std::path::Path;

#[tauri::command]
pub async fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = std::fs::metadata(&path)
        .map_err(|e| format!("Failed to get file metadata: {}", e))?;

    Ok(metadata.len())
}

#[tauri::command]
pub async fn read_file_chunk(
    path: String,
    offset: u64,
    length: usize,
) -> Result<String, String> {
    let mut file = File::open(&path)
        .map_err(|e| format!("Failed to open file: {}", e))?;
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek: {}", e))?;
    let mut buffer = vec![0u8; length];
    let bytes_read = file.read(&mut buffer)
        .map_err(|e| format!("Failed to read: {}", e))?;
    buffer.truncate(bytes_read);
    String::from_utf8(buffer)
        .map_err(|e| format!("Invalid UTF-8: {}", e))
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
