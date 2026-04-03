/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter, Event } from '../../../base/common/event.js';
import {
	ExtHostAiInteropShape,
	IMainContext,
	MainContext,
	MainThreadAiInteropShape,
	InvocationRequestDto,
	InvocationChunkDto,
	AiInteropErrorDto
} from './extHost.protocol.js';

// Internal type definitions to avoid vscode namespace dependency during compilation
interface AiInteropInvocationRequest {
	prompt?: string;
	context?: { [key: string]: any };
	options?: {
		streaming?: boolean;
		timeout?: number;
		maxTokens?: number;
		temperature?: number;
	};
}

interface AiInteropChunk {
	seq: number;
	text: string;
	metadata?: { [key: string]: any };
}

interface AiInteropError {
	code: string;
	message: string;
	details?: { [key: string]: any };
}

interface AiInteropEndpointCapability {
	type: 'streaming' | 'tool' | 'mcp' | 'cli';
	config?: { [key: string]: any };
}

interface AiInteropEndpointDescriptor {
	id: string;
	extensionId: string;
	displayName: string;
	description?: string;
	capabilities: AiInteropEndpointCapability[];
	hostKind: 'local' | 'remote' | 'web';
	remoteAuthority?: string;
	metadata?: { [key: string]: any };
}

interface AiInteropInvocationHandle {
	invocationId: string;
	onChunk: Event<AiInteropChunk>;
	onComplete: Event<any>;
	onError: Event<AiInteropError>;
	cancel(): void;
}

export class ExtHostAiInterop implements ExtHostAiInteropShape {

	private readonly _proxy: MainThreadAiInteropShape;
	private readonly _invocationHandlers = new Map<string, (request: AiInteropInvocationRequest, token: CancellationToken) => Promise<void>>();

	// Event emitters
	private readonly _onDidReceiveChunk = new Emitter<{ invocationId: string; chunk: AiInteropChunk }>();
	private readonly _onDidComplete = new Emitter<{ invocationId: string; result?: any }>();
	private readonly _onDidError = new Emitter<{ invocationId: string; error: AiInteropError }>();
	private readonly _onDidCancel = new Emitter<string>();

	constructor(mainContext: IMainContext) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadAiInterop);
	}

	// ========================================
	// ExtHost Shape Implementation (MainThread → ExtHost)
	// ========================================

	async $onInvoke(invocationId: string, callerId: string, request: InvocationRequestDto, token: CancellationToken): Promise<void> {
		// Find handler for the target endpoint
		// Note: We need to determine which endpoint this invocation is for
		// For now, we'll store handlers by endpoint ID and look them up
		// This will be enhanced when we have proper endpoint-to-handler mapping
	}

	$onChunk(invocationId: string, chunk: InvocationChunkDto): void {
		this._onDidReceiveChunk.fire({
			invocationId,
			chunk: {
				seq: chunk.seq,
				text: chunk.text,
				metadata: chunk.metadata
			}
		});
	}

	$onComplete(invocationId: string, result?: any): void {
		this._onDidComplete.fire({ invocationId, result });
	}

	$onError(invocationId: string, error: AiInteropErrorDto): void {
		this._onDidError.fire({
			invocationId,
			error: {
				code: error.code,
				message: error.message,
				details: error.details
			}
		});
	}

	$onCancel(invocationId: string): void {
		this._onDidCancel.fire(invocationId);
	}

	// ========================================
	// API exposed to extensions
	// ========================================

	registerEndpoint(
		descriptor: AiInteropEndpointDescriptor,
		handler: (request: AiInteropInvocationRequest, token: CancellationToken) => Promise<void>
	): { dispose(): void } {
		const endpointId = descriptor.id;
		this._invocationHandlers.set(endpointId, handler);

		this._proxy.$registerEndpoint({
			id: descriptor.id,
			extensionId: descriptor.extensionId,
			displayName: descriptor.displayName,
			description: descriptor.description,
			capabilities: descriptor.capabilities || [],
			hostKind: descriptor.hostKind,
			remoteAuthority: descriptor.remoteAuthority,
			metadata: descriptor.metadata
		});

		return {
			dispose: () => {
				this._invocationHandlers.delete(endpointId);
				this._proxy.$unregisterEndpoint(endpointId);
			}
		};
	}

	async invoke(
		callerId: string,
		targetId: string,
		request: AiInteropInvocationRequest,
		token: CancellationToken
	): Promise<AiInteropInvocationHandle> {
		const invocationId = await this._proxy.$invoke(callerId, targetId, {
			prompt: request.prompt,
			context: request.context,
			options: request.options
		}, token);

		return {
			invocationId,
			onChunk: Event.map(
				Event.filter(this._onDidReceiveChunk.event, e => e.invocationId === invocationId),
				e => e.chunk
			),
			onComplete: Event.map(
				Event.filter(this._onDidComplete.event, e => e.invocationId === invocationId),
				e => e.result
			),
			onError: Event.map(
				Event.filter(this._onDidError.event, e => e.invocationId === invocationId),
				e => e.error
			),
			cancel: () => this._proxy.$cancel(invocationId)
		};
	}

	async sendChunk(invocationId: string, chunk: AiInteropChunk): Promise<void> {
		await this._proxy.$sendChunk(invocationId, {
			seq: chunk.seq,
			text: chunk.text,
			metadata: chunk.metadata
		});
	}

	async complete(invocationId: string, result?: any): Promise<void> {
		await this._proxy.$complete(invocationId, result);
	}

	async fail(invocationId: string, error: AiInteropError): Promise<void> {
		await this._proxy.$fail(invocationId, {
			code: error.code,
			message: error.message,
			details: error.details
		});
	}

	async getEndpoint(endpointId: string): Promise<AiInteropEndpointDescriptor | undefined> {
		const dto = await this._proxy.$getEndpoint(endpointId);
		if (!dto) {
			return undefined;
		}
		return {
			id: dto.id,
			extensionId: dto.extensionId,
			displayName: dto.displayName,
			description: dto.description,
			capabilities: dto.capabilities,
			hostKind: dto.hostKind,
			remoteAuthority: dto.remoteAuthority,
			metadata: dto.metadata
		};
	}

	async getAllEndpoints(): Promise<AiInteropEndpointDescriptor[]> {
		const dtos = await this._proxy.$getAllEndpoints();
		return dtos.map(dto => ({
			id: dto.id,
			extensionId: dto.extensionId,
			displayName: dto.displayName,
			description: dto.description,
			capabilities: dto.capabilities,
			hostKind: dto.hostKind,
			remoteAuthority: dto.remoteAuthority,
			metadata: dto.metadata
		}));
	}
}
