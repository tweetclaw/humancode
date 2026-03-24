/*---------------------------------------------------------------------------------------------
 * HumanCode — AI Session Manager Service Implementation
 *
 * 本文件实现 IAISessionManagerService 接口，负责管理多个虚拟 AI 角色会话的生命周期。
 *
 * 核心功能：
 *   - 会话生命周期管理（创建、删除、查询）
 *   - 活跃会话管理（设置、清除当前活跃会话）
 *   - 消息管理（追加消息、获取格式化上下文）
 *   - 状态管理（更新会话状态）
 *   - 消息中继（在不同 AI 角色间转发消息）
 *
 * 创建日期: 2026-03-23
 * 对应文档: docs/phases/phase1.md
 * 接口契约: src/vs/workbench/services/aiSessionManager/common/aiSessionManager.ts
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import {
	IAISessionManagerService,
	ISessionConfig,
	ISessionContext,
	IMessage,
	IRelayRequest,
	SessionStatus,
	ISessionMetadata
} from '../common/aiSessionManager.js';

/**
 * 用于持久化存储的精简会话上下文接口
 * 不包含 conversationHistory，以减少存储大小
 */
interface ISerializableSessionContext {
	sessionId: string;
	name: string;
	role: string;
	extensionId: string;
	systemPrompt: string;
	avatarColor?: string;
	skillTags?: string[];
	metadata: ISessionMetadata;
}

export class AISessionManagerService extends Disposable implements IAISessionManagerService {

	declare readonly _serviceBrand: undefined;

	// ── 内部状态 ──────────────────────────────────────────────
	private readonly _sessions: Map<string, ISessionContext>;
	private _activeSessionId: string | null;

	// ── 事件发射器 ────────────────────────────────────────────
	private readonly _onDidSessionsChange = this._register(new Emitter<void>());
	public readonly onDidSessionsChange: Event<void> = this._onDidSessionsChange.event;

	private readonly _onDidMessageAppend = this._register(new Emitter<{ sessionId: string; message: IMessage }>());
	public readonly onDidMessageAppend: Event<{ sessionId: string; message: IMessage }> = this._onDidMessageAppend.event;

	private readonly _onDidSessionStatusChange = this._register(new Emitter<{ sessionId: string; status: SessionStatus }>());
	public readonly onDidSessionStatusChange: Event<{ sessionId: string; status: SessionStatus }> = this._onDidSessionStatusChange.event;

	private readonly _onDidRelayMessage = this._register(new Emitter<{ request: IRelayRequest; prompt: string }>());
	public readonly onDidRelayMessage: Event<{ request: IRelayRequest; prompt: string }> = this._onDidRelayMessage.event;

	// ── 持久化存储 ────────────────────────────────────────────
	private static readonly STORAGE_KEY = 'aiSessionManager.sessions';

	constructor(
		@IStorageService private readonly _storageService: IStorageService
	) {
		super();
		this._sessions = new Map();
		this._activeSessionId = null;

		// 从存储中加载已保存的会话
		this._loadSessions();
	}

	// ── 会话生命周期 ──────────────────────────────────────────

	createSession(config: ISessionConfig): string {
		const sessionId = this.generateSessionId();
		const now = Date.now();

		const metadata: ISessionMetadata = {
			status: 'idle',
			createdAt: now,
			lastActiveAt: now,
			messageCount: 0
		};

		const session: ISessionContext = {
			sessionId,
			name: config.name,
			role: config.role,
			extensionId: config.extensionId,
			systemPrompt: config.systemPrompt,
			conversationHistory: [],
			avatarColor: config.avatarColor,
			skillTags: config.skillTags,
			metadata
		};

		this._sessions.set(sessionId, session);
		this._onDidSessionsChange.fire();

		// 持久化保存
		this._saveSessions();

		return sessionId;
	}

	getSession(sessionId: string): ISessionContext | undefined {
		return this._sessions.get(sessionId);
	}

	deleteSession(sessionId: string): void {
		const session = this._sessions.get(sessionId);
		if (!session) {
			return;
		}

		this._sessions.delete(sessionId);

		// 若删除的是当前活跃会话，自动清除活跃状态
		if (this._activeSessionId === sessionId) {
			this.clearActiveSession();
		}

		this._onDidSessionsChange.fire();

		// 持久化保存
		this._saveSessions();
	}

	getAllSessions(): ISessionContext[] {
		const sessions = Array.from(this._sessions.values());
		// 按创建时间升序排列
		return sessions.sort((a, b) => a.metadata.createdAt - b.metadata.createdAt);
	}

	// ── 活跃会话管理 ──────────────────────────────────────────

	getActiveSessionId(): string | null {
		console.log('[AISessionManagerService] getActiveSessionId called, returning:', this._activeSessionId);
		return this._activeSessionId;
	}

	setActiveSession(sessionId: string): void {
		console.log('[AISessionManagerService] setActiveSession called with sessionId:', sessionId);
		console.log('[AISessionManagerService] Current activeSessionId before change:', this._activeSessionId);

		const session = this._sessions.get(sessionId);
		if (!session) {
			console.error('[AISessionManagerService] Session not found:', sessionId);
			return;
		}
		this._activeSessionId = sessionId;
		console.log('[AISessionManagerService] activeSessionId updated to:', this._activeSessionId);
	}

	clearActiveSession(): void {
		this._activeSessionId = null;
	}

	// ── 消息管理 ──────────────────────────────────────────────

