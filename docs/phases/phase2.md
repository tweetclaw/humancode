# Phase 2 — 自动化协作工作流

**状态**: 📋 待开始
**预计周期**: 4-5 周
**前置依赖**: Phase 1 ✅
**最后更新**: 2026-03-24

---

## 一、阶段目标

在 Phase 1 实现手动多角色协作的基础上，进一步实现**全自动化**：用户只需用自然语言描述需求，系统自动完成任务拆分、角色分配、AI 间协作、循环校验，直到最终输出结果。

> 📌 **产品定位**：让没有编程知识、缺少 IDE 使用经验的普通人，也能通过一个 AI 团队协作平台独立完成软件开发。

**本阶段结束后，用户应当能够**：
- 用一句话描述需求，系统自动分配给合适的 AI 角色
- AI 角色之间自动传递消息（无需用户手动点击中继）
- 通过可视化工作流编辑器定义 AI 协作流程（拖拽式，零门槛）
- 开发→测试→修复的循环自动完成，仅在关键节点向用户汇报

**设计原则**（延续总设计文档第六章）：
- **零门槛**：所有操作用自然语言描述，不暴露技术术语
- **状态透明**：AI 在做什么、做完了什么，用户随时一眼看清
- **拟人化**：AI 角色用"成员卡片"而非"进程列表"来呈现

---

## 二、功能清单

| 功能模块 | 状态 | 说明 |
|---------|------|------|
| **接口契约定义** | ⬜ 待开始 | 定义 `ITaskDispatcher`、`ICollaborationEngine`、`IWorkflowEngine` 接口 |
| `TaskDispatcher` 任务分发引擎 | ⬜ 待开始 | Task A：分析用户需求，自动拆分子任务并分配角色 |
| `CollaborationEngine` 协作引擎 | ⬜ 待开始 | Task B：AI 间自动消息中继，支持循环校验和退出条件 |
| `WorkflowEditor` 工作流编辑器 | ⬜ 待开始 | Task C：拖拽式节点编辑器 UI，可视化定义协作流程 |
| 全局上下文库 | ⬜ 待开始 | Task D：跨会话共享项目记忆，解决"文脉遗忘"问题 |
| **集成联调** | ⬜ 待开始 | 将 A/B/C/D 四条线合并，端到端验收测试 |

---

## 三、开发策略：接口先行 + 垂直切片 + 有限并行

> 📌 延续 Phase 1 的成功经验，继续采用"接口先行 + 并行切片"策略。

### 3.1 为什么继续使用这个策略

Phase 1 的实践证明：
- ✅ 接口契约锁定后，各任务线可以独立推进，无阻塞
- ✅ UI 使用 Mock Service 开发，最终替换为真实 Service 只需改一行
- ✅ 集成时间短，风险可控

### 3.2 Phase 2 的并行任务线

```
接口契约文件（待创建）
        │
        ├── Task A：TaskDispatcher 实现
        │     - 纯逻辑，不依赖 UI
        │     - 用测试脚本验证任务拆分和角色分配
        │
        ├── Task B：CollaborationEngine 实现
        │     - 依赖 IAISessionManagerService（Phase 1 已完成）
        │     - 实现自动中继和循环控制逻辑
        │
        ├── Task C：WorkflowEditor UI 开发
        │     - 使用 MockWorkflowEngine 驱动
        │     - 拖拽式节点编辑器
        │
        └── Task D：全局上下文库实现
              - 跨会话共享项目记忆
              - Token 预算管理

              ↓ 四线完成后
        集成联调：替换 Mock → 端到端验收测试
```

### 3.3 并行边界规则

> ⚠️ **接口契约是并行开发的唯一边界**。中途不得修改接口签名。
> 确需修改时，必须所有任务暂停，统一调整后继续。

---

## 四、接口契约（待定义）

**文件位置（待创建）**：
- `src/vs/workbench/contrib/aiTeam/common/taskDispatcher.ts`（接口定义）
- `src/vs/workbench/contrib/aiTeam/common/collaborationEngine.ts`（接口定义）
- `src/vs/workbench/contrib/aiTeam/common/workflowEngine.ts`（接口定义）
- `src/vs/workbench/services/aiContext/common/contextLibrary.ts`（接口定义）

> 📌 **架构说明**：根据总设计文档第四章，TaskDispatcher、CollaborationEngine、WorkflowEditor 属于 AI Team 功能的一部分，应放在 `contrib/aiTeam/` 下；全局上下文库作为跨功能的基础服务，放在 `services/aiContext/` 下。

### 4.1 核心数据类型（草案）

> ⚠️ 以下为初步设计，将在 Phase 1 完成后与团队讨论确定。

**TaskDispatcher 相关**：
| 类型 | 说明 |
|------|------|
| `ITaskRequest` | 用户输入的需求描述 |
| `ISubTask` | 拆分后的子任务（含任务类型、优先级、依赖关系） |
| `ITaskAssignment` | 任务分配结果（子任务 → 角色映射） |

