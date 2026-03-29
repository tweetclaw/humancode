/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { CancellationToken } from '../../../base/common/cancellation.js';
import { Emitter } from '../../../base/common/event.js';
import { Disposable } from '../../../base/common/lifecycle.js';
import { ILogService } from '../../../platform/log/common/log.js';
import { IExtHostContext, extHostNamedCustomer } from '../../services/extensions/common/extHostCustomers.js';
import { AiInteropErrorCode, EndpointDescriptorDto, ExtHostContext, ExtHostTestAiInteropShape, MainContext, MainThreadTestAiInteropShape } from '../common/extHost.protocol.js';

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

interface AuditLogEntry {
	type: 'invocation_rejected' | 'invocation_success';
	timestamp: number;
	callerId: string;
	targetId: string;
	reason?: string;
	details?: {
		callerHostKind?: string;
		callerRemoteAuthority?: string;
		targetHostKind?: string;
		targetRemoteAuthority?: string;
	};
}

@extHostNamedCustomer(MainContext.MainThreadTestAiInterop)
export class MainThreadTestAiInterop extends Disposable implements MainThreadTestAiInteropShape {

	private readonly _proxy: ExtHostTestAiInteropShape;
	private readonly _onDidReceiveChunk = this._register(new Emitter<{ invocationId: string; seq: number; text: string; timestamp: number }>());
	readonly onDidReceiveChunk = this._onDidReceiveChunk.event;

	private readonly _invocationStats = new Map<string, InvocationStats>();
	private readonly _endpoints = new Map<string, EndpointDescriptorDto>();
	private readonly _auditLog: AuditLogEntry[] = [];

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

	async $invoke(invocationId: string, token: CancellationToken): Promise<void> {
		this._logService.info(`[TestAiInterop] Invoking worker with invocationId: ${invocationId}`);

		// Initialize stats
		this._invocationStats.set(invocationId, {
			invocationId,
			chunks: [],
			startTime: Date.now()
		});

		// Call $onInvoke which will return a Promise
		// Pass the token from RPC layer to ExtHost
		await this._proxy.$onInvoke(invocationId, token);
	}

	$onInvocationComplete(invocationId: string): void {
		this._logService.info(`[MainThreadTestAiInterop] Completed invocation: ${invocationId}`);
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

	$registerEndpoint(descriptor: EndpointDescriptorDto): void {
		this._endpoints.set(descriptor.id, descriptor);
		this._logService.info(`[TestAiInterop] Registered endpoint: ${descriptor.id}, hostKind: ${descriptor.hostKind}, remoteAuthority: ${descriptor.remoteAuthority || 'none'}`);
	}

	$unregisterEndpoint(endpointId: string): void {
		this._endpoints.delete(endpointId);
		this._logService.info(`[TestAiInterop] Unregistered endpoint: ${endpointId}`);
	}

	private _canRoute(caller: EndpointDescriptorDto, target: EndpointDescriptorDto): { allowed: boolean; reason?: string } {
		// Rule 1: web cannot call local
		if (caller.hostKind === 'web' && target.hostKind === 'local') {
			return { allowed: false, reason: AiInteropErrorCode.HOST_KIND_UNSUPPORTED };
		}

		// Rule 2: remote can only call endpoints with the same remoteAuthority
		if (caller.hostKind === 'remote' && target.hostKind === 'remote') {
			if (caller.remoteAuthority !== target.remoteAuthority) {
				return { allowed: false, reason: AiInteropErrorCode.REMOTE_AUTHORITY_MISMATCH };
			}
		}

		// Rule 3: local <-> remote allowed (if policy allows)
		// Rule 4: local <-> local allowed
		// Rule 5: web <-> web allowed
		return { allowed: true };
	}

	private _logAuditEvent(entry: AuditLogEntry): void {
		this._auditLog.push(entry);
		this._logService.info(`[TestAiInterop] Audit: ${entry.type} - caller: ${entry.callerId}, target: ${entry.targetId}, reason: ${entry.reason || 'none'}`);
	}

	$getAuditLog(): Promise<AuditLogEntry[]> {
		return Promise.resolve([...this._auditLog]);
	}

	$invokeWithRouting(callerId: string, targetId: string, invocationId: string, token: CancellationToken): Promise<void> {
		const caller = this._endpoints.get(callerId);
		const target = this._endpoints.get(targetId);

		if (!caller) {
			const error = new Error(`Caller endpoint not found: ${callerId}`);
			this._logService.error(`[TestAiInterop] ${error.message}`);
			throw error;
		}

		if (!target) {
			const error = new Error(`Target endpoint not found: ${targetId}`);
			this._logService.error(`[TestAiInterop] ${error.message}`);
			throw error;
		}

		// Check routing rules
		const routeCheck = this._canRoute(caller, target);

		if (!routeCheck.allowed) {
			// Log rejection to audit
			this._logAuditEvent({
				type: 'invocation_rejected',
				timestamp: Date.now(),
				callerId: caller.extensionId,
				targetId: target.id,
				reason: routeCheck.reason,
				details: {
					callerHostKind: caller.hostKind,
					callerRemoteAuthority: caller.remoteAuthority,
					targetHostKind: target.hostKind,
					targetRemoteAuthority: target.remoteAuthority,
				}
			});

			const error = new Error(`Routing rejected: ${routeCheck.reason}`);
			this._logService.error(`[TestAiInterop] ${error.message}`);
			throw error;
		}

		// Log successful routing
		this._logAuditEvent({
			type: 'invocation_success',
			timestamp: Date.now(),
			callerId: caller.extensionId,
			targetId: target.id,
			details: {
				callerHostKind: caller.hostKind,
				callerRemoteAuthority: caller.remoteAuthority,
				targetHostKind: target.hostKind,
				targetRemoteAuthority: target.remoteAuthority,
			}
		});

		// Proceed with invocation
		return this.$invoke(invocationId, token);
	}
}
