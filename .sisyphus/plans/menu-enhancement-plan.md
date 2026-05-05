# Markhere 菜单功能补充计划

> 目标：对标 Typora 完整菜单体系，补齐 39 项缺失功能

## 统计概览

| 状态 | 数量 |
|------|------|
| Typora 总菜单项 | 112项 |
| Markhere 已实现 | 73项 (65%) |
| 缺失功能 | 39项 (35%) |
| Markhere 独有优势 | 7项 |

---

## P0 - 核心缺失 (影响基础体验)

### 1. Open Quickly (快速打开面板)
- **Typora**: ⌘⇧O / Ctrl+P
- **功能**: 类似VSCode的快速文件搜索面板
- **实现方案**:
  - 创建 `QuickOpenPanel.tsx` 组件
  - 使用 fuzzy search (fuse.js) 匹配文件名
  - 从 localStorage 读取最近文件 + 当前文件夹扫描
  - 支持键盘导航 (↑↓ Enter)
- **工作量**: 中等 (需要新组件 + 文件系统API)
- **文件**:
  - `src/components/QuickOpen/QuickOpenPanel.tsx` (新建)
  - `src/components/QuickOpen/QuickOpenPanel.css` (新建)
  - `src/components/TitleBar/TitleBar.tsx` (修改 - 添加菜单项)

### 2. Paste As Plain Text (粘贴为纯文本)
- **Typora**: ⌘⇧V / Ctrl+Shift+V
- **功能**: 粘贴时去除所有格式
- **实现方案**:
  - 读取剪贴板文本
  - 使用 `editor.commands.insertContent(text)` 而非HTML解析
- **工作量**: 低 (单个函数)
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加 handlePasteAsPlainText)

### 3. Word Count (字数统计显示)
- **Typora**: 悬停标题栏显示，可设置始终显示
- **功能**: 显示字数、段落、句子、阅读时间
- **实现方案**:
  - 使用现有 `useWordCount` hook
  - 在标题栏或状态栏添加字数显示区域
  - 点击显示详细统计
- **工作量**: 低 (已有hook，只需UI)
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加字数显示)
  - `src/components/StatusBar/StatusBar.tsx` (可选 - 状态栏集成)

### 4. Close Window (关闭窗口)
- **Typora**: ⌘W / Ctrl+W
- **功能**: 关闭当前编辑窗口
- **实现方案**:
  - 使用 Tauri `getCurrentWindow().close()`
  - 提示未保存时询问保存
- **工作量**: 低
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加 handleClose)

### 5. Sidebar 模式切换 (Outline / File List / File Tree)
- **Typora**: ⌘⌃1/2/3 切换三种侧边栏模式
- **功能**:
  - Outline: 文档大纲 (已有)
  - Articles (File List): 文件列表视图
  - File Tree: 文件树视图
- **实现方案**:
  - 扩展 `uiStore` 添加 `sidebarMode: 'outline' | 'fileList' | 'fileTree'`
  - 修改 Sidebar 组件支持三种模式
  - 需要文件夹打开功能
- **工作量**: 高 (需要文件系统浏览功能)
- **文件**:
  - `src/store/uiStore.ts` (添加 sidebarMode)
  - `src/components/Sidebar/Sidebar.tsx` (重构)
  - `src/components/Sidebar/FileList.tsx` (新建)
  - `src/components/Sidebar/FileTree.tsx` (新建)

---

## P1 - 重要功能 (提升编辑效率)

### 6. Increase/Decrease Heading Level
- **Typora**: ⌘= / ⌘- (Ctrl+= / Ctrl+-)
- **功能**: 快捷键升降标题级别
- **实现方案**:
  - 检测当前标题级别
  - 循环升降: H1→H2→H3→H4→H5→H6→Paragraph
- **工作量**: 低
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加两个函数)
  - `src/hooks/useKeyboardShortcuts.ts` (注册快捷键)

### 7. Jump to Top/Selection/Bottom
- **Typora**: ⌘↑ / ⌘J / ⌘↓
- **功能**: 快速跳转到文档顶部/选中内容/底部
- **实现方案**:
  - Top: `editor.commands.focus('start')`
  - Selection: `editor.commands.setTextSelection(selection)`
  - Bottom: `editor.commands.focus('end')`
- **工作量**: 低
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加三个函数)

