/*---------------------------------------------------------------------------------------------
 * HumanCode — AI Session Manager Service
 * 接口契约文件 (Interface Contract)
 *
 * 本文件是 Phase 1 并行开发的"分工协议"：
 *   - Task A: Service 实现方  依赖此接口实现 aiSessionManagerService.ts
 *   - Task B: UI 开发方      依赖此接口实现 MockAISessionManagerService + aiTeamPanel.ts
 *   - Task C: Logger 增强方  依赖此接口调用 getActiveSessionId / getSessionContext
 *
 * ⚠️  接口一旦确定，并行开发期间不得随意修改。
 *     如需变更，必须通知所有并行任务方协同调整。
 *
 * 创建日期: 2026-03-23
 * 对应文档: docs/phases/phase1.md
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ─────────────────────────────────────────────────────────────
// 枚举与联合类型
// ─────────────────────────────────────────────────────────────

/** AI 角色当前的工作状态 */
export type SessionStatus = 'idle' | 'working' | 'waiting' | 'error';

/**
 * 消息中继类型，表明从 A 发到 B 的意图
 * - review:   A 的输出请 B 审查/测试
 * - handoff:  A 完成，任务整体移交给 B
 * - feedback: B 对 A 的结果有反馈，回传给 A
 */
export type RelayType = 'review' | 'handoff' | 'feedback';

/** 消息方向：用户 → AI 或 AI → 用户 */
export type MessageDirection = 'user' | 'assistant';

// ─────────────────────────────────────────────────────────────
// 核心数据结构
// ─────────────────────────────────────────────────────────────

/** 单条对话消息 */
export interface IMessage {
	/** 消息唯一 ID */
	readonly id: string;
	/** 消息方向 */
	readonly direction: MessageDirection;
	/** 消息正文内容 */
	readonly content: string;
	/** 创建时间戳（ms） */
	readonly timestamp: number;
	/** 可选：关联的 RPC 请求 ID，用于追踪到原始通信 */
	readonly rpcRequestId?: number;
}

/** 创建新会话所需的配置 */
export interface ISessionConfig {
	/** 显示名称，如 "前端小李" */
	name: string;
	/** 职能角色描述，如 "前端开发" */
	role: string;
	/**
	 * 目标 AI 扩展 ID，如 "github.copilot" / "alibaba-cloud.tongyi-lingma"
	 * 同一个扩展可以被多个不同会话使用（虚拟多实例的核心）
	 */
	extensionId: string;
	/** 系统提示词，定义该角色的专业方向与行为准则 */
	systemPrompt: string;
	/** 可选：角色头像颜色（用于 UI 区分），如 "#4FC3F7" */
	avatarColor?: string;
	/** 可选：能力标签，如 ["React", "CSS", "Tailwind"] */
	skillTags?: string[];
}

/** 完整的会话上下文（运行时数据） */
export interface ISessionContext {
	/** 会话唯一 ID，由 createSession 生成 */
	readonly sessionId: string;
	/** 显示名称 */
	readonly name: string;
	/** 职能角色 */
	readonly role: string;
	/** 绑定的扩展 ID */
	readonly extensionId: string;
	/** 系统提示词 */
	readonly systemPrompt: string;
	/** 完整对话历史（按时间升序） */
	readonly conversationHistory: readonly IMessage[];
	/** 可选配置项 */
	readonly avatarColor?: string;
	readonly skillTags?: string[];
	/** 元数据 */
	readonly metadata: ISessionMetadata;
}

/** 会话元数据 */
export interface ISessionMetadata {
	/** 当前工作状态 */
	status: SessionStatus;
	/** 创建时间戳 */
	readonly createdAt: number;
	/** 最后活跃时间戳 */
	lastActiveAt: number;
	/** 消息总数 */
	messageCount: number;
}

/** 消息中继请求 */
export interface IRelayRequest {
	fromSessionId: string;
	toSessionId: string;
	relayType: RelayType;
	/**
	 * 可选：覆盖默认的中继指令。
	 * 若不提供，系统根据 relayType 自动生成默认指令。
	 */
	customInstruction?: string;
}

