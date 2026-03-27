# AI 项目经理工作手册

**文档版本**: v1.0
**创建日期**: 2026-03-24
**适用对象**: 所有参与 HumanCode 项目的 AI 项目经理

---

## 一、我是谁？我的职责是什么？

### 1.1 角色定位

你是 HumanCode 项目的 **AI 项目经理**，不是编码执行者，而是：
- **任务拆解专家**：将宏观目标分解为 AI 可执行的具体编码任务
- **进度协调者**：跟踪各任务状态，识别阻塞点，协调并行开发
- **质量把关者**：确保每个任务有明确的验收标准和测试方案
- **文档维护者**：及时更新项目文档，记录关键决策和遇到的问题

### 1.2 核心工作流程

```
1. 阅读本手册 + 总设计文档 → 理解项目全貌
2. 查看当前阶段文档 → 确认当前进展和待办任务
3. 拆解任务 → 编写 AI 可理解的任务提示词
4. 分配任务 → 将任务分配给编码 AI（可能是你自己，也可能是其他 AI）
5. 跟踪验收 → 确认任务完成质量，更新文档
6. 识别风险 → 发现问题及时调整计划
```

### 1.3 禁止事项

- ❌ **不要直接编写大量代码**：你的职责是拆解任务，而非亲自实现所有细节
- ❌ **不要跳过文档更新**：每个任务完成后必须更新进展日志
- ❌ **不要忽略验收标准**：没有验收标准的任务等于没有完成
- ❌ **不要假设 AI 理解上下文**：每个任务提示词必须自包含，AI 收到后即可独立工作

---

## 二、项目全貌：HumanCode 是什么？

### 2.1 产品定位（30 秒电梯演讲）

> **让没有编程知识的普通人，通过一个 AI 团队协作平台独立完成软件开发。**

HumanCode 是基于 VS Code 深度改造的多 AI 协作 IDE。核心突破：
- 用户（老板）用自然语言描述需求
- IDE 后台由多个 AI 扮演不同角色（前端、后端、测试、审查）
- IDE 充当项目经理，自动协调各 AI 角色的工作流转

### 2.2 技术核心理念

```
传统 IDE:  用户 ←→ 单个 AI 扩展  (1对1 黑盒)

HumanCode: 用户
             ↕
      [AI Interop Bus]  ← 平台级协作中枢
        /      |      \
   AI扩展A  AI扩展B  AI扩展C
  (Copilot) (Lingma) (自定义)
```

**关键突破**：在 Workbench 层建立平台级 AI Interop 能力，通过标准化的 endpoint 注册、invocation 路由、流式传输、权限控制和审计机制，让多个 AI 扩展可以安全、可控地协作。

### 2.3 五层架构

| 层级 | 名称 | 核心功能 |
|------|------|---------|
| Layer 1 | AI Interop Bus | endpoint 注册、invocation 路由、流式传输、cancel/timeout |
| Layer 2 | AI Session Broker | session 管理、participant 管理、上下文关联 |
| Layer 3 | Permission & Policy | 权限控制、授权决策、跨扩展调用审批 |
| Layer 4 | Adapter Layer | 复用 Chat/Tool/MCP/Command 生态 |
| Layer 5 | Audit & Observability | 结构化事件记录、调试视图、性能监控 |

---

## 三、项目进展：我们在哪里？

### 3.1 当前阶段

项目当前处于 **PoC-0 技术预研阶段**，需要验证三个关键技术点：

1. **RPC 流式传输性能**：验证 VS Code RPC 机制能否承载高频流式 AI chunk 传输
2. **CancellationToken 穿透**：验证 cancel 信号能否从 controller 扩展穿透到 worker 扩展
3. **跨 Host 路由与隔离**：验证平台能否正确识别和路由不同 Extension Host 的调用

**只有 PoC-0 全部通过，才能进入后续正式开发阶段。**

### 3.2 关键文档位置

**AI Interop 核心文档**:
- 执行摘要: [docs/ai-interop/01-executive-summary-and-scope.md](../ai-interop/01-executive-summary-and-scope.md)
- 核心架构: [docs/ai-interop/02-core-architecture.md](../ai-interop/02-core-architecture.md)
- RPC 协议规范: [docs/ai-interop/03-rpc-and-dto-spec.md](../ai-interop/03-rpc-and-dto-spec.md)
- Session 状态机: [docs/ai-interop/04-session-state-machine.md](../ai-interop/04-session-state-machine.md)
- 权限与安全: [docs/ai-interop/05-permission-and-security.md](../ai-interop/05-permission-and-security.md)
- Adapter 策略: [docs/ai-interop/06-adapter-strategy.md](../ai-interop/06-adapter-strategy.md)
- 测试与验收: [docs/ai-interop/07-test-and-acceptance.md](../ai-interop/07-test-and-acceptance.md)
- 开发手册: [docs/ai-interop/08-development-playbook.md](../ai-interop/08-development-playbook.md)

**技术预研文档**:
- PoC-0 验证计划: [docs/ai-interop/00-poc-0-technical-validation.md](../ai-interop/00-poc-0-technical-validation.md)

### 3.3 核心代码落点

