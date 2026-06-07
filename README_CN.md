# Markhere

<div align="center">

**一款现代化的跨平台所见即所得 Markdown 编辑器**

[![官方网站](https://img.shields.io/badge/Website-访问-green.svg)](https://jacksoncode.github.io/Markhere)
[![许可证](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jacksoncode/Markhere/blob/main/LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.5-orange.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-严格模式-blue.svg)](https://www.typescriptlang.org)
[![版本](https://img.shields.io/badge/version-1.0.0-brightgreen.svg)](https://github.com/jacksoncode/Markhere/releases)

*优雅写作 · 知识管理 · AI 增强*

**🏠 [官方网站](https://jacksoncode.github.io/Markhere) | [英文文档](README.md) | [用户手册](docs/USER_MANUAL.md)**

</div>

---

## 📖 项目简介

Markhere 是一款面向现代写作者、开发者及团队的**国产高端 Markdown 编辑器**。基于 **Tauri 2.5** 和 **React 19** 构建，融合原生性能与 Web 灵活性，全面支持 macOS、Windows 和 Linux。

**v1.0.0 正式版** 已发布——累计 **73 个测试文件、2,052 个测试用例、17 个 Rust 测试、16 个 E2E 测试文件**，TypeScript 严格模式零错误。

---

## ✨ 核心特性

### 🎯 编辑核心
- ✅ **实时所见即所得** — 输入即渲染，无需切换预览窗口
- ✅ **多格式粘贴** — Word / HTML / RTF → Markdown
- ✅ **富文本格式化** — 粗体、斜体、下划线、删除线、代码、链接
- ✅ **表格编辑** — 创建、排序、筛选
- ✅ **代码块语法高亮** — 50+ 语言（Prism.js）
- ✅ **数学公式** — KaTeX/LaTeX 实时渲染
- ✅ **Mermaid 图表** — 流程图、序列图、甘特图等
- ✅ **任务列表 + 脚注 + 引用**

### 📁 知识管理（v1.0 新增 🆕）
- ✅ **数据库视图** — Table / Board / Calendar / Timeline 四种视图，对标 Notion
- ✅ **Dataview 查询** — SQL-like 搜索笔记（SELECT / FROM / WHERE / SORT / LIMIT），对标 Obsidian
- ✅ **元数据索引** — YAML frontmatter 自动解析 + 标签/分类筛选
- ✅ **Canvas 白板** — 卡片拖拽 + 连线 + 缩放/平移
- ✅ **双链笔记** — `[[文件名]]` 语法构建知识网络

### 🧠 AI 增强（v1.0 升级 🆕）
- ✅ **18 家 LLM 提供商** — 国内 12 家 + 国际 6 家（OpenAI / Claude / Gemini / Mistral / Grok / Cohere）
- ✅ **Ollama 本地模型** — 完全离线 AI，隐私优先
- ✅ **11 种 AI 写作能力** — 摘要、翻译、润色、续写、扩写、缩写、改写、标题建议、段落重组、引文推荐、对比分析、情绪检查、写作建议、大纲生成、思维导图、代码优化、表格分析、风格检查
- ✅ **7 语言翻译** — 中文 / English / 日本語 / 한국어 / Français / Deutsch / Español

### 🎨 主题与体验
- ✅ **25 种内置主题**（v1.0 新增 🆕）— Solarized / Rosé Pine / Catppuccin / Tokyo Night / Everforest / Gruvbox 等
- ✅ **深色/浅色主题** — 系统感知 + WCAG AA 合规
- ✅ **高对比度模式** — 无障碍友好
- ✅ **主题导入/导出** — .theme.json 格式
- ✅ **专注模式 + 打字机模式** — 无干扰写作
- ✅ **25 种主题** — 全部通过 WCAG AA 对比度检测

### 🔌 插件生态（v1.0 新增 🆕）
- ✅ **插件市场** — 搜索、分类、安装/卸载
- ✅ **5 个内置官方插件** — PPTX 导出 / LaTeX 导出 / 思维导图 / 语法检查 / 代码执行
- ✅ **插件沙箱安全** — 权限校验 + 官方认证
- ✅ **排行榜** — 下载量/评分排序

### 📤 导出格式
- ✅ **PDF / Word / HTML / EPUB**
- ✅ **PPTX 幻灯片**（v1.0 新增 🆕）— 标题自动分区
- ✅ **LaTeX 论文**（v1.0 新增 🆕）— 学术格式
- ✅ **5 种导出模板**

### 🤝 协作
- ✅ **Y.js WebRTC 实时同步**
- ✅ **Canvas 协作白板** — WebSocket 同步 + 权限管理
- ✅ **协作者光标显示**

### 🔒 安全与性能（v1.0 强化）
- ✅ **大文件分块加载** — >5MB 自动分流（1MB chunks）
- ✅ **FPS + 内存实时监控**
- ✅ **数据恢复** — 断电保护 + Rust 级文件备份 + 校验和验证
- ✅ **虚拟滚动** — 50+ 节点自动启用
- ✅ **Windows 崩溃监控** — Sentry 集成
- ✅ **Web Vitals 性能追踪**

### 🌐 多语言
- ✅ **5 种界面语言** — 简体中文 / English / 日本語 / 한국어 / Français

### 📱 移动端支持
- ✅ **响应式布局** — 4 个断点（mobile/tablet/desktop/wide）
- ✅ **触控手势** — swipe / pinch / double-tap / long-press
- ✅ **虚拟键盘适配**

---

## 🛠 技术栈

| 技术 | 用途 | 版本 |
|------|------|------|
| **Tauri** | 桌面运行时 | 2.5 |
| **React** | UI 框架 | 19 |
| **TypeScript** | 类型安全 | 严格模式 |
| **Tiptap** | 编辑器引擎 | 最新版 |
| **Zustand** | 状态管理 | 最新版 |
| **Y.js** | CRDT 同步 | 最新版 |
| **Rust** | 后端 | 1.70+ |
| **pulldown-cmark** | Markdown 解析 | 0.12 |
| **sysinfo** | 系统监控 | 0.30 |

---

## 📦 安装指南

### 系统要求

| 平台 | 要求 |
|------|------|
| **macOS** | macOS 10.15+ |
| **Windows** | Windows 10/11 (64位) |
| **Linux** | Ubuntu 18.04+, Debian 10+, Fedora 30+ |

### 开发环境

```bash
git clone https://github.com/jacksoncode/Markhere.git
cd Markhere
npm install
npm run tauri:dev    # 开发模式
npm run tauri:build  # 生产构建
```

**先决条件**: Node.js 18+ / Rust 1.70+

### 下载

访问 [Releases](https://github.com/jacksoncode/Markhere/releases) 下载最新版本。

---

## 🎮 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `Cmd/Ctrl + K` | 命令面板 |
| `Cmd/Ctrl + S` | 保存 |
| `Cmd/Ctrl + P` | 快速打开 |
| `Cmd/Ctrl + N` | 新建文档 |
| `Cmd/Ctrl + W` | 关闭窗口 |
| `Cmd/Ctrl + B/I/U` | 粗体/斜体/下划线 |
| `Cmd/Ctrl + 1-6` | 标题 1-6 |
| `Cmd/Ctrl + /` | 源码模式 |
| `Cmd/Ctrl + Shift + F` | 专注模式 |
| `Cmd/Ctrl + Shift + T` | 打字机模式 |
| `Cmd/Ctrl + Shift + C` | 字数统计 |
| `Cmd/Ctrl + Home/End` | 跳到开头/结尾 |

---

## 📁 项目结构

```
Markhere/
├── src/                        # React 前端
│   ├── components/             # UI 组件（数据库/Canvas/AI/插件市场等）
│   ├── extensions/             # Tiptap 扩展
│   ├── store/                  # Zustand 状态（20+ 模块）
│   ├── services/               # 业务逻辑（AI/导出/搜索/恢复等）
│   ├── hooks/                  # React Hooks
│   ├── i18n/                   # 多语言（5 种）
│   └── styles/                 # 主题/响应式 CSS
├── src-tauri/                  # Rust 后端
│   └── src/                    # IPC 命令 / 系统指标 / 文件操作 / 数据恢复
├── docs/                       # 文档 + 示例
├── e2e/                        # E2E 测试（16 文件）
└── package.json
```

---

## 🤝 参与贡献

1. **Fork** 本仓库
2. **创建** 特性分支 (`git checkout -b feature/amazing-feature`)
3. **提交** 更改 (`git commit -m 'feat: add amazing feature'`)
4. **推送** 分支并 **提交** Pull Request

运行 `npm run test` 和 `npm run tauri:build` 确保代码质量。

---

## 📄 许可证

MIT License — 详见 [LICENSE](LICENSE)。

---

<div align="center">

**由 Markhere 团队用 ❤️ 制作**

⭐ 如果觉得有用，请给一个 Star！

</div>
