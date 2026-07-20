# Markhere 设计规范（DESIGN.md）

> 本文件是 Markhere 前端 UI 的**单一事实来源（single source of truth）**。
> 任何组件样式、AI 改样、主题新增都**必须**遵循本规范，而非凭感觉写死颜色或像素。
> 设计令牌定义见 `src/styles/design-tokens.css`；主题预设见 `src/store/themes.ts`；
> 主题运行时注入见 `src/store/themeStore.ts`。

---

## 1. 设计原则（Design Principles）

基于主流产品（Typora / Obsidian / Bear / iA Writer / Notion）的调研，Markhere 的视觉与交互遵循以下原则：

| # | 原则 | 说明 |
|---|------|------|
| P1 | **即时渲染，无割裂** | 编辑与预览合一（Tiptap WYSIWYG），避免「左源码右预览」的割裂感。 |
| P2 | **克制 Chrome** | 默认收起菜单栏/工具栏，靠命令面板（`Cmd/Ctrl+P`）与悬停边缘呼出；默认进入专注感。 |
| P3 | **排版即产品** | 行宽 60–75ch、行高 ~1.7、中英文混排优化、优质字体——高级感由排版决定。 |
| P4 | **主题是第一公民** | 明暗双模 + 可自定义 + 主题市场；切换主题时**全应用**不得露馅。 |
| P5 | **微妙动效** | 仅用 `var(--duration-*)` 缓动；尊重 `prefers-reduced-motion`。 |
| P6 | **令牌唯一真源** | 所有颜色/间距/圆角/阴影均来自设计令牌，**禁止硬编码 hex**。 |

---

## 2. 设计令牌（Design Tokens）

命名约定：`--{category}-{property}-{modifier}`。组件**只能**使用本文件导出的令牌。
旧别名（见 `design-tokens.css` 末尾）仅为向后兼容，**新代码禁止新增使用**。

### 2.1 颜色 —— 两层模型（重要）

颜色分为两层，二者职责不同：

- **`--theme-*`（用户可换肤色）**：由 `themeStore.applyTheme()` 在运行时从当前主题
  （`themes.ts` 预设或自定义主题）注入。组件里**凡随主题变化**的表面、文字、边框、主色
  必须引用这组变量，主题切换才会生效。
- **`--color-*`（结构语义色）**：在 `design-tokens.css` 中定义，含明/暗覆盖
  （`[data-theme='dark']`）。用于**不随用户主题变化**的语义色（状态色、阴影、图谱、
  遮罩等）。

| 变量（用 `--theme-*`） | 含义 | 注入来源 |
|------------------------|------|----------|
| `--theme-bg` | 主背景 | `theme.colors.bg` |
| `--theme-text` | 主文字 | `theme.colors.text` |
| `--theme-border` | 边框 | `theme.colors.border` |
| `--theme-primary` | 主色/强调 | `theme.colors.primary` |
| `--theme-code-bg` | 代码块背景 | `theme.colors.codeBg` |
| `--theme-hover-bg` | 悬停背景 | `theme.colors.hoverBg` |
| `--theme-shadow` | 柔和投影 | `theme.colors.border + 40` 透明度 |

> ⚠️ **双轨收敛目标**：预设主题（`themeStore`）与自定义主题（`themeEditorStore`）
> 必须写入**同一组** `--theme-*` 变量，避免两套机制表现不一致。自定义主题编辑器
> 的产物应直接生成可被 `applyTheme()` 消费的变量集。

### 2.2 `--color-*` 基础色板（结构语义，含暗色覆盖）

**亮色（`:root`）**