	appendMessage(sessionId: string, message: Omit<IMessage, 'id' | 'timestamp'>): void {
		const session = this._sessions.get(sessionId);
		if (!session) {
			return;
		}

		const fullMessage: IMessage = {
			id: this.generateMessageId(),
			timestamp: Date.now(),
			...message
		};

		// 由于 conversationHistory 是 readonly，我们需要创建新数组
		const updatedHistory = [...session.conversationHistory, fullMessage];
		const updatedSession: ISessionContext = {
			...session,
			conversationHistory: updatedHistory,
			metadata: {
				...session.metadata,
				lastActiveAt: fullMessage.timestamp,
				messageCount: session.metadata.messageCount + 1
			}
		};

		this._sessions.set(sessionId, updatedSession);
		this._onDidMessageAppend.fire({ sessionId, message: fullMessage });
	}

	getSessionContext(sessionId: string, maxMessages: number = 20): string {
		const session = this._sessions.get(sessionId);
		if (!session) {
			return '';
		}

		// 第一段：系统提示词
		let context = `# 角色设定\n${session.systemPrompt}\n\n`;

		// 第二段：历史对话（最多取 maxMessages 条，从最新的往前取）
		const history = session.conversationHistory;
		if (history.length > 0) {
			context += '# 历史对话\n';

			const messagesToInclude = history.slice(-maxMessages);
			for (const msg of messagesToInclude) {
				const label = msg.direction === 'user' ? '[用户]' : '[AI]';
				context += `${label}: ${msg.content}\n`;
			}
		}

		return context;
	}

	// ── 状态管理 ──────────────────────────────────────────────

	updateSessionStatus(sessionId: string, status: SessionStatus): void {
		const session = this._sessions.get(sessionId);
		if (!session) {
			return;
		}

		const updatedSession: ISessionContext = {
			...session,
			metadata: {
				...session.metadata,
				status
			}
		};

		this._sessions.set(sessionId, updatedSession);
		this._onDidSessionStatusChange.fire({ sessionId, status });
	}

	// ── 消息中继 ──────────────────────────────────────────────

	relayMessage(request: IRelayRequest): void {
		const fromSession = this._sessions.get(request.fromSessionId);
		const toSession = this._sessions.get(request.toSessionId);

		if (!fromSession || !toSession) {
			return;
		}

		// 找到 fromSession 的最后一条 assistant 消息
		const lastAssistantMessage = [...fromSession.conversationHistory]
			.reverse()
			.find(msg => msg.direction === 'assistant');

		if (!lastAssistantMessage) {
			return;
		}

		// 构造中继 prompt
		let prompt: string;

		if (request.customInstruction) {
			// 若提供了自定义指令，使用自定义指令
			prompt = `${request.customInstruction}\n\n${lastAssistantMessage.content}`;
		} else {
			// 根据 relayType 构造默认 prompt
			let prefix: string;
			switch (request.relayType) {
				case 'review':
					prefix = '请对以下代码/内容进行测试与审查：';
					break;
				case 'handoff':
					prefix = '前一位同事已完成以下工作，请继续：';
					break;
				case 'feedback':
					prefix = '已收到如下反馈，请根据反馈修改：';
					break;
			}
			prompt = `${prefix}\n\n${lastAssistantMessage.content}`;
		}

		// 将目标会话设为活跃会话
		this.setActiveSession(request.toSessionId);

		// 触发中继事件
		this._onDidRelayMessage.fire({ request, prompt });
	}

	// ── 私有辅助方法 ──────────────────────────────────────────

	private generateSessionId(): string {
		return `session_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	// ── 持久化方法 ────────────────────────────────────────────

	/**
	 * 从存储中加载已保存的会话
	 * 在构造函数中调用，恢复上次保存的会话状态
	 */
	private _loadSessions(): void {
		try {
			const stored = this._storageService.get(
				AISessionManagerService.STORAGE_KEY,
				StorageScope.WORKSPACE
			);

			if (stored) {
				const sessions: ISerializableSessionContext[] = JSON.parse(stored);
				sessions.forEach(session => {
					// 恢复会话，但历史消息为空（不持久化历史消息）
					const fullSession: ISessionContext = {
						...session,
						conversationHistory: []
					};
					this._sessions.set(session.sessionId, fullSession);
				});
			}
		} catch (error) {
			// 加载失败不阻塞服务启动，仅记录错误
			console.error('[AISessionManagerService] Failed to load sessions:', error);
		}
	}

	/**
	 * 将当前会话列表保存到存储
	 * 只保存会话配置，不保存历史消息
	 */
	private _saveSessions(): void {
		try {
			const sessions: ISerializableSessionContext[] = Array.from(this._sessions.values()).map(session => ({
				sessionId: session.sessionId,
				name: session.name,
				role: session.role,
				extensionId: session.extensionId,
				systemPrompt: session.systemPrompt,
				avatarColor: session.avatarColor,
				skillTags: session.skillTags,
				metadata: session.metadata
			}));

			this._storageService.store(
				AISessionManagerService.STORAGE_KEY,
				JSON.stringify(sessions),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);
		} catch (error) {
			// 保存失败不影响内存中的会话状态，仅记录错误
			console.error('[AISessionManagerService] Failed to save sessions:', error);
		}
	}
}

// ── 自验证清单（实现完成后手动逐项确认）────────────────────────
// [x] createSession 返回唯一 sessionId
// [x] 两次 createSession 创建的会话互相独立
// [x] appendMessage 后 messageCount 正确递增
// [x] getSessionContext 输出包含系统提示词 + 历史消息
// [x] getSessionContext maxMessages 参数有效
// [x] updateSessionStatus 触发 onDidSessionStatusChange 事件
// [x] relayMessage 触发 onDidRelayMessage，prompt 格式正确
// [x] deleteSession 活跃会话时 getActiveSessionId 变为 null
