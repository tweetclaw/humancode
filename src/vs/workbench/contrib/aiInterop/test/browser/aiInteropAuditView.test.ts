/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { TestInstantiationService } from '../../../../../platform/instantiation/test/common/instantiationServiceMock.js';
import { AIInteropAuditView } from '../../browser/aiInteropAuditView.js';
import { IAIInteropAuditService, AuditEvent, AuditEventType } from '../../../../services/aiInterop/common/aiInterop.js';
import { IViewDescriptorService } from '../../../../common/views.js';
import { IKeybindingService } from '../../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../../platform/hover/browser/hover.js';
import { Emitter } from '../../../../../base/common/event.js';
import { TestConfigurationService } from '../../../../../platform/configuration/test/common/testConfigurationService.js';
import { TestContextService } from '../../../../test/common/workbenchTestServices.js';
import { NullHoverService } from '../../../../../platform/hover/test/browser/nullHoverService.js';

class MockAuditService implements IAIInteropAuditService {
	_serviceBrand: undefined;
	private _onDidLogEvent = new Emitter<AuditEvent>();
	onDidLogEvent = this._onDidLogEvent.event;
	private events: AuditEvent[] = [];

	logEvent(event: AuditEvent): void {
		this.events.push(event);
		this._onDidLogEvent.fire(event);
	}

	getEvents(filter?: { type?: AuditEventType; extensionId?: string; startTime?: number; endTime?: number }): AuditEvent[] {
		let filtered = [...this.events];

		if (filter?.type) {
			filtered = filtered.filter(e => e.type === filter.type);
		}
		if (filter?.extensionId) {
			filtered = filtered.filter(e => e.extensionId?.includes(filter.extensionId!));
		}
		if (filter?.startTime) {
			filtered = filtered.filter(e => e.timestamp >= filter.startTime!);
		}
		if (filter?.endTime) {
			filtered = filtered.filter(e => e.timestamp <= filter.endTime!);
		}

		return filtered;
	}

	getEventsByType(type: AuditEventType): AuditEvent[] {
		return this.getEvents({ type });
	}

	getEventsByExtension(extensionId: string): AuditEvent[] {
		return this.getEvents({ extensionId });
	}

	getEventsByTimeRange(start: number, end: number): AuditEvent[] {
		return this.getEvents({ startTime: start, endTime: end });
	}

	clearEvents(): void {
		this.events = [];
	}

	// Helper method for tests
	addEvent(type: AuditEventType, details: Record<string, any>, extensionId?: string, invocationId?: string, sessionId?: string): void {
		const event: AuditEvent = {
			id: `event-${this.events.length + 1}`,
			type,
			timestamp: Date.now(),
			extensionId,
			invocationId,
			sessionId,
			details
		};
		this.logEvent(event);
	}
}

