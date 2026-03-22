# HumanCode 多 AI 程序员管理方案

## 一、方案选择

### 不推荐的方案
1. ❌ **管理多个扩展会话**: 扩展内部状态不可控
2. ⚠️ **Spawn 多个扩展实例**: 需要大量底层改造,维护成本高

### 推荐方案: 消息路由中枢 + 虚拟会话管理 ✅

**核心理念**:
- 扩展本身保持单实例
- 在 IDE 的消息中枢层面实现"虚拟多实例"
- 通过上下文注入让单个扩展表现出"多个独立 AI 程序员"的效果

---

## 二、架构设计

### 2.1 整体架构

```
┌──────────────────────────────────────────────────────────┐
│                    用户界面层                             │
│  ┌────────────┐  ┌────────────┐  ┌────────────┐         │
│  │ AI 程序员 A │  │ AI 程序员 B │  │ AI 程序员 C │         │
│  │ (前端开发)  │  │ (后端开发)  │  │ (代码测试)  │         │
│  └────────────┘  └────────────┘  └────────────┘         │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│              HumanCode 消息路由中枢                       │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │         虚拟会话管理器 (SessionManager)          │    │
│  │                                                   │    │
│  │  sessions: Map<SessionId, SessionContext> {      │    │
│  │    "frontend-dev": {                             │    │
│  │      role: "前端开发",                            │    │
│  │      extensionId: "github.copilot",              │    │
│  │      context: [...历史消息],                      │    │
│  │      systemPrompt: "你是前端开发专家..."          │    │
│  │    },                                             │    │
│  │    "backend-dev": {                              │    │
│  │      role: "后端开发",                            │    │
│  │      extensionId: "github.copilot",              │    │
│  │      context: [...历史消息],                      │    │
│  │      systemPrompt: "你是后端开发专家..."          │    │
│  │    },                                             │    │
│  │    "qa-tester": {                                │    │
│  │      role: "测试工程师",                          │    │
│  │      extensionId: "alibaba-cloud.tongyi-lingma", │    │
│  │      context: [...历史消息],                      │    │
│  │      systemPrompt: "你是测试专家..."              │    │
│  │    }                                              │    │
│  │  }                                                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │      消息拦截器 (MessageInterceptor)             │    │
│  │                                                   │    │
│  │  - 拦截扩展输出 (logIncoming)                    │    │
│  │  - 识别消息所属会话                              │    │
│  │  - 更新会话上下文                                │    │
│  └─────────────────────────────────────────────────┘    │
│                                                           │
│  ┌─────────────────────────────────────────────────┐    │
│  │      消息注入器 (MessageInjector)                │    │
│  │                                                   │    │
│  │  - 接收用户/系统指令                             │    │
│  │  - 附加会话上下文                                │    │
│  │  - 注入到目标扩展 (logOutgoing)                  │    │
│  └─────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────┘
                         ↓
┌──────────────────────────────────────────────────────────┐
│                  Extension Host 层                        │
│                                                           │
│  ┌──────────────────┐      ┌──────────────────┐         │
│  │  Codex 扩展      │      │  Lingma 扩展     │         │
│  │  (单实例)        │      │  (单实例)        │         │
│  └──────────────────┘      └──────────────────┘         │
└──────────────────────────────────────────────────────────┘
```

---

## 三、核心实现

### 3.1 虚拟会话管理器

在 [src/vs/workbench/services/extensionMessages/](src/vs/workbench/services/extensionMessages/) 创建新服务:

