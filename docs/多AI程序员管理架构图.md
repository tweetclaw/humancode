# HumanCode 多 AI 程序员管理系统 - 架构设计

## 一、整体架构图

```
┌─────────────────────────────────────────────────────────────────────────────┐
│                           用户界面层 (UI Layer)                              │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │                    AI Team Panel (新增组件)                           │  │
│  │  ┌────────────┐  ┌────────────┐  ┌────────────┐  ┌────────────┐    │  │
│  │  │ AI 程序员 A │  │ AI 程序员 B │  │ AI 程序员 C │  │ AI 程序员 D │    │  │
│  │  │ 前端开发    │  │ 后端开发    │  │ 测试工程师  │  │ 代码审查    │    │  │
│  │  │ [工作中]    │  │ [空闲]      │  │ [等待]      │  │ [空闲]      │    │  │
│  │  └────────────┘  └────────────┘  └────────────┘  └────────────┘    │  │
│  │                                                                       │  │
│  │  操作: [创建新AI] [分配任务] [查看历史] [配置角色]                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              Extension Messages View (已实现)                         │  │
│  │  - 显示所有 RPC 消息                                                  │  │
│  │  - 实时消息流监控                                                     │  │
│  │  - 消息过滤和搜索                                                     │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓↑
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Workbench Services Layer (服务层)                         │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │         IExtensionMessagesService (已实现)                            │  │
│  │  - onDidLogMessage: Event<IRPCMessage>                               │  │
│  │  - getMessages(): IRPCMessage[]                                      │  │
│  │  - clearMessages(): void                                             │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      ↓↑                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │         IAISessionManagerService (待实现)                             │  │
│  │                                                                       │  │
│  │  核心方法:                                                            │  │
│  │  - createSession(config): string                                     │  │
│  │  - getSession(sessionId): ISessionContext                            │  │
│  │  - appendMessage(sessionId, message): void                           │  │
│  │  - getSessionContext(sessionId): string                              │  │
│  │  - setActiveSession(sessionId): void                                 │  │
│  │  - relayMessage(fromId, toId): Promise<void>                         │  │
│  │                                                                       │  │
│  │  数据结构:                                                            │  │
│  │  sessions: Map<SessionId, ISessionContext>                           │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓↑
┌─────────────────────────────────────────────────────────────────────────────┐
│                  Extension Host Manager Layer (扩展管理层)                   │
│                                                                              │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              ExtensionHostManager (已修改)                            │  │
│  │  - 管理扩展主机生命周期                                               │  │
│  │  - 创建 RPC 协议实例                                                  │  │
│  │  - 注入 HumanCodeRPCLogger                                            │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      ↓↑                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │              RPCProtocol (已修改)                                     │  │
│  │  - 处理消息序列化/反序列化                                            │  │
│  │  - 管理请求/响应映射                                                  │  │
│  │  - 调用 Logger 钩子                                                   │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
│                                      ↓↑                                      │
│  ┌──────────────────────────────────────────────────────────────────────┐  │
│  │         HumanCodeRPCLogger (已实现 + 待增强)                          │  │
│  │                                                                       │  │
│  │  已实现功能:                                                          │  │
│  │  - logIncoming(): 拦截扩展→IDE 的消息                                │  │
│  │  - logOutgoing(): 拦截IDE→扩展 的消息                                │  │
│  │  - 消息存储到 globalRPCMessageStore                                  │  │
│  │  - 触发 onDidLogMessage 事件                                         │  │
│  │                                                                       │  │
│  │  待增强功能:                                                          │  │
│  │  - 识别消息所属会话 (基于 currentSessionId)                          │  │
│  │  - 注入会话上下文到 outgoing 消息                                    │  │
│  │  - 更新会话历史记录                                                  │  │
│  │  - 消息路由逻辑                                                       │  │
│  └──────────────────────────────────────────────────────────────────────┘  │
└─────────────────────────────────────────────────────────────────────────────┘
                                      ↓↑
┌─────────────────────────────────────────────────────────────────────────────┐
│                    Extension Host Layer (扩展主机层)                         │
│                                                                              │
│  ┌──────────────────┐      ┌──────────────────┐      ┌──────────────────┐ │
│  │  GitHub Copilot  │      │  Tongyi Lingma   │      │  Other AI Ext    │ │
│  │  Extension       │      │  Extension       │      │  Extension       │ │
│  │  (单实例)        │      │  (单实例)        │      │  (单实例)        │ │
│  │                  │      │                  │      │                  │ │
│  │  - Chat API      │      │  - Chat API      │      │  - Chat API      │ │
│  │  - Code Gen      │      │  - Code Gen      │      │  - Code Gen      │ │
│  └──────────────────┘      └──────────────────┘      └──────────────────┘ │
└─────────────────────────────────────────────────────────────────────────────┘
```