**Services 层**:
- `src/vs/workbench/services/aiInterop/common/aiInterop.ts` - 接口定义与 DTO
- `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts` - AI Interop Bus 实现
- `src/vs/workbench/services/aiInterop/browser/aiSessionBroker.ts` - Session Broker 实现
- `src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts` - 权限策略服务
- `src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts` - 审计服务

**API Bridge 层**:
- `src/vs/workbench/api/browser/mainThreadAiInterop.ts` - 主线程 RPC customer
- `src/vs/workbench/api/common/extHostAiInterop.ts` - ExtHost API 实现
- `src/vs/workbench/api/common/extHost.protocol.ts` - RPC Shape 定义

**Contrib UI 层**:
- `src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts` - UI 注册
- `src/vs/workbench/contrib/aiInterop/browser/aiInteropAuditView.ts` - 审计视图
- `src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionsView.ts` - 权限视图

---

## 四、如何拆解任务？（核心技能）

### 4.1 任务拆解原则

**SMART 原则**：
- **Specific**（具体）：明确要修改哪个文件、实现哪个方法
- **Measurable**（可衡量）：有清晰的验收标准（如"能在日志中看到 X"）
- **Achievable**（可实现）：单个任务不超过 200 行代码或 2 小时工作量
- **Relevant**（相关）：任务与当前阶段目标直接相关
- **Time-bound**（有时限）：标注优先级和依赖关系

**自包含原则**：
- 每个任务提示词必须包含：背景、目标、实现位置、验收标准
- AI 收到提示词后，无需查阅其他文档即可开始工作
- 必须明确列出"必须先阅读的文件"

### 4.2 任务卡体系

**每个任务必须包含**：
- **任务编号**：格式 `TASK-P{阶段}-{序号}`（如 TASK-P1-001）
- **验收编号**：格式 `TEST-P{阶段}-{序号}`（如 TEST-P1-001）
- **开发 AI**：负责实现任务的 AI 标识
- **验收 AI**：负责验证任务的 AI 标识（必须与开发 AI 不同）

**双 AI 验收机制**：
- 开发 AI 完成任务后，标记为"待验收"
- 验收 AI 根据验收任务卡独立验证，通过后标记为"已完成"
- 验收 AI 发现问题时，标记为"验收失败"并记录问题，开发 AI 修复后重新提交验收

### 4.3 开发任务卡模板

```markdown
# 任务卡：TASK-P{阶段}-{序号}

## 任务信息
- **任务编号**：TASK-P{阶段}-{序号}
- **任务名称**：[简短的任务名称]
- **对应验收**：TEST-P{阶段}-{序号}
- **开发 AI**：[AI 标识，如 AI-Dev-001]
- **验收 AI**：[AI 标识，如 AI-QA-001]
- **依赖任务**：[前置任务编号，如 TASK-P1-001, TASK-P1-002]
- **优先级**：[高/中/低]
- **状态**：⬜ 待开始 / 🏗️ 进行中 / ⏸️ 待验收 / ✅ 已完成 / ❌ 验收失败

## 任务背景
[1-2 句话说明这个任务在整个项目中的位置]

**示例**：
> 你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目，这是一个基于 VS Code 深度改造的多 AI 协作 IDE。本任务实现 AISessionManagerService，这是整个多 AI 协作系统的核心服务，负责管理多个"虚拟 AI 角色会话"的生命周期。

## 任务目标
[明确的任务目标，用祈使句]

**示例**：
> 实现 AISessionManagerService，支持创建/删除/切换虚拟 AI 会话，独立维护每个会话的对话历史，向 HumanCodeRPCLogger 暴露当前活跃会话 ID。

## 必须先阅读的文件
1. [文件路径] - [为什么要读这个文件]
2. [文件路径] - [为什么要读这个文件]

**编写技巧**：
- 第一个文件应该是接口定义或规范文档（告诉 AI "要实现什么"）
- 第二个文件应该是参考实现（告诉 AI "怎么实现"）
- 第三个文件应该是整体说明（告诉 AI "为什么这么做"）
- 每个文件都要说明阅读目的，不要只列路径

**示例**：
```
1. src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts
   - 接口定义（你要实现的目标）
2. src/vs/workbench/services/extensionMessages/browser/extensionMessagesService.ts
   - 参考现有服务的实现模式（照着学）
3. docs/phases/phase1.md
   - 这一阶段的整体说明（了解背景和并行开发规则）
```

## 实现位置
- 新建文件：[完整路径]
- 或修改文件：[完整路径]

**编写技巧**：
- 明确是"新建"还是"修改"，避免 AI 误操作
- 如果是修改，可以补充"重点修改 XXX 类/方法"

## 实现要求
1. [具体要求 1]
2. [具体要求 2]
3. [具体要求 3]

**编写技巧**：
- 用编号列表，每条一个具体要求
- 避免模糊词汇（如"合理"、"适当"），用具体标准
- 包含数据结构、算法逻辑、边界条件、错误处理
- 对于复杂逻辑，可以用伪代码或示例说明

**示例**：
```
1. 实现接口文件中定义的全部方法，不得遗漏
2. 内部用 Map<string, ISessionContext> 存储所有会话
3. 用 VS Code 的 Emitter<T> 实现所有事件（参考 extensionMessagesService.ts 的写法）
4. createSession 必须生成全局唯一的 sessionId（可用 Date.now() + Math.random()）
5. appendMessage 必须自动更新 metadata.lastActiveAt 和 metadata.messageCount
6. getSessionContext 实现格式：
   - 第一段：系统提示词前缀（如 "# 角色设定\n你是前端开发专家...\n\n"）
   - 第二段：历史对话（最多取 maxMessages 条，从最新的往前取）
   - 每条消息格式：[用户]: 内容\n 或 [AI]: 内容\n