```typescript
// sessionManager.ts

export interface ISessionContext {
    sessionId: string;
    role: string;  // "前端开发", "后端开发", "测试工程师"
    extensionId: string;  // "github.copilot", "alibaba-cloud.tongyi-lingma"
    systemPrompt: string;  // 角色定义
    conversationHistory: Array<{
        timestamp: number;
        direction: 'user' | 'assistant';
        content: string;
    }>;
    metadata: {
        createdAt: number;
        lastActiveAt: number;
        messageCount: number;
    };
}

export class SessionManager {
    private sessions: Map<string, ISessionContext> = new Map();

    // 创建新会话
    createSession(config: {
        role: string;
        extensionId: string;
        systemPrompt: string;
    }): string {
        const sessionId = `session-${Date.now()}-${Math.random()}`;
        this.sessions.set(sessionId, {
            sessionId,
            role: config.role,
            extensionId: config.extensionId,
            systemPrompt: config.systemPrompt,
            conversationHistory: [],
            metadata: {
                createdAt: Date.now(),
                lastActiveAt: Date.now(),
                messageCount: 0
            }
        });
        return sessionId;
    }

    // 添加消息到会话
    appendMessage(sessionId: string, message: {
        direction: 'user' | 'assistant';
        content: string;
    }): void {
        const session = this.sessions.get(sessionId);
        if (!session) return;

        session.conversationHistory.push({
            timestamp: Date.now(),
            ...message
        });
        session.metadata.lastActiveAt = Date.now();
        session.metadata.messageCount++;
    }

    // 获取会话的完整上下文
    getSessionContext(sessionId: string): string {
        const session = this.sessions.get(sessionId);
        if (!session) return '';

        // 构造上下文字符串
        let context = `# 角色定义\n${session.systemPrompt}\n\n`;
        context += `# 历史对话\n`;

        for (const msg of session.conversationHistory) {
            const role = msg.direction === 'user' ? 'User' : 'Assistant';
            context += `[${role}]: ${msg.content}\n\n`;
        }

        return context;
    }
}
```

### 3.2 消息拦截与路由

修改 [extensionHostManager.ts](src/vs/workbench/services/extensions/common/extensionHostManager.ts) 中的 `HumanCodeRPCLogger`:

```typescript
class HumanCodeRPCLogger implements IRPCProtocolLogger {
    constructor(
        private sessionManager: SessionManager,
        private currentSessionId: string | null = null
    ) {}

    logIncoming(msgLength: number, req: number, initiator: RequestInitiator,
                str: string, data?: any): void {
        // 拦截扩展输出
        const message = this._parseMessage(str, data);

        if (this.currentSessionId && message.type === 'chat-response') {
            // 将消息添加到当前会话
            this.sessionManager.appendMessage(this.currentSessionId, {
                direction: 'assistant',
                content: message.content
            });

            // 触发 UI 更新
            this._notifyUI(this.currentSessionId, message);
        }
    }

    logOutgoing(msgLength: number, req: number, initiator: RequestInitiator,
                str: string, data?: any): void {
        // 拦截发送到扩展的消息
        const message = this._parseMessage(str, data);

        if (this.currentSessionId && message.type === 'chat-request') {
            // 注入会话上下文
            const context = this.sessionManager.getSessionContext(this.currentSessionId);
            message.data.context = context;  // 将上下文附加到消息中

            // 记录到会话历史
            this.sessionManager.appendMessage(this.currentSessionId, {
                direction: 'user',
                content: message.content
            });
        }
    }

    // 切换当前活动会话
    setActiveSession(sessionId: string): void {
        this.currentSessionId = sessionId;
    }
}
```

### 3.3 用户界面层

在 [src/vs/workbench/contrib/](src/vs/workbench/contrib/) 创建新的 Contribution:

```typescript
// aiTeamPanel.ts

export class AITeamPanel {
    private sessions: Array<{
        id: string;
        name: string;
        role: string;
        status: 'idle' | 'working' | 'waiting';
    }> = [];

    // 创建新的 AI 程序员
    createAIProgrammer(config: {
        name: string;
        role: string;
        extensionId: string;
    }): void {
        const sessionId = this.sessionManager.createSession({
            role: config.role,
            extensionId: config.extensionId,
            systemPrompt: this._generateSystemPrompt(config.role)
        });

        this.sessions.push({
            id: sessionId,
            name: config.name,
            role: config.role,
            status: 'idle'
        });

        this._updateUI();
    }

    // 向指定 AI 程序员发送任务
    async sendTask(sessionId: string, task: string): Promise<void> {
        const session = this.sessions.find(s => s.id === sessionId);
        if (!session) return;

        // 切换到该会话
        this.rpcLogger.setActiveSession(sessionId);

        // 更新状态
        session.status = 'working';
        this._updateUI();

        // 发送消息到扩展
        await this._sendToExtension(sessionId, task);
    }