| 类别 | 变量 | 值 |
|------|------|-----|
| 背景 | `--color-bg-primary` | `#ffffff` |
| 背景 | `--color-bg-secondary` | `#f1f5f9` |
| 背景 | `--color-bg-tertiary` | `#e2e8f0` |
| 背景 | `--color-bg-hover` | `#eef2ff` |
| 背景 | `--color-bg-active` | `#dbeafe` |
| 文字 | `--color-text-primary` | `#1e293b` |
| 文字 | `--color-text-secondary` | `#64748b` |
| 文字 | `--color-text-tertiary` | `#94a3b8` |
| 边框 | `--color-border-primary` | `#e2e8f0` |
| 边框 | `--color-border-secondary` | `#cbd5e1` |
| 边框 | `--color-border-focus` | `#3b82f6` |
| 主色 | `--color-primary` | `#3b82f6` |
| 强调 | `--color-accent` | `#6366f1` |
| 成功 | `--color-success` | `#22c55e` |
| 警告 | `--color-warning` | `#f59e0b` |
| 错误 | `--color-error` | `#ef4444` |
| 信息 | `--color-info` | `#3b82f6` |
| 代码 | `--color-code-bg` | `#1e1e2e` |
| 代码 | `--color-code-text` | `#cdd6f4` |
| 遮罩 | `--color-overlay` | `rgba(0,0,0,0.4)` |

**暗色（`[data-theme='dark']`）** 关键覆盖：

| 变量 | 值 |
|------|-----|
| `--color-bg-primary` | `#0f172a` |
| `--color-bg-secondary` | `#1e293b` |
| `--color-text-primary` | `#f1f5f9` |
| `--color-text-secondary` | `#94a3b8` |
| `--color-border-primary` | `#334155` |
| `--color-primary` | `#60a5fa` |
| `--color-code-bg` | `#1e1e2e` |
| `--color-overlay` | `rgba(0,0,0,0.6)` |

> 状态色在暗色下需保证对比度（如 `--color-success` → `#4ade80`、
> `--color-error` → `#f87171`）。

### 2.3 排版（Typography）

| 令牌 | 值 | 用途 |
|------|-----|------|
| `--font-family-sans` | 系统无衬线（含 PingFang SC / Microsoft YaHei） | UI 与正文西文 |
| `--font-family-mono` | SF Mono / Fira Code / JetBrains Mono | 代码、行内代码 |
| `--font-family-editor` | 系统无衬线 | 编辑器正文 |
| `--font-size-xs` | 11px | 辅助说明 |
| `--font-size-sm` | 13px | 次要文本 |
| `--font-size-base` | 15px | 正文基准 |
| `--font-size-lg` | 17px | 强调正文 |
| `--font-size-xl` | 20px | h3 / 小标题 |
| `--font-size-2xl` | 24px | h2 |
| `--font-size-3xl` | 30px | h1 |
| `--line-height-tight` | 1.25 | 标题 |
| `--line-height-normal` | 1.5 | UI |
| `--line-height-relaxed` | 1.75 | **正文** |

**字重**：`--font-weight-normal:400` / `medium:500` / `semibold:600` / `bold:700`。

### 2.4 间距（Spacing）

`--space-1:4` `--space-2:8` `--space-3:12` `--space-4:16` `--space-5:20`
`--space-6:24` `--space-8:32` `--space-10:40` `--space-12:48`（单位 px）。
组件内边距/ gaps 一律用间距令牌，禁止任意 px。

### 2.5 圆角（Radius）

`--radius-sm:4` `--radius-md:8` `--radius-lg:12` `--radius-xl:16` `--radius-full:9999`。
卡片/面板用 `lg`，按钮/输入用 `md`，胶囊用 `full`。

### 2.6 阴影（Shadow）

`--shadow-sm/md/lg/xl`、`--shadow-dialog`、`--shadow-dropdown`。
暗色下阴影更深（见 `design-tokens.css` 暗色块）。浮层/对话框必须用 `--shadow-dialog` 或
`--shadow-dropdown`，禁止新写 `box-shadow` 字面量。

### 2.7 层级（Z-Index）

