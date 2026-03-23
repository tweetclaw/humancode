# Phase 1 — 多 AI 虚拟会话管理

**状态**: 🏗️ 进行中  
**预计周期**: 3-4 周  
**前置依赖**: Phase 0 ✅  
**最后更新**: 2026-03-23

---

## 一、阶段目标

让单个 AI 扩展（如 Copilot）能够通过**虚拟会话 + 角色提示词**的方式，同时扮演多个独立的 AI 程序员角色。用户可以通过一个统一的 UI 面板管理这些角色、分配任务，并手动触发角色间的消息中继。

**本阶段结束后，用户应当能够**：
- 在 IDE 中创建多个 AI 角色（如"前端工程师"、"QA 测试"）
- 向特定角色发送任务，角色根据其设定进行响应
- 看到每个角色的工作状态（空闲/工作中/等待）
- 手动将一个 AI 的输出中继给另一个 AI

---

## 二、功能清单

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| **接口契约定义** | ✅ 已完成 | `IAISessionManagerService` 接口文件，并行开发的分工协议 |
| `AISessionManagerService` 实现 | ⬜ 待开始 | Task A：Service 核心逻辑实现 |
| `HumanCodeRPCLogger` 增强 | ⬜ 待开始 | Task C：在发送消息时注入当前会话的角色上下文 |
| `AI Team Commander Panel` | ⬜ 待开始 | Task B：侧边栏角色卡片 UI（先用 Mock Service 驱动） |
| 角色配置系统 | ⬜ 待开始 | 内置角色模板 + 自定义角色 + 持久化 |
| 手动消息中继 | ⬜ 待开始 | AI-A 输出 → 一键发送给 AI-B |
| **集成联调** | ⬜ 待开始 | 将 A/B/C 三条线合并，替换 Mock 为真实 Service |

---

## 三、开发策略：接口先行 + 垂直切片 + 有限并行

> 📌 记录于 2026-03-23，经过讨论决定采用此方案。

### 3.1 为什么不选 UI-first 或 Backend-first

| 方案 | 优点 | 致命弱点 |
|------|------|---------|
| UI-first（先设计全部 UI，再实现功能） | 操作流程明确 | 方案任何缺陷都会导致 UI→代码→文档的三重反复 |
| Backend-first（先实现后端，最后做 UI） | 不存在方案不可行的风险 | 验证后端需要交互 UI，但这段 UI 最终是废代码 |

### 3.2 选定方案：接口先行 + 并行切片

**核心逻辑**：
1. 在所有开发开始之前，**精确定义接口契约**（已完成 ✅）
2. 三条任务线沿接口边界**并行推进**
3. 各任务独立可验收，最后**一次集成**

```
接口契约文件（已完成）
        │
        ├── Task A：Service 实现
        │     - 纯逻辑，不依赖 UI
        │     - 用简单测试脚本验证每个方法
        │
        ├── Task B：UI Panel 开发
        │     - 使用 MockAISessionManagerService 驱动
        │     - UI 代码是最终正式代码，非废代码
        │     - Mock 替换为真实 Service 只需改一行注入
        │
        └── Task C：HumanCodeRPCLogger 增强
              - 调用接口中的 getActiveSessionId / getSessionContext
              - 不依赖 Service 具体实现，只依赖接口签名

              ↓ 三线完成后
        集成联调：替换 Mock → 端到端验收测试
```

### 3.3 并行边界规则

> ⚠️ **接口契约是并行开发的唯一边界**。中途不得修改接口签名。  
> 确需修改时，必须所有任务暂停，统一调整后继续。

---

## 四、接口契约（已完成）

**文件位置**：  
`src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts`

### 4.1 核心数据类型

| 类型 | 说明 |
|------|------|
| `IMessage` | 单条对话消息（id, direction, content, timestamp） |
| `ISessionConfig` | 创建会话的输入参数 |
| `ISessionContext` | 完整会话上下文（含历史记录和元数据） |
| `ISessionMetadata` | 会话元数据（状态、创建时间、消息数） |
| `IRelayRequest` | 消息中继请求（from, to, relayType） |
| `SessionStatus` | `'idle' \| 'working' \| 'waiting' \| 'error'` |
| `RelayType` | `'review' \| 'handoff' \| 'feedback'` |

### 4.2 服务方法清单

**会话生命周期**：
- `createSession(config)` → `string`（返回 sessionId）
- `getSession(sessionId)` → `ISessionContext | undefined`
- `deleteSession(sessionId)` → `void`
- `getAllSessions()` → `ISessionContext[]`

**活跃会话管理**：
- `getActiveSessionId()` → `string | null`
- `setActiveSession(sessionId)` → `void`
- `clearActiveSession()` → `void`

**消息管理**：
- `appendMessage(sessionId, message)` → `void`
- `getSessionContext(sessionId, maxMessages?)` → `string`（注入用的格式化字符串）

**状态与中继**：
- `updateSessionStatus(sessionId, status)` → `void`
- `relayMessage(request)` → `void`

