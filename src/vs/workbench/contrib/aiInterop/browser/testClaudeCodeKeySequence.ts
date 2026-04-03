/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';

/**
 * 测试：向 Claude Code 发送消息 - 使用按键序列
 *
 * 尝试使用 workbench.action.acceptSelectedSuggestion 或其他方式来触发发送
 */
export async function testSendToClaudeCodeKeySequence(
	commandService: ICommandService,
	clipboardService: IClipboardService,
	logService: ILogService
): Promise<void> {
	const testMessage = 'Hello Claude from key sequence!';

	logService.info('[TestKeySeq] ========================================');
	logService.info('[TestKeySeq] Starting key sequence test...');
	logService.info('[TestKeySeq] ========================================');

	try {
		// 1. 复制消息到剪贴板
		logService.info('[TestKeySeq] Step 1: Copying to clipboard...');
		await clipboardService.writeText(testMessage);
		logService.info('[TestKeySeq] ✓ Copied: ' + testMessage);

		// 2. 打开 Claude Code
		logService.info('[TestKeySeq] Step 2: Opening Claude Code...');
		await commandService.executeCommand('claude-vscode.editor.open');
		await delay(1000);
		logService.info('[TestKeySeq] ✓ Claude Code opened');

		// 3. 聚焦输入框
		logService.info('[TestKeySeq] Step 3: Focusing input...');
		await commandService.executeCommand('claude-vscode.focus');
		await delay(500);
		logService.info('[TestKeySeq] ✓ Input focused');

		// 4. 粘贴（Cmd+V）
		logService.info('[TestKeySeq] Step 4: Pasting (Cmd+V)...');
		await commandService.executeCommand('editor.action.clipboardPasteAction');
		await delay(500);
		logService.info('[TestKeySeq] ✓ Paste command sent');

		// 5. 尝试多种方式发送回车
		logService.info('[TestKeySeq] Step 5: Trying multiple Enter methods...');

		// 方法 A: type 命令
		logService.info('[TestKeySeq]   Method A: type command');
		await commandService.executeCommand('type', { text: '\n' });
		await delay(300);

		// 方法 B: lineBreakInsert
		logService.info('[TestKeySeq]   Method B: lineBreakInsert');
		await commandService.executeCommand('lineBreakInsert');
		await delay(300);

		// 方法 C: acceptSelectedSuggestion (可能触发提交)
		logService.info('[TestKeySeq]   Method C: acceptSelectedSuggestion');
		try {
			await commandService.executeCommand('acceptSelectedSuggestion');
		} catch (e) {
			logService.info('[TestKeySeq]   (acceptSelectedSuggestion not available)');
		}

		logService.info('[TestKeySeq] ========================================');
		logService.info('[TestKeySeq] Test completed!');
		logService.info('[TestKeySeq] Check Claude Code for the message');
		logService.info('[TestKeySeq] ========================================');

	} catch (error) {
		logService.error('[TestKeySeq] Test failed:', error);
		throw error;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
