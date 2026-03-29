/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAIInteropPolicyService,
	EndpointDescriptor,
	InvocationRequest,
	PermissionDecision,
	PermissionScope,
	PermissionRecord,
	RouteDecision,
	AiInteropErrorCode
} from '../common/aiInterop.js';

export class AIInteropPolicyService extends Disposable implements IAIInteropPolicyService {
	declare readonly _serviceBrand: undefined;

	private readonly _permissions = new Map<string, PermissionRecord>();

	private readonly _onDidGrantPermission = this._register(new Emitter<PermissionRecord>());
	readonly onDidGrantPermission = this._onDidGrantPermission.event;

	private readonly _onDidRevokePermission = this._register(new Emitter<{ callerId: string; targetId: string }>());
	readonly onDidRevokePermission = this._onDidRevokePermission.event;

	async checkPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision> {
		// Check if permission already granted
		const key = `${caller.id}:${target.id}`;
		const record = this._permissions.get(key);

		if (record) {
			// Check if expired
			if (record.expiresAt && record.expiresAt < Date.now()) {
				this._permissions.delete(key);
				return { allowed: false, reason: 'Permission expired' };
			}
			return { allowed: true, scope: record.scope };
		}

		// Default deny
		return { allowed: false, reason: 'No permission granted' };
	}

	async requestPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision> {
		// For now, auto-grant permission (UI will be implemented in TASK-P1-008)
		const scope: PermissionScope = 'session';
		await this.grantPermission(caller.id, target.id, scope);
		return { allowed: true, scope };
	}

	async grantPermission(caller: string, target: string, scope: PermissionScope): Promise<void> {
		const record: PermissionRecord = {
			callerId: caller,
			targetId: target,
			scope,
			grantedAt: Date.now(),
			expiresAt: scope === 'once' ? Date.now() + 60000 : undefined
		};

		const key = `${caller}:${target}`;
		this._permissions.set(key, record);
		this._onDidGrantPermission.fire(record);
	}

	async revokePermission(caller: string, target: string): Promise<void> {
		const key = `${caller}:${target}`;
		this._permissions.delete(key);
		this._onDidRevokePermission.fire({ callerId: caller, targetId: target });
	}

	getPermissions(callerId?: string): PermissionRecord[] {
		const records = Array.from(this._permissions.values());
		if (callerId) {
			return records.filter(r => r.callerId === callerId);
		}
		return records;
	}

	canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): RouteDecision {
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

		// Rule 3: local <-> remote allowed
		// Rule 4: local <-> local allowed
		// Rule 5: web <-> web allowed
		return { allowed: true };
	}
}

registerSingleton(IAIInteropPolicyService, AIInteropPolicyService, InstantiationType.Delayed);
