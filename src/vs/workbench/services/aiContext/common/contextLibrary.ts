/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

export const IContextLibraryService = createDecorator<IContextLibraryService>('contextLibraryService');

/**
 * 上下文条目
 */
export interface IContextEntry {
	/** 唯一标识 */
	readonly id: string;
	/** 上下文类型 */
	readonly type: 'tech-stack' | 'architecture' | 'feature' | 'decision' | 'custom';
	/** 标题 */
	readonly title: string;
	/** 内容 */
	readonly content: string;
	/** 创建时间戳 */
	readonly timestamp: number;
	/** 标签（用于检索） */
	readonly tags: string[];
}

/**
 * Token 预算配置
 */
export interface ITokenBudget {
	/** 系统提示词预算 */
	systemPrompt: number;
	/** 历史消息预算 */
	conversationHistory: number;
	/** 全局上下文预算 */
	globalContext: number;
	/** 总预算 */
	total: number;
}

/**
 * 全局上下文库服务
 *
 * 负责管理跨会话共享的项目记忆
 */
export interface IContextLibraryService {
	readonly _serviceBrand: undefined;

	/**
	 * 添加上下文条目
	 */
	addContext(entry: Omit<IContextEntry, 'id' | 'timestamp'>): string;

	/**
	 * 获取所有上下文条目
	 */
	getAllContext(): IContextEntry[];

	/**
	 * 根据标签检索上下文
	 */
	retrieveContext(tags: string[]): IContextEntry[];

	/**
	 * 删除上下文条目
	 */
	removeContext(id: string): void;

	/**
	 * 清空所有上下文
	 */
	clearAll(): void;

	/**
	 * 获取 Token 预算配置
	 */
	getTokenBudget(): ITokenBudget;

	/**
	 * 设置 Token 预算配置
	 */
	setTokenBudget(budget: ITokenBudget): void;
}
