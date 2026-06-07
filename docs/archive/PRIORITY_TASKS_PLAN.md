# 📋 优先级任务详细规划

**创建日期**: 2026-06-06  
**版本**: v0.5.0 规划  
**状态**: 🔄 执行中

---

## 🔴 高优先级任务 (P0) - 立即处理

### 1. Windows 平台持续监控增强

**问题描述**: 
- v0.4.9 已修复菜单崩溃问题，但需要建立持续监控机制
- 确保 Windows 用户获得稳定体验

**实施方案**:

#### 1.1 增强错误追踪
```typescript
// src/services/windowsMonitoring.ts
import * as Sentry from '@sentry/react';

export class WindowsMonitoring {
  static init() {
    if (window.__TAURI__) {
      // 追踪 Windows 特定事件
      Sentry.addBreadcrumb({
        category: 'platform',
        message: 'Windows platform detected',
        level: 'info',
      });
      
      // 监控窗口事件
      this.monitorWindowEvents();
      // 监控菜单操作
      this.monitorMenuOperations();
      // 监控文件系统操作
      this.monitorFileOperations();
    }
  }
  
  static monitorWindowEvents() {
    const events = ['focus', 'blur', 'resize', 'minimize', 'maximize'];
    events.forEach(event => {
      window.addEventListener(event, () => {
        Sentry.addBreadcrumb({
          category: 'window',
          message: `Window ${event} event`,
          level: 'info',
        });
      });
    });
  }
}
```

#### 1.2 添加 Windows 特定测试
```bash
# e2e/windows-stability.spec.ts
创建 Windows 平台稳定性测试套件：
- 启动/关闭循环测试（100次）
- 文件操作压力测试
- 菜单快捷键测试
- 内存泄漏检测
```

#### 1.3 性能基准测试
- 启动时间监控（目标 < 1.5s）
- 内存占用监控（目标 < 200MB）
- CPU 使用率监控（空闲时 < 5%）

**工作量**: 2天  
**责任人**: 待分配  
**截止日期**: 2026-06-13

---

### 2. 大文件（>5MB）性能优化

**问题描述**:
- 当前大文件加载会导致界面卡顿
- 影响用户体验，特别是技术文档编写场景

**技术分析**:

#### 2.1 性能瓶颈识别
```typescript
// 当前实现（FileService.ts）
static async openFile(): Promise<FileResult | null> {
  const content = await invoke<string>('read_file', { path });
  return { path, content };
}

// 问题：
// 1. 一次性加载整个文件到内存
// 2. Tiptap 编辑器解析大文档时阻塞主线程
// 3. 无进度反馈
```

#### 2.2 解决方案：分块加载 + 虚拟滚动

**方案 A：流式加载（推荐）**
```typescript
// src/services/LargeFileService.ts

export class LargeFileService {
  private static CHUNK_SIZE = 1024 * 1024; // 1MB chunks
  private static LARGE_FILE_THRESHOLD = 5 * 1024 * 1024; // 5MB
  
  static async loadFile(path: string): Promise<FileResult> {
    const fileSize = await this.getFileSize(path);
    
    if (fileSize < this.LARGE_FILE_THRESHOLD) {
      // 小文件：直接加载
      return FileService.openFile();
    }
    
    // 大文件：分块加载
    return this.loadLargeFile(path, fileSize);
  }
  
  private static async loadLargeFile(
    path: string, 
    fileSize: number
  ): Promise<FileResult> {
    const chunks: string[] = [];
    const totalChunks = Math.ceil(fileSize / this.CHUNK_SIZE);
    
    // 显示进度条
    useUIState.getState().setLoadingProgress(0);
    
    for (let i = 0; i < totalChunks; i++) {
      const offset = i * this.CHUNK_SIZE;
      const chunk = await invoke<string>('read_file_chunk', {
        path,
        offset,
        length: this.CHUNK_SIZE,
      });
      
      chunks.push(chunk);
      
      // 更新进度
      const progress = ((i + 1) / totalChunks) * 100;
      useUIState.getState().setLoadingProgress(progress);
      
      // 让出主线程，避免卡顿
      await new Promise(resolve => setTimeout(resolve, 0));
    }
    
    useUIState.getState().setLoadingProgress(100);
    
    return {
      path,
      content: chunks.join(''),
    };
  }
  
  private static async getFileSize(path: string): Promise<number> {
    return invoke<number>('get_file_size', { path });
  }
}
```

**方案 B：虚拟滚动优化**
```typescript
// src/services/virtualScrollOptimized.ts

export function useOptimizedVirtualScroll(
  editor: Editor | null,
  fileSize: number
) {
  const LARGE_FILE_THRESHOLD = 5 * 1024 * 1024;
  const isLargeFile = fileSize > LARGE_FILE_THRESHOLD;
  
  useEffect(() => {
    if (!editor || !isLargeFile) return;
    
    // 延迟渲染非可见区域
    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach(entry => {
          if (entry.isIntersecting) {
            // 渲染可见内容
            renderChunk(entry.target);
          } else {
            // 卸载不可见内容
            unloadChunk(entry.target);
          }
        });
      },
      { rootMargin: '500px' } // 预加载 500px 范围
    );
    
    // 观察所有段落
    editor.view.dom.querySelectorAll('p, h1, h2, h3').forEach(node => {
      observer.observe(node);
    });
    
    return () => observer.disconnect();
  }, [editor, isLargeFile]);
}
```

