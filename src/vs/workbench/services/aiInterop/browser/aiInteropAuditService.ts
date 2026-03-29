/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAIInteropAuditService,
	AuditEvent,
	AuditEventFilter,
	AuditEventType
} from '../common/aiInterop.js';

export class AIInteropAuditService extends Disposable implements IAIInteropAuditService {
	declare readonly _serviceBrand: undefined;

	private readonly _events: AuditEvent[] = [];

	private readonly _onDidLogEvent = this._register(new Emitter<AuditEvent>());
	readonly onDidLogEvent = this._onDidLogEvent.event;

	logEvent(event: AuditEvent): void {
		this._events.push(event);
		this._onDidLogEvent.fire(event);
	}

	getEvents(filter?: AuditEventFilter): AuditEvent[] {
		if (!filter) {
			return [...this._events];
		}

		return this._events.filter(event => {
			if (filter.type && event.type !== filter.type) {
				return false;
			}
			if (filter.extensionId && event.extensionId !== filter.extensionId) {
				return false;
			}
			if (filter.invocationId && event.invocationId !== filter.invocationId) {
				return false;
			}
			if (filter.sessionId && event.sessionId !== filter.sessionId) {
				return false;
			}
			if (filter.startTime && event.timestamp < filter.startTime) {
				return false;
			}
			if (filter.endTime && event.timestamp > filter.endTime) {
				return false;
			}
			return true;
		});
	}

	getEventsByType(type: AuditEventType): AuditEvent[] {
		return this._events.filter(event => event.type === type);
	}

	getEventsByExtension(extensionId: string): AuditEvent[] {
		return this._events.filter(event => event.extensionId === extensionId);
	}

	getEventsByTimeRange(start: number, end: number): AuditEvent[] {
		return this._events.filter(event => event.timestamp >= start && event.timestamp <= end);
	}

	clearEvents(): void {
		this._events.length = 0;
	}
}

registerSingleton(IAIInteropAuditService, AIInteropAuditService, InstantiationType.Delayed);
