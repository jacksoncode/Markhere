# Y.js CRDT 实时协作研究文档

## 技术背景

Y.js 是基于 CRDT (Conflict-free Replicated Data Types) 的实时协作框架，无需中心服务器即可实现多人编辑同步。

## 核心概念

### CRDT 原理
- **无冲突复制数据类型**: 多客户端可独立编辑，最终状态自动收敛一致
- **无需锁机制**: 不依赖中央协调，适合分布式场景
- **离线支持**: 本地编辑后同步，冲突自动解决

### Y.js 架构
```
Editor (Tiptap) → Y.js Binding → Sync Provider → WebSocket/Hocuspocus
```

## 实现方案

### 1. 依赖安装
```bash
npm install yjs y-tiptap y-websocket hocuspocus-server
```

### 2. 前端集成
```typescript
import { YjsCollaboration } from '@tiptap/extension-collaboration'
import { YjsCollaborationCursor } from '@tiptap/extension-collaboration-cursor'
import * as Y from 'yjs'
import { WebsocketProvider } from 'y-websocket'

const ydoc = new Y.Doc()
const provider = new WebsocketProvider('wss://your-server.com', 'document-id', ydoc)

editor.use([
  YjsCollaboration.configure({
    document: ydoc,
    field: 'content',
  }),
  YjsCollaborationCursor.configure({
    provider,
    user: { name: 'User Name', color: '#ff0000' },
  }),
])
```

### 3. 后端服务器 (Hocuspocus)
```typescript
import { Server } from '@hocuspocus/server'

const server = Server.configure({
  port: 1234,
  async onConnect({ documentName }) {
    // 验证用户权限
  },
  async onLoadDocument({ documentName }) {
    // 从数据库加载文档
  },
  async onStoreDocument({ documentName, document }) {
    // 保存到数据库
  },
})

server.listen()
```

## 功能清单

| 功能 | 实现难度 | 状态 |
|------|----------|------|
| 基础同步 | 低 | 需实现 |
| 光标显示 | 低 | 需实现 |
| 用户颜色 | 低 | 需实现 |
| 权限控制 | 中 | 需实现 |
| 离线支持 | 中 | 需实现 |
| 版本历史 | 高 | 长期 |
| 评论系统 | 高 | 长期 |

## 安全考虑

1. **WebSocket 认证**: 需 JWT token 验证
2. **文档权限**: 读写权限分离
3. **速率限制**: 防止恶意推送
4. **数据加密**: 传输层 TLS

## 成本估算

| 项目 | 时间 |
|------|------|
| 前端绑定 | 3-5天 |
| 后端服务器 | 5-7天 |
| 权限系统 | 3-5天 |
| 测试优化 | 5-10天 |
| **总计** | **15-27天** |

## 推荐方案

短期: 使用第三方服务 (Liveblocks, Replicache)
长期: 自建 Hocuspocus 服务器

## 参考资源

- [Y.js 官方文档](https://yjs.dev)
- [Tiptap Collaboration](https://tiptap.dev/guide/collaboration)
- [Hocuspocus Server](https://hocuspocus.dev)
- [CRDT 论文](https://crdt.tech)

---

**状态**: 研究完成，待后续迭代实现