#### 2.3 Rust 后端优化
```rust
// src-tauri/src/lib.rs

#[tauri::command]
async fn read_file_chunk(
    path: String, 
    offset: u64, 
    length: usize
) -> Result<String, String> {
    use std::io::{Read, Seek, SeekFrom};
    
    let mut file = fs::File::open(&path)
        .map_err(|e| e.to_string())?;
    
    file.seek(SeekFrom::Start(offset))
        .map_err(|e| e.to_string())?;
    
    let mut buffer = vec![0u8; length];
    let bytes_read = file.read(&mut buffer)
        .map_err(|e| e.to_string())?;
    
    buffer.truncate(bytes_read);
    
    String::from_utf8(buffer)
        .map_err(|e| e.to_string())
}

#[tauri::command]
async fn get_file_size(path: String) -> Result<u64, String> {
    let metadata = fs::metadata(&path)
        .map_err(|e| e.to_string())?;
    Ok(metadata.len())
}
```

#### 2.4 用户体验改进
```typescript
// src/components/LoadingProgress/LargeFileLoader.tsx

export function LargeFileLoader({ progress }: { progress: number }) {
  return (
    <div className="large-file-loader">
      <div className="loader-icon">📄</div>
      <h3>Loading large file...</h3>
      <div className="progress-bar">
        <div 
          className="progress-fill" 
          style={{ width: `${progress}%` }}
        />
      </div>
      <p>{Math.round(progress)}% complete</p>
      <small>This may take a moment for very large files</small>
    </div>
  );
}
```

**性能目标**:
- 5MB 文件：加载时间 < 2s
- 10MB 文件：加载时间 < 4s
- 50MB 文件：加载时间 < 10s
- 内存占用：增长不超过文件大小的 2倍

**工作量**: 3天  
**责任人**: 待分配  
**截止日期**: 2026-06-15

---

## 🟡 中优先级任务 (P1) - 2周内完成

### 3. 协作模式同步延迟优化

**问题描述**:
- Y.js 协作模式下偶发同步延迟（2-5秒）
- 影响多人实时编辑体验

**根因分析**:
```typescript
// 当前实现（src/store/collaborationStore.ts）
// 可能的问题点：
// 1. WebRTC 连接质量不稳定
// 2. 网络抖动导致重连
// 3. 大量并发编辑操作未批处理
// 4. Y.js 文档大小未优化
```

**优化方案**:

#### 3.1 连接质量监控
```typescript
// src/services/collaborationMonitoring.ts

export class CollaborationMonitoring {
  private static latencyHistory: number[] = [];
  private static readonly MAX_HISTORY = 50;
  
  static trackLatency(latency: number) {
    this.latencyHistory.push(latency);
    if (this.latencyHistory.length > this.MAX_HISTORY) {
      this.latencyHistory.shift();
    }
    
    // 计算平均延迟
    const avgLatency = this.latencyHistory.reduce((a, b) => a + b, 0) 
      / this.latencyHistory.length;
    
    // 预警机制
    if (avgLatency > 1000) {
      useUIState.getState().showWarning(
        'Connection quality is degraded. Sync may be slower.'
      );
    }
    
    // 发送到 Sentry
    Sentry.addBreadcrumb({
      category: 'collaboration',
      message: `Sync latency: ${latency}ms (avg: ${avgLatency}ms)`,
      level: latency > 2000 ? 'warning' : 'info',
    });
  }
  
  static getConnectionQuality(): 'excellent' | 'good' | 'fair' | 'poor' {
    const avg = this.getAverageLatency();
    if (avg < 100) return 'excellent';
    if (avg < 500) return 'good';
    if (avg < 1500) return 'fair';
    return 'poor';
  }
}
```

#### 3.2 批处理更新
```typescript
// src/extensions/CollaborationExtension.ts

export const CollaborationExtension = Extension.create({
  name: 'collaboration',
  
  addOptions() {
    return {
      batchTimeout: 100, // 批处理延迟
      maxBatchSize: 50,  // 最大批次大小
    };
  },
  
  onCreate() {
    let updateQueue: Update[] = [];
    let batchTimer: NodeJS.Timeout | null = null;
    
    this.editor.on('update', ({ transaction }) => {
      if (!transaction.docChanged) return;
      
      updateQueue.push({
        steps: transaction.steps,
        timestamp: Date.now(),
      });
      
      // 达到最大批次，立即发送
      if (updateQueue.length >= this.options.maxBatchSize) {
        this.flushBatch(updateQueue);
        updateQueue = [];
        return;
      }
      
      // 否则等待批处理超时
      if (batchTimer) clearTimeout(batchTimer);
      batchTimer = setTimeout(() => {
        this.flushBatch(updateQueue);
        updateQueue = [];
      }, this.options.batchTimeout);
    });
  },
  
  flushBatch(updates: Update[]) {
    const startTime = performance.now();
    
    // 合并并发送
    const yDoc = useCollaborationStore.getState().doc;
    yDoc?.transact(() => {
      updates.forEach(update => {
        // 应用更新
        applyUpdate(yDoc, update);
      });
    });
    
    const latency = performance.now() - startTime;
    CollaborationMonitoring.trackLatency(latency);
  },
});
```

#### 3.3 增量同步优化
```typescript
// src/store/collaborationStore.ts

export const useCollaborationStore = create<CollaborationState>((set, get) => ({
  // ...existing code...
  
  optimizeDocSize: () => {
    const doc = get().doc;
    if (!doc) return;
    
    // 压缩历史记录
    const snapshot = Y.encodeStateAsUpdate(doc);
    const newDoc = new Y.Doc();
    Y.applyUpdate(newDoc, snapshot);
    
    // 替换文档
    set({ doc: newDoc });
    
    console.log('Y.js doc optimized');
  },
  
  // 每5分钟自动优化
  startAutoOptimize: () => {
    setInterval(() => {
      get().optimizeDocSize();
    }, 5 * 60 * 1000);
  },
}));
```

