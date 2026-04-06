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
import { IWebviewService } from '../../webview/browser/webview.js';

/**
 * Test command to send a message to Claude Code using the new executeScript API
 *
 * This command uses the newly implemented executeScript method to automatically
 * click the send button in Claude Code's webview.
 */
class TestSendToClaudeCodeExecuteScriptAction extends Action2 {
	constructor() {
		super({
			id: 'claudeCodeBridge.testSendMessageExecuteScript',
			title: localize2('claudeCodeBridge.testSendMessageExecuteScript', 'Test: Send "你好" to Claude Code (executeScript API)'),
			category: localize2('claudeCodeBridge.category', 'Claude Code Bridge'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const logService = accessor.get(ILogService);
		const commandService = accessor.get(ICommandService);
		const clipboardService = accessor.get(IClipboardService);
		const webviewService = accessor.get(IWebviewService);

		const testMessage = '你好';

		logService.info('[TestExecuteScript] ========================================');
		logService.info('[TestExecuteScript] Command triggered');
		logService.info('[TestExecuteScript] ========================================');

		try {
			// Step 1: Copy message to clipboard
			logService.info('[TestExecuteScript] Step 1: Copying message to clipboard...');
			await clipboardService.writeText(testMessage);
			logService.info('[TestExecuteScript] ✓ Copied: ' + testMessage);

			// Step 2: Open Claude Code
			logService.info('[TestExecuteScript] Step 2: Opening Claude Code...');
			await commandService.executeCommand('claude-vscode.editor.open');
			await this.delay(1000);
			logService.info('[TestExecuteScript] ✓ Claude Code opened');

			// Step 3: Focus input
			logService.info('[TestExecuteScript] Step 3: Focusing input...');
			await commandService.executeCommand('claude-vscode.focus');
			await this.delay(500);
			logService.info('[TestExecuteScript] ✓ Input focused');

			// Step 4: Paste
			logService.info('[TestExecuteScript] Step 4: Pasting message...');
			await commandService.executeCommand('editor.action.clipboardPasteAction');
			await this.delay(500);
			logService.info('[TestExecuteScript] ✓ Message pasted');

			// Step 5: Use executeScript API to click send button
			logService.info('[TestExecuteScript] Step 5: Using executeScript API to click send button...');
			try {
				const activeWebview = webviewService.activeWebview;
				if (activeWebview) {
					logService.info('[TestExecuteScript] ✓ Found active webview');
					logService.info('[TestExecuteScript] Webview type: ' + (activeWebview.providedViewType || 'unknown'));

					// Execute script to find and click the send button
					const script = `
						(function() {
							console.log('[Claude Code Bridge] Script execution started');
							console.log('[Claude Code Bridge] Document ready state:', document.readyState);
							console.log('[Claude Code Bridge] Searching for send button...');

							// Try multiple selectors to find the send button
							const selectors = [
								'button[type="submit"]',
								'button[aria-label*="Send"]',
								'button[aria-label*="send"]',
								'button.send-button',
								'button[data-testid*="send"]',
								'button:has(svg):not([disabled])'
							];

							let sendButton = null;
							for (const selector of selectors) {
								sendButton = document.querySelector(selector);
								if (sendButton) {
									console.log('[Claude Code Bridge] Found send button with selector: ' + selector);
									break;
								}
							}

							if (sendButton) {
								console.log('[Claude Code Bridge] Clicking send button...');
								sendButton.click();
								console.log('[Claude Code Bridge] ✓ Send button clicked!');
								return true;
							} else {
								console.log('[Claude Code Bridge] ⚠ Send button not found');
								const allButtons = document.querySelectorAll('button');
								console.log('[Claude Code Bridge] Total buttons found:', allButtons.length);
								console.log('[Claude Code Bridge] Button details:', Array.from(allButtons).map(b => ({
									type: b.type,
									ariaLabel: b.getAttribute('aria-label'),
									className: b.className,
									disabled: b.disabled
								})));
								return false;
							}
						})();
					`;

					logService.info('[TestExecuteScript] Calling executeScript...');
					const success = await activeWebview.executeScript(script);
					logService.info('[TestExecuteScript] executeScript returned: ' + success);

					if (success) {
						logService.info('[TestExecuteScript] ✓ executeScript API call succeeded');
					} else {
						logService.warn('[TestExecuteScript] ⚠ executeScript API call failed');
					}
				} else {
					logService.warn('[TestExecuteScript] ⚠ No active webview found');
				}
			} catch (e) {
				logService.error('[TestExecuteScript] Error using executeScript API:', e);
			}

			logService.info('[TestExecuteScript] ========================================');
			logService.info('[TestExecuteScript] Test completed!');
			logService.info('[TestExecuteScript] Check if message was sent automatically');
			logService.info('[TestExecuteScript] ========================================');
		} catch (error) {
			logService.error('[TestExecuteScript] Error:', error);
			throw error;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

registerAction2(TestSendToClaudeCodeExecuteScriptAction);