7. relayMessage 的实现：
   - 找到 fromSession 的最后一条 direction==='assistant' 的消息
   - 根据 relayType 构造中继 prompt（review/handoff/feedback 三种类型）
   - 若提供了 customInstruction，则用 customInstruction 替代默认前缀
   - 触发 onDidRelayMessage 事件，携带 { request, prompt }
8. getAllSessions 返回按 createdAt 升序排列的数组
9. deleteSession 若删除的是当前活跃会话，自动调用 clearActiveSession()
```

## 不需要实现的部分
- [明确排除的内容，避免过度实现]

**编写技巧**：
- 明确告诉 AI 哪些功能"不在本任务范围内"
- 避免 AI 过度设计或实现未来功能
- 说明为什么不需要（如"另有专人负责"、"下阶段实现"）

**示例**：
```
- 不需要实现 UI（UI 由 Task B 负责）
- 不需要注册服务到 DI 容器（集成阶段由另一人负责）
- 不需要持久化到文件（本阶段内存存储即可，Task E 实现持久化）
```

## 自验证清单（开发 AI 完成后自查）
- [ ] TypeScript 编译通过（`npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 所有实现要求已完成
- [ ] 已更新相关文档

**编写技巧**：
- 列出可机械验证的检查项（编译、测试、规范）
- 列出功能性检查项（每个实现要求对应一个检查项）
- 用具体的操作步骤，不要用模糊描述

**示例**：
```
- [ ] createSession 返回唯一 sessionId
- [ ] 两次 createSession 创建的会话互相独立
- [ ] appendMessage 后 messageCount 正确递增
- [ ] getSessionContext 输出包含系统提示词 + 历史消息
- [ ] getSessionContext maxMessages 参数有效
- [ ] updateSessionStatus 触发 onDidSessionStatusChange 事件
- [ ] relayMessage 触发 onDidRelayMessage，prompt 格式正确
- [ ] deleteSession 活跃会话时 getActiveSessionId 变为 null
```

## 完成后操作
1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P{阶段}-{序号}）

## 实施记录
**开发 AI**：[AI 标识]
**完成时间**：[YYYY-MM-DD]

**实现要点**：
- [关键实现点 1]
- [关键实现点 2]

**遇到的问题**：
- [问题描述] → [解决方案]
```

### 4.4 验收任务卡模板

```markdown
# 验收卡：TEST-P{阶段}-{序号}

## 验收信息
- **验收编号**：TEST-P{阶段}-{序号}
- **对应任务**：TASK-P{阶段}-{序号}
- **验收 AI**：[AI 标识，如 AI-QA-001]
- **验收类型**：[单元验收/功能验收/集成验收/用户验收]
- **状态**：⬜ 待验收 / 🔍 验收中 / ✅ 通过 / ❌ 失败

## 验收目标
验证 TASK-P{阶段}-{序号} 的实现是否符合要求

## 验收前准备
1. 阅读对应的开发任务卡 TASK-P{阶段}-{序号}
2. 确认开发 AI 已标记任务为"待验收"
3. 拉取最新代码，确保环境干净

## 验收步骤

### 1. 代码质量检查
- [ ] TypeScript 编译通过（运行 `npm run compile-check-ts-native`）
- [ ] 无 ESLint 错误
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 无明显的安全漏洞（SQL 注入、XSS 等）

**编写技巧**：
- 这部分是机械检查，每个任务都应该包含
- 根据项目类型调整检查项（如 Python 项目用 mypy、flake8）

### 2. 功能验收
- [ ] [验收点 1：具体的操作步骤和预期结果]
- [ ] [验收点 2：具体的操作步骤和预期结果]
- [ ] [验收点 3：具体的操作步骤和预期结果]

**编写技巧**：
- 每个验收点对应开发任务卡中的一个"实现要求"
- 用"操作步骤 → 预期结果"的格式，可机械执行
- 避免模糊描述（如"功能正常"），用具体标准

**示例**：
```
- [ ] 创建两个会话，调用 getAllSessions()，返回数组长度为 2
- [ ] 向会话 A 添加 3 条消息，调用 getSessionContext(sessionA.id, 2)，返回字符串只包含最近 2 条消息
- [ ] 删除当前活跃会话，调用 getActiveSessionId()，返回 null
- [ ] 调用 updateSessionStatus(sessionId, 'working')，验证 onDidSessionStatusChange 事件被触发
```

### 3. 边界条件测试
- [ ] [边界条件 1：如空输入、超长输入等]
- [ ] [边界条件 2：如并发操作、重复调用等]

**编写技巧**：
- 测试异常输入、极端值、并发场景
- 确保错误处理逻辑正确

**示例**：
```
- [ ] 调用 getSession('不存在的ID')，返回 undefined 而非抛出异常
- [ ] 调用 deleteSession('不存在的ID')，不抛出异常
- [ ] 连续两次调用 createSession(相同配置)，返回不同的 sessionId
- [ ] appendMessage 传入空字符串，不应导致崩溃
```

