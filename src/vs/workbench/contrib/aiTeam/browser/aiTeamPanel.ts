/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/aiTeam.css';
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
import { IAISessionManagerService, ISessionContext } from '../../../services/aiSessionManager/common/aiSessionManager.js';
import { IQuickInputService } from '../../../../platform/quickinput/common/quickInput.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';

export class AITeamPanel extends ViewPane {

	private contentContainer: HTMLElement | undefined;
	private cardsContainer: HTMLElement | undefined;

	constructor(
		options: IViewPaneOptions,
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

		// Subscribe to session changes
		this._register(this.sessionManagerService.onDidSessionsChange(() => {
			this.refreshCards();
		}));

		this._register(this.sessionManagerService.onDidSessionStatusChange(({ sessionId }) => {
			this.updateCardStatus(sessionId);
		}));

		this._register(this.sessionManagerService.onDidMessageAppend(({ sessionId }) => {
			this.updateCardSummary(sessionId);
		}));

		// Subscribe to active session changes
		this._register(this.sessionManagerService.onDidActiveSessionChange((sessionId) => {
			this.updateActiveSessionUI(sessionId);
		}));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.contentContainer = dom.append(container, dom.$('.ai-team-panel'));

		// Header with title and add button
		const header = dom.append(this.contentContainer, dom.$('.ai-team-header'));
		const title = dom.append(header, dom.$('.ai-team-title'));
		title.textContent = '🤖 AI Development Team';

		const addButton = this._register(new Button(header, { ...defaultButtonStyles, secondary: false }));
		addButton.label = '+ Add Member';
		addButton.element.classList.add('ai-team-add-button');
		this._register(addButton.onDidClick(() => this.handleAddMember()));

		// Cards container
		this.cardsContainer = dom.append(this.contentContainer, dom.$('.ai-team-cards'));

		// Initial render
		this.refreshCards();

		// Set default selection to PM if no active session
		this.setDefaultSelection();
	}

	private refreshCards(): void {
		if (!this.cardsContainer) {
			return;
		}

		dom.clearNode(this.cardsContainer);

		const sessions = this.sessionManagerService.getAllSessions();
		for (const session of sessions) {
			this.renderCard(session);
		}

		// Set default selection after refresh if no active session
		this.setDefaultSelection();
	}

	private renderCard(session: ISessionContext): void {
		if (!this.cardsContainer) {
			return;
		}

		const card = dom.append(this.cardsContainer, dom.$('.ai-role-card'));
		card.dataset['sessionId'] = session.sessionId;

		// Check if this is the active session
		const activeSessionId = this.sessionManagerService.getActiveSessionId();
		if (activeSessionId === session.sessionId) {
			card.classList.add('active');
		}

		// Make card clickable to activate session
		this._register(dom.addDisposableListener(card, 'click', (e) => {
			console.log('[AITeamPanel] Card clicked, sessionId:', session.sessionId);
			console.log('[AITeamPanel] Click target:', (e.target as HTMLElement).className);

			// Don't activate if clicking on buttons
			if ((e.target as HTMLElement).closest('.card-actions')) {
				console.log('[AITeamPanel] Click on button area, ignoring');
				return;
			}
			console.log('[AITeamPanel] Calling handleActivateSession');
			this.handleActivateSession(session.sessionId);
		}));

		// Status indicator
		const statusIndicator = dom.append(card, dom.$('.status-indicator'));
		statusIndicator.classList.add(`status-${session.metadata.status}`);

		// Card content
		const cardContent = dom.append(card, dom.$('.card-content'));

		// Role name
		const roleName = dom.append(cardContent, dom.$('.role-name'));
		roleName.textContent = session.name;

		// Role description
		const roleDesc = dom.append(cardContent, dom.$('.role-description'));
		roleDesc.textContent = session.role;

		// Last message summary
		const summary = dom.append(cardContent, dom.$('.message-summary'));
		const lastMessage = session.conversationHistory[session.conversationHistory.length - 1];
		if (lastMessage) {
			const content = lastMessage.content;
			summary.textContent = content.length > 60 ? content.substring(0, 60) + '...' : content;
		} else {
			summary.textContent = 'No messages yet';
		}

		// Action buttons
		const actions = dom.append(card, dom.$('.card-actions'));

		const sendTaskButton = this._register(new Button(actions, { ...defaultButtonStyles, secondary: true }));
		sendTaskButton.label = 'Send Task';
		sendTaskButton.element.classList.add('card-action-button');
		this._register(sendTaskButton.onDidClick(() => this.handleSendTask(session.sessionId)));

		const relayButton = this._register(new Button(actions, { ...defaultButtonStyles, secondary: true }));
		relayButton.label = '→ Relay';
		relayButton.element.classList.add('card-action-button');
		this._register(relayButton.onDidClick(() => this.handleRelay(session.sessionId)));

		const deleteButton = this._register(new Button(actions, { ...defaultButtonStyles, secondary: true }));
		deleteButton.label = '✕ Delete';
		deleteButton.element.classList.add('card-action-button', 'delete-button');
		this._register(deleteButton.onDidClick(() => this.handleDeleteSession(session.sessionId)));
	}

