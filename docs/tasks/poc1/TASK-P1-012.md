# 任务卡：TASK-P1-012

## 任务信息
- **任务编号**：TASK-P1-012
- **任务名称**：Chat Participant Adapter 实现
- **对应验收**：TEST-P1-012
- **开发 AI**：AI-Dev-005
- **验收 AI**：AI-QA-004
- **依赖任务**：TASK-P1-002 (AI Interop Bus 实现)
- **优先级**：最高
- **状态**：⬜ 待开始

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目，这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务实现 **Chat Participant Adapter**，这是零侵入式适配器架构的核心组件，负责自动发现和包装现有的 Chat Participant（如 GitHub Copilot Chat），使其无需修改即可接入 AI Interop Bus。

**关键突破**：现有 AI 扩展（GitHub Copilot、Lingma 等）无需修改任何代码，平台自动将其包装为 AI Interop Endpoint，实现多 AI 协作。

## 任务目标

实现 Chat Participant Adapter 服务，支持：
1. 自动监听 Chat Participant 注册事件
2. 自动将 Chat Participant 包装为 AI Interop Endpoint
3. 请求/响应协议转换（AI Interop ↔ Chat API）
4. 流式输出转换
5. CancellationToken 传递

## 必须先阅读的文件

1. `docs/ai-interop/13-zero-intrusion-adapter-architecture.md`
   - 零侵入式适配器架构设计（完整方案）
2. `docs/ai-interop/06-adapter-strategy.md`
   - Adapter 策略文档（了解整体策略）
3. `src/vs/workbench/services/aiInterop/common/aiInterop.ts`
   - AI Interop 接口定义（了解 Endpoint 和 Invocation 的数据结构）
4. `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`
   - AI Interop Bus 实现（了解如何注册 Endpoint）
5. `src/vs/workbench/contrib/chat/common/chatAgents.ts`
   - Chat Agent 服务接口（了解 Chat Participant 的注册机制）

## 实现位置

新建文件：
- `src/vs/workbench/services/aiInterop/browser/adapters/chatParticipantAdapter.ts`

## 实现要求

### 1. 服务接口定义

在 `src/vs/workbench/services/aiInterop/common/aiInterop.ts` 中添加：

```typescript
export const IChatParticipantAdapterService = createDecorator<IChatParticipantAdapterService>('chatParticipantAdapterService');

export interface IChatParticipantAdapterService {
	readonly _serviceBrand: undefined;
	
	/**
	 * 初始化适配器，开始监听 Chat Participant 注册
	 */
	initialize(): void;
	
	/**
	 * 获取所有已适配的 Chat Participant Endpoint
	 */
	getAdaptedEndpoints(): IAIInteropEndpointDescriptor[];
}
```

### 2. 核心实现

在 `src/vs/workbench/services/aiInterop/browser/adapters/chatParticipantAdapter.ts` 中实现：

```typescript
export class ChatParticipantAdapterService implements IChatParticipantAdapterService {
	declare readonly _serviceBrand: undefined;
	
	private readonly _adaptedEndpoints = new Map<string, IAIInteropEndpointDescriptor>();
	private readonly _disposables = new DisposableStore();
	
	constructor(
		@IChatAgentService private readonly chatAgentService: IChatAgentService,
		@IAIInteropBusService private readonly aiInteropBus: IAIInteropBusService,
		@ILogService private readonly logService: ILogService
	) {}
	
	initialize(): void {
		// 监听 Chat Participant 注册事件
		this._disposables.add(
			this.chatAgentService.onDidRegisterAgent((agent) => {
				this.wrapChatParticipant(agent);
			})
		);
		
		// 包装已注册的 Chat Participant
		for (const agent of this.chatAgentService.getAgents()) {
			this.wrapChatParticipant(agent);
		}
	}
	
	private wrapChatParticipant(agent: IChatAgent): void {
		// 实现自动包装逻辑
	}
	
	getAdaptedEndpoints(): IAIInteropEndpointDescriptor[] {
		return Array.from(this._adaptedEndpoints.values());
	}
	
	dispose(): void {
		this._disposables.dispose();
	}
}
```

### 3. 自动包装逻辑

`wrapChatParticipant` 方法必须实现：

```typescript
private wrapChatParticipant(agent: IChatAgent): void {
	const endpointId = `chat.${agent.id}`;
	
	// 避免重复包装
	if (this._adaptedEndpoints.has(endpointId)) {
		return;
	}
	
	const endpoint: IAIInteropEndpointDescriptor = {
		endpointId,
		extensionId: agent.extensionId,
		displayName: agent.metadata.name || agent.id,
		description: agent.metadata.description || `Chat participant: ${agent.id}`,
		capabilities: ['streaming', 'context-aware'],
		hostKind: 'local', // Chat Participant 通常在本地运行
		remoteAuthority: undefined
	};
	
	this._adaptedEndpoints.set(endpointId, endpoint);
	
	// 注册到 AI Interop Bus
	this.aiInteropBus.registerEndpoint(endpoint, async (request, token) => {
		return this.handleInvocation(agent, request, token);
	});
	
	this.logService.info(`[ChatParticipantAdapter] Wrapped chat participant: ${agent.id}`);
}
```