---

## 二、核心组件详细设计

### 2.1 数据结构定义

#### ISessionContext (会话上下文)
```typescript
// 位置: src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts

export interface ISessionContext {
    // 基本信息
    sessionId: string;                    // 唯一会话ID
    name: string;                         // 显示名称 (如 "前端小李")
    role: string;                         // 角色定义 (如 "前端开发")
    extensionId: string;                  // 目标扩展ID

    // 角色配置
    systemPrompt: string;                 // 系统提示词,定义AI角色

    // 会话历史
    conversationHistory: IMessage[];      // 完整对话历史

    // 元数据
    metadata: {
        createdAt: number;                // 创建时间戳
        lastActiveAt: number;             // 最后活跃时间
        messageCount: number;             // 消息总数
        status: 'idle' | 'working' | 'waiting';  // 当前状态
    };
}

export interface IMessage {
    timestamp: number;
    direction: 'user' | 'assistant';
    content: string;
    metadata?: {
        rpcMethod?: string;               // RPC 方法名
        requestId?: number;               // 请求ID
    };
}
```

#### IRPCMessage (RPC消息)
```typescript
// 位置: src/vs/workbench/services/extensions/common/extensionHostManager.ts

export interface IRPCMessage {
    timestamp: number;
    direction: 'incoming' | 'outgoing';
    msgLength: number;
    req: number;                          // 请求ID
    initiator: RequestInitiator;
    str: string;                          // 方法名或响应类型
    data?: any;                           // 消息数据
    sessionId?: string;                   // 关联的会话ID (新增)
}
```

---

### 2.2 组件交互流程

#### 流程 1: 创建新的 AI 程序员

```
用户操作 (UI)
    ↓
AI Team Panel
    ↓ 调用
IAISessionManagerService.createSession({
    name: "前端小李",
    role: "前端开发",
    extensionId: "github.copilot",
    systemPrompt: "你是一个专业的前端开发工程师..."
})
    ↓
返回 sessionId: "session-1234567890"
    ↓
UI 更新,显示新的 AI 程序员卡片
```

**数据格式:**
```typescript
// 输入
{
    name: string,
    role: string,
    extensionId: string,
    systemPrompt: string
}

// 输出
sessionId: string
```

---

#### 流程 2: 向 AI 程序员发送任务

```
用户输入任务
    ↓
AI Team Panel.sendTask(sessionId, taskContent)
    ↓
IAISessionManagerService.setActiveSession(sessionId)
    ↓
IAISessionManagerService.appendMessage(sessionId, {
    direction: 'user',
    content: taskContent
})
    ↓
构造增强消息 = {
    原始消息 + 会话上下文
}
    ↓
通过 RPC 发送到扩展
    ↓
HumanCodeRPCLogger.logOutgoing() 拦截
    ↓ 注入上下文
增强后的消息发送到扩展
    ↓
扩展处理并返回响应
    ↓
HumanCodeRPCLogger.logIncoming() 拦截
    ↓
IAISessionManagerService.appendMessage(sessionId, {
    direction: 'assistant',
    content: response
})
    ↓
UI 更新,显示响应
```

**数据格式:**

**原始用户消息:**
```json
{
    "method": "chat.sendMessage",
    "params": {
        "message": "实现一个登录表单"
    }
}
```

