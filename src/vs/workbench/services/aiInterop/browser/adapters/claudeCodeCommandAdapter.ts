/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../../base/common/lifecycle.js';
import { ILogService } from '../../../../../platform/log/common/log.js';
import { ICommandService } from '../../../../../platform/commands/common/commands.js';
import { IAIInteropBusService, EndpointDescriptor } from '../../common/aiInterop.js';

/**
 * Claude Code Command Adapter
 *
 * 零侵入式适配器，将 Claude Code 扩展包装为 AI Interop Endpoint
 *
 * 工作原理：
 * 1. 通过命令打开 Claude Code UI
 * 2. 通过剪贴板传递输入内容
 * 3. 用户在 Claude Code 中查看和确认结果
 *
 * 限制：
 * - 当前版本需要用户手动粘贴输入
 * - 无法自动获取 Claude Code 的输出
 * - 适合作为 PoC 验证，后续可增强
 */
export class ClaudeCodeCommandAdapter extends Disposable {

	private static readonly CLAUDE_CODE_EXTENSION_ID = 'anthropic.claude-code';
	private static readonly ENDPOINT_ID = 'claude-code.command-adapter';

	constructor(
		@IAIInteropBusService private readonly aiInteropBus: IAIInteropBusService,
		@ICommandService private readonly commandService: ICommandService,
		@ILogService private readonly logService: ILogService
	) {
		super();
		this.initialize();
	}

	private async initialize(): Promise<void> {
		// 检查 Claude Code 扩展是否已安装
		const isInstalled = await this.isClaudeCodeInstalled();
		if (!isInstalled) {
			this.logService.warn('[ClaudeCodeAdapter] Claude Code extension not installed');
			return;
		}

		// 注册为 AI Interop Endpoint
		this.registerEndpoint();
		this.logService.info('[ClaudeCodeAdapter] Initialized successfully');
	}

	private async isClaudeCodeInstalled(): Promise<boolean> {
		try {
			// 尝试执行 Claude Code 命令来检测是否已安装
			const commands = await this.commandService.executeCommand<string[]>('vscode.getCommands');
			return commands ? commands.some((cmd: string) => cmd.startsWith('claude-vscode.')) : false;
		} catch (error) {
			return false;
		}
	}

	private registerEndpoint(): void {
		const endpoint: EndpointDescriptor = {
			id: ClaudeCodeCommandAdapter.ENDPOINT_ID,
			extensionId: ClaudeCodeCommandAdapter.CLAUDE_CODE_EXTENSION_ID,
			displayName: 'Claude Code (Command Adapter)',
			description: 'Claude Code AI assistant via command adapter',
			capabilities: [
				{ type: 'streaming' },
				{ type: 'tool' }
			],
			hostKind: 'local',
			remoteAuthority: undefined
		};

		this.aiInteropBus.registerEndpoint(endpoint);

		this.logService.info(`[ClaudeCodeAdapter] Registered endpoint: ${endpoint.id}`);
	}

	// TODO: Implement invocation handler when AI Interop Bus supports it
	// The current registerEndpoint() only registers the endpoint descriptor
	// but doesn't provide a way to handle actual invocations.
	// This will be implemented in a future phase when the Bus API is extended.

	override dispose(): void {
		// 注销 endpoint
		// TODO: AI Interop Bus 需要提供 unregisterEndpoint 方法
		super.dispose();
	}
}