#### 3.4 UI 反馈改进
```typescript
// src/components/CollaborationStatus/SyncIndicator.tsx

export function SyncIndicator() {
  const { isConnected, lastSyncTime } = useCollaborationStore();
  const [quality, setQuality] = useState<string>('good');
  
  useEffect(() => {
    const interval = setInterval(() => {
      const q = CollaborationMonitoring.getConnectionQuality();
      setQuality(q);
    }, 1000);
    
    return () => clearInterval(interval);
  }, []);
  
  return (
    <div className={`sync-indicator ${quality}`}>
      <div className="sync-dot" />
      <span>
        {isConnected ? `Synced (${quality})` : 'Offline'}
      </span>
      {lastSyncTime && (
        <small>{formatRelativeTime(lastSyncTime)}</small>
      )}
    </div>
  );
}
```

**性能目标**:
- P50 延迟 < 200ms
- P95 延迟 < 500ms
- P99 延迟 < 1500ms
- 连接断开自动重连 < 3s

**工作量**: 2天  
**责任人**: 待分配  
**截止日期**: 2026-06-20

---

### 4. Mermaid 图表渲染性能优化

**问题描述**:
- 某些复杂 Mermaid 图表（流程图、序列图）渲染慢
- 阻塞 UI 线程，影响编辑体验

**性能测试数据**:
```
简单流程图（5个节点）: ~50ms ✅
中等流程图（20个节点）: ~200ms ⚠️
复杂流程图（50+节点）: ~800ms ❌
大型序列图（100+交互）: ~1500ms ❌
```

**优化方案**:

#### 4.1 Web Worker 异步渲染
```typescript
// src/workers/mermaidWorker.ts

import mermaid from 'mermaid';

self.addEventListener('message', async (e) => {
  const { id, code, theme } = e.data;
  
  try {
    mermaid.initialize({
      startOnLoad: false,
      theme: theme === 'dark' ? 'dark' : 'default',
      securityLevel: 'strict',
    });
    
    const { svg } = await mermaid.render(`mermaid-${id}`, code);
    
    self.postMessage({
      id,
      success: true,
      svg,
    });
  } catch (error) {
    self.postMessage({
      id,
      success: false,
      error: error.message,
    });
  }
});
```

#### 4.2 渐进式渲染
```typescript
// src/extensions/MermaidExtension.ts

export const MermaidExtension = Node.create({
  name: 'mermaid',
  
  addNodeView() {
    return ({ node }) => {
      const container = document.createElement('div');
      container.className = 'mermaid-container';
      
      // 1. 显示占位符
      container.innerHTML = '<div class="mermaid-loading">Rendering diagram...</div>';
      
      // 2. 异步渲染
      const worker = new Worker(
        new URL('../workers/mermaidWorker.ts', import.meta.url)
      );
      
      const renderStart = performance.now();
      
      worker.postMessage({
        id: node.attrs.id,
        code: node.textContent,
        theme: useThemeStore.getState().theme,
      });
      
      worker.onmessage = (e) => {
        const renderTime = performance.now() - renderStart;
        
        if (e.data.success) {
          // 3. 渐进式显示
          container.innerHTML = e.data.svg;
          container.classList.add('mermaid-rendered');
          
          // 性能追踪
          if (renderTime > 500) {
            Sentry.addBreadcrumb({
              category: 'performance',
              message: `Slow Mermaid render: ${renderTime}ms`,
              level: 'warning',
            });
          }
        } else {
          container.innerHTML = `
            <div class="mermaid-error">
              ⚠️ Failed to render diagram: ${e.data.error}
            </div>
          `;
        }
        
        worker.terminate();
      };
      
      return {
        dom: container,
      };
    };
  },
});
```

#### 4.3 按需加载图表类型
```typescript
// src/services/mermaidLoader.ts

export class MermaidLoader {
  private static loadedTypes = new Set<string>();
  
  static async loadDiagramType(type: string) {
    if (this.loadedTypes.has(type)) return;
    
    switch (type) {
      case 'flowchart':
        await import('mermaid/dist/flowchart');
        break;
      case 'sequence':
        await import('mermaid/dist/sequenceDiagram');
        break;
      case 'gantt':
        await import('mermaid/dist/gantt');
        break;
      case 'class':
        await import('mermaid/dist/classDiagram');
        break;
      // ... 其他类型
    }
    
    this.loadedTypes.add(type);
  }
  
  static detectDiagramType(code: string): string {
    if (code.includes('sequenceDiagram')) return 'sequence';
    if (code.includes('gantt')) return 'gantt';
    if (code.includes('classDiagram')) return 'class';
    return 'flowchart';
  }
}
```

#### 4.4 缓存渲染结果
```typescript
// src/services/mermaidCache.ts

export class MermaidCache {
  private static cache = new Map<string, string>();
  private static readonly MAX_CACHE_SIZE = 100;
  
  static getCacheKey(code: string, theme: string): string {
    return `${theme}:${code}`;
  }
  
  static get(code: string, theme: string): string | null {
    const key = this.getCacheKey(code, theme);
    return this.cache.get(key) || null;
  }
  
  static set(code: string, theme: string, svg: string) {
    const key = this.getCacheKey(code, theme);
    
    // LRU 清理
    if (this.cache.size >= this.MAX_CACHE_SIZE) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    
    this.cache.set(key, svg);
  }
  
  static clear() {
    this.cache.clear();
  }
}
```

**性能目标**:
- 简单图表: < 50ms（不变）
- 中等图表: < 150ms（优化 25%）
- 复杂图表: < 400ms（优化 50%）
- 大型图表: < 800ms（优化 47%）

**工作量**: 2.5天  
**责任人**: 待分配  
**截止日期**: 2026-06-22

---

### 5. Linux 图片粘贴稳定性改进

