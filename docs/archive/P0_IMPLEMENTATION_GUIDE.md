# 🚨 P0 高优先级问题实施指南

**日期**: 2026-06-06  
**版本**: v0.5.0-dev  
**状态**: 📝 实施中

---

## 📋 任务概览

本指南提供 P0（高优先级）问题的详细实施步骤，包括：

1. **Windows 平台持续监控增强** - 确保 v0.4.9 修复的稳定性
2. **大文件（>5MB）性能优化** - 解决加载卡顿问题

---

## 🔴 任务 1: Windows 平台监控增强

### 背景
v0.4.9 已修复 Windows 菜单崩溃问题，现在需要建立监控机制防止回归。

### 实施步骤

#### Step 1: 创建 Windows 监控服务

```bash
# 创建文件
touch src/services/windowsMonitoring.ts
```

```typescript
// src/services/windowsMonitoring.ts
import * as Sentry from '@sentry/react';
import { invoke } from '@tauri-apps/api/core';

interface WindowsMetrics {
  startupTime: number;
  memoryUsage: number;
  cpuUsage: number;
  crashCount: number;
}

export class WindowsMonitoring {
  private static metrics: WindowsMetrics = {
    startupTime: 0,
    memoryUsage: 0,
    cpuUsage: 0,
    crashCount: 0,
  };

  static init() {
    if (!this.isWindows()) return;

    console.log('🪟 Windows monitoring initialized');

    // 追踪启动时间
    this.trackStartupTime();

    // 监控窗口事件
    this.monitorWindowEvents();

    // 监控系统资源
    this.monitorSystemResources();

    // 定期上报
    this.startPeriodicReporting();
  }

  private static isWindows(): boolean {
    return navigator.userAgent.includes('Windows');
  }

  private static trackStartupTime() {
    const startTime = performance.now();

    window.addEventListener('load', () => {
      this.metrics.startupTime = performance.now() - startTime;

      Sentry.addBreadcrumb({
        category: 'startup',
        message: `Windows app started in ${this.metrics.startupTime.toFixed(0)}ms`,
        level: this.metrics.startupTime > 2000 ? 'warning' : 'info',
      });

      // 目标：< 1500ms
      if (this.metrics.startupTime > 2000) {
        Sentry.captureMessage('Slow startup on Windows', 'warning');
      }
    });
  }

  private static monitorWindowEvents() {
    const events = [
      'focus',
      'blur',
      'resize',
      'beforeunload',
    ];

    events.forEach(eventName => {
      window.addEventListener(eventName, () => {
        Sentry.addBreadcrumb({
          category: 'window',
          message: `Window ${eventName}`,
          level: 'info',
        });
      });
    });

    // 监控未捕获的异常
    window.addEventListener('error', (event) => {
      this.metrics.crashCount++;

      Sentry.captureException(event.error, {
        tags: {
          platform: 'windows',
          event_type: 'unhandled_error',
        },
        contexts: {
          metrics: this.metrics,
        },
      });
    });
  }

  private static async monitorSystemResources() {
    setInterval(async () => {
      try {
        // 调用 Tauri 命令获取系统信息
        const memory = await invoke<number>('get_memory_usage');
        const cpu = await invoke<number>('get_cpu_usage');

        this.metrics.memoryUsage = memory;
        this.metrics.cpuUsage = cpu;

        // 内存告警：> 500MB
        if (memory > 500 * 1024 * 1024) {
          Sentry.captureMessage(`High memory usage: ${(memory / 1024 / 1024).toFixed(0)}MB`, 'warning');
        }

        // CPU 告警：空闲时 > 10%
        if (cpu > 10 && document.hidden) {
          Sentry.captureMessage(`High CPU usage while idle: ${cpu.toFixed(1)}%`, 'warning');
        }
      } catch (error) {
        console.warn('Failed to get system metrics:', error);
      }
    }, 30000); // 每 30 秒
  }

  private static startPeriodicReporting() {
    setInterval(() => {
      Sentry.addBreadcrumb({
        category: 'metrics',
        message: 'Windows metrics snapshot',
        level: 'info',
        data: this.metrics,
      });
    }, 5 * 60 * 1000); // 每 5 分钟
  }

  static getMetrics(): WindowsMetrics {
    return { ...this.metrics };
  }
}
```

#### Step 2: 添加 Rust 后端支持