**CollaborationEngine 相关**：
| 类型 | 说明 |
|------|------|
| `ICollaborationFlow` | 协作流程定义（节点、边、退出条件） |
| `IFlowNode` | 流程节点（AI 角色节点、条件分支节点、用户确认节点） |
| `IFlowEdge` | 流程边（连接两个节点，可附加条件） |
| `ILoopControl` | 循环控制（最大循环次数、退出条件） |

**WorkflowEditor 相关**：
| 类型 | 说明 |
|------|------|
| `IWorkflowTemplate` | 工作流模板（可保存和复用） |
| `INodePosition` | 节点在画布上的位置 |

**ContextLibrary 相关**：
| 类型 | 说明 |
|------|------|
| `IProjectContext` | 项目级上下文（技术栈、架构决策、关键功能） |
| `IContextEntry` | 单条上下文记录（时间戳、来源会话、内容摘要） |

### 4.2 服务方法清单（草案）

**ITaskDispatcher**：
- `analyzeRequest(request: ITaskRequest)` → `ISubTask[]`
- `assignTasks(tasks: ISubTask[])` → `ITaskAssignment[]`

**ICollaborationEngine**：
- `startFlow(flow: ICollaborationFlow)` → `void`
- `stopFlow(flowId: string)` → `void`
- `getFlowStatus(flowId: string)` → `FlowStatus`

**IWorkflowEngine**：
- `createWorkflow(template?: IWorkflowTemplate)` → `string`（返回 workflowId）
- `saveWorkflow(workflowId: string, template: IWorkflowTemplate)` → `void`
- `loadWorkflow(workflowId: string)` → `IWorkflowTemplate`

**IContextLibrary**：
- `addContext(entry: IContextEntry)` → `void`
- `getContext(sessionId?: string)` → `IProjectContext`
- `pruneContext(maxTokens: number)` → `void`

---

## 五、各任务详细说明

### Task A — TaskDispatcher 实现

**文件位置（待创建）**：
`src/vs/workbench/contrib/aiTeam/browser/taskDispatcherService.ts`

**关键实现点**：
- 使用 LLM 或规则引擎分析用户需求，拆分为子任务
- 根据任务类型（前端、后端、测试、文档）自动分配给对应角色
- 支持任务依赖关系（如：测试任务依赖开发任务完成）

**验收方式（不依赖 UI）**：
写测试脚本，输入"实现用户注册功能"，验证：
- 拆分出"前端表单"、"后端 API"、"数据库表"、"单元测试"等子任务
- 自动分配给"前端工程师"、"后端工程师"、"QA 测试"等角色

---

### Task B — CollaborationEngine 实现

**文件位置（待创建）**：
`src/vs/workbench/contrib/aiTeam/browser/collaborationEngineService.ts`

**关键实现点**：
- 依赖 `IAISessionManagerService`（Phase 1 已完成）
- 实现自动消息中继：AI-A 完成 → 自动发送给 AI-B
- 支持循环控制：最大循环次数、退出条件（如：测试全部通过）
- 支持条件分支：根据 AI 输出决定下一步流向

**验收方式（不依赖 UI）**：
写测试脚本，模拟"开发→测试→修复"循环：
- 开发角色完成代码后，自动中继给测试角色
- 测试角色发现问题后，自动中继回开发角色
- 循环 3 次后，即使未通过也能正确退出

---

### Task C — WorkflowEditor UI 开发

**文件位置（待创建）**：
`src/vs/workbench/contrib/aiTeam/browser/workflowEditorPanel.ts`

