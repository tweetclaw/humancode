/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';

/**
 * 测试：向 Claude Code 发送消息 - 简化版本
 *
 * 只测试最核心的功能：type 命令直接输入文本
 */
export async function testSendToClaudeCodeSimple(
	commandService: ICommandService,
	clipboardService: IClipboardService,
	logService: ILogService
): Promise<void> {
	const testMessage = 'Hello Claude!';

	logService.info('[TestSimple] ========================================');
	logService.info('[TestSimple] Starting SIMPLE test...');
	logService.info('[TestSimple] ========================================');

	try {
		// 1. 打开 Claude Code
		logService.info('[TestSimple] Step 1: Opening Claude Code...');
		await commandService.executeCommand('claude-vscode.editor.open');
		await delay(1000);
		logService.info('[TestSimple] ✓ Claude Code opened');

		// 2. 聚焦输入框
		logService.info('[TestSimple] Step 2: Focusing input...');
		await commandService.executeCommand('claude-vscode.focus');
		await delay(500);
		logService.info('[TestSimple] ✓ Input focused');

		// 3. 直接输入文本（使用 type 命令）
		logService.info('[TestSimple] Step 3: Typing text...');
		await commandService.executeCommand('type', { text: testMessage });
		await delay(500);
		logService.info('[TestSimple] ✓ Text typed: ' + testMessage);

		// 4. 发送消息（按回车）
		logService.info('[TestSimple] Step 4: Sending message (Enter)...');
		await commandService.executeCommand('type', { text: '\n' });
		logService.info('[TestSimple] ✓ Enter key sent');

		logService.info('[TestSimple] ========================================');
		logService.info('[TestSimple] Test completed!');
		logService.info('[TestSimple] Check Claude Code for the message');
		logService.info('[TestSimple] ========================================');

	} catch (error) {
		logService.error('[TestSimple] Test failed:', error);
		throw error;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