**增强后的消息 (注入上下文):**
```json
{
    "method": "chat.sendMessage",
    "params": {
        "message": "实现一个登录表单",
        "context": {
            "role": "前端开发",
            "systemPrompt": "你是一个专业的前端开发工程师...",
            "conversationHistory": [
                {
                    "timestamp": 1234567890,
                    "direction": "user",
                    "content": "之前的对话..."
                }
            ]
        }
    }
}
```

---

#### 流程 3: AI 程序员之间的协作 (消息中继)

```
AI 程序员 A 完成任务
    ↓
用户触发: AI Team Panel.relay(sessionA, sessionB)
    ↓
IAISessionManagerService.relayMessage(sessionA, sessionB)
    ↓
获取 sessionA 的最后一条消息
    ↓
构造新任务 = "请审查以下代码:\n\n" + lastMessage.content
    ↓
发送到 sessionB (重复流程2)
```

**数据格式:**
```typescript
// 中继消息结构
{
    fromSessionId: string,
    toSessionId: string,
    relayType: 'review' | 'handoff' | 'feedback',
    message: {
        originalContent: string,      // A 的输出
        instruction: string,          // 给 B 的指令
        context: {
            fromRole: string,         // A 的角色
            fromName: string          // A 的名称
        }
    }
}
```

---

### 2.3 消息拦截与注入机制

#### HumanCodeRPCLogger 增强实现

```typescript
// 位置: src/vs/workbench/services/extensions/common/extensionHostManager.ts

class HumanCodeRPCLogger implements IRPCProtocolLogger {
    constructor(
        private sessionManager: IAISessionManagerService,  // 新增依赖
        private extensionMessagesService: IExtensionMessagesService
    ) {}

    logOutgoing(msgLength: number, req: number, initiator: RequestInitiator,
                str: string, data?: any): void {

        // 1. 获取当前活跃会话
        const activeSessionId = this.sessionManager.getActiveSessionId();

        if (activeSessionId) {
            // 2. 获取会话上下文
            const context = this.sessionManager.getSessionContext(activeSessionId);

            // 3. 识别消息类型
            if (this._isChatMessage(str, data)) {
                // 4. 注入上下文到消息
                data = this._injectContext(data, context);

                // 5. 记录到会话历史
                this.sessionManager.appendMessage(activeSessionId, {
                    direction: 'user',
                    content: this._extractContent(data)
                });
            }
        }

        // 6. 记录到全局消息存储
        const message: IRPCMessage = {
            timestamp: Date.now(),
            direction: 'outgoing',
            msgLength,
            req,
            initiator,
            str,
            data,
            sessionId: activeSessionId
        };

        globalRPCMessageStore.addMessage(message);
        this.extensionMessagesService.onDidLogMessage.fire(message);
    }

    logIncoming(msgLength: number, req: number, initiator: RequestInitiator,
                str: string, data?: any): void {

        // 1. 获取当前活跃会话
        const activeSessionId = this.sessionManager.getActiveSessionId();

        if (activeSessionId && this._isChatResponse(str, data)) {
            // 2. 提取响应内容
            const content = this._extractContent(data);

            // 3. 记录到会话历史
            this.sessionManager.appendMessage(activeSessionId, {
                direction: 'assistant',
                content
            });

            // 4. 更新会话状态
            this.sessionManager.updateSessionStatus(activeSessionId, 'idle');
        }

        // 5. 记录到全局消息存储
        const message: IRPCMessage = {
            timestamp: Date.now(),
            direction: 'incoming',
            msgLength,
            req,
            initiator,
            str,
            data,
            sessionId: activeSessionId
        };

        globalRPCMessageStore.addMessage(message);
        this.extensionMessagesService.onDidLogMessage.fire(message);
    }

    private _injectContext(data: any, context: string): any {
        // 上下文注入策略
        if (data.params) {
            data.params.context = context;
        }
        return data;
    }

    private _isChatMessage(str: string, data: any): boolean {
        // 识别聊天消息的逻辑
        return str.includes('chat') || str.includes('sendMessage');
    }

    private _isChatResponse(str: string, data: any): boolean {
        // 识别聊天响应的逻辑
        return str.includes('response') || str.includes('completion');
    }

    private _extractContent(data: any): string {
        // 提取消息内容
        return data?.params?.message || data?.result?.content || '';
    }
}
```

