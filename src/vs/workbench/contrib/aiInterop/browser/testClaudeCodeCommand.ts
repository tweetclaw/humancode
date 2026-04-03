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
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { testSendToClaudeCode } from './testClaudeCodeInput.js';

/**
 * 测试命令：向 Claude Code 发送消息
 */
class TestSendToClaudeCodeAction extends Action2 {
	constructor() {
		super({
			id: 'aiInterop.testSendToClaudeCode',
			title: localize2('aiInterop.testSendToClaudeCode', 'Test: Send Message to Claude Code'),
			category: localize2('aiInterop.category', 'AI Interop'),
			f1: true // 在命令面板中显示
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		const clipboardService = accessor.get(IClipboardService);
		const logService = accessor.get(ILogService);
		const editorService = accessor.get(IEditorService);

		await testSendToClaudeCode(
			commandService,
			clipboardService,
			logService,
			editorService
		);
	}
}

// 注册命令
registerAction2(TestSendToClaudeCodeAction);
