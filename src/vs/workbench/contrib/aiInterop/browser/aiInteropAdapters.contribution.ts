/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IWorkbenchContribution, WorkbenchPhase, registerWorkbenchContribution2 } from '../../../common/contributions.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ClaudeCodeCommandAdapter } from '../../../services/aiInterop/browser/adapters/claudeCodeCommandAdapter.js';

/**
 * AI Interop Adapters Contribution
 *
 * 负责在 Workbench 启动时初始化所有零侵入式适配器
 * 这些适配器将现有 AI 扩展包装为 AI Interop Endpoints
 */
class AIInteropAdaptersContribution extends Disposable implements IWorkbenchContribution {

	static readonly ID = 'workbench.contrib.aiInteropAdapters';

	constructor(
		@IInstantiationService private readonly instantiationService: IInstantiationService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.initializeAdapters();
	}

	private async initializeAdapters(): Promise<void> {
		this.logService.info('[AIInteropAdapters] Initializing adapters...');

		try {
			// 初始化 Claude Code Command Adapter
			this._register(
				this.instantiationService.createInstance(ClaudeCodeCommandAdapter)
			);
			this.logService.info('[AIInteropAdapters] Claude Code adapter initialized');

			// TODO: 初始化其他适配器
			// - MCP Adapter (TASK-P1-014)
			// - Chat Participant Adapter (TASK-P1-012)
			// - Language Model Adapter (TASK-P1-013)

		} catch (error) {
			this.logService.error('[AIInteropAdapters] Failed to initialize adapters', error);
		}
	}
}

// 注册到 Workbench
// 使用 BlockRestore phase 确保在扩展加载之前初始化
registerWorkbenchContribution2(
	AIInteropAdaptersContribution.ID,
	AIInteropAdaptersContribution,
	WorkbenchPhase.BlockRestore
);
