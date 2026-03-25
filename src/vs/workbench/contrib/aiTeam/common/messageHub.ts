/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

export const IMessageHubService = createDecorator<IMessageHubService>('messageHubService');

/**
 * 消息方向
 */
export enum MessageDirection {
	/** 用户发送给 AI */
	UserToAI = 'user-to-ai',
	/** AI 发送给用户 */
	AIToUser = 'ai-to-user'
}

/**
 * 消息记录
 */
export interface IMessageRecord {
	/** 唯一标识 */
	readonly id: string;
	/** 发送者会话 ID（用户消息时为 'user'） */
	readonly fromSessionId: string;
	/** 接收者会话 ID */
	readonly toSessionId: string;
	/** 消息内容 */
	readonly content: string;
	/** 消息方向 */
	readonly direction: MessageDirection;
	/** 时间戳 */
	readonly timestamp: number;
	/** 是否可转发 */
	readonly canForward: boolean;
}

/**
 * 消息过滤选项
 */
export interface IMessageFilterOptions {
	/** 按会话 ID 过滤 */
	sessionId?: string;
	/** 按关键词过滤 */
	keyword?: string;
	/** 按时间范围过滤 */
	timeRange?: { start: number; end: number };
	/** 按消息方向过滤 */
	direction?: MessageDirection;
}

/**
 * 消息转发请求
 */
export interface IMessageForwardRequest {
	/** 要转发的消息 ID */
	readonly messageId: string;
	/** 目标会话 ID */
	readonly targetSessionId: string;
}

/**
 * 消息汇总与转发服务
 *
 * 负责汇总所有 AI 角色的消息，并支持消息转发
 */
export interface IMessageHubService {
	readonly _serviceBrand: undefined;

	/**
	 * 获取所有消息记录
	 * @param options 可选的过滤选项
	 * @returns 消息记录列表
	 */
	getAllMessages(options?: IMessageFilterOptions): IMessageRecord[];

	/**
	 * 添加消息记录
	 * @param message 消息记录（不含 id，由服务生成）
	 * @returns 生成的消息 ID
	 */
	addMessage(message: Omit<IMessageRecord, 'id'>): string;

	/**
	 * 转发消息
	 * @param request 转发请求
	 * @returns 是否成功
	 */
	forwardMessage(request: IMessageForwardRequest): Promise<boolean>;

	/**
	 * 清空所有消息
	 */
	clearAllMessages(): void;

	/**
	 * 事件：新消息添加
	 */
	readonly onDidAddMessage: Event<IMessageRecord>;

	/**
	 * 事件：消息转发
	 */
	readonly onDidForwardMessage: Event<{ originalMessage: IMessageRecord; targetSessionId: string }>;
}
