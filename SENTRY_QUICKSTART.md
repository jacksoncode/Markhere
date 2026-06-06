# Sentry 快速配置脚本

## 自动化配置步骤

### 1. 创建 Sentry 项目（手动）

访问 https://sentry.io/ 并：
1. 注册/登录账号
2. 创建新项目，选择 "React"
3. 项目名称: `markhere`
4. 复制 DSN

### 2. 配置环境变量

```bash
# 创建本地环境变量文件
cat > .env.local << 'EOF'
# Sentry 配置
VITE_SENTRY_DSN=你的DSN地址

# 应用版本（自动从 package.json 读取）
VITE_APP_VERSION=0.4.9
EOF

# 添加到 .gitignore（已包含）
echo ".env.local" >> .gitignore
```

### 3. GitHub Secrets 配置

```bash
# 使用 GitHub CLI 添加 Secret
gh secret set VITE_SENTRY_DSN --body "你的DSN地址"

# 或者手动在 GitHub 网页添加:
# Settings → Secrets and variables → Actions → New repository secret
```

### 4. 测试 Sentry 集成

```bash
# 开发环境测试
npm run dev

# 在浏览器控制台执行
throw new Error("Test Sentry Integration");

# 检查 Sentry 控制台是否收到错误
```

### 5. 构建并验证

```bash
# 设置 DSN 后构建
export VITE_SENTRY_DSN="你的DSN"
npm run build

# 验证构建产物包含 Sentry
grep -r "sentry" dist/
```

## 验证清单

- [ ] Sentry 项目已创建
- [ ] DSN 已获取
- [ ] .env.local 已配置
- [ ] GitHub Secrets 已配置
- [ ] 本地测试成功
- [ ] 错误出现在 Sentry 控制台
- [ ] 构建包含 Sentry 代码

## 下一步

配置完成后，参考 docs/SENTRY_SETUP.md 进行高级配置：
- Source Maps 上传
- 告警规则设置
- 通知渠道配置
- 性能监控调优
