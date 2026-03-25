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
         [消息路由中枢]  ← 我们开发的核心
        /      |      \
   AI角色A  AI角色B  AI角色C
  (Copilot) (Lingma) (自定义)
```

**关键突破**：扩展本身保持单实例、黑盒不变，我们在 IDE 消息层面实现"虚拟多实例"，通过上下文注入让同一个扩展表现出多个独立 AI 程序员的效果。

### 2.3 四层架构

| 层级 | 名称 | 核心功能 |
|------|------|---------|
| Layer 1 | 用户界面层 | AI Team Commander Panel、Extension Messages View、上下文管理面板 |
| Layer 2 | 消息路由中枢 | IAISessionManagerService、IExtensionMessagesService |
| Layer 3 | 扩展管理层 | ExtensionHostManager、HumanCodeRPCLogger（拦截+注入） |
| Layer 4 | 扩展主机层 | GitHub Copilot、通义灵码等 AI 扩展（黑盒，不修改） |

---

## 三、项目进展：我们在哪里？

**项目进展和任务状态请查看**: [任务跟踪总表](任务跟踪总表.md)

任务跟踪总表包含:
- 所有阶段的任务状态汇总
- AI 角色分配表
- 项目里程碑
- 关键问题记录
- 更新日志

### 3.1 关键文件位置

**Phase 1 核心代码文件**:
- 接口定义: `src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts`
- Service 实现: `src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts`
- UI Panel: `src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts`
- RPC Logger: `src/vs/workbench/services/extensions/common/extensionHostManager.ts`

**阶段文档**:
- Phase 0: [docs/phases/phase0.md](phases/phase0.md)
- Phase 1: [docs/phases/phase1.md](phases/phase1.md)
- Phase 1 集成: [docs/phases/phase1-integration.md](phases/phase1-integration.md)
- Phase 2: [docs/phases/phase2.md](phases/phase2.md)

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

参考 [docs/phases/phase1-task-prompts.md](phases/phase1-task-prompts.md) 查看 Phase 1 的完整任务提示词。

**示例：TASK-P1-005 配置持久化**

开发任务卡位置：`docs/tasks/phase1/TASK-P1-005.md`
验收任务卡位置：`docs/tasks/phase1/TEST-P1-005.md`

这两个文件应该在任务分配时同时创建，确保开发 AI 和验收 AI 都有明确的工作指引。

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
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ⬜ 待开始 | TEST-P1-005 | ⬜ 待验收 |
```

**开发 AI 开始工作**：
```markdown
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | 🏗️ 进行中 | TEST-P1-005 | ⬜ 待验收 |
```

**开发 AI 完成并提交验收**：
```markdown
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ⏸️ 待验收 | TEST-P1-005 | ⬜ 待验收 |
```

**验收 AI 开始验收**：
```markdown
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ⏸️ 待验收 | TEST-P1-005 | 🔍 验收中 |
```

**验收通过**：
```markdown
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ✅ 已完成 | TEST-P1-005 | ✅ 通过 |
```

**验收失败**：
```markdown
| TASK-P1-005 | 配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ❌ 验收失败 | TEST-P1-005 | ❌ 失败 |
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

### 6.1 并行开发策略（Phase 1 经验）

**接口先行 + 垂直切片**：
1. 在所有开发开始之前，**精确定义接口契约**
2. 三条任务线沿接口边界**并行推进**
3. 各任务独立可验收，最后**一次集成**

```
接口契约文件（已完成）
        │
        ├── Task A：Service 实现（纯逻辑，不依赖 UI）
        ├── Task B：UI Panel 开发（使用 Mock Service 驱动）
        └── Task C：RPC Logger 增强（只依赖接口签名）
              ↓
        集成联调：替换 Mock → 端到端验收测试
