/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWebviewService } from '../../webview/browser/webview.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { testSendToClaudeCodeWebview } from './testClaudeCodeWebview.js';

/**
 * 测试命令：直接向 Claude Code Webview 发送消息
 */
class TestSendToClaudeCodeWebviewAction extends Action2 {
	constructor() {
		super({
			id: 'aiInterop.testSendToClaudeCodeWebview',
			title: localize2('aiInterop.testSendToClaudeCodeWebview', 'Test: Send to Claude Code Webview'),
			category: localize2('aiInterop.category', 'AI Interop'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		const clipboardService = accessor.get(IClipboardService);
		const logService = accessor.get(ILogService);
		const editorService = accessor.get(IEditorService);
		const webviewService = accessor.get(IWebviewService);

		await testSendToClaudeCodeWebview(
			commandService,
			clipboardService,
			logService,
			editorService,
			webviewService
		);
	}
}

registerAction2(TestSendToClaudeCodeWebviewAction);