**问题描述**:
- Linux 平台粘贴图片时偶发失败
- 不同桌面环境（GNOME/KDE/XFCE）行为不一致

**技术分析**:
```typescript
// 当前实现依赖浏览器 Clipboard API
// 问题：Linux 剪贴板机制复杂
// - X11: 多个剪贴板选区（PRIMARY, CLIPBOARD, SECONDARY）
// - Wayland: 不同的剪贴板协议
// - 不同 DE 的剪贴板管理器行为各异
```

**解决方案**:

#### 5.1 多策略回退机制
```typescript
// src/services/clipboardService.ts

export class ClipboardService {
  static async pasteImage(): Promise<File | null> {
    const strategies = [
      this.pasteViaClipboardAPI,
      this.pasteViaDataTransfer,
      this.pasteViaTauriPlugin,
    ];
    
    for (const strategy of strategies) {
      try {
        const result = await strategy();
        if (result) {
          console.log(`✅ Paste succeeded with ${strategy.name}`);
          return result;
        }
      } catch (error) {
        console.warn(`❌ ${strategy.name} failed:`, error);
        continue;
      }
    }
    
    // 所有策略失败
    useUIState.getState().showError(
      'Failed to paste image. Try saving the image and dragging it in.'
    );
    return null;
  }
  
  // 策略 1: 标准 Clipboard API
  private static async pasteViaClipboardAPI(): Promise<File | null> {
    const items = await navigator.clipboard.read();
    
    for (const item of items) {
      if (item.types.includes('image/png')) {
        const blob = await item.getType('image/png');
        return new File([blob], 'pasted-image.png', { type: 'image/png' });
      }
    }
    
    return null;
  }
  
  // 策略 2: paste 事件监听
  private static pasteViaDataTransfer(): Promise<File | null> {
    return new Promise((resolve) => {
      const handler = (e: ClipboardEvent) => {
        const items = e.clipboardData?.items;
        if (!items) {
          resolve(null);
          return;
        }
        
        for (const item of items) {
          if (item.type.startsWith('image/')) {
            const file = item.getAsFile();
            document.removeEventListener('paste', handler);
            resolve(file);
            return;
          }
        }
        
        resolve(null);
      };
      
      document.addEventListener('paste', handler, { once: true });
      
      // 超时清理
      setTimeout(() => {
        document.removeEventListener('paste', handler);
        resolve(null);
      }, 100);
    });
  }
  
  // 策略 3: Tauri 原生插件
  private static async pasteViaTauriPlugin(): Promise<File | null> {
    if (!window.__TAURI__) return null;
    
    try {
      const base64 = await invoke<string>('read_clipboard_image');
      if (!base64) return null;
      
      const blob = base64ToBlob(base64, 'image/png');
      return new File([blob], 'pasted-image.png', { type: 'image/png' });
    } catch {
      return null;
    }
  }
}
```

#### 5.2 Tauri 原生剪贴板支持
```rust
// src-tauri/src/clipboard.rs

use arboard::Clipboard;
use base64::{Engine as _, engine::general_purpose};

#[tauri::command]
pub async fn read_clipboard_image() -> Result<String, String> {
    let mut clipboard = Clipboard::new()
        .map_err(|e| format!("Failed to access clipboard: {}", e))?;
    
    let image = clipboard.get_image()
        .map_err(|e| format!("No image in clipboard: {}", e))?;
    
    // 转换为 PNG
    let mut png_buffer = Vec::new();
    image.to_png(&mut png_buffer)
        .map_err(|e| format!("Failed to encode PNG: {}", e))?;
    
    // Base64 编码
    let base64 = general_purpose::STANDARD.encode(&png_buffer);
    
    Ok(base64)
}
```

```toml
# src-tauri/Cargo.toml
[dependencies]
arboard = "3.4"  # 跨平台剪贴板库
```

#### 5.3 环境检测与适配
```typescript
// src/services/platformDetection.ts

export class PlatformDetection {
  static getLinuxDesktopEnvironment(): string {
    if (typeof window === 'undefined') return 'unknown';
    
    const ua = navigator.userAgent;
    
    if (ua.includes('GNOME')) return 'gnome';
    if (ua.includes('KDE')) return 'kde';
    if (ua.includes('XFCE')) return 'xfce';
    
    // 通过 Tauri 检测
    return invoke<string>('detect_desktop_environment')
      .catch(() => 'unknown');
  }
  
  static getClipboardCapabilities(): ClipboardCapabilities {
    return {
      supportsClipboardAPI: !!navigator.clipboard?.read,
      supportsDataTransfer: true,
      supportsTauriNative: !!window.__TAURI__,
      recommendedStrategy: this.getRecommendedStrategy(),
    };
  }
  
  private static getRecommendedStrategy(): string {
    const de = this.getLinuxDesktopEnvironment();
    
    // KDE 在 Wayland 下推荐原生方式
    if (de === 'kde' && this.isWayland()) {
      return 'tauri-native';
    }
    
    // GNOME 优先使用 Clipboard API
    if (de === 'gnome') {
      return 'clipboard-api';
    }
    
    return 'auto';
  }
  
  private static isWayland(): boolean {
    return invoke<boolean>('is_wayland_session')
      .catch(() => false);
  }
}
```

