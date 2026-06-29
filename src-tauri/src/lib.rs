use std::fs;
use std::io::{Write, BufWriter, Read};
use std::process::Command;
use base64::{Engine as _, engine::general_purpose};
use tauri::Manager;
use tauri::Emitter;
use tauri::menu::{MenuBuilder, SubmenuBuilder, MenuItem, PredefinedMenuItem};
use tauri::{WebviewWindowBuilder, WebviewUrl};
use serde::{Deserialize, Serialize};
use printpdf::*;
use docx_rs::*;
use pulldown_cmark::{Parser, Options, html};
use zip::ZipArchive;

mod system_metrics;
mod file_operations;
mod clipboard_rs;
mod data_recovery;
mod file_watcher;

pub use file_operations::*;
pub use system_metrics::*;
pub use clipboard_rs::*;
pub use data_recovery::*;

// ---- Path validation (defense-in-depth) ----

/// Reject paths that target sensitive system directories.
fn validate_path(path: &str) -> Result<(), String> {
    let normalized = path.replace('\\', "/");
    let lower = normalized.to_lowercase();

    let forbidden_prefixes = [
        "/etc/", "/proc/", "/sys/", "/dev/",
        "/usr/", "/var/", "/boot/",
        "c:/windows/", "c:/program files",
    ];

    for prefix in &forbidden_prefixes {
        if lower.starts_with(prefix) {
            return Err(format!("Access denied: path targets system directory: {}", path));
        }
    }

    Ok(())
}

/// Ensure export output paths have one of the expected extensions.
fn validate_export_extension(path: &str, allowed: &[&str]) -> Result<(), String> {
    let ext = std::path::Path::new(path)
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("");
    if allowed.iter().any(|a| a.eq_ignore_ascii_case(ext)) {
        Ok(())
    } else {
        Err(format!(
            "Invalid export extension '.{}', expected one of: {:?}",
            ext, allowed
        ))
    }
}

/// Validate that a git ref (hash or ref name) has a safe format.
fn validate_git_ref(hash: &str) -> Result<(), String> {
    if hash.is_empty() || hash.len() > 256 {
        return Err("Git ref must be between 1 and 256 characters".to_string());
    }
    if !hash.chars().all(|c| c.is_ascii_alphanumeric() || c == '.' || c == '/' || c == '-' || c == '_' || c == '^' || c == '~' || c == '@' || c == '{' || c == '}' || c == ':') {
        return Err(format!("Git ref contains invalid characters: {}", hash));
    }
    Ok(())
}

#[cfg(target_os = "macos")]
use tauri::TitleBarStyle;

#[derive(Debug, Serialize, Deserialize)]
pub struct GitCommit {
    pub hash: String,
    pub short_hash: String,
    pub author: String,
    pub date: String,
    pub message: String,
}

#[derive(Debug, Serialize, Deserialize)]
pub struct GitDiff {
    pub old_content: String,
    pub new_content: String,
    pub additions: usize,
    pub deletions: usize,
}

#[tauri::command]
async fn save_file(_app: tauri::AppHandle, path: String, content: String) -> Result<String, String> {
    validate_path(&path)?;
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
    validate_path(&path)?;
    let content = fs::read_to_string(&path).map_err(|e: std::io::Error| e.to_string())?;
    Ok(content)
}

#[tauri::command]
async fn file_exists(path: String) -> Result<bool, String> {
    validate_path(&path)?;
    let exists = std::path::Path::new(&path).exists();
    Ok(exists)
}

