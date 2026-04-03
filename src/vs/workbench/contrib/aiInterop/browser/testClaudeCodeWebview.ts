/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IClipboardService } from '../../../../platform/clipboard/common/clipboardService.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';
import { IWebviewService } from '../../webview/browser/webview.js';

/**
 * 测试：直接向 Claude Code Webview 发送消息
 */
export async function testSendToClaudeCodeWebview(
	commandService: ICommandService,
	clipboardService: IClipboardService,
	logService: ILogService,
	editorService: IEditorService,
	webviewService: IWebviewService
): Promise<void> {
	const testMessage = 'Hello from HumanCode IDE!';

	logService.info('[TestClaudeCodeWebview] Starting Webview test...');

	try {
		// 1. 打开 Claude Code
		await commandService.executeCommand('claude-vscode.editor.open');
		logService.info('[TestClaudeCodeWebview] ✓ Claude Code opened');
		await delay(1000);

		// 2. 尝试获取所有 Webview
		const webviews = (webviewService as any).webviews || (webviewService as any)._webviews;
		logService.info(`[TestClaudeCodeWebview] Found ${webviews ? webviews.size : 0} webviews`);

		if (webviews) {
			// 遍历所有 webview，找到 Claude Code 的
			for (const [id, webview] of webviews) {
				logService.info(`[TestClaudeCodeWebview] Webview ID: ${id}`);

				// 尝试向这个 webview 发送消息
				try {
					await webview.postMessage({
						type: 'humancode-test',
						text: testMessage,
						timestamp: Date.now()
					});
					logService.info(`[TestClaudeCodeWebview] ✓ Sent message to webview ${id}`);
				} catch (e) {
					logService.warn(`[TestClaudeCodeWebview] Failed to send to webview ${id}:`, e);
				}
			}
		}

		// 3. 尝试通过 editor service 获取活动编辑器
		const activeEditor = editorService.activeEditorPane;
		logService.info(`[TestClaudeCodeWebview] Active editor: ${activeEditor?.getId()}`);

		if (activeEditor) {
			// 检查是否是 webview editor
			const webviewEditor = (activeEditor as any).webview;
			if (webviewEditor) {
				logService.info('[TestClaudeCodeWebview] Found webview in active editor');
				try {
					await webviewEditor.postMessage({
						type: 'humancode-test',
						text: testMessage,
						timestamp: Date.now()
					});
					logService.info('[TestClaudeCodeWebview] ✓ Sent message via active editor webview');
				} catch (e) {
					logService.warn('[TestClaudeCodeWebview] Failed to send via active editor:', e);
				}
			}
		}

		logService.info('[TestClaudeCodeWebview] ========================================');
		logService.info('[TestClaudeCodeWebview] Webview test completed!');
		logService.info('[TestClaudeCodeWebview] Check Claude Code for the message');
		logService.info('[TestClaudeCodeWebview] ========================================');

	} catch (error) {
		logService.error('[TestClaudeCodeWebview] Test failed:', error);
		throw error;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