```rust
// src-tauri/src/system_metrics.rs

use sysinfo::{System, SystemExt, ProcessExt};

#[tauri::command]
pub async fn get_memory_usage() -> Result<u64, String> {
    let mut system = System::new_all();
    system.refresh_all();
    
    let pid = std::process::id();
    
    if let Some(process) = system.process(sysinfo::Pid::from_u32(pid)) {
        Ok(process.memory())
    } else {
        Err("Failed to get process info".to_string())
    }
}

#[tauri::command]
pub async fn get_cpu_usage() -> Result<f32, String> {
    let mut system = System::new_all();
    
    // 需要两次采样计算 CPU
    system.refresh_cpu();
    std::thread::sleep(std::time::Duration::from_millis(200));
    system.refresh_cpu();
    
    let pid = std::process::id();
    
    if let Some(process) = system.process(sysinfo::Pid::from_u32(pid)) {
        Ok(process.cpu_usage())
    } else {
        Err("Failed to get process info".to_string())
    }
}
```

```rust
// src-tauri/src/lib.rs
mod system_metrics;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            // ... existing handlers
            system_metrics::get_memory_usage,
            system_metrics::get_cpu_usage,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
```

```toml
# src-tauri/Cargo.toml
[dependencies]
sysinfo = "0.30"
```

#### Step 3: 集成到应用启动

```typescript
// src/main.tsx
import { WindowsMonitoring } from './services/windowsMonitoring';

// 在 Sentry.init() 之后
if (import.meta.env.PROD) {
  WindowsMonitoring.init();
}
```

#### Step 4: 添加 E2E 测试

```typescript
// e2e/windows-stability.spec.ts
import { test, expect, _electron as electron } from '@playwright/test';

test.describe('Windows Stability Tests', () => {
  test('should start without crashing', async () => {
    const app = await electron.launch({
      args: ['dist-tauri/markhere.exe'],
    });

    const window = await app.firstWindow();
    await expect(window).toBeTruthy();

    // 等待完全加载
    await window.waitForLoadState('domcontentloaded');
    await window.waitForTimeout(2000);

    // 检查没有错误
    const hasError = await window.evaluate(() => {
      return document.body.textContent?.includes('error') || false;
    });

    expect(hasError).toBeFalsy();

    await app.close();
  });

  test('should handle rapid window operations', async () => {
    const app = await electron.launch({
      args: ['dist-tauri/markhere.exe'],
    });

    const window = await app.firstWindow();

    // 快速最小化/恢复
    for (let i = 0; i < 10; i++) {
      await window.evaluate(() => {
        (window as any).__TAURI__.window.getCurrent().minimize();
      });
      await window.waitForTimeout(100);
      await window.evaluate(() => {
        (window as any).__TAURI__.window.getCurrent().unminimize();
      });
      await window.waitForTimeout(100);
    }

    // 应该仍然响应
    const isVisible = await window.isVisible();
    expect(isVisible).toBeTruthy();

    await app.close();
  });

  test('should measure startup time', async () => {
    const startTime = Date.now();

    const app = await electron.launch({
      args: ['dist-tauri/markhere.exe'],
    });

    const window = await app.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const startupTime = Date.now() - startTime;

    console.log(`✅ Startup time: ${startupTime}ms`);

    // 目标: < 2000ms
    expect(startupTime).toBeLessThan(2000);

    await app.close();
  });
});
```

---

## 🔴 任务 2: 大文件性能优化

### 背景
当前大文件（>5MB）加载会导致 UI 卡顿，需要实现分块加载和虚拟滚动。

### 实施步骤

#### Step 1: 创建大文件服务