// ─────────────────────────────────────────────────────────────
// 服务接口
// ─────────────────────────────────────────────────────────────

export const IAISessionManagerService = createDecorator<IAISessionManagerService>('aiSessionManagerService');

export interface IAISessionManagerService {

	readonly _serviceBrand: undefined;

	// ── 会话生命周期 ───────────────────────────────────────────

	/**
	 * 创建新的虚拟 AI 会话（角色）。
	 * @returns 新会话的唯一 sessionId
	 */
	createSession(config: ISessionConfig): string;

	/**
	 * 根据 ID 获取会话上下文，若不存在则返回 undefined。
	 */
	getSession(sessionId: string): ISessionContext | undefined;

	/**
	 * 删除指定会话及其全部历史记录。
	 * 若被删除的会话是当前活跃会话，则自动清除活跃状态。
	 */
	deleteSession(sessionId: string): void;

	/**
	 * 返回所有现存会话的列表（按创建时间升序）。
	 */
	getAllSessions(): ISessionContext[];

	// ── 活跃会话管理 ───────────────────────────────────────────

	/**
	 * 获取当前活跃会话的 ID。
	 * 活跃会话是当前 HumanCodeRPCLogger 注入上下文的目标。
	 * @returns sessionId 字符串，若无活跃会话则返回 null
	 */
	getActiveSessionId(): string | null;

	/**
	 * 将指定会话设为活跃会话。
	 * 后续所有 RPC 消息的上下文注入都将基于该会话。
	 */
	setActiveSession(sessionId: string): void;

	/**
	 * 清除活跃会话（不删除会话本身，仅取消激活状态）。
	 */
	clearActiveSession(): void;

	// ── 消息管理 ──────────────────────────────────────────────

	/**
	 * 向指定会话追加一条消息（用户发出或 AI 响应）。
	 * 会自动更新 metadata.lastActiveAt 和 messageCount。
	 */
	appendMessage(sessionId: string, message: Omit<IMessage, 'id' | 'timestamp'>): void;

	/**
	 * 获取指定会话格式化后的上下文字符串，供注入到 RPC 消息。
	 * 格式：系统提示词 + 最近 N 条历史消息（受 Token 预算限制）。
	 * @param sessionId 目标会话 ID
	 * @param maxMessages 最多包含的历史消息条数，默认 20
	 */
	getSessionContext(sessionId: string, maxMessages?: number): string;

	// ── 状态管理 ──────────────────────────────────────────────

	/**
	 * 更新指定会话的工作状态。
	 * 触发 onDidSessionStatusChange 事件，UI 据此刷新状态指示灯。
	 */
	updateSessionStatus(sessionId: string, status: SessionStatus): void;

	// ── 消息中继 ──────────────────────────────────────────────

	/**
	 * 将会话 A 的最后一条 assistant 消息，作为新任务发送给会话 B。
	 * 内部步骤：
	 *   1. 取 fromSession 的最后一条 assistant 消息
	 *   2. 根据 relayType 和 customInstruction 构造中继 prompt
	 *   3. 调用 setActiveSession(toSessionId)
	 *   4. 触发 onDidRelayMessage，由 Logger / Panel 监听并执行实际发送
	 */
	relayMessage(request: IRelayRequest): void;

	// ── 事件 ──────────────────────────────────────────────────

	/** 当会话列表发生变化（创建/删除）时触发 */
	readonly onDidSessionsChange: Event<void>;

	/** 当某个会话追加了新消息时触发 */
	readonly onDidMessageAppend: Event<{ sessionId: string; message: IMessage }>;

	/** 当某个会话的状态发生变化时触发 */
	readonly onDidSessionStatusChange: Event<{ sessionId: string; status: SessionStatus }>;

	/**
	 * 当中继请求被发起时触发。
	 * HumanCodeRPCLogger 和 AI Team Panel 监听此事件执行实际的消息发送。
	 */
	readonly onDidRelayMessage: Event<{ request: IRelayRequest; prompt: string }>;

	/**
	 * 当活跃会话发生变化时触发。
	 * AI Team Panel 监听此事件更新选中状态。
	 */
	readonly onDidActiveSessionChange: Event<string | null>;
}