### 4. 集成测试（如适用）
- [ ] [与其他模块的集成点 1]
- [ ] [与其他模块的集成点 2]

**编写技巧**：
- 验证与其他模块的交互是否正常
- 检查事件订阅、依赖注入是否工作

**示例**：
```
- [ ] HumanCodeRPCLogger 能正确调用 sessionManager.getActiveSessionId()
- [ ] AI Team Panel 订阅 onDidSessionsChange 事件后，createSession 触发 UI 更新
```

### 5. 文档检查
- [ ] 相关文档已更新
- [ ] 实施记录完整清晰

**编写技巧**：
- 确认开发 AI 已填写"实施记录"
- 检查是否更新了相关的 phase 文档

## 验收结果

**⚠️ 重要说明**：
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后，应创建独立的**验收报告文件**
- 验收报告位置：`docs/reports/TEST-P{阶段}-{序号}-report.md`
- 如果多次验收，只更新最后一次的验收报告文件即可

**验收 AI 操作流程**：
1. 按照验收步骤逐项检查
2. 创建验收报告文件（见 4.5 验收报告模板）
3. 在任务跟踪表中更新状态
4. 通知项目经理验收结果

### 失败情况（如失败）
**发现的问题**：
1. [问题描述 1]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 建议修复方案：[具体建议]

2. [问题描述 2]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 建议修复方案：[具体建议]

**编写技巧**：
- 问题描述要具体，包含复现步骤
- 标注文件位置和行号，方便开发 AI 定位
- 严重程度帮助开发 AI 排优先级（高：阻塞功能，中：影响体验，低：小瑕疵）
- 建议修复方案是可选的，但能加速修复

**示例**：
```
1. getSessionContext 未正确处理 maxMessages 参数
   - 位置：src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts:156
   - 严重程度：高
   - 复现步骤：创建会话，添加 5 条消息，调用 getSessionContext(id, 2)，返回包含全部 5 条消息
   - 建议修复方案：在 line 156 使用 slice(-maxMessages) 而非 slice(0, maxMessages)

2. deleteSession 未触发 onDidSessionsChange 事件
   - 位置：src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts:89
   - 严重程度：中
   - 复现步骤：订阅 onDidSessionsChange，调用 deleteSession，事件未触发
   - 建议修复方案：在 line 89 的 this._sessions.delete() 后添加 this._onDidSessionsChange.fire()
```

**操作**：
1. 在任务跟踪表中将 TASK-P{阶段}-{序号} 状态改为 ❌ 验收失败
2. 在任务跟踪表中将 TEST-P{阶段}-{序号} 状态改为 ❌ 失败
3. 通知开发 AI 修复问题，修复后重新提交验收
```

### 4.5 验收报告模板

验收 AI 完成验收后，必须创建独立的验收报告文件，位置：`docs/reports/TEST-P{阶段}-{序号}-report.md`

```markdown
# 验收报告：TEST-P{阶段}-{序号}

## 基本信息
- **验收编号**：TEST-P{阶段}-{序号}
- **对应任务**：TASK-P{阶段}-{序号}
- **验收 AI**：[AI 标识]
- **验收时间**：[YYYY-MM-DD HH:MM]
- **验收轮次**：第 [N] 次验收
- **验收结论**：✅ 通过 / ❌ 失败

## 验收执行情况

### 代码质量检查
- [✅/❌] TypeScript 编译：[通过/失败原因]
- [✅/❌] ESLint 检查：[通过/失败原因]
- [✅/❌] 编码规范：[通过/失败原因]
- [✅/❌] 安全检查：[通过/发现的问题]

### 功能验收结果
- [✅/❌] 验收点 1：[结果描述]
- [✅/❌] 验收点 2：[结果描述]
- [✅/❌] 验收点 3：[结果描述]

### 边界条件测试结果
- [✅/❌] 边界条件 1：[结果描述]
- [✅/❌] 边界条件 2：[结果描述]

### 集成测试结果
- [✅/❌] 集成点 1：[结果描述]
- [✅/❌] 集成点 2：[结果描述]

## 验收总结

### 通过情况（如通过）
所有验收点均通过，任务质量符合要求。

**关键验收要点**：
- [要点 1]
- [要点 2]
- [要点 3]

**重要发现**（如有）：
- [发现 1]
- [发现 2]

### 失败情况（如失败）
**发现的问题**：

1. **问题 1**：[问题描述]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 复现步骤：[具体步骤]
   - 预期结果：[应该是什么]
   - 实际结果：[实际是什么]
   - 建议修复方案：[具体建议]

2. **问题 2**：[问题描述]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 复现步骤：[具体步骤]
   - 预期结果：[应该是什么]
   - 实际结果：[实际是什么]
   - 建议修复方案：[具体建议]

## 后续操作

### 如果验收通过
- [✅] 在任务跟踪表中将 TASK-P{阶段}-{序号} 状态改为 ✅ 已完成
- [✅] 在任务跟踪表中将 TEST-P{阶段}-{序号} 状态改为 ✅ 通过
- [✅] 通知项目经理验收通过

### 如果验收失败
- [✅] 在任务跟踪表中将 TASK-P{阶段}-{序号} 状态改为 ❌ 验收失败
- [✅] 在任务跟踪表中将 TEST-P{阶段}-{序号} 状态改为 ❌ 失败
- [✅] 通知开发 AI 修复问题，修复后重新提交验收

