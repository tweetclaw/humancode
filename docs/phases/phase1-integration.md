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

**操作步骤**：
1. 重启 IDE（使用新的日志配置，日志会输出到 `1.log`）
2. 打开通义灵码聊天窗口
3. 发送一条简单消息："你好"
4. 查看 `1.log`，搜索关键词：
   - `HumanCodeRPCLogger`
   - `logOutgoing`
   - `logIncoming`
   - `Win → Ext` 或 `Ext → Win`

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

## 三、并行开发规则

- **Task D 必须先完成**，才能开始 Task E 和 Task F
- Task E 和 Task F 可以并行开发（互不依赖）

---

## 四、实施进展日志

| 日期 | 事项 | 状态 |
|------|------|------|
| 2026-03-23 | Phase 1 完成（Task A + B + C） | ✅ |
| - | Task D：端到端集成测试与问题修复 | ⬜ |
| - | Task E：配置持久化 | ⬜ |
| - | Task F：连接真实 AI Extension API | ⬜ |

---

## 五、遇到的问题 & 解决方案

（待补充）

---

## 六、下一步（Phase 2 预览）

集成阶段完成后，Phase 2 将聚焦于自动化协作工作流：
- 任务自动分发（用户输入需求，系统自动分配给合适的 AI 角色）
- AI 间自动协作（一个 AI 完成任务后，自动将结果发送给下一个 AI）
- 可视化工作流编辑器（拖拽式节点编辑器，定义协作流程）
- 全局上下文库（跨会话共享项目记忆）

详见 [Phase 2 规划文档](./phase2.md)
