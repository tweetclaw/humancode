# 任务卡：TASK-P1-013

## 任务信息
- **任务编号**：TASK-P1-013
- **任务名称**：Language Model API Adapter 实现
- **对应验收**：TEST-P1-013
- **开发 AI**：AI-Dev-005
- **验收 AI**：AI-QA-004
- **依赖任务**：TASK-P1-002 (AI Interop Bus 实现), TASK-P1-012 (Chat Participant Adapter 实现)
- **优先级**：高
- **状态**：⬜ 待开始

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目，这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务实现 **Language Model API Adapter**，这是零侵入式适配器架构的第二个核心组件，负责自动发现和包装使用 `vscode.lm` API 的 AI 扩展（如 GitHub Copilot 的 Language Model），使其无需修改即可接入 AI Interop Bus。

**关键突破**：GitHub Copilot 的 Language Model API 无需修改任何代码，平台自动将其包装为 AI Interop Endpoint，实现多 AI 协作。

## 任务目标

实现 Language Model API Adapter 服务，支持：
1. 自动监听 Language Model 注册和变更事件
2. 自动将 Language Model 包装为 AI Interop Endpoint
3. 请求/响应协议转换（AI Interop ↔ Language Model API）
4. 流式输出转换
5. CancellationToken 传递
6. 工具调用支持（如果 LM 支持）

## 必须先阅读的文件

1. `docs/ai-interop/13-zero-intrusion-adapter-architecture.md`
   - 零侵入式适配器架构设计（完整方案）
2. `docs/tasks/poc1/TASK-P1-012.md`
   - Chat Participant Adapter 任务卡（参考实现模式）
3. `src/vs/workbench/services/aiInterop/common/aiInterop.ts`
   - AI Interop 接口定义
4. `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`
   - AI Interop Bus 实现
5. `src/vs/workbench/contrib/chat/common/languageModels.ts`
   - Language Model 服务接口（了解 LM 的注册机制）

## 实现位置

新建文件：
- `src/vs/workbench/services/aiInterop/browser/adapters/languageModelAdapter.ts`

## 实现要求

### 1. 服务接口定义

在 `src/vs/workbench/services/aiInterop/common/aiInterop.ts` 中添加：

```typescript
export const ILanguageModelAdapterService = createDecorator<ILanguageModelAdapterService>('languageModelAdapterService');

export interface ILanguageModelAdapterService {
	readonly _serviceBrand: undefined;
	
	/**
	 * 初始化适配器，开始监听 Language Model 注册
	 */
	initialize(): void;
	
	/**
	 * 获取所有已适配的 Language Model Endpoint
	 */
	getAdaptedEndpoints(): IAIInteropEndpointDescriptor[];
}
```

### 2. 核心实现

在 `src/vs/workbench/services/aiInterop/browser/adapters/languageModelAdapter.ts` 中实现：

