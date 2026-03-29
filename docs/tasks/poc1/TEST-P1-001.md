# 验收卡：TEST-P1-001

## 验收信息
- **验收编号**：TEST-P1-001
- **对应任务**：TASK-P1-001
- **验收 AI**：AI-QA-001
- **验收类型**：代码质量验收 + 接口完整性验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-P1-001 的实现是否符合要求,确保所有 Service 层接口、DTO、常量和枚举定义完整且正确。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-P1-001.md](TASK-P1-001.md)
2. 确认开发 AI 已标记任务为"待验收"
3. 拉取最新代码,确保环境干净

## 验收步骤

### 1. 代码质量检查

- [ ] **TypeScript 编译通过**
  - 运行 `npm run compile-check-ts-native`
  - 验证无编译错误

- [ ] **编码规范检查**
  - 使用 tabs 缩进(不是 spaces)
  - 接口使用 PascalCase(如 `IAIInteropBusService`)
  - 类型使用 PascalCase(如 `EndpointDescriptor`)
  - 枚举使用 PascalCase(如 `AiInteropErrorCode`)
  - 常量使用 UPPER_SNAKE_CASE(如果有)

- [ ] **文件位置正确**
  - 文件位于 `src/vs/workbench/services/aiInterop/common/aiInterop.ts`
  - 文件包含 Microsoft 版权声明

### 2. Service 接口验收

#### 2.1 IAIInteropBusService

- [ ] **接口定义存在**
  - 接口名称为 `IAIInteropBusService`
  - 包含 `readonly _serviceBrand: undefined`

- [ ] **Endpoint 管理方法**
  - `registerEndpoint(descriptor: EndpointDescriptor): Promise<void>`
  - `unregisterEndpoint(endpointId: string): Promise<void>`
  - `getEndpoint(endpointId: string): EndpointDescriptor | undefined`
  - `getAllEndpoints(): EndpointDescriptor[]`

- [ ] **Invocation 管理方法**
  - `invoke(callerId: string, targetId: string, request: InvocationRequest, token: CancellationToken): Promise<InvocationHandle>`
  - `sendChunk(invocationId: string, chunk: InvocationChunk): Promise<void>`
  - `complete(invocationId: string, result?: any): Promise<void>`
  - `fail(invocationId: string, error: AiInteropError): Promise<void>`
  - `cancel(invocationId: string): Promise<void>`

- [ ] **查询方法**
  - `getInvocation(invocationId: string): InvocationDescriptor | undefined`
  - `getAllInvocations(): InvocationDescriptor[]`

- [ ] **事件定义**
  - `readonly onDidRegisterEndpoint: Event<EndpointDescriptor>`
  - `readonly onDidUnregisterEndpoint: Event<string>`
  - `readonly onDidStartInvocation: Event<InvocationDescriptor>`
  - `readonly onDidReceiveChunk: Event<{ invocationId: string; chunk: InvocationChunk }>`
  - `readonly onDidCompleteInvocation: Event<{ invocationId: string; result?: any }>`
  - `readonly onDidFailInvocation: Event<{ invocationId: string; error: AiInteropError }>`
  - `readonly onDidCancelInvocation: Event<string>`

#### 2.2 IAISessionBrokerService

- [ ] **接口定义存在**
  - 接口名称为 `IAISessionBrokerService`
  - 包含 `readonly _serviceBrand: undefined`

- [ ] **Session 管理方法**
  - `createSession(config: SessionConfig): Promise<SessionDescriptor>`
  - `getSession(sessionId: string): SessionDescriptor | undefined`
  - `getAllSessions(): SessionDescriptor[]`
  - `deleteSession(sessionId: string): Promise<void>`

- [ ] **Participant 管理方法**
  - `addParticipant(sessionId: string, participant: ParticipantDescriptor): Promise<void>`
  - `removeParticipant(sessionId: string, participantId: string): Promise<void>`
  - `getParticipants(sessionId: string): ParticipantDescriptor[]`

- [ ] **Invocation 关联方法**
  - `associateInvocation(sessionId: string, invocationId: string): Promise<void>`
  - `getSessionInvocations(sessionId: string): string[]`

- [ ] **Session 状态方法**
  - `updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void>`
  - `getActiveSession(): SessionDescriptor | undefined`
  - `setActiveSession(sessionId: string): Promise<void>`

- [ ] **事件定义**
  - `readonly onDidCreateSession: Event<SessionDescriptor>`
  - `readonly onDidDeleteSession: Event<string>`
  - `readonly onDidAddParticipant: Event<{ sessionId: string; participant: ParticipantDescriptor }>`
  - `readonly onDidRemoveParticipant: Event<{ sessionId: string; participantId: string }>`
  - `readonly onDidUpdateSessionStatus: Event<{ sessionId: string; status: SessionStatus }>`

