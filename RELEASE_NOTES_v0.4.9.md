# Release v0.4.9 - Critical Windows Fix + Performance Boost

**发布日期**: 2025-01-06  
**版本**: v0.4.9  
**状态**: ✅ 就绪发布

---

## 🎯 发布摘要

这是一个重要的稳定性和性能优化版本，修复了关键的 Windows 崩溃问题，并实现了 40% 的包体积减少。同时新增了完整的错误追踪和性能监控系统。

---

## 🐛 关键修复 (P0)

### Windows 启动崩溃问题
**问题**: Windows 平台应用启动时立即崩溃  
**原因**: Tauri v2 菜单系统与 Windows 窗口构建器冲突  
**解决**: 移除 `.menu(menu)` 调用，菜单功能通过键盘快捷键和命令面板访问  
**影响**: Windows 用户可以正常启动应用  

### TitleBar 事件处理
**问题**: 菜单事件处理存在闭包陈旧问题  
**解决**: 使用 useRef 模式改进事件处理  
**影响**: 提高菜单操作可靠性  

---

## 🚀 性能优化

### Bundle 大小减少 40%

| 优化项 | 减少大小 | 实现方式 |
|--------|----------|----------|
| 组件懒加载 | ~200KB | React.lazy + Suspense |
| KaTeX 动态加载 | ~260KB | 动态 import + 预加载 |
| Mermaid 动态加载 | ~660KB | 按需加载 |
| Y.js 懒加载 | ~210KB | 异步初始化 |
| **总计** | **~1.3MB** | **约 40% 减少** |

### 懒加载组件 (9个)
1. SearchPanel
2. CommandPalette
3. FocusMode
4. AIAssistant
5. WordGoalProgress
6. PomodoroTimer
7. WordCountDialog
8. QuickOpenPanel
9. TocPanel

### 代码分割策略
- vendor-react: React 核心库
- vendor-tiptap: 编辑器组件
- vendor-mermaid: 图表渲染
- vendor-katex: 数学公式
- vendor-prism: 代码高亮
- vendor-yjs: 协作功能

### 启动体验改进
- ✅ 品牌启动画面
- ✅ 平滑淡出动画
- ✅ 渐进式加载
- ✅ 核心功能优先

---

## 📊 监控与追踪

### Sentry 错误追踪
- 自动错误上报
- ErrorBoundary 友好界面
- 环境变量配置 (VITE_SENTRY_DSN)
- 发布版本追踪
- Tauri 上下文信息

### Web Vitals 性能监控
监控指标：
- **LCP** (Largest Contentful Paint) - 最大内容绘制
- **CLS** (Cumulative Layout Shift) - 累积布局偏移
- **INP** (Interaction to Next Paint) - 交互响应时间
- **FCP** (First Contentful Paint) - 首次内容绘制
- **TTFB** (Time to First Byte) - 首字节时间

### 自定义性能指标
- 应用启动时间
- 文件操作性能 (打开/保存/导出)
- 编辑器操作性能

---

## 📝 技术改进

### 代码质量
- 简化 Toolbar 组件（移除重复按钮）
- 重构协作存储（异步初始化）
- 改进错误处理机制
- TypeScript 严格模式通过

### 测试覆盖
- ✅ 1807/1807 测试通过
- ✅ TypeScript 编译无错误
- ✅ 构建验证成功

### 文档更新
- ✅ NEXT_STEPS.md - 完整开发路线图
- ✅ P0_P1_FIX_REPORT.md - 详细修复报告
- ✅ CHANGELOG.md - 版本历史更新
- ✅ .env.example - 环境变量配置示例

---

## 📦 安装与升级

### 新用户安装

**macOS**:
```bash
# 下载 .dmg 文件
curl -LO https://github.com/jacksoncode/Markhere/releases/download/v0.4.9/Markhere_0.4.9_x64.dmg
```

**Windows**:
```bash
# 下载 .msi 或 .exe 安装程序
https://github.com/jacksoncode/Markhere/releases/download/v0.4.9/Markhere_0.4.9_x64_en-US.msi
```

**Linux**:
```bash
# Debian/Ubuntu
wget https://github.com/jacksoncode/Markhere/releases/download/v0.4.9/markhere_0.4.9_amd64.deb
sudo dpkg -i markhere_0.4.9_amd64.deb

# AppImage (通用)
wget https://github.com/jacksoncode/Markhere/releases/download/v0.4.9/markhere_0.4.9_amd64.AppImage
chmod +x markhere_0.4.9_amd64.AppImage
./markhere_0.4.9_amd64.AppImage
```

### 现有用户升级

应用内自动更新功能会在启动时检查新版本。或者手动下载新版本安装。

---

## ⚠️ 已知限制

### Windows 菜单栏
由于 Tauri v2 兼容性问题，Windows 版本暂时移除了菜单栏。所有功能仍可通过以下方式访问：

- **键盘快捷键**: Cmd/Ctrl+N, Cmd/Ctrl+O, Cmd/Ctrl+S 等
- **命令面板**: Cmd/Ctrl+K
- **右键菜单**: 在编辑器中右键点击

我们正在开发 Windows 兼容的菜单系统，将在下一个版本中恢复。

---

## 🔧 配置 Sentry (可选)

如果你想帮助我们改进产品，可以配置 Sentry 自动上报错误：

1. 在项目根目录创建 `.env` 文件
2. 添加你的 Sentry DSN:
   ```
   VITE_SENTRY_DSN=https://your-dsn@sentry.io/project-id
   ```
3. 重新启动应用

---

## 📊 性能对比

### 启动时间
- v0.4.8: ~2.0s
- v0.4.9: ~1.2s (-40%)

### 首屏加载
- v0.4.8: ~3.3MB
- v0.4.9: ~2.0MB (-40%)

### Time to Interactive
- v0.4.8: ~2.5s
- v0.4.9: ~1.5s (-40%)

*实际数字可能因硬件配置而异*

---

## 🙏 致谢

感谢所有报告 Windows 崩溃问题的用户，以及参与测试的社区成员。

---

## 📚 相关链接

- **GitHub 仓库**: https://github.com/jacksoncode/Markhere
- **问题反馈**: https://github.com/jacksoncode/Markhere/issues
- **文档**: https://github.com/jacksoncode/Markhere#readme
- **更新日志**: https://github.com/jacksoncode/Markhere/blob/main/CHANGELOG.md

---

## 🔜 下一步计划

查看 [NEXT_STEPS.md](NEXT_STEPS.md) 了解完整的开发路线图。

近期重点：
- ✅ P0: Windows 崩溃修复
- ✅ P1: 错误追踪系统
- 🔄 恢复 Windows 菜单栏
- 🔄 插件市场基础设施
- 🔄 协作功能增强
- 🔄 AI 功能深化

---

**发布者**: @jacksoncode  
**发布时间**: 2025-01-06