```typescript
// src/services/LargeFileService.ts
import { invoke } from '@tauri-apps/api/core';
import { FileResult } from './FileService';
import { useUIState } from '../store/uiStore';

export class LargeFileService {
  private static readonly CHUNK_SIZE = 1024 * 1024; // 1MB
  private static readonly LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB

  static async loadFile(path: string): Promise<FileResult | null> {
    try {
      // 1. 获取文件大小
      const fileSize = await this.getFileSize(path);

      console.log(`📄 Loading file: ${path} (${this.formatFileSize(fileSize)})`);

      // 2. 判断是否为大文件
      if (fileSize < this.LARGE_FILE_THRESHOLD) {
        // 小文件：直接加载
        return this.loadSmallFile(path);
      }

      // 3. 大文件：分块加载
      return this.loadLargeFile(path, fileSize);
    } catch (error) {
      console.error('Failed to load file:', error);
      useUIState.getState().showError(`Failed to load file: ${error}`);
      return null;
    }
  }

  private static async getFileSize(path: string): Promise<number> {
    return invoke<number>('get_file_size', { path });
  }

  private static async loadSmallFile(path: string): Promise<FileResult> {
    const content = await invoke<string>('read_file', { path });
    return { path, content };
  }

  private static async loadLargeFile(
    path: string,
    fileSize: number
  ): Promise<FileResult> {
    const startTime = performance.now();

    // 显示加载进度
    useUIState.getState().setLoadingMessage('Loading large file...');
    useUIState.getState().setLoadingProgress(0);

    const chunks: string[] = [];
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);

    console.log(`📦 Loading in ${totalChunks} chunks...`);

    for (let i = 0; i < totalChunks; i++) {
      const offset = i * this.CHUNK_SIZE;

      // 读取分块
      const chunk = await invoke<string>('read_file_chunk', {
        path,
        offset,
        length: this.CHUNK_SIZE,
      });

      chunks.push(chunk);

      // 更新进度
      const progress = ((i + 1) / totalChunks) * 100;
      useUIState.getState().setLoadingProgress(progress);

      // 让出主线程，避免阻塞 UI
      if (i % 5 === 0) {
        await new Promise(resolve => setTimeout(resolve, 0));
      }
    }

    // 合并内容
    const content = chunks.join('');

    const loadTime = performance.now() - startTime;
    console.log(`✅ Loaded ${this.formatFileSize(fileSize)} in ${loadTime.toFixed(0)}ms`);

    // 清除进度
    useUIState.getState().setLoadingProgress(100);
    useUIState.getState().setLoadingMessage('');

    // 性能追踪
    if (loadTime > 5000) {
      console.warn(`⚠️ Slow file load: ${loadTime}ms for ${fileSize} bytes`);
    }

    return { path, content };
  }

  private static formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
    return `${(bytes / 1024 / 1024).toFixed(1)} MB`;
  }
}
```

#### Step 2: 添加 Rust 分块读取

```rust
// src-tauri/src/file_operations.rs

use std::fs::File;
use std::io::{Read, Seek, SeekFrom};

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
    
    // 定位到偏移位置
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| format!("Failed to seek: {}", e))?;
    
    // 读取指定长度
    let mut buffer = vec![0u8; length];
    let bytes_read = file.read(&mut buffer)
        .map_err(|e| format!("Failed to read: {}", e))?;
    
    // 截断到实际读取的长度
    buffer.truncate(bytes_read);
    
    // 转换为 UTF-8 字符串
    String::from_utf8(buffer)
        .map_err(|e| format!("Invalid UTF-8: {}", e))
}
```

```rust
// src-tauri/src/lib.rs
mod file_operations;

.invoke_handler(tauri::generate_handler![
    // ... existing
    file_operations::get_file_size,
    file_operations::read_file_chunk,
])
```

#### Step 3: 更新 UI Store

```typescript
// src/store/uiStore.ts
interface UIState {
  // ... existing
  loadingMessage: string;
  loadingProgress: number;
  setLoadingMessage: (message: string) => void;
  setLoadingProgress: (progress: number) => void;
}

export const useUIState = create<UIState>((set) => ({
  // ... existing
  loadingMessage: '',
  loadingProgress: 0,
  
  setLoadingMessage: (message) => set({ loadingMessage: message }),
  setLoadingProgress: (progress) => set({ loadingProgress: progress }),
}));
```

#### Step 4: 创建加载进度组件

```typescript
// src/components/LoadingProgress/LargeFileLoader.tsx
import { useUIState } from '../../store/uiStore';
import './LargeFileLoader.css';

export function LargeFileLoader() {
  const { loadingMessage, loadingProgress } = useUIState();

  if (!loadingMessage) return null;

  return (
    <div className="large-file-loader-overlay">
      <div className="large-file-loader">
        <div className="loader-icon">📄</div>
        <h3>{loadingMessage}</h3>
        
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${loadingProgress}%` }}
          />
        </div>
        
        <p className="progress-text">
          {Math.round(loadingProgress)}% complete
        </p>
        
        <small className="progress-hint">
          This may take a moment for very large files
        </small>
      </div>
    </div>
  );
}
```

```css
/* src/components/LoadingProgress/LargeFileLoader.css */
.large-file-loader-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}

.large-file-loader {
  background: var(--bg-primary);
  border-radius: 12px;
  padding: 32px;
  min-width: 320px;
  text-align: center;
  box-shadow: 0 8px 24px rgba(0, 0, 0, 0.3);
}

.loader-icon {
  font-size: 48px;
  margin-bottom: 16px;
  animation: pulse 1.5s ease-in-out infinite;
}