    // 在两个 AI 程序员之间传递消息
    async relay(fromSessionId: string, toSessionId: string): Promise<void> {
        const fromSession = this.sessionManager.getSession(fromSessionId);
        const lastMessage = fromSession.conversationHistory.slice(-1)[0];

        // 将 A 的输出作为 B 的输入
        await this.sendTask(toSessionId,
            `请审查以下代码:\n\n${lastMessage.content}`
        );
    }
}
```

---

## 四、使用场景示例

### 场景 1: 前端开发 → 后端开发协作

```typescript
// 1. 创建两个 AI 程序员
aiTeamPanel.createAIProgrammer({
    name: "前端小李",
    role: "前端开发",
    extensionId: "github.copilot"
});

aiTeamPanel.createAIProgrammer({
    name: "后端小王",
    role: "后端开发",
    extensionId: "github.copilot"
});

// 2. 给前端小李分配任务
await aiTeamPanel.sendTask("frontend-dev",
    "实现一个用户登录表单,需要调用后端 API"
);

// 3. 前端完成后,自动将 API 需求传递给后端
await aiTeamPanel.relay("frontend-dev", "backend-dev");

// 4. 后端小王收到的消息会自动包含前端的上下文
// 他会看到: "请实现以下 API: POST /api/login ..."
```

### 场景 2: 开发 → 测试循环

```typescript
// 1. Codex 生成代码
await aiTeamPanel.sendTask("codex-dev", "实现用户注册功能");

// 2. 代码完成后,自动发给测试
await aiTeamPanel.relay("codex-dev", "lingma-qa");

// 3. Lingma 测试发现问题,反馈给 Codex
await aiTeamPanel.relay("lingma-qa", "codex-dev");

// 4. 循环直到测试通过
```

---

## 五、优势分析

### 相比方案 1 (管理多个会话)
✅ **不依赖扩展内部实现**: 完全在 IDE 层面控制
✅ **通用性强**: 适用于任何 AI 扩展
✅ **可扩展**: 轻松支持更多扩展和角色

### 相比方案 2 (Spawn 多个实例)
✅ **实现简单**: 不需要修改扩展加载机制
✅ **资源占用低**: 扩展本身只有一个实例
✅ **维护成本低**: 不会因为 VS Code 更新而失效

### 核心优势
✅ **上下文隔离**: 每个虚拟会话有独立的历史记录
✅ **角色定制**: 通过 System Prompt 让同一个扩展扮演不同角色
✅ **消息路由**: 灵活控制 AI 之间的协作流程
✅ **可观测性**: 所有消息都经过中枢,便于监控和调试

---

## 六、实施路线

### 阶段 1: 基础设施 (1-2 周)
- [x] 实现 RPC 消息拦截 (已完成)
- [ ] 实现 SessionManager 服务
- [ ] 实现消息注入机制
- [ ] 验证单个会话的上下文注入

### 阶段 2: 多会话管理 (1-2 周)
- [ ] 实现会话切换逻辑
- [ ] 实现会话间消息路由
- [ ] 构建 AI Team Panel UI
- [ ] 测试多会话并发

### 阶段 3: 自动化工作流 (2-3 周)
- [ ] 实现任务自动分发
- [ ] 实现 AI 间自动协作
- [ ] 集成 LangChain/Agent 框架
- [ ] 构建可视化工作流编辑器

---

## 七、技术风险与缓解

| 风险 | 等级 | 缓解措施 |
|------|------|----------|
| 上下文注入失败 | 中 | 多种注入方式备选 (System Prompt / User Message Prefix) |
| 扩展不支持上下文 | 中 | 降级为纯消息转发,在 UI 层展示完整上下文 |
| 消息识别错误 | 低 | 基于 RPC 方法名精确匹配 |
| 性能开销 | 低 | 异步处理,不阻塞主线程 |

---

## 八、总结

**推荐采用"消息路由中枢 + 虚拟会话管理"方案**,因为:

1. **技术可行性高**: 基于已验证的 RPC 拦截机制
2. **实现成本低**: 不需要修改扩展加载逻辑
3. **扩展性强**: 轻松支持更多 AI 扩展和角色
4. **用户体验好**: 真正实现"多个 AI 程序员协作"的效果

这个方案完美契合你的产品愿景: **让 IDE 成为一个虚拟软件团队的管理平台**。
