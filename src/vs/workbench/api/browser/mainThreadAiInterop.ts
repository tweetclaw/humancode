/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { IExtHostContext, extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { IAIInteropBusService, IAISessionBrokerService, IAIInteropPolicyService, IAIInteropAuditService } from '../../services/aiInterop/common/aiInterop.js';
import {
	ExtHostContext,
	ExtHostAiInteropShape,
	MainContext,
	MainThreadAiInteropShape,
	EndpointDescriptorDto,
	InvocationRequestDto,
	InvocationChunkDto,
	InvocationDescriptorDto,
	AiInteropErrorDto,
	SessionConfigDto,
	SessionDescriptorDto,
	ParticipantDescriptorDto,
	PermissionResultDto,
	PermissionRecordDto,
	AuditEventDto,
	AuditEventFilterDto
} from '../common/extHost.protocol.js';

@extHostNamedCustomer(MainContext.MainThreadAiInterop)
export class MainThreadAiInterop extends Disposable implements MainThreadAiInteropShape {

	private readonly _proxy: ExtHostAiInteropShape;

	constructor(
		extHostContext: IExtHostContext,
		@IAIInteropBusService private readonly busService: IAIInteropBusService,
		@IAISessionBrokerService private readonly sessionBroker: IAISessionBrokerService,
		@IAIInteropPolicyService private readonly policyService: IAIInteropPolicyService,
		@IAIInteropAuditService private readonly auditService: IAIInteropAuditService
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

	// ========================================
	// Session Broker Methods
	// ========================================

	async $createSession(config: SessionConfigDto): Promise<SessionDescriptorDto> {
		const session = await this.sessionBroker.createSession({
			displayName: config.displayName,
			description: config.description,
			metadata: config.metadata
		});
		return {
			id: session.id,
			displayName: session.displayName,
			description: session.description,
			status: session.status,
			participants: session.participants,
			invocations: session.invocations,
			createdAt: session.createdAt,
			lastActiveAt: session.lastActiveAt,
			metadata: session.metadata
		};
	}

	async $deleteSession(sessionId: string): Promise<void> {
		await this.sessionBroker.deleteSession(sessionId);
	}

	async $getSession(sessionId: string): Promise<SessionDescriptorDto | undefined> {
		const session = this.sessionBroker.getSession(sessionId);
		if (!session) {
			return undefined;
		}
		return {
			id: session.id,
			displayName: session.displayName,
			description: session.description,
			status: session.status,
			participants: session.participants,
			invocations: session.invocations,
			createdAt: session.createdAt,
			lastActiveAt: session.lastActiveAt,
			metadata: session.metadata
		};
	}

	async $getAllSessions(): Promise<SessionDescriptorDto[]> {
		return this.sessionBroker.getAllSessions().map(session => ({
			id: session.id,
			displayName: session.displayName,
			description: session.description,
			status: session.status,
			participants: session.participants,
			invocations: session.invocations,
			createdAt: session.createdAt,
			lastActiveAt: session.lastActiveAt,
			metadata: session.metadata
		}));
	}

	async $addParticipant(sessionId: string, participant: ParticipantDescriptorDto): Promise<void> {
		await this.sessionBroker.addParticipant(sessionId, participant);
	}

	async $removeParticipant(sessionId: string, participantId: string): Promise<void> {
		await this.sessionBroker.removeParticipant(sessionId, participantId);
	}

	async $getActiveSession(): Promise<SessionDescriptorDto | undefined> {
		const session = this.sessionBroker.getActiveSession();
		if (!session) {
			return undefined;
		}
		return {
			id: session.id,
			displayName: session.displayName,
			description: session.description,
			status: session.status,
			participants: session.participants,
			invocations: session.invocations,
			createdAt: session.createdAt,
			lastActiveAt: session.lastActiveAt,
			metadata: session.metadata
		};
	}

	async $setActiveSession(sessionId: string): Promise<void> {
		await this.sessionBroker.setActiveSession(sessionId);
	}

	// ========================================
	// Policy Service Methods
	// ========================================

	async $checkPermission(callerId: string, targetId: string): Promise<PermissionResultDto> {
		const caller = this.busService.getEndpoint(callerId);
		const target = this.busService.getEndpoint(targetId);
		if (!caller || !target) {
			return { allowed: false, reason: 'Endpoint not found' };
		}
		const decision = await this.policyService.checkPermission(caller, target, {});
		return {
			allowed: decision.allowed,
			reason: decision.reason,
			scope: decision.scope
		};
	}

	async $requestPermission(callerId: string, targetId: string): Promise<PermissionResultDto> {
		const caller = this.busService.getEndpoint(callerId);
		const target = this.busService.getEndpoint(targetId);
		if (!caller || !target) {
			return { allowed: false, reason: 'Endpoint not found' };
		}
		const decision = await this.policyService.requestPermission(caller, target, {});
		return {
			allowed: decision.allowed,
			reason: decision.reason,
			scope: decision.scope
		};
	}

	async $getPermissions(callerId?: string): Promise<PermissionRecordDto[]> {
		return this.policyService.getPermissions(callerId).map(record => ({
			callerId: record.callerId,
			targetId: record.targetId,
			scope: record.scope,
			grantedAt: record.grantedAt,
			expiresAt: record.expiresAt
		}));
	}

	// ========================================
	// Audit Service Methods
	// ========================================

	async $getAuditEvents(filter?: AuditEventFilterDto): Promise<AuditEventDto[]> {
		const auditFilter = filter ? {
			type: filter.type as any,
			extensionId: filter.extensionId,
			invocationId: filter.invocationId,
			sessionId: filter.sessionId,
			startTime: filter.startTime,
			endTime: filter.endTime
		} : undefined;

		return this.auditService.getEvents(auditFilter).map(event => ({
			id: event.id,
			type: event.type,
			timestamp: event.timestamp,
			extensionId: event.extensionId,
			invocationId: event.invocationId,
			sessionId: event.sessionId,
			details: event.details
		}));
	}

	async $clearAuditEvents(): Promise<void> {
		this.auditService.clearEvents();
	}
}