### 8. Switch Documents (Ctrl+Tab)
- **Typora**: ⌘` / Ctrl+Tab
- **功能**: 在打开的文档间切换
- **实现方案**:
  - 需要 multi-tab 支持 (已有 tabsStore)
  - 实现标签页切换循环
- **工作量**: 中 (需要标签页系统完善)
- **文件**:
  - `src/store/tabsStore.ts` (已有)
  - `src/hooks/useKeyboardShortcuts.ts` (注册切换逻辑)

### 9. Horizontal Rule (水平分割线)
- **Typora**: 输入 `***` 或 `---`
- **功能**: 插入水平分割线
- **实现方案**:
  - 添加 HorizontalRule extension
  - 或使用 `editor.commands.insertContent('\n---\n')`
- **工作量**: 低
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加菜单项)
  - `src/extensions/` (可选 - 添加extension)

### 10. YAML Front Matter
- **Typora**: 输入 `---` + Return 在文档开头
- **功能**: 插入 YAML 元数据块
- **实现方案**:
  - 插入模板: `---\ntitle: \nauthor: \ndate: \n---\n\n`
- **工作量**: 低
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加菜单项)

### 11. Table of Contents (TOC)
- **Typora**: 输入 `[toc]` + Return
- **功能**: 自动生成目录，提取所有标题
- **实现方案**:
  - 创建 TOC extension
  - 实时解析文档标题
  - 生成带链接的目录列表
- **工作量**: 中高
- **文件**:
  - `src/extensions/TocExtension.ts` (新建)
  - `src/components/TitleBar/TitleBar.tsx` (添加菜单项)

### 12. Footnote (脚注)
- **Typora**: `[^1]` 和 `[^1]: text`
- **功能**: 学术写作脚注支持
- **实现方案**:
  - 已有 FootnoteExtension (需验证)
  - 添加菜单项快速插入
- **工作量**: 低 (已有extension)
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx` (添加菜单项)
  - `src/extensions/FootnoteExtension.ts` (检查)

### 13. Diagrams (Mermaid / Sequence / Flowchart)
- **Typora**: Code block with `mermaid`, `sequence`, `flowchart` language
- **功能**: 图表渲染支持
- **实现方案**:
  - Mermaid extension (已有?)
  - 需要集成 mermaid.js / flowchart.js
  - 添加 Diagram 菜单子项
- **工作量**: 高
- **文件**:
  - `src/extensions/MermaidExtension.ts` (新建/检查)
  - `src/components/TitleBar/TitleBar.tsx` (添加Diagram子菜单)

---

## P2 - 增强功能 (锦上添花)

### 14. New Window / New Tab
- **Typora**: ⌘⇧N / ⌘T
- **功能**: 多窗口多标签页支持
- **实现方案**:
  - New Window: Tauri `WebviewWindowBuilder`
  - New Tab: 已有 tabsStore，完善UI
- **工作量**: 高 (多窗口复杂)
- **文件**:
  - `src-tauri/src/lib.rs` (添加多窗口命令)
  - `src/components/TitleBar/TitleBar.tsx`

### 15. Reopen Closed File
- **Typora**: ⌘⇧T / Ctrl+Shift+T
- **功能**: 恢复最近关闭的文件
- **实现方案**:
  - 记录关闭的文件列表 (closedFiles)
  - 从 localStorage 恢复
- **工作量**: 低
- **文件**:
  - `src/store/fileStore.ts` (添加 closedFiles 数组)
  - `src/components/TitleBar/TitleBar.tsx`

### 16. Export Image (PNG/JPEG)
- **Typora**: File → Export → Image
- **功能**: 导出为图片格式
- **实现方案**:
  - 使用 html2canvas 或 Puppeteer
  - Rust端调用截图库
- **工作量**: 高
- **文件**:
  - `src-tauri/src/lib.rs` (添加导出命令)
  - `src/components/TitleBar/TitleBar.tsx`

### 17. Select Style Scope
- **Typora**: ⌘E / Ctrl+E
- **功能**: 选中相同格式的文本范围
- **实现方案**:
  - 分析当前 mark 的范围
  - 扩展选择到相同 mark 的边界
