/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/aiInteropAuditView.css';
import { localize } from '../../../../nls.js';
import { append, $, clearNode, addDisposableListener } from '../../../../base/browser/dom.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAIInteropAuditService, AuditEvent, AuditEventType, AuditEventFilter } from '../../../services/aiInterop/common/aiInterop.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';

interface EventStatistics {
	type: AuditEventType;
	count: number;
}

export class AIInteropAuditView extends ViewPane {
	private contentContainer: HTMLElement | undefined;
	private filterContainer: HTMLElement | undefined;
	private statsContainer: HTMLElement | undefined;
	private eventsListContainer: HTMLElement | undefined;
	private detailsContainer: HTMLElement | undefined;

	private typeFilterSelect: HTMLSelectElement | undefined;
	private extensionFilterInput: HTMLInputElement | undefined;
	private currentFilter: AuditEventFilter = {};
	private selectedEvent: AuditEvent | undefined;

	constructor(
		options: IViewPaneOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IAIInteropAuditService private readonly auditService: IAIInteropAuditService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

		this._register(this.auditService.onDidLogEvent(() => this.refresh()));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.contentContainer = append(container, $('.ai-interop-audit-view'));

		// Filter section
		this.renderFilterSection();

		// Statistics section
		this.statsContainer = append(this.contentContainer, $('.stats-section'));

		// Events list section
		this.eventsListContainer = append(this.contentContainer, $('.events-list'));

		// Details section
		this.detailsContainer = append(this.contentContainer, $('.details-section'));
		this.detailsContainer.style.display = 'none';

		this.refresh();
	}

	private renderFilterSection(): void {
		if (!this.contentContainer) {
			return;
		}

		this.filterContainer = append(this.contentContainer, $('.filter-section'));

		// Type filter
		const typeFilterContainer = append(this.filterContainer, $('.filter-item'));
		const typeLabel = append(typeFilterContainer, $('label'));
		typeLabel.textContent = localize('aiInterop.audit.filterByType', 'Event Type:');

		const eventTypes = [
			'all',
			'endpoint_registered',
			'endpoint_unregistered',
			'invocation_started',
			'invocation_completed',
			'invocation_failed',
			'invocation_canceled',
			'permission_granted',
			'permission_denied',
			'permission_revoked',
			'session_created',
			'session_deleted',
			'participant_added',
			'participant_removed'
		];

		this.typeFilterSelect = append(typeFilterContainer, $('select.filter-control')) as HTMLSelectElement;
		for (const type of eventTypes) {
			const option = append(this.typeFilterSelect, $('option')) as HTMLOptionElement;
			option.value = type;
			option.textContent = type;
		}
		this._register(addDisposableListener(this.typeFilterSelect, 'change', () => {
			const selected = this.typeFilterSelect!.value;
			if (selected === 'all') {
				delete this.currentFilter.type;
			} else {
				this.currentFilter.type = selected as AuditEventType;
			}
			this.refresh();
		}));

		// Extension filter
		const extensionFilterContainer = append(this.filterContainer, $('.filter-item'));
		const extensionLabel = append(extensionFilterContainer, $('label'));
		extensionLabel.textContent = localize('aiInterop.audit.filterByExtension', 'Extension ID:');

		this.extensionFilterInput = append(extensionFilterContainer, $('input.filter-control')) as HTMLInputElement;
		this.extensionFilterInput.type = 'text';
		this.extensionFilterInput.placeholder = localize('aiInterop.audit.extensionPlaceholder', 'Filter by extension...');
		this._register(addDisposableListener(this.extensionFilterInput, 'input', () => {
			const value = this.extensionFilterInput!.value;
			if (value) {
				this.currentFilter.extensionId = value;
			} else {
				delete this.currentFilter.extensionId;
			}
			this.refresh();
		}));

		// Action buttons
		const actionsContainer = append(this.filterContainer, $('.filter-actions'));

		const clearButton = this._register(new Button(actionsContainer, defaultButtonStyles));
		clearButton.label = localize('aiInterop.audit.clearFilter', 'Clear Filter');
		this._register(clearButton.onDidClick(() => {
			this.currentFilter = {};
			this.typeFilterSelect!.value = 'all';
			this.extensionFilterInput!.value = '';
			this.refresh();
		}));

		const exportButton = this._register(new Button(actionsContainer, defaultButtonStyles));
		exportButton.label = localize('aiInterop.audit.export', 'Export');
		this._register(exportButton.onDidClick(() => this.exportEvents()));

		const clearAllButton = this._register(new Button(actionsContainer, defaultButtonStyles));
		clearAllButton.label = localize('aiInterop.audit.clearAll', 'Clear All Events');
		this._register(clearAllButton.onDidClick(() => {
			this.auditService.clearEvents();
			this.selectedEvent = undefined;
			this.refresh();
		}));
	}

	private async refresh(): Promise<void> {
		this.renderStatistics();
		this.renderEventsList();
		if (this.selectedEvent) {
			this.renderEventDetails(this.selectedEvent);
		}
	}

