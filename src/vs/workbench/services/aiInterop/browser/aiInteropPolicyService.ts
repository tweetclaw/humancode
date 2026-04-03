/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
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
import { showPermissionDialog } from '../../../contrib/aiInterop/browser/aiInteropPermissionDialog.js';

export class AIInteropPolicyService extends Disposable implements IAIInteropPolicyService {
	declare readonly _serviceBrand: undefined;

	private readonly _permissions = new Map<string, PermissionRecord>();

	private readonly _onDidGrantPermission = this._register(new Emitter<PermissionRecord>());
	readonly onDidGrantPermission = this._onDidGrantPermission.event;

	private readonly _onDidRevokePermission = this._register(new Emitter<{ callerId: string; targetId: string }>());
	readonly onDidRevokePermission = this._onDidRevokePermission.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService,
		@IDialogService private readonly dialogService: IDialogService
	) {
		super();
		this._loadPermissions();
	}

	// ========================================
	// Authorization Decisions
	// ========================================

	async checkPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision> {
		const key = this._getPermissionKey(caller.id, target.id);
		const record = this._permissions.get(key);

		if (record) {
			// Check if permission has expired
			if (record.expiresAt && record.expiresAt < Date.now()) {
				this._permissions.delete(key);
				this._persistPermissions();
				this.logService.info(`[PolicyService] Permission expired: ${caller.id} -> ${target.id}`);
				return { allowed: false, reason: 'Permission expired' };
			}

			this.logService.info(`[PolicyService] Permission check passed: ${caller.id} -> ${target.id} (scope: ${record.scope})`);
			return { allowed: true, scope: record.scope };
		}

		this.logService.info(`[PolicyService] Permission check failed: ${caller.id} -> ${target.id} (not granted)`);
		return { allowed: false, reason: 'Permission not granted' };
	}

	async requestPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision> {
		// Show permission dialog to user
		const result = await showPermissionDialog(this.dialogService, caller, target);

		if (result === 'deny') {
			this.logService.info(`[PolicyService] Permission denied by user: ${caller.id} -> ${target.id}`);
			return { allowed: false, reason: 'Permission denied by user' };
		}

		// Grant permission with the scope chosen by user
		await this.grantPermission(caller.id, target.id, result);

		this.logService.info(`[PolicyService] Permission granted by user: ${caller.id} -> ${target.id} (scope: ${result})`);
		return { allowed: true, scope: result };
	}

	// ========================================
	// Permission Record Management
	// ========================================

	async grantPermission(callerId: string, targetId: string, scope: PermissionScope): Promise<void> {
		const key = this._getPermissionKey(callerId, targetId);
		const record: PermissionRecord = {
			callerId,
			targetId,
			scope,
			grantedAt: Date.now(),
			expiresAt: scope === 'once' ? Date.now() + 60000 : undefined // 'once' expires in 1 minute
		};

		this._permissions.set(key, record);
		this._onDidGrantPermission.fire(record);
		this._persistPermissions();

		this.logService.info(`[PolicyService] Permission granted: ${callerId} -> ${targetId} (scope: ${scope})`);
	}

	async revokePermission(callerId: string, targetId: string): Promise<void> {
		const key = this._getPermissionKey(callerId, targetId);
		const existed = this._permissions.has(key);

		if (existed) {
			this._permissions.delete(key);
			this._onDidRevokePermission.fire({ callerId, targetId });
			this._persistPermissions();

			this.logService.info(`[PolicyService] Permission revoked: ${callerId} -> ${targetId}`);
		}
	}

	getPermissions(callerId?: string): PermissionRecord[] {
		const allPermissions = Array.from(this._permissions.values());

		if (callerId) {
			return allPermissions.filter(p => p.callerId === callerId);
		}

		return allPermissions;
	}

	// ========================================
	// Routing Policy (from PoC-0)
	// ========================================

	canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): RouteDecision {
		// Rule 1: web cannot call local
		if (caller.hostKind === 'web' && target.hostKind === 'local') {
			this.logService.warn(`[PolicyService] Route rejected: web -> local not allowed (${caller.id} -> ${target.id})`);
			return { allowed: false, reason: AiInteropErrorCode.HOST_KIND_UNSUPPORTED };
		}

		// Rule 2: remote can only call endpoints with the same remoteAuthority
		if (caller.hostKind === 'remote' && target.hostKind === 'remote') {
			if (caller.remoteAuthority !== target.remoteAuthority) {
				this.logService.warn(`[PolicyService] Route rejected: remoteAuthority mismatch (${caller.remoteAuthority} != ${target.remoteAuthority})`);
				return { allowed: false, reason: AiInteropErrorCode.REMOTE_AUTHORITY_MISMATCH };
			}
		}

		// Rule 3: local <-> remote allowed
		// Rule 4: local <-> local allowed
		// Rule 5: web <-> web allowed
		return { allowed: true };
	}

	// ========================================
	// Persistence
	// ========================================

	private _loadPermissions(): void {
		const stored = this.storageService.get('aiInterop.permissions', StorageScope.WORKSPACE);
		if (stored) {
			try {
				const records: PermissionRecord[] = JSON.parse(stored);
				for (const record of records) {
					// Skip expired permissions
					if (record.expiresAt && record.expiresAt < Date.now()) {
						continue;
					}
					const key = this._getPermissionKey(record.callerId, record.targetId);
					this._permissions.set(key, record);
				}
				this.logService.info(`[PolicyService] Loaded ${this._permissions.size} permissions from storage`);
			} catch (error) {
				this.logService.error('[PolicyService] Failed to load permissions', error);
			}
		}
	}

	private _persistPermissions(): void {
		const records = Array.from(this._permissions.values());
		this.storageService.store('aiInterop.permissions', JSON.stringify(records), StorageScope.WORKSPACE, StorageTarget.MACHINE);
	}

	private _getPermissionKey(callerId: string, targetId: string): string {
		return `${callerId}:${targetId}`;
	}
}

registerSingleton(IAIInteropPolicyService, AIInteropPolicyService, InstantiationType.Delayed);
