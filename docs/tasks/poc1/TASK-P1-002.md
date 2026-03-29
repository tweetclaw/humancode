# 任务卡：TASK-P1-002

## 任务信息
- **任务编号**：TASK-P1-002
- **任务名称**：AI Interop Bus 实现
- **对应验收**：TEST-P1-002
- **开发 AI**：AI-Dev-001
- **验收 AI**：AI-QA-001
- **依赖任务**：TASK-P1-001 (Service 层接口定义)
- **优先级**：高
- **状态**：⏸️ 待验收

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目,这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务是 PoC-1 阶段的**核心任务**,目标是实现 AI Interop Bus 的完整功能。Bus 是整个 AI Interop 平台的通信中枢,负责 endpoint 注册、invocation 路由、流式 chunk 转发等核心功能。

**PoC-0 验证成果**:
- RPC 流式传输: 100 chunk 无丢失,性能优秀
- CancellationToken 穿透: 延迟 < 10ms,成功率 100%
- 跨 Host 路由: 路由准确率 100%,安全隔离有效

本任务将基于 PoC-0 的验证成果,实现生产级的 Bus 服务。

## 任务目标

实现 `AIInteropService`,提供完整的 AI Interop Bus 功能,包括:
1. Endpoint 注册与管理
2. Invocation 路由与生命周期管理
3. 流式 chunk 转发
4. Cancel/timeout 支持
5. 与 Session Broker 集成

## 必须先阅读的文件

1. [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)
   - TASK-P1-001 定义的接口和 DTO(你要实现的目标)
2. [docs/ai-interop/02-core-architecture.md](../../ai-interop/02-core-architecture.md)
   - 了解 Bus 在五层架构中的位置和职责
3. [src/vs/workbench/services/extensionManagement/common/extensionManagement.ts](../../../src/vs/workbench/services/extensionManagement/common/extensionManagement.ts)
   - 参考现有 Service 的实现模式
4. [src/vs/workbench/api/browser/mainThreadTestAiInterop.ts](../../../src/vs/workbench/api/browser/mainThreadTestAiInterop.ts)
   - 参考 PoC-0 的路由逻辑实现
5. [docs/reports/POC0-Final-Summary.md](../../reports/POC0-Final-Summary.md)
   - 了解 PoC-0 的验证成果和经验教训

## 实现位置

**新建文件**:
- `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`

**需要修改的文件**:
- `src/vs/workbench/workbench.common.main.ts` (注册 Service 到 DI 容器)

## 实现要求

### 1. Service 类定义

```typescript
export class AIInteropService extends Disposable implements IAIInteropBusService {
	declare readonly _serviceBrand: undefined;

	// 内部状态
	private readonly _endpoints = new Map<string, EndpointDescriptor>();
	private readonly _invocations = new Map<string, InvocationDescriptor>();

	// 事件 Emitters
	private readonly _onDidRegisterEndpoint = this._register(new Emitter<EndpointDescriptor>());
	readonly onDidRegisterEndpoint = this._onDidRegisterEndpoint.event;

	private readonly _onDidUnregisterEndpoint = this._register(new Emitter<string>());
	readonly onDidUnregisterEndpoint = this._onDidUnregisterEndpoint.event;

	// ... 其他事件

	constructor(
		@ILogService private readonly logService: ILogService,
		@IAISessionBrokerService private readonly sessionBroker: IAISessionBrokerService,
		@IAIInteropPolicyService private readonly policyService: IAIInteropPolicyService,
		@IAIInteropAuditService private readonly auditService: IAIInteropAuditService
	) {
		super();
	}

	// 实现 IAIInteropBusService 的所有方法
}
```

### 2. Endpoint 管理实现

#### 2.1 registerEndpoint

```typescript
async registerEndpoint(descriptor: EndpointDescriptor): Promise<void> {
	// 1. 验证 descriptor 有效性
	if (!descriptor.id || !descriptor.extensionId) {
		throw new Error('Invalid endpoint descriptor');
	}

	// 2. 检查是否已注册
	if (this._endpoints.has(descriptor.id)) {
		throw new Error(`Endpoint ${descriptor.id} already registered`);
	}

	// 3. 注册 endpoint
	this._endpoints.set(descriptor.id, descriptor);

	// 4. 记录审计日志
	this.auditService.logEvent({
		id: generateUuid(),
		type: 'endpoint_registered',
		timestamp: Date.now(),
		extensionId: descriptor.extensionId,
		details: { endpointId: descriptor.id }
	});

	// 5. 触发事件
	this._onDidRegisterEndpoint.fire(descriptor);

	// 6. 记录日志
	this.logService.info(`[AIInterop] Endpoint registered: ${descriptor.id}`);
}
```