**事件（供 UI 和 Logger 订阅）**：
- `onDidSessionsChange: Event<void>`
- `onDidMessageAppend: Event<{sessionId, message}>`
- `onDidSessionStatusChange: Event<{sessionId, status}>`
- `onDidRelayMessage: Event<{request, prompt}>`

---

## 五、各任务详细说明

### Task A — Service 实现（`AISessionManagerService`）

**文件位置（待创建）**：  
`src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts`

**关键实现点**：
- 用 `Map<string, ISessionContext>` 存储所有会话
- `getSessionContext` 需要实现 Token 预算控制（返回最近 N 条历史）
- `relayMessage` 应构造标准化的中继 prompt 并触发 `onDidRelayMessage`
- 使用 VS Code 的 `Emitter<T>` 实现所有事件

**验收方式（不依赖 UI）**：  
写一段 Node.js 或 TypeScript 测试脚本，直接调用 Service 方法，用 `console.assert` 验证：
- 创建两个会话，各自 append 2 条消息，getSessionContext 结果独立
- updateSessionStatus 后，事件正确触发
- relayMessage 后，onDidRelayMessage 事件携带正确 prompt

---

### Task B — UI Panel 开发（`AI Team Commander Panel`）

**文件位置（待创建）**：  
`src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts`

**开发策略**：  
先创建 `MockAISessionManagerService`，实现接口中所有方法但返回硬编码数据。UI 对接 Mock，保证面板可以正常渲染和交互。

```
MockAISessionManagerService
    ↓ 接口相同
AISessionManagerService（Task A 完成后替换）
```

**UI 验收方式（不依赖真实服务）**：  
Mock 数据驱动下：
- 面板正常渲染 2-3 个角色卡片
- 状态指示灯颜色正确（idle/working/waiting/error）
- 点击"添加成员"弹出创建向导
- 点击"发送任务"有输入框出现

**对应 UI 设计文档**：[ui-phase1.md](../ui/ui-phase1.md)

---

### Task C — HumanCodeRPCLogger 增强

**文件位置（已存在，待修改）**：  
`src/vs/workbench/services/extensions/common/extensionHostManager.ts`

**修改点**：
- 构造函数注入 `IAISessionManagerService`
- `logOutgoing` 中调用 `getActiveSessionId()` 和 `getSessionContext()`，将上下文注入消息
- `logIncoming` 中调用 `appendMessage()` 记录 AI 响应
- `logIncoming` 中调用 `updateSessionStatus(sessionId, 'idle')`

**验收方式**：  
在 Extension Messages View 中观察：
- 向活跃会话发消息时，outgoing 消息中包含角色提示词前缀
- AI 响应后，对应会话的历史记录长度增加

---

## 六、集成联调步骤

> 在 Task A + B + C **全部完成**后执行

1. 将 `AI Team Panel` 的 `MockAISessionManagerService` 替换为真实 `AISessionManagerService`（修改依赖注入）
2. 确认 `HumanCodeRPCLogger` 正确接收到 Service 实例
3. 运行端到端验收测试（见第七章）

---

## 七、验收标准（端到端）

| 验收项 | 操作步骤 | 预期结果 |
|-------|---------|---------|
| **会话隔离** | 创建"前端"和"后端"两个角色，各问"你是谁？" | 两个角色回答内容明显不同 |
| **上下文连续** | 同一角色先说"用React开发"，再问"帮我写个按钮" | 响应中自动使用 React 语法 |
| **消息中继** | 前端角色完成任务后，点击"中继给QA" | QA 角色收到消息，内容含前端输出 |
| **状态同步** | 向角色发送任务，观察卡片状态变化 | 发送后变"工作中"（绿色动画），完成后变"空闲" |
| **配置持久化** | 创建角色后重启 IDE | 角色仍然存在，历史记录保留 |

---

## 八、实施进展日志

| 日期 | 事项 | 状态 |
|------|------|------|
| 2026-03-23 | 讨论并确定"接口先行+并行切片"开发策略 | ✅ |
| 2026-03-23 | 创建 `IAISessionManagerService` 接口契约文件 | ✅ |
| - | Task A：`AISessionManagerService` 实现 | ⬜ |
| - | Task B：`AI Team Commander Panel`（Mock 驱动） | ⬜ |
| - | Task C：`HumanCodeRPCLogger` 增强 | ⬜ |
| - | 集成联调，端到端验收测试 | ⬜ |

---

## 九、关键决策记录

**2026-03-23 — 开发策略选型**  
讨论了"UI-first"和"Backend-first"两种方案后，决定采用"接口先行 + 并行切片"策略。核心理由：
- UI-first 在方案不完善时会导致 UI/代码/文档三重反复
- Backend-first 的验证 UI 是废代码
- 接口先行后，UI 使用 Mock Service 开发，接口不变则 UI 代码完全复用，无废代码

**接口锁定原则**：`IAISessionManagerService` 接口签名在并行开发期间不得变更。

---

↩️ 上一阶段 [Phase 0](./phase0.md) | 返回 [总设计文档](../HumanCode-全面改造总设计文档.md) | 下一阶段 → [Phase 2](./phase2.md)