- **工作量**: 中
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx`

### 18. Delete Word / Delete Row
- **Typora**: ⌘⇧D / ⌘⇧⌫
- **功能**: 快速删除单词/表格行
- **实现方案**:
  - Delete Word: 扩展选择到单词边界后删除
  - Delete Row: 表格中删除当前行
- **工作量**: 低
- **文件**:
  - `src/components/TitleBar/TitleBar.tsx`

### 19. Image Management (Upload/Copy/Move)
- **Typora**: Format → Image → 子菜单
- **功能**: 图片上传到云端、复制到文件夹、移动位置
- **实现方案**:
  - 需要图片服务集成 (iPic, AWS S3, etc.)
  - 文件系统操作 (copy, move)
- **工作量**: 高
- **文件**:
  - `src/services/imageService.ts` (新建)
  - `src-tauri/src/lib.rs` (文件操作)
  - `src/components/TitleBar/TitleBar.tsx`

### 20. Callouts (GitHub Alerts)
- **Typora**: GitHub风格的提示框
- **功能**: NOTE, TIP, IMPORTANT, WARNING, CAUTION
- **实现方案**:
  - 创建 Callout extension
  - 解析 `[!NOTE]` 等语法
- **工作量**: 中
- **文件**:
  - `src/extensions/CalloutExtension.ts` (新建)
  - `src/components/TitleBar/TitleBar.tsx` (添加菜单)

### 21-25. 更多导出格式
- **LaTeX**: 需要 Pandoc
- **MediaWiki**: 需要 Pandoc
- **reStructuredText**: 需要 Pandoc
- **TextBundle**: 打包格式
- **工作量**: 高 (依赖Pandoc)
- **文件**: `src-tauri/src/lib.rs`

---

## P3 - macOS独有 (可选)

### 26. Share (分享)
- **macOS**: File → Share
- **功能**: macOS系统分享面板
- **实现方案**: Tauri `share` plugin
- **工作量**: 中

### 27. Spelling and Grammar
- **macOS**: 系统拼写检查
- **功能**: 调用macOS原生拼写检查
- **实现方案**: Tauri调用系统API
- **工作量**: 中高

### 28. Substitutions (文本替换)
- **macOS**: 智能引号、智能破折号等
- **功能**: macOS文本替换功能
- **实现方案**: 系统级集成
- **工作量**: 中

### 29. Emoji & Symbols
- **macOS**: Edit → Emoji & Symbols
- **功能**: 系统表情符号选择器
- **实现方案**: 打开系统Emoji面板
- **工作量**: 低

### 30. Touch Bar
- **macOS**: MacBook触控栏
- **功能**: 快捷格式按钮
- **实现方案**: Tauri Touch Bar API
- **工作量**: 中高

---

## 实施顺序建议

### 第一阶段 (P0核心)
1. Paste As Plain Text ✅ 低工作量
2. Word Count ✅ 低工作量
3. Close Window ✅ 低工作量
4. Increase/Decrease Heading Level ✅ 低工作量
5. Jump to Top/Selection/Bottom ✅ 低工作量

### 第二阶段 (P1重要)
6. Horizontal Rule ✅ 低工作量
7. YAML Front Matter ✅ 低工作量
8. Footnote ✅ 低工作量
9. Switch Documents (完善标签页)
10. Open Quickly (需要新组件)

### 第三阶段 (P1中等难度)
11. Reopen Closed File
12. Table of Contents (TOC)
13. Sidebar 模式切换 (文件系统浏览)
14. Diagrams (Mermaid集成)

### 第四阶段 (P2高级)
15. New Window/Tab (多窗口)
16. Image Management
17. Callouts
18. Export Image

### 第五阶段 (P3 macOS独有)
19-23. macOS系统集成功能

---

## 资源需求

### 依赖包建议
```json
{
  "fuse.js": "^6.6.2",      // 快速打开 - fuzzy search
  "mermaid": "^10.9.0",     // 图表渲染
  "html2canvas": "^1.4.1"  // 导出图片 (可选)
}
```

### Rust依赖
```toml
[dependencies]
tauri-plugin-share = "2.0"  # macOS分享
walkdir = "2.4"             # 文件树遍历
```

---

## 预估时间

| 阶段 | 功能数 | 预估时间 |
|------|--------|----------|
| 第一阶段 (P0低难度) | 5项 | 1-2天 |
| 第二阶段 (P1低难度) | 5项 | 2-3天 |
| 第三阶段 (P1中难度) | 4项 | 3-5天 |
| 第四阶段 (P2高难度) | 4项 | 5-7天 |
| 第五阶段 (P3 macOS) | 5项 | 可选 |
| **总计** | **23项核心** | **11-17天** |

---

## 成功指标

- [ ] File 菜单完整度达到 90%
- [ ] Edit 菜单完整度达到 85%
- [ ] Paragraph 菜单完整度达到 90%
- [ ] Format 菜单完整度达到 90%
- [ ] View 菜单完整度达到 85%
- [ ] 整体对标 Typora 达到 85%+

---

## 附录：Typora快捷键完整列表

### File
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| New | ⌘N | Ctrl+N |
| New Window | ⌘⇧N | Ctrl+Shift+N |
| New Tab | ⌘T | - |
| Open | ⌘O | Ctrl+O |
| Open Quickly | ⌘⇧O | Ctrl+P |
| Reopen Closed | ⌘⇧T | Ctrl+Shift+T |
| Save | ⌘S | Ctrl+S |
| Save As | ⌘⇧S | Ctrl+Shift+S |
| Preferences | ⌘, | Ctrl+, |
| Close | ⌘W | Ctrl+W |

### Edit
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Undo | ⌘Z | Ctrl+Z |
| Redo | ⌘⇧Z | Ctrl+Shift+Z |
| Cut | ⌘X | Ctrl+X |
| Copy | ⌘C | Ctrl+C |
| Copy As Markdown | ⌘⇧C | Ctrl+Shift+C |
| Paste | ⌘V | Ctrl+V |
| Paste As Plain | ⌘⇧V | Ctrl+Shift+V |
| Select All | ⌘A | Ctrl+A |
| Select Line | ⌘L | Ctrl+L |
| Select Word | ⌘D | Ctrl+D |
| Select Style | ⌘E | Ctrl+E |
| Delete Word | ⌘⇧D | Ctrl+Shift+D |
| Delete Row | ⌘⇧⌫ | Ctrl+Shift+Backspace |
| Jump Top | ⌘↑ | Ctrl+Home |
| Jump Selection | ⌘J | Ctrl+J |
| Jump Bottom | ⌘↓ | Ctrl+End |
| Find | ⌘F | Ctrl+F |
| Find Next | ⌘G | F3 |
| Find Prev | ⌘⇧G | Shift+F3 |
| Replace | ⌘H | Ctrl+H |

### Paragraph
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Heading 1-6 | ⌘1-6 | Ctrl+1-6 |
| Paragraph | ⌘0 | Ctrl+0 |
| Increase Heading | ⌘= | Ctrl+= |
| Decrease Heading | ⌘- | Ctrl+- |
| Table | ⌘⌥T | Ctrl+T |
| Code Fences | ⌘⌥C | Ctrl+Shift+K |
| Math Block | ⌘⌥B | Ctrl+Shift+M |
| Quote | ⌘⌥Q | Ctrl+Shift+Q |
| Ordered List | ⌘⌥O | Ctrl+Shift+[ |
| Unordered List | ⌘⌥U | Ctrl+Shift+] |
| Indent | ⌘[ / Tab | Ctrl+[ / Tab |
| Outdent | ⌘] / ⇧Tab | Ctrl+] / ⇧Tab |

### Format
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Bold | ⌘B | Ctrl+B |
| Italic | ⌘I | Ctrl+I |
| Underline | ⌘U | Ctrl+U |
| Code | ⌘⇧` | Ctrl+Shift+` |
| Strike | ⌃⇧` | Alt+Shift+5 |
| Link | ⌘K | Ctrl+K |
| Image | ⌘⌃I | Ctrl+Shift+I |
| Clear Format | ⌘\ | Ctrl+\ |

### View
| Action | macOS | Windows/Linux |
|--------|-------|---------------|
| Toggle Sidebar | ⌘⇧L | Ctrl+Shift+L |
| Outline | ⌘⌃1 | Ctrl+Shift+1 |
| Articles | ⌘⌃2 | Ctrl+Shift+2 |
| File Tree | ⌘⌃3 | Ctrl+Shift+3 |
| Source Mode | ⌘/ | Ctrl+/ |
| Focus Mode | F8 | F8 |
| Typewriter Mode | F9 | F9 |
| Fullscreen | ⌘⌥F | F11 |
| Zoom In | - | Ctrl+Shift+= |
| Zoom Out | - | Ctrl+Shift+- |
| Actual Size | - | Ctrl+Shift+0 |
| Switch Docs | ⌘` | Ctrl+Tab |
| DevTools | - | Shift+F12 |