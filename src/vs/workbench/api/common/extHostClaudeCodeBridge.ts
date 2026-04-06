/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { IExtHostRpcService } from './extHostRpcService.js';
import { ExtHostClaudeCodeBridgeShape } from './extHost.protocol.js';
import { IExtHostExtensionService } from './extHostExtensionService.js';
import { ILogService } from '../../../platform/log/common/log.js';
import type * as vscode from 'vscode';

/**
 * Extension Host implementation of Claude Code Bridge
 *
 * This service runs in the Extension Host process and provides a bridge
 * to interact with the Claude Code extension.
 */
export class ExtHostClaudeCodeBridge implements ExtHostClaudeCodeBridgeShape {

	constructor(
		extHostRpc: IExtHostRpcService,
		private readonly _extensionService: IExtHostExtensionService,
		private readonly _logService: ILogService
	) {
		this._logService.info('[ExtHostClaudeCodeBridge] Initialized');
	}

	async $sendMessageToClaudeCode(text: string): Promise<void> {
		this._logService.info('[ExtHostClaudeCodeBridge] $sendMessageToClaudeCode called with text:', text);

		try {
			// Step 1: Get Claude Code extension
			const claudeExtension = await this._getClaudeCodeExtension();
			if (!claudeExtension) {
				this._logService.error('[ExtHostClaudeCodeBridge] Claude Code extension not found');
				throw new Error('Claude Code extension not found');
			}

			this._logService.info('[ExtHostClaudeCodeBridge] Claude Code extension found:', claudeExtension.id);

			// Step 2: Activate Claude Code if not already active
			if (!claudeExtension.isActive) {
				this._logService.info('[ExtHostClaudeCodeBridge] Activating Claude Code extension...');
				await claudeExtension.activate();
				this._logService.info('[ExtHostClaudeCodeBridge] Claude Code extension activated');
			}

			// Step 3: Try to use Claude Code's exported API (if available)
			const api = claudeExtension.exports;
			this._logService.info('[ExtHostClaudeCodeBridge] Claude Code API:', api);

			if (api && typeof api.sendMessage === 'function') {
				this._logService.info('[ExtHostClaudeCodeBridge] Using Claude Code API to send message');
				await api.sendMessage(text);
				this._logService.info('[ExtHostClaudeCodeBridge] Message sent via API');
			} else {
				// Step 4: Fallback to command-based approach
				this._logService.info('[ExtHostClaudeCodeBridge] No API available, using command-based approach');
				await this._sendViaCommands(text);
			}

			this._logService.info('[ExtHostClaudeCodeBridge] Message sent successfully');
		} catch (error) {
			this._logService.error('[ExtHostClaudeCodeBridge] Error sending message:', error);
			throw error;
		}
	}

	private async _getClaudeCodeExtension(): Promise<vscode.Extension<any> | undefined> {
		const extension = await this._extensionService.getExtension('anthropic.claude-code');
		return extension as any;
	}

	private async _sendViaCommands(text: string): Promise<void> {
		this._logService.info('[ExtHostClaudeCodeBridge] Sending via commands...');

		// Import vscode API
		const vscode = await import('vscode');

		// Step 1: Copy text to clipboard
		this._logService.info('[ExtHostClaudeCodeBridge] Copying to clipboard...');
		await vscode.env.clipboard.writeText(text);

		// Step 2: Open Claude Code
		this._logService.info('[ExtHostClaudeCodeBridge] Opening Claude Code...');
		await vscode.commands.executeCommand('claude-vscode.editor.open');
		await this._delay(1000);

		// Step 3: Focus input
		this._logService.info('[ExtHostClaudeCodeBridge] Focusing input...');
		await vscode.commands.executeCommand('claude-vscode.focus');
		await this._delay(500);

		// Step 4: Paste
		this._logService.info('[ExtHostClaudeCodeBridge] Pasting...');
		await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
		await this._delay(500);

		// Step 5: Try to send (this is the part that might not work automatically)
		this._logService.info('[ExtHostClaudeCodeBridge] Attempting to send...');
		try {
			await vscode.commands.executeCommand('type', { text: '\n' });
		} catch (e) {
			this._logService.warn('[ExtHostClaudeCodeBridge] Could not auto-send, user needs to press Enter');
		}

		this._logService.info('[ExtHostClaudeCodeBridge] Command-based send completed');
	}

	private _delay(ms: number): Promise<void> {
		return new Promise(resolve => setTimeout(resolve, ms));
	}
}
