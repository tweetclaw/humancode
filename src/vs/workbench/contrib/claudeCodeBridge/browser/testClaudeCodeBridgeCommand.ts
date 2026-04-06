/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../../nls.js';
import { Action2, registerAction2 } from '../../../../platform/actions/common/actions.js';
import { ServicesAccessor } from '../../../../platform/instantiation/common/instantiation.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';

/**
 * Test command to send a message to Claude Code
 *
 * This command directly calls Claude Code commands from Main Thread
 * without using the RPC Bridge (simplified approach)
 */
class TestSendToClaudeCodeAction extends Action2 {
	constructor() {
		super({
			id: 'claudeCodeBridge.testSendMessage',
			title: localize2('claudeCodeBridge.testSendMessage', 'Test: Send "你好" to Claude Code'),
			category: localize2('claudeCodeBridge.category', 'Claude Code Bridge'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const logService = accessor.get(ILogService);
		const commandService = accessor.get(ICommandService);
		const clipboardService = accessor.get(IClipboardService);

		const testMessage = '你好';

		logService.info('[TestSendToClaudeCode] ========================================');
		logService.info('[TestSendToClaudeCode] Command triggered');
		logService.info('[TestSendToClaudeCode] ========================================');

		try {
			// Step 1: Copy message to clipboard
			logService.info('[TestSendToClaudeCode] Step 1: Copying message to clipboard...');
			await clipboardService.writeText(testMessage);
			logService.info('[TestSendToClaudeCode] ✓ Copied: ' + testMessage);

			// Step 2: Open Claude Code
			logService.info('[TestSendToClaudeCode] Step 2: Opening Claude Code...');
			await commandService.executeCommand('claude-vscode.editor.open');
			await this.delay(1000);
			logService.info('[TestSendToClaudeCode] ✓ Claude Code opened');

			// Step 3: Focus input
			logService.info('[TestSendToClaudeCode] Step 3: Focusing input...');
			await commandService.executeCommand('claude-vscode.focus');
			await this.delay(500);
			logService.info('[TestSendToClaudeCode] ✓ Input focused');

			// Step 4: Paste
			logService.info('[TestSendToClaudeCode] Step 4: Pasting message...');
			await commandService.executeCommand('editor.action.clipboardPasteAction');
			await this.delay(500);
			logService.info('[TestSendToClaudeCode] ✓ Message pasted');

			// Step 5: Try to send (this may not work automatically)
			logService.info('[TestSendToClaudeCode] Step 5: Attempting to send...');
			try {
				await commandService.executeCommand('type', { text: '\n' });
				logService.info('[TestSendToClaudeCode] ✓ Enter key sent');
			} catch (e) {
				logService.warn('[TestSendToClaudeCode] ⚠ Could not auto-send, user needs to press Enter');
			}

			logService.info('[TestSendToClaudeCode] ========================================');
			logService.info('[TestSendToClaudeCode] Test completed!');
			logService.info('[TestSendToClaudeCode] If message not sent, please press Enter manually');
			logService.info('[TestSendToClaudeCode] ========================================');
		} catch (error) {
			logService.error('[TestSendToClaudeCode] Error:', error);
			throw error;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

registerAction2(TestSendToClaudeCodeAction);