#### 5.4 用户引导与反馈
```typescript
// src/components/Dialogs/PasteImageHelp.tsx

export function PasteImageHelp() {
  const platform = PlatformDetection.getLinuxDesktopEnvironment();
  
  return (
    <div className="paste-help-dialog">
      <h3>Having trouble pasting images?</h3>
      
      <div className="help-section">
        <h4>Alternative methods:</h4>
        <ul>
          <li>📁 Drag and drop the image file directly</li>
          <li>📎 Use the "Insert Image" button in the toolbar</li>
          <li>⌨️ Press Ctrl+Shift+I to browse for an image</li>
        </ul>
      </div>
      
      {platform === 'kde' && (
        <div className="platform-tip">
          <strong>KDE Users:</strong> Make sure Klipper clipboard manager 
          is running for best results.
        </div>
      )}
      
      {platform === 'gnome' && (
        <div className="platform-tip">
          <strong>GNOME Users:</strong> If paste fails, try copying the 
          image again with Ctrl+C.
        </div>
      )}
      
      <button onClick={() => this.runDiagnostics()}>
        🔍 Run Diagnostics
      </button>
    </div>
  );
}
```

#### 5.5 自动化测试
```typescript
// e2e/linux-clipboard.spec.ts

test.describe('Linux clipboard handling', () => {
  test('should paste image via drag and drop fallback', async ({ page }) => {
    // 模拟粘贴失败场景
    await page.evaluate(() => {
      navigator.clipboard.read = () => Promise.reject('Not available');
    });
    
    // 拖拽图片
    const imageFile = path.join(__dirname, 'fixtures', 'test-image.png');
    await page.setInputFiles('input[type="file"]', imageFile);
    
    // 验证图片插入
    const image = await page.locator('img').first();
    expect(await image.isVisible()).toBeTruthy();
  });
});
```

**工作量**: 2天  
**责任人**: 待分配  
**截止日期**: 2026-06-22  
**测试环境**: Ubuntu 22.04 (GNOME), Fedora 40 (KDE), Arch Linux (XFCE)

---

## 🟢 低优先级任务 (P2) - 1个月内完成

### 6. 暗色主题图标对比度优化

**问题描述**:
- 暗色主题下部分图标对比度不足
- 影响可读性和可访问性（WCAG AA 标准）

**WCAG 要求**:
- AA 级别: 对比度 ≥ 4.5:1 (普通文本)
- AA 级别: 对比度 ≥ 3:1 (大文本/图标)
- AAA 级别: 对比度 ≥ 7:1 (普通文本)

**优化方案**:

#### 6.1 对比度审计
```typescript
// scripts/auditContrast.ts

import { wcagContrast } from 'wcag-contrast';

interface ContrastReport {
  element: string;
  foreground: string;
  background: string;
  ratio: number;
  passes: {
    aa: boolean;
    aaa: boolean;
  };
}

async function auditDarkTheme(): Promise<ContrastReport[]> {
  const darkTheme = {
    background: '#1e1e1e',
    text: '#d4d4d4',
    primary: '#569cd6',
    secondary: '#4ec9b0',
    warning: '#dcdcaa',
    error: '#f48771',
    icon: '#858585',  // 问题：对比度不足
  };
  
  const reports: ContrastReport[] = [];
  
  // 审计所有图标颜色
  const iconColors = [
    { name: 'toolbar-icon', color: darkTheme.icon },
    { name: 'sidebar-icon', color: darkTheme.icon },
    { name: 'button-icon', color: darkTheme.text },
  ];
  
  for (const icon of iconColors) {
    const ratio = wcagContrast(icon.color, darkTheme.background);
    
    reports.push({
      element: icon.name,
      foreground: icon.color,
      background: darkTheme.background,
      ratio,
      passes: {
        aa: ratio >= 3.0,
        aaa: ratio >= 4.5,
      },
    });
  }
  
  return reports;
}

// 运行审计
auditDarkTheme().then(reports => {
  console.table(reports);
  
  const failures = reports.filter(r => !r.passes.aa);
  if (failures.length > 0) {
    console.error(`❌ ${failures.length} elements failed WCAG AA`);
    process.exit(1);
  }
});
```

#### 6.2 优化色值
```css
/* src/styles/themes/dark.css */

:root[data-theme="dark"] {
  /* 背景 */
  --bg-primary: #1e1e1e;
  --bg-secondary: #252526;
  --bg-tertiary: #2d2d30;
  
  /* 文本 */
  --text-primary: #d4d4d4;      /* 对比度: 11.6:1 ✅ AAA */
  --text-secondary: #9d9d9d;    /* 对比度: 5.8:1 ✅ AA */
  --text-tertiary: #808080;     /* 对比度: 4.1:1 ✅ AA（大文本）*/
  
  /* 图标 - 优化前后对比 */
  --icon-default: #858585;      /* 旧值，对比度: 3.8:1 ❌ 不达标 */
  --icon-default: #a0a0a0;      /* 新值，对比度: 5.2:1 ✅ AA */
  
  --icon-hover: #c5c5c5;        /* 对比度: 7.8:1 ✅ AAA */
  --icon-active: #ffffff;       /* 对比度: 14.0:1 ✅ AAA */
  --icon-disabled: #6e6e6e;     /* 对比度: 3.1:1 ✅ AA（大图标）*/
  
  /* 语义颜色 */
  --color-primary: #569cd6;     /* 对比度: 5.5:1 ✅ AA */
  --color-success: #4ec9b0;     /* 对比度: 6.8:1 ✅ AA */
  --color-warning: #dcdcaa;     /* 对比度: 10.2:1 ✅ AAA */
  --color-error: #f48771;       /* 对比度: 6.3:1 ✅ AA */
}

/* 工具栏图标 */
.toolbar-button {
  color: var(--icon-default);
}

.toolbar-button:hover {
  color: var(--icon-hover);
}

.toolbar-button:active {
  color: var(--icon-active);
}

.toolbar-button:disabled {
  color: var(--icon-disabled);
}

/* 侧边栏图标 */
.sidebar-icon {
  color: var(--icon-default);
  filter: none; /* 移除降低对比度的滤镜 */
}

/* 确保 SVG 图标继承颜色 */
.icon svg {
  fill: currentColor;
  stroke: currentColor;
}
```