```

### 6.2 并行边界规则

⚠️ **接口契约是并行开发的唯一边界**。中途不得修改接口签名。
确需修改时，必须所有任务暂停，统一调整后继续。

### 6.3 依赖关系管理

- 使用 Mock Service 解耦 UI 和 Service 的开发依赖
- 明确标注任务间的依赖关系（如"Task D 必须在 Task A/B/C 完成后开始"）
- 优先完成无依赖的任务，最大化并行度

---

## 七、验收标准：如何判断任务完成？

### 7.1 验收层级

| 层级 | 验收方式 | 示例 |
|------|---------|------|
| **单元验收** | 代码逻辑正确，TypeScript 编译通过 | `npm run compile-check-ts-native` 无错误 |
| **功能验收** | 功能按预期工作，有可观测的输出 | 在 Extension Messages View 中看到拦截的消息 |
| **集成验收** | 多个模块协同工作，端到端流程打通 | 创建角色 → 发送任务 → 收到响应 → 状态更新 |
| **用户验收** | 用户可以通过 UI 完成完整工作流 | 通过 UI 完成"需求 → 前端实现 → QA 测试"全流程 |

### 7.2 Phase 1 端到端验收标准

| 验收项 | 操作步骤 | 预期结果 |
|-------|---------|---------|
| **会话隔离** | 创建"前端"和"后端"两个角色，各问"你是谁？" | 两个角色回答内容明显不同 |
| **上下文连续** | 同一角色先说"用React开发"，再问"帮我写个按钮" | 响应中自动使用 React 语法 |
| **消息中继** | 前端角色完成任务后，点击"中继给QA" | QA 角色收到消息，内容含前端输出 |
| **状态同步** | 向角色发送任务，观察卡片状态变化 | 发送后变"工作中"（绿色动画），完成后变"空闲" |
| **配置持久化** | 创建角色后重启 IDE | 角色仍然存在，历史记录保留 |

---

## 八、常见问题与决策记录

### 8.1 为什么选择"接口先行 + 并行切片"？

**问题**：UI-first 和 Backend-first 各有什么问题？

| 方案 | 优点 | 致命弱点 |
|------|------|---------|
| UI-first | 操作流程明确 | 方案任何缺陷都会导致 UI→代码→文档的三重反复 |
| Backend-first | 不存在方案不可行的风险 | 验证后端需要交互 UI，但这段 UI 最终是废代码 |

**决策**：接口先行后，UI 使用 Mock Service 开发，接口不变则 UI 代码完全复用，无废代码。

### 8.2 如何处理 TypeScript 编译错误？

**强制规则**：
- ❌ **NEVER** 在有编译错误时运行测试或声明任务完成
- ✅ **ALWAYS** 先检查编译错误，再进行下一步

**检查方式**：
- 如果 `#runTasks/getTaskOutput` 工具可用：查看 `VS Code - Build` watch 任务输出
- 如果工具不可用：运行 `npm run compile-check-ts-native`（仅检查 `src/`）
- 如果修改了 `extensions/`：运行 `npm run gulp compile-extensions`

### 8.3 如何验证 RPC 拦截是否工作？

参考 [docs/phases/phase1-integration.md](phases/phase1-integration.md) 的 Task D 部分：

1. 启动开发环境：`./startcode.sh`
2. 打开通义灵码聊天窗口，发送消息
3. 查看日志：`tail -f 1.log` 或按 `Cmd+Option+I` 打开 DevTools
4. 搜索关键词：`[HumanCodeRPCLogger]`、`logOutgoing`、`logIncoming`

---

## 九、关键文件速查表

### 9.1 核心代码文件

| 功能 | 文件路径 |
|------|---------|
| RPC 协议核心 | `src/vs/workbench/services/extensions/common/rpcProtocol.ts` |
| Extension Host 管理器 | `src/vs/workbench/services/extensions/common/extensionHostManager.ts` |
| HumanCode RPC Logger | `extensionHostManager.ts` 中 `HumanCodeRPCLogger` 类 |
| 消息服务接口 | `src/vs/workbench/services/extensionMessages/common/extensionMessages.ts` |
| 消息服务实现 | `src/vs/workbench/services/extensionMessages/browser/extensionMessagesService.ts` |
| 消息视图 | `src/vs/workbench/contrib/extensionMessages/browser/extensionMessagesView.ts` |
| AI 会话管理接口 | `src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts` |
| AI 会话管理实现 | `src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts` |
| AI Team Panel | `src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts` |

### 9.2 文档文件

| 文档 | 路径 | 用途 |
|------|------|------|
| **总设计文档** | `docs/HumanCode-全面改造总设计文档.md` | 项目全貌、架构设计、分阶段计划 |
| **产品愿景** | `docs/产品愿景与需求文档.md` | 产品定位、核心价值、用户需求 |
| **Phase 0** | `docs/phases/phase0.md` | 基础消息通路验证（已完成） |
| **Phase 1** | `docs/phases/phase1.md` | 多 AI 虚拟会话管理（进行中） |
| **Phase 1 任务提示词** | `docs/phases/phase1-task-prompts.md` | Task A/B/C 的完整提示词模板 |
| **Phase 1 集成** | `docs/phases/phase1-integration.md` | 集成阶段任务拆解（Task D/E/F） |
| **Phase 2** | `docs/phases/phase2.md` | 自动化协作工作流（待开始） |
| **UI 整体布局** | `docs/ui/UI整体布局.md` | UI 设计原则和界面元素要求 |
| **UI Phase 1** | `docs/ui/ui-phase1.md` | Phase 1 界面设计细节 |
| **开发环境配置** | `docs/开发环境配置.md` | 开发环境搭建和调试方法 |

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
