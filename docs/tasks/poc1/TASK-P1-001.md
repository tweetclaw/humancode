# 任务卡：TASK-P1-001

## 任务信息
- **任务编号**：TASK-P1-001
- **任务名称**：Service 层接口定义
- **对应验收**：TEST-P1-001
- **开发 AI**：AI-Dev-001
- **验收 AI**：AI-QA-001
- **依赖任务**：无
- **优先级**：高(阻塞所有其他任务)
- **状态**：⏸️ 待验收

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目,这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务是 PoC-1 阶段的**第一个任务**,目标是定义所有 Service 层的接口、DTO、常量和枚举。这是整个 PoC-1 阶段的基础,所有其他任务都依赖于本任务定义的接口。

**为什么这个任务重要**:
- 接口定义是契约,确保各模块之间的协作清晰
- DTO 定义是数据传输的标准,确保 MainThread 和 ExtHost 之间的通信一致
- 错误码和事件类型枚举是可观测性的基础

## 任务目标

定义完整的 Service 层接口、DTO、常量和枚举,为后续的 Bus、Broker、Policy、Audit 实现提供清晰的契约。

## 必须先阅读的文件

1. [docs/ai-interop/02-core-architecture.md](../../ai-interop/02-core-architecture.md)
   - 了解五层架构和各模块职责
2. [docs/ai-interop/03-rpc-and-dto-spec.md](../../ai-interop/03-rpc-and-dto-spec.md)
   - 了解 RPC 协议规范和 DTO 定义标准
3. [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts) (搜索 TestAiInterop)
   - 参考 PoC-0 已实现的 DTO 定义(EndpointDescriptorDto, AiInteropErrorCode)
4. [docs/ai-interop/04-session-state-machine.md](../../ai-interop/04-session-state-machine.md)
   - 了解 Session 状态机和生命周期
5. [docs/ai-interop/05-permission-and-security.md](../../ai-interop/05-permission-and-security.md)
   - 了解权限模型和授权流程

## 实现位置

**新建文件**:
- `src/vs/workbench/services/aiInterop/common/aiInterop.ts`

**说明**: 这是 Service 层的公共类型定义文件,所有接口、DTO、常量、枚举都应该放在这里。

## 实现要求

### 1. Service 接口定义

定义四个核心 Service 接口:

#### 1.1 IAIInteropBusService

```typescript
export interface IAIInteropBusService {
	readonly _serviceBrand: undefined;

	// Endpoint 管理
	registerEndpoint(descriptor: EndpointDescriptor): Promise<void>;
	unregisterEndpoint(endpointId: string): Promise<void>;
	getEndpoint(endpointId: string): EndpointDescriptor | undefined;
	getAllEndpoints(): EndpointDescriptor[];

	// Invocation 管理
	invoke(callerId: string, targetId: string, request: InvocationRequest, token: CancellationToken): Promise<InvocationHandle>;
	sendChunk(invocationId: string, chunk: InvocationChunk): Promise<void>;
	complete(invocationId: string, result?: any): Promise<void>;
	fail(invocationId: string, error: AiInteropError): Promise<void>;
	cancel(invocationId: string): Promise<void>;

	// 查询
	getInvocation(invocationId: string): InvocationDescriptor | undefined;
	getAllInvocations(): InvocationDescriptor[];

	// 事件
	readonly onDidRegisterEndpoint: Event<EndpointDescriptor>;
	readonly onDidUnregisterEndpoint: Event<string>;
	readonly onDidStartInvocation: Event<InvocationDescriptor>;
	readonly onDidReceiveChunk: Event<{ invocationId: string; chunk: InvocationChunk }>;
	readonly onDidCompleteInvocation: Event<{ invocationId: string; result?: any }>;
	readonly onDidFailInvocation: Event<{ invocationId: string; error: AiInteropError }>;
	readonly onDidCancelInvocation: Event<string>;
}
```

#### 1.2 IAISessionBrokerService

```typescript
export interface IAISessionBrokerService {
	readonly _serviceBrand: undefined;

	// Session 管理
	createSession(config: SessionConfig): Promise<SessionDescriptor>;
	getSession(sessionId: string): SessionDescriptor | undefined;
	getAllSessions(): SessionDescriptor[];
	deleteSession(sessionId: string): Promise<void>;

	// Participant 管理
	addParticipant(sessionId: string, participant: ParticipantDescriptor): Promise<void>;
	removeParticipant(sessionId: string, participantId: string): Promise<void>;
	getParticipants(sessionId: string): ParticipantDescriptor[];

	// Invocation 关联
	associateInvocation(sessionId: string, invocationId: string): Promise<void>;
	getSessionInvocations(sessionId: string): string[];

	// Session 状态
	updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void>;
	getActiveSession(): SessionDescriptor | undefined;
	setActiveSession(sessionId: string): Promise<void>;

	// 事件
	readonly onDidCreateSession: Event<SessionDescriptor>;
	readonly onDidDeleteSession: Event<string>;
	readonly onDidAddParticipant: Event<{ sessionId: string; participant: ParticipantDescriptor }>;
	readonly onDidRemoveParticipant: Event<{ sessionId: string; participantId: string }>;
	readonly onDidUpdateSessionStatus: Event<{ sessionId: string; status: SessionStatus }>;
}
```