`--z-base:0` → `--z-tooltip:1100`，严格分层：sidebar 100 / header 200 / toolbar 300 /
dropdown 500 / overlay 700 / modal 800 / dialog 900 / toast 1000 / tooltip 1100。
新浮层**必须**落在对应层级，禁止用 `z-index: 9999` 之类。

### 2.8 动效（Motion）

`--duration-fast:150ms` `--duration-normal:250ms` `--duration-slow:400ms`，
缓动 `--ease-default/out/in-out`。过渡仅对 `background-color / color / border-color /
opacity / transform` 使用，禁止对 `width/height/box-shadow` 做大范围过渡。

### 2.9 布局尺寸（Layout）

| 令牌 | 值 | 说明 |
|------|-----|------|
| `--sidebar-width` | 260px | 展开侧栏 |
| `--sidebar-width-collapsed` | 48px | 收起侧栏 |
| `--titlebar-height` | 44px | 标题栏 |
| `--toolbar-height` | 40px | 工具栏 |
| `--statusbar-height` | 28px | 状态栏 |
| `--max-content-width` | 720px | **正文最大宽度**（≈72ch） |

---

## 3. 主题系统（Theme System）

- **预设主题**：`src/store/themes.ts`（`newsprint / github / medium / night / pixie / navy /
  aqua / classic` 等），每个含 `bg/text/border/primary/codeBg/hoverBg`。
- **运行时注入**：`themeStore.applyTheme()` 将上述颜色写入 `--theme-*` 并设
  `data-theme="dark|light"`。
- **暗色判定（待修）**：当前用 `bg.toLowerCase() < '#888888'` 字符串比较，**脆弱**。
  目标改为解析 RGB 计算相对亮度（`(0.2126R+0.7152G+0.0722B)`）判定明暗。
- **自定义主题**：`themeEditorStore` 的产物应与预设**共用 `applyTheme` 注入通道**，
  消除双轨不一致。
- **可访问性**：所有预设必须满足正文文字与背景对比度 ≥ 4.5:1（WCAG AA）。

---

## 4. 组件规范（Component Specs）

| 组件 | 背景 | 文字 | 边框 | 圆角 | 阴影 | 备注 |
|------|------|------|------|------|------|------|
| 按钮（默认） | `--theme-primary` | `#fff`（或 `--color-text-inverse`） | 无 | `--radius-md` | — | hover 用 `--color-primary-dark` |
| 按钮（次要） | 透明 | `--theme-text` | `--color-border-secondary` | `--radius-md` | — | hover `--color-bg-hover` |
| 输入/搜索框 | `--theme-bg` | `--theme-text` | `--color-border-primary` | `--radius-md` | — | focus 边框 `--color-border-focus` |
| 面板/对话框 | `--theme-bg` | `--theme-text` | `--color-border-primary` | `--radius-lg` | `--shadow-dialog` | 居中 + `--color-overlay` 遮罩 |
| 下拉菜单 | `--theme-bg` | `--theme-text` | `--color-border-primary` | `--radius-md` | `--shadow-dropdown` | 层级 `--z-dropdown` |
| 侧边栏 | `--color-bg-secondary` | `--color-text-secondary` | 右 `--color-border-primary` | 0 | — | 宽度 `--sidebar-width` |
| 工具栏 | `--theme-bg` | `--color-text-secondary` | 底 `--color-border-primary` | 0 | `--shadow-sm` | 高度 `--toolbar-height` |
| 状态栏 | `--color-bg-secondary` | `--color-text-tertiary` | 顶 `--color-border-primary` | 0 | — | 高度 `--statusbar-height` |
| 命令面板 | 同对话框 | — | — | `--radius-lg` | `--shadow-dialog` | 顶部居中滑入 |
| 代码块 | `--theme-code-bg` | `--color-code-text` | 无 | `--radius-md` | — | 字体 `--font-family-mono` |
| Toast | `--color-bg-inverse` | `--color-text-inverse` | 无 | `--radius-md` | `--shadow-lg` | 层级 `--z-toast` |

