# Contributing to Markhere

感谢您考虑为 Markhere 做贡献！🎉

---

## 📋 目录

- [行为准则](#行为准则)
- [如何贡献](#如何贡献)
- [开发环境设置](#开发环境设置)
- [项目结构](#项目结构)
- [代码规范](#代码规范)
- [提交规范](#提交规范)
- [Pull Request 流程](#pull-request-流程)
- [问题报告](#问题报告)
- [功能建议](#功能建议)

---

## 行为准则

### 我们的承诺

为了营造一个开放和友好的环境，我们作为贡献者和维护者承诺：

- 使用包容和友好的语言
- 尊重不同的观点和经验
- 优雅地接受建设性批评
- 关注对社区最有利的事情
- 对其他社区成员表示同理心

### 不可接受的行为

- 使用性化的语言或图像
- 侮辱性/贬损性评论和人身攻击
- 公开或私下的骚扰
- 未经许可发布他人的私人信息
- 其他不道德或不专业的行为

---

## 如何贡献

### 贡献方式

您可以通过以下方式贡献：

| 方式 | 描述 |
|------|------|
| 🐛 **报告 Bug** | 提交 Issue 描述问题 |
| 💡 **建议功能** | 提交 Issue 描述新功能想法 |
| 📝 **改进文档** | 修复拼写错误、补充说明 |
| 🔧 **修复 Bug** | 提交 Pull Request |
| ✨ **添加功能** | 提交 Pull Request |
| 🌐 **翻译** | 帮助翻译文档和应用 |
| 🎨 **设计图标** | 设计更好的应用图标 |

---

## 开发环境设置

### 必要条件

| 工具 | 版本 | 安装方式 |
|------|------|----------|
| **Node.js** | 18+ LTS | [nodejs.org](https://nodejs.org) |
| **Rust** | 1.70+ | [rustup.rs](https://rustup.rs) |
| **Git** | 最新版 | [git-scm.com](https://git-scm.com) |
| **npm/pnpm** | 最新版 | Node.js 自带 |

### macOS 额外要求

```bash
# Xcode Command Line Tools
xcode-select --install

# 如需构建 iOS 版本
rustup target add aarch64-apple-ios
```

### Windows 额外要求

1. 安装 [Visual Studio Build Tools](https://visualstudio.microsoft.com/visual-cpp-build-tools/)
2. 选择 "C++ build tools" 工作负载
3. 安装 [WebView2](https://developer.microsoft.com/en-us/microsoft-edge/webview2/)

### Linux 额外要求

```bash
# Ubuntu/Debian
sudo apt-get install -y \
  libgtk-3-dev \
  libwebkit2gtk-4.1-dev \
  libappindicator3-dev \
  librsvg2-dev \
  patchelf

# Fedora
sudo dnf install \
  gtk3-devel \
  webkit2gtk4.1-devel \
  libappindicator-gtk3-devel \
  librsvg2-devel

# Arch Linux
sudo pacman -S \
  gtk3 \
  webkit2gtk \
  libappindicator \
  librsvg
```

### 克隆与安装

```bash
# 1. Fork 并克隆仓库
git clone https://github.com/YOUR_USERNAME/Markhere.git
cd Markhere

# 2. 安装前端依赖
npm install

# 3. 添加 Rust target（可选，用于多平台构建）
rustup target add aarch64-apple-darwin    # macOS ARM64
rustup target add x86_64-apple-darwin     # macOS Intel
rustup target add x86_64-pc-windows-msvc  # Windows
rustup target add x86_64-unknown-linux-gnu # Linux

# 4. 运行开发服务器
npm run tauri:dev
```

### 常用命令

| 命令 | 描述 |
|------|------|
| `npm run dev` | 仅启动前端开发服务器 |
| `npm run tauri:dev` | 启动完整应用开发环境 |
| `npm run build` | 构建前端 |
| `npm run tauri:build` | 构建生产应用 |
| `npm run lint` | 运行 ESLint |
| `npm run type-check` | TypeScript 类型检查 |

---

## 项目结构

```
Markhere/
├── src/                        # React 前端源码
│   ├── components/             # UI 组件 (26 个模块)
│   │   ├── Editor/             # Tiptap 编辑器核心
│   │   ├── TitleBar/           # macOS 风格标题栏
│   │   ├── Toolbar/            # 格式化工具栏
│   │   ├── Sidebar/            # 导航与大纲
│   │   ├── StatusBar/          # 字数统计状态栏
│   │   ├── CommandPalette/     # Cmd+K 命令面板
│   │   ├── Collaboration/      # Y.js 实时协作
│   │   ├── ThemeEditor/        # 主题 CSS 编辑器
│   │   ├── BookmarkPanel/      # 书签系统
│   │   ├── TemplateModal/      # 文档模板
│   │   ├── PomodoroTimer/      # 番茄钟
│   │   ├── WordGoalTracker/    # 字数目标
│   │   ├── SpellChecker/       # 拼写检查
│   │   ├── FocusMode/          # 专注模式
│   │   ├── TypewriterMode/     # 打字机模式
│   │   ├── ImageLibrary/       # 图片媒体库
│   │   ├── EmojiPicker/        # 表情选择器
│   │   ├── OutlineDragSort/    # 大纲拖拽排序
│   │   ├── SourceMode/         # 源码编辑
│   │   ├── SplitView/          # 分屏视图
│   │   ├── VersionHistory/     # 版本历史
│   │   ├── LinkValidator/      # 链接验证
│   │   ├── CodeSandbox/        # 代码执行沙箱
│   │   ├── ExportModal/        # 导出功能
│   │   ├── HelpModal/          # 快捷键帮助
│   │   └── MarkdownPaste/      # 智能粘贴
│   │
│   ├── extensions/             # Tiptap 扩展
│   │   ├── ResizableImage/     # 图片拖拽调整
│   │   ├── MathExtension/      # KaTeX 数学公式
│   │   ├── MermaidExtension/   # Mermaid 图表
│   │   └── FootnoteExtension/  # 学术脚注
│   │
│   ├── store/                  # Zustand 状态管理 (12 个模块)
│   │   ├── aiStore.ts          # AI 助手状态
│   │   ├── autoSaveStore.ts    # 自动保存与恢复
│   │   ├── bookmarkStore.ts    # 书签系统
│   │   ├── collaborationStore.ts # Y.js 协作
│   │   ├── editorStore.ts      # 编辑器状态
│   │   ├── pomodoroStore.ts    # 番茄钟
│   │   ├── sidebarStore.ts     # 侧边栏状态
│   │   ├── spellCheckStore.ts  # 拼写检查
│   │   ├── tabsStore.ts        # 多文档标签页
│   │   ├── themeStore.ts       # 主题状态
│   │   ├── wordGoalStore.ts    # 字数目标
│   │   └── commandPaletteStore.ts # 命令面板
│   │
│   ├── data/                   # 静态数据
│   │   └── templates.ts        # 7 个文档模板
│   │
│   ├── services/               # 业务逻辑
│   │   ├── collaboration.ts    # 协作服务
│   │   ├── export.ts           # 导出服务
│   │   └── ai.ts               # AI 服务
│   │
│   ├── styles/                 # 全局 CSS
│   │   ├── editor.css          # 编辑器样式
│   │   ├── theme.css           # 主题变量
│   │   └── global.css          # 全局样式
│   │
│   ├── App.tsx                 # 应用入口
│   └── main.tsx                # React 入口
│
├── src-tauri/                  # Rust 后端
│   ├── src/
│   │   ├── lib.rs              # IPC 命令处理
│   │   └── main.rs             # 应用入口
│   │
│   ├── icons/                  # 应用图标
│   ├── Cargo.toml              # Rust 依赖
│   ├── tauri.conf.json         # Tauri 配置
│   └── capabilities/           # 权限配置
│
├── .github/workflows/          # CI/CD
│   └── release.yml             # 多平台构建发布
│
├── docs/                       # 文档
├── package.json                # npm 配置
├── tsconfig.json               # TypeScript 配置
├── vite.config.ts              # Vite 配置
├── CHANGELOG.md                # 变更日志
├── CONTRIBUTING.md             # 本文件
├── LICENSE                     # MIT 许可证
└── README.md                   # 项目说明
```

---

## 代码规范

### TypeScript 规范

```typescript
// ✅ 正确：严格类型定义
interface EditorState {
  content: string;
  isFocused: boolean;
  wordCount: number;
}

// ❌ 错误：使用 any
const state: any = { content: '' }; // 禁止使用 any

// ✅ 正确：明确函数返回类型
function formatText(text: string): string {
  return text.trim();
}

// ❌ 错误：隐式返回
function formatText(text: string) {
  return text.trim(); // 应明确返回类型
}

// ✅ 正确：使用 const/let，避免 var
const editor = useEditor();
let count = 0;

// ❌ 错误：使用 var
var editor = useEditor(); // 禁止使用 var

// ✅ 正确：命名约定
const EditorComponent = () => {};  // 组件：PascalCase
const formatText = () => {};       // 函数：camelCase
const MAX_WORD_COUNT = 1000;       // 常量：UPPER_SNAKE_CASE
interface EditorProps {}           // 接口：PascalCase
type EditorState = {};             // 类型：PascalCase
```

### React 规范

```tsx
// ✅ 正确：组件结构
interface EditorProps {
  content: string;
  onChange: (content: string) => void;
}

export const Editor: React.FC<EditorProps> = ({ content, onChange }) => {
  // 1. Hooks 在顶部
  const [state, setState] = useState<string>('');
  const editor = useEditor({ content });
  
  // 2. 副作用
  useEffect(() => {
    // ...
  }, [content]);
  
  // 3. 事件处理函数
  const handleChange = (newContent: string) => {
    onChange(newContent);
  };
  
  // 4. 渲染
  return (
    <div className="editor">
      <EditorContent editor={editor} />
    </div>
  );
};

// ❌ 错误：内联函数定义（性能问题）
return (
  <button onClick={() => {/* 复杂逻辑 */}}>Click</button>
);

// ✅ 正确：分离事件处理
const handleClick = () => {/* 复杂逻辑 */};
return <button onClick={handleClick}>Click</button>;
```

### CSS 规范

```css
/* ✅ 正确：使用 CSS 变量 */
.editor {
  color: var(--text-primary);
  background: var(--bg-secondary);
  font-size: var(--font-size-base);
}

/* ❌ 错误：硬编码颜色 */
.editor {
  color: #333333; /* 应使用 CSS 变量 */
}

/* ✅ 正确：命名约定 */
.editor-container {}      /* 容器 */
.editor-content {}        /* 内容 */
.editor-toolbar {}        /* 工具栏 */
.editor-toolbar-item {}   /* 子元素 */

/* ❌ 错误：模糊命名 */
.container {}  /* 不明确 */
.box {}        /* 太泛化 */
```

### Rust 规范

```rust
// ✅ 正确：命名约定
fn get_file_content() {}      // 函数：snake_case
struct EditorConfig {}        // 结构体：PascalCase
const MAX_FILE_SIZE: usize = 1024; // 常量：UPPER_SNAKE_CASE

// ✅ 正确：错误处理
pub fn read_file(path: &str) -> Result<String, Error> {
    std::fs::read_to_string(path)
        .map_err(|e| Error::FileRead(e.to_string()))
}

// ❌ 错误：unwrap 可能 panic
let content = std::fs::read_to_string(path).unwrap(); // 避免

// ✅ 正确：文档注释
/// 读取文件内容
/// 
/// # Arguments
/// * `path` - 文件路径
/// 
/// # Returns
/// 文件内容字符串或错误
pub fn read_file(path: &str) -> Result<String, Error> {
    // ...
}
```

---

## 提交规范

我们使用 [Conventional Commits](https://www.conventionalcommits.org/) 规范。

### 格式

```
<type>(<scope>): <subject>

<body>

<footer>
```

### 类型 (type)

| 类型 | 描述 | 示例 |
|------|------|------|
| `feat` | 新功能 | `feat(editor): add math equation support` |
| `fix` | Bug 修复 | `fix(toolbar): resolve button click issue` |
| `docs` | 文档变更 | `docs(readme): update installation guide` |
| `style` | 代码格式 | `style(editor): fix indentation` |
| `refactor` | 重构 | `refactor(store): simplify state logic` |
| `perf` | 性能优化 | `perf(editor): reduce render time` |
| `test` | 测试 | `test(editor): add unit tests` |
| `chore` | 构建/工具 | `chore(ci): update github actions` |
| `revert` | 回滚 | `revert: undo previous commit` |

### 作用范围 (scope)

常用范围：
- `editor` - 编辑器相关
- `toolbar` - 工具栏
- `sidebar` - 侧边栏
- `store` - 状态管理
- `export` - 导出功能
- `collab` - 协作功能
- `theme` - 主题
- `tauri` - Rust 后端
- `ci` - CI/CD
- `docs` - 文档

### 示例

```bash
# 新功能
git commit -m "feat(editor): add KaTeX math equation rendering"

# Bug 修复
git commit -m "fix(toolbar): resolve format button not responding"

# 文档更新
git commit -m "docs(contributing): add code style guidelines"

# 多行提交
git commit -m "feat(editor): add Mermaid diagram support

- Add MermaidExtension for Tiptap
- Support flowcharts, sequence diagrams, Gantt charts
- Add toolbar buttons for diagram insertion

Closes #123"
```

---

## Pull Request 流程

### 步骤

1. **Fork 仓库**
   ```bash
   git clone https://github.com/YOUR_USERNAME/Markhere.git
   ```

2. **创建分支**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **进行开发**
   - 遵守代码规范
   - 编写必要的测试
   - 更新相关文档

4. **提交变更**
   ```bash
   git add .
   git commit -m "feat: add amazing feature"
   ```

5. **推送到 GitHub**
   ```bash
   git push origin feature/amazing-feature
   ```

6. **创建 Pull Request**
   - 访问您的 Fork 页面
   - 点击 "New Pull Request"
   - 填写 PR 描述

### PR 描述模板

```markdown
## 📝 变更描述

请简要描述此 PR 的目的和内容。

## 🎯 变更类型

- [ ] 🐛 Bug 修复
- [ ] ✨ 新功能
- [ ] 📝 文档更新
- [ ] 🔧 重构
- [ ] 🎨 样式改进
- [ ] ⚡ 性能优化

## 🔗 相关 Issue

Closes #XXX

## ✅ 检查清单

- [ ] 代码遵循项目规范
- [ ] 已运行 `npm run lint` 无错误
- [ ] 已运行 `npm run type-check` 无错误
- [ ] 已更新相关文档
- [ ] 已测试主要功能正常工作

## 📸 截图（如适用）

请附上 UI 变更的截图。

## 🧪 测试说明

请描述如何测试此变更。
```

### PR 审查流程

| 状态 | 描述 |
|------|------|
| 🔍 **Review Required** | 等待维护者审查 |
| ✅ **Approved** | 审查通过，可以合并 |
| ❌ **Changes Requested** | 需要修改后重新提交 |
| 🚀 **Merged** | 已合并到主分支 |

---

## 问题报告

### 报告模板

```markdown
## 🐛 Bug 描述

清晰简洁地描述问题。

## 📋 复现步骤

1. 执行 '...'
2. 点击 '...'
3. 滚动到 '...'
4. 看到错误

## 🎯 预期行为

描述您期望发生的情况。

## 📸 实际行为

描述实际发生的情况，如有截图请附上。

## 💻 环境信息

| 项目 | 信息 |
|------|------|
| 操作系统 | macOS 14 / Windows 11 / Ubuntu 22.04 |
| Markhere 版本 | v0.1.0 |
| Node.js 版本 | 20.x |
| Rust 版本 | 1.70+ |

## 📎 附加信息

如有其他相关信息，请在此说明。
```

---

## 功能建议

### 建议模板

```markdown
## 💡 功能描述

清晰描述您想要的功能。

## 🎯 解决的问题

描述此功能解决什么问题。

## 📝 建议方案

描述您建议的实现方式。

## 🔗 替代方案

描述您考虑过的其他方案。

## 📎 附加信息

如有参考实现、截图等，请附上。
```

---

## 🙏 感谢

感谢您的贡献！每一个 PR、Issue、建议都让 Markhere 变得更好。

---

<div align="center">

**Made with ❤️ by the Markhere Community**

</div>