### 4. 请求处理逻辑

`handleInvocation` 方法必须实现：

```typescript
private async handleInvocation(
	agent: IChatAgent,
	request: IAIInteropInvocationRequest,
	token: CancellationToken
): Promise<void> {
	try {
		// 1. 将 AI Interop 请求转换为 Chat 请求
		const chatRequest = this.convertToChatRequest(request);
		
		// 2. 调用原始的 Chat Participant
		const response = await agent.invoke(chatRequest, token);
		
		// 3. 流式返回结果
		let seq = 0;
		for await (const part of response.stream) {
			// 检查 Cancel
			if (token.isCancellationRequested) {
				this.logService.info(`[ChatParticipantAdapter] Invocation canceled: ${request.invocationId}`);
				break;
			}
			
			// 转换并发送 chunk
			const content = this.convertChatPartToContent(part);
			await request.acceptChunk({
				seq: seq++,
				content,
				metadata: { type: part.kind }
			});
		}
		
		// 4. 完成调用
		if (!token.isCancellationRequested) {
			await request.complete();
		}
	} catch (error) {
		this.logService.error(`[ChatParticipantAdapter] Invocation failed: ${request.invocationId}`, error);
		await request.fail(String(error));
	}
}
```

### 5. 协议转换方法

实现以下转换方法：

```typescript
private convertToChatRequest(request: IAIInteropInvocationRequest): IChatAgentRequest {
	// 从 request.input 中提取 prompt
	const prompt = typeof request.input === 'string' 
		? request.input 
		: JSON.stringify(request.input);
	
	return {
		sessionId: request.sessionId || generateUuid(),
		requestId: request.invocationId,
		agentId: '', // 由调用方填充
		message: prompt,
		variables: {},
		// 其他必要字段...
	};
}

private convertChatPartToContent(part: IChatResponsePart): string {
	// 根据 part.kind 转换内容
	if (part.kind === 'markdownContent') {
		return part.content.value;
	} else if (part.kind === 'textEdit') {
		return JSON.stringify(part);
	} else if (part.kind === 'command') {
		return JSON.stringify(part);
	}
	return String(part);
}
```

### 6. 服务注册

在 `src/vs/workbench/services/services.ts` 中注册服务：

```typescript
import { IChatParticipantAdapterService } from 'vs/workbench/services/aiInterop/common/aiInterop';
import { ChatParticipantAdapterService } from 'vs/workbench/services/aiInterop/browser/adapters/chatParticipantAdapter';

registerSingleton(IChatParticipantAdapterService, ChatParticipantAdapterService, InstantiationType.Eager);
```

### 7. 自动初始化

在 `src/vs/workbench/browser/workbench.contribution.ts` 中添加初始化逻辑：

```typescript
import { IChatParticipantAdapterService } from 'vs/workbench/services/aiInterop/common/aiInterop';

// 在 Workbench 启动时初始化适配器
class ChatParticipantAdapterInitializer extends Disposable implements IWorkbenchContribution {
	constructor(
		@IChatParticipantAdapterService chatParticipantAdapter: IChatParticipantAdapterService
	) {
		super();
		chatParticipantAdapter.initialize();
	}
}

registerWorkbenchContribution2(
	'workbench.contrib.chatParticipantAdapterInitializer',
	ChatParticipantAdapterInitializer,
	WorkbenchPhase.BlockRestore
);
```

## 不需要实现的部分

- 不需要实现 UI（UI 由其他任务负责）
- 不需要实现权限控制（由 Policy Service 负责）
- 不需要实现审计日志（由 Audit Service 负责）
- 不需要实现 Language Model Adapter（由 TASK-P1-013 负责）
- 不需要实现 Command Adapter（由 TASK-P1-014 负责）

## 自验证清单（开发 AI 完成后自查）

- [ ] TypeScript 编译通过（`npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 服务接口定义完整
- [ ] 服务正确注册到 DI 容器
- [ ] 监听 Chat Participant 注册事件
- [ ] 自动包装逻辑正确
- [ ] 请求/响应转换正确
- [ ] 流式输出正常工作
- [ ] CancellationToken 正确传递
- [ ] 错误处理完整
- [ ] 日志输出清晰

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P1-012）

## 实施记录

**开发 AI**：[AI 标识]
**完成时间**：[YYYY-MM-DD]

**实现要点**：
- [关键实现点 1]
- [关键实现点 2]

**遇到的问题**：
- [问题描述] → [解决方案]