---

## 三、模块与现有 IDE 组件的交互

### 3.1 与 Workbench 的交互

```
AI Team Panel (新增 Contribution)
    ↓ 依赖注入
IAISessionManagerService
    ↓ 依赖注入
IExtensionMessagesService (已存在)
    ↓ 事件监听
HumanCodeRPCLogger
    ↓ 消息流
ExtensionHostManager
    ↓ RPC 通信
Extension Host
```

**交互方式:**
- **依赖注入**: 通过 VS Code 的 DI 系统注入服务
- **事件驱动**: 使用 `Event<T>` 和 `Emitter<T>` 进行组件间通信
- **服务调用**: 通过接口定义的方法进行同步/异步调用

---

### 3.2 与 Extension Host 的交互

```
IDE (Main Thread)                    Extension Host (Worker Thread)
       │                                        │
       │  1. 创建 RPC 连接                      │
       ├───────────────────────────────────────>│
       │                                        │
       │  2. 发送消息 (logOutgoing 拦截)       │
       ├───────────────────────────────────────>│
       │     {                                  │
       │       method: "chat.sendMessage",      │
       │       params: {                        │
       │         message: "...",                │
       │         context: {...}  // 注入的上下文│
       │       }                                │
       │     }                                  │
       │                                        │
       │  3. 扩展处理消息                       │
       │                                        │
       │  4. 返回响应 (logIncoming 拦截)       │
       │<───────────────────────────────────────│
       │     {                                  │
       │       result: {                        │
       │         content: "..."                 │
       │       }                                │
       │     }                                  │
       │                                        │
```

**数据格式:**
- **传输协议**: JSON-RPC 2.0
- **序列化**: `stringifyJsonWithBufferRefs` / `parseJsonAndRestoreBufferRefs`
- **消息结构**:
  ```typescript
  {
    type: 'request' | 'response' | 'notification',
    id?: number,
    method?: string,
    params?: any,
    result?: any,
    error?: any
  }
  ```

---

### 3.3 与现有 Extension Messages View 的交互

```
HumanCodeRPCLogger
    ↓ 触发事件
IExtensionMessagesService.onDidLogMessage
    ↓ 监听
Extension Messages View
    ↓ 显示
用户界面 (消息列表)
```

**数据流:**
1. `HumanCodeRPCLogger` 拦截所有 RPC 消息
2. 将消息存储到 `globalRPCMessageStore`
3. 触发 `onDidLogMessage` 事件
4. `Extension Messages View` 监听事件并更新 UI
5. 用户可以查看、过滤、搜索消息

---

## 四、待开发模块清单

### 阶段 1: 基础设施 (已部分完成)

| 模块 | 状态 | 文件位置 |
|------|------|----------|
| RPC 消息拦截 | ✅ 已完成 | `src/vs/workbench/services/extensions/common/extensionHostManager.ts` |
| Extension Messages Service | ✅ 已完成 | `src/vs/workbench/services/extensionMessages/` |
| Extension Messages View | ✅ 已完成 | `src/vs/workbench/contrib/extensionMessages/` |
| AI Session Manager Service | ❌ 待开发 | `src/vs/workbench/services/aiSessionManager/` |
| 消息上下文注入 | ❌ 待开发 | 增强 `HumanCodeRPCLogger` |

### 阶段 2: 多会话管理 (待开发)

| 模块 | 状态 | 文件位置 |
|------|------|----------|
| AI Team Panel UI | ❌ 待开发 | `src/vs/workbench/contrib/aiTeam/` |
| 会话切换逻辑 | ❌ 待开发 | `IAISessionManagerService` |
| 会话间消息路由 | ❌ 待开发 | `IAISessionManagerService.relayMessage()` |
| 角色配置管理 | ❌ 待开发 | `src/vs/workbench/contrib/aiTeam/common/roles.ts` |

### 阶段 3: 自动化工作流 (待开发)

