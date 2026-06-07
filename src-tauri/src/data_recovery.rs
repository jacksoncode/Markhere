use std::fs;
use std::path::Path;
use std::time::{SystemTime, UNIX_EPOCH};

/// 备份文件到 temp 目录，返回备份路径
#[tauri::command]
pub async fn create_backup(file_path: String) -> Result<String, String> {
    let path = Path::new(&file_path);
    if !path.exists() {
        return Err("File not found".to_string());
    }

    // 生成备份文件名
    let timestamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .unwrap()
        .as_secs();
    let stem = path.file_stem().unwrap_or_default().to_string_lossy();
    let backup_name = format!("{}_{}.md.bak", stem, timestamp);

    let backup_dir = dirs_next::data_dir()
        .unwrap_or_else(|| Path::new(".").to_path_buf())
        .join("Markhere")
        .join("backups");

    fs::create_dir_all(&backup_dir).map_err(|e| e.to_string())?;
    let backup_path = backup_dir.join(&backup_name);

    // 复制文件
    fs::copy(path, &backup_path).map_err(|e| e.to_string())?;

    // 清理旧备份（保留最近 20 个）
    cleanup_old_backups(&backup_dir, 20);

    Ok(backup_path.to_string_lossy().to_string())
}

/// 列出所有备份
#[tauri::command]
pub async fn list_backups() -> Result<Vec<String>, String> {
    let backup_dir = dirs_next::data_dir()
        .unwrap_or_else(|| Path::new(".").to_path_buf())
        .join("Markhere")
        .join("backups");

    if !backup_dir.exists() {
        return Ok(vec![]);
    }

    let mut backups: Vec<String> = Vec::new();
    for entry in fs::read_dir(&backup_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        if entry.path().extension().map_or(false, |e| e == "bak") {
            backups.push(entry.path().to_string_lossy().to_string());
        }
    }
    backups.sort_by(|a, b| b.cmp(a)); // newest first
    Ok(backups)
}

/// 恢复备份到指定路径
#[tauri::command]
pub async fn restore_backup(backup_path: String, target_path: String) -> Result<(), String> {
    fs::copy(&backup_path, &target_path).map_err(|e| e.to_string())?;
    Ok(())
}

/// 清理旧备份
fn cleanup_old_backups(dir: &Path, keep: usize) {
    let Ok(entries) = fs::read_dir(dir) else { return };
    let mut files: Vec<_> = entries.filter_map(|e| e.ok()).collect();
    if files.len() <= keep { return }

    // Sort by modified time (oldest first)
    files.sort_by_key(|e| e.metadata().ok().and_then(|m| m.modified().ok()).unwrap_or(SystemTime::now()));

    for f in files.iter().take(files.len().saturating_sub(keep)) {
        let _ = fs::remove_file(f.path());
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::NamedTempFile;

    #[tokio::test]
    async fn test_create_and_list_backups() {
        let mut file = NamedTempFile::new().unwrap();
        file.write_all(b"critical data").unwrap();
        let path = file.path().to_str().unwrap().to_string();

        let backup = create_backup(path.clone()).await;
        assert!(backup.is_ok());

        let list = list_backups().await.unwrap();
        assert!(!list.is_empty());
    }
}