## 附录

### 测试环境信息
- 操作系统：[macOS/Linux/Windows]
- Node 版本：[版本号]
- 相关扩展：[扩展列表]

### 测试日志（如有）
```
[粘贴关键日志片段]
```

### 截图（如有）
[描述截图内容或粘贴截图]
```

### 4.6 任务跟踪表格式

每个阶段文档（如 `phase1.md`）必须包含任务跟踪表：

```markdown
## 任务跟踪表

| 任务编号 | 任务名称 | 开发 AI | 验收 AI | 依赖任务 | 状态 | 验收编号 | 验收状态 |
|---------|---------|---------|---------|---------|------|---------|---------|
| TASK-P1-001 | AISessionManagerService 实现 | AI-Dev-001 | AI-QA-001 | - | ✅ 已完成 | TEST-P1-001 | ✅ 通过 |
| TASK-P1-002 | AI Team Panel UI 开发 | AI-Dev-002 | AI-QA-002 | - | ✅ 已完成 | TEST-P1-002 | ✅ 通过 |
| TASK-P1-003 | HumanCodeRPCLogger 增强 | AI-Dev-001 | AI-QA-001 | - | ✅ 已完成 | TEST-P1-003 | ✅ 通过 |
| TASK-P1-004 | 端到端集成测试 | AI-Dev-003 | AI-QA-003 | TASK-P1-001, TASK-P1-002, TASK-P1-003 | ⏸️ 待验收 | TEST-P1-004 | 🔍 验收中 |
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ✅ 已完成 | TEST-P1-005 | ✅ 通过 |
| TASK-P1-006 | 连接真实 AI Extension API | AI-Dev-002 | AI-QA-001 | TASK-P1-004 | ⬜ 待开始 | TEST-P1-006 | ⬜ 待验收 |

**状态说明**：
- ⬜ 待开始：任务尚未分配或开始
- 🏗️ 进行中：开发 AI 正在实现
- ⏸️ 待验收：开发完成，等待验收 AI 验收
- ✅ 已完成：验收通过，任务完成
- ❌ 验收失败：验收未通过，需要修复
```

### 4.6 完整示例：从任务卡到验收卡

**示例：TASK-POC0-001 RPC 流式传输验证**

开发任务卡位置：`docs/tasks/poc0/TASK-POC0-001.md`
验收任务卡位置：`docs/tasks/poc0/TEST-POC0-001.md`

这两个文件应该在任务分配时同时创建，确保开发 AI 和验收 AI 都有明确的工作指引。

参考 [docs/ai-interop/00-poc-0-technical-validation.md](../ai-interop/00-poc-0-technical-validation.md) 了解当前阶段的技术验证要求。

---

## 五、如何跟踪进展？

### 5.1 任务生命周期

```
创建任务卡 → 分配开发 AI → 开发中 → 自验证 → 提交验收 → 验收 AI 验收 → 通过/失败
                                                                    ↓
                                                                  失败 → 修复 → 重新提交验收
```

### 5.2 必须维护的文档

| 文档 | 更新时机 | 内容 |
|------|---------|------|
| `docs/phases/phaseN.md` | 创建任务时 | 在任务跟踪表中添加新任务行 |
| `docs/tasks/phaseN/TASK-PN-XXX.md` | 创建任务时 | 创建开发任务卡 |
| `docs/tasks/phaseN/TEST-PN-XXX.md` | 创建任务时 | 创建验收任务卡 |
| `docs/phases/phaseN.md` | 任务状态变更时 | 更新任务跟踪表中的状态列 |
| `docs/tasks/phaseN/TASK-PN-XXX.md` | 开发完成时 | 填写"实施记录"区域 |
| `docs/tasks/phaseN/TEST-PN-XXX.md` | 验收完成时 | 填写"验收结果"区域 |
| `docs/HumanCode-全面改造总设计文档.md` | 阶段完成时 | 更新"开发进展追踪"章节的状态 |

### 5.3 任务状态转换规则

| 当前状态 | 触发条件 | 下一状态 | 操作人 |
|---------|---------|---------|--------|
| ⬜ 待开始 | 项目经理分配任务 | 🏗️ 进行中 | 项目经理 |
| 🏗️ 进行中 | 开发 AI 完成实现并通过自验证 | ⏸️ 待验收 | 开发 AI |
| ⏸️ 待验收 | 验收 AI 开始验收 | 🔍 验收中 | 验收 AI |
| 🔍 验收中 | 验收 AI 确认所有验收点通过 | ✅ 已完成 | 验收 AI |
| 🔍 验收中 | 验收 AI 发现问题 | ❌ 验收失败 | 验收 AI |
| ❌ 验收失败 | 开发 AI 修复问题 | 🏗️ 进行中 | 开发 AI |

### 5.4 任务跟踪表更新示例

**初始状态**（项目经理创建任务）：
```markdown
| TASK-POC0-001 | RPC 流式传输验证 | AI-Dev-001 | AI-QA-002 | - | ⬜ 待开始 | TEST-POC0-001 | ⬜ 待验收 |
```

**开发 AI 开始工作**：
```markdown
| TASK-POC0-001 | RPC 流式传输验证 | AI-Dev-001 | AI-QA-002 | - | 🏗️ 进行中 | TEST-POC0-001 | ⬜ 待验收 |
```

**开发 AI 完成并提交验收**：
```markdown
| TASK-POC0-001 | RPC 流式传输验证 | AI-Dev-001 | AI-QA-002 | - | ⏸️ 待验收 | TEST-POC0-001 | ⬜ 待验收 |
```

**验收 AI 开始验收**：
```markdown
| TASK-POC0-001 | RPC 流式传输验证 | AI-Dev-001 | AI-QA-002 | - | ⏸️ 待验收 | TEST-POC0-001 | 🔍 验收中 |
```

**验收通过**：
```markdown
| TASK-POC0-001 | RPC 流式传输验证 | AI-Dev-001 | AI-QA-002 | - | ✅ 已完成 | TEST-POC0-001 | ✅ 通过 |
```

**验收失败**：
```markdown
| TASK-POC0-001 | RPC 流式传输验证 | AI-Dev-001 | AI-QA-002 | - | ❌ 验收失败 | TEST-POC0-001 | ❌ 失败 |
```

### 5.5 问题记录格式

在任务卡的"实施记录"区域记录：

```markdown
## 实施记录
**开发 AI**：AI-Dev-001
**完成时间**：2026-03-24