**通用规则**
- 所有可点击元素必须有明确的 hover/focus/active 三态，且只用令牌色。
- 焦点环统一用 `outline: 2px solid var(--color-border-focus); outline-offset: 2px;`。
- 图标默认 `--color-text-secondary`，hover `--color-text-primary`。

---

## 5. 排版美学细则（Editor Typography）

编辑器正文（`.editor` / ProseMirror 内容区）遵循：

1. **正文**：`font-size: var(--font-size-base)`（可用户在设置中调大至 `lg`）、
   `line-height: var(--line-height-relaxed)`（1.7）、
   容器 `max-width: var(--max-content-width)` 居中，两侧留白 ≥ `--space-8`。
2. **标题节奏**：h1 `--font-size-3xl` / h2 `--font-size-2xl` / h3 `--font-size-xl`，
   字重 `semibold`，`line-height-tight`，段前间距 > 段后间距形成节奏。
3. **中英文混排**：西文与中文之间保留 `0.25em` 字距（`text-spacing` / `punctuation`），
   标点使用全角；数字与中文间不留断行。
4. **列表/引用/代码**：引用用左侧 `--color-border-secondary` 竖线 + `--color-bg-secondary`
   底；行内代码用 `--color-bg-tertiary` 底 + `--font-family-mono` + `--radius-sm`。
5. **避免**：正文两端对齐（`justify` 在中文下易产生难看空隙）、过小字号（<13px 正文）、
   过宽行（> 90ch）。

---

## 6. 可访问性（Accessibility）

- 颜色对比：正文 ≥ 4.5:1，大字号/辅助文字 ≥ 3:1。
- 动效：全局尊重 `@media (prefers-reduced-motion: reduce)`，此时所有过渡/动画置为 `0ms`
  或 `none`。
- 键盘：命令面板、对话框、菜单均可纯键盘操作；焦点顺序符合视觉顺序。
- 不建议用颜色alone 表达状态，状态色需配合图标/文字。

---

## 7. 使用规则与反模式（Rules & Anti-patterns）

### ✅ 必须
- 颜色/间距/圆角/阴影一律用令牌（`var(--*)`）。
- 主题相关表面用 `--theme-*`，语义状态色用 `--color-*`。
- 新增主题在 `themes.ts` 登记并通过对比度检查。

### ❌ 禁止（反模式）
- **禁止硬编码 hex / rgba**（如 `#3b82f6`、`rgba(0,0,0,.2)`）写在组件 CSS。
- 禁止绕过 `--theme-*` 直接写主题色，导致切换主题露馅。
- 禁止新写 `box-shadow` / `z-index` 字面量（用 `--shadow-*` / `--z-*`）。
- 禁止 `!important` 覆盖令牌（除非修复第三方样式，需注释原因）。

### 迁移清单（待清理的硬编码色文件）
下列组件 CSS 仍存在直接 hex，**需替换为令牌**（数量来自代码审查）：
`Notification.css`(12) · `ThemeEditor.css`(8) · `SlideshowView.css`(6) ·
`TitleBar.css` · `Sidebar-New.css` · `Toolbar.css` · `StatusBar.css` ·
`CommandPalette` · `SearchPanel` · `QuickOpenPanel` · `Settings` · `Dialog` 等
（共约 19 个文件）。用脚本扫描 `src/**/*.css` 中 hex 字面量并逐一替换。

---

## 8. 与改进路线图的对应

本规范支撑此前制定的 UI 美学改进路线：

- **P0** 设计令牌收口（§7 迁移清单）+ 合并主题双轨（§3）+ 排版精修（§5）。
- **P1** 默认收起 chrome（§1 P2）+ 内置主题精修（§3）。
- **P2** 动效系统（§2.8 / §6）+ 响应式统一（接入 `responsive.css` 的 `app-layout` grid）
  + 设置中心统一。

> 任何 AI 代理在改样式前，**先读本文件与 `design-tokens.css`**，确保改动符合令牌体系。
