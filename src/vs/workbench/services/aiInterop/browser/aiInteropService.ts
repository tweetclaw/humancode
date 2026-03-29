/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAIInteropBusService,
	IAISessionBrokerService,
	IAIInteropPolicyService,
	IAIInteropAuditService,
	EndpointDescriptor,
	InvocationDescriptor,
	InvocationRequest,
	InvocationHandle,
	InvocationChunk,
	AiInteropError,
	AiInteropErrorCode
} from '../common/aiInterop.js';

export class AIInteropService extends Disposable implements IAIInteropBusService {
	declare readonly _serviceBrand: undefined;

	// Internal state
	private readonly _endpoints = new Map<string, EndpointDescriptor>();
	private readonly _invocations = new Map<string, InvocationDescriptor>();
	private readonly _invocationEmitters = new Map<string, {
		onChunk: Emitter<InvocationChunk>;
		onComplete: Emitter<any>;
		onError: Emitter<AiInteropError>;
	}>();

	// Event emitters
	private readonly _onDidRegisterEndpoint = this._register(new Emitter<EndpointDescriptor>());
	readonly onDidRegisterEndpoint = this._onDidRegisterEndpoint.event;

	private readonly _onDidUnregisterEndpoint = this._register(new Emitter<string>());
	readonly onDidUnregisterEndpoint = this._onDidUnregisterEndpoint.event;

	private readonly _onDidStartInvocation = this._register(new Emitter<InvocationDescriptor>());
	readonly onDidStartInvocation = this._onDidStartInvocation.event;

	private readonly _onDidReceiveChunk = this._register(new Emitter<{ invocationId: string; chunk: InvocationChunk }>());
	readonly onDidReceiveChunk = this._onDidReceiveChunk.event;

	private readonly _onDidCompleteInvocation = this._register(new Emitter<{ invocationId: string; result?: any }>());
	readonly onDidCompleteInvocation = this._onDidCompleteInvocation.event;

	private readonly _onDidFailInvocation = this._register(new Emitter<{ invocationId: string; error: AiInteropError }>());
	readonly onDidFailInvocation = this._onDidFailInvocation.event;

