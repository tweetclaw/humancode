# 任务卡：TASK-P1-004

## 任务信息
- **任务编号**：TASK-P1-004
- **任务名称**：AI Session Broker 实现
- **对应验收**：TEST-P1-004
- **开发 AI**：AI-Dev-001
- **验收 AI**：AI-QA-001
- **依赖任务**：TASK-P1-002 (AI Interop Bus 实现)
- **优先级**：高
- **状态**：⏸️ 待验收

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目,这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务是 PoC-1 阶段的**核心任务**,目标是实现 AI Session Broker 的完整功能。Session Broker 负责管理多个"虚拟 AI 角色会话"的生命周期,是多 AI 协作的基础。

**为什么需要 Session Broker**:
- 一个项目可能有多个并行的 AI 协作会话(如前端开发、后端开发、测试)
- 每个会话有独立的参与者(participants)和对话历史
- Invocation 需要关联到 Session,便于上下文管理和审计

## 任务目标

实现 `AISessionBrokerService`,提供完整的 Session 管理功能:
1. Session 创建、销毁、查询
2. Participant 管理
3. Invocation 与 Session 关联
4. Session 状态管理
5. Active Session 管理

## 必须先阅读的文件

1. [src/vs/workbench/services/aiInterop/common/aiInterop.ts](../../../src/vs/workbench/services/aiInterop/common/aiInterop.ts)
   - TASK-P1-001 定义的 IAISessionBrokerService 接口
2. [docs/ai-interop/04-session-state-machine.md](../../ai-interop/04-session-state-machine.md)
   - 了解 Session 状态机和生命周期
3. [src/vs/workbench/services/aiInterop/browser/aiInteropService.ts](../../../src/vs/workbench/services/aiInterop/browser/aiInteropService.ts)
   - 了解 Bus Service 如何调用 Session Broker
4. [src/vs/workbench/services/chat/common/chatService.ts](../../../src/vs/workbench/services/chat/common/chatService.ts)
   - 参考现有的 Chat Service 实现模式

## 实现位置

**文件**:
- `src/vs/workbench/services/aiInterop/browser/aiSessionBroker.ts`

**说明**: TASK-P1-002 已创建此文件的基础实现,本任务需要完善功能。

## 实现要求

### 1. Service 类定义

```typescript
export class AISessionBrokerService extends Disposable implements IAISessionBrokerService {
	declare readonly _serviceBrand: undefined;

	// 内部状态
	private readonly _sessions = new Map<string, SessionDescriptor>();
	private _activeSessionId: string | undefined;

	// 事件 Emitters
	private readonly _onDidCreateSession = this._register(new Emitter<SessionDescriptor>());
	readonly onDidCreateSession = this._onDidCreateSession.event;

	// ... 其他事件

	constructor(
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadSessions(); // 从持久化存储加载
	}

	// 实现 IAISessionBrokerService 的所有方法
}
```

### 2. Session 管理实现

#### 2.1 createSession

```typescript
async createSession(config: SessionConfig): Promise<SessionDescriptor> {
	const session: SessionDescriptor = {
		id: generateUuid(),
		displayName: config.displayName,
		description: config.description,
		status: 'active',
		participants: [],
		invocations: [],
		createdAt: Date.now(),
		lastActiveAt: Date.now(),
		metadata: config.metadata
	};

	this._sessions.set(session.id, session);
	this._onDidCreateSession.fire(session);
	this._persistSessions();

	this.logService.info(`[SessionBroker] Session created: ${session.id}`);
	return session;
}
```

#### 2.2 getSession / getAllSessions

```typescript
getSession(sessionId: string): SessionDescriptor | undefined {
	return this._sessions.get(sessionId);
}

getAllSessions(): SessionDescriptor[] {
	return Array.from(this._sessions.values())
		.sort((a, b) => b.lastActiveAt - a.lastActiveAt); // 按最近活跃排序
}
```

#### 2.3 deleteSession

```typescript
async deleteSession(sessionId: string): Promise<void> {
	const session = this._sessions.get(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	// 如果是当前活跃会话,清除活跃状态
	if (this._activeSessionId === sessionId) {
		this._activeSessionId = undefined;
	}

	this._sessions.delete(sessionId);
	this._onDidDeleteSession.fire(sessionId);
	this._persistSessions();

	this.logService.info(`[SessionBroker] Session deleted: ${sessionId}`);
}
```

### 3. Participant 管理实现

#### 3.1 addParticipant

```typescript
async addParticipant(sessionId: string, participant: ParticipantDescriptor): Promise<void> {
	const session = this._sessions.get(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	// 检查是否已存在
	if (session.participants.some(p => p.id === participant.id)) {
		throw new Error(`Participant ${participant.id} already exists in session`);
	}

	session.participants.push(participant);
	session.lastActiveAt = Date.now();
	this._sessions.set(sessionId, session);

	this._onDidAddParticipant.fire({ sessionId, participant });
	this._persistSessions();

	this.logService.info(`[SessionBroker] Participant added: ${participant.id} to session ${sessionId}`);
}
```

#### 3.2 removeParticipant