#### 1.3 IAIInteropPolicyService

```typescript
export interface IAIInteropPolicyService {
	readonly _serviceBrand: undefined;

	// 授权决策
	checkPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision>;
	requestPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision>;

	// 授权记录管理
	grantPermission(caller: string, target: string, scope: PermissionScope): Promise<void>;
	revokePermission(caller: string, target: string): Promise<void>;
	getPermissions(callerId?: string): PermissionRecord[];

	// 路由策略(复用 PoC-0 实现)
	canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): RouteDecision;

	// 事件
	readonly onDidGrantPermission: Event<PermissionRecord>;
	readonly onDidRevokePermission: Event<{ callerId: string; targetId: string }>;
}
```

#### 1.4 IAIInteropAuditService

```typescript
export interface IAIInteropAuditService {
	readonly _serviceBrand: undefined;

	// 事件记录
	logEvent(event: AuditEvent): void;

	// 查询
	getEvents(filter?: AuditEventFilter): AuditEvent[];
	getEventsByType(type: AuditEventType): AuditEvent[];
	getEventsByExtension(extensionId: string): AuditEvent[];
	getEventsByTimeRange(start: number, end: number): AuditEvent[];

	// 清理
	clearEvents(): void;

	// 事件
	readonly onDidLogEvent: Event<AuditEvent>;
}
```

### 2. DTO 定义

#### 2.1 EndpointDescriptor

```typescript
export interface EndpointDescriptor {
	id: string;
	extensionId: string;
	displayName: string;
	description?: string;
	capabilities: EndpointCapability[];
	hostKind: 'local' | 'remote' | 'web';
	remoteAuthority?: string;
	metadata?: Record<string, any>;
}

export interface EndpointCapability {
	type: 'streaming' | 'tool' | 'mcp' | 'cli';
	config?: Record<string, any>;
}
```

#### 2.2 InvocationDescriptor

```typescript
export interface InvocationDescriptor {
	id: string;
	callerId: string;
	targetId: string;
	sessionId?: string;
	request: InvocationRequest;
	status: InvocationStatus;
	startTime: number;
	endTime?: number;
	error?: AiInteropError;
	metadata?: Record<string, any>;
}

export interface InvocationRequest {
	prompt?: string;
	context?: Record<string, any>;
	options?: InvocationOptions;
}

export interface InvocationOptions {
	streaming?: boolean;
	timeout?: number;
	maxTokens?: number;
	temperature?: number;
}

export type InvocationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

export interface InvocationHandle {
	invocationId: string;
	onChunk: Event<InvocationChunk>;
	onComplete: Event<any>;
	onError: Event<AiInteropError>;
	cancel(): void;
}

export interface InvocationChunk {
	seq: number;
	text: string;
	metadata?: Record<string, any>;
}
```

#### 2.3 SessionDescriptor

```typescript
export interface SessionDescriptor {
	id: string;
	displayName: string;
	description?: string;
	status: SessionStatus;
	participants: ParticipantDescriptor[];
	invocations: string[];
	createdAt: number;
	lastActiveAt: number;
	metadata?: Record<string, any>;
}

export type SessionStatus = 'active' | 'idle' | 'archived';

export interface SessionConfig {
	displayName: string;
	description?: string;
	metadata?: Record<string, any>;
}

export interface ParticipantDescriptor {
	id: string;
	endpointId: string;
	role: 'controller' | 'worker' | 'observer';
	joinedAt: number;
}
```

#### 2.4 Permission & Policy

```typescript
export interface PermissionDecision {
	allowed: boolean;
	reason?: string;
	scope?: PermissionScope;
}

export type PermissionScope = 'once' | 'session' | 'always';

export interface PermissionRecord {
	callerId: string;
	targetId: string;
	scope: PermissionScope;
	grantedAt: number;
	expiresAt?: number;
}

export interface RouteDecision {
	allowed: boolean;
	reason?: string;
}
```

#### 2.5 Audit

