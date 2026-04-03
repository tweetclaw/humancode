/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { ICommandService } from '../../../../platform/commands/common/commands.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IEditorService } from '../../../services/editor/common/editorService.js';

/**
 * 测试：直接向 Claude Code Webview 发送消息
 *
 * 尝试通过 Webview API 直接发送消息，绕过输入框
 */
export async function testSendToClaudeCodeDirectMessage(
	commandService: ICommandService,
	editorService: IEditorService,
	logService: ILogService
): Promise<void> {
	const testMessage = 'Hello Claude via direct API!';

	logService.info('[TestDirectMsg] ========================================');
	logService.info('[TestDirectMsg] Starting direct message test...');
	logService.info('[TestDirectMsg] ========================================');

	try {
		// 1. 打开 Claude Code
		logService.info('[TestDirectMsg] Step 1: Opening Claude Code...');
		await commandService.executeCommand('claude-vscode.editor.open');
		await delay(1000);
		logService.info('[TestDirectMsg] ✓ Claude Code opened');

		// 2. 获取当前活动的编辑器
		logService.info('[TestDirectMsg] Step 2: Getting active editor...');
		const activeEditor = editorService.activeEditorPane;
		logService.info('[TestDirectMsg] Active editor:', activeEditor?.getId());

		// 3. 尝试查找 Webview
		logService.info('[TestDirectMsg] Step 3: Looking for Webview...');
		const editorInput = activeEditor?.input;
		logService.info('[TestDirectMsg] Editor input type:', editorInput?.constructor.name);

		// 4. 尝试通过反射访问 Webview
		if (editorInput && 'webview' in editorInput) {
			const webview = (editorInput as any).webview;
			logService.info('[TestDirectMsg] ✓ Found webview:', webview);

			// 5. 尝试多种消息格式
			logService.info('[TestDirectMsg] Step 5: Trying multiple message formats...');
			if (webview && 'postMessage' in webview) {
				// 格式 1: submit_prompt
				logService.info('[TestDirectMsg]   Format 1: submit_prompt');
				await webview.postMessage({
					type: 'submit_prompt',
					text: testMessage
				});
				await delay(500);

				// 格式 2: askResponse (模拟用户输入)
				logService.info('[TestDirectMsg]   Format 2: askResponse');
				await webview.postMessage({
					type: 'askResponse',
					askResponse: testMessage,
					text: testMessage
				});
				await delay(500);

				// 格式 3: webviewDidReceiveMessage
				logService.info('[TestDirectMsg]   Format 3: webviewDidReceiveMessage');
				await webview.postMessage({
					type: 'webviewDidReceiveMessage',
					message: testMessage
				});
				await delay(500);

				// 格式 4: 直接发送文本
				logService.info('[TestDirectMsg]   Format 4: direct text');
				await webview.postMessage(testMessage);

				logService.info('[TestDirectMsg] ✓ All message formats sent');
			} else {
				logService.warn('[TestDirectMsg] Webview does not have postMessage method');
			}
		} else {
			logService.warn('[TestDirectMsg] Could not find webview in editor input');
		}

		logService.info('[TestDirectMsg] ========================================');
		logService.info('[TestDirectMsg] Test completed!');
		logService.info('[TestDirectMsg] Check Claude Code for the message');
		logService.info('[TestDirectMsg] ========================================');

	} catch (error) {
		logService.error('[TestDirectMsg] Test failed:', error);
		throw error;
	}
}

function delay(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
