/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { testSendToClaudeCodeKeySequence } from './testClaudeCodeKeySequence.js';

/**
 * 测试命令：向 Claude Code 发送消息 - 按键序列版
 */
class TestSendToClaudeCodeKeySequenceAction extends Action2 {
	constructor() {
		super({
			id: 'aiInterop.testSendToClaudeCodeKeySequence',
			title: localize2('aiInterop.testSendToClaudeCodeKeySequence', 'Test: Send to Claude Code (Key Sequence)'),
			category: localize2('aiInterop.category', 'AI Interop'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		const clipboardService = accessor.get(IClipboardService);
		const logService = accessor.get(ILogService);

		await testSendToClaudeCodeKeySequence(
			commandService,
			clipboardService,
			logService
		);
	}
}

registerAction2(TestSendToClaudeCodeKeySequenceAction);
