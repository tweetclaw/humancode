/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { testSendToClaudeCodeDirectMessage } from './testClaudeCodeDirectMessage.js';

/**
 * 测试命令：直接向 Claude Code 发送消息
 */
class TestSendToClaudeCodeDirectMessageAction extends Action2 {
	constructor() {
		super({
			id: 'aiInterop.testSendToClaudeCodeDirectMessage',
			title: localize2('aiInterop.testSendToClaudeCodeDirectMessage', 'Test: Send to Claude Code (Direct API)'),
			category: localize2('aiInterop.category', 'AI Interop'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const commandService = accessor.get(ICommandService);
		const editorService = accessor.get(IEditorService);
		const logService = accessor.get(ILogService);

		await testSendToClaudeCodeDirectMessage(
			commandService,
			editorService,
			logService
		);
	}
}

registerAction2(TestSendToClaudeCodeDirectMessageAction);
