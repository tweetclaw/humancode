/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter } from '../../../base/common/event.js';
import { IMainContext } from './extHost.protocol.js';
import { ExtHostTestAiInteropShape, MainContext, MainThreadTestAiInteropShape } from './extHost.protocol.js';

export class ExtHostTestAiInterop implements ExtHostTestAiInteropShape {

	private readonly _proxy: MainThreadTestAiInteropShape;
	private readonly _onInvoke = new Emitter<string>();
	readonly onInvoke = this._onInvoke.event;

	private readonly _onDidReceiveChunk = new Emitter<{ invocationId: string; seq: number; text: string; timestamp: number }>();
	readonly onDidReceiveChunk = this._onDidReceiveChunk.event;

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadTestAiInterop);
	}

	$onInvoke(invocationId: string): void {
		this._onInvoke.fire(invocationId);
	}

	$onDidReceiveChunk(invocationId: string, seq: number, text: string, timestamp: number): void {
		this._onDidReceiveChunk.fire({ invocationId, seq, text, timestamp });
	}

	async sendChunk(invocationId: string, seq: number, text: string): Promise<void> {
		return this._proxy.$acceptChunk(invocationId, seq, text);
	}
}
