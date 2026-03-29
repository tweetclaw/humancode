/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtHostContext, extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IAIInteropBusService } from '../../services/aiInterop/common/aiInterop.js';
import {
	ExtHostContext,
	ExtHostAiInteropShape,
	MainContext,
	MainThreadAiInteropShape,
	EndpointDescriptorDto,
	InvocationRequestDto,
	InvocationChunkDto,
	InvocationDescriptorDto,
	AiInteropErrorDto
} from '../common/extHost.protocol.js';

@extHostNamedCustomer(MainContext.MainThreadAiInterop)
export class MainThreadAiInterop extends Disposable implements MainThreadAiInteropShape {

	private readonly _proxy: ExtHostAiInteropShape;

	constructor(
		extHostContext: IExtHostContext,
		@IAIInteropBusService private readonly busService: IAIInteropBusService
	) {
		super();
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostAiInterop);

		// Subscribe to Bus events and forward to ExtHost
		this._register(this.busService.onDidReceiveChunk(({ invocationId, chunk }) => {
			this._proxy.$onChunk(invocationId, chunk);
		}));

		this._register(this.busService.onDidCompleteInvocation(({ invocationId, result }) => {
			this._proxy.$onComplete(invocationId, result);
		}));

		this._register(this.busService.onDidFailInvocation(({ invocationId, error }) => {
			this._proxy.$onError(invocationId, {
				code: error.code,
				message: error.message,
				details: error.details
			});
		}));

		this._register(this.busService.onDidCancelInvocation(invocationId => {
			this._proxy.$onCancel(invocationId);
		}));
	}

	async $registerEndpoint(descriptor: EndpointDescriptorDto): Promise<void> {
		await this.busService.registerEndpoint({
			id: descriptor.id,
			extensionId: descriptor.extensionId,
			displayName: descriptor.displayName,
			description: descriptor.description,
			capabilities: descriptor.capabilities || [],
			hostKind: descriptor.hostKind,
			remoteAuthority: descriptor.remoteAuthority,
			metadata: descriptor.metadata
		});
	}

	async $unregisterEndpoint(endpointId: string): Promise<void> {
		await this.busService.unregisterEndpoint(endpointId);
	}

	async $invoke(callerId: string, targetId: string, request: InvocationRequestDto, token: CancellationToken): Promise<string> {
		const handle = await this.busService.invoke(callerId, targetId, {
			prompt: request.prompt,
			context: request.context,
			options: request.options
		}, token);

		// When invocation starts, notify target ExtHost
		const invocation = this.busService.getInvocation(handle.invocationId);
		if (invocation) {
			this._proxy.$onInvoke(handle.invocationId, callerId, request, token);
		}

		return handle.invocationId;
	}

	async $sendChunk(invocationId: string, chunk: InvocationChunkDto): Promise<void> {
		await this.busService.sendChunk(invocationId, chunk);
	}

	async $complete(invocationId: string, result?: any): Promise<void> {
		await this.busService.complete(invocationId, result);
	}

	async $fail(invocationId: string, error: AiInteropErrorDto): Promise<void> {
		await this.busService.fail(invocationId, {
			code: error.code as any,
			message: error.message,
			details: error.details
		});
	}

	async $cancel(invocationId: string): Promise<void> {
		await this.busService.cancel(invocationId);
	}

	async $getEndpoint(endpointId: string): Promise<EndpointDescriptorDto | undefined> {
		const endpoint = this.busService.getEndpoint(endpointId);
		if (!endpoint) {
			return undefined;
		}
		return {
			id: endpoint.id,
			extensionId: endpoint.extensionId,
			displayName: endpoint.displayName,
			description: endpoint.description,
			capabilities: endpoint.capabilities,
			hostKind: endpoint.hostKind,
			remoteAuthority: endpoint.remoteAuthority,
			metadata: endpoint.metadata
		};
	}

	async $getAllEndpoints(): Promise<EndpointDescriptorDto[]> {
		return this.busService.getAllEndpoints().map(endpoint => ({
			id: endpoint.id,
			extensionId: endpoint.extensionId,
			displayName: endpoint.displayName,
			description: endpoint.description,
			capabilities: endpoint.capabilities,
			hostKind: endpoint.hostKind,
			remoteAuthority: endpoint.remoteAuthority,
			metadata: endpoint.metadata
		}));
	}

	async $getInvocation(invocationId: string): Promise<InvocationDescriptorDto | undefined> {
		const invocation = this.busService.getInvocation(invocationId);
		if (!invocation) {
			return undefined;
		}
		return {
			id: invocation.id,
			callerId: invocation.callerId,
			targetId: invocation.targetId,
			sessionId: invocation.sessionId,
			request: invocation.request,
			status: invocation.status,
			startTime: invocation.startTime,
			endTime: invocation.endTime,
			error: invocation.error ? {
				code: invocation.error.code,
				message: invocation.error.message,
				details: invocation.error.details
			} : undefined,
			metadata: invocation.metadata
		};
	}
}
