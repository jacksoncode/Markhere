use std::fs;
use std::io::Write;
use std::process::Command;
use base64::{Engine as _, engine::general_purpose};
use tauri::Manager;
use serde::{Deserialize, Serialize};

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    hash: String,
    short_hash: String,
    author: String,
    date: String,
    message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiff {
    old_content: String,
    new_content: String,
    additions: usize,
    deletions: usize,
}

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
    let wrapped_html = format!(
        "<!DOCTYPE html><html><head><meta charset=\"UTF-8\"><style>body{{font-family:sans-serif;max-width:800px;margin:40px auto;}}pre{{background:#f4f4f4;padding:16px;}}code{{background:#f4f4f4;padding:2px 6px;}}img{{max-width:100%;}}</style></head><body>{}</body></html>",
        html
    );
    
    let mut file = fs::File::create(&output_path).map_err(|e: std::io::Error| e.to_string())?;
    file.write_all(wrapped_html.as_bytes()).map_err(|e: std::io::Error| e.to_string())?;
    
    Ok(output_path)
}

#[tauri::command]
async fn export_to_word(markdown: String, output_path: String) -> Result<String, String> {
    let mut file = fs::File::create(&output_path).map_err(|e: std::io::Error| e.to_string())?;
    file.write_all(markdown.as_bytes()).map_err(|e: std::io::Error| e.to_string())?;
    
    Ok(output_path)
}

#[tauri::command]
async fn export_to_epub(markdown: String, output_path: String, title: String) -> Result<String, String> {
    let epub_content = format!(
        "<?xml version=\"1.0\" encoding=\"UTF-8\"?>
<!DOCTYPE html PUBLIC \"-//W3C//DTD XHTML 1.1//EN\" \"http://www.w3.org/TR/xhtml11/DTD/xhtml11.dtd\">
<html xmlns=\"http://www.w3.org/1999/xhtml\">
<head><title>{}</title></head>
<body>
{}
</body>
</html>",
        title,
        markdown_to_html(&markdown)
    );
    
    let mut file = fs::File::create(&output_path).map_err(|e: std::io::Error| e.to_string())?;
    file.write_all(epub_content.as_bytes()).map_err(|e: std::io::Error| e.to_string())?;
    
    Ok(output_path)
}

fn markdown_to_html(markdown: &str) -> String {
    let mut html = String::new();
    for line in markdown.lines() {
        if line.starts_with('#') {
            let level = line.chars().take_while(|c| *c == '#').count();
            let text = line.trim_start_matches('#').trim();
            html.push_str(&format!("<h{}>{}</h{}>\n", level, text, level));
        } else if line.starts_with("- ") || line.starts_with("* ") {
            html.push_str(&format!("<li>{}</li>\n", line[2..].trim()));
        } else if line.is_empty() {
            html.push_str("<br/>\n");
        } else {
            html.push_str(&format!("<p>{}</p>\n", line));
        }
    }
    html
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

#[tauri::command]
async fn validate_link(url: String) -> Result<bool, String> {
    if url.starts_with("http://") || url.starts_with("https://") {
        let client = reqwest::blocking::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .user_agent("Markhere/1.0")
            .build()
            .map_err(|e| e.to_string())?;
        
        let response = client
            .head(&url)
            .send()
            .map_err(|e| e.to_string())?;
        
        Ok(response.status().is_success())
    } else {
        Ok(true)
    }
}

#[tauri::command]
async fn get_git_history(file_path: String) -> Result<Vec<GitCommit>, String> {
    let output = Command::new("git")
        .args(["log", "--follow", "--format=%H|%h|%an|%ad|%s", "--date=short"])
        .arg(&file_path)
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Git command failed".to_string());
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    let commits: Vec<GitCommit> = stdout
        .lines()
        .filter(|line| !line.is_empty())
        .map(|line| {
            let parts: Vec<&str> = line.split('|').collect();
            GitCommit {
                hash: parts.first().map_or("", |v| *v).to_string(),
                short_hash: parts.get(1).map_or("", |v| *v).to_string(),
                author: parts.get(2).map_or("", |v| *v).to_string(),
                date: parts.get(3).map_or("", |v| *v).to_string(),
                message: parts.get(4).map_or("", |v| *v).to_string(),
            }
        })
        .collect();

    Ok(commits)
}

#[tauri::command]
async fn get_git_diff(file_path: String, old_hash: String, new_hash: String) -> Result<GitDiff, String> {
    // Get old content
    let old_output = Command::new("git")
        .args(["show", &format!("{}:{}", old_hash, file_path)])
        .output()
        .map_err(|e| e.to_string())?;

    let old_content = if old_output.status.success() {
        String::from_utf8_lossy(&old_output.stdout).to_string()
    } else {
        String::new()
    };

    // Get new content
    let new_output = Command::new("git")
        .args(["show", &format!("{}:{}", new_hash, file_path)])
        .output()
        .map_err(|e| e.to_string())?;

    let new_content = if new_output.status.success() {
        String::from_utf8_lossy(&new_output.stdout).to_string()
    } else {
        String::new()
    };

    // Count additions and deletions
    let diff_output = Command::new("git")
        .args(["diff", "--numstat", &old_hash, &new_hash])
        .arg(&file_path)
        .output()
        .map_err(|e| e.to_string())?;

    let (additions, deletions) = if diff_output.status.success() {
        let diff_stdout = String::from_utf8_lossy(&diff_output.stdout);
        let first_line = diff_stdout.lines().next().unwrap_or("");
        let parts: Vec<&str> = first_line.split_whitespace().collect();
        (
            parts.get(0).and_then(|s| s.parse().ok()).unwrap_or(0),
            parts.get(1).and_then(|s| s.parse().ok()).unwrap_or(0),
        )
    } else {
        (0, 0)
    };

    Ok(GitDiff {
        old_content,
        new_content,
        additions,
        deletions,
    })
}

#[tauri::command]
async fn get_file_at_commit(file_path: String, hash: String) -> Result<String, String> {
    let output = Command::new("git")
        .args(["show", &format!("{}:{}", hash, file_path)])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Git show command failed".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
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
            export_to_epub,
            save_image,
            validate_link,
            get_git_history,
            get_git_diff,
            get_file_at_commit,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}