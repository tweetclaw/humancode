/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AIInteropAuditService } from '../../browser/aiInteropAuditService.js';
import {
	AuditEvent,
	AuditEventFilter
} from '../../common/aiInterop.js';

suite('AIInteropAuditService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let auditService: AIInteropAuditService;

	setup(() => {
		const logService = new NullLogService();
		auditService = disposables.add(new AIInteropAuditService(logService));
	});

	suite('Event Logging', () => {
		test('logEvent - success', () => {
			const event: AuditEvent = {
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: { endpointId: 'test.endpoint' }
			};

			const logged = Event.toPromise(auditService.onDidLogEvent);
			auditService.logEvent(event);

			return logged.then(result => {
				assert.deepStrictEqual(result, event);
			});
		});

		test('logEvent - multiple events', () => {
			const event1: AuditEvent = {
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			};

			const event2: AuditEvent = {
				id: 'event2',
				type: 'invocation_started',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				invocationId: 'inv1',
				details: {}
			};

			auditService.logEvent(event1);
			auditService.logEvent(event2);

			const events = auditService.getEvents();
			assert.strictEqual(events.length, 2);
			assert.deepStrictEqual(events[0], event1);
			assert.deepStrictEqual(events[1], event2);
		});

		test('logEvent - maintains max events limit', () => {
			// Log more than MAX_EVENTS (1000)
			for (let i = 0; i < 1100; i++) {
				const event: AuditEvent = {
					id: `event${i}`,
					type: 'endpoint_registered',
					timestamp: Date.now(),
					extensionId: 'test.extension',
					details: {}
				};
				auditService.logEvent(event);
			}

			const events = auditService.getEvents();
			assert.strictEqual(events.length, 1000);
			// Should have removed oldest events (FIFO)
			assert.strictEqual(events[0].id, 'event100');
			assert.strictEqual(events[999].id, 'event1099');
		});
	});

	suite('Event Retrieval', () => {
		setup(() => {
			// Add some test events
			const baseTime = Date.now();

			auditService.logEvent({
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: baseTime,
				extensionId: 'ext1',
				details: { endpointId: 'endpoint1' }
			});

			auditService.logEvent({
				id: 'event2',
				type: 'invocation_started',
				timestamp: baseTime + 1000,
				extensionId: 'ext1',
				invocationId: 'inv1',
				sessionId: 'session1',
				details: {}
			});

			auditService.logEvent({
				id: 'event3',
				type: 'permission_denied',
				timestamp: baseTime + 2000,
				extensionId: 'ext2',
				details: { reason: 'not granted' }
			});

			auditService.logEvent({
				id: 'event4',
				type: 'invocation_completed',
				timestamp: baseTime + 3000,
				extensionId: 'ext1',
				invocationId: 'inv1',
				sessionId: 'session1',
				details: {}
			});
		});

		test('getEvents - returns all events', () => {
			const events = auditService.getEvents();
			assert.strictEqual(events.length, 4);
		});

		test('getEvents - filters by type', () => {
			const filter: AuditEventFilter = {
				type: 'invocation_started'
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].id, 'event2');
		});

		test('getEvents - filters by extensionId', () => {
			const filter: AuditEventFilter = {
				extensionId: 'ext1'
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 3);
			assert.ok(events.every(e => e.extensionId === 'ext1'));
		});

		test('getEvents - filters by invocationId', () => {
			const filter: AuditEventFilter = {
				invocationId: 'inv1'
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 2);
			assert.ok(events.every(e => e.invocationId === 'inv1'));
		});

		test('getEvents - filters by sessionId', () => {
			const filter: AuditEventFilter = {
				sessionId: 'session1'
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 2);
			assert.ok(events.every(e => e.sessionId === 'session1'));
		});

		test('getEvents - filters by time range', () => {
			const baseTime = Date.now();
			const filter: AuditEventFilter = {
				startTime: baseTime + 1000,
				endTime: baseTime + 2500
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 2);
			assert.strictEqual(events[0].id, 'event2');
			assert.strictEqual(events[1].id, 'event3');
		});

		test('getEvents - combines multiple filters', () => {
			const filter: AuditEventFilter = {
				extensionId: 'ext1',
				invocationId: 'inv1'
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 2);
			assert.ok(events.every(e => e.extensionId === 'ext1' && e.invocationId === 'inv1'));
		});

		test('getEventsByType - returns events of specific type', () => {
			const events = auditService.getEventsByType('endpoint_registered');
			assert.strictEqual(events.length, 1);
			assert.strictEqual(events[0].type, 'endpoint_registered');
		});

		test('getEventsByExtension - returns events for specific extension', () => {
			const events = auditService.getEventsByExtension('ext1');
			assert.strictEqual(events.length, 3);
			assert.ok(events.every(e => e.extensionId === 'ext1'));
		});

		test('getEventsByTimeRange - returns events in time range', () => {
			const baseTime = Date.now();
			const events = auditService.getEventsByTimeRange(baseTime + 500, baseTime + 2500);
			assert.strictEqual(events.length, 2);
		});
	});

	suite('Event Management', () => {
		test('clearEvents - removes all events', () => {
			auditService.logEvent({
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			});

			auditService.logEvent({
				id: 'event2',
				type: 'invocation_started',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			});

			assert.strictEqual(auditService.getEvents().length, 2);

			auditService.clearEvents();

			assert.strictEqual(auditService.getEvents().length, 0);
		});
	});

	suite('Event Immutability', () => {
		test('getEvents returns a copy', () => {
			const event: AuditEvent = {
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			};

			auditService.logEvent(event);

			const events1 = auditService.getEvents();
			const events2 = auditService.getEvents();

			// Should be different array instances
			assert.notStrictEqual(events1, events2);

			// But contain the same data
			assert.deepStrictEqual(events1, events2);
		});

		test('modifying returned events does not affect internal state', () => {
			const event: AuditEvent = {
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			};

			auditService.logEvent(event);

			const events = auditService.getEvents();
			events.push({
				id: 'event2',
				type: 'invocation_started',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			});

			// Internal state should not be affected
			assert.strictEqual(auditService.getEvents().length, 1);
		});
	});

	suite('Edge Cases', () => {
		test('getEvents with no events returns empty array', () => {
			const events = auditService.getEvents();
			assert.strictEqual(events.length, 0);
		});

		test('getEvents with filter that matches nothing returns empty array', () => {
			auditService.logEvent({
				id: 'event1',
				type: 'endpoint_registered',
				timestamp: Date.now(),
				extensionId: 'test.extension',
				details: {}
			});

			const filter: AuditEventFilter = {
				type: 'invocation_started'
			};

			const events = auditService.getEvents(filter);
			assert.strictEqual(events.length, 0);
		});

		test('clearEvents on empty service does not throw', () => {
			auditService.clearEvents();
			// Should not throw
		});
	});
});
