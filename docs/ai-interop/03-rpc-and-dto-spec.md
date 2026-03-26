
---

# 3. `03-rpc-and-dto-spec.md`

```md
# AI Interop 平台能力：接口协议文档（RPC / DTO）

## 1. 文档目标

本文档定义 AI Interop 的主线程与扩展宿主之间的正式协议，包括 RPC 形状、DTO、错误码、取消语义、chunk 顺序语义。本文档是协议规范，不是代码注释。

## 2. 设计原则

1. 所有跨边界通信都必须通过 MainThread / ExtHost RPC；
2. 所有消息必须可序列化；
3. 流式输出统一使用 chunk 批量传输；
4. cancel 必须是正式协议事件，不依赖约定；
5. 协议必须支持后续扩展字段。:contentReference[oaicite:26]{index=26}

## 3. RPC Shape

### 3.1 MainThreadAiInteropShape
主线程暴露给扩展宿主的方法：

```ts
export interface MainThreadAiInteropShape {
  $registerEndpoint(handle: number, descriptor: EndpointDescriptorDto): Promise<void>;
  $unregisterEndpoint(handle: number): Promise<void>;

  $createSession(request: CreateSessionRequestDto): Promise<CreateSessionResultDto>;
  $joinSession(request: JoinSessionRequestDto): Promise<void>;
  $leaveSession(request: LeaveSessionRequestDto): Promise<void>;

  $invoke(request: InvocationStartDto): Promise<void>;
  $acceptInvocationChunk(invocationId: string, chunks: InvocationChunkDto[]): Promise<void>;
  $completeInvocation(invocationId: string, result: InvocationCompleteDto): Promise<void>;
  $failInvocation(invocationId: string, error: InvocationErrorDto): Promise<void>;
  $cancelInvocation(invocationId: string): Promise<void>;
}


3.2 ExtHostAiInteropShape

扩展宿主暴露给主线程的方法：

export interface ExtHostAiInteropShape {
  $onInvocation(request: InvocationStartDto): Promise<void>;
  $onInvocationCancel(invocationId: string): Promise<void>;

  $onSessionCreated(session: SessionSnapshotDto): Promise<void>;
  $onSessionUpdated(session: SessionSnapshotDto): Promise<void>;
  $onSessionClosed(sessionId: string): Promise<void>;

  $onAuthorizationRequired(request: AuthorizationPromptDto): Promise<AuthorizationDecisionDto>;
}

4. DTO 规范
4.1 EndpointDescriptorDto
export interface EndpointDescriptorDto {
  id: string;
  extensionId: string;
  displayName: string;
  kind: 'agent' | 'tool' | 'ui' | 'model';
  hostKind: 'local' | 'remote' | 'web';
  remoteAuthority?: string;
  supportsStreaming: boolean;
  supportsCancel: boolean;
  supportedContentTypes?: string[];
  tags?: string[];
  capabilityHints?: string[];
}
4.2 Session DTO
export interface CreateSessionRequestDto {
  title?: string;
  ownerExtensionId: string;
  workspaceKey: string;
}

export interface CreateSessionResultDto {
  sessionId: string;
  createdAt: number;
}

export interface JoinSessionRequestDto {
  sessionId: string;
  endpointId: string;
  role: 'controller' | 'worker' | 'observer' | 'ui';
}

export interface LeaveSessionRequestDto {
  sessionId: string;
  endpointId: string;
}

export interface SessionSnapshotDto {
  sessionId: string;
  title?: string;
  workspaceKey: string;
  state: 'active' | 'suspended' | 'closed';
  members: SessionParticipantDto[];
  updatedAt: number;
}
4.3 InvocationStartDto
export interface InvocationStartDto {
  invocationId: string;
  sessionId: string;
  callerEndpointId: string;
  targetEndpointId: string;
  turnId: string;
  createdAt: number;

  contextMode: 'none' | 'lastTurn' | 'full' | 'redacted';

  input: {
    text?: string;
    structured?: unknown;
    attachments?: ArtifactRefDto[];
  };

  timeoutMs?: number;
}
4.4 InvocationChunkDto
export type InvocationChunkDto =
  | TextChunkDto
  | MarkdownChunkDto
  | StructuredStateChunkDto
  | ToolCallChunkDto
  | ToolResultChunkDto
  | StatusChunkDto
  | ArtifactChunkDto;

