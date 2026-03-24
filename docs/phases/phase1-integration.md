# Phase 1 集成 — 从零开始验证与打通

> **前置条件**：Phase 1 的 Task A、B、C 已全部完成 ✅
> **目标**：验证基础功能是否工作，逐步打通端到端流程

---

## 一、当前实际情况

Phase 1 完成的只是**基础架构**，实际上：

### ✅ 真正工作的部分
- AISessionManagerService 可以创建会话、管理状态
- AI Team Panel 可以显示角色卡片
- HumanCodeRPCLogger 有上下文注入的代码

### ❌ 完全不工作的部分
- **Send Task 按钮**只是模拟响应，没有真正调用 AI
- **上下文注入**可能根本拦截不到 AI Extension 的消息
- **Relay 按钮**只是触发事件，没有任何实际效果

---

## 二、集成任务拆解（务实版）

### Task D — 验证 RPC 拦截是否工作

**目标**：确认 `HumanCodeRPCLogger` 能否真的拦截到 AI Extension 的消息

**前置准备**：
- 确保已启动 Watch 模式（在 VS Code 中按 `Cmd+Shift+B`，选择 "VS Code - Build"）
- 详细的开发环境配置请参考：[开发环境配置文档](../开发环境配置.md)

**操作步骤**：
1. 启动开发环境
   ```bash
   ./startcode.sh
   ```
   注意：日志会输出到 `/Users/immeta/work/humancode/1.log`

2. 打开通义灵码聊天窗口

3. 发送一条简单消息："你好"

4. 查看日志输出（两种方式）：
   - **方式一**：在开发窗口中按 `Cmd+Option+I` 打开 DevTools，查看 Console 标签页
   - **方式二**：在终端中查看日志文件
     ```bash
     # 实时查看日志
     tail -f 1.log

     # 或搜索关键词
     grep "HumanCodeRPCLogger" 1.log
     grep "logOutgoing" 1.log
     ```

5. 搜索以下关键词：
   - `[HumanCodeRPCLogger]` - 自定义日志标记
   - `logOutgoing` - 发出的消息
   - `logIncoming` - 接收的消息
   - `[LocalProcess][Win → Ext]` - 原有的 RPC 日志（窗口到扩展）
   - `[LocalProcess][Ext → Win]` - 原有的 RPC 日志（扩展到窗口）

**验收标准**：
- ✅ 能在日志中看到 `logOutgoing` 被调用
- ✅ 能在日志中看到 `logIncoming` 被调用
- ✅ 能看到消息的 `str` 和 `data` 内容

**如果失败**：
- 检查 `_isChatMessage` 的判断逻辑是否正确
- 检查 AI Extension 的消息格式是什么样的
- 可能需要调整判断条件

**交付物**：
- 日志截图或日志片段，证明拦截成功
- 如果失败，记录实际的消息格式，用于调整代码

---

### Task E — 配置持久化

**目标**：将会话配置保存到文件，IDE 重启后会话仍然存在

**实现位置**：
`src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts`

**实现要求**：

1. **存储位置**：使用 VS Code 的 `IStorageService`
   - 存储 key: `aiSessionManager.sessions`
   - 存储内容：`ISessionContext[]` 的 JSON 序列化

2. **保存时机**：
   - `createSession` 后自动保存
   - `deleteSession` 后自动保存
   - `appendMessage` 后自动保存（可选：防抖 1 秒）

3. **加载时机**：
   - 构造函数中从 `IStorageService` 加载已保存的会话

4. **注意事项**：
   - 不保存 `conversationHistory`（历史消息太大，暂不持久化）
   - 只保存会话的元数据（name, role, systemPrompt, metadata 等）

**验收标准**：
- 创建两个角色后重启 IDE，角色仍然存在
- 角色的名称、角色描述、系统提示词保持不变
- 历史消息丢失（预期行为，Phase 2 再实现）

---

### Task F — 连接真实 AI Extension API

**目标**：让 `onDidRelayMessage` 事件触发真实的 AI API 调用

**背景**：
目前 `relayMessage` 只是触发了一个事件，但没有实际的 AI 调用逻辑。需要在 Extension Host 中监听这个事件，并调用 AI Extension 的 API。

**实现位置**：
新建文件：`src/vs/workbench/contrib/aiTeam/browser/aiTeamExtensionBridge.ts`

**实现要求**：

1. **监听 `onDidRelayMessage` 事件**：
   ```typescript
   constructor(
       @IAISessionManagerService private readonly sessionManager: IAISessionManagerService,
       @IExtensionService private readonly extensionService: IExtensionService
   ) {
       this.sessionManager.onDidRelayMessage(({ request, prompt }) => {
           this.handleRelayMessage(request, prompt);
       });
   }
   ```

2. **调用 AI Extension API**：
   - 获取当前活跃的 AI Extension（Copilot、通义灵码等）
   - 调用其 Chat API，传入构造好的 prompt
   - 将响应记录到目标会话的历史中

3. **错误处理**：
   - 如果没有可用的 AI Extension，显示错误提示
   - 如果 API 调用失败，更新会话状态为 'error'

