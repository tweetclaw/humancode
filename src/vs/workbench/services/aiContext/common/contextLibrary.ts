/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';
import { Event } from '../../../../base/common/event.js';

export const IContextLibraryService = createDecorator<IContextLibraryService>('contextLibraryService');

/**
 * 上下文条目：单条上下文记录
 */
export interface IContextEntry {
	/** 唯一标识 */
	readonly id: string;
	/** 上下文类型 */
	readonly type: ContextEntryType;
	/** 内容摘要 */
	readonly summary: string;
	/** 完整内容 */
	readonly content: string;
	/** 来源会话ID（可选） */
	readonly sourceSessionId?: string;
	/** 创建时间戳 */
	readonly timestamp: number;
	/** 重要性评分（1-5，5最重要） */
	readonly importance: number;
	/** 标签（用于分类和检索） */
	readonly tags: string[];
	/** Token 数量估算 */
	readonly tokenCount?: number;
}

/**
 * 上下文条目类型
 */
export enum ContextEntryType {
	/** 技术栈决策（如：使用 React、TypeScript） */
	TechStack = 'tech-stack',
	/** 架构决策（如：采用微服务架构） */
	Architecture = 'architecture',
	/** 已实现功能 */
	Feature = 'feature',
	/** 代码约定（如：命名规范、代码风格） */
	Convention = 'convention',
	/** 项目目标 */
	Goal = 'goal',
	/** 问题和解决方案 */
	Solution = 'solution',
	/** 其他 */
	Other = 'other'
}

/**
 * 项目级上下文：跨会话共享的项目记忆
 */
export interface IProjectContext {
	/** 项目名称 */
	readonly projectName?: string;
	/** 项目描述 */
	readonly projectDescription?: string;
	/** 上下文条目列表 */
	readonly entries: IContextEntry[];
	/** 总 Token 数量 */
	readonly totalTokens: number;
	/** 最后更新时间戳 */
	readonly lastUpdated: number;
}

/**
 * 上下文检索选项
 */
export interface IContextRetrievalOptions {
	/** 最大返回条目数 */
	maxEntries?: number;
	/** 按类型过滤 */
	types?: ContextEntryType[];
	/** 按标签过滤 */
	tags?: string[];
	/** 最小重要性评分 */
	minImportance?: number;
	/** 按时间范围过滤（时间戳） */
	timeRange?: { start: number; end: number };
	/** 排序方式 */
	sortBy?: 'timestamp' | 'importance' | 'relevance';
}

/**
 * Token 预算配置
 */
export interface ITokenBudget {
	/** 最大 Token 数量 */
	readonly maxTokens: number;
	/** 警告阈值（百分比，如 0.8 表示 80%） */
	readonly warningThreshold: number;
	/** 当前使用的 Token 数量 */
	currentTokens?: number;
}

/**
 * 全局上下文库服务
 *
 * 负责跨会话共享项目记忆，解决"文脉遗忘"问题
 */
export interface IContextLibraryService {
	readonly _serviceBrand: undefined;

	/**
	 * 添加上下文条目
	 * @param entry 上下文条目（不含 id，由服务生成）
	 * @returns 生成的条目ID
	 */
	addContext(entry: Omit<IContextEntry, 'id'>): Promise<string>;

	/**
	 * 更新上下文条目
	 * @param entryId 条目ID
	 * @param updates 要更新的字段
	 */
	updateContext(entryId: string, updates: Partial<Omit<IContextEntry, 'id' | 'timestamp'>>): Promise<void>;

	/**
	 * 删除上下文条目
	 * @param entryId 条目ID
	 */
	deleteContext(entryId: string): Promise<void>;

	/**
	 * 获取项目上下文
	 * @param sessionId 可选的会话ID（如果提供，会包含该会话的特定上下文）
	 * @returns 项目上下文
	 */
	getContext(sessionId?: string): Promise<IProjectContext>;

	/**
	 * 检索相关上下文
	 * @param query 查询字符串或选项
	 * @returns 匹配的上下文条目列表
	 */
	retrieveContext(query: string | IContextRetrievalOptions): Promise<IContextEntry[]>;

	/**
	 * 修剪上下文（删除不重要的条目以控制 Token 数量）
	 * @param maxTokens 最大 Token 数量
	 * @returns 删除的条目数量
	 */
	pruneContext(maxTokens: number): Promise<number>;

	/**
	 * 自动提炼上下文（从会话历史中提取关键信息）
	 * @param sessionId 会话ID
	 * @returns 提炼出的上下文条目列表
	 */
	extractContextFromSession(sessionId: string): Promise<IContextEntry[]>;

	/**
	 * 获取 Token 预算状态
	 * @returns Token 预算配置
	 */
	getTokenBudget(): ITokenBudget;

	/**
	 * 设置 Token 预算
	 * @param budget Token 预算配置
	 */
	setTokenBudget(budget: Partial<ITokenBudget>): Promise<void>;

	/**
	 * 导出上下文（用于备份或迁移）
	 * @returns JSON 格式的上下文数据
	 */
	exportContext(): Promise<string>;

	/**
	 * 导入上下文（从备份恢复）
	 * @param data JSON 格式的上下文数据
	 */
	importContext(data: string): Promise<void>;

	/**
	 * 清空所有上下文
	 */
	clearAllContext(): Promise<void>;

	/**
	 * 事件：上下文条目添加
	 */
	readonly onDidAddContext: Event<IContextEntry>;

	/**
	 * 事件：上下文条目更新
	 */
	readonly onDidUpdateContext: Event<IContextEntry>;

	/**
	 * 事件：上下文条目删除
	 */
	readonly onDidDeleteContext: Event<string>;

	/**
	 * 事件：Token 预算警告（超过阈值时触发）
	 */
	readonly onDidTokenBudgetWarning: Event<ITokenBudget>;
}