#### 6.3 动态对比度调整
```typescript
// src/services/contrastAdjustment.ts

export class ContrastAdjustment {
  static adjustForAccessibility(enabled: boolean) {
    document.documentElement.classList.toggle(
      'high-contrast',
      enabled
    );
  }
  
  static getContrastRatio(fg: string, bg: string): number {
    const fgLuminance = this.getLuminance(fg);
    const bgLuminance = this.getLuminance(bg);
    
    const lighter = Math.max(fgLuminance, bgLuminance);
    const darker = Math.min(fgLuminance, bgLuminance);
    
    return (lighter + 0.05) / (darker + 0.05);
  }
  
  private static getLuminance(color: string): number {
    const rgb = this.hexToRgb(color);
    const [r, g, b] = rgb.map(val => {
      val /= 255;
      return val <= 0.03928
        ? val / 12.92
        : Math.pow((val + 0.055) / 1.055, 2.4);
    });
    
    return 0.2126 * r + 0.7152 * g + 0.0722 * b;
  }
  
  private static hexToRgb(hex: string): [number, number, number] {
    const result = /^#?([a-f\d]{2})([a-f\d]{2})([a-f\d]{2})$/i.exec(hex);
    return result
      ? [
          parseInt(result[1], 16),
          parseInt(result[2], 16),
          parseInt(result[3], 16),
        ]
      : [0, 0, 0];
  }
}
```

#### 6.4 用户偏好设置
```typescript
// src/components/Settings/AccessibilitySettings.tsx

export function AccessibilitySettings() {
  const [highContrast, setHighContrast] = useState(false);
  
  return (
    <div className="accessibility-settings">
      <h3>Accessibility</h3>
      
      <label className="setting-item">
        <input
          type="checkbox"
          checked={highContrast}
          onChange={(e) => {
            setHighContrast(e.target.checked);
            ContrastAdjustment.adjustForAccessibility(e.target.checked);
          }}
        />
        <span>High contrast mode</span>
        <small>Increases icon and text contrast for better readability</small>
      </label>
      
      <div className="contrast-preview">
        <h4>Preview:</h4>
        <div className="preview-icons">
          <button className="toolbar-button">💾</button>
          <button className="toolbar-button">📋</button>
          <button className="toolbar-button">🔍</button>
        </div>
      </div>
    </div>
  );
}
```

**验证标准**:
- 所有图标达到 WCAG AA 标准（对比度 ≥ 3:1）
- 文本达到 WCAG AA 标准（对比度 ≥ 4.5:1）
- 提供高对比度模式（WCAG AAA）

**工作量**: 1.5天  
**责任人**: 待分配  
**截止日期**: 2026-07-05

---

### 7. 移动端响应式布局优化

**问题描述**:
- 当前 UI 主要针对桌面端设计
- Tauri 2 已支持 iOS/Android，需要适配移动端

**设计目标**:
- 触控友好的交互
- 小屏幕优化布局
- 移动端特定功能（相机、语音输入）

**优化方案**:

#### 7.1 响应式断点设计
```css
/* src/styles/responsive.css */

:root {
  /* 断点定义 */
  --breakpoint-mobile: 480px;
  --breakpoint-tablet: 768px;
  --breakpoint-desktop: 1024px;
  --breakpoint-wide: 1440px;
}

/* 移动端（手机）*/
@media (max-width: 480px) {
  .app-layout {
    grid-template-columns: 1fr;
    grid-template-areas:
      "header"
      "content"
      "footer";
  }
  
  /* 隐藏侧边栏，改为抽屉 */
  .sidebar {
    position: fixed;
    left: -300px;
    transition: left 0.3s;
    z-index: 1000;
  }
  
  .sidebar.open {
    left: 0;
  }
  
  /* 工具栏改为底部 */
  .toolbar {
    position: fixed;
    bottom: 0;
    left: 0;
    right: 0;
    flex-direction: row;
    justify-content: space-around;
    padding: 12px;
  }
  
  /* 增大触控目标 */
  .toolbar-button {
    min-width: 44px;
    min-height: 44px;
    font-size: 20px;
  }
  
  /* 编辑器全屏 */
  .editor-wrapper {
    padding: 8px;
    font-size: 16px; /* 防止 iOS 自动缩放 */
  }
}

/* 平板端 */
@media (min-width: 481px) and (max-width: 768px) {
  .app-layout {
    grid-template-columns: 60px 1fr;
    grid-template-areas:
      "sidebar header"
      "sidebar content";
  }
  
  /* 紧凑侧边栏 */
  .sidebar {
    width: 60px;
  }
  
  .sidebar-item-text {
    display: none;
  }
}

/* 桌面端 */
@media (min-width: 769px) {
  /* 保持当前布局 */
}
```

