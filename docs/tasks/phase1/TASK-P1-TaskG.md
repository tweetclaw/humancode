# 任务卡：TASK-P1-TaskG

## 任务信息
- **任务编号**：TASK-P1-TaskG
- **任务名称**：连接 AI Team Panel 与 Session Manager
- **对应验收**：TEST-P1-TaskG
- **开发 AI**：AI-Dev-002
- **验收 AI**：AI-QA-001
- **依赖任务**：TASK-P1-001 (AISessionManagerService 实现), TASK-P1-002 (AI Team Panel UI)
- **优先级**：高
- **状态**：⏸️ 待验收

## 任务背景
在 Task D 的验证过程中发现,虽然 AI Team Panel 的 UI 已经实现,但它使用的是 Mock 数据,没有真正连接到 AISessionManagerService。这导致:
- 无法创建真实的会话
- `activeSessionId` 始终为 null
- 无法测试 RPC 拦截的上下文注入功能

本任务需要将 Mock Service 替换为真实的 AISessionManagerService,打通 UI 与 Service 层。

## 任务目标
将 AI Team Panel 连接到真实的 AISessionManagerService,实现会话的创建、激活、删除等核心功能。

## 必须先阅读的文件
1. `src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts` - 当前 Panel 实现,需要移除 Mock 逻辑
2. `src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts` - Service 接口定义
3. `src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts` - Service 实现,了解可用的方法

## 实现位置
修改文件：`src/vs/workbench/contrib/aiTeam/browser/aiTeamPanel.ts`

## 实现要求

### 1. 移除 Mock Service
- 删除 `MockAISessionManagerService` 类及其所有相关代码
- 删除所有 Mock 数据的初始化逻辑

### 2. 注入真实 Service
在 `AITeamPanel` 的构造函数中注入 `IAISessionManagerService`:

```typescript
constructor(
	// ... 其他参数
	@IAISessionManagerService private readonly aiSessionManager: IAISessionManagerService,
	// ... 其他服务
) {
	super();
	// ...
}
```

### 3. 实现"创建会话"功能
- 连接"Create New Role"按钮到 `aiSessionManager.createSession()`
- 弹出输入框让用户输入:
  - 会话名称 (name)
  - 角色描述 (role)
  - 系统提示词 (systemPrompt, 可选)
- 创建成功后刷新会话列表

### 4. 实现会话列表渲染
- 监听 `aiSessionManager.onDidChangeSession` 事件
- 当会话变化时,重新渲染会话列表
- 使用 `aiSessionManager.getAllSessions()` 获取所有会话
- 显示每个会话的:
  - 名称
  - 角色
  - 状态 (idle/working/error)
  - 最后一条消息摘要 (如果有)

### 5. 实现会话激活功能
- 点击会话卡片时,调用 `aiSessionManager.setActiveSession(sessionId)`
- 高亮显示当前激活的会话
- 确保 `activeSessionId` 被正确设置

### 6. 实现"发送任务"功能
- 连接"Send Task"按钮到输入框
- 用户输入任务后,调用 `aiSessionManager.appendMessage(sessionId, message)`
- 更新会话状态为 'working'

### 7. 实现"中继消息"功能
- 连接"Relay"按钮到 `aiSessionManager.relayMessage(fromSessionId, toSessionId, prompt)`
- 弹出选择框让用户选择目标会话
- 中继成功后显示提示

### 8. 实现"删除会话"功能
- 添加删除按钮到会话卡片
- 点击时调用 `aiSessionManager.deleteSession(sessionId)`
- 删除前弹出确认对话框

### 9. 事件监听与清理
- 在构造函数中注册所有事件监听器
- 将事件监听器添加到 `this._register()` 以确保正确清理
- 在 Panel 销毁时自动取消订阅

## UI 交互细节

### 创建会话对话框
使用 VS Code 的 `IQuickInputService` 实现多步输入:
1. 第一步: 输入会话名称
2. 第二步: 输入角色描述
3. 第三步: 输入系统提示词 (可选,可跳过)

### 会话卡片状态显示
- **idle**: 灰色边框,显示"空闲"
- **working**: 绿色边框,显示动画,显示"工作中"
- **error**: 红色边框,显示错误图标

### 激活会话高亮
- 激活的会话卡片: 蓝色边框 + 背景高亮
- 非激活会话: 默认样式

## 不需要实现的部分
- ❌ 不需要实现历史消息的显示 (Phase 2 再做)
- ❌ 不需要实现会话配置的编辑功能
- ❌ 不需要实现会话的导入/导出
- ❌ 不需要实现会话的搜索/过滤

## 自验证清单（开发 AI 完成后自查）
- [ ] TypeScript 编译通过（运行 `npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 所有 Mock 代码已删除
- [ ] 真实 Service 已正确注入
- [ ] 可以通过 UI 创建会话
- [ ] 可以激活会话,`activeSessionId` 正确设置
- [ ] 可以向会话发送消息
- [ ] 可以删除会话
- [ ] 事件监听器已正确注册和清理

## 完成后操作
1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P1-TaskG）

## 实施记录
**开发 AI**：AI-Dev-002
**完成时间**：2026-03-24

**实现要点**：
- 已验证 AI Team Panel 已正确注入真实的 `IAISessionManagerService`
- 添加了会话激活功能：点击卡片时调用 `setActiveSession()` 并高亮显示
- 添加了删除会话功能：每个卡片新增删除按钮,删除前弹出确认对话框
- 实现了激活状态的视觉反馈：使用 `active` CSS 类,蓝色边框和背景高亮
- 所有事件监听器已通过 `this._register()` 正确注册,确保自动清理
- 删除按钮使用红色文字以区分危险操作

**遇到的问题**：
- 无明显问题。代码已经实现了大部分功能,只需补充激活高亮和删除功能即可