@keyframes pulse {
  0%, 100% { transform: scale(1); opacity: 1; }
  50% { transform: scale(1.1); opacity: 0.8; }
}

.progress-bar {
  height: 8px;
  background: var(--bg-tertiary);
  border-radius: 4px;
  overflow: hidden;
  margin: 16px 0;
}

.progress-fill {
  height: 100%;
  background: var(--color-primary);
  transition: width 0.3s ease;
  border-radius: 4px;
}

.progress-text {
  font-size: 14px;
  font-weight: 600;
  color: var(--text-primary);
  margin: 8px 0;
}

.progress-hint {
  font-size: 12px;
  color: var(--text-secondary);
}
```

#### Step 5: 集成到主编辑器

```typescript
// src/App.tsx
import { LargeFileLoader } from './components/LoadingProgress/LargeFileLoader';

export function App() {
  return (
    <div className="app">
      {/* ... existing components */}
      <LargeFileLoader />
    </div>
  );
}
```

```typescript
// src/store/fileStore.ts
import { LargeFileService } from '../services/LargeFileService';

export const useFileStore = create<FileState>((set, get) => ({
  // ... existing
  
  openFile: async () => {
    const result = await LargeFileService.loadFile(path);
    if (result) {
      set({
        currentPath: result.path,
        currentContent: result.content,
      });
    }
  },
}));
```

#### Step 6: 性能测试

```typescript
// e2e/large-file-performance.spec.ts
import { test, expect } from '@playwright/test';
import * as fs from 'fs';
import * as path from 'path';

test.describe('Large File Performance', () => {
  const testFile = path.join(__dirname, 'fixtures', 'large-test.md');

  test.beforeAll(() => {
    // 生成 10MB 测试文件
    const content = '# Test\n\n' + 'Lorem ipsum '.repeat(500000);
    fs.writeFileSync(testFile, content);
  });

  test.afterAll(() => {
    fs.unlinkSync(testFile);
  });

  test('should load 10MB file in under 5 seconds', async ({ page }) => {
    const startTime = Date.now();

    // 打开文件
    await page.click('[data-testid="open-file"]');
    await page.setInputFiles('input[type="file"]', testFile);

    // 等待加载完成
    await page.waitForSelector('.editor-content', { timeout: 10000 });

    const loadTime = Date.now() - startTime;

    console.log(`✅ Loaded 10MB file in ${loadTime}ms`);

    // 断言：< 5000ms
    expect(loadTime).toBeLessThan(5000);
  });

  test('should show progress for large files', async ({ page }) => {
    await page.click('[data-testid="open-file"]');
    await page.setInputFiles('input[type="file"]', testFile);

    // 应该显示进度条
    const progressBar = await page.waitForSelector('.progress-bar', {
      timeout: 1000,
    });

    expect(progressBar).toBeTruthy();

    // 等待完成
    await page.waitForSelector('.editor-content', { timeout: 10000 });
  });
});
```

---

## ✅ 验收清单

### Windows 监控
- [ ] Sentry 收到 Windows 启动事件
- [ ] 内存/CPU 指标正常上报
- [ ] E2E 测试通过（启动稳定性）
- [ ] 启动时间 < 1.5s

### 大文件优化
- [ ] 5MB 文件加载 < 2s
- [ ] 10MB 文件加载 < 4s
- [ ] 显示加载进度
- [ ] 不阻塞 UI
- [ ] E2E 测试通过

---

## 📊 性能基准

运行基准测试：

```bash
# Windows 监控
npm run test:e2e -- windows-stability

# 大文件性能
npm run test:e2e -- large-file-performance
```

预期结果：
```
✅ Windows startup: 1247ms
✅ Memory usage: 156MB
✅ CPU idle: 2.3%
✅ Load 5MB file: 1823ms
✅ Load 10MB file: 3654ms
✅ Load 50MB file: 9871ms
```

---

## 🚀 部署检查

```bash
# 1. 安装新依赖
npm install
cd src-tauri && cargo build

# 2. 运行测试
npm run test
npm run test:e2e

# 3. 构建
npm run tauri:build

# 4. 手动测试
# - Windows 10/11 测试启动
# - 加载大文件（5MB, 10MB, 50MB）
# - 检查 Sentry 数据

# 5. 版本号更新
npm version minor  # v0.4.9 -> v0.5.0
```

---

**实施负责人**: 待分配  
**预计完成**: 2026-06-15  
**文档版本**: 1.0
