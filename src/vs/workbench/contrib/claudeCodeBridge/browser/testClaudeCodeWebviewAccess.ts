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
import { getActiveWindow } from '../../../../base/browser/dom.js';

/**
 * Test command to send a message to Claude Code by accessing webview through IWebviewService
 *
 * This command attempts to:
 * 1. Get the active webview through IWebviewService
 * 2. Access the underlying iframe element
 * 3. Execute JavaScript to click the send button
 */
class TestSendToClaudeCodeWebviewAccessAction extends Action2 {
	constructor() {
		super({
			id: 'claudeCodeBridge.testSendMessageWebviewAccess',
			title: localize2('claudeCodeBridge.testSendMessageWebviewAccess', 'Test: Send "你好" to Claude Code (Webview Access)'),
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

		logService.info('[TestWebviewAccess] ========================================');
		logService.info('[TestWebviewAccess] Command triggered');
		logService.info('[TestWebviewAccess] ========================================');

		try {
			// Step 1: Copy message to clipboard
			logService.info('[TestWebviewAccess] Step 1: Copying message to clipboard...');
			await clipboardService.writeText(testMessage);
			logService.info('[TestWebviewAccess] ✓ Copied: ' + testMessage);

			// Step 2: Open Claude Code
			logService.info('[TestWebviewAccess] Step 2: Opening Claude Code...');
			await commandService.executeCommand('claude-vscode.editor.open');
			await this.delay(1000);
			logService.info('[TestWebviewAccess] ✓ Claude Code opened');

			// Step 3: Focus input
			logService.info('[TestWebviewAccess] Step 3: Focusing input...');
			await commandService.executeCommand('claude-vscode.focus');
			await this.delay(500);
			logService.info('[TestWebviewAccess] ✓ Input focused');

			// Step 4: Paste
			logService.info('[TestWebviewAccess] Step 4: Pasting message...');
			await commandService.executeCommand('editor.action.clipboardPasteAction');
			await this.delay(500);
			logService.info('[TestWebviewAccess] ✓ Message pasted');

			// Step 5: Try to access webview through IWebviewService
			logService.info('[TestWebviewAccess] Step 5: Attempting to access webview...');
			try {
				const activeWebview = webviewService.activeWebview;
				if (activeWebview) {
					logService.info('[TestWebviewAccess] ✓ Found active webview');

					// Try to access the underlying element
					// Note: This is a hack and may not work due to TypeScript access modifiers
					const webviewElement = (activeWebview as any).element;
					if (webviewElement && webviewElement instanceof HTMLIFrameElement) {
						logService.info('[TestWebviewAccess] ✓ Got iframe element: ' + webviewElement.name);

						// Try to access contentWindow
						try {
							if (webviewElement.contentWindow) {
								logService.info('[TestWebviewAccess] ✓ Can access contentWindow');

								// Try to send a message to execute JavaScript
								webviewElement.contentWindow.postMessage({
									type: 'vscode-execute-script',
									script: `
										console.log('[Claude Code Bridge] Attempting to find and click send button');
										const sendButton = document.querySelector('button[type="submit"]') ||
										                   document.querySelector('button[aria-label*="Send"]') ||
										                   document.querySelector('button[aria-label*="send"]') ||
										                   document.querySelector('button.send-button');
										if (sendButton) {
											sendButton.click();
											console.log('[Claude Code Bridge] Send button clicked');
										} else {
											console.log('[Claude Code Bridge] Send button not found');
											console.log('[Claude Code Bridge] Available buttons:', document.querySelectorAll('button'));
										}
									`
								}, '*');

								logService.info('[TestWebviewAccess] ✓ Sent execute script message');
							} else {
								logService.warn('[TestWebviewAccess] ⚠ Cannot access contentWindow');
							}
						} catch (e) {
							logService.error('[TestWebviewAccess] Error accessing contentWindow:', e);
						}
					} else {
						logService.warn('[TestWebviewAccess] ⚠ Could not access iframe element');
					}

					// Alternative: Try to use postMessage API
					logService.info('[TestWebviewAccess] Step 6: Trying postMessage API...');
					try {
						await activeWebview.postMessage({
							type: 'execute-script',
							script: `
								const sendButton = document.querySelector('button[type="submit"]');
								if (sendButton) sendButton.click();
							`
						});
						logService.info('[TestWebviewAccess] ✓ Sent message via postMessage API');
					} catch (e) {
						logService.warn('[TestWebviewAccess] ⚠ postMessage API failed:', e);
					}
				} else {
					logService.warn('[TestWebviewAccess] ⚠ No active webview found');

					// Try to enumerate all webviews
					const webviews = Array.from(webviewService.webviews);
					logService.info('[TestWebviewAccess] Found ' + webviews.length + ' webviews');
					for (let i = 0; i < webviews.length; i++) {
						const webview = webviews[i];
						logService.info('[TestWebviewAccess] Webview ' + i + ': ' + (webview.providedViewType || 'unknown'));
					}
				}

				// Fallback: Try to access iframes directly from DOM
				logService.info('[TestWebviewAccess] Step 7: Fallback - accessing iframes from DOM...');
				const activeWindow = getActiveWindow();
				const iframes = activeWindow.document.querySelectorAll('iframe.webview');
				logService.info('[TestWebviewAccess] Found ' + iframes.length + ' webview iframes in DOM');

				for (let i = 0; i < iframes.length; i++) {
					const iframe = iframes[i] as HTMLIFrameElement;
					logService.info('[TestWebviewAccess] Iframe ' + i + ': name=' + iframe.name + ', src=' + iframe.src);
				}
			} catch (e) {
				logService.error('[TestWebviewAccess] Error accessing webview:', e);
			}

			logService.info('[TestWebviewAccess] ========================================');
			logService.info('[TestWebviewAccess] Test completed!');
			logService.info('[TestWebviewAccess] If message not sent, press Enter manually');
			logService.info('[TestWebviewAccess] ========================================');
		} catch (error) {
			logService.error('[TestWebviewAccess] Error:', error);
			throw error;
		}
	}

	private delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}

registerAction2(TestSendToClaudeCodeWebviewAccessAction);