```typescript
async removeParticipant(sessionId: string, participantId: string): Promise<void> {
	const session = this._sessions.get(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	const index = session.participants.findIndex(p => p.id === participantId);
	if (index === -1) {
		throw new Error(`Participant ${participantId} not found in session`);
	}

	session.participants.splice(index, 1);
	session.lastActiveAt = Date.now();
	this._sessions.set(sessionId, session);

	this._onDidRemoveParticipant.fire({ sessionId, participantId });
	this._persistSessions();

	this.logService.info(`[SessionBroker] Participant removed: ${participantId} from session ${sessionId}`);
}
```

#### 3.3 getParticipants

```typescript
getParticipants(sessionId: string): ParticipantDescriptor[] {
	const session = this._sessions.get(sessionId);
	return session ? session.participants : [];
}
```

### 4. Invocation 关联实现

#### 4.1 associateInvocation

```typescript
async associateInvocation(sessionId: string, invocationId: string): Promise<void> {
	const session = this._sessions.get(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	if (!session.invocations.includes(invocationId)) {
		session.invocations.push(invocationId);
		session.lastActiveAt = Date.now();
		this._sessions.set(sessionId, session);
		this._persistSessions();
	}
}
```

#### 4.2 getSessionInvocations

```typescript
getSessionInvocations(sessionId: string): string[] {
	const session = this._sessions.get(sessionId);
	return session ? session.invocations : [];
}
```

### 5. Session 状态管理

#### 5.1 updateSessionStatus

```typescript
async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
	const session = this._sessions.get(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	session.status = status;
	session.lastActiveAt = Date.now();
	this._sessions.set(sessionId, session);

	this._onDidUpdateSessionStatus.fire({ sessionId, status });
	this._persistSessions();

	this.logService.info(`[SessionBroker] Session status updated: ${sessionId} -> ${status}`);
}
```

#### 5.2 Active Session 管理

```typescript
getActiveSession(): SessionDescriptor | undefined {
	return this._activeSessionId ? this._sessions.get(this._activeSessionId) : undefined;
}

async setActiveSession(sessionId: string): Promise<void> {
	const session = this._sessions.get(sessionId);
	if (!session) {
		throw new Error(`Session ${sessionId} not found`);
	}

	this._activeSessionId = sessionId;
	session.lastActiveAt = Date.now();
	this._sessions.set(sessionId, session);
	this._persistSessions();

	this.logService.info(`[SessionBroker] Active session set: ${sessionId}`);
}
```

### 6. 持久化实现

```typescript
private _loadSessions(): void {
	const stored = this.storageService.get('aiInterop.sessions', StorageScope.WORKSPACE);
	if (stored) {
		try {
			const data = JSON.parse(stored);
			for (const session of data.sessions || []) {
				this._sessions.set(session.id, session);
			}
			this._activeSessionId = data.activeSessionId;
			this.logService.info(`[SessionBroker] Loaded ${this._sessions.size} sessions from storage`);
		} catch (error) {
			this.logService.error('[SessionBroker] Failed to load sessions', error);
		}
	}
}

private _persistSessions(): void {
	const data = {
		sessions: Array.from(this._sessions.values()),
		activeSessionId: this._activeSessionId
	};
	this.storageService.store('aiInterop.sessions', JSON.stringify(data), StorageScope.WORKSPACE, StorageTarget.MACHINE);
}
```

## 不需要实现的部分

- 不需要实现 UI(由 TASK-P1-008/009 实现)
- 不需要实现完整的会话恢复机制(Phase 2 完善)
- 不需要实现跨窗口会话同步(Phase 2 完善)
- 不需要实现会话历史记录(Phase 2 完善)

## 自验证清单

- [ ] TypeScript 编译通过
- [ ] Service 类继承 `Disposable`
- [ ] Service 类实现 `IAISessionBrokerService` 接口
- [ ] 所有方法都已实现
- [ ] 使用 `Emitter<T>` 实现所有事件
- [ ] Session 可以创建、查询、删除
- [ ] Participant 可以添加、移除、查询
- [ ] Invocation 可以关联到 Session
- [ ] Session 状态可以更新
- [ ] Active Session 可以设置和查询
- [ ] Session 数据持久化到 StorageService
- [ ] 启动时自动加载已保存的 Session

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在本文档"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收(引用验收任务编号 TEST-P1-004)

## 实施记录

**开发 AI**：AI-Dev-001
**完成时间**：2026-03-30

**实现要点**：
- 完整实现了 IAISessionBrokerService 接口的所有方法
- 使用 generateUuid() 生成唯一的 session ID
- 实现了完整的错误处理和验证逻辑（检查 session 是否存在、participant 是否重复等）
- 实现了持久化功能，使用 IStorageService 将 session 数据保存到 WORKSPACE 作用域
- 在启动时自动从 StorageService 加载已保存的 sessions
- getAllSessions() 按 lastActiveAt 降序排序，最近活跃的 session 排在前面
- 所有状态变更操作都会更新 lastActiveAt 时间戳
- 所有操作都通过 ILogService 记录日志
- 使用 Emitter<T> 实现所有事件通知
- Service 类正确继承 Disposable 并注册所有 emitters

**遇到的问题**：
- 无重大问题。实现过程顺利，TypeScript 编译通过