/// Extract markdown content from a Notion export ZIP file.
/// Notion exports contain .md files and .csv database files inside a ZIP.
/// This command reads the ZIP, extracts all .md files, and concatenates them
/// into a single markdown document (sorted by filename for consistent ordering).
#[tauri::command]
async fn extract_notion_zip(path: String) -> Result<String, String> {
    validate_path(&path)?;
    
    let file = fs::File::open(&path).map_err(|e| format!("Failed to open ZIP: {}", e))?;
    let mut archive = ZipArchive::new(file).map_err(|e| format!("Failed to read ZIP: {}", e))?;
    
    let mut md_files: Vec<(String, String)> = Vec::new();
    
    for i in 0..archive.len() {
        let mut zip_file = archive.by_index(i).map_err(|e| format!("ZIP entry error: {}", e))?;
        
        let name = zip_file.name().to_string();
        
        if name.ends_with(".md") && !zip_file.is_dir() {
            let mut content = String::new();
            zip_file.read_to_string(&mut content).map_err(|e| format!("Read error for {}: {}", name, e))?;
            md_files.push((name, content));
        }
    }
    
    if md_files.is_empty() {
        return Err("No markdown files found in Notion export ZIP".to_string());
    }
    
    md_files.sort_by(|a, b| a.0.cmp(&b.0));
    
    let mut result = String::new();
    for (filename, content) in &md_files {
        let title = filename
            .trim_end_matches(".md")
            .replace("%20", " ")
            .replace("%2F", "/");
        
        if !result.is_empty() {
            result.push_str("\n\n---\n\n");
        }
        result.push_str(&format!("## {}\n\n{}", title, content.trim()));
    }
    
    Ok(result)
}

#[tauri::command]
async fn export_to_pdf(markdown: String, output_path: String) -> Result<String, String> {
    validate_path(&output_path)?;
    validate_export_extension(&output_path, &["pdf"])?;
    let (doc, mut current_page, mut current_layer) = PdfDocument::new(
        "Markhere Export",
        Mm(210.0),
        Mm(297.0),
        "Layer 1",
    );

    let font = doc.add_builtin_font(BuiltinFont::Helvetica).map_err(|e| e.to_string())?;
    let font_bold = doc.add_builtin_font(BuiltinFont::HelveticaBold).map_err(|e| e.to_string())?;

    let margin_left = 20.0;
    let margin_top = 20.0;
    let margin_bottom = 25.0;
    let page_text_width = 170.0; // 210 - 2*20
    let mut y: f64 = 297.0 - margin_top;

    for line in markdown.lines() {
        let (text, font_size, is_bold) = pdf_line_style(line);

        if text.is_empty() {
            y -= 6.0;
            continue;
        }

        let current_font = if is_bold { &font_bold } else { &font };
        let line_spacing = font_size * 1.5;
        let chars_per_line = ((page_text_width / (font_size * 0.175)) as usize).max(10);

        let wrapped = wrap_pdf_text(&text, chars_per_line);

        for wline in &wrapped {
            if y < margin_bottom {
                let (np, nl) = doc.add_page(Mm(210.0), Mm(297.0), "Layer");
                current_page = np;
                current_layer = nl;
                y = 297.0 - margin_top;
            }

            let layer = doc.get_page(current_page).get_layer(current_layer);
            layer.use_text(wline, font_size as f32, Mm(margin_left as f32), Mm(y as f32), current_font);
            y -= line_spacing;
        }
    }

    let file = std::fs::File::create(&output_path).map_err(|e: std::io::Error| e.to_string())?;
    let mut writer = BufWriter::new(file);
    doc.save(&mut writer).map_err(|e| format!("{:?}", e))?;

    Ok(output_path)
}

#[tauri::command]
async fn export_to_word(markdown: String, output_path: String) -> Result<String, String> {
    validate_path(&output_path)?;
    validate_export_extension(&output_path, &["docx"])?;
    let mut doc = Docx::new();

    for line in markdown.lines() {
        if line.starts_with("```") {
            continue;
        }

        if let Some(text) = line.strip_prefix("# ") {
            doc = doc.add_paragraph(make_docx_paragraph(text.trim(), 48, true, false));
        } else if let Some(text) = line.strip_prefix("## ") {
            doc = doc.add_paragraph(make_docx_paragraph(text.trim(), 40, true, false));
        } else if let Some(text) = line.strip_prefix("### ") {
            doc = doc.add_paragraph(make_docx_paragraph(text.trim(), 32, true, false));
        } else if let Some(text) = line.strip_prefix("#### ") {
            doc = doc.add_paragraph(make_docx_paragraph(text.trim(), 28, true, false));
        } else if let Some(text) = line.strip_prefix("##### ") {
            doc = doc.add_paragraph(make_docx_paragraph(text.trim(), 26, true, false));
        } else if let Some(text) = line.strip_prefix("###### ") {
            doc = doc.add_paragraph(make_docx_paragraph(text.trim(), 24, true, false));
        } else if line.starts_with("- ") || line.starts_with("* ") {
            let text = format!("  •  {}", &line[2..]);
            doc = doc.add_paragraph(make_docx_paragraph(&text, 24, false, false));
        } else if line.is_empty() {
            doc = doc.add_paragraph(Paragraph::new());
        } else if !line.trim().is_empty() {
            doc = doc.add_paragraph(make_docx_paragraph(line.trim(), 24, false, false));
        }
    }

    let output_file = std::fs::File::create(&output_path).map_err(|e: std::io::Error| e.to_string())?;
    doc.build().pack(output_file).map_err(|e| format!("{:?}", e))?;

    Ok(output_path)
}

