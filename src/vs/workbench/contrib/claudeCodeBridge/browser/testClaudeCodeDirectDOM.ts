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
import { getActiveWindow } from '../../../../base/browser/dom.js';

/**
 * Test command to send a message to Claude Code by directly accessing iframe
 *
 * This command uses direct DOM access to the Webview iframe to execute JavaScript
 * and trigger the send button click.
 */
class TestSendToClaudeCodeDirectDOMAction extends Action2 {
	constructor() {
		super({
			id: 'claudeCodeBridge.testSendMessageDirectDOM',
			title: localize2('claudeCodeBridge.testSendMessageDirectDOM', 'Test: Send "你好" to Claude Code (Direct DOM)'),
			category: localize2('claudeCodeBridge.category', 'Claude Code Bridge'),
			f1: true
		});
	}

	async run(accessor: ServicesAccessor): Promise<void> {
		const logService = accessor.get(ILogService);
		const commandService = accessor.get(ICommandService);
		const clipboardService = accessor.get(IClipboardService);

		const testMessage = '你好';

		logService.info('[TestDirectDOM] ========================================');
		logService.info('[TestDirectDOM] Command triggered');
		logService.info('[TestDirectDOM] ========================================');

		try {
			// Step 1: Copy message to clipboard
			logService.info('[TestDirectDOM] Step 1: Copying message to clipboard...');
			await clipboardService.writeText(testMessage);
			logService.info('[TestDirectDOM] ✓ Copied: ' + testMessage);

			// Step 2: Open Claude Code
			logService.info('[TestDirectDOM] Step 2: Opening Claude Code...');
			await commandService.executeCommand('claude-vscode.editor.open');
			await this.delay(1000);
			logService.info('[TestDirectDOM] ✓ Claude Code opened');

			// Step 3: Focus input
			logService.info('[TestDirectDOM] Step 3: Focusing input...');
			await commandService.executeCommand('claude-vscode.focus');
			await this.delay(500);
			logService.info('[TestDirectDOM] ✓ Input focused');

			// Step 4: Paste
			logService.info('[TestDirectDOM] Step 4: Pasting message...');
			await commandService.executeCommand('editor.action.clipboardPasteAction');
			await this.delay(500);
			logService.info('[TestDirectDOM] ✓ Message pasted');

			// Step 5: Try to access iframe and execute JavaScript
			logService.info('[TestDirectDOM] Step 5: Attempting to access iframe...');
			try {
				const activeWindow = getActiveWindow();
				const iframes = activeWindow.document.querySelectorAll('iframe.webview');
				logService.info('[TestDirectDOM] Found ' + iframes.length + ' webview iframes');

				if (iframes.length > 0) {
					// Try to find Claude Code's iframe
					for (let i = 0; i < iframes.length; i++) {
						const iframe = iframes[i] as HTMLIFrameElement;
						logService.info('[TestDirectDOM] Checking iframe ' + i + ': ' + iframe.name);

						try {
							// Try to access contentWindow
							if (iframe.contentWindow) {
								logService.info('[TestDirectDOM] ✓ Can access contentWindow for iframe ' + i);

								// Try to execute JavaScript to click send button
								// Note: This may fail due to cross-origin restrictions
								iframe.contentWindow.postMessage({
									type: 'executeScript',
									script: `
										// Try to find and click the send button
										const sendButton = document.querySelector('button[type="submit"]') ||
										                   document.querySelector('button[aria-label*="Send"]') ||
										                   document.querySelector('button[aria-label*="send"]');
										if (sendButton) {
											sendButton.click();
											console.log('[Claude Code Bridge] Send button clicked');
										} else {
											console.log('[Claude Code Bridge] Send button not found');
										}
									`
								}, '*');

								logService.info('[TestDirectDOM] ✓ Sent executeScript message to iframe ' + i);
							} else {
								logService.warn('[TestDirectDOM] ⚠ Cannot access contentWindow for iframe ' + i);
							}
						} catch (e) {
							logService.warn('[TestDirectDOM] ⚠ Error accessing iframe ' + i + ': ' + e);
						}
					}
				} else {
					logService.warn('[TestDirectDOM] ⚠ No webview iframes found');
				}
			} catch (e) {
				logService.error('[TestDirectDOM] Error accessing iframes:', e);
			}

			logService.info('[TestDirectDOM] ========================================');
			logService.info('[TestDirectDOM] Test completed!');
			logService.info('[TestDirectDOM] If message not sent, press Enter manually');
			logService.info('[TestDirectDOM] ========================================');
		} catch (error) {
			logService.error('[TestDirectDOM] Error:', error);
			throw error;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

registerAction2(TestSendToClaudeCodeDirectDOMAction);