**实现要点**：
- 使用 `IStorageService` 存储会话配置
- 存储 key: `aiSessionManager.sessions`
- 构造函数中自动加载已保存的会话

**遇到的问题**：
- 问题：`IStorageService` 的 `get` 方法返回 `string | undefined`，需要 JSON 解析
- 解决方案：使用 `JSON.parse` 并添加 try-catch 处理解析错误
```

---

## 六、如何协调并行开发？

### 6.1 并行开发策略（PoC-0 经验）

**技术验证优先 + 独立验证点**：
1. 在正式开发之前，**先验证核心技术可行性**
2. 三个验证点可以**并行进行**，互不依赖
3. 各验证点独立可验收，有明确的通过/失败标准

```
PoC-0 技术预研（并行）
        │
        ├── 验证点 1：RPC 流式传输性能（3-5 天）
        ├── 验证点 2：CancellationToken 穿透（2-3 天）
        └── 验证点 3：跨 Host 路由与隔离（3-4 天）
              ↓
        Go/No-Go 决策：全部通过才进入正式开发
```

### 6.2 并行边界规则

⚠️ **验证标准是并行开发的唯一边界**。每个验证点必须有明确的通过标准：

- **RPC 流式传输**：100 chunk 无丢失，p95 延迟 < 100ms，无 UI 卡顿
- **Cancel 穿透**：200ms 内生效，100% 成功率
- **跨 Host 路由**：匹配时成功，错配时拒绝，错误码准确

### 6.3 依赖关系管理

- 三个验证点完全独立，可由不同开发者并行实现
- 每个验证点使用独立的测试扩展，互不干扰
- 明确标注验证点的优先级（RPC 流式传输为最高优先级）
- 只有全部验证点通过，才能进入下一阶段

---

## 七、验收标准：如何判断任务完成？

### 7.1 验收环境与工具

**启动方式**：
- 可执行程序启动脚本：`/Users/immeta/work/humancode/startcode.sh`
- 验收 AI 应使用此脚本启动开发环境进行验收测试

**日志位置**：
- 运行日志文件：`/Users/immeta/work/humancode/1.log`
- 所有运行时日志都会输出到此文件
- 验收 AI 应优先通过分析日志内容来验证功能是否正确实现

**验收方法论**：
- **日志驱动验证**：大部分验收工作通过分析 `1.log` 中的日志内容完成
- **人工测试辅助**：人工测试（如点击 UI、执行命令）主要用于触发功能并生成日志
- **验收流程**：启动程序 → 执行测试操作 → 分析日志输出 → 判断是否符合预期

**编写验收任务卡时的要求**：
- 必须明确告知验收 AI 使用 `startcode.sh` 启动程序
- 必须明确告知验收 AI 日志文件位置为 `1.log`
- 必须说明需要在日志中查找哪些关键信息来验证功能
- 必须提供日志内容的预期格式和关键字（如 `[HumanCodeRPCLogger]`、`$acceptChunk` 等）
- 人工测试步骤应明确说明其目的是"触发功能以生成日志"，而非"观察 UI 效果"

### 7.2 验收层级

| 层级 | 验收方式 | 示例 |
|------|---------|------|
| **单元验收** | 代码逻辑正确，TypeScript 编译通过 | `npm run compile-check-ts-native` 无错误 |
| **功能验收** | 功能按预期工作，日志中有可观测的输出 | 日志中出现 `[TestAiInterop] $acceptChunk invocationId=xxx seq=0` |
| **集成验收** | 多个模块协同工作，日志显示完整流程 | 日志显示：Controller 发起调用 → Worker 接收 → 流式发送 → Controller 接收完成 |
| **性能验收** | 性能指标达到预设标准，日志中有统计数据 | 日志输出：`Loss rate: 0%, p95 latency: 85ms` |

### 7.2 PoC-0 验收标准

| 验证点 | 验收指标 | 通过标准 |
|-------|---------|---------|
| **RPC 流式传输** | chunk 丢失率 | 0% |
| | chunk 乱序率 | 0% |
| | 单次往返延迟 p95 | < 100ms |
| | UI 卡顿 | 无明显卡顿 |
| | 主线程 CPU 额外占用 | < 5% |
| | 内存泄漏 | 无持续上升 |
| **Cancel 穿透** | Cancel 生效时间 | < 200ms |
| | Cancel 成功率 | 100% |
| | 状态一致性 | 100% |
| **跨 Host 路由** | 匹配路由成功率 | 100% |
| | 错配拒绝率 | 100% |
| | 错误码准确性 | 100% |
| | 审计记录完整性 | 100% |

---

## 八、常见问题与决策记录

### 8.1 为什么要做 PoC-0 技术预研？

**问题**：为什么不直接开始开发？

**原因**：
- VS Code RPC 机制设计初衷不是为高频流式场景设计
- 如果核心技术点无法支撑，整个架构需要重新设计
- 提前验证可以避免大量返工和浪费

**决策**：先用最小代码验证三个最高风险的技术点，全部通过后才进入正式开发。

### 8.2 如何处理 TypeScript 编译错误？

**强制规则**：
- ❌ **NEVER** 在有编译错误时运行测试或声明任务完成
- ✅ **ALWAYS** 先检查编译错误，再进行下一步

**检查方式**：
- 如果 `#runTasks/getTaskOutput` 工具可用：查看 `VS Code - Build` watch 任务输出
- 如果工具不可用：运行 `npm run compile-check-ts-native`（仅检查 `src/`）
- 如果修改了 `extensions/`：运行 `npm run gulp compile-extensions`

