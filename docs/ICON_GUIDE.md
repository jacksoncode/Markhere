# 应用图标设计指南

本文档提供 Markhere 应用图标的设计建议和要求。

---

## 当前状态

| 文件 | 尺寸 | 大小 | 问题 |
|------|------|------|------|
| 32x32.png | 32x32 | 104 bytes | ⚠️ 占位符图标 |
| 128x128.png | 128x128 | 299 bytes | ⚠️ 占位符图标 |
| 128x128@2x.png | 256x256 | 666 bytes | ⚠️ 占位符图标 |

**缺失文件:**
- ❌ `icon.icns` (macOS)
- ❌ `icon.ico` (Windows)
- ❌ 512x512.png
- ❌ 1024x1024.png

---

## 设计要求

### 品牌元素

| 元素 | 建议 |
|------|------|
| **主题** | Markdown 编辑、写作、文档 |
| **风格** | 现代、简洁、专业 |
| **颜色** | 可使用渐变，但需在深色/浅色模式下都清晰 |
| **形状** | 建议圆角矩形（符合现代桌面图标风格） |

### 设计灵感

| 元素 | 可参考 |
|------|------|
| **M** 字母 | Markdown 标志性符号 |
| **笔/铅笔** | 写作象征 |
| **文档** | 编辑器本质 |
| **代码符号** | `< >` 或 `#` |

---

## 图标规格

### 必需尺寸

| 用途 | 尺寸 | 格式 |
|------|------|------|
| macOS | 16, 32, 64, 128, 256, 512, 1024 | `.icns` |
| Windows | 16, 32, 48, 64, 128, 256 | `.ico` |
| Linux | 32, 48, 64, 128, 256, 512 | PNG |

### macOS `.icns` 结构

```
icon.icns 包含:
├── ic04 (16x16)
├── ic05 (32x32)
├── ic07 (128x128)
├── ic08 (256x256)
├── ic09 (512x512)
├── ic10 (1024x1024)
├── ic11 (32x32 @2x)
├── ic12 (64x64 @2x)
├── ic13 (256x256 @2x)
└── ic14 (512x512 @2x)
```

---

## 生成方法

### 方法一：使用 Tauri CLI

```bash
# 自动从源图标生成所有格式
npx tauri icon /path/to/source-icon.png
```

源图标要求：
- 尺寸：1024x1024 或 512x512
- 格式：PNG（带透明通道）
- 内容：正方形，居中设计

### 方法二：手动生成

#### macOS `.icns`

```bash
# 使用 iconutil（macOS 内置）
mkdir icon.iconset
# 将各尺寸 PNG 放入 iconset 目录
iconutil -c icns icon.iconset -o icon.icns
```

#### Windows `.ico`

```bash
# 使用 ImageMagick
convert icon-16.png icon-32.png icon-48.png icon-64.png \
        icon-128.png icon-256.png icon.ico

# 或使用在线工具
# https://icoconvert.com/
```

---

## 设计工具推荐

| 工具 | 适用场景 | 链接 |
|------|----------|------|
| **Figma** | 专业 UI 设计 | [figma.com](https://figma.com) |
| **Sketch** | macOS 设计 | [sketch.com](https://sketch.com) |
| **Affinity Designer** | 矢量设计 | [affinity.serif.com](https://affinity.serif.com) |
| **Canva** | 快速设计 | [canva.com](https://canva.com) |
| **GIMP** | 免费/开源 | [gimp.org](https://gimp.org) |

---

## 设计流程建议

### 1. 设计源图标 (1024x1024)

- 使用矢量工具设计
- 确保在缩小后仍清晰可辨
- 测试深色/浅色背景下的效果

### 2. 导出各尺寸

```
1024x1024 → 源文件
512x512   → 50% 缩放
256x256   → 25% 缩放
128x128   → 12.5% 缩放
64x64     → 6.25% 缩放
32x32     → 3.125% 缩放
16x16     → 1.5625% 缩放
```

### 3. 使用 Tauri CLI 生成

```bash
# 将 1024x1024.png 放在项目目录
npx tauri icon 1024x1024.png

# 自动生成:
# - src-tauri/icons/32x32.png
# - src-tauri/icons/128x128.png
# - src-tauri/icons/128x128@2x.png
# - src-tauri/icons/icon.icns
# - src-tauri/icons/icon.ico
```

---

## 设计参考案例

### 类似应用图标风格

| 应用 | 风格 | 可参考点 |
|------|------|----------|
| **Typora** | 极简字母 T | 单字母品牌化 |
| **Bear** | 熊头轮廓 | 动物形象 |
| **Notion** | 简约 N 字母 | 渐变 + 几何 |
| **Obsidian** | 宝石形状 | 独特几何图形 |
| **VS Code** | 代码 + 无限循环 | 功能象征 |

---

## 验证清单

设计完成后检查：

- [ ] 在 16x16 仍可识别
- [ ] 深色背景测试
- [ ] 浅色背景测试
- [ ] 无侵权风险
- [ ] 已生成 `.icns`
- [ ] 已生成 `.ico`
- [ ] 更新 `tauri.conf.json` 图标路径

---

## 资源链接

- [Apple Human Interface Guidelines - App Icons](https://developer.apple.com/design/human-interface-guidelines/app-icons)
- [Microsoft Design Guidelines - Icons](https://docs.microsoft.com/en-us/windows/apps/design/style/iconography)
- [Tauri Icon Guide](https://tauri.app/v1/guides/features/app-icons/)

---

<div align="center">

**优秀的图标让应用更具辨识度**

</div>