suite('AIInteropAuditView', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();
	let instantiationService: TestInstantiationService;
	let auditService: MockAuditService;

	setup(() => {
		instantiationService = disposables.add(new TestInstantiationService());
		auditService = new MockAuditService();

		instantiationService.stub(IAIInteropAuditService, auditService);
		instantiationService.stub(IViewDescriptorService, new TestContextService());
		instantiationService.stub(IKeybindingService, {});
		instantiationService.stub(IContextMenuService, {});
		instantiationService.stub(IConfigurationService, new TestConfigurationService());
		instantiationService.stub(IContextKeyService, {});
		instantiationService.stub(IOpenerService, {});
		instantiationService.stub(IThemeService, {});
		instantiationService.stub(IHoverService, NullHoverService);
	});

	test('should display audit events list', () => {
		// Add test events
		auditService.addEvent('endpoint_registered', { endpointId: 'test-endpoint' }, 'test.extension');
		auditService.addEvent('session_created', { sessionId: 'session-1' }, 'test.extension');
		auditService.addEvent('invocation_started', { invocationId: 'inv-1' }, 'test.extension');

		const view = disposables.add(instantiationService.createInstance(AIInteropAuditView, {
			id: 'test-audit-view',
			title: 'Test Audit View'
		}));

		const container = document.createElement('div');
		view.render();
		(view as any).renderBody(container);

		// Verify events are displayed
		const events = auditService.getEvents();
		assert.strictEqual(events.length, 3, 'Should have 3 events');
		assert.strictEqual(events[0].type, 'endpoint_registered');
		assert.strictEqual(events[1].type, 'session_created');
		assert.strictEqual(events[2].type, 'invocation_started');
	});

	test('should filter events by type', () => {
		// Add various event types
		auditService.addEvent('endpoint_registered', { endpointId: 'ep1' }, 'ext1');
		auditService.addEvent('endpoint_registered', { endpointId: 'ep2' }, 'ext2');
		auditService.addEvent('session_created', { sessionId: 's1' }, 'ext1');
		auditService.addEvent('invocation_started', { invocationId: 'inv1' }, 'ext1');

		// Filter by endpoint_registered
		const filtered = auditService.getEvents({ type: 'endpoint_registered' });
		assert.strictEqual(filtered.length, 2, 'Should have 2 endpoint_registered events');
		assert.strictEqual(filtered[0].type, 'endpoint_registered');
		assert.strictEqual(filtered[1].type, 'endpoint_registered');
	});

	test('should filter events by extension ID', () => {
		// Add events from different extensions
		auditService.addEvent('endpoint_registered', { endpointId: 'ep1' }, 'ext.one');
		auditService.addEvent('session_created', { sessionId: 's1' }, 'ext.one');
		auditService.addEvent('invocation_started', { invocationId: 'inv1' }, 'ext.two');

		// Filter by extension
		const filtered = auditService.getEvents({ extensionId: 'ext.one' });
		assert.strictEqual(filtered.length, 2, 'Should have 2 events from ext.one');
		assert.strictEqual(filtered[0].extensionId, 'ext.one');
		assert.strictEqual(filtered[1].extensionId, 'ext.one');
	});

	test('should filter events by time range', () => {
		const now = Date.now();
		const past = now - 10000;
		const future = now + 10000;

		// Add events at different times
		auditService.addEvent('endpoint_registered', { endpointId: 'ep1' }, 'ext1');
		auditService.addEvent('session_created', { sessionId: 's1' }, 'ext1');

		// Filter by time range
		const filtered = auditService.getEvents({ startTime: past, endTime: future });
		assert.strictEqual(filtered.length, 2, 'Should have 2 events in time range');
	});

	test('should display event details', () => {
		// Add event with details
		auditService.addEvent('invocation_completed', {
			duration: 1500,
			tokenCount: 250,
			success: true
		}, 'test.extension', 'inv-123', 'session-456');

		const events = auditService.getEvents();
		assert.strictEqual(events.length, 1);

		const event = events[0];
		assert.strictEqual(event.type, 'invocation_completed');
		assert.strictEqual(event.extensionId, 'test.extension');
		assert.strictEqual(event.invocationId, 'inv-123');
		assert.strictEqual(event.sessionId, 'session-456');
		assert.strictEqual(event.details.duration, 1500);
		assert.strictEqual(event.details.tokenCount, 250);
		assert.strictEqual(event.details.success, true);
	});

	test('should clear all events', () => {
		// Add events
		auditService.addEvent('endpoint_registered', { endpointId: 'ep1' }, 'ext1');
		auditService.addEvent('session_created', { sessionId: 's1' }, 'ext1');

		assert.strictEqual(auditService.getEvents().length, 2);

		// Clear events
		auditService.clearEvents();

		assert.strictEqual(auditService.getEvents().length, 0, 'Should have no events after clear');
	});

	test('should handle empty event list', () => {
		const view = disposables.add(instantiationService.createInstance(AIInteropAuditView, {
			id: 'test-audit-view',
			title: 'Test Audit View'
		}));

		const container = document.createElement('div');
		view.render();
		(view as any).renderBody(container);

		const events = auditService.getEvents();
		assert.strictEqual(events.length, 0, 'Should have no events');
	});

	test('should combine multiple filters', () => {
		// Add various events
		auditService.addEvent('endpoint_registered', { endpointId: 'ep1' }, 'ext.one');
		auditService.addEvent('endpoint_registered', { endpointId: 'ep2' }, 'ext.two');
		auditService.addEvent('session_created', { sessionId: 's1' }, 'ext.one');

		// Filter by type AND extension
		const filtered = auditService.getEvents({
			type: 'endpoint_registered',
			extensionId: 'ext.one'
		});

		assert.strictEqual(filtered.length, 1, 'Should have 1 event matching both filters');
		assert.strictEqual(filtered[0].type, 'endpoint_registered');
		assert.strictEqual(filtered[0].extensionId, 'ext.one');
	});
});