	private readonly _onDidCancelInvocation = this._register(new Emitter<string>());
	readonly onDidCancelInvocation = this._onDidCancelInvocation.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IAISessionBrokerService private readonly sessionBroker: IAISessionBrokerService,
		@IAIInteropPolicyService private readonly policyService: IAIInteropPolicyService,
		@IAIInteropAuditService private readonly auditService: IAIInteropAuditService
	) {
		super();
	}

	// ========================================
	// Endpoint Management
	// ========================================

	async registerEndpoint(descriptor: EndpointDescriptor): Promise<void> {
		// Validate descriptor
		if (!descriptor.id || !descriptor.extensionId) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.INVALID_ARGUMENT,
				message: 'Invalid endpoint descriptor: id and extensionId are required'
			};
			throw new Error(error.message);
		}

		// Check if already registered
		if (this._endpoints.has(descriptor.id)) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.ENDPOINT_ALREADY_REGISTERED,
				message: `Endpoint ${descriptor.id} already registered`
			};
			throw new Error(error.message);
		}

		// Register endpoint
		this._endpoints.set(descriptor.id, descriptor);

		// Log audit event
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'endpoint_registered',
			timestamp: Date.now(),
			extensionId: descriptor.extensionId,
			details: { endpointId: descriptor.id, hostKind: descriptor.hostKind, remoteAuthority: descriptor.remoteAuthority }
		});

		// Fire event
		this._onDidRegisterEndpoint.fire(descriptor);

		// Log
		this.logService.info(`[AIInterop] Endpoint registered: ${descriptor.id} (${descriptor.extensionId})`);
	}

	async unregisterEndpoint(endpointId: string): Promise<void> {
		// Check if endpoint exists
		const endpoint = this._endpoints.get(endpointId);
		if (!endpoint) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.ENDPOINT_NOT_FOUND,
				message: `Endpoint ${endpointId} not found`
			};
			throw new Error(error.message);
		}

		// Cancel all related invocations
		for (const [invocationId, invocation] of this._invocations) {
			if (invocation.callerId === endpointId || invocation.targetId === endpointId) {
				await this.cancel(invocationId);
			}
		}

		// Unregister endpoint
		this._endpoints.delete(endpointId);

		// Log audit event
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'endpoint_unregistered',
			timestamp: Date.now(),
			extensionId: endpoint.extensionId,
			details: { endpointId }
		});

		// Fire event
		this._onDidUnregisterEndpoint.fire(endpointId);

		// Log
		this.logService.info(`[AIInterop] Endpoint unregistered: ${endpointId}`);
	}

	getEndpoint(endpointId: string): EndpointDescriptor | undefined {
		return this._endpoints.get(endpointId);
	}

	getAllEndpoints(): EndpointDescriptor[] {
		return Array.from(this._endpoints.values());
	}

	// ========================================
	// Invocation Management
	// ========================================

	async invoke(
		callerId: string,
		targetId: string,
		request: InvocationRequest,
		token: CancellationToken
	): Promise<InvocationHandle> {
		// Validate caller and target exist
		const caller = this._endpoints.get(callerId);
		const target = this._endpoints.get(targetId);

		if (!caller) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.ENDPOINT_NOT_FOUND,
				message: `Caller endpoint not found: ${callerId}`
			};
			this.logService.error(`[AIInterop] ${error.message}`);
			throw new Error(error.message);
		}

		if (!target) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.ENDPOINT_NOT_FOUND,
				message: `Target endpoint not found: ${targetId}`
			};
			this.logService.error(`[AIInterop] ${error.message}`);
			throw new Error(error.message);
		}

		// Check routing policy
		const routeDecision = this.policyService.canRoute(caller, target);
		if (!routeDecision.allowed) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.HOST_KIND_UNSUPPORTED,
				message: `Route not allowed: ${routeDecision.reason}`,
				details: { reason: routeDecision.reason }
			};
			this.auditService.logEvent({
				id: generateUuid(),
				type: 'permission_denied',
				timestamp: Date.now(),
				details: { callerId, targetId, reason: routeDecision.reason }
			});
			this.logService.error(`[AIInterop] ${error.message}`);
			throw new Error(error.message);
		}

		// Check permission
		const permissionDecision = await this.policyService.checkPermission(caller, target, request);
		if (!permissionDecision.allowed) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.PERMISSION_DENIED,
				message: `Permission denied: ${permissionDecision.reason}`,
				details: { reason: permissionDecision.reason }
			};
			this.auditService.logEvent({
				id: generateUuid(),
				type: 'permission_denied',
				timestamp: Date.now(),
				details: { callerId, targetId, reason: permissionDecision.reason }
			});
			this.logService.error(`[AIInterop] ${error.message}`);
			throw new Error(error.message);
		}

		// Create invocation descriptor
		const invocationId = generateUuid();
		const invocation: InvocationDescriptor = {
			id: invocationId,
			callerId,
			targetId,
			request,
			status: 'pending',
			startTime: Date.now()
		};

		// Associate with active session if exists
		const activeSession = this.sessionBroker.getActiveSession();
		if (activeSession) {
			invocation.sessionId = activeSession.id;
			await this.sessionBroker.associateInvocation(activeSession.id, invocationId);
		}

		// Store invocation
		this._invocations.set(invocationId, invocation);

		// Create event emitters
		const onChunkEmitter = this._register(new Emitter<InvocationChunk>());
		const onCompleteEmitter = this._register(new Emitter<any>());
		const onErrorEmitter = this._register(new Emitter<AiInteropError>());

		this._invocationEmitters.set(invocationId, {
			onChunk: onChunkEmitter,
			onComplete: onCompleteEmitter,
			onError: onErrorEmitter
		});

		// Listen for cancellation
		token.onCancellationRequested(() => {
			this.cancel(invocationId);
		});

		// Update status to running
		invocation.status = 'running';
		this._invocations.set(invocationId, invocation);

		// Log audit event
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'invocation_started',
			timestamp: Date.now(),
			invocationId,
			details: { callerId, targetId, sessionId: invocation.sessionId }
		});

		// Fire event
		this._onDidStartInvocation.fire(invocation);

		// Log
		this.logService.info(`[AIInterop] Invocation started: ${invocationId} (${callerId} -> ${targetId})`);

		// Return handle
		return {
			invocationId,
			onChunk: onChunkEmitter.event,
			onComplete: onCompleteEmitter.event,
			onError: onErrorEmitter.event,
			cancel: () => this.cancel(invocationId)
		};
	}

	async sendChunk(invocationId: string, chunk: InvocationChunk): Promise<void> {
		// Validate invocation exists and is running
		const invocation = this._invocations.get(invocationId);
		if (!invocation) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.INVOCATION_NOT_FOUND,
				message: `Invocation ${invocationId} not found`
			};
			throw new Error(error.message);
		}

		if (invocation.status !== 'running') {
			throw new Error(`Invocation ${invocationId} is not running (status: ${invocation.status})`);
		}

		// Fire chunk event to Bus listeners
		this._onDidReceiveChunk.fire({ invocationId, chunk });

		// Fire chunk event to invocation handle
		const emitters = this._invocationEmitters.get(invocationId);
		if (emitters) {
			emitters.onChunk.fire(chunk);
		}
	}

	async complete(invocationId: string, result?: any): Promise<void> {
		// Validate invocation exists
		const invocation = this._invocations.get(invocationId);
		if (!invocation) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.INVOCATION_NOT_FOUND,
				message: `Invocation ${invocationId} not found`
			};
			throw new Error(error.message);
		}

		// Update status
		invocation.status = 'completed';
		invocation.endTime = Date.now();
		this._invocations.set(invocationId, invocation);

		// Log audit event
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'invocation_completed',
			timestamp: Date.now(),
			invocationId,
			details: { duration: invocation.endTime - invocation.startTime }
		});

		// Fire event to Bus listeners
		this._onDidCompleteInvocation.fire({ invocationId, result });

		// Fire event to invocation handle
		const emitters = this._invocationEmitters.get(invocationId);
		if (emitters) {
			emitters.onComplete.fire(result);
		}

		// Cleanup emitters
		this._cleanupInvocationEmitters(invocationId);

		// Log
		this.logService.info(`[AIInterop] Invocation completed: ${invocationId} (duration: ${invocation.endTime - invocation.startTime}ms)`);
	}

	async fail(invocationId: string, error: AiInteropError): Promise<void> {
		// Validate invocation exists
		const invocation = this._invocations.get(invocationId);
		if (!invocation) {
			const err: AiInteropError = {
				code: AiInteropErrorCode.INVOCATION_NOT_FOUND,
				message: `Invocation ${invocationId} not found`
			};
			throw new Error(err.message);
		}

		// Update status
		invocation.status = 'failed';
		invocation.endTime = Date.now();
		invocation.error = error;
		this._invocations.set(invocationId, invocation);

		// Log audit event
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'invocation_failed',
			timestamp: Date.now(),
			invocationId,
			details: { error: error.code, message: error.message }
		});

		// Fire event to Bus listeners
		this._onDidFailInvocation.fire({ invocationId, error });

		// Fire event to invocation handle
		const emitters = this._invocationEmitters.get(invocationId);
		if (emitters) {
			emitters.onError.fire(error);
		}

		// Cleanup emitters
		this._cleanupInvocationEmitters(invocationId);

		// Log
		this.logService.error(`[AIInterop] Invocation failed: ${invocationId}`, error);
	}

	async cancel(invocationId: string): Promise<void> {
		// Validate invocation exists
		const invocation = this._invocations.get(invocationId);
		if (!invocation) {
			const error: AiInteropError = {
				code: AiInteropErrorCode.INVOCATION_NOT_FOUND,
				message: `Invocation ${invocationId} not found`
			};
			throw new Error(error.message);
		}

		// Only cancel pending or running invocations
		if (invocation.status !== 'pending' && invocation.status !== 'running') {
			return; // Already finished, no need to cancel
		}

		// Update status
		invocation.status = 'canceled';
		invocation.endTime = Date.now();
		this._invocations.set(invocationId, invocation);

		// Log audit event
		this.auditService.logEvent({
			id: generateUuid(),
			type: 'invocation_canceled',
			timestamp: Date.now(),
			invocationId,
			details: {}
		});

		// Fire event
		this._onDidCancelInvocation.fire(invocationId);

		// Cleanup emitters
		this._cleanupInvocationEmitters(invocationId);

		// Log
		this.logService.info(`[AIInterop] Invocation canceled: ${invocationId}`);
	}

	// ========================================
	// Query Methods
	// ========================================

	getInvocation(invocationId: string): InvocationDescriptor | undefined {
		return this._invocations.get(invocationId);
	}

	getAllInvocations(): InvocationDescriptor[] {
		return Array.from(this._invocations.values());
	}

	// ========================================
	// Private Helpers
	// ========================================

	private _cleanupInvocationEmitters(invocationId: string): void {
		const emitters = this._invocationEmitters.get(invocationId);
		if (emitters) {
			emitters.onChunk.dispose();
			emitters.onComplete.dispose();
			emitters.onError.dispose();
			this._invocationEmitters.delete(invocationId);
		}
	}
}

registerSingleton(IAIInteropBusService, AIInteropService, InstantiationType.Delayed);