#[tauri::command]
async fn export_to_epub(markdown: String, output_path: String, title: String) -> Result<String, String> {
    validate_path(&output_path)?;
    validate_export_extension(&output_path, &["epub", "html"])?;
    let html_body = markdown_to_html(&markdown);
    let date = chrono::Local::now().format("%Y-%m-%d").to_string();

    let epub_content = format!(
        r#"<?xml version="1.0" encoding="UTF-8"?>
<!DOCTYPE html>
<html xmlns="http://www.w3.org/1999/xhtml" xml:lang="en">
<head>
    <meta charset="UTF-8"/>
    <title>{title}</title>
    <meta name="author" content="Markhere"/>
    <meta name="date" content="{date}"/>
    <style type="text/css">
        body {{ font-family: Georgia, serif; max-width: 800px; margin: 40px auto; line-height: 1.6; color: #333; }}
        h1, h2, h3, h4 {{ font-family: Helvetica, sans-serif; margin-top: 1.5em; }}
        h1 {{ font-size: 2em; border-bottom: 2px solid #eee; padding-bottom: 0.3em; }}
        h2 {{ font-size: 1.5em; }}
        h3 {{ font-size: 1.25em; }}
        pre {{ background: #f5f5f5; padding: 1em; overflow-x: auto; font-size: 0.9em; }}
        code {{ background: #f5f5f5; padding: 0.2em 0.4em; font-size: 0.9em; }}
        blockquote {{ border-left: 4px solid #ccc; margin: 1em 0; padding-left: 1em; color: #555; }}
        img {{ max-width: 100%; height: auto; }}
        a {{ color: #0366d6; }}
    </style>
</head>
<body>
{html_body}
</body>
</html>"#,
        title = title,
        date = date,
        html_body = html_body,
    );

    let mut file = std::fs::File::create(&output_path).map_err(|e: std::io::Error| e.to_string())?;
    file.write_all(epub_content.as_bytes()).map_err(|e: std::io::Error| e.to_string())?;

    Ok(output_path)
}

/// 使用 pulldown-cmark 标准库解析 Markdown 为 HTML，支持
/// 表格、脚注、任务列表、删除线等 GFM 扩展
fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    options.insert(Options::ENABLE_HEADING_ATTRIBUTES);

    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    html_output
}

// ---- PDF helper functions ----

fn pdf_line_style(line: &str) -> (String, f64, bool) {
    if let Some(text) = line.strip_prefix("# ") {
        (strip_inline_markers(text.trim()), 24.0, true)
    } else if let Some(text) = line.strip_prefix("## ") {
        (strip_inline_markers(text.trim()), 20.0, true)
    } else if let Some(text) = line.strip_prefix("### ") {
        (strip_inline_markers(text.trim()), 16.0, true)
    } else if let Some(text) = line.strip_prefix("#### ") {
        (strip_inline_markers(text.trim()), 14.0, true)
    } else if let Some(text) = line.strip_prefix("##### ") {
        (strip_inline_markers(text.trim()), 13.0, true)
    } else if let Some(text) = line.strip_prefix("###### ") {
        (strip_inline_markers(text.trim()), 12.0, true)
    } else if line.starts_with("- ") || line.starts_with("* ") {
        let text = format!("  •  {}", strip_inline_markers(&line[2..].trim()));
        (text, 12.0, false)
    } else if line.starts_with("```") {
        (String::new(), 12.0, false)
    } else {
        (strip_inline_markers(line.trim()), 12.0, false)
    }
}

fn strip_inline_markers(text: &str) -> String {
    let mut result = String::new();
    let chars: Vec<char> = text.chars().collect();
    let len = chars.len();
    let mut i = 0;

    while i < len {
        match chars[i] {
            '\\' if i + 1 < len => {
                result.push(chars[i + 1]);
                i += 2;
            }
            '!' if i + 1 < len && chars[i + 1] == '[' => {
                // Image: ![alt](url) -> alt
                i += 2;
                while i < len && chars[i] != ']' {
                    result.push(chars[i]);
                    i += 1;
                }
                if i < len { i += 1; }
                if i < len && chars[i] == '(' {
                    i += 1;
                    while i < len && chars[i] != ')' { i += 1; }
                    if i < len { i += 1; }
                }
            }
            '[' => {
                // Link: [text](url) -> text
                i += 1;
                while i < len && chars[i] != ']' {
                    result.push(chars[i]);
                    i += 1;
                }
                if i < len { i += 1; }
                if i < len && chars[i] == '(' {
                    i += 1;
                    while i < len && chars[i] != ')' { i += 1; }
                    if i < len { i += 1; }
                }
            }
            marker @ ('*' | '_' | '~') => {
                if i + 1 < len && chars[i + 1] == marker {
                    i += 2;
                    while i + 1 < len && !(chars[i] == marker && chars[i + 1] == marker) {
                        result.push(chars[i]);
                        i += 1;
                    }
                    if i + 1 < len { i += 2; }
                } else {
                    i += 1;
                    while i < len && chars[i] != marker {
                        result.push(chars[i]);
                        i += 1;
                    }
                    if i < len { i += 1; }
                }
            }
            '`' => {
                i += 1;
                while i < len && chars[i] != '`' {
                    result.push(chars[i]);
                    i += 1;
                }
                if i < len { i += 1; }
            }
            _ => {
                result.push(chars[i]);
                i += 1;
            }
        }
    }

    result
}

fn wrap_pdf_text(text: &str, max_chars: usize) -> Vec<String> {
    let mut lines = Vec::new();
    let mut current = String::new();

    if text.len() <= max_chars {
        return vec![text.to_string()];
    }

    for word in text.split_whitespace() {
        if current.is_empty() {
            current = word.to_string();
        } else if current.len() + 1 + word.len() <= max_chars {
            current.push(' ');
            current.push_str(word);
        } else {
            lines.push(current);
            current = word.to_string();
        }
    }

    if !current.is_empty() {
        lines.push(current);
    }

    if lines.is_empty() {
        lines.push(text.to_string());
    }

    lines
}

// ---- Word (DOCX) helper functions ----

struct InlineSegment {
    text: String,
    bold: bool,
    italic: bool,
}

fn parse_inline_segments(text: &str) -> Vec<InlineSegment> {
    let mut segments: Vec<InlineSegment> = Vec::new();
    let chars: Vec<char> = text.chars().collect();
    let len = chars.len();
    let mut i = 0;
    let mut current = String::new();
    let mut bold = false;
    let mut italic = false;

    while i < len {
        if chars[i] == '*' && i + 1 < len && chars[i + 1] == '*' {
            if !current.is_empty() {
                segments.push(InlineSegment {
                    text: std::mem::take(&mut current),
                    bold,
                    italic,
                });
            }
            bold = !bold;
            i += 2;
        } else if chars[i] == '*' {
            if !current.is_empty() {
                segments.push(InlineSegment {
                    text: std::mem::take(&mut current),
                    bold,
                    italic,
                });
            }
            italic = !italic;
            i += 1;
        } else if chars[i] == '`' {
            if !current.is_empty() {
                segments.push(InlineSegment {
                    text: std::mem::take(&mut current),
                    bold,
                    italic,
                });
            }
            i += 1;
            while i < len && chars[i] != '`' {
                current.push(chars[i]);
                i += 1;
            }
            if i < len {
                i += 1;
            }
        } else if chars[i] == '[' {
            if !current.is_empty() {
                segments.push(InlineSegment {
                    text: std::mem::take(&mut current),
                    bold,
                    italic,
                });
            }
            i += 1;
            while i < len && chars[i] != ']' {
                current.push(chars[i]);
                i += 1;
            }
            if i < len {
                i += 1;
            }
            if i < len && chars[i] == '(' {
                i += 1;
                while i < len && chars[i] != ')' {
                    i += 1;
                }
                if i < len {
                    i += 1;
                }
            }
        } else if chars[i] == '!' && i + 1 < len && chars[i + 1] == '[' {
            if !current.is_empty() {
                segments.push(InlineSegment {
                    text: std::mem::take(&mut current),
                    bold,
                    italic,
                });
            }
            i += 2;
            while i < len && chars[i] != ']' {
                current.push(chars[i]);
                i += 1;
            }
            if i < len {
                i += 1;
            }
            if i < len && chars[i] == '(' {
                i += 1;
                while i < len && chars[i] != ')' {
                    i += 1;
                }
                if i < len {
                    i += 1;
                }
            }
        } else {
            current.push(chars[i]);
            i += 1;
        }
    }

    if !current.is_empty() {
        segments.push(InlineSegment {
            text: current,
            bold,
            italic,
        });
    }

    segments
}

fn make_docx_paragraph(text: &str, size: usize, heading_bold: bool, _heading_italic: bool) -> Paragraph {
    let segments = parse_inline_segments(text);
    let mut para = Paragraph::new();

    if segments.is_empty() {
        // If there are no parsed segments (e.g., plain text without markers),
        // just add the text directly.
        para = para.add_run(Run::new().add_text(text).size(size));
        if heading_bold {
            para = para.bold();
        }
        return para;
    }

    for seg in segments {
        let mut run = Run::new().add_text(seg.text).size(size);
        if heading_bold || seg.bold {
            run = run.bold();
        }
        if seg.italic {
            run = run.italic();
        }
        para = para.add_run(run);
    }

    para
}

/// Returns each subdirectory of `app_data_dir/plugins/` that contains a
/// `manifest.json`. Skips half-installed folders so the JS loader does not
/// crash on corrupt plugin directories.
#[tauri::command]
async fn list_plugins(app: tauri::AppHandle) -> Result<Vec<String>, String> {
    let app_dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    let plugins_dir = app_dir.join("plugins");

    if !plugins_dir.exists() {
        return Ok(Vec::new());
    }

    let mut plugins: Vec<String> = Vec::new();
    for entry in fs::read_dir(&plugins_dir).map_err(|e| e.to_string())? {
        let entry = entry.map_err(|e| e.to_string())?;
        let path = entry.path();
        if path.is_dir() && path.join("manifest.json").exists() {
            plugins.push(path.to_string_lossy().to_string());
        }
    }
    Ok(plugins)
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
        let client = reqwest::Client::builder()
            .timeout(std::time::Duration::from_secs(5))
            .user_agent("Markhere/1.0")
            .build()
            .map_err(|e| e.to_string())?;

        let response = client
            .head(&url)
            .send()
            .await
            .map_err(|e| e.to_string())?;

        Ok(response.status().is_success())
    } else {
        Ok(true)
    }
}

#[tauri::command]
async fn get_git_history(file_path: String) -> Result<Vec<GitCommit>, String> {
    validate_path(&file_path)?;
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
    validate_path(&file_path)?;
    validate_git_ref(&old_hash)?;
    validate_git_ref(&new_hash)?;
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
    validate_path(&file_path)?;
    validate_git_ref(&hash)?;
    let output = Command::new("git")
        .args(["show", &format!("{}:{}", hash, file_path)])
        .output()
        .map_err(|e| e.to_string())?;

    if !output.status.success() {
        return Err("Git show command failed".to_string());
    }

    Ok(String::from_utf8_lossy(&output.stdout).to_string())
}

#[cfg(not(any(target_os = "android", target_os = "ios")))]
fn register_updater(builder: tauri::Builder<tauri::Wry>) -> tauri::Builder<tauri::Wry> {
    builder.plugin(tauri_plugin_updater::Builder::new().build())
}

pub fn run() {
    let builder = tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init());

    #[cfg(not(any(target_os = "android", target_os = "ios")))]
    let builder = register_updater(builder);

    builder
.setup(|app| {
            #[cfg(target_os = "macos")]
            {
                let file_submenu = SubmenuBuilder::new(app, "File")
                    .item(&MenuItem::with_id(app, "new", "New", true, Some("CmdOrControl+N"))?)
                    .item(&MenuItem::with_id(app, "open", "Open...", true, Some("CmdOrControl+O"))?)
                    .separator()
                    .item(&MenuItem::with_id(app, "save", "Save", true, Some("CmdOrControl+S"))?)
                    .item(&MenuItem::with_id(app, "save_as", "Save As...", true, Some("CmdOrControl+Shift+S"))?)
                    .separator()
                    .item(&PredefinedMenuItem::close_window(app, None)?)
                    .build()?;
                
                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .item(&PredefinedMenuItem::undo(app, None)?)
                    .item(&PredefinedMenuItem::redo(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::cut(app, None)?)
                    .item(&PredefinedMenuItem::copy(app, None)?)
                    .item(&PredefinedMenuItem::paste(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::select_all(app, None)?)
                    .build()?;
                
                let view_submenu = SubmenuBuilder::new(app, "View")
                    .item(&MenuItem::with_id(app, "toggle_sidebar", "Toggle Sidebar", true, Some("CmdOrControl+B"))?)
                    .item(&MenuItem::with_id(app, "focus_mode", "Focus Mode", true, Some("CmdOrControl+Shift+F"))?)
                    .separator()
                    .item(&PredefinedMenuItem::fullscreen(app, None)?)
                    .build()?;
                
                let window_submenu = SubmenuBuilder::new(app, "Window")
                    .item(&PredefinedMenuItem::minimize(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::close_window(app, None)?)
                    .build()?;
                
                let help_submenu = SubmenuBuilder::new(app, "Help")
                    .item(&MenuItem::with_id(app, "docs", "Documentation", true, None::<&str>)?)
                    .item(&MenuItem::with_id(app, "updates", "Check for Updates", true, None::<&str>)?)
                    .separator()
                    .item(&MenuItem::with_id(app, "about", "About Markhere", true, None::<&str>)?)
                    .build()?;
                
                let menu = MenuBuilder::new(app)
                    .item(&file_submenu)
                    .item(&edit_submenu)
                    .item(&view_submenu)
                    .item(&window_submenu)
                    .item(&help_submenu)
                    .build()?;
                
                menu.set_as_app_menu()?;
                
                let _window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("Markhere - Markdown Editor")
                    .inner_size(1200.0, 800.0)
                    .min_inner_size(800.0, 600.0)
                    .resizable(true)
                    .center()
                    .title_bar_style(TitleBarStyle::Transparent)
                    .build()
                    .expect("Failed to create window");
            }

            #[cfg(not(target_os = "macos"))]
            {
                let file_submenu = SubmenuBuilder::new(app, "File")
                    .item(&MenuItem::with_id(app, "new", "New", true, Some("Ctrl+N"))?)
                    .item(&MenuItem::with_id(app, "open", "Open...", true, Some("Ctrl+O"))?)
                    .separator()
                    .item(&MenuItem::with_id(app, "save", "Save", true, Some("Ctrl+S"))?)
                    .item(&MenuItem::with_id(app, "save_as", "Save As...", true, Some("Ctrl+Shift+S"))?)
                    .separator()
                    .item(&PredefinedMenuItem::close_window(app, None)?)
                    .build()?;
                
                let edit_submenu = SubmenuBuilder::new(app, "Edit")
                    .item(&PredefinedMenuItem::undo(app, None)?)
                    .item(&PredefinedMenuItem::redo(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::cut(app, None)?)
                    .item(&PredefinedMenuItem::copy(app, None)?)
                    .item(&PredefinedMenuItem::paste(app, None)?)
                    .separator()
                    .item(&PredefinedMenuItem::select_all(app, None)?)
                    .build()?;
                
                let view_submenu = SubmenuBuilder::new(app, "View")
                    .item(&MenuItem::with_id(app, "toggle_sidebar", "Toggle Sidebar", true, Some("Ctrl+B"))?)
                    .item(&MenuItem::with_id(app, "focus_mode", "Focus Mode", true, Some("Ctrl+Shift+F"))?)
                    .separator()
                    .item(&PredefinedMenuItem::fullscreen(app, None)?)
                    .build()?;
                
                let help_submenu = SubmenuBuilder::new(app, "Help")
                    .item(&MenuItem::with_id(app, "docs", "Documentation", true, None::<&str>)?)
                    .item(&MenuItem::with_id(app, "updates", "Check for Updates", true, None::<&str>)?)
                    .separator()
                    .item(&MenuItem::with_id(app, "about", "About Markhere", true, None::<&str>)?)
                    .build()?;
                
                let _menu = MenuBuilder::new(app)
                    .item(&file_submenu)
                    .item(&edit_submenu)
                    .item(&view_submenu)
                    .item(&help_submenu)
                    .build()?;

                let _window = WebviewWindowBuilder::new(app, "main", WebviewUrl::default())
                    .title("Markhere - Markdown Editor")
                    .inner_size(1200.0, 800.0)
                    .min_inner_size(800.0, 600.0)
                    .resizable(true)
                    .center()
                    .decorations(true)
                    .build()
                    .expect("Failed to create window");
            }

            Ok(())
        })
.on_menu_event(|app, event| {
            let id = event.id().as_ref();
            if let Err(e) = app.emit("menu-event", id) {
                eprintln!("Failed to emit menu event: {}", e);
            }
        })
        .invoke_handler(tauri::generate_handler![
            save_file,
            read_file,
            file_exists,
            extract_notion_zip,
            list_plugins,
            export_to_pdf,
            export_to_word,
            export_to_epub,
            save_image,
            validate_link,
            get_git_history,
            get_git_diff,
            get_file_at_commit,
            system_metrics::get_memory_usage,
            system_metrics::get_cpu_usage,
            file_operations::get_file_size,
            file_operations::read_file_chunk,
            file_operations::list_markdown_files,
            clipboard_rs::read_clipboard_image,
            data_recovery::create_backup,
            data_recovery::list_backups,
            data_recovery::restore_backup,
            file_watcher::watch_file,
            file_watcher::unwatch_file,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_markdown_to_html_headings() {
        let input = "# Title\n\n## Subtitle";
        let output = markdown_to_html(input);
        assert!(output.contains("<h1>Title</h1>"));
        assert!(output.contains("<h2>Subtitle</h2>"));
    }

    #[test]
    fn test_markdown_to_html_lists() {
        let input = "- Item 1\n- Item 2";
        let output = markdown_to_html(input);
        assert!(output.contains("<li>Item 1</li>"));
        assert!(output.contains("<li>Item 2</li>"));
    }

    #[test]
    fn test_markdown_to_html_paragraphs() {
        let input = "Hello\n\nWorld";
        let output = markdown_to_html(input);
        assert!(output.contains("<p>Hello</p>"));
        assert!(output.contains("<p>World</p>"));
    }

    #[test]
    fn test_markdown_to_html_empty() {
        let output = markdown_to_html("");
        assert!(output.is_empty());
    }

    #[test]
    fn test_markdown_to_html_bold() {
        let output = markdown_to_html("**bold**");
        assert!(output.contains("<strong>bold</strong>"));
    }

    #[test]
    fn test_markdown_to_html_italic() {
        let output = markdown_to_html("*italic*");
        assert!(output.contains("<em>italic</em>"));
    }

    #[test]
    fn test_markdown_to_html_code() {
        let output = markdown_to_html("`code`");
        assert!(output.contains("<code>code</code>"));
    }

    #[test]
    fn test_markdown_to_html_escape() {
        // pulldown-cmark passes inline HTML through by default
        // (this is standard Markdown behavior)
        let output = markdown_to_html("<div>hello</div>");
        assert!(output.contains("<div>hello</div>"));
    }

    #[test]
    fn test_markdown_to_html_table() {
        let input = "| A | B |\n|---|---|\n| 1 | 2 |";
        let output = markdown_to_html(input);
        assert!(output.contains("<table>"));
    }

    #[test]
    fn test_markdown_to_html_tasklist() {
        let input = "- [x] Done\n- [ ] Todo";
        let output = markdown_to_html(input);
        assert!(output.contains("checkbox"));
    }
}