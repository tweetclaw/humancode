# Phase 1 — 三条任务线 AI 工作提示词

> 本文档包含三份独立的提示词，可以分给三个不同的 AI，也可以同一个 AI 分三次执行。
> 每份提示词完全自包含，AI 收到后即可独立工作，无需了解其他任务。

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Task A 提示词 — Service 核心逻辑实现
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与一个名为 HumanCode 的项目，
这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

## 你的任务（Task A）

实现 AISessionManagerService，这是整个多 AI 协作系统的核心服务，
负责管理多个"虚拟 AI 角色会话"的生命周期。

## 必须先阅读的文件

在开始编码之前，请先阅读以下文件，完全理解再动手：

1. 接口定义（你要实现的目标）：
   src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts

2. 参考现有服务的实现模式（照着学）：
   src/vs/workbench/services/extensionMessages/browser/extensionMessagesService.ts

3. 这一阶段的整体说明（了解背景和并行开发规则）：
   docs/phases/phase1.md

## 实现位置

新建文件：
src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts

## 实现要求

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
   - 根据 relayType 构造中继 prompt：
     * review:   "请对以下代码/内容进行测试与审查：\n\n{content}"
     * handoff:  "前一位同事已完成以下工作，请继续：\n\n{content}"
     * feedback: "已收到如下反馈，请根据反馈修改：\n\n{content}"
   - 若提供了 customInstruction，则用 customInstruction 替代上述默认前缀
   - 触发 onDidRelayMessage 事件，携带 { request, prompt }
8. getAllSessions 返回按 createdAt 升序排列的数组
9. deleteSession 若删除的是当前活跃会话，自动调用 clearActiveSession()

## 不需要实现的部分

- 不需要实现 UI
- 不需要注册服务到 DI 容器（另有专人负责集成）
- 不需要持久化到文件（本阶段内存存储即可）

## 验收：完成实现后，在文件末尾添加如下注释块

// ── 自验证清单（实现完成后手动逐项确认）────────────────────────
// [ ] createSession 返回唯一 sessionId
// [ ] 两次 createSession 创建的会话互相独立
// [ ] appendMessage 后 messageCount 正确递增
// [ ] getSessionContext 输出包含系统提示词 + 历史消息
// [ ] getSessionContext maxMessages 参数有效
// [ ] updateSessionStatus 触发 onDidSessionStatusChange 事件
// [ ] relayMessage 触发 onDidRelayMessage，prompt 格式正确
// [ ] deleteSession 活跃会话时 getActiveSessionId 变为 null

## 完成后

在 docs/phases/phase1.md 的"实施进展日志"表格中，
把 "Task A：AISessionManagerService 实现" 一行的状态改为 ✅，
并在"遇到的问题 & 解决方案"区域补充你实现过程中遇到的任何坑。
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Task B 提示词 — UI Panel 开发（Mock 驱动）
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
你是一个 VS Code 扩展级别的 TypeScript + DOM UI 工程师。你正在参与一个名为 HumanCode 的项目，
这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

## 你的任务（Task B）

开发 AI Team Commander Panel（AI 团队管理面板），这是用户管理所有 AI 角色的核心 UI 组件。

⚠️ 重要：先用 Mock Service 驱动 UI，不要等 Service 实现好再开始。
Mock Service 和真实 Service 实现同一套接口，集成时只改一行依赖注入即可。

## 必须先阅读的文件

1. 接口定义（你要对接的数据契约）：
   src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts

2. 参考现有 Panel 的实现模式：
   src/vs/workbench/contrib/extensionMessages/browser/extensionMessagesView.ts
   src/vs/workbench/contrib/extensionMessages/browser/extensionMessages.contribution.ts

3. 这一阶段的整体说明：
   docs/phases/phase1.md（重点看 Task B 部分）

4. UI 界面元素要求：
   docs/ui/ui-phase1.md
   docs/HumanCode-全面改造总设计文档.md（第六章，看 6.2/6.3/6.4/6.5/6.8 节）

## 实现位置

新建以下文件：
- src/vs/workbench/contrib/aiTeam/browser/mockAISessionManagerService.ts  （Mock Service）
- src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts                  （Panel UI 主体）
- src/vs/workbench/contrib/aiTeam/browser/aiTeam.contribution.ts           （注册到 VS Code）

## Step 1：创建 MockAISessionManagerService

实现 IAISessionManagerService 接口的所有方法，但返回硬编码数据：
- getAllSessions() 返回 2-3 个预置的假角色（前端工程师、QA 测试师、后端工程师）
- 假角色的 conversationHistory 包含 1-2 条假消息，这样 UI 有内容可以渲染
- createSession 正常工作（可以动态添加到内存数组）
- 事件可以正常 fire（使用真实的 Emitter）
- updateSessionStatus 正常切换状态并 fire 事件
- 其余方法返回合理的空值或 no-op

