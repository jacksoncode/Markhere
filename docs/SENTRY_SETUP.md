# Sentry 配置指南

本文档说明如何为 Markhere 配置 Sentry 错误追踪。

## 1. 创建 Sentry 项目

### 步骤 1: 注册 Sentry 账号
1. 访问 https://sentry.io/signup/
2. 选择免费计划（5,000 errors/month）
3. 创建账号

### 步骤 2: 创建新项目
1. 登录后，点击 "Create Project"
2. 平台选择: **React**
3. 项目名称: `markhere`
4. 团队: 选择默认团队
5. 点击 "Create Project"

### 步骤 3: 获取 DSN
创建项目后，Sentry 会显示你的 DSN（Data Source Name），格式如下：
```
https://xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx@o1234567.ingest.sentry.io/1234567
```

复制这个 DSN，稍后会用到。

---

## 2. 配置开发环境

### 本地开发
在项目根目录创建 `.env` 文件：

```bash
# .env (不要提交到 Git)
VITE_SENTRY_DSN=https://your-actual-dsn@sentry.io/project-id
```

### 生产环境
在 CI/CD 环境变量中设置：

**GitHub Actions**:
1. 进入仓库 Settings → Secrets and variables → Actions
2. 点击 "New repository secret"
3. 名称: `VITE_SENTRY_DSN`
4. 值: 粘贴你的 DSN
5. 保存

---

## 3. Sentry 项目设置

### 启用 Source Maps
为了在 Sentry 中看到原始代码位置，需要上传 source maps：

```bash
# 安装 Sentry CLI
npm install --save-dev @sentry/cli

# 在 package.json 添加脚本
{
  "scripts": {
    "build:sentry": "npm run build && sentry-cli sourcemaps upload --org your-org --project markhere dist"
  }
}
```

在项目根目录创建 `.sentryclirc`:
```ini
[defaults]
url=https://sentry.io/
org=your-org-slug
project=markhere

[auth]
token=your-auth-token
```

### 配置告警规则
1. 进入 Sentry 项目 → Alerts
2. 创建新规则:
   - **Critical Errors**: 5分钟内 10+ 错误
   - **Performance Degradation**: LCP > 4s
   - **High Error Rate**: 错误率 > 5%

### 设置通知
1. 进入 Settings → Integrations
2. 连接通知渠道:
   - Email（默认已启用）
   - Slack（推荐）
   - Discord
   - PagerDuty（生产环境）

---

## 4. 监控指标

### 错误追踪
Sentry 会自动捕获：
- JavaScript 运行时错误
- 未处理的 Promise 拒绝
- React 组件错误（通过 ErrorBoundary）
- 网络请求失败

### 性能监控
已配置的性能指标：
- **LCP** (Largest Contentful Paint) - 最大内容绘制
- **CLS** (Cumulative Layout Shift) - 累积布局偏移
- **INP** (Interaction to Next Paint) - 交互响应
- **FCP** (First Contentful Paint) - 首次内容绘制
- **TTFB** (Time to First Byte) - 首字节时间
- **APP_STARTUP** - 应用启动时间
- **FILE_OPEN/SAVE/EXPORT** - 文件操作性能
- **EDITOR_*** - 编辑器操作性能

---

## 5. 调试和测试

### 本地测试 Sentry
```javascript
// 在浏览器控制台测试
throw new Error("Test Sentry integration");
```

检查 Sentry 控制台是否收到错误报告。

### 测试性能监控
打开应用，执行一些操作（打开文件、编辑、导出），然后在 Sentry → Performance 查看数据。

---

## 6. 最佳实践

### 添加用户上下文
在用户登录后设置用户信息：
```typescript
import * as Sentry from '@sentry/react';

Sentry.setUser({
  id: userId,
  email: userEmail,
  username: userName,
});
```

### 添加标签
为错误添加上下文标签：
```typescript
Sentry.setTag('feature', 'editor');
Sentry.setTag('platform', 'tauri');
```

### 记录面包屑
手动记录重要操作：
```typescript
Sentry.addBreadcrumb({
  category: 'file',
  message: 'File saved successfully',
  level: 'info',
  data: {
    filename: 'document.md',
    size: 1024,
  },
});
```

### 过滤敏感信息
在 `beforeSend` 中过滤敏感数据（已在 main.tsx 中配置）。

---

## 7. 费用优化

### 免费计划限制
- 5,000 errors/month
- 10,000 performance units/month
- 1 GB attachments

### 优化建议
1. 设置采样率（已配置）:
   - 生产环境: 10% traces
   - 开发环境: 100% traces
2. 过滤噪音错误:
   - 浏览器扩展错误
   - 第三方脚本错误
3. 使用 `beforeSend` 去重相似错误

---

## 8. CI/CD 集成

### GitHub Actions 配置
在 `.github/workflows/build.yml` 中添加：

```yaml
- name: Upload source maps to Sentry
  if: github.ref == 'refs/heads/main'
  env:
    SENTRY_AUTH_TOKEN: ${{ secrets.SENTRY_AUTH_TOKEN }}
    SENTRY_ORG: your-org
    SENTRY_PROJECT: markhere
  run: |
    npm install -g @sentry/cli
    sentry-cli releases new ${{ github.sha }}
    sentry-cli releases files ${{ github.sha }} upload-sourcemaps dist
    sentry-cli releases finalize ${{ github.sha }}
```

---

## 9. 仪表板和报告

### 推荐仪表板
1. **错误概览**: 错误趋势、影响用户数
2. **性能仪表板**: Web Vitals 趋势
3. **发布健康**: 每个版本的错误率

### 定期检查
- 每日: 检查新错误
- 每周: 分析性能趋势
- 每月: 回顾错误修复率

---

## 10. 故障排查

### Sentry 没有收到错误
1. 检查 DSN 是否正确
2. 确认 `enabled: !!SENTRY_DSN` 为 true
3. 查看浏览器控制台是否有 Sentry 错误
4. 确认网络请求到 `sentry.io` 没有被阻止

### Source maps 不工作
1. 确认构建时生成了 source maps
2. 检查 `.sentryclirc` 配置
3. 验证 auth token 权限

### 性能数据缺失
1. 确认 `tracesSampleRate` > 0
2. 检查浏览器是否支持 Performance API
3. 确认没有 AdBlocker 阻止请求

---

## 相关资源

- [Sentry React 文档](https://docs.sentry.io/platforms/javascript/guides/react/)
- [Sentry Performance 监控](https://docs.sentry.io/product/performance/)
- [Sentry CLI 文档](https://docs.sentry.io/product/cli/)
- [Source Maps 上传](https://docs.sentry.io/platforms/javascript/sourcemaps/)

---

**配置完成后，重启应用并触发一个测试错误，验证 Sentry 正常工作！**
