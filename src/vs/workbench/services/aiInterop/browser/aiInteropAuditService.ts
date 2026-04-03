/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAIInteropAuditService,
	AuditEvent,
	AuditEventFilter,
	AuditEventType
} from '../common/aiInterop.js';

const MAX_EVENTS = 1000;

export class AIInteropAuditService extends Disposable implements IAIInteropAuditService {
	declare readonly _serviceBrand: undefined;

	private readonly _events: AuditEvent[] = [];

	private readonly _onDidLogEvent = this._register(new Emitter<AuditEvent>());
	readonly onDidLogEvent = this._onDidLogEvent.event;

	constructor(
		@ILogService private readonly logService: ILogService
	) {
		super();
	}

	logEvent(event: AuditEvent): void {
		this._events.push(event);

		// Maintain max events limit (FIFO)
		if (this._events.length > MAX_EVENTS) {
			this._events.shift();
		}

		this._onDidLogEvent.fire(event);
		this.logService.trace(`[AuditService] Event logged: ${event.type} (id: ${event.id})`);
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
		const count = this._events.length;
		this._events.length = 0;
		this.logService.info(`[AuditService] Cleared ${count} events`);
	}
}

registerSingleton(IAIInteropAuditService, AIInteropAuditService, InstantiationType.Delayed);