## Step 2：实现 AI Team Panel（aiTeamPanel.ts）

继承 VS Code 的 ViewPane，实现以下 UI：

**整体结构**：
- 顶部：标题栏 "🤖 AI 开发团队" + [+ 添加成员] 按钮
- 中部：可滚动的角色卡片列表
- 每张卡片包含：
  * 状态指示灯（颜色圆点）
  * 角色名称（粗体）
  * 角色职能文字（小字，如"前端开发专家"）
  * 最近对话摘要（最后1条消息摘录，超长截断加...）
  * 操作按钮：[发送任务] [→ 中继]

**状态指示灯颜色**：
- idle    → 灰色 #9E9E9E
- working → 绿色 #4CAF50（加 CSS 呼吸动画）
- waiting → 黄色 #FF9800
- error   → 红色 #F44336

**[+ 添加成员] 点击行为**（简化版向导）：
弹出一个简单的 inputBox（VS Code 内置 API）询问角色名称，
然后用默认配置 createSession。完整向导在集成阶段再细化。

**[发送任务] 点击行为**：
弹出 inputBox 让用户输入任务内容，
调用 sessionManagerService.setActiveSession(sessionId)，
然后触发 onDidMessageAppend 事件模拟发送（真实发送在集成阶段实现）。

**[→ 中继] 点击行为**：
弹出 quickPick 让用户选择目标角色，
调用 sessionManagerService.relayMessage({ fromSessionId, toSessionId, relayType: 'review' })。

**事件监听**：
订阅 sessionManagerService 的所有事件，事件触发时刷新对应卡片。

## Step 3：注册 Panel

参考 extensionMessages.contribution.ts，在 aiTeam.contribution.ts 中注册：
- ViewContainer（Activity Bar 图标，你可以复用任意现有 Codicon）
- ViewPane（AI Team Panel）
- 服务注册（注册 MockAISessionManagerService，用于 Task B 阶段）

## 验收标准

在 Mock 数据驱动下：
- [ ] Panel 在侧边栏正常显示，2-3 个角色卡片可见
- [ ] 每张卡片正确显示名称、职能、摘要、状态灯
- [ ] idle/working/waiting/error 四种状态颜色正确区分
- [ ] working 状态有 CSS 动画（呼吸效果）
- [ ] 点击"+ 添加成员"，输入名称后，新卡片出现在列表
- [ ] 点击"中继"，弹出目标角色选择列表

## 完成后

在 docs/phases/phase1.md 的"实施进展日志"表格中，
把 "Task B：AI Team Commander Panel（Mock 驱动）" 一行改为 ✅，
并补充遇到的问题。

同时在 docs/ui/ui-phase1.md 的"待完成内容"中，
勾选已实现的项目，并填写实现结果截图描述（文字描述即可）。
```

---

## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━
## Task C 提示词 — HumanCodeRPCLogger 增强
## ━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

```
你是一个 VS Code 核心源码级别的 TypeScript 工程师。你正在参与一个名为 HumanCode 的项目，
这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

## 你的任务（Task C）

增强已有的 HumanCodeRPCLogger 类，使其能够在拦截 RPC 消息时：
1. 将当前活跃 AI 角色会话的上下文自动注入到发出的消息中
2. 将收到的 AI 响应自动记录到对应会话的历史中
3. 根据消息方向自动更新会话状态

## 必须先阅读的文件

1. 接口定义（你要调用的服务接口）：
   src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts

2. 当前已有实现（你要修改的文件）：
   src/vs/workbench/services/extensions/common/extensionHostManager.ts
   重点阅读：HumanCodeRPCLogger 类（搜索 HumanCodeRPCLogger）

3. 已有的消息服务（参考）：
   src/vs/workbench/services/extensionMessages/common/extensionMessages.ts

4. 这一阶段的整体说明：
   docs/phases/phase1.md（重点看 Task C 部分）

## 修改位置

只需修改一个文件：
src/vs/workbench/services/extensions/common/extensionHostManager.ts

## 修改要求

### 修改一：HumanCodeRPCLogger 构造函数增加依赖

在 HumanCodeRPCLogger 的构造函数中增加可选参数：
  private readonly sessionManager?: IAISessionManagerService

这个参数在 Task B 集成阶段注入。现阶段你只需要写好逻辑，
当 sessionManager 为 undefined 时，静默跳过相关逻辑（保持原有行为不变）。

### 修改二：logOutgoing 增加上下文注入

在现有 logOutgoing 方法中，在记录消息到 globalRPCMessageStore 之前，
插入以下逻辑（用 if (this.sessionManager) 保护）：

