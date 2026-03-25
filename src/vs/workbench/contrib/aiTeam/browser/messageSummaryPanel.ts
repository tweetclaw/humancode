/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/messageSummary.css';
import * as dom from '../../../../base/browser/dom.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IMessageHubService, IMessageRecord } from '../common/messageHub.js';
import { IAISessionManagerService } from '../../../services/aiSessionManager/common/aiSessionManager.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';

export class MessageSummaryPanel extends ViewPane {

	private contentContainer: HTMLElement | undefined;
	private messagesContainer: HTMLElement | undefined;
	private filterKeyword: string = '';

	constructor(
		options: IViewPaneOptions,
		@IMessageHubService private readonly messageHubService: IMessageHubService,
		@IAISessionManagerService private readonly sessionManagerService: IAISessionManagerService,
		@IQuickInputService private readonly quickInputService: IQuickInputService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

		// Subscribe to message events
		this._register(this.messageHubService.onDidAddMessage(() => {
			this.refreshMessages();
		}));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.contentContainer = dom.append(container, dom.$('.message-summary-panel'));

		// Header with title and filter button
		const header = dom.append(this.contentContainer, dom.$('.message-summary-header'));
		const title = dom.append(header, dom.$('.message-summary-title'));
		title.textContent = '📨 Message Summary';

		const filterButton = this._register(new Button(header, { ...defaultButtonStyles, secondary: true }));
		filterButton.label = '🔍 Filter';
		filterButton.element.classList.add('message-filter-button');
		this._register(filterButton.onDidClick(() => this.handleFilter()));

		// Messages container
		this.messagesContainer = dom.append(this.contentContainer, dom.$('.messages-container'));

		// Initial render
		this.refreshMessages();
	}

	private refreshMessages(): void {
		if (!this.messagesContainer) {
			return;
		}

		dom.clearNode(this.messagesContainer);

		const filterOptions = this.filterKeyword ? { keyword: this.filterKeyword } : undefined;
		const messages = this.messageHubService.getAllMessages(filterOptions);

		if (messages.length === 0) {
			const emptyState = dom.append(this.messagesContainer, dom.$('.empty-state'));
			emptyState.textContent = 'No messages yet';
			return;
		}

		// Render messages in reverse chronological order (newest first)
		const sortedMessages = [...messages].sort((a, b) => b.timestamp - a.timestamp);
		for (const message of sortedMessages) {
			this.renderMessage(message);
		}
	}

	private renderMessage(message: IMessageRecord): void {
		if (!this.messagesContainer) {
			return;
		}

		const messageCard = dom.append(this.messagesContainer, dom.$('.message-card'));

		// Message header (from -> to, time)
		const messageHeader = dom.append(messageCard, dom.$('.message-header'));

		const fromName = message.fromSessionId === 'user' ? 'User' : this.getSessionName(message.fromSessionId);
		const toName = message.toSessionId === 'user' ? 'User' : this.getSessionName(message.toSessionId);

		const participants = dom.append(messageHeader, dom.$('.message-participants'));
		participants.textContent = `${fromName} → ${toName}`;

		const timestamp = dom.append(messageHeader, dom.$('.message-timestamp'));
		timestamp.textContent = this.formatTime(message.timestamp);

		// Message content
		const messageContent = dom.append(messageCard, dom.$('.message-content'));
		messageContent.textContent = message.content;

		// Message actions
		if (message.canForward) {
			const messageActions = dom.append(messageCard, dom.$('.message-actions'));

			const forwardButton = this._register(new Button(messageActions, { ...defaultButtonStyles, secondary: true }));
			forwardButton.label = '→ Forward';
			forwardButton.element.classList.add('message-action-button');
			this._register(forwardButton.onDidClick(() => this.handleForward(message)));
		}
	}

	private getSessionName(sessionId: string): string {
		const session = this.sessionManagerService.getSession(sessionId);
		return session ? session.name : 'Unknown';
	}

	private formatTime(timestamp: number): string {
		const date = new Date(timestamp);
		const hours = date.getHours().toString().padStart(2, '0');
		const minutes = date.getMinutes().toString().padStart(2, '0');
		return `${hours}:${minutes}`;
	}

	private async handleFilter(): Promise<void> {
		const keyword = await this.quickInputService.input({
			prompt: localize('messageSummary.filter', "Enter keyword to filter messages (leave empty to clear filter)"),
			placeHolder: localize('messageSummary.filter.placeholder', "Search messages..."),
			value: this.filterKeyword
		});

		if (keyword !== undefined) {
			this.filterKeyword = keyword;
			this.refreshMessages();
		}
	}

	private async handleForward(message: IMessageRecord): Promise<void> {
		const sessions = this.sessionManagerService.getAllSessions();

		if (sessions.length === 0) {
			return;
		}

		const picks = sessions.map(s => ({
			label: s.name,
			description: s.role,
			sessionId: s.sessionId
		}));

		const selected = await this.quickInputService.pick(picks, {
			placeHolder: localize('messageSummary.forward.selectTarget', "Select the target AI team member to forward this message to")
		});

		if (!selected) {
			return;
		}

		// Forward the message
		await this.messageHubService.forwardMessage({
			messageId: message.id,
			targetSessionId: selected.sessionId
		});
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		if (this.contentContainer) {
			this.contentContainer.style.height = `${height}px`;
		}
	}
}