	private renderStatistics(): void {
		if (!this.statsContainer) {
			return;
		}

		clearNode(this.statsContainer);

		const events = this.auditService.getEvents(this.currentFilter);
		const stats = this.calculateStatistics(events);

		const title = append(this.statsContainer, $('.stats-title'));
		title.textContent = localize('aiInterop.audit.statistics', 'Event Statistics');

		const statsGrid = append(this.statsContainer, $('.stats-grid'));

		for (const stat of stats) {
			const statItem = append(statsGrid, $('.stat-item'));
			const statCount = append(statItem, $('.stat-count'));
			statCount.textContent = stat.count.toString();
			const statLabel = append(statItem, $('.stat-label'));
			statLabel.textContent = this.formatEventType(stat.type);
		}

		const totalItem = append(statsGrid, $('.stat-item.total'));
		const totalCount = append(totalItem, $('.stat-count'));
		totalCount.textContent = events.length.toString();
		const totalLabel = append(totalItem, $('.stat-label'));
		totalLabel.textContent = localize('aiInterop.audit.total', 'Total');
	}

	private calculateStatistics(events: AuditEvent[]): EventStatistics[] {
		const statsMap = new Map<AuditEventType, number>();

		for (const event of events) {
			const count = statsMap.get(event.type) || 0;
			statsMap.set(event.type, count + 1);
		}

		const stats: EventStatistics[] = [];
		for (const [type, count] of statsMap.entries()) {
			stats.push({ type, count });
		}

		stats.sort((a, b) => b.count - a.count);
		return stats.slice(0, 5); // Top 5
	}

	private renderEventsList(): void {
		if (!this.eventsListContainer) {
			return;
		}

		clearNode(this.eventsListContainer);

		const events = this.auditService.getEvents(this.currentFilter);

		if (events.length === 0) {
			const emptyMessage = append(this.eventsListContainer, $('.empty-message'));
			emptyMessage.textContent = localize('aiInterop.audit.noEvents', 'No audit events');
			return;
		}

		const listTitle = append(this.eventsListContainer, $('.list-title'));
		listTitle.textContent = localize('aiInterop.audit.events', 'Events ({0})', events.length);

		// Reverse to show newest first
		const sortedEvents = [...events].reverse();

		for (const event of sortedEvents) {
			this.renderEventItem(event);
		}
	}

	private renderEventItem(event: AuditEvent): void {
		if (!this.eventsListContainer) {
			return;
		}

		const eventItem = append(this.eventsListContainer, $('.event-item'));
		if (this.selectedEvent?.id === event.id) {
			eventItem.classList.add('selected');
		}

		eventItem.onclick = () => {
			this.selectedEvent = event;
			this.renderEventDetails(event);
			this.refresh();
		};

		const eventHeader = append(eventItem, $('.event-header'));

		const eventType = append(eventHeader, $('.event-type'));
		eventType.textContent = this.formatEventType(event.type);
		eventType.classList.add(`type-${event.type.split('_')[0]}`);

		const eventTime = append(eventHeader, $('.event-time'));
		eventTime.textContent = new Date(event.timestamp).toLocaleString();

		if (event.extensionId) {
			const eventExtension = append(eventItem, $('.event-extension'));
			eventExtension.textContent = event.extensionId;
		}
	}

	private renderEventDetails(event: AuditEvent): void {
		if (!this.detailsContainer) {
			return;
		}

		clearNode(this.detailsContainer);
		this.detailsContainer.style.display = 'block';

		const title = append(this.detailsContainer, $('.details-title'));
		title.textContent = localize('aiInterop.audit.eventDetails', 'Event Details');

		const closeButton = append(title, $('.close-button'));
		closeButton.textContent = '×';
		closeButton.onclick = () => {
			this.selectedEvent = undefined;
			this.detailsContainer!.style.display = 'none';
		};

		const detailsContent = append(this.detailsContainer, $('.details-content'));

		this.renderDetailRow(detailsContent, localize('aiInterop.audit.id', 'ID'), event.id);
		this.renderDetailRow(detailsContent, localize('aiInterop.audit.type', 'Type'), this.formatEventType(event.type));
		this.renderDetailRow(detailsContent, localize('aiInterop.audit.timestamp', 'Timestamp'), new Date(event.timestamp).toLocaleString());

		if (event.extensionId) {
			this.renderDetailRow(detailsContent, localize('aiInterop.audit.extensionId', 'Extension ID'), event.extensionId);
		}

		if (event.invocationId) {
			this.renderDetailRow(detailsContent, localize('aiInterop.audit.invocationId', 'Invocation ID'), event.invocationId);
		}

		if (event.sessionId) {
			this.renderDetailRow(detailsContent, localize('aiInterop.audit.sessionId', 'Session ID'), event.sessionId);
		}

		if (Object.keys(event.details).length > 0) {
			const detailsLabel = append(detailsContent, $('.detail-label'));
			detailsLabel.textContent = localize('aiInterop.audit.details', 'Details');

			const detailsJson = append(detailsContent, $('.detail-json'));
			detailsJson.textContent = JSON.stringify(event.details, null, 2);
		}
	}

	private renderDetailRow(container: HTMLElement, label: string, value: string): void {
		const row = append(container, $('.detail-row'));
		const labelEl = append(row, $('.detail-label'));
		labelEl.textContent = label;
		const valueEl = append(row, $('.detail-value'));
		valueEl.textContent = value;
	}

	private formatEventType(type: AuditEventType): string {
		return type.split('_').map(word => word.charAt(0).toUpperCase() + word.slice(1)).join(' ');
	}

	private exportEvents(): void {
		const events = this.auditService.getEvents(this.currentFilter);
		const json = JSON.stringify(events, null, 2);

		// Create download link
		const blob = new Blob([json], { type: 'application/json' });
		const url = URL.createObjectURL(blob);
		const a = document.createElement('a');
		a.href = url;
		a.download = `audit-events-${Date.now()}.json`;
		a.click();
		URL.revokeObjectURL(url);
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}
}
