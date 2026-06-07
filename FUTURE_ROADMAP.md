# 🚀 Markhere 后续版本规划

**当前版本**: v1.0.0  
**定位**: PC 桌面端 · LLM 深度集成 · 本地优先  
**核心原则**: 不做移动端；不做 Google Docs 级协作；LLM 能力前置；社区驱动增长

---

## 📊 当前基线

| 指标 | v1.0.0 |
|------|--------|
| LLM 提供商 | 12 家国内 + Ollama |
| AI 写作能力 | 11 种 |
| 内置主题 | 18 种 |
| 文档 | CHANGELOG + RELEASE_NOTES + USER_MANUAL |
| 安全 | CSP 有 unsafe-eval，插件有 shell.run 权限 |
| 代码卫生 | 78 处 console.log，safeInvoke 未全覆盖 |

---

## 🎯 v1.1.0 — LLM 深化 + 安全 + 社区（6 周）

**时间**: 2026-06 ~ 2026-08  
**关键词**: 安全加固 / LLM 扩展 / 主题 / 写作分析 / 语义搜索 / 社区建设

### 🔴 P0 — 安全

- [ ] CSP `unsafe-eval` 用哈希 fence Mermaid/KaTeX
- [ ] 插件 `shell.run` → `shell.sandbox` 降级
- [ ] `npm audit` 加入 CI
- [ ] 78 处 console.log 清零（生产路径）
- [ ] `safeInvoke` 全覆盖

### 🔴 P0 — LLM 扩展

- [ ] 新增 6 家国际 LLM：OpenAI / Anthropic / Google / Mistral / xAI / Cohere（12→18）
- [ ] Ollama 本地 LLM 深化：embedding / RAG / 模型管理面板 / GPU 检测
- [ ] AI 写作能力扩展 11→25：续写 / 扩写 / 缩写 / 改写 / 标题建议 / 段落重组 / 引文推荐 / 对比分析 / 情绪检查 / 写作模板（技术博客、邮件、简历、演讲稿、数据报告）
- [ ] 深度写作分析：评分 / 重复检测 / 被动语态 / 难度分析 / 情感分析 / 侧边栏建议面板
- [ ] 本地语义搜索：Ollama embedding + 余弦相似度

### 🟡 P1 — 体验

- [ ] 主题 18→25：Solarized Light/Dark / Rose Pine / Catppuccin Mocha / Everforest / Tokyo Night / Gruvbox Dark
- [ ] 模板市场（GitHub 仓库驱动，评分 + 下载）

### 🟡 P1 — 社区

- [ ] 插件 SDK 文档 + 5 个示例（hello-world / status-bar / custom-export / theme-starter）
- [ ] 主题开发指南
- [ ] 视频教程 × 3（入门 5min / 进阶 10min / LLM 8min）
- [ ] Discord 服务器 + GitHub Discussions 板块化
- [ ] 内置反馈收集器

### 🟢 P2

- [ ] 性能基线 CI（启动 < 1.5s / 包体积 < 3MB 红线）
- [ ] 写作模板 preset：技术博客 / 邮件 / 简历 / 演讲稿 / 数据报告

---

### v1.1.0 验收

- [ ] 18 家 LLM 提供商
- [ ] AI 能力 25+ 种
- [ ] 25 种主题
- [ ] 0 高危漏洞
- [ ] 语义搜索可用
- [ ] 插件 SDK 文档完成
- [ ] 3 个视频教程

---

## 🔮 v1.5.0 — 判断点

根据用户数据决定：

| DAU > 10,000 | DAU < 5,000 |
|--------------|-------------|
| 桌面端深度体验 + 云端同步 | 继续打磨核心 + 插件生态激励 |

**暂不纳入**: 移动端 App、Google Docs 协作、开放 API 平台

---

**文档维护者**: @jacksoncode  
**下次审查**: v1.1.0 发布前
