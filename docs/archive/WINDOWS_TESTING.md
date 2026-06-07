# Windows 测试改进计划

本文档记录 Windows 平台测试的改进措施，确保应用稳定性。

---

## 🎯 目标

1. 提高 Windows 冒烟测试的稳定性
2. 在本地 Windows VM 上验证修复
3. 增强 CI/CD 中的 Windows 测试覆盖率
4. 建立 Windows 特定的测试基准

---

## 🐛 当前问题

### 1. CI 冒烟测试不稳定
**问题**: WebDriver 连接超时、应用未完全启动
**现象**: 
- 测试随机失败
- "continue-on-error: true" 掩盖真实问题
- 日志不完整

### 2. Windows 特定 Bug 难以复现
**问题**: 本地开发主要在 macOS，Windows bug 发现晚
**影响**: 
- v0.4.8 之前 8 个提交都是修 Windows 崩溃
- 用户体验差

### 3. 缺少 Windows 性能基准
**问题**: 不知道 Windows 上的正常启动时间和性能表现

---

## 📋 改进措施

### 阶段 1: 本地 Windows 测试环境 (本周)

#### 1.1 设置 Windows VM
```bash
# 使用 Parallels/VMware/VirtualBox
# 或使用 GitHub Codespaces Windows

# 推荐配置
- OS: Windows 11 Pro
- RAM: 8GB
- CPU: 4 cores
- 磁盘: 60GB
```

#### 1.2 安装开发工具
```powershell
# 安装 Node.js
winget install OpenJS.NodeJS.LTS

# 安装 Rust
winget install Rustlang.Rustup

# 安装 Visual Studio Build Tools
winget install Microsoft.VisualStudio.2022.BuildTools

# 克隆项目
git clone https://github.com/jacksoncode/Markhere.git
cd Markhere

# 安装依赖
npm install

# 构建和运行
npm run tauri:build
```

#### 1.3 手动测试清单
```
✅ 启动检查
  [ ] 应用能否正常启动
  [ ] 启动时间 < 3s
  [ ] 无崩溃或错误弹窗
  [ ] 启动画面正常显示和消失

✅ 菜单功能（v0.4.9 后临时移除）
  [ ] 键盘快捷键全部工作
  [ ] Ctrl+K 打开命令面板
  [ ] 右键菜单正常

✅ 核心功能
  [ ] 新建文件 (Ctrl+N)
  [ ] 打开文件 (Ctrl+O)
  [ ] 保存文件 (Ctrl+S)
  [ ] 编辑文本流畅
  [ ] Markdown 渲染正确

✅ 导出功能
  [ ] 导出 PDF
  [ ] 导出 Word
  [ ] 导出 HTML
  [ ] 导出 EPUB

✅ 高级功能
  [ ] 数学公式渲染 (KaTeX)
  [ ] 代码高亮 (Prism)
  [ ] Mermaid 图表
  [ ] 协作模式

✅ 性能
  [ ] 打开大文件 (>5MB) 无卡顿
  [ ] 内存占用 < 500MB
  [ ] CPU 空闲时 < 5%
```

---

### 阶段 2: 改进 CI 冒烟测试 (本周)

#### 2.1 增强 WebDriver 稳定性

**修改 `.github/workflows/build.yml`**:

```yaml
- name: Run Windows Smoke Test
  if: matrix.platform == 'windows-latest'
  timeout-minutes: 10
  run: |
    # 启动应用（后台运行）
    Start-Process -FilePath "src-tauri/target/release/markhere.exe" -WindowStyle Hidden
    
    # 等待应用完全启动（更长时间）
    Write-Host "Waiting for app to start..."
    Start-Sleep -Seconds 15
    
    # 检查进程是否存在
    $process = Get-Process -Name "markhere" -ErrorAction SilentlyContinue
    if ($null -eq $process) {
      Write-Error "App failed to start"
      exit 1
    }
    
    Write-Host "App process found (PID: $($process.Id))"
    
    # 检查窗口是否存在（使用 Windows API）
    Add-Type @"
    using System;
    using System.Runtime.InteropServices;
    public class Win32 {
        [DllImport("user32.dll")]
        public static extern IntPtr FindWindow(string lpClassName, string lpWindowName);
    }
"@
    
    $hwnd = [Win32]::FindWindow($null, "Markhere - Markdown Editor")
    if ($hwnd -eq [IntPtr]::Zero) {
      Write-Error "App window not found"
      Stop-Process -Name "markhere" -Force
      exit 1
    }
    
    Write-Host "App window found"
    
    # 等待一段时间确保稳定
    Start-Sleep -Seconds 5
    
    # 清理
    Stop-Process -Name "markhere" -Force
    Write-Host "Smoke test passed!"

- name: Upload crash logs on failure
  if: failure() && matrix.platform == 'windows-latest'
  uses: actions/upload-artifact@v4
  with:
    name: windows-crash-logs
    path: |
      src-tauri/target/release/*.log
      %APPDATA%/markhere/logs/*.log
      crash_dumps/
```

#### 2.2 添加更详细的日志

在 `src-tauri/src/lib.rs` 添加启动日志：

```rust
use log::{info, error};

pub fn run() {
    env_logger::init();
    info!("Markhere starting...");
    
    tauri::Builder::default()
        .setup(|app| {
            info!("Tauri setup started");
            // ... 现有代码
            info!("Tauri setup completed");
            Ok(())
        })
        .on_window_event(|window, event| {
            match event {
                tauri::WindowEvent::Created => {
                    info!("Window created: {}", window.label());
                }
                tauri::WindowEvent::Destroyed => {
                    info!("Window destroyed: {}", window.label());
                }
                tauri::WindowEvent::CloseRequested { .. } => {
                    info!("Close requested: {}", window.label());
                }
                _ => {}
            }
        })
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
    
    info!("Markhere exiting");
}
```

