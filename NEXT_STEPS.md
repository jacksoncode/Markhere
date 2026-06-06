# 下一步开发计划

## 🎯 立即执行 (本周)

### 1. 发布 v0.4.9 稳定版
```bash
npm version patch
git push origin main --tags
```

### 2. 添加错误追踪服务
**优先级**: P1
**工作量**: 2天

选项：
- [ ] Sentry (推荐 - 免费额度够用)
- [ ] Bugsnag
- [ ] 自建日志服务

实现步骤：
```bash
npm install @sentry/react @sentry/tauri
```

在 `src/main.tsx` 添加：
```typescript
import * as Sentry from "@sentry/react";

Sentry.init({
  dsn: "YOUR_SENTRY_DSN",
  environment: import.meta.env.MODE,
  integrations: [
    new Sentry.BrowserTracing(),
    new Sentry.Replay(),
  ],
  tracesSampleRate: 0.1,
  replaysSessionSampleRate: 0.1,
  replaysOnErrorSampleRate: 1.0,
});
```

### 3. 性能监控基准
**优先级**: P2
**工作量**: 1天

- [ ] 添加 Web Vitals 监控
- [ ] 记录启动时间
- [ ] 追踪文件加载性能

```bash
npm install web-vitals
```

---

## 📈 短期优化 (2周内)

### 1. 完善 Windows 测试
当前 Windows 冒烟测试不稳定，需要：
- [ ] 增加 WebDriver 等待时间
- [ ] 添加更多启动验证点
- [ ] 在 Windows VM 上本地测试

### 2. 优化 Mermaid 包体积
当前 Mermaid 单个 chunk 达到 660KB：
- [ ] 按需加载图表类型（只加载用户使用的）
- [ ] 考虑使用 Mermaid Lite 版本

### 3. 添加性能预算
在 `vite.config.ts` 添加：
```typescript
build: {
  chunkSizeWarningLimit: 500, // 当前是默认值
  reportCompressedSize: true,
}
```

---

## 🔮 中期规划 (1-2个月)

### 1. 插件市场基础设施
- [ ] 设计插件 manifest schema
- [ ] 实现插件安装/卸载 UI
- [ ] 创建插件开发文档和脚手架
- [ ] 发布 3-5 个官方插件示例

### 2. 协作功能增强
- [ ] 添加协作者光标显示
- [ ] 实现评论/批注功能
- [ ] 版本历史对比 UI
- [ ] 冲突解决界面

### 3. AI 功能深化
- [ ] 集成 LanguageTool API (已在 README 提及)
- [ ] 智能内容建议
- [ ] 自动摘要生成
- [ ] 多语言翻译工具

---

## 🎨 用户体验优化

### 1. 首次启动引导
- [ ] Welcome 对话框
- [ ] 快速入门教程
- [ ] 示例文档模板

### 2. 键盘快捷键优化
- [ ] 可自定义快捷键
- [ ] 快捷键冲突检测
- [ ] 快捷键速查表

### 3. 主题系统升级
- [ ] 更多内置主题
- [ ] 主题导入/导出
- [ ] 社区主题市场

---

## 🐛 已知问题追踪

### 高优先级
- [ ] Windows 平台偶发崩溃（已修复菜单问题，需持续监控）
- [ ] 大文件（>5MB）加载性能问题

### 中优先级
- [ ] 协作模式下的偶发同步延迟
- [ ] 某些 Mermaid 图表类型渲染慢
- [ ] 图片粘贴在 Linux 上不稳定

### 低优先级
- [ ] 暗色主题下部分图标对比度不足
- [ ] 移动端响应式布局需要优化

---

## 📚 技术债务

### 测试覆盖率
当前有 1807 个测试，但需要：
- [ ] 增加 E2E 测试覆盖率（当前只有基础冒烟测试）
- [ ] 添加视觉回归测试
- [ ] 集成测试覆盖率报告

### 依赖管理
- [ ] 定期更新依赖（设置 Dependabot）
- [ ] 审计 React 19 兼容性
- [ ] 锁定关键依赖版本

### 文档完善
- [ ] API 文档生成
- [ ] 贡献者指南细化
- [ ] 架构决策记录 (ADR)

---

## 🚀 长期愿景 (3-6个月)

### 1. 移动端支持
Tauri 2 已支持 iOS/Android：
- [ ] 响应式 UI 适配
- [ ] 触控手势优化
- [ ] 移动端特定功能（语音输入、相机）

### 2. 云服务集成
- [ ] WebDAV 支持
- [ ] GitHub/GitLab 直接编辑
- [ ] 自建同步服务器方案

### 3. 企业级特性
- [ ] 权限管理系统
- [ ] 审计日志
- [ ] 团队协作工作区
- [ ] 自定义品牌部署

---

## 📊 成功指标

### 性能目标
- 启动时间 < 1.5s (当前约 2s)
- Time to Interactive < 2s
- 首屏加载 < 800ms

### 用户指标
- GitHub Stars > 1000 (当前约 100)
- 月活用户 > 5000
- 用户留存率 > 60%

### 质量指标
- 测试覆盖率 > 80%
- 构建成功率 > 95%
- 线上错误率 < 0.1%