**验收标准**：
- 点击"中继"按钮后，目标角色的卡片状态变为"工作中"
- AI 响应后，目标角色的卡片显示新的消息摘要
- 状态变回"空闲"

---

## 三、任务跟踪表

| 任务编号 | 任务名称 | 开发 AI | 验收 AI | 依赖任务 | 状态 | 验收编号 | 验收状态 |
|---------|---------|---------|---------|---------|------|---------|---------|
| TASK-P1-TaskD | 验证 RPC 拦截是否工作 | AI-Dev-003 | AI-QA-003 | - | ✅ 已完成 | TEST-P1-TaskD | ✅ 通过 |
| TASK-P1-TaskG | 连接 AI Team Panel 与 Session Manager | AI-Dev-002 | AI-QA-001 | TASK-P1-001, TASK-P1-002 | ✅ 已完成 | TEST-P1-TaskG | ✅ 通过 |
| TASK-P1-TaskE | AI 会话配置持久化 | AI-Dev-001 | AI-QA-002 | TASK-P1-001 | ⬜ 待开始 | TEST-P1-TaskE | ⬜ 待验收 |
| TASK-P1-TaskF | 连接真实 AI Extension API | AI-Dev-002 | AI-QA-001 | TASK-P1-TaskG | ⬜ 待开始 | TEST-P1-TaskF | ⬜ 待验收 |

**状态说明**：
- ⬜ 待开始：任务尚未分配或开始
- 🏗️ 进行中：开发 AI 正在实现
- ⏸️ 待验收：开发完成，等待验收 AI 验收
- ✅ 已完成：验收通过，任务完成
- ❌ 验收失败：验收未通过，需要修复

**任务卡位置**：
- [TASK-P1-TaskD](../tasks/TASK-P1-TaskD.md) / [TEST-P1-TaskD](../tasks/TEST-P1-TaskD.md)
- [TASK-P1-TaskG](../tasks/TASK-P1-TaskG.md) / [TEST-P1-TaskG](../tasks/TEST-P1-TaskG.md)
- [TASK-P1-TaskE](../tasks/TASK-P1-TaskE.md) / [TEST-P1-TaskE](../tasks/TEST-P1-TaskE.md)
- [TASK-P1-TaskF](../tasks/TASK-P1-TaskF.md) / [TEST-P1-TaskF](../tasks/TEST-P1-TaskF.md)

---

## 四、并行开发规则

**调整后的依赖关系**：
```
Task D (RPC 拦截验证) ✅ 已完成
  ↓ 发现问题：Panel 未连接真实 Service
  ↓
Task G (连接 Panel 与 Service) ← 优先级最高，立即开始
  ↓
Task F (连接真实 AI API) ← 等 Task G 完成后开始

Task E (配置持久化) ← 可与 Task G 并行开发
```

**并行策略**：
- Task G 和 Task E 可以并行开发（互不依赖）
- Task F 必须等 Task G 完成后才能开始
- Task D 已完成 RPC 拦截验证，上下文注入功能待 Task G 完成后重新验收

---

## 五、实施进展日志

| 日期 | 事项 | 状态 |
|------|------|------|
| 2026-03-23 | Phase 1 完成（Task A + B + C） | ✅ |
| 2026-03-24 | Task D：RPC 拦截验证 | ✅ 已完成 |
| 2026-03-24 | 发现问题：Panel 未连接真实 Service，拆分为 Task G | 📋 |
| 2026-03-24 | 创建 Task G、Task E、Task F 任务卡 | ✅ |
| 2026-03-24 | Task G：连接 Panel 与 Service | ✅ 已完成 |
| - | Task E：配置持久化 | ⬜ 待开始 |
| - | Task F：连接真实 AI Extension API | ⬜ 待开始 |

---

## 六、遇到的问题 & 解决方案

### 问题 1：Task D 验收时发现 activeSessionId 为 null

**问题描述**：
- RPC 拦截功能已验证成功 ✅
- 但无法测试上下文注入功能 ❌
- 原因：AI Team Panel 使用 Mock Service，未连接真实的 AISessionManagerService
- 导致 `activeSessionId` 始终为 null

**解决方案**：
- 将缺失功能拆分为独立的 Task G
- Task G 负责连接 Panel 与 Service，实现会话创建、激活等功能
- Task D 标记为"部分完成"，RPC 拦截已验证，上下文注入待 Task G 后重新验收

**决策依据**：
- 保持任务粒度合理，符合单一职责原则
- 不阻塞 Task E 的并行开发
- 清晰记录问题发现和解决过程

**Task G 完成后验证**：
- Task G 完成后重新验证 Task D 的上下文注入功能 ✅
- 验证结果：activeSessionId 正确设置，上下文成功注入
- Task D 现已完整通过验收

---

## 六、下一步（Phase 2 预览）

集成阶段完成后，Phase 2 将聚焦于自动化协作工作流：
- 任务自动分发（用户输入需求，系统自动分配给合适的 AI 角色）
- AI 间自动协作（一个 AI 完成任务后，自动将结果发送给下一个 AI）
- 可视化工作流编辑器（拖拽式节点编辑器，定义协作流程）
- 全局上下文库（跨会话共享项目记忆）

详见 [Phase 2 规划文档](./phase2.md)