export interface BaseChunkDto {
  invocationId: string;
  seq: number;
  timestamp: number;
  kind: string;
}

export interface TextChunkDto extends BaseChunkDto {
  kind: 'text';
  text: string;
}

export interface MarkdownChunkDto extends BaseChunkDto {
  kind: 'markdown';
  markdown: string;
}

export interface StructuredStateChunkDto extends BaseChunkDto {
  kind: 'state';
  patch: unknown;
}

export interface ToolCallChunkDto extends BaseChunkDto {
  kind: 'toolCall';
  toolCallId: string;
  toolId: string;
  input: unknown;
  riskLevel?: 'low' | 'medium' | 'high';
}

export interface ToolResultChunkDto extends BaseChunkDto {
  kind: 'toolResult';
  toolCallId: string;
  result: unknown;
  isError?: boolean;
}

export interface StatusChunkDto extends BaseChunkDto {
  kind: 'status';
  status:
    | 'pending'
    | 'streaming'
    | 'waiting_authorization'
    | 'waiting_tool'
    | 'completed'
    | 'failed'
    | 'canceled'
    | 'orphaned';
  message?: string;
}

export interface ArtifactChunkDto extends BaseChunkDto {
  kind: 'artifact';
  ref: ArtifactRefDto;
}
4.5 Completion / Error DTO
export interface InvocationCompleteDto {
  invocationId: string;
  finalStatus: 'completed';
  summary?: string;
  result?: unknown;
  finishedAt: number;
}

export interface InvocationErrorDto {
  invocationId: string;
  code: AiInteropErrorCode;
  message: string;
  retriable: boolean;
  details?: unknown;
  finishedAt: number;
}
5. 错误码规范
export type AiInteropErrorCode =
  | 'ENDPOINT_NOT_FOUND'
  | 'UNAUTHORIZED'
  | 'SESSION_NOT_FOUND'
  | 'SESSION_SCOPE_DENIED'
  | 'REMOTE_AUTHORITY_MISMATCH'
  | 'HOST_KIND_UNSUPPORTED'
  | 'TOOL_APPROVAL_DENIED'
  | 'INVOCATION_CANCELED'
  | 'INVOCATION_TIMEOUT'
  | 'TARGET_HOST_LOST'
  | 'TARGET_HANDLER_ERROR'
  | 'PROTOCOL_VIOLATION'
  | 'PAYLOAD_TOO_LARGE';

要求：

所有错误必须返回稳定 code；

message 仅用于日志与展示；

是否可重试必须显式标记。

6. 取消语义
6.1 原则

cancel 是 invocation 级别；

主控端可随时请求 cancel；

主线程必须通过 RPC cancel 传播到目标 ExtHost；

目标 handler 必须收到 CancellationToken；

cancel 后不得再发送新的业务 chunk；

平台可接受一个最终 failed(code=INVOCATION_CANCELED) 或 completed(finalStatus=canceled) 终止帧。

6.2 时序

caller 发起 cancel；

Bus 标记 invocation 为 cancel-requested；

MainThreadAiInterop 调用 $onInvocationCancel(invocationId)；

ExtHost handler 收到 cancel；

handler 停止执行；

返回终止帧；

Session Broker 写入状态；

Audit 记录 cancel 决策与完成时间。

7. Chunk 顺序与批量保证
7.1 顺序

同一 invocation 下，chunk 按 seq 单调递增；

平台必须拒绝倒序 chunk；

重复 seq 仅允许幂等去重，不允许双写。

7.2 批量

acceptInvocationChunk(invocationId, chunks[]) 是推荐路径；

单批次建议不超过：

64 chunks 或

256KB payload

平台可在主线程侧二次合批写入审计日志。

7.3 背压

当达到阈值时：

平台可延迟消费；

平台可下发 flow-control；

低优先级 status 可被合并；

文本 token 可被压缩成更大块。

8. 兼容策略

新字段必须是可选字段；

shape 方法只能追加，不能在 proposed 期间频繁改语义；

所有 DTO 均应预留 metadata?: Record<string, unknown>。
