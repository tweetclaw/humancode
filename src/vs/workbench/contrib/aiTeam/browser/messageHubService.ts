/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import {
	IMessageHubService,
	IMessageRecord,
	IMessageFilterOptions,
	IMessageForwardRequest,
	MessageDirection
} from '../common/messageHub.js';
import { IAISessionManagerService } from '../../../services/aiSessionManager/common/aiSessionManager.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';

export class MessageHubService extends Disposable implements IMessageHubService {

	declare readonly _serviceBrand: undefined;

	private readonly _messages: IMessageRecord[] = [];

	private readonly _onDidAddMessage = this._register(new Emitter<IMessageRecord>());
	public readonly onDidAddMessage: Event<IMessageRecord> = this._onDidAddMessage.event;

	private readonly _onDidForwardMessage = this._register(new Emitter<{ originalMessage: IMessageRecord; targetSessionId: string }>());
	public readonly onDidForwardMessage: Event<{ originalMessage: IMessageRecord; targetSessionId: string }> = this._onDidForwardMessage.event;

	private static readonly STORAGE_KEY_MESSAGES = 'humancode.messages';

	constructor(
		@IAISessionManagerService private readonly sessionManagerService: IAISessionManagerService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();

		// Load messages from storage
		this._loadMessages();

		// Listen to message append events from session manager
		this._register(this.sessionManagerService.onDidMessageAppend(({ sessionId, message }) => {
			const direction = message.direction === 'user'
				? MessageDirection.UserToAI
				: MessageDirection.AIToUser;

			const fromSessionId = message.direction === 'user' ? 'user' : sessionId;
			const toSessionId = message.direction === 'user' ? sessionId : 'user';

			this.addMessage({
				fromSessionId,
				toSessionId,
				content: message.content,
				direction,
				timestamp: message.timestamp,
				canForward: true
			});
		}));
	}

	getAllMessages(options?: IMessageFilterOptions): IMessageRecord[] {
		let filtered = [...this._messages];

		if (options) {
			if (options.sessionId) {
				filtered = filtered.filter(m =>
					m.fromSessionId === options.sessionId || m.toSessionId === options.sessionId
				);
			}

			if (options.keyword) {
				const keyword = options.keyword.toLowerCase();
				filtered = filtered.filter(m => m.content.toLowerCase().includes(keyword));
			}

			if (options.timeRange) {
				filtered = filtered.filter(m =>
					m.timestamp >= options.timeRange!.start && m.timestamp <= options.timeRange!.end
				);
			}

			if (options.direction) {
				filtered = filtered.filter(m => m.direction === options.direction);
			}
		}

		return filtered;
	}

	addMessage(message: Omit<IMessageRecord, 'id'>): string {
		const id = this.generateMessageId();
		const fullMessage: IMessageRecord = {
			id,
			...message
		};

		this._messages.push(fullMessage);
		this._onDidAddMessage.fire(fullMessage);
		this._saveMessages();

		return id;
	}

	async forwardMessage(request: IMessageForwardRequest): Promise<boolean> {
		const message = this._messages.find(m => m.id === request.messageId);
		if (!message) {
			return false;
		}

		const targetSession = this.sessionManagerService.getSession(request.targetSessionId);
		if (!targetSession) {
			return false;
		}

		// Append the forwarded message to the target session
		this.sessionManagerService.appendMessage(request.targetSessionId, {
			direction: 'user',
			content: `[Forwarded message]\n${message.content}`
		});

		// Set target session as active
		this.sessionManagerService.setActiveSession(request.targetSessionId);

		this._onDidForwardMessage.fire({
			originalMessage: message,
			targetSessionId: request.targetSessionId
		});

		return true;
	}

	clearAllMessages(): void {
		this._messages.length = 0;
		this._saveMessages();
	}

	private generateMessageId(): string {
		return `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	/**
	 * Load messages from storage
	 */
	private _loadMessages(): void {
		try {
			const stored = this.storageService.get(
				MessageHubService.STORAGE_KEY_MESSAGES,
				StorageScope.WORKSPACE
			);

			if (stored) {
				const messages: IMessageRecord[] = JSON.parse(stored);
				this._messages.push(...messages);
			}
		} catch (error) {
			console.error('[MessageHubService] Failed to load messages:', error);
		}
	}

	/**
	 * Save messages to storage
	 */
	private _saveMessages(): void {
		try {
			this.storageService.store(
				MessageHubService.STORAGE_KEY_MESSAGES,
				JSON.stringify(this._messages),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);
		} catch (error) {
			console.error('[MessageHubService] Failed to save messages:', error);
		}
	}
}
