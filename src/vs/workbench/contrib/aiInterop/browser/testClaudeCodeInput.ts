/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';

/**
 * 测试：向 Claude Code 发送消息
 *
 * 这是一个简单的测试函数，尝试多种方式向 Claude Code 发送消息
 */
export async function testSendToClaudeCode(
	commandService: ICommandService,
	clipboardService: IClipboardService,
	logService: ILogService,
	editorService: IEditorService
): Promise<void> {
	const testMessage = 'Hello from HumanCode IDE! This is a test message.';

	logService.info('[TestClaudeCode] Starting test...');

	try {
		// 方法 1: 使用剪贴板 + 命令
		logService.info('[TestClaudeCode] Method 1: Clipboard + Commands');

		// 1.1 复制消息到剪贴板
		await clipboardService.writeText(testMessage);
		logService.info('[TestClaudeCode] ✓ Message copied to clipboard');

		// 1.2 打开 Claude Code
		await commandService.executeCommand('claude-vscode.editor.open');
		logService.info('[TestClaudeCode] ✓ Claude Code opened');

		// 等待 UI 初始化
		await delay(1000);

		// 1.3 聚焦输入框
		await commandService.executeCommand('claude-vscode.focus');
		logService.info('[TestClaudeCode] ✓ Input focused');

		// 等待聚焦完成
		await delay(500);

		// 1.4 尝试多种方式发送文本
		logService.info('[TestClaudeCode] Trying multiple methods to send text...');

		// 方法 A: 使用 type 命令直接输入文本
		try {
			await commandService.executeCommand('type', { text: testMessage });
			logService.info('[TestClaudeCode] ✓ Method A: Typed text directly');
			await delay(500);
		} catch (e) {
			logService.warn('[TestClaudeCode] Method A failed:', e);
		}

		// 方法 B: 尝试粘贴
		try {
			await commandService.executeCommand('editor.action.clipboardPasteAction');
			logService.info('[TestClaudeCode] ✓ Method B: Paste action');
			await delay(500);
		} catch (e) {
			logService.warn('[TestClaudeCode] Method B failed:', e);
		}

		// 方法 C: 尝试 default:paste
		try {
			await commandService.executeCommand('default:paste');
			logService.info('[TestClaudeCode] ✓ Method C: Default paste');
			await delay(500);
		} catch (e) {
			logService.warn('[TestClaudeCode] Method C failed:', e);
		}

		// 方法 D: 尝试 replacePreviousChar (模拟输入)
		try {
			await commandService.executeCommand('replacePreviousChar', { text: testMessage, replaceCharCnt: 0 });
			logService.info('[TestClaudeCode] ✓ Method D: Replace previous char');
			await delay(500);
		} catch (e) {
			logService.warn('[TestClaudeCode] Method D failed:', e);
		}

		// 1.5 尝试发送消息（模拟回车）
		try {
			await commandService.executeCommand('type', { text: '\n' });
			logService.info('[TestClaudeCode] ✓ Attempted to send (Enter key)');
		} catch (e) {
			logService.warn('[TestClaudeCode] Enter key simulation failed:', e);
		}

		logService.info('[TestClaudeCode] ========================================');
		logService.info('[TestClaudeCode] Test completed!');
		logService.info('[TestClaudeCode] Message: ' + testMessage);
		logService.info('[TestClaudeCode] ========================================');
		logService.info('[TestClaudeCode] Please check:');
		logService.info('[TestClaudeCode] 1. Is Claude Code window open?');
		logService.info('[TestClaudeCode] 2. Is the input focused?');
		logService.info('[TestClaudeCode] 3. Is the message pasted?');
		logService.info('[TestClaudeCode] 4. If not auto-pasted, press Cmd+V manually');
		logService.info('[TestClaudeCode] ========================================');

	} catch (error) {
		logService.error('[TestClaudeCode] Test failed:', error);
		throw error;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
