# 🧩 Markhere Plugin SDK

## 快速开始

插件是标准的 JavaScript/TypeScript 模块，放在 `plugins/` 目录下即可被自动加载。

### 最简插件

```javascript
// plugins/hello-world/index.js
export default {
  name: 'Hello World',
  version: '1.0.0',
  
  onLoad(sdk) {
    sdk.ui.showNotification('Hello from my first plugin!');
  },
  
  onUnload() {
    console.log('Plugin unloaded');
  }
};
```

### 清单格式 (package.json)

```json
{
  "id": "my-plugin",
  "name": "My Plugin",
  "version": "1.0.0",
  "author": "Your Name",
  "description": "What it does",
  "category": "editor",
  "tags": ["example"],
  "permissions": ["fs.read", "network"],
  "main": "index.js"
}
```

## SDK API 参考

### Editor API
```typescript
sdk.editor.getContent(): string
sdk.editor.setContent(markdown: string): void
sdk.editor.getSelection(): { from: number; to: number }
sdk.editor.insertText(text: string): void
sdk.editor.onChange(callback: (content: string) => void): () => void
```

### UI API
```typescript
sdk.ui.showNotification(message: string, type?: 'info'|'success'|'error'): void
sdk.ui.addStatusBarItem(config: { text: string; onClick?: () => void }): void
sdk.ui.addSidebarTab(config: { id: string; label: string; render: () => HTMLElement }): void
sdk.ui.showDialog(config: { title: string; content: string; buttons: Array<{ label: string; onClick: () => void }> }): void
```

### File System API
```typescript
sdk.fs.readFile(path: string): Promise<string>
sdk.fs.writeFile(path: string, content: string): Promise<void>
sdk.fs.listDir(path: string): Promise<string[]>
sdk.fs.fileExists(path: string): Promise<boolean>
```

### Storage API
```typescript
sdk.storage.get(key: string): any
sdk.storage.set(key: string, value: any): void
sdk.storage.remove(key: string): void
```

### AI API
```typescript
sdk.ai.chat(prompt: string, options?: { model?: string; maxTokens?: number }): Promise<string>
sdk.ai.getProviders(): Promise<Array<{ id: string; name: string }>>
```

## 权限列表

| 权限 | 说明 |
|------|------|
| `fs.read` | 读取文件系统 |
| `fs.write` | 写入文件系统 |
| `network` | 网络请求 |
| `clipboard.read` | 读取剪贴板 |
| `clipboard.write` | 写入剪贴板 |
| `ui.render` | 渲染 UI 组件 |
| `editor.extend` | 扩展编辑器功能 |

## 完整示例

```
docs/examples/
├── plugin-hello-world/    最简入门
├── plugin-status-bar/     状态栏定制
├── plugin-custom-export/  自定义导出
└── theme-starter/          主题开发模板
```

## 发布插件

1. 在 GitHub 创建仓库
2. 添加 `manifest.json`
3. 提交到 [Markhere Plugin Registry](https://github.com/jacksoncode/Markhere-plugins)
4. 通过审核后可被市场搜索到

## 主题开发

主题是 `.theme.json` 文件：

```json
{
  "name": "My Theme",
  "author": "Your Name",
  "colors": {
    "bg-primary": "#FFFFFF",
    "text-primary": "#333333",
    "border-primary": "#E0E0E0",
    "color-primary": "#3B82F6",
    "bg-secondary": "#F5F5F5",
    "text-secondary": "#666666"
  }
}
```

必填颜色变量: `bg-primary, text-primary, border-primary, color-primary, bg-secondary, text-secondary`