#### 2.2 unregisterEndpoint

```typescript
async unregisterEndpoint(endpointId: string): Promise<void> {
	// 1. 检查 endpoint 是否存在
	const endpoint = this._endpoints.get(endpointId);
	if (!endpoint) {
		throw new Error(`Endpoint ${endpointId} not found`);
	}

	// 2. 取消所有相关的 invocation
	for (const [invocationId, invocation] of this._invocations) {
		if (invocation.callerId === endpointId || invocation.targetId === endpointId) {
			await this.cancel(invocationId);
		}
	}

	// 3. 注销 endpoint
	this._endpoints.delete(endpointId);

	// 4. 记录审计日志
	this.auditService.logEvent({
		id: generateUuid(),
		type: 'endpoint_unregistered',
		timestamp: Date.now(),
		extensionId: endpoint.extensionId,
		details: { endpointId }
	});

	// 5. 触发事件
	this._onDidUnregisterEndpoint.fire(endpointId);

	// 6. 记录日志
	this.logService.info(`[AIInterop] Endpoint unregistered: ${endpointId}`);
}
```

### 3. Invocation 管理实现

#### 3.1 invoke

```typescript
async invoke(
	callerId: string,
	targetId: string,
	request: InvocationRequest,
	token: CancellationToken
): Promise<InvocationHandle> {
	// 1. 验证 caller 和 target 存在
	const caller = this._endpoints.get(callerId);
	const target = this._endpoints.get(targetId);
	if (!caller || !target) {
		throw new Error('Caller or target endpoint not found');
	}

	// 2. 检查路由策略(复用 PoC-0 逻辑)
	const routeDecision = this.policyService.canRoute(caller, target);
	if (!routeDecision.allowed) {
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'invocation_rejected',
			timestamp: Date.now(),
			details: { callerId, targetId, reason: routeDecision.reason }
		});
		throw new Error(`Route not allowed: ${routeDecision.reason}`);
	}

	// 3. 检查权限
	const permissionDecision = await this.policyService.checkPermission(caller, target, request);
	if (!permissionDecision.allowed) {
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'permission_denied',
			timestamp: Date.now(),
			details: { callerId, targetId, reason: permissionDecision.reason }
		});
		throw new Error(`Permission denied: ${permissionDecision.reason}`);
	}

	// 4. 创建 invocation descriptor
	const invocationId = generateUuid();
	const invocation: InvocationDescriptor = {
		id: invocationId,
		callerId,
		targetId,
		request,
		status: 'pending',
		startTime: Date.now()
	};

	// 5. 关联到 active session(如果有)
	const activeSession = this.sessionBroker.getActiveSession();
	if (activeSession) {
		invocation.sessionId = activeSession.id;
		await this.sessionBroker.associateInvocation(activeSession.id, invocationId);
	}

	// 6. 存储 invocation
	this._invocations.set(invocationId, invocation);

	// 7. 创建事件 emitters
	const onChunkEmitter = new Emitter<InvocationChunk>();
	const onCompleteEmitter = new Emitter<any>();
	const onErrorEmitter = new Emitter<AiInteropError>();

	// 8. 监听 cancel token
	token.onCancellationRequested(() => {
		this.cancel(invocationId);
	});

	// 9. 更新状态为 running
	invocation.status = 'running';
	this._invocations.set(invocationId, invocation);

	// 10. 记录审计日志
	this.auditService.logEvent({
		id: generateUuid(),
		type: 'invocation_started',
		timestamp: Date.now(),
		invocationId,
		details: { callerId, targetId, sessionId: invocation.sessionId }
	});

	// 11. 触发事件
	this._onDidStartInvocation.fire(invocation);

	// 12. 返回 handle
	return {
		invocationId,
		onChunk: onChunkEmitter.event,
		onComplete: onCompleteEmitter.event,
		onError: onErrorEmitter.event,
		cancel: () => this.cancel(invocationId)
	};
}
```