更新 `Cargo.toml`:
```toml
[dependencies]
log = "0.4"
env_logger = "0.11"
```

---

### 阶段 3: 自动化测试增强 (下周)

#### 3.1 使用 Playwright 进行端到端测试

创建 `tests/windows-e2e.spec.ts`:

```typescript
import { test, expect, _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Windows E2E Tests', () => {
  test('should start application', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../src-tauri/target/release/markhere.exe')],
      timeout: 30000,
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 验证标题
    await expect(window).toHaveTitle(/Markhere/);

    // 验证主要元素存在
    await expect(window.locator('.editor')).toBeVisible({ timeout: 10000 });
    await expect(window.locator('.toolbar')).toBeVisible();

    await electronApp.close();
  });

  test('should create new document', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../src-tauri/target/release/markhere.exe')],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 按 Ctrl+N
    await window.keyboard.press('Control+N');

    // 验证新文档创建
    await expect(window.locator('.tab-bar .tab')).toHaveCount(2);

    await electronApp.close();
  });

  test('should save document', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../src-tauri/target/release/markhere.exe')],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    // 输入文本
    await window.locator('.ProseMirror').fill('# Test Document\n\nThis is a test.');

    // 保存（会打开文件对话框，需要 mock）
    // TODO: 实现文件对话框 mock

    await electronApp.close();
  });
});
```

在 `package.json` 添加脚本:
```json
{
  "scripts": {
    "test:e2e:windows": "playwright test tests/windows-e2e.spec.ts"
  }
}
```

#### 3.2 性能基准测试

创建 `tests/windows-performance.spec.ts`:

```typescript
import { test } from '@playwright/test';
import { _electron as electron } from '@playwright/test';
import path from 'path';

test.describe('Windows Performance', () => {
  test('measure startup time', async () => {
    const startTime = Date.now();
    
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../src-tauri/target/release/markhere.exe')],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');
    
    const endTime = Date.now();
    const startupTime = endTime - startTime;

    console.log(`Startup time: ${startupTime}ms`);
    
    // 基准: < 3000ms
    expect(startupTime).toBeLessThan(3000);

    await electronApp.close();
  });

  test('measure file open time', async () => {
    const electronApp = await electron.launch({
      args: [path.join(__dirname, '../src-tauri/target/release/markhere.exe')],
    });

    const window = await electronApp.firstWindow();
    await window.waitForLoadState('domcontentloaded');

    const startTime = Date.now();
    
    // 打开大文件
    // TODO: 实现

    const endTime = Date.now();
    const openTime = endTime - startTime;

    console.log(`File open time: ${openTime}ms`);
    
    // 基准: < 500ms
    expect(openTime).toBeLessThan(500);

    await electronApp.close();
  });
});
```

---

### 阶段 4: 持续监控 (持续)

#### 4.1 Windows 特定错误追踪

在 Sentry 中添加 Windows 过滤器：
```typescript
// src/main.tsx
Sentry.init({
  // ... 现有配置
  beforeSend(event) {
    // 添加平台信息
    if ((window as any).__TAURI__) {
      event.contexts = event.contexts || {};
      event.contexts.os = {
        name: 'Windows',
        version: navigator.userAgent,
      };
    }
    return event;
  },
});
```

在 Sentry 创建 Windows 专用搜索：
```
os.name:Windows
```

#### 4.2 性能监控仪表板

在 Sentry 或自建监控中跟踪：
- Windows 启动时间平均值
- Windows vs macOS vs Linux 性能对比
- Windows 特有错误类型

---

## 📊 成功指标

### 短期目标 (1周内)
- [ ] 在 Windows VM 上手动验证 v0.4.9 修复
- [ ] CI 冒烟测试通过率 > 95%
- [ ] 记录 Windows 性能基准

### 中期目标 (1个月内)
- [ ] Playwright E2E 测试覆盖核心功能
- [ ] Windows 特定 bug 数量 < 2/月
- [ ] Windows 启动时间 < 2s (当前 ~2.5s)

### 长期目标 (3个月内)
- [ ] 自动化回归测试套件
- [ ] Windows 性能与 macOS 持平
- [ ] 零 P0 Windows 问题

---

## 🔧 开发建议

### 本地开发最佳实践
1. 每次修改后在 Windows VM 中测试
2. 使用 `npm run tauri:dev` 快速迭代
3. 关注 Windows 特有 API 差异

### 代码审查检查点
- [ ] 是否使用了平台特定的 API？
- [ ] 文件路径是否使用正确的分隔符？
- [ ] 是否测试了 Windows 上的行为？

### 发布前检查清单
- [ ] Windows 构建成功
- [ ] 所有冒烟测试通过
- [ ] 在 Windows VM 手动测试核心功能
- [ ] 检查 Sentry 无新增 Windows 错误

---

## 📚 相关资源

- [Tauri Windows 开发文档](https://tauri.app/v2/guides/building/windows)
- [Playwright Electron 测试](https://playwright.dev/docs/api/class-electron)
- [Windows 性能分析工具](https://docs.microsoft.com/en-us/windows-hardware/test/wpt/)

---

**下一步**: 在 Windows VM 上运行完整测试，记录基准性能数据
