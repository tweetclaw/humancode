/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { EndpointDescriptorDto, ExtHostTestAiInteropShape, IMainContext, MainContext, MainThreadTestAiInteropShape } from './extHost.protocol.js';

export class ExtHostTestAiInterop implements ExtHostTestAiInteropShape {

	private readonly _proxy: MainThreadTestAiInteropShape;
	private readonly _onInvoke = new Emitter<{ invocationId: string; token: CancellationToken; resolve: () => void; reject: (err: any) => void }>();
	readonly onInvoke = this._onInvoke.event;

	private readonly _onDidReceiveChunk = new Emitter<{ invocationId: string; seq: number; text: string; timestamp: number }>();
	readonly onDidReceiveChunk = this._onDidReceiveChunk.event;

	private readonly _pendingInvocations = new Map<string, { resolve: () => void; reject: (err: any) => void }>();

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadTestAiInterop);
	}

	async $onInvoke(invocationId: string, token: CancellationToken): Promise<void> {
		// Return a Promise that will be resolved when the worker completes
		// The token passed here is created by RPC layer and will be properly cancelled
		return new Promise<void>((resolve, reject) => {
			this._pendingInvocations.set(invocationId, { resolve, reject });
			this._onInvoke.fire({ invocationId, token, resolve, reject });
		});
	}

	$onDidReceiveChunk(invocationId: string, seq: number, text: string, timestamp: number): void {
		this._onDidReceiveChunk.fire({ invocationId, seq, text, timestamp });
	}

	async sendChunk(invocationId: string, seq: number, text: string): Promise<void> {
		return this._proxy.$acceptChunk(invocationId, seq, text);
	}

	async onInvocationComplete(invocationId: string): Promise<void> {
		this._pendingInvocations.delete(invocationId);
		return this._proxy.$onInvocationComplete(invocationId);
	}

	registerEndpoint(descriptor: EndpointDescriptorDto): void {
		this._proxy.$registerEndpoint(descriptor);
	}

	unregisterEndpoint(endpointId: string): void {
		this._proxy.$unregisterEndpoint(endpointId);
	}

	async invokeWithRouting(callerId: string, targetId: string, invocationId: string, token: CancellationToken): Promise<void> {
		// The actual routing logic is in MainThread
		// This is just a pass-through that will be exposed to extensions
		return new Promise<void>((resolve, reject) => {
			this._pendingInvocations.set(invocationId, { resolve, reject });
			// We need to call the MainThread method that does routing
			// For now, we'll just call $invoke which will be enhanced in MainThread
			this._proxy.$invoke(invocationId, token).then(resolve, reject);
		});
	}
}