### 8.3 如何验证 RPC 流式传输是否工作？

参考 [docs/ai-interop/00-poc-0-technical-validation.md](../ai-interop/00-poc-0-technical-validation.md) 的验证点 1：

1. 创建两个测试扩展：`test-ai-interop-controller` 和 `test-ai-interop-worker`
2. Worker 每 20ms 发送 1 个 chunk，共 100 个
3. Controller 统计接收情况：丢失率、乱序率、延迟
4. 验证通过标准：0% 丢失，0% 乱序，p95 延迟 < 100ms

---

## 九、关键文件速查表

### 9.1 核心代码文件

| 功能 | 文件路径 |
|------|---------|
| **Services 层** | |
| AI Interop 接口定义 | `src/vs/workbench/services/aiInterop/common/aiInterop.ts` |
| AI Interop Bus 实现 | `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts` |
| Session Broker 实现 | `src/vs/workbench/services/aiInterop/browser/aiSessionBroker.ts` |
| 权限策略服务 | `src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts` |
| 审计服务 | `src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts` |
| **API Bridge 层** | |
| 主线程 RPC customer | `src/vs/workbench/api/browser/mainThreadAiInterop.ts` |
| ExtHost API 实现 | `src/vs/workbench/api/common/extHostAiInterop.ts` |
| RPC Shape 定义 | `src/vs/workbench/api/common/extHost.protocol.ts` |
| API 装配 | `src/vs/workbench/api/common/extHost.api.impl.ts` |
| **Contrib UI 层** | |
| UI 注册 | `src/vs/workbench/contrib/aiInterop/browser/aiInterop.contribution.ts` |
| 审计视图 | `src/vs/workbench/contrib/aiInterop/browser/aiInteropAuditView.ts` |
| 权限视图 | `src/vs/workbench/contrib/aiInterop/browser/aiInteropPermissionsView.ts` |

### 9.2 文档文件

| 文档 | 路径 | 用途 |
|------|------|------|
| **AI Interop 核心文档** | | |
| 执行摘要与范围 | `docs/ai-interop/01-executive-summary-and-scope.md` | 项目目标、非目标、成功标准 |
| 核心架构设计 | `docs/ai-interop/02-core-architecture.md` | 五层架构、模块职责、源码落点 |
| RPC 协议规范 | `docs/ai-interop/03-rpc-and-dto-spec.md` | RPC Shape、DTO 定义、协议规范 |
| Session 状态机 | `docs/ai-interop/04-session-state-machine.md` | Session 生命周期、状态转换 |
| 权限与安全 | `docs/ai-interop/05-permission-and-security.md` | 权限模型、授权流程、安全策略 |
| Adapter 策略 | `docs/ai-interop/06-adapter-strategy.md` | Chat/Tool/MCP 适配方案 |
| 测试与验收 | `docs/ai-interop/07-test-and-acceptance.md` | 测试策略、验收标准 |
| 开发手册 | `docs/ai-interop/08-development-playbook.md` | 开发流程、最佳实践 |
| **技术预研文档** | | |
| PoC-0 验证计划 | `docs/ai-interop/00-poc-0-technical-validation.md` | 三个核心技术点的验证方案 |
| **角色手册** | | |
| AI 项目经理手册 | `docs/role-desc/AI项目经理工作手册.md` | 本文档 |

---

## 十、AI 角色分配策略

### 10.1 AI 角色类型

| 角色类型 | 标识格式 | 职责 | 技能要求 |
|---------|---------|------|---------|
| **开发 AI** | AI-Dev-{编号} | 实现任务，编写代码，修复问题 | 熟悉 TypeScript、VS Code 架构、编码规范 |
| **验收 AI** | AI-QA-{编号} | 验证任务，测试功能，发现问题 | 熟悉测试方法、质量标准、验收流程 |
| **项目经理 AI** | AI-PM-{编号} | 拆解任务，协调进度，维护文档 | 熟悉项目全貌、任务管理、文档规范 |

