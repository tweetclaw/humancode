/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { ExtHostClaudeCodeBridgeShape, ExtHostContext, MainContext, MainThreadClaudeCodeBridgeShape } from '../common/extHost.protocol.js';
import { IExtHostContext, extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';

/**
 * Main Thread implementation of Claude Code Bridge
 *
 * This service runs in the Main Thread and provides the interface
 * for other Main Thread services to interact with Claude Code via Extension Host.
 */
@extHostNamedCustomer(MainContext.MainThreadClaudeCodeBridge)
export class MainThreadClaudeCodeBridge extends Disposable implements MainThreadClaudeCodeBridgeShape {

	private readonly _proxy: ExtHostClaudeCodeBridgeShape;

	constructor(
		extHostContext: IExtHostContext,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostClaudeCodeBridge);
		this._logService.info('[MainThreadClaudeCodeBridge] Initialized');
	}

	/**
	 * Send a message to Claude Code extension
	 * @param text The message text to send
	 */
	async sendMessageToClaudeCode(text: string): Promise<void> {
		this._logService.info('[MainThreadClaudeCodeBridge] sendMessageToClaudeCode called with text:', text);
		try {
			await this._proxy.$sendMessageToClaudeCode(text);
			this._logService.info('[MainThreadClaudeCodeBridge] Message sent successfully');
		} catch (error) {
			this._logService.error('[MainThreadClaudeCodeBridge] Error sending message:', error);
			throw error;
		}
	}

	/**
	 * Called by Extension Host when Claude Code has output
	 * @param text The output text from Claude Code
	 */
	$onClaudeCodeOutput(text: string): void {
		this._logService.info('[MainThreadClaudeCodeBridge] Received output from Claude Code:', text);
		// TODO: Forward this to AI Interop Bus or other interested parties
	}

	override dispose(): void {
		this._logService.info('[MainThreadClaudeCodeBridge] Disposing');
		super.dispose();
	}
}