```typescript
if (this.sessionManager) {
  const activeSessionId = this.sessionManager.getActiveSessionId();
  if (activeSessionId && this._isChatMessage(str)) {
    // 1. 获取会话上下文
    const context = this.sessionManager.getSessionContext(activeSessionId);

    // 2. 注入上下文到消息（先尝试方案A，失败则方案B）
    data = this._injectContext(data, context);

    // 3. 记录用户消息到会话历史
    const content = this._extractUserContent(data);
    if (content) {
      this.sessionManager.appendMessage(activeSessionId, {
        direction: 'user',
        content,
      });
    }

    // 4. 更新会话状态为"工作中"
    this.sessionManager.updateSessionStatus(activeSessionId, 'working');
  }
}
```

### 修改三：logIncoming 增加响应记录

在现有 logIncoming 方法中，在记录到 globalRPCMessageStore 之前，插入：

```typescript
if (this.sessionManager) {
  const activeSessionId = this.sessionManager.getActiveSessionId();
  if (activeSessionId && this._isChatResponse(str)) {
    // 1. 提取 AI 响应内容
    const content = this._extractAssistantContent(data);
    if (content) {
      // 2. 记录到会话历史
      this.sessionManager.appendMessage(activeSessionId, {
        direction: 'assistant',
        content,
      });
    }

    // 3. 更新会话状态为"空闲"
    this.sessionManager.updateSessionStatus(activeSessionId, 'idle');
  }
}
```

### 修改四：增加三个私有辅助方法

```typescript
/** 判断是否是 Chat 类型的发出消息 */
private _isChatMessage(str: string): boolean {
  return /chat|sendMessage|request/i.test(str);
}

/** 判断是否是 Chat 类型的响应消息 */
private _isChatResponse(str: string): boolean {
  return /response|reply|completion|result/i.test(str);
}

/**
 * 上下文注入：优先方案A（参数注入），降级到方案B（消息前缀）
 * 方案A：data.params.context = context
 * 方案B：data.params.message = context + "\n\n---\n\n" + originalMessage
 * 若两者都不适用，返回原 data 不修改
 */
private _injectContext(data: any, context: string): any {
  if (!data || !context) return data;
  try {
    const d = JSON.parse(JSON.stringify(data)); // 深拷贝，避免污染原始对象
    if (d.params !== undefined) {
      // 方案 A
      d.params.context = context;
    } else if (typeof d.params?.message === 'string') {
      // 方案 B
      d.params.message = `${context}\n\n---\n\n${d.params.message}`;
    }
    return d;
  } catch {
    return data;
  }
}

/** 从 outgoing 消息中提取用户输入的文本内容 */
private _extractUserContent(data: any): string {
  return data?.params?.message
    ?? data?.params?.text
    ?? '';
}

/** 从 incoming 消息中提取 AI 响应的文本内容 */
private _extractAssistantContent(data: any): string {
  return data?.result?.content
    ?? data?.result?.message
    ?? data?.result?.text
    ?? '';
}
```

## 重要约束

1. ⛔ 不得修改 logIncoming 和 logOutgoing 的原有逻辑（存储到 globalRPCMessageStore、触发事件等）
2. ⛔ 不得修改 HumanCodeRPCLogger 的注册/创建方式（集成由另一人负责）
3. ✅ 所有新增逻辑必须用 if (this.sessionManager) 保护，sessionManager 为 undefined 时行为与修改前完全相同
4. ✅ _injectContext 中必须深拷贝 data，不得直接修改传入的原始对象

## 验收

修改完成后，在 Extension Messages View 中用如下方式验证：
1. 给 HumanCodeRPCLogger 传入一个测试用的假 sessionManager
   （手动 new 一个简单对象，只实现 getActiveSessionId/getSessionContext/appendMessage/updateSessionStatus，返回硬编码值）
2. 触发任意 AI 扩展的 Chat 消息
3. 在 Extension Messages View 中看到 outgoing 消息，检查其 data 中是否包含注入的 context
4. 收到响应后，检查 logger 中的假 sessionManager 的 appendMessage 是否被调用

如果无法直接验证，写一个单元测试用例也可以。

## 完成后

在 docs/phases/phase1.md 的"实施进展日志"表格中，
把 "Task C：HumanCodeRPCLogger 增强" 一行改为 ✅，
并补充遇到的问题。
```

---

## 使用说明

| 给谁 | 提示词 | 输出文件 |
|------|-------|---------|
| AI 1（或第1次） | Task A 提示词 | `services/aiSessionManager/browser/aiSessionManagerService.ts` |
| AI 2（或第2次） | Task B 提示词 | `contrib/aiTeam/browser/` 目录下 3 个文件 |
| AI 3（或第3次） | Task C 提示词 | 修改 `extensionHostManager.ts` |

**顺序建议**：
- 三个任务可以完全并行，没有依赖关系
- 但若顺序执行，建议 A → C → B（B 最后，因为集成时 B 需要同时依赖 A 和 C）
- 每个 AI 完成后，记得让它更新 `docs/phases/phase1.md` 中的进展表格
