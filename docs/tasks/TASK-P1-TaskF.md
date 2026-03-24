# 任务卡：TASK-P1-TaskF

## 任务信息
- **任务编号**：TASK-P1-TaskF
- **任务名称**：连接真实 AI Extension API
- **对应验收**：TEST-P1-TaskF
- **开发 AI**：AI-Dev-002
- **验收 AI**：AI-QA-001
- **依赖任务**：TASK-P1-TaskG (连接 Panel 与 Service)
- **优先级**：高
- **状态**：⬜ 待开始

## 任务背景
当前 `relayMessage` 方法只是触发了一个事件,但没有实际的 AI 调用逻辑。用户点击"中继"按钮后,目标会话的状态会变化,但不会真正调用 AI Extension 的 API 来生成响应。

本任务需要实现一个桥接层,监听 `onDidRelayMessage` 事件,并调用真实的 AI Extension API (如通义灵码、GitHub Copilot),将响应记录到目标会话中。

## 任务目标
实现 AI Team 与 AI Extension 之间的桥接,让中继功能能够真正调用 AI API 并获取响应。

## 必须先阅读的文件
1. `src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts` - 了解 `onDidRelayMessage` 事件的定义
2. `src/vs/workbench/services/aiSessionManager/browser/aiSessionManagerService.ts` - 了解 `relayMessage` 方法的实现
3. `src/vs/workbench/services/extensions/common/extensions.ts` - 了解 `IExtensionService` 的使用方法
4. `src/vs/workbench/api/common/extHostApiCommands.ts` - 了解如何调用扩展的 API

## 实现位置
新建文件：`src/vs/workbench/contrib/aiTeam/browser/aiTeamExtensionBridge.ts`

## 实现要求

### 1. 创建桥接服务类
创建 `AITeamExtensionBridge` 类,实现 AI Team 与 AI Extension 的桥接:

```typescript
export class AITeamExtensionBridge extends Disposable {
	constructor(
		@IAISessionManagerService private readonly sessionManager: IAISessionManagerService,
		@IExtensionService private readonly extensionService: IExtensionService,
		@ICommandService private readonly commandService: ICommandService,
		@INotificationService private readonly notificationService: INotificationService
	) {
		super();
		this._register(this.sessionManager.onDidRelayMessage(e => this.handleRelayMessage(e)));
	}

	private async handleRelayMessage(event: { request: IRelayRequest; prompt: string }): Promise<void> {
		// 实现逻辑
	}
}
```

### 2. 监听 `onDidRelayMessage` 事件
在构造函数中注册事件监听器,当 `relayMessage` 被调用时触发。

### 3. 检测可用的 AI Extension
实现方法检测当前安装并激活的 AI Extension:

```typescript
private async getAvailableAIExtension(): Promise<string | null> {
	// 检测顺序:
	// 1. 通义灵码 (tongyi.lingma)
	// 2. GitHub Copilot (github.copilot)
	// 3. 其他 AI 扩展

	const extensions = this.extensionService.extensions;
	const aiExtensions = ['tongyi.lingma', 'github.copilot'];

	for (const extId of aiExtensions) {
		const ext = extensions.find(e => e.identifier.value === extId);
		if (ext && this.extensionService.getExtensionState(ext) === ExtensionState.Running) {
			return extId;
		}
	}

	return null;
}
```

### 4. 调用 AI Extension API
根据检测到的扩展类型,调用对应的 Chat API:

**通义灵码**:
- 使用 `commandService.executeCommand()` 调用通义灵码的命令
- 命令可能是 `tongyi.chat` 或类似的命令
- 需要通过实际测试确定正确的命令名称和参数格式

**GitHub Copilot**:
- 使用 `vscode.chat` API (如果可用)
- 或使用 Copilot 的特定命令

### 5. 处理 AI 响应
- 将 AI 的响应文本提取出来
- 调用 `sessionManager.appendMessage()` 将响应添加到目标会话的历史中
- 更新目标会话的状态为 'idle'

### 6. 错误处理
- 如果没有可用的 AI Extension,显示错误通知
- 如果 API 调用失败,更新目标会话状态为 'error'
- 如果响应为空,记录警告日志

### 7. 注册服务
在 `src/vs/workbench/contrib/aiTeam/browser/aiTeam.contribution.ts` 中注册桥接服务:

```typescript
import { AITeamExtensionBridge } from './aiTeamExtensionBridge.js';

// 在 workbench 启动时实例化桥接服务
class AITeamExtensionBridgeContribution extends Disposable implements IWorkbenchContribution {
	static readonly ID = 'workbench.contrib.aiTeamExtensionBridge';

	constructor(
		@IInstantiationService instantiationService: IInstantiationService
	) {
		super();
		this._register(instantiationService.createInstance(AITeamExtensionBridge));
	}
}

registerWorkbenchContribution2(
	AITeamExtensionBridgeContribution.ID,
	AITeamExtensionBridgeContribution,
	WorkbenchPhase.BlockRestore
);
```

## 实现细节

### 调用通义灵码 API 的方法
由于通义灵码的 API 可能不是公开的,需要通过以下方式探索:

1. **查看通义灵码的 package.json**:
   - 查找 `contributes.commands` 中的聊天相关命令
   - 查找 `contributes.chatParticipants` (如果有)

2. **监听 RPC 消息**:
   - 在 Extension Messages View 中查看通义灵码的消息格式
   - 找到发送聊天请求的消息结构
   - 尝试复制该结构来发送请求

3. **使用 Command Service**:
   - 尝试调用 `tongyi.chat` 或类似命令
   - 传入 prompt 作为参数

### 响应处理
- 如果 AI Extension 返回流式响应,需要累积所有片段
- 如果返回 Promise,等待完成后获取完整响应
- 提取纯文本内容,去除格式化标记

## 不需要实现的部分
- ❌ 不需要实现流式响应的实时显示 (Phase 2 再做)
- ❌ 不需要实现多轮对话的上下文管理 (当前只是单次中继)
- ❌ 不需要实现 AI Extension 的自动安装或激活
- ❌ 不需要支持所有 AI Extension,优先支持通义灵码

## 自验证清单（开发 AI 完成后自查）
- [ ] TypeScript 编译通过（运行 `npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 桥接服务已正确注册到 workbench
- [ ] 能检测到已安装的 AI Extension
- [ ] 能成功调用 AI Extension API
- [ ] 能将响应记录到目标会话
- [ ] 错误处理完善
- [ ] 事件监听器已正确注册和清理

## 完成后操作
1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P1-TaskF）

## 实施记录
**开发 AI**：_待填写_
**完成时间**：_待填写_

**实现要点**：
- _待开发 AI 完成后填写_

**遇到的问题**：
- _待开发 AI 完成后填写_