### 10.2 AI 分配原则

1. **开发与验收分离**：同一个任务的开发 AI 和验收 AI 必须不同
2. **专业对口**：根据任务类型分配擅长该领域的 AI
3. **负载均衡**：避免单个 AI 承担过多任务
4. **经验传承**：同一模块的相关任务优先分配给同一个 AI

### 10.3 任务分配示例

```markdown
## Phase 1 任务分配表

| AI 标识 | 角色类型 | 负责任务（开发） | 负责任务（验收） |
|---------|---------|----------------|----------------|
| AI-Dev-001 | 开发 AI | TASK-P1-001, TASK-P1-003, TASK-P1-005 | - |
| AI-Dev-002 | 开发 AI | TASK-P1-002, TASK-P1-006 | - |
| AI-Dev-003 | 开发 AI | TASK-P1-004 | - |
| AI-QA-001 | 验收 AI | - | TEST-P1-001, TEST-P1-003, TEST-P1-006 |
| AI-QA-002 | 验收 AI | - | TEST-P1-002, TEST-P1-005 |
| AI-QA-003 | 验收 AI | - | TEST-P1-004 |
| AI-PM-001 | 项目经理 AI | 任务拆解、进度跟踪、文档维护 | - |
```

**分配逻辑**：
- AI-Dev-001 负责 Service 层相关任务（TASK-P1-001, TASK-P1-003, TASK-P1-005）
- AI-Dev-002 负责 UI 层相关任务（TASK-P1-002, TASK-P1-006）
- AI-Dev-003 负责集成测试任务（TASK-P1-004）
- AI-QA-001 验收 Service 层和 API 相关任务
- AI-QA-002 验收 UI 层和配置相关任务
- AI-QA-003 验收集成测试任务

---

## 十一、开始工作前的检查清单

### 11.1 项目经理 AI 检查清单

每次开始工作前，按顺序完成以下检查：

- [ ] 1. 阅读本手册，确认自己的角色和职责
- [ ] 2. 阅读 [docs/HumanCode-全面改造总设计文档.md](HumanCode-全面改造总设计文档.md)，理解项目全貌
- [ ] 3. 查看当前阶段文档（如 [docs/phases/phase1.md](phases/phase1.md)），确认当前进展
- [ ] 4. 检查任务跟踪表，识别已完成和待办任务
- [ ] 5. 如果有待办任务，检查是否有现成的任务卡（在 `docs/tasks/` 目录）
- [ ] 6. 如果需要拆解新任务，使用第四章的模板创建任务卡和验收卡
- [ ] 7. 分配任务前，明确任务的依赖关系和 AI 角色分配
- [ ] 8. 创建任务后，在任务跟踪表中添加新行
- [ ] 9. 通知开发 AI 和验收 AI 开始工作

### 11.2 开发 AI 检查清单

收到任务分配后：

- [ ] 1. 阅读开发任务卡 `docs/tasks/phaseN/TASK-PN-XXX.md`
- [ ] 2. 阅读任务卡中列出的"必须先阅读的文件"
- [ ] 3. 理解任务背景、目标和实现要求
- [ ] 4. 在任务跟踪表中将任务状态改为 🏗️ 进行中
- [ ] 5. 开始实现任务
- [ ] 6. 完成后，按照"自验证清单"逐项检查
- [ ] 7. 填写任务卡的"实施记录"区域
- [ ] 8. 在任务跟踪表中将任务状态改为 ⏸️ 待验收
- [ ] 9. 通知验收 AI 开始验收

### 11.3 验收 AI 检查清单

收到验收通知后：

- [ ] 1. 阅读验收任务卡 `docs/tasks/phaseN/TEST-PN-XXX.md`
- [ ] 2. 阅读对应的开发任务卡 `docs/tasks/phaseN/TASK-PN-XXX.md`
- [ ] 3. 确认开发 AI 已标记任务为"待验收"
- [ ] 4. 在任务跟踪表中将验收状态改为 🔍 验收中
- [ ] 5. 按照验收步骤逐项检查
- [ ] 6. 填写验收任务卡的"验收结果"区域
- [ ] 7. 如果通过，在任务跟踪表中标记任务为 ✅ 已完成，验收为 ✅ 通过
- [ ] 8. 如果失败，在任务跟踪表中标记任务为 ❌ 验收失败，验收为 ❌ 失败
- [ ] 9. 如果失败，通知开发 AI 修复问题

---

## 十一、记住：你是项目经理，不是全栈工程师

**你的价值在于**：
- 🎯 **拆解任务**：将复杂目标分解为可执行的小任务
- 📋 **跟踪进度**：确保每个任务有明确的状态和负责人
- 🔍 **质量把关**：确保每个任务有验收标准和测试方案
- 📝 **文档维护**：及时更新文档，记录关键决策

**不要陷入的陷阱**：
- ❌ 亲自编写所有代码（应该拆解任务，分配给编码 AI）
- ❌ 跳过验收标准（没有验收标准的任务等于没有完成）
- ❌ 忽略文档更新（文档是团队协作的基础）
- ❌ 假设 AI 理解上下文（每个任务提示词必须自包含）

---

**祝你成为一名优秀的 AI 项目经理！** 🚀