#### 3.2 sendChunk

```typescript
async sendChunk(invocationId: string, chunk: InvocationChunk): Promise<void> {
	// 1. 验证 invocation 存在且状态正确
	const invocation = this._invocations.get(invocationId);
	if (!invocation) {
		throw new Error(`Invocation ${invocationId} not found`);
	}
	if (invocation.status !== 'running') {
		throw new Error(`Invocation ${invocationId} is not running`);
	}

	// 2. 触发 chunk 事件
	this._onDidReceiveChunk.fire({ invocationId, chunk });

	// 3. 记录日志(仅在 debug 模式)
	// this.logService.debug(`[AIInterop] Chunk received: ${invocationId} seq=${chunk.seq}`);
}
```

#### 3.3 complete

```typescript
async complete(invocationId: string, result?: any): Promise<void> {
	// 1. 验证 invocation 存在
	const invocation = this._invocations.get(invocationId);
	if (!invocation) {
		throw new Error(`Invocation ${invocationId} not found`);
	}

	// 2. 更新状态
	invocation.status = 'completed';
	invocation.endTime = Date.now();
	this._invocations.set(invocationId, invocation);

	// 3. 记录审计日志
	this.auditService.logEvent({
		id: generateUuid(),
		type: 'invocation_completed',
		timestamp: Date.now(),
		invocationId,
		details: { duration: invocation.endTime - invocation.startTime }
	});

	// 4. 触发事件
	this._onDidCompleteInvocation.fire({ invocationId, result });

	// 5. 记录日志
	this.logService.info(`[AIInterop] Invocation completed: ${invocationId}`);
}
```

#### 3.4 fail

```typescript
async fail(invocationId: string, error: AiInteropError): Promise<void> {
	// 1. 验证 invocation 存在
	const invocation = this._invocations.get(invocationId);
	if (!invocation) {
		throw new Error(`Invocation ${invocationId} not found`);
	}

	// 2. 更新状态
	invocation.status = 'failed';
	invocation.endTime = Date.now();
	invocation.error = error;
	this._invocations.set(invocationId, invocation);

	// 3. 记录审计日志
	this.auditService.logEvent({
		id: generateUuid(),
		type: 'invocation_failed',
		timestamp: Date.now(),
		invocationId,
		details: { error: error.code, message: error.message }
	});

	// 4. 触发事件
	this._onDidFailInvocation.fire({ invocationId, error });

	// 5. 记录日志
	this.logService.error(`[AIInterop] Invocation failed: ${invocationId}`, error);
}
```

#### 3.5 cancel

```typescript
async cancel(invocationId: string): Promise<void> {
	// 1. 验证 invocation 存在
	const invocation = this._invocations.get(invocationId);
	if (!invocation) {
		throw new Error(`Invocation ${invocationId} not found`);
	}

	// 2. 只能取消 pending 或 running 状态的 invocation
	if (invocation.status !== 'pending' && invocation.status !== 'running') {
		return; // 已经结束,无需取消
	}

	// 3. 更新状态
	invocation.status = 'canceled';
	invocation.endTime = Date.now();
	this._invocations.set(invocationId, invocation);

	// 4. 记录审计日志
	this.auditService.logEvent({
		id: generateUuid(),
		type: 'invocation_canceled',
		timestamp: Date.now(),
		invocationId,
		details: {}
	});

	// 5. 触发事件
	this._onDidCancelInvocation.fire(invocationId);

	// 6. 记录日志
	this.logService.info(`[AIInterop] Invocation canceled: ${invocationId}`);
}
```

### 4. 查询方法实现

```typescript
getEndpoint(endpointId: string): EndpointDescriptor | undefined {
	return this._endpoints.get(endpointId);
}

getAllEndpoints(): EndpointDescriptor[] {
	return Array.from(this._endpoints.values());
}

getInvocation(invocationId: string): InvocationDescriptor | undefined {
	return this._invocations.get(invocationId);
}

getAllInvocations(): InvocationDescriptor[] {
	return Array.from(this._invocations.values());
}
```

### 5. Service 注册

在 `src/vs/workbench/workbench.common.main.ts` 中注册 Service:

```typescript
import { registerSingleton } from 'vs/platform/instantiation/common/extensions';
import { IAIInteropBusService } from 'vs/workbench/services/aiInterop/common/aiInterop';
import { AIInteropService } from 'vs/workbench/services/aiInterop/browser/aiInteropService';

registerSingleton(IAIInteropBusService, AIInteropService, InstantiationType.Delayed);
```

### 6. 导入依赖

```typescript
import { Disposable } from 'vs/base/common/lifecycle';
import { Emitter, Event } from 'vs/base/common/event';
import { CancellationToken } from 'vs/base/common/cancellation';
import { generateUuid } from 'vs/base/common/uuid';
import { ILogService } from 'vs/platform/log/common/log';
import {
	IAIInteropBusService,
	IAISessionBrokerService,
	IAIInteropPolicyService,
	IAIInteropAuditService,
	EndpointDescriptor,
	InvocationDescriptor,
	InvocationRequest,
	InvocationHandle,
	InvocationChunk,
	AiInteropError
} from 'vs/workbench/services/aiInterop/common/aiInterop';
```

## 不需要实现的部分

- 不需要实现 Session Broker(由 TASK-P1-004 实现)
- 不需要实现 Policy Service(由 TASK-P1-005 实现)
- 不需要实现 Audit Service(由 TASK-P1-006 实现)
- 不需要实现 RPC Bridge(由 TASK-P1-003 实现)
- 不需要实现 UI(由后续任务实现)
- 不需要实现持久化(Phase 2 完善)

**重要**: 本任务依赖 Session Broker、Policy Service 和 Audit Service,但这些 Service 可能还未实现。在实现时,可以先注入这些 Service 的接口,调用它们的方法。如果这些 Service 还未实现,可以创建 Mock 实现用于测试。

## 自验证清单(开发 AI 完成后自查)

- [ ] TypeScript 编译通过(`npm run compile-check-ts-native`)
- [ ] 代码符合 VS Code 编码规范(见 [CLAUDE.md](../../../.claude/CLAUDE.md))
- [ ] Service 类继承 `Disposable`
- [ ] Service 类实现 `IAIInteropBusService` 接口
- [ ] 所有方法都已实现,无遗漏
- [ ] 使用 `Emitter<T>` 实现所有事件
- [ ] 使用依赖注入模式注入其他 Service
- [ ] 所有状态转换正确(pending → running → completed/failed/canceled)
- [ ] 所有关键操作都记录审计日志
- [ ] 所有关键操作都触发事件
- [ ] 错误处理完整,边界条件考虑周全
- [ ] Service 已注册到 DI 容器

## 完成后操作

1. 在任务跟踪表([docs/phases/poc-1.md](../../phases/poc-1.md))中将状态改为 ⏸️ 待验收
2. 在本文档"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收(引用验收任务编号 TEST-P1-002)

## 实施记录

**开发 AI**：AI-Dev-001
**完成时间**：2026-03-29

**实现要点**：
- 创建了 `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts` 实现 IAIInteropBusService
- 创建了 `src/vs/workbench/services/aiInterop/browser/aiSessionBroker.ts` 实现 IAISessionBrokerService（基础实现）
- 创建了 `src/vs/workbench/services/aiInterop/browser/aiInteropPolicyService.ts` 实现 IAIInteropPolicyService（基础实现）
- 创建了 `src/vs/workbench/services/aiInterop/browser/aiInteropAuditService.ts` 实现 IAIInteropAuditService（基础实现）
- 实现了完整的 Endpoint 管理（注册、注销、查询）
- 实现了完整的 Invocation 生命周期管理（invoke、sendChunk、complete、fail、cancel）
- 实现了路由策略检查（复用 PoC-0 的 _canRoute 逻辑）
- 实现了权限检查（基础版本，自动授权 session 级别权限）
- 实现了审计日志记录（所有关键操作都记录）
- 所有 Service 都使用 Emitter 实现事件机制
- 所有 Service 都注册到 DI 容器（使用 registerSingleton）
- 在 workbench.common.main.ts 中添加了所有 service 的导入

**遇到的问题**：
- 初始导入时重复导入了 service 接口，导致编译错误
- 修正后移除了重复导入，编译通过
