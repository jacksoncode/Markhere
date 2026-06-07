# Sentry 配置与使用指南

## 快速开始

1. 访问 https://sentry.io/ 注册并创建 React 项目（名称: `markhere`）
2. 获取 DSN（格式: `https://xxx@sentry.io/xxx`）
3. 创建 `.env.local`：`VITE_SENTRY_DSN=你的DSN`
4. 重启应用，触发测试错误验证

## 完整设置

### 本地开发
```
VITE_SENTRY_DSN=https://your-dsn@sentry.io/project
VITE_APP_VERSION=1.0.0
```

### GitHub Actions Secrets
`Settings → Secrets and variables → Actions → VITE_SENTRY_DSN`

### 监控指标
- 错误：JS 运行时 / Promise 拒绝 / React ErrorBoundary
- 性能：LCP, CLS, INP, FCP, TTFB, APP_STARTUP
- 文件：FILE_OPEN/SAVE/EXPORT
- 编辑器：EDITOR_* 操作

### 告警建议
- P0：5 分钟内 10+ 错误 → 立即通知
- P1：LCP > 4s → Slack 通知
- P2：错误率 > 5% → 邮件通知

### 测试
浏览器控制台执行：`throw new Error("Test Sentry")`

### 费用
免费计划：5,000 errors/month, 10,000 performance units/month  
生产环境 traces 已设 10% 采样率