| 模块 | 状态 | 文件位置 |
|------|------|----------|
| 任务自动分发 | ❌ 待开发 | `src/vs/workbench/contrib/aiTeam/browser/taskDispatcher.ts` |
| AI 间自动协作 | ❌ 待开发 | `src/vs/workbench/contrib/aiTeam/browser/collaboration.ts` |
| 工作流编辑器 | ❌ 待开发 | `src/vs/workbench/contrib/aiTeam/browser/workflowEditor.ts` |

---

## 五、关键技术点

### 5.1 上下文注入策略

**方案 A: 修改消息参数 (推荐)**
```typescript
// 在 logOutgoing 中修改 data 对象
data.params.context = sessionContext;
```

**优点**:
- 扩展可以直接访问上下文
- 不影响消息结构

**缺点**:
- 需要扩展支持 context 参数

---

**方案 B: 消息前缀注入**
```typescript
// 将上下文作为消息前缀
data.params.message = `${sessionContext}\n\n${originalMessage}`;
```

**优点**:
- 兼容所有扩展
- 无需扩展修改

**缺点**:
- 上下文会被用户看到
- 占用 token

---

### 5.2 会话识别机制

**当前方案**: 基于 `activeSessionId`
- `IAISessionManagerService` 维护当前活跃会话ID
- `HumanCodeRPCLogger` 读取活跃会话ID
- 所有消息自动关联到活跃会话

**未来优化**: 基于消息特征识别
- 分析 RPC 方法名
- 提取扩展ID
- 匹配到对应会话

---

### 5.3 消息路由策略

**同步路由**:
```typescript
await sessionManager.relayMessage(sessionA, sessionB);
// 等待 B 处理完成后返回
```

**异步路由**:
```typescript
sessionManager.relayMessageAsync(sessionA, sessionB);
// 立即返回,B 在后台处理
```

---

## 六、数据流示例

### 完整的任务执行流程

```
1. 用户在 AI Team Panel 中选择 "前端小李"
   ↓
2. UI 调用: sessionManager.setActiveSession("session-frontend-001")
   ↓
3. 用户输入: "实现一个登录表单"
   ↓
4. UI 调用: sessionManager.sendTask("session-frontend-001", "实现一个登录表单")
   ↓
5. SessionManager 构造消息:
   {
     method: "chat.sendMessage",
     params: {
       message: "实现一个登录表单",
       context: {
         role: "前端开发",
         systemPrompt: "你是专业的前端工程师...",
         history: [...]
       }
     }
   }
   ↓
6. 通过 RPC 发送到扩展
   ↓
7. HumanCodeRPCLogger.logOutgoing() 拦截并记录
   ↓
8. 扩展 (GitHub Copilot) 接收并处理
   ↓
9. 扩展返回响应:
   {
     result: {
       content: "这是登录表单的实现代码..."
     }
   }
   ↓
10. HumanCodeRPCLogger.logIncoming() 拦截并记录
    ↓
11. SessionManager 更新会话历史
    ↓
12. UI 显示响应内容
```

---

## 七、总结

### 核心组件数量: 6 个

1. **IAISessionManagerService** - 会话管理服务
2. **HumanCodeRPCLogger** (增强) - 消息拦截与注入
3. **AI Team Panel** - 用户界面
4. **IExtensionMessagesService** (已存在) - 消息服务
5. **Extension Messages View** (已存在) - 消息查看器
6. **Task Dispatcher** (未来) - 任务分发器

### 与现有组件的交互方式

- **依赖注入**: VS Code DI 系统
- **事件驱动**: `Event<T>` / `Emitter<T>`
- **RPC 通信**: JSON-RPC 2.0 协议
- **服务调用**: 接口方法调用

### 数据格式

- **会话上下文**: `ISessionContext` 接口
- **RPC 消息**: `IRPCMessage` 接口
- **消息传输**: JSON-RPC 2.0 格式
- **上下文注入**: 通过 `params.context` 字段

这个架构设计实现了"虚拟多实例"的核心理念,通过消息路由中枢让单个扩展表现出多个独立 AI 程序员的效果。
