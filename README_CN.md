# Markhere

<div align="center">

**一款现代化的跨平台所见即所得 Markdown 编辑器**

[![官方网站](https://img.shields.io/badge/Website-访问-green.svg)](https://jacksoncode.github.io/Markhere)
[![许可证](https://img.shields.io/badge/license-MIT-blue.svg)](https://github.com/jacksoncode/Markhere/blob/main/LICENSE)
[![Tauri](https://img.shields.io/badge/Tauri-2.5-orange.svg)](https://tauri.app)
[![React](https://img.shields.io/badge/React-19-blue.svg)](https://react.dev)
[![TypeScript](https://img.shields.io/badge/TypeScript-严格模式-blue.svg)](https://www.typescriptlang.org)

*优雅写作 · 随处导出 · 无缝协作*

**🏠 [官方网站](https://jacksoncode.github.io/Markhere) | [英文文档](https://github.com/jacksoncode/Markhere/blob/main/README.md) | [中文文档](https://github.com/jacksoncode/Markhere/blob/main/README_CN.md)**

</div>

---

## 📖 项目简介

Markhere 是一款面向现代写作者、开发者及团队的下一代所见即所得 Markdown 编辑器。基于 **Tauri 2.5** 和 **React 19** 构建，融合了原生应用的高性能与 Web 技术的灵活性，全面支持 macOS、Windows 和 Linux。

不同于传统 Markdown 编辑器需要掌握语法知识，Markhere 提供无缝的 **所见即所得** 写作体验，同时保持完整的 Markdown 兼容性，方便导出和版本控制。

---

## ✨ 核心特性

### 🎯 编辑核心
- ✅ **实时所见即所得编辑** - 自然写作，即时呈现格式化效果
- ✅ **智能 Markdown 转换** - 自动识别并转换格式
- ✅ **多格式粘贴支持** - Word、HTML、RTF → Markdown
- ✅ **富文本格式化** - 粗体、斜体、下划线、删除线、代码、链接
- ✅ **表格编辑** - 完整的表格创建、编辑、排序和筛选功能
- ✅ **代码块语法高亮** - 支持 50+ 种语言，基于 Prism.js
- ✅ **数学公式** - KaTeX/LaTeX 公式渲染
- ✅ **Mermaid 图表** - 流程图、序列图、甘特图等
- ✅ **任务列表** - 可交互的复选框，支持完成状态追踪
- ✅ **脚注与引用** - 学术写作支持

### 📁 文档管理
- ✅ **多文档标签页** - 同时打开和编辑多个文件
- ✅ **标签页拖拽排序** - 灵活的工作区组织
- ✅ **文档模板** - 7 个预设模板（学术论文、日记、会议纪要、博客文章、项目计划、周报、读书笔记）
- ✅ **书签系统** - 快速标记位置并导航
- ✅ **大纲导航** - 层级化文档结构，支持拖拽排序
- ✅ **自动保存与崩溃恢复** - 草稿保护机制，永不丢失工作
- ✅ **版本历史** - 基于 Git 的差异可视化与回滚

### 🤝 协作与同步
- ✅ **实时协作** - 基于 Y.js 的 WebRTC 同步
- ✅ **云同步** - iCloud/Google Drive 集成
- ✅ **链接验证** - 死链检测与状态提示

### 🚀 效率工具
- ✅ **命令面板 (Cmd+K)** - 40+ 可搜索命令，分类管理
- ✅ **AI 写作助手** - 智能补全、润色、翻译
- ✅ **番茄钟计时器** - 专注追踪与统计数据
- ✅ **字数目标进度** - 设定目标，可视化进度条
- ✅ **字数统计详情** - 阅读时间、演讲时间、段落数、句子数
- ✅ **拼写检查** - LanguageTool API 集成，支持中英文
- ✅ **专注模式** - 无干扰写作环境
- ✅ **打字机模式** - 光标居中，自然写作体验

### 🎨 用户体验
- ✅ **主题 CSS 编辑器** - 自定义配色方案和字体配置
- ✅ **深色/浅色主题** - 系统感知的主题切换
- ✅ **图片拖拽调整** - 角落拖拽，保持比例
- ✅ **图片媒体库** - 有组织的图片资源管理
- ✅ **表情符号选择器** - 快速表情符号插入面板
- ✅ **分屏视图** - 并排编辑与预览

### 📤 导出与集成
- ✅ **PDF 导出** - 高质量 PDF 生成
- ✅ **Word 导出** - DOCX 格式，保留格式
- ✅ **HTML 导出** - 清晰、响应式 HTML 输出
- ✅ **EPUB 导出** - 电子书格式，适合出版
- ✅ **代码执行沙箱** - 安全的 JavaScript/Python 执行环境
- ✅ **插件系统** - 可扩展架构，支持自定义功能

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
| **Prism.js** | 语法高亮 | 最新版 |
| **KaTeX** | 数学公式渲染 | 最新版 |
| **Mermaid** | 图表渲染 | 最新版 |

---

## 📦 安装指南

### 系统要求

| 平台 | 要求 |
|------|------|
| **macOS** | macOS 10.15+ (Catalina 或更高版本) |
| **Windows** | Windows 10/11 (64位) |
| **Linux** | Ubuntu 18.04+, Debian 10+, Fedora 30+ |

### 下载安装

访问我们的 [发布页面](https://github.com/jacksoncode/Markhere/releases) 下载适合您平台的最新版本。

### 开发环境搭建

```bash
# 克隆仓库
git clone https://github.com/jacksoncode/Markhere.git
cd Markhere

# 安装依赖
npm install

# 运行开发服务器
npm run tauri:dev

# 生产环境构建
npm run tauri:build
```

### 开发环境先决条件

- **Node.js** 18+ (推荐 LTS 版本)
- **Rust** 1.70+ (通过 [rustup](https://rustup.rs) 安装)
- **npm** 或 **pnpm**

---

## 🎮 使用指南

### 键盘快捷键

| 快捷键 | 操作 |
|--------|------|
| `Cmd/Ctrl + K` | 打开命令面板 |
| `Cmd/Ctrl + S` | 保存文档 |
| `Cmd/Ctrl + O` | 打开文件 |
| `Cmd/Ctrl + N` | 新建文档 |
| `Cmd/Ctrl + B` | 粗体 |
| `Cmd/Ctrl + I` | 斜体 |
| `Cmd/Ctrl + U` | 下划线 |
| `Cmd/Ctrl + E` | 代码 |
| `Cmd/Ctrl + K` | 插入链接 |
| `Cmd/Ctrl + 1-6` | 标题级别 |
| `Cmd/Ctrl + Shift + F` | 专注模式 |
| `Cmd/Ctrl + Shift + T` | 打字机模式 |
| `Cmd/Ctrl + /` | 源码模式切换 |
| `Cmd/Ctrl + Shift + K` | 快捷键面板 |

### 命令面板

按下 `Cmd+K` (macOS) 或 `Ctrl+K` (Windows/Linux) 打开命令面板。即时搜索并执行任何命令，涵盖 8 个分类：

- **文件**: 新建、打开、保存、导出
- **编辑**: 撤销、重做、剪切、复制、粘贴
- **格式**: 粗体、斜体、标题、列表、引用
- **插入**: 图片、表格、代码块、任务列表
- **视图**: 侧边栏、专注模式、打字机模式、深色模式
- **工具**: 查找、替换、字数统计、拼写检查
- **协作**: 分享、连接、同步
- **帮助**: 快捷键、指南、关于

---

## 📁 项目结构

```
Markhere/
├── src/                        # React 前端
│   ├── components/             # UI 组件
│   │   ├── Editor/             # Tiptap 编辑器核心
│   │   ├── TitleBar/           # macOS 风格标题栏
│   │   ├── Toolbar/            # 格式化工具栏
│   │   ├── Sidebar/            # 导航与大纲
│   │   ├── StatusBar/          # 字数统计与状态
│   │   ├── CommandPalette/     # Cmd+K 命令搜索
│   │   ├── Collaboration/      # 实时同步
│   │   ├── ThemeEditor/        # 自定义主题
│   │   └ ...                   # 26 个组件模块
│   ├── extensions/             # Tiptap 扩展
│   │   ├── ResizableImage/     # 图片拖拽调整
│   │   ├── MathExtension/      # KaTeX 支持
│   │   ├── MermaidExtension/   # 图表支持
│   │   └ FootnoteExtension/  # 学术脚注
│   ├── store/                  # Zustand 状态管理
│   │   ├── aiStore.ts          # AI 助手状态
│   │   ├── autoSaveStore.ts    # 自动保存与恢复
│   │   ├── collaborationStore.ts # Y.js 同步
│   │   ├── tabsStore.ts        # 多文档标签页
│   │   └ ...                   # 12 个状态模块
│   ├── data/                   # 静态数据
│   │   └ templates.ts        # 文档模板
│   ├── services/               # 业务逻辑
│   └ styles/                  # 全局 CSS
│
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── lib.rs              # IPC 命令
│   │   └ main.rs             # 入口点
│   ├── Cargo.toml              # 依赖配置
│   ├── tauri.conf.json         # 应用配置
│   └ icons/                  # 平台图标
│
├── docs/                       # 文档
├── .github/workflows/          # CI/CD 流程
├── package.json                # NPM 依赖
└── README.md                   # 英文文档
```

---

## 🤝 参与贡献

我们欢迎各种形式的贡献！请遵循以下步骤：

1. **Fork** 本仓库
2. **创建** 特性分支 (`git checkout -b feature/amazing-feature`)
3. **提交** 更改 (`git commit -m 'feat: add amazing feature'`)
4. **推送** 分支 (`git push origin feature/amazing-feature`)
5. **提交** Pull Request

### 开发规范

- 遵循现有代码风格
- 为新功能编写测试
- 更新相关文档
- 确保 TypeScript 严格模式合规
- 提交 PR 前运行 `npm run build`

---

## 📄 许可证

本项目基于 **MIT 许可证** 开源 - 详情请见 [LICENSE](https://github.com/jacksoncode/Markhere/blob/main/LICENSE) 文件。

---

## 🙏 致谢

- **Tauri 团队** - 提供了优秀的跨平台框架
- **Tiptap 社区** - 提供了可扩展的编辑器引擎
- **Y.js 作者** - 提供了 CRDT 协作技术
- **所有贡献者** - 让 Markhere 变得更好

---

## 📮 联系与支持

- **GitHub Issues**: [报告问题或提出功能建议](https://github.com/jacksoncode/Markhere/issues)
- **讨论区**: [社区问答](https://github.com/jacksoncode/Markhere/discussions)
- **发布页**: [下载最新版本](https://github.com/jacksoncode/Markhere/releases)

---

<div align="center">

**由 Markhere 团队用 ❤️ 制作**

*如果您觉得 Markhere 有用，请考虑给它一个 ⭐ 星标！*

</div>