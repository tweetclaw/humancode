/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostContext, extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { ExtHostContext, ExtHostTestAiInteropShape, MainContext, MainThreadTestAiInteropShape } from '../common/extHost.protocol.js';

interface ChunkData {
	seq: number;
	text: string;
	timestamp: number;
}

interface InvocationStats {
	invocationId: string;
	chunks: ChunkData[];
	startTime: number;
	endTime?: number;
}

@extHostNamedCustomer(MainContext.MainThreadTestAiInterop)
export class MainThreadTestAiInterop extends Disposable implements MainThreadTestAiInteropShape {

	private readonly _proxy: ExtHostTestAiInteropShape;
	private readonly _onDidReceiveChunk = this._register(new Emitter<{ invocationId: string; seq: number; text: string; timestamp: number }>());
	readonly onDidReceiveChunk = this._onDidReceiveChunk.event;

	private readonly _invocationStats = new Map<string, InvocationStats>();

	constructor(
		extHostContext: IExtHostContext,
		@ILogService private readonly _logService: ILogService
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTestAiInterop);
	}

	$acceptChunk(invocationId: string, seq: number, text: string): void {
		const timestamp = Date.now();

		// Get or create invocation stats
		let stats = this._invocationStats.get(invocationId);
		if (!stats) {
			stats = {
				invocationId,
				chunks: [],
				startTime: timestamp
			};
			this._invocationStats.set(invocationId, stats);
		}

		// Record chunk
		stats.chunks.push({ seq, text, timestamp });

		// Notify ExtHost so it can fire the event for extensions
		this._proxy.$onDidReceiveChunk(invocationId, seq, text, timestamp);

		this._logService.trace(`[TestAiInterop] Received chunk ${seq} for invocation ${invocationId}`);
	}

	async $invoke(invocationId: string): Promise<void> {
		this._logService.info(`[TestAiInterop] Invoking worker with invocationId: ${invocationId}`);

		// Initialize stats
		this._invocationStats.set(invocationId, {
			invocationId,
			chunks: [],
			startTime: Date.now()
		});

		// Notify ExtHost to trigger worker
		this._proxy.$onInvoke(invocationId);
	}

	$getStats(invocationId: string): InvocationStats | undefined {
		return this._invocationStats.get(invocationId);
	}

	getAllStats(): InvocationStats[] {
		return Array.from(this._invocationStats.values());
	}

	$clearStats(): void {
		this._invocationStats.clear();
	}
}