```typescript
export interface AuditEvent {
	id: string;
	type: AuditEventType;
	timestamp: number;
	extensionId?: string;
	invocationId?: string;
	sessionId?: string;
	details: Record<string, any>;
}

export type AuditEventType =
	| 'endpoint_registered'
	| 'endpoint_unregistered'
	| 'invocation_started'
	| 'invocation_completed'
	| 'invocation_failed'
	| 'invocation_canceled'
	| 'permission_granted'
	| 'permission_denied'
	| 'permission_revoked'
	| 'session_created'
	| 'session_deleted'
	| 'participant_added'
	| 'participant_removed';

export interface AuditEventFilter {
	type?: AuditEventType;
	extensionId?: string;
	invocationId?: string;
	sessionId?: string;
	startTime?: number;
	endTime?: number;
}
```

### 3. 错误定义

```typescript
export interface AiInteropError {
	code: AiInteropErrorCode;
	message: string;
	details?: Record<string, any>;
}

export const enum AiInteropErrorCode {
	// Endpoint 相关
	ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',
	ENDPOINT_ALREADY_REGISTERED = 'ENDPOINT_ALREADY_REGISTERED',

	// Invocation 相关
	INVOCATION_NOT_FOUND = 'INVOCATION_NOT_FOUND',
	INVOCATION_TIMEOUT = 'INVOCATION_TIMEOUT',
	INVOCATION_CANCELED = 'INVOCATION_CANCELED',
	INVOCATION_FAILED = 'INVOCATION_FAILED',

	// Permission 相关
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	PERMISSION_NOT_FOUND = 'PERMISSION_NOT_FOUND',

	// Routing 相关(复用 PoC-0)
	REMOTE_AUTHORITY_MISMATCH = 'REMOTE_AUTHORITY_MISMATCH',
	HOST_KIND_UNSUPPORTED = 'HOST_KIND_UNSUPPORTED',

	// Session 相关
	SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
	SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
	PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',

	// 通用错误
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
}
```

### 4. Service ID 常量

```typescript
export const IAIInteropBusService = createDecorator<IAIInteropBusService>('aiInteropBusService');
export const IAISessionBrokerService = createDecorator<IAISessionBrokerService>('aiSessionBrokerService');
export const IAIInteropPolicyService = createDecorator<IAIInteropPolicyService>('aiInteropPolicyService');
export const IAIInteropAuditService = createDecorator<IAIInteropAuditService>('aiInteropAuditService');
```

### 5. 导入依赖

确保正确导入 VS Code 的核心类型:

```typescript
import { Event } from 'vs/base/common/event';
import { CancellationToken } from 'vs/base/common/cancellation';
import { createDecorator } from 'vs/platform/instantiation/common/instantiation';
```

## 不需要实现的部分

- 不需要实现任何 Service 的具体逻辑(由后续任务实现)
- 不需要实现 RPC Shape(由 TASK-P1-003 实现)
- 不需要实现 UI(由后续任务实现)
- 不需要编写测试(由验收任务验证)

## 自验证清单(开发 AI 完成后自查)

- [ ] TypeScript 编译通过(`npm run compile-check-ts-native`)
- [ ] 代码符合 VS Code 编码规范(见 [CLAUDE.md](../../../.claude/CLAUDE.md))
- [ ] 所有 Service 接口都包含 `readonly _serviceBrand: undefined`
- [ ] 所有 Service 接口都使用 `createDecorator` 创建 Service ID
- [ ] 所有 DTO 定义完整,字段类型正确
- [ ] 错误码枚举使用 `const enum`
- [ ] 事件类型枚举使用 `type` 联合类型
- [ ] 所有接口都有清晰的注释(可选,但建议添加)
- [ ] 导入的依赖路径正确

## 完成后操作

1. 在任务跟踪表([docs/phases/poc-1.md](../../phases/poc-1.md))中将状态改为 ⏸️ 待验收
2. 在本文档"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收(引用验收任务编号 TEST-P1-001)

## 实施记录

**开发 AI**：AI-Dev-001
**完成时间**：2026-03-29

**实现要点**：
- 创建了 `src/vs/workbench/services/aiInterop/common/aiInterop.ts` 文件
- 定义了四个核心 Service 接口：IAIInteropBusService、IAISessionBrokerService、IAIInteropPolicyService、IAIInteropAuditService
- 定义了完整的 DTO 体系：EndpointDescriptor、InvocationDescriptor、SessionDescriptor、PermissionRecord、AuditEvent 等
- 定义了错误码枚举 AiInteropErrorCode（包含 17 个错误码）
- 定义了审计事件类型 AuditEventType（包含 12 个事件类型）
- 使用 createDecorator 创建了所有 Service ID 常量
- 所有接口都包含 `readonly _serviceBrand: undefined`
- 使用相对路径导入并添加 `.js` 扩展名（符合 VS Code 规范）

**遇到的问题**：
- 初始使用了绝对路径导入（`vs/base/common/event`），导致 TypeScript 编译失败
- 修正为相对路径导入（`../../../../base/common/event.js`）后编译通过
