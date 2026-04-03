/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';

/**
 * 测试：模拟键盘事件来触发发送
 *
 * 尝试通过模拟真实的键盘事件（Enter 键）来触发 Claude Code 的发送功能
 */
export async function testSendToClaudeCodeKeyboardEvent(
	commandService: ICommandService,
	clipboardService: IClipboardService,
	logService: ILogService
): Promise<void> {
	const testMessage = 'Hello Claude via keyboard event!';

	logService.info('[TestKeyboard] ========================================');
	logService.info('[TestKeyboard] Starting keyboard event test...');
	logService.info('[TestKeyboard] ========================================');

	try {
		// 1. 复制消息到剪贴板
		logService.info('[TestKeyboard] Step 1: Copying to clipboard...');
		await clipboardService.writeText(testMessage);
		logService.info('[TestKeyboard] ✓ Copied: ' + testMessage);

		// 2. 打开 Claude Code
		logService.info('[TestKeyboard] Step 2: Opening Claude Code...');
		await commandService.executeCommand('claude-vscode.editor.open');
		await delay(1000);
		logService.info('[TestKeyboard] ✓ Claude Code opened');

		// 3. 聚焦输入框
		logService.info('[TestKeyboard] Step 3: Focusing input...');
		await commandService.executeCommand('claude-vscode.focus');
		await delay(500);
		logService.info('[TestKeyboard] ✓ Input focused');

		// 4. 粘贴
		logService.info('[TestKeyboard] Step 4: Pasting...');
		await commandService.executeCommand('editor.action.clipboardPasteAction');
		await delay(500);
		logService.info('[TestKeyboard] ✓ Pasted');

		// 5. 尝试多种键盘快捷键来触发发送
		logService.info('[TestKeyboard] Step 5: Trying keyboard shortcuts...');

		// 方法 A: Cmd+Enter (常见的发送快捷键)
		logService.info('[TestKeyboard]   Method A: Cmd+Enter');
		await commandService.executeCommand('workbench.action.terminal.sendSequence', {
			text: '\u001b[13;5~' // Cmd+Enter
		});
		await delay(500);

		// 方法 B: Enter
		logService.info('[TestKeyboard]   Method B: Enter');
		await commandService.executeCommand('workbench.action.terminal.sendSequence', {
			text: '\r' // Enter
		});
		await delay(500);

		// 方法 C: 尝试直接触发 acceptSelectedSuggestion
		logService.info('[TestKeyboard]   Method C: acceptSelectedSuggestion');
		try {
			await commandService.executeCommand('acceptSelectedSuggestion');
		} catch (e) {
			logService.info('[TestKeyboard]   (not available)');
		}

		logService.info('[TestKeyboard] ========================================');
		logService.info('[TestKeyboard] Test completed!');
		logService.info('[TestKeyboard] Check Claude Code for the message');
		logService.info('[TestKeyboard] ========================================');

	} catch (error) {
		logService.error('[TestKeyboard] Test failed:', error);
		throw error;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