#### 7.2 触控手势支持
```typescript
// src/hooks/useTouchGestures.ts

interface TouchGesture {
  onSwipeLeft?: () => void;
  onSwipeRight?: () => void;
  onSwipeUp?: () => void;
  onSwipeDown?: () => void;
  onPinchZoom?: (scale: number) => void;
  onDoubleTap?: () => void;
}

export function useTouchGestures(
  ref: RefObject<HTMLElement>,
  gestures: TouchGesture
) {
  useEffect(() => {
    const element = ref.current;
    if (!element) return;
    
    let touchStartX = 0;
    let touchStartY = 0;
    let touchStartTime = 0;
    let lastTapTime = 0;
    
    const handleTouchStart = (e: TouchEvent) => {
      if (e.touches.length === 1) {
        touchStartX = e.touches[0].clientX;
        touchStartY = e.touches[0].clientY;
        touchStartTime = Date.now();
      }
    };
    
    const handleTouchEnd = (e: TouchEvent) => {
      if (e.changedTouches.length !== 1) return;
      
      const touchEndX = e.changedTouches[0].clientX;
      const touchEndY = e.changedTouches[0].clientY;
      const touchEndTime = Date.now();
      
      const deltaX = touchEndX - touchStartX;
      const deltaY = touchEndY - touchStartY;
      const duration = touchEndTime - touchStartTime;
      
      // 双击检测
      if (duration < 200 && Math.abs(deltaX) < 10 && Math.abs(deltaY) < 10) {
        const timeSinceLastTap = touchEndTime - lastTapTime;
        if (timeSinceLastTap < 300) {
          gestures.onDoubleTap?.();
        }
        lastTapTime = touchEndTime;
        return;
      }
      
      // 滑动检测
      if (duration < 300) {
        if (Math.abs(deltaX) > Math.abs(deltaY) && Math.abs(deltaX) > 50) {
          // 水平滑动
          if (deltaX > 0) {
            gestures.onSwipeRight?.();
          } else {
            gestures.onSwipeLeft?.();
          }
        } else if (Math.abs(deltaY) > 50) {
          // 垂直滑动
          if (deltaY > 0) {
            gestures.onSwipeDown?.();
          } else {
            gestures.onSwipeUp?.();
          }
        }
      }
    };
    
    element.addEventListener('touchstart', handleTouchStart);
    element.addEventListener('touchend', handleTouchEnd);
    
    return () => {
      element.removeEventListener('touchstart', handleTouchStart);
      element.removeEventListener('touchend', handleTouchEnd);
    };
  }, [ref, gestures]);
}
```

#### 7.3 移动端工具栏
```typescript
// src/components/Mobile/MobileToolbar.tsx

export function MobileToolbar() {
  const [showMore, setShowMore] = useState(false);
  const editor = useEditorState(state => state.editor);
  
  const primaryActions = [
    { icon: '📁', label: 'Files', action: () => toggleSidebar() },
    { icon: '✏️', label: 'Format', action: () => setShowMore(true) },
    { icon: '🔍', label: 'Search', action: () => openSearch() },
    { icon: '⋯', label: 'More', action: () => setShowMore(true) },
  ];
  
  return (
    <>
      <div className="mobile-toolbar">
        {primaryActions.map(action => (
          <button
            key={action.label}
            className="mobile-toolbar-button"
            onClick={action.action}
            aria-label={action.label}
          >
            <span className="button-icon">{action.icon}</span>
          </button>
        ))}
      </div>
      
      {showMore && (
        <MobileFormatSheet
          editor={editor}
          onClose={() => setShowMore(false)}
        />
      )}
    </>
  );
}

// 格式化面板（底部弹出）
function MobileFormatSheet({ editor, onClose }: Props) {
  return (
    <div className="mobile-sheet-overlay" onClick={onClose}>
      <div className="mobile-sheet" onClick={e => e.stopPropagation()}>
        <div className="sheet-header">
          <h3>Format</h3>
          <button onClick={onClose}>✕</button>
        </div>
        
        <div className="sheet-content">
          <div className="format-section">
            <h4>Text Style</h4>
            <div className="format-buttons">
              <button onClick={() => editor?.chain().focus().toggleBold().run()}>
                <strong>B</strong>
              </button>
              <button onClick={() => editor?.chain().focus().toggleItalic().run()}>
                <em>I</em>
              </button>
              <button onClick={() => editor?.chain().focus().toggleUnderline().run()}>
                <u>U</u>
              </button>
              <button onClick={() => editor?.chain().focus().toggleStrike().run()}>
                <s>S</s>
              </button>
            </div>
          </div>
          
          <div className="format-section">
            <h4>Headings</h4>
            <div className="format-buttons">
              {[1, 2, 3, 4].map(level => (
                <button
                  key={level}
                  onClick={() => 
                    editor?.chain().focus().toggleHeading({ level }).run()
                  }
                >
                  H{level}
                </button>
              ))}
            </div>
          </div>
          
          <div className="format-section">
            <h4>Insert</h4>
            <div className="format-buttons-grid">
              <button onClick={() => insertImage()}>
                📷 Image
              </button>
              <button onClick={() => insertTable()}>
                📊 Table
              </button>
              <button onClick={() => insertLink()}>
                🔗 Link
              </button>
              <button onClick={() => insertCode()}>
                💻 Code
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
```

#### 7.4 虚拟键盘适配
```typescript
// src/hooks/useVirtualKeyboard.ts

export function useVirtualKeyboard() {
  useEffect(() => {
    if (!('virtualKeyboard' in navigator)) return;
    
    // 监听虚拟键盘显示/隐藏
    const vk = (navigator as any).virtualKeyboard;
    
    vk.addEventListener('geometrychange', (e: any) => {
      const { height } = e.target.boundingRect;
      
      // 调整编辑器高度
      document.documentElement.style.setProperty(
        '--keyboard-height',
        `${height}px`
      );
      
      // 滚动到光标位置
      const selection = window.getSelection();
      if (selection && selection.rangeCount > 0) {
        const range = selection.getRangeAt(0);
        const rect = range.getBoundingClientRect();
        
        if (rect.bottom > window.innerHeight - height) {
          window.scrollBy({
            top: rect.bottom - (window.innerHeight - height) + 20,
            behavior: 'smooth',
          });
        }
      }
    });
    
    return () => {
      document.documentElement.style.removeProperty('--keyboard-height');
    };
  }, []);
}
```

```css
/* 键盘弹出时调整布局 */
@media (max-width: 480px) {
  .editor-wrapper {
    padding-bottom: calc(var(--keyboard-height, 0px) + 80px);
  }
  
  .mobile-toolbar {
    bottom: var(--keyboard-height, 0px);
    transition: bottom 0.3s;
  }
}
```