#### 2.3 IAIInteropPolicyService

- [ ] **接口定义存在**
  - 接口名称为 `IAIInteropPolicyService`
  - 包含 `readonly _serviceBrand: undefined`

- [ ] **授权决策方法**
  - `checkPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision>`
  - `requestPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision>`

- [ ] **授权记录管理方法**
  - `grantPermission(caller: string, target: string, scope: PermissionScope): Promise<void>`
  - `revokePermission(caller: string, target: string): Promise<void>`
  - `getPermissions(callerId?: string): PermissionRecord[]`

- [ ] **路由策略方法**
  - `canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): RouteDecision`

- [ ] **事件定义**
  - `readonly onDidGrantPermission: Event<PermissionRecord>`
  - `readonly onDidRevokePermission: Event<{ callerId: string; targetId: string }>`

#### 2.4 IAIInteropAuditService

- [ ] **接口定义存在**
  - 接口名称为 `IAIInteropAuditService`
  - 包含 `readonly _serviceBrand: undefined`

- [ ] **事件记录方法**
  - `logEvent(event: AuditEvent): void`

- [ ] **查询方法**
  - `getEvents(filter?: AuditEventFilter): AuditEvent[]`
  - `getEventsByType(type: AuditEventType): AuditEvent[]`
  - `getEventsByExtension(extensionId: string): AuditEvent[]`
  - `getEventsByTimeRange(start: number, end: number): AuditEvent[]`

- [ ] **清理方法**
  - `clearEvents(): void`

- [ ] **事件定义**
  - `readonly onDidLogEvent: Event<AuditEvent>`

### 3. DTO 定义验收

#### 3.1 EndpointDescriptor

- [ ] **接口定义完整**
  - `id: string`
  - `extensionId: string`
  - `displayName: string`
  - `description?: string`
  - `capabilities: EndpointCapability[]`
  - `hostKind: 'local' | 'remote' | 'web'`
  - `remoteAuthority?: string`
  - `metadata?: Record<string, any>`

- [ ] **EndpointCapability 定义**
  - `type: 'streaming' | 'tool' | 'mcp' | 'cli'`
  - `config?: Record<string, any>`

#### 3.2 InvocationDescriptor

- [ ] **InvocationDescriptor 定义完整**
  - `id: string`
  - `callerId: string`
  - `targetId: string`
  - `sessionId?: string`
  - `request: InvocationRequest`
  - `status: InvocationStatus`
  - `startTime: number`
  - `endTime?: number`
  - `error?: AiInteropError`
  - `metadata?: Record<string, any>`

- [ ] **InvocationRequest 定义**
  - `prompt?: string`
  - `context?: Record<string, any>`
  - `options?: InvocationOptions`

- [ ] **InvocationOptions 定义**
  - `streaming?: boolean`
  - `timeout?: number`
  - `maxTokens?: number`
  - `temperature?: number`

- [ ] **InvocationStatus 类型**
  - 类型为 `'pending' | 'running' | 'completed' | 'failed' | 'canceled'`

- [ ] **InvocationHandle 定义**
  - `invocationId: string`
  - `onChunk: Event<InvocationChunk>`
  - `onComplete: Event<any>`
  - `onError: Event<AiInteropError>`
  - `cancel(): void`

- [ ] **InvocationChunk 定义**
  - `seq: number`
  - `text: string`
  - `metadata?: Record<string, any>`

#### 3.3 SessionDescriptor

- [ ] **SessionDescriptor 定义完整**
  - `id: string`
  - `displayName: string`
  - `description?: string`
  - `status: SessionStatus`
  - `participants: ParticipantDescriptor[]`
  - `invocations: string[]`
  - `createdAt: number`
  - `lastActiveAt: number`
  - `metadata?: Record<string, any>`

- [ ] **SessionStatus 类型**
  - 类型为 `'active' | 'idle' | 'archived'`

- [ ] **SessionConfig 定义**
  - `displayName: string`
  - `description?: string`
  - `metadata?: Record<string, any>`

- [ ] **ParticipantDescriptor 定义**
  - `id: string`
  - `endpointId: string`
  - `role: 'controller' | 'worker' | 'observer'`
  - `joinedAt: number`

#### 3.4 Permission & Policy

- [ ] **PermissionDecision 定义**
  - `allowed: boolean`
  - `reason?: string`
  - `scope?: PermissionScope`

- [ ] **PermissionScope 类型**
  - 类型为 `'once' | 'session' | 'always'`

- [ ] **PermissionRecord 定义**
  - `callerId: string`
  - `targetId: string`
  - `scope: PermissionScope`
  - `grantedAt: number`
  - `expiresAt?: number`

