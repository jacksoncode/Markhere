# Claude Code 优化改进方案

## 一、立即修复的问题（P0 优先级）

### 1. 修复 system_metrics.rs 性能问题

**问题**：每次调用 `System::new_all()` 会扫描所有进程，性能开销大。

**改进方案**：

```rust
// 在 src-tauri/src/system_metrics.rs 中使用单例 + 定期刷新策略

use sysinfo::{System, Pid};
use std::sync::{Mutex, Once};
use std::time::{Duration, Instant};

static mut SYSTEM: Option<Mutex<System>> = None;
static INIT: Once = Once::new();
static mut LAST_REFRESH: Option<Instant> = None;
const REFRESH_INTERVAL: Duration = Duration::from_secs(60);

fn get_system() -> &'static Mutex<System> {
    unsafe {
        INIT.call_once(|| {
            SYSTEM = Some(Mutex::new(System::new_all()));
            LAST_REFRESH = Some(Instant::now());
        });
        SYSTEM.as_ref().unwrap()
    }
}

fn refresh_if_needed() {
    unsafe {
        let now = Instant::now();
        if let Some(last) = LAST_REFRESH {
            if now.duration_since(last) > REFRESH_INTERVAL {
                let mut system = get_system().lock().unwrap();
                system.refresh_all();
                LAST_REFRESH = Some(now);
            }
        }
    }
}

#[tauri::command]
pub async fn get_memory_usage() -> Result<u64, String> {
    refresh_if_needed();
    let system = get_system().lock().unwrap();
    let pid = std::process::id();
    
    if let Some(process) = system.process(Pid::from_u32(pid)) {
        Ok(process.memory())
    } else {
        Err("Failed to get process info".to_string())
    }
}

#[tauri::command]
pub async fn get_cpu_usage() -> Result<f32, String> {
    let mut system = get_system().lock().unwrap();
    let pid = std::process::id();
    
    // 只在需要时刷新 CPU（需要两次采样）
    system.refresh_cpu();
    std::thread::sleep(std::time::Duration::from_millis(200));
    system.refresh_cpu();
    
    if let Some(process) = system.process(Pid::from_u32(pid)) {
        Ok(process.cpu_usage())
    } else {
        Err("Failed to get process info".to_string())
    }
}
```

### 2. 确保 IPC 命令正确注册

**文件**：[src-tauri/src/lib.rs](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/src-tauri/src/lib.rs)

需要在文件开头添加显式导入：

```rust
// 在 mod 声明后添加
pub use file_operations::*;
pub use system_metrics::*;
```

### 3. 验证 LargeFileService 集成

检查 [src/services/FileService.ts](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/src/services/FileService.ts) 是否使用了 LargeFileService。如果没有，需要：

```typescript
// 在 FileService.ts 中集成
export class FileService {
    static async openFile(): Promise<FileResult | null> {
        const { save } = await import('@tauri-apps/plugin-dialog');
        const filePath = await save({
            filters: [{ name: 'Markdown', extensions: ['md'] }],
        });
        
        if (!filePath) return null;
        
        // 使用 LargeFileService 而不是直接调用 read_file
        return LargeFileService.loadFile(filePath);
    }
}
```

---

## 二、中期优化（P1 优先级）

### 4. 改进导出实现

**文件**：[src-tauri/src/lib.rs](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/src-tauri/src/lib.rs) 第 67-116 行

**建议**：使用成熟的库替代手写实现

```toml
# 在 Cargo.toml 中添加
[dependencies]
pulldown-cmark = "0.9"  # 标准 Markdown 解析库
```

```rust
// 使用 pulldown-cmark 替代手写解析
use pulldown_cmark::{Parser, Options, html};

fn markdown_to_html(markdown: &str) -> String {
    let mut options = Options::empty();
    options.insert(Options::ENABLE_TABLES);
    options.insert(Options::ENABLE_FOOTNOTES);
    options.insert(Options::ENABLE_TASKLISTS);
    options.insert(Options::ENABLE_STRIKETHROUGH);
    
    let parser = Parser::new_ext(markdown, options);
    let mut html_output = String::new();
    html::push_html(&mut html_output, parser);
    
    html_output
}
```

### 5. 添加大文件虚拟滚动

**建议**：在 [src/components/Editor/MainEditor.tsx](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/src/components/Editor/MainEditor.tsx) 中：

```typescript
// 配置 Tiptap 的 NodeSize 插件
import { NodeSize } from '@tiptap/extension-node-size';

const editor = useEditor({
    extensions: [
        NodeSize.configure({
            types: ['paragraph', 'heading', 'codeBlock'],
            minSize: 40,
        }),
        // 其他扩展...
    ],
});
```

### 6. 完善监控分层

创建独立的监控模块：

```typescript
// src/services/MonitoringService.ts
export class MonitoringService {
    static init() {
        // 初始化 Sentry（已存在）
        // 初始化 Web Vitals（已存在）
        // 分离业务指标
    }
    
    static trackBusinessMetric(name: string, value: number) {
        // 业务指标单独处理，不与 Web Vitals 混在一起
    }
}
```

---

## 三、长期改进（P2 优先级）

### 7. 改进依赖管理

**步骤**：
1. 在 CI 中添加 `npm audit` 检查
2. 使用 Dependabot 自动更新依赖
3. 添加 React 19 兼容性验证脚本

### 8. 完善测试覆盖

**建议**：
1. 添加 E2E 性能测试
2. 添加跨平台测试（Windows/Linux/macOS）
3. 集成测试覆盖率报告

### 9. 优化时间估算

**建议**：为 NEXT_STEPS.md 中的任务添加风险缓冲：
- P0-2: 大文件优化 1.5 天 → 3 天（包含前端集成 + 测试）
- P1-4: Mermaid 优化 2.5 天 → 4 天（包含 Web Worker + 缓存实现）

---

## 四、总结

| 优先级 | 任务 | 预计工作量 |
|--------|------|------------|
| P0 | 修复 system_metrics.rs 性能 | 0.5 天 |
| P0 | 修复 IPC 命令注册 | 0.1 天 |
| P0 | 验证 LargeFileService 集成 | 0.2 天 |
| P1 | 改进导出实现 | 1.5 天 |
| P1 | 添加虚拟滚动 | 1 天 |
| P1 | 完善监控分层 | 0.5 天 |
| P2 | 依赖管理改进 | 0.5 天 |
| P2 | 测试覆盖完善 | 2 天 |
| P2 | 时间估算优化 | 0.1 天 |

**总工作量**：约 6.3 天（不含测试）

---

## 相关文件

- [NEXT_STEPS.md](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/NEXT_STEPS.md) - 原有的开发路线图
- [ARCHITECTURE.md](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/ARCHITECTURE.md) - 架构文档
- [CHANGELOG.md](file:///Users/pengzhang/Downloads/同步空间/Coder/opencode/Markhere/CHANGELOG.md) - 变更日志