> 📐 **UI 设计参考**：详见总设计文档 [6.9 工作流编排界面](../HumanCode-全面改造总设计文档.md#69-工作流编排界面phase-2)

**开发策略**：
先创建 `MockWorkflowEngine`，实现接口中所有方法但返回硬编码数据。UI 对接 Mock，保证面板可以正常渲染和交互。

**UI 验收方式（不依赖真实服务）**：
Mock 数据驱动下：
- 画布上可以拖拽创建节点（AI 角色节点、条件分支节点、用户确认节点）
- 节点之间可以连线
- 可以保存和加载工作流模板

---

### Task D — 全局上下文库实现

**文件位置（待创建）**：
`src/vs/workbench/services/aiContext/browser/contextLibraryService.ts`

> 📐 **UI 设计参考**：详见总设计文档 [6.7 上下文管理界面](../HumanCode-全面改造总设计文档.md#67-上下文管理界面)

**关键实现点**：
- 自动提炼每次对话的关键信息（决策、已实现功能、技术选型）
- 跨会话共享，让每个 AI 角色都知道整个项目的背景
- Token 预算管理：控制上下文长度，避免超出 LLM 限制

**验收方式（不依赖 UI）**：
写测试脚本：
- 前端角色说"用 React 开发"，记录到上下文库
- QA 角色在未告知的情况下，能从上下文库获取"项目使用 React"

---

## 六、集成联调步骤

> 在 Task A + B + C + D **全部完成**后执行

1. 将 `WorkflowEditor` 的 `MockWorkflowEngine` 替换为真实 `WorkflowEngine`（修改依赖注入）
2. 确认 `CollaborationEngine` 正确接收到 `TaskDispatcher` 和 `AISessionManagerService` 实例
3. 运行端到端验收测试（见第七章）

---

## 七、验收标准（端到端）

| 验收项 | 操作步骤 | 预期结果 |
|-------|---------|---------|
| **全链路自动化测试** | 输入"实现用户注册功能"，观察 AI 团队协作 | 自动拆分任务 → 分配角色 → 开发 → 测试 → 修复，无需人工干预 |
| **工作流编辑器测试** | 通过拖拽创建一个包含 3 个节点的工作流并执行 | 工作流按预期执行，节点间消息正确传递 |
| **上下文共享测试** | 前端角色说"用 React"，QA 角色在未告知的情况下提问 | QA 角色知道项目使用 React |
| **循环控制测试** | 设置最大循环 3 次，故意让测试失败 | 循环 3 次后正确退出，不会无限循环 |

---

## 八、实施进展日志

| 日期 | 事项 | 状态 |
|------|------|------|
| 2026-03-24 | Phase 2 规划文档创建 | ✅ |
| - | 接口契约定义 | ⬜ |
| - | Task A：TaskDispatcher 实现 | ⬜ |
| - | Task B：CollaborationEngine 实现 | ⬜ |
| - | Task C：WorkflowEditor UI 开发 | ⬜ |
| - | Task D：全局上下文库实现 | ⬜ |
| - | 集成联调，端到端验收测试 | ⬜ |

---

## 九、关键决策记录

**2026-03-24 — Phase 2 规划启动**
参考 Phase 1 的成功经验，决定继续采用"接口先行 + 并行切片"策略。核心理由：
- Phase 1 的实践证明这个策略可以有效降低集成风险
- 接口锁定后，各任务线可以独立推进，提高开发效率
- UI 使用 Mock Service 开发，避免废代码

**接口锁定原则**：所有接口签名在并行开发期间不得变更。

---

## 十、与 Phase 1 的依赖关系

Phase 2 依赖 Phase 1 的以下交付物：
- ✅ `IAISessionManagerService`：用于管理 AI 角色会话
- ✅ `AI Team Commander Panel`：用于展示 AI 团队状态
- ✅ `HumanCodeRPCLogger`：用于拦截和注入上下文

Phase 2 将在 Phase 1 的基础上，增加以下能力：
- 🆕 自动任务拆分和角色分配
- 🆕 AI 间自动消息中继
- 🆕 可视化工作流编辑器
- 🆕 全局上下文库

---

↩️ 上一阶段 [Phase 1](./phase1.md) | 返回 [总设计文档](../HumanCode-全面改造总设计文档.md)

### 3.1 任务自动分发
- 用户输入自然语言需求
- 系统（或 AI）自动分析并拆解为子任务
- 根据任务类型自动路由到对应角色（前端任务 → 前端角色，测试任务 → QA 角色）

### 3.2 AI 间自动协作
- 一个 AI 完成任务后，自动将结果发送给下一个 AI
- 支持设置最大循环次数（避免无限循环）
- 支持自定义退出条件（如：测试全部通过 → 停止循环）

### 3.3 可视化工作流编辑器
- 拖拽节点，连线定义流程
- 节点类型：AI 角色节点、条件分支节点、用户确认节点、终止节点
- 流程可保存为模板，复用于不同项目

### 3.4 全局上下文库
- 自动提炼每次对话的关键信息（决策、已实现功能、技术选型）
- 跨会话共享，让每个 AI 角色都知道整个项目的背景
- 控制上下文长度（Token 预算管理）

---

## 四、验收标准

> ⚠️ 详细测试用例将在实施时补充。

| 验收项 | 预期结果 |
|-------|---------|
| 全链路自动化测试 | 输入"实现用户注册功能"，AI 团队完成开发→测试→修复，无需人工干预 |
| 工作流编辑器测试 | 可以通过拖拽创建一个包含 3 个节点的工作流并执行 |
| 上下文共享测试 | QA 角色在未告知的情况下，知道前端使用了 React |
| 循环控制测试 | 设置最大循环 3 次后，即使未通过也能正确退出 |

---

## 五、实施记录

> 此区域在 Phase 1 完成后、本阶段开始时填充。

_（待开始）_

---

↩️ 上一阶段 [Phase 1](./phase1.md) | 返回 [总设计文档](../HumanCode-全面改造总设计文档.md)