	private updateCardStatus(sessionId: string): void {
		if (!this.cardsContainer) {
			return;
		}

		const card = this.cardsContainer.querySelector(`[data-session-id="${sessionId}"]`);
		if (!card) {
			return;
		}

		const session = this.sessionManagerService.getSession(sessionId);
		if (!session) {
			return;
		}

		const statusIndicator = card.querySelector('.status-indicator');
		if (statusIndicator) {
			statusIndicator.className = 'status-indicator';
			statusIndicator.classList.add(`status-${session.metadata.status}`);
		}
	}

	private updateCardSummary(sessionId: string): void {
		if (!this.cardsContainer) {
			return;
		}

		const card = this.cardsContainer.querySelector(`[data-session-id="${sessionId}"]`);
		if (!card) {
			return;
		}

		const session = this.sessionManagerService.getSession(sessionId);
		if (!session) {
			return;
		}

		const summary = card.querySelector('.message-summary');
		if (summary) {
			const lastMessage = session.conversationHistory[session.conversationHistory.length - 1];
			if (lastMessage) {
				const content = lastMessage.content;
				summary.textContent = content.length > 60 ? content.substring(0, 60) + '...' : content;
			}
		}
	}

	private async handleAddMember(): Promise<void> {
		const name = await this.quickInputService.input({
			prompt: localize('aiTeam.addMember.name', "Enter the name for the new AI team member"),
			placeHolder: localize('aiTeam.addMember.namePlaceholder', "e.g., Frontend Alex")
		});

		if (!name) {
			return;
		}

		const role = await this.quickInputService.input({
			prompt: localize('aiTeam.addMember.role', "Enter the role/specialty"),
			placeHolder: localize('aiTeam.addMember.rolePlaceholder', "e.g., Frontend Development")
		});

		if (!role) {
			return;
		}

		const defaultSystemPrompt = `You are ${name}, a ${role} expert. Help the user with tasks related to ${role}.`;
		const systemPrompt = await this.quickInputService.input({
			prompt: localize('aiTeam.addMember.systemPrompt', "Enter the system prompt (optional, press Enter to use default)"),
			placeHolder: localize('aiTeam.addMember.systemPromptPlaceholder', "Custom instructions for this AI..."),
			value: defaultSystemPrompt
		});

		// Create session with user-provided or default system prompt
		this.sessionManagerService.createSession({
			name,
			role,
			extensionId: 'github.copilot',
			systemPrompt: systemPrompt || defaultSystemPrompt,
			avatarColor: this.getRandomColor(),
			skillTags: []
		});
	}