```typescript
export class LanguageModelAdapterService implements ILanguageModelAdapterService {
	declare readonly _serviceBrand: undefined;
	
	private readonly _adaptedEndpoints = new Map<string, IAIInteropEndpointDescriptor>();
	private readonly _disposables = new DisposableStore();
	
	constructor(
		@ILanguageModelsService private readonly languageModelsService: ILanguageModelsService,
		@IAIInteropBusService private readonly aiInteropBus: IAIInteropBusService,
		@ILogService private readonly logService: ILogService
	) {}
	
	initialize(): void {
		// 监听 Language Model 变更事件
		this._disposables.add(
			this.languageModelsService.onDidChangeLanguageModels(() => {
				this.refreshLanguageModels();
			})
		);
		
		// 包装已注册的 Language Model
		this.refreshLanguageModels();
	}
	
	private async refreshLanguageModels(): Promise<void> {
		const modelIds = await this.languageModelsService.getLanguageModelIds();
		
		for (const modelId of modelIds) {
			const model = await this.languageModelsService.lookupLanguageModel(modelId);
			if (model) {
				this.wrapLanguageModel(model);
			}
		}
	}
	
	private wrapLanguageModel(model: ILanguageModelChat): void {
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

`wrapLanguageModel` 方法必须实现：

```typescript
private wrapLanguageModel(model: ILanguageModelChat): void {
	const endpointId = `lm.${model.id}`;
	
	// 避免重复包装
	if (this._adaptedEndpoints.has(endpointId)) {
		return;
	}
	
	const endpoint: IAIInteropEndpointDescriptor = {
		endpointId,
		extensionId: model.vendor,
		displayName: `${model.vendor} ${model.family}`,
		description: `Language Model: ${model.id}`,
		capabilities: ['streaming', 'tool-calling'],
		hostKind: 'local',
		remoteAuthority: undefined
	};
	
	this._adaptedEndpoints.set(endpointId, endpoint);
	
	// 注册到 AI Interop Bus
	this.aiInteropBus.registerEndpoint(endpoint, async (request, token) => {
		return this.handleInvocation(model, request, token);
	});
	
	this.logService.info(`[LanguageModelAdapter] Wrapped language model: ${model.id}`);
}
```

### 4. 请求处理逻辑

`handleInvocation` 方法必须实现：

```typescript
private async handleInvocation(
	model: ILanguageModelChat,
	request: IAIInteropInvocationRequest,
	token: CancellationToken
): Promise<void> {
	try {
		// 1. 将 AI Interop 请求转换为 Language Model 请求
		const messages = this.convertToLMMessages(request);
		const options = this.convertToLMOptions(request);
		
		// 2. 调用 Language Model
		const response = await model.sendRequest(messages, options, token);
		
		// 3. 流式返回结果
		let seq = 0;
		for await (const chunk of response.text) {
			// 检查 Cancel
			if (token.isCancellationRequested) {
				this.logService.info(`[LanguageModelAdapter] Invocation canceled: ${request.invocationId}`);
				break;
			}
			
			// 发送 chunk
			await request.acceptChunk({
				seq: seq++,
				content: chunk,
				metadata: {}
			});
		}
		
		// 4. 完成调用
		if (!token.isCancellationRequested) {
			await request.complete();
		}
	} catch (error) {
		this.logService.error(`[LanguageModelAdapter] Invocation failed: ${request.invocationId}`, error);
		await request.fail(String(error));
	}
}
```

### 5. 协议转换方法

实现以下转换方法：

```typescript
private convertToLMMessages(request: IAIInteropInvocationRequest): ILanguageModelChatMessage[] {
	// 从 request.input 中提取消息
	const prompt = typeof request.input === 'string' 
		? request.input 
		: JSON.stringify(request.input);
	
	return [
		{
			role: 'user',
			content: prompt
		}
	];
}

private convertToLMOptions(request: IAIInteropInvocationRequest): ILanguageModelChatRequestOptions {
	// 从 request.metadata 中提取选项
	const metadata = request.metadata || {};
	
	return {
		justification: metadata.justification || 'AI Interop invocation',
		// 其他选项...
	};
}
```

### 6. 服务注册

在 `src/vs/workbench/services/services.ts` 中注册服务：

```typescript
import { ILanguageModelAdapterService } from 'vs/workbench/services/aiInterop/common/aiInterop';
import { LanguageModelAdapterService } from 'vs/workbench/services/aiInterop/browser/adapters/languageModelAdapter';

registerSingleton(ILanguageModelAdapterService, LanguageModelAdapterService, InstantiationType.Eager);
```

### 7. 自动初始化

在 `src/vs/workbench/browser/workbench.contribution.ts` 中添加初始化逻辑：

```typescript
import { ILanguageModelAdapterService } from 'vs/workbench/services/aiInterop/common/aiInterop';

// 在 Workbench 启动时初始化适配器
class LanguageModelAdapterInitializer extends Disposable implements IWorkbenchContribution {
	constructor(
		@ILanguageModelAdapterService languageModelAdapter: ILanguageModelAdapterService
	) {
		super();
		languageModelAdapter.initialize();
	}
}

registerWorkbenchContribution2(
	'workbench.contrib.languageModelAdapterInitializer',
	LanguageModelAdapterInitializer,
	WorkbenchPhase.BlockRestore
);
```

## 不需要实现的部分

- 不需要实现 UI（UI 由其他任务负责）
- 不需要实现权限控制（由 Policy Service 负责）
- 不需要实现审计日志（由 Audit Service 负责）
- 不需要实现 Chat Participant Adapter（已由 TASK-P1-012 完成）
- 不需要实现 Command Adapter（由 TASK-P1-014 负责）

## 自验证清单（开发 AI 完成后自查）

- [ ] TypeScript 编译通过（`npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] 服务接口定义完整
- [ ] 服务正确注册到 DI 容器
- [ ] 监听 Language Model 变更事件
- [ ] 自动包装逻辑正确
- [ ] 请求/响应转换正确
- [ ] 流式输出正常工作
- [ ] CancellationToken 正确传递
- [ ] 错误处理完整
- [ ] 日志输出清晰

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P1-013）

## 实施记录

**开发 AI**：[AI 标识]
**完成时间**：[YYYY-MM-DD]

**实现要点**：
- [关键实现点 1]
- [关键实现点 2]

**遇到的问题**：
- [问题描述] → [解决方案]