- [ ] **RouteDecision 定义**
  - `allowed: boolean`
  - `reason?: string`

#### 3.5 Audit

- [ ] **AuditEvent 定义**
  - `id: string`
  - `type: AuditEventType`
  - `timestamp: number`
  - `extensionId?: string`
  - `invocationId?: string`
  - `sessionId?: string`
  - `details: Record<string, any>`

- [ ] **AuditEventType 类型**
  - 包含所有必要的事件类型:
    - `'endpoint_registered'`
    - `'endpoint_unregistered'`
    - `'invocation_started'`
    - `'invocation_completed'`
    - `'invocation_failed'`
    - `'invocation_canceled'`
    - `'permission_granted'`
    - `'permission_denied'`
    - `'permission_revoked'`
    - `'session_created'`
    - `'session_deleted'`
    - `'participant_added'`
    - `'participant_removed'`

- [ ] **AuditEventFilter 定义**
  - `type?: AuditEventType`
  - `extensionId?: string`
  - `invocationId?: string`
  - `sessionId?: string`
  - `startTime?: number`
  - `endTime?: number`

### 4. 错误定义验收

- [ ] **AiInteropError 接口**
  - `code: AiInteropErrorCode`
  - `message: string`
  - `details?: Record<string, any>`

- [ ] **AiInteropErrorCode 枚举**
  - 使用 `const enum` 定义
  - 包含所有必要的错误码:
    - `ENDPOINT_NOT_FOUND`
    - `ENDPOINT_ALREADY_REGISTERED`
    - `INVOCATION_NOT_FOUND`
    - `INVOCATION_TIMEOUT`
    - `INVOCATION_CANCELED`
    - `INVOCATION_FAILED`
    - `PERMISSION_DENIED`
    - `PERMISSION_NOT_FOUND`
    - `REMOTE_AUTHORITY_MISMATCH`
    - `HOST_KIND_UNSUPPORTED`
    - `SESSION_NOT_FOUND`
    - `SESSION_ALREADY_EXISTS`
    - `PARTICIPANT_NOT_FOUND`
    - `INVALID_ARGUMENT`
    - `INTERNAL_ERROR`

### 5. Service ID 常量验收

- [ ] **Service ID 定义**
  - `IAIInteropBusService` 使用 `createDecorator` 创建
  - `IAISessionBrokerService` 使用 `createDecorator` 创建
  - `IAIInteropPolicyService` 使用 `createDecorator` 创建
  - `IAIInteropAuditService` 使用 `createDecorator` 创建

### 6. 导入依赖验收

- [ ] **导入正确**
  - `import { Event } from 'vs/base/common/event'`
  - `import { CancellationToken } from 'vs/base/common/cancellation'`
  - `import { createDecorator } from 'vs/platform/instantiation/common/instantiation'`

### 7. 文档检查

- [ ] 开发 AI 已填写 TASK-P1-001.md 的"实施记录"区域
- [ ] 实施记录包含实现要点和遇到的问题

## 验收结果

**⚠️ 重要说明**:
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后,应创建独立的**验收报告文件**
- 验收报告位置: `docs/reports/TEST-P1-001-report.md`

**验收 AI 操作流程**:
1. 按照验收步骤逐项检查
2. 创建验收报告文件(参考 PoC-0 的验收报告格式)
3. 在任务跟踪表([docs/phases/poc-1.md](../../phases/poc-1.md))中更新状态
4. 通知项目经理验收结果

## 后续操作

### 如果验收通过
- [ ] 在任务跟踪表中将 TASK-P1-001 状态改为 ✅ 已完成
- [ ] 在任务跟踪表中将 TEST-P1-001 状态改为 ✅ 通过
- [ ] 通知项目经理验收通过
- [ ] 通知后续依赖任务的开发 AI 可以开始工作

### 如果验收失败
- [ ] 在任务跟踪表中将 TASK-P1-001 状态改为 ❌ 验收失败
- [ ] 在任务跟踪表中将 TEST-P1-001 状态改为 ❌ 失败
- [ ] 在验收报告中详细记录发现的问题
- [ ] 通知开发 AI 修复问题,修复后重新提交验收

## 附录

### 测试环境信息
- 操作系统: macOS
- Node 版本: [验收时填写]
- VS Code 版本: Code - OSS (开发版本)

### 关键代码位置

**Service 接口定义**:
- [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)

### 参考文档

- [02-core-architecture.md](../../ai-interop/02-core-architecture.md) - 核心架构设计
- [03-rpc-and-dto-spec.md](../../ai-interop/03-rpc-and-dto-spec.md) - RPC 协议规范
- [04-session-state-machine.md](../../ai-interop/04-session-state-machine.md) - Session 状态机
- [05-permission-and-security.md](../../ai-interop/05-permission-and-security.md) - 权限与安全