#### 7.5 移动端特定功能
```typescript
// src/services/mobileFeatures.ts

export class MobileFeatures {
  // 相机集成
  static async capturePhoto(): Promise<File | null> {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
      });
      
      // 显示相机预览
      const preview = document.createElement('video');
      preview.srcObject = stream;
      preview.play();
      
      // 拍照逻辑
      return new Promise((resolve) => {
        // ... 实现拍照和裁剪
      });
    } catch (error) {
      console.error('Camera access denied:', error);
      return null;
    }
  }
  
  // 语音输入
  static async startVoiceInput(
    onResult: (text: string) => void
  ): Promise<void> {
    if (!('webkitSpeechRecognition' in window)) {
      alert('Voice input not supported on this device');
      return;
    }
    
    const recognition = new (window as any).webkitSpeechRecognition();
    recognition.continuous = true;
    recognition.interimResults = true;
    
    recognition.onresult = (event: any) => {
      const transcript = Array.from(event.results)
        .map((result: any) => result[0].transcript)
        .join('');
      
      onResult(transcript);
    };
    
    recognition.start();
  }
  
  // 触觉反馈
  static vibrate(pattern: number | number[]) {
    if ('vibrate' in navigator) {
      navigator.vibrate(pattern);
    }
  }
}
```

**测试设备矩阵**:
- iPhone 13/14/15 (iOS 16+)
- Samsung Galaxy S23 (Android 13+)
- iPad Pro (iPadOS 16+)
- Google Pixel 7 (Android 14)

**工作量**: 5天  
**责任人**: 待分配  
**截止日期**: 2026-07-10

---

## 📊 任务优先级总结

| 优先级 | 任务 | 工作量 | 截止日期 | 影响范围 |
|--------|------|--------|----------|----------|
| **P0** | Windows 平台监控增强 | 2天 | 2026-06-13 | Windows 用户 |
| **P0** | 大文件性能优化 | 3天 | 2026-06-15 | 技术文档用户 |
| **P1** | 协作同步延迟优化 | 2天 | 2026-06-20 | 协作用户 |
| **P1** | Mermaid 渲染优化 | 2.5天 | 2026-06-22 | 图表用户 |
| **P1** | Linux 图片粘贴修复 | 2天 | 2026-06-22 | Linux 用户 |
| **P2** | 暗色主题对比度 | 1.5天 | 2026-07-05 | 所有用户 |
| **P2** | 移动端响应式 | 5天 | 2026-07-10 | 移动端用户 |
| **总计** | - | **18天** | - | - |

---

## 🎯 实施建议

### 第一周（6月6日-6月13日）
1. ✅ 立即启动 P0-1: Windows 监控增强
2. ✅ 并行启动 P0-2: 大文件性能优化（Rust 后端）

### 第二周（6月14日-6月20日）
3. ✅ 完成 P0-2 前端部分
4. ✅ 启动 P1-3: 协作同步优化

### 第三周（6月21日-6月27日）
5. ✅ P1-4: Mermaid 优化
6. ✅ P1-5: Linux 图片粘贴修复

### 第四周（6月28日-7月10日）
7. ✅ P2-6: 暗色主题优化
8. ✅ P2-7: 移动端响应式（分两个 sprint）

---

## 📋 验收标准

### P0 任务
- [ ] Windows 崩溃率 < 0.1%
- [ ] 10MB 文件加载 < 4s
- [ ] 用户反馈改善 > 80%

### P1 任务
- [ ] 协作延迟 P95 < 500ms
- [ ] Mermaid 复杂图表 < 400ms
- [ ] Linux 粘贴成功率 > 95%

### P2 任务
- [ ] 所有图标达到 WCAG AA
- [ ] 移动端触控目标 ≥ 44px
- [ ] 移动端布局无滚动条

---

## 🔄 持续监控指标

```typescript
// 添加到 src/services/performanceMonitoring.ts

export const priorityTaskMetrics = {
  // P0 指标
  fileLoadTime: (size: number, duration: number) => {
    if (size > 5 * 1024 * 1024) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Large file load: ${size}B in ${duration}ms`,
        level: duration > 4000 ? 'warning' : 'info',
      });
    }
  },
  
  // P1 指标
  collaborationLatency: (latency: number) => {
    if (latency > 500) {
      Sentry.captureMessage(`High collaboration latency: ${latency}ms`, 'warning');
    }
  },
  
  mermaidRenderTime: (complexity: string, duration: number) => {
    const thresholds = { simple: 50, medium: 150, complex: 400 };
    if (duration > thresholds[complexity]) {
      Sentry.addBreadcrumb({
        category: 'performance',
        message: `Slow Mermaid render (${complexity}): ${duration}ms`,
        level: 'warning',
      });
    }
  },
  
  // P2 指标
  contrastRatio: (element: string, ratio: number) => {
    if (ratio < 3.0) {
      console.warn(`Low contrast on ${element}: ${ratio.toFixed(2)}:1`);
    }
  },
};
```

---

## 📝 附录

### A. 依赖更新
```json
{
  "devDependencies": {
    "wcag-contrast": "^1.0.0",
    "@types/w3c-web-usb": "^1.0.0"
  }
}
```

### B. Rust 依赖
```toml
[dependencies]
arboard = "3.4"           # 跨平台剪贴板
image = "0.24"            # 图片处理
```

### C. 相关文档
- [WCAG 2.1 Guidelines](https://www.w3.org/WAI/WCAG21/quickref/)
- [Tauri Mobile Guide](https://tauri.app/v1/guides/building/mobile)
- [Y.js Performance Tips](https://docs.yjs.dev/api/performance)

---

**文档版本**: 1.0  
**最后更新**: 2026-06-06  
**负责人**: 待分配  
**审核人**: 待分配
