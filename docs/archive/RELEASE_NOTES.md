# Markhere v0.4.0 Release Notes

发布日期: 2026年5月5日

## 🎉 重要更新

### ✨ 新功能

#### 1. 双向链接与知识图谱
- **WikiLink语法支持**: 使用 `[[文件名]]` 或 `[[文件名|显示文本]]` 创建双向链接
- **知识图谱可视化**: Canvas绘制的力导向图展示文档链接关系
- **链接跳转**: 点击链接快速跳转到目标文档
- **反向链接追踪**: 自动追踪所有指向当前文档的链接

#### 2. AI助手集成
- **12家国内AI供应商支持**:
  - DeepSeek (深度求索)
  - 智谱AI (GLM-4)
  - Moonshot (Kimi)
  - 通义千问 (Qwen)
  - MiniMax
  - 阶跃星辰 (StepStars)
  - 讯飞星火 (Spark)
  - 百川智能 (Baichuan)
  - 硅基流动 (SiliconFlow)
  - 阿里云百炼
  - 火山引擎 (豆包)
  - 腾云 (混元)
  - Ollama (本地模型)
- **自动模型获取**: 输入API-Key后自动获取可用模型列表
- **智能补全**: AI辅助写作、润色、翻译、摘要等功能

#### 3. 插件系统
- **PluginAPI接口**: 完整的插件开发API
  - 注册命令、扩展、面板
  - 访问编辑器、文件、设置
  - 本地存储、Tauri命令调用
- **插件生命周期**: onLoad, onUnload, onActivate, onDeactivate
- **插件管理器**: 启用/禁用/移除插件

#### 4. 图片存储配置
- **三种存储模式**:
  - 本地目录: 指定固定路径保存
  - 相对路径: 相对于文档位置保存
  - 云端图床: 上传到云存储
- **云服务商支持**:
  - 阿里云 OSS
  - 腾讯云 COS
  - AWS S3
  - Cloudflare R2
  - 自定义图床

### 🚀 性能优化

#### 5. 大文件处理
- **分块加载**: 大文件按需加载,避免内存溢出
- **虚拟滚动**: 长文档渲染优化,只渲染可视区域
- **延迟渲染**: 复杂元素延迟渲染提升响应速度

### 📝 文档更新

- **完整用户手册**: 详细的功能说明和使用指南
- **API文档**: 插件开发和扩展接口文档
- **快捷键参考**: 全部键盘快捷键速查表

## 🔧 技术改进

### 代码质量
- TypeScript strict mode全面合规
- 所有新增功能类型安全验证
- 构建无警告无错误

### 国际化
- 完整中英文翻译支持
- 新增AI助手、插件、图片存储等翻译

### 文件结构
```
新增文件:
- src/extensions/WikiLink/        # 双向链接扩展
- src/components/KnowledgeGraph/  # 知识图谱组件
- src/services/aiProviders.ts     # AI供应商配置
- src/components/AIProviderSettings/ # AI设置界面
- src/store/aiProviderStore.ts    # AI供应商状态
- src/plugins/PluginAPI.ts        # 插件API
- src/plugins/PluginLoader.ts     # 插件加载器
- src/components/PluginManager/   # 插件管理界面
- src/store/pluginStore.ts        # 插件状态
- src/services/imageStorageConfig.ts # 图片存储配置
- src/components/ImageStorageSettings/ # 图片设置界面
- src/store/imageStorageStore.ts  # 图片存储状态
```

## 🐛 Bug修复

- 修复WikiLink扩展类型兼容问题
- 修复PluginAPI导入循环依赖
- 修复KnowledgeGraph未使用变量警告
- 修复AIProviderSettings未使用导入

## 📦 下载

- macOS: `.dmg`
- Windows: `.msi`, `.exe`
- Linux: `.deb`, `.AppImage`

## 🙏 致谢

感谢所有贡献者和用户反馈!

---

**升级建议**: 
- v0.3.0用户可直接升级,配置自动迁移
- 新安装用户推荐先配置AI供应商和图片存储路径

**下一步计划**:
- v0.5.0: 实时协作增强、移动端支持
- v0.6.0: 云端同步、版本历史可视化