	private async handleSendTask(sessionId: string): Promise<void> {
		const task = await this.quickInputService.input({
			prompt: localize('aiTeam.sendTask', "Enter the task for this AI team member"),
			placeHolder: localize('aiTeam.sendTask.placeholder', "Describe what you want this AI to do...")
		});

		if (!task) {
			return;
		}

		// Set as active session
		this.sessionManagerService.setActiveSession(sessionId);

		// Append user message
		this.sessionManagerService.appendMessage(sessionId, {
			direction: 'user',
			content: task
		});

		// Update status to working
		this.sessionManagerService.updateSessionStatus(sessionId, 'working');

		// In real integration, this would trigger actual AI communication
		// For now, simulate a response after a delay
		setTimeout(() => {
			this.sessionManagerService.appendMessage(sessionId, {
				direction: 'assistant',
				content: `I understand the task: "${task}". I'll work on this right away.`
			});
			this.sessionManagerService.updateSessionStatus(sessionId, 'idle');
		}, 2000);
	}

	private handleActivateSession(sessionId: string): void {
		console.log('[AITeamPanel] handleActivateSession called with sessionId:', sessionId);

		// Set as active session (this will trigger onDidActiveSessionChange event)
		this.sessionManagerService.setActiveSession(sessionId);
		console.log('[AITeamPanel] setActiveSession called');
	}

	/**
	 * Update the visual state of all cards when active session changes
	 */
	private updateActiveSessionUI(sessionId: string | null): void {
		if (!this.cardsContainer) {
			return;
		}

		const allCards = this.cardsContainer.querySelectorAll('.ai-role-card');
		allCards.forEach(card => {
			if (card instanceof HTMLElement) {
				if (sessionId && card.dataset['sessionId'] === sessionId) {
					card.classList.add('active');
				} else {
					card.classList.remove('active');
				}
			}
		});
	}

	private async handleDeleteSession(sessionId: string): Promise<void> {
		const session = this.sessionManagerService.getSession(sessionId);
		if (!session) {
			return;
		}

		// Show confirmation dialog
		const picks = [
			{ label: localize('aiTeam.delete.confirm', "Yes, Delete"), value: true },
			{ label: localize('aiTeam.delete.cancel', "Cancel"), value: false }
		];

		const selected = await this.quickInputService.pick(picks, {
			placeHolder: localize('aiTeam.delete.prompt', "Delete '{0}'? This cannot be undone.", session.name)
		});

		if (!selected || !selected.value) {
			return;
		}

		// Delete the session
		this.sessionManagerService.deleteSession(sessionId);
	}

	private async handleRelay(fromSessionId: string): Promise<void> {
		const sessions = this.sessionManagerService.getAllSessions()
			.filter(s => s.sessionId !== fromSessionId);

		if (sessions.length === 0) {
			return;
		}

		const picks = sessions.map(s => ({
			label: s.name,
			description: s.role,
			sessionId: s.sessionId
		}));

		const selected = await this.quickInputService.pick(picks, {
			placeHolder: localize('aiTeam.relay.selectTarget', "Select the target AI team member to relay the message to")
		});

		if (!selected) {
			return;
		}

		// Relay the message
		this.sessionManagerService.relayMessage({
			fromSessionId,
			toSessionId: selected.sessionId,
			relayType: 'review'
		});
	}

	/**
	 * Set default selection to Project Manager (PM) if no active session exists
	 */
	private setDefaultSelection(): void {
		// Only set default if there's no active session
		const activeSessionId = this.sessionManagerService.getActiveSessionId();
		if (activeSessionId) {
			return;
		}

		const sessions = this.sessionManagerService.getAllSessions();
		if (sessions.length === 0) {
			return;
		}

		// Find PM session (项目经理 or PM)
		const pmSession = sessions.find(s =>
			s.role.toLowerCase().includes('项目经理') ||
			s.role.toLowerCase().includes('pm') ||
			s.name.toLowerCase().includes('pm')
		);

		if (pmSession) {
			this.handleActivateSession(pmSession.sessionId);
		} else {
			// If no PM, select the first session
			this.handleActivateSession(sessions[0].sessionId);
		}
	}

	private getRandomColor(): string {
		const colors = ['#4FC3F7', '#FF9800', '#4CAF50', '#9C27B0', '#F44336', '#2196F3'];
		return colors[Math.floor(Math.random() * colors.length)];
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		if (this.contentContainer) {
			this.contentContainer.style.height = `${height}px`;
		}
	}
}
