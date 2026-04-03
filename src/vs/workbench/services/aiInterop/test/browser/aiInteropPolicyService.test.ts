/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AIInteropPolicyService } from '../../browser/aiInteropPolicyService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import {
	EndpointDescriptor,
	InvocationRequest,
	AiInteropErrorCode
} from '../../common/aiInterop.js';

suite('AIInteropPolicyService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let policyService: AIInteropPolicyService;
	let storageService: TestStorageService;
	let dialogService: TestDialogService;

	setup(() => {
		storageService = disposables.add(new TestStorageService());
		dialogService = new TestDialogService();
		const logService = new NullLogService();
		policyService = disposables.add(new AIInteropPolicyService(logService, storageService, dialogService));
	});

	suite('Permission Management', () => {
		test('grantPermission - success', async () => {
			const granted = Event.toPromise(policyService.onDidGrantPermission);
			await policyService.grantPermission('caller.id', 'target.id', 'session');

			const record = await granted;
			assert.strictEqual(record.callerId, 'caller.id');
			assert.strictEqual(record.targetId, 'target.id');
			assert.strictEqual(record.scope, 'session');
			assert.ok(record.grantedAt);
		});

		test('grantPermission - once scope has expiration', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'once');

			const permissions = policyService.getPermissions();
			assert.strictEqual(permissions.length, 1);
			assert.ok(permissions[0].expiresAt);
		});

		test('grantPermission - allow_session scope has no expiration', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'session');

			const permissions = policyService.getPermissions();
			assert.strictEqual(permissions.length, 1);
			assert.strictEqual(permissions[0].expiresAt, undefined);
		});

		test('revokePermission - success', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'session');

			const revoked = Event.toPromise(policyService.onDidRevokePermission);
			await policyService.revokePermission('caller.id', 'target.id');

			const result = await revoked;
			assert.strictEqual(result.callerId, 'caller.id');
			assert.strictEqual(result.targetId, 'target.id');

			const permissions = policyService.getPermissions();
			assert.strictEqual(permissions.length, 0);
		});

		test('revokePermission - non-existent permission does not throw', async () => {
			await policyService.revokePermission('non.existent', 'target.id');
			// Should not throw
		});

		test('getPermissions - returns all permissions', async () => {
			await policyService.grantPermission('caller1.id', 'target1.id', 'session');
			await policyService.grantPermission('caller2.id', 'target2.id', 'session');

			const permissions = policyService.getPermissions();
			assert.strictEqual(permissions.length, 2);
		});

		test('getPermissions - filters by callerId', async () => {
			await policyService.grantPermission('caller1.id', 'target1.id', 'session');
			await policyService.grantPermission('caller2.id', 'target2.id', 'session');

			const permissions = policyService.getPermissions('caller1.id');
			assert.strictEqual(permissions.length, 1);
			assert.strictEqual(permissions[0].callerId, 'caller1.id');
		});
	});

	suite('Permission Checking', () => {
		const caller: EndpointDescriptor = {
			id: 'caller.id',
			extensionId: 'test.extension',
			displayName: 'Caller',
			capabilities: [{ type: 'streaming' }],
			hostKind: 'local'
		};

		const target: EndpointDescriptor = {
			id: 'target.id',
			extensionId: 'test.extension',
			displayName: 'Target',
			capabilities: [{ type: 'streaming' }],
			hostKind: 'local'
		};

		const request: InvocationRequest = {
			prompt: 'test prompt'
		};

		test('checkPermission - returns allowed when permission granted', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'session');

			const decision = await policyService.checkPermission(caller, target, request);
			assert.strictEqual(decision.allowed, true);
			assert.strictEqual(decision.scope, 'session');
		});

		test('checkPermission - returns denied when permission not granted', async () => {
			const decision = await policyService.checkPermission(caller, target, request);
			assert.strictEqual(decision.allowed, false);
			assert.ok(decision.reason);
		});

		test('checkPermission - returns denied when permission expired', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'once');

			// Manually expire the permission
			const permissions = policyService.getPermissions();
			permissions[0].expiresAt = Date.now() - 1000;

			const decision = await policyService.checkPermission(caller, target, request);
			assert.strictEqual(decision.allowed, false);
			assert.ok(decision.reason?.includes('expired'));
		});
	});

	suite('Routing Policy', () => {
		test('canRoute - local to local allowed', () => {
			const caller: EndpointDescriptor = {
				id: 'caller.id',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const target: EndpointDescriptor = {
				id: 'target.id',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const decision = policyService.canRoute(caller, target);
			assert.strictEqual(decision.allowed, true);
		});

		test('canRoute - web to local denied', () => {
			const caller: EndpointDescriptor = {
				id: 'caller.id',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'web'
			};

			const target: EndpointDescriptor = {
				id: 'target.id',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const decision = policyService.canRoute(caller, target);
			assert.strictEqual(decision.allowed, false);
			assert.strictEqual(decision.reason, AiInteropErrorCode.HOST_KIND_UNSUPPORTED);
		});

		test('canRoute - remote to remote with same authority allowed', () => {
			const caller: EndpointDescriptor = {
				id: 'caller.id',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'remote',
				remoteAuthority: 'ssh-remote+server1'
			};

			const target: EndpointDescriptor = {
				id: 'target.id',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'remote',
				remoteAuthority: 'ssh-remote+server1'
			};

			const decision = policyService.canRoute(caller, target);
			assert.strictEqual(decision.allowed, true);
		});

		test('canRoute - remote to remote with different authority denied', () => {
			const caller: EndpointDescriptor = {
				id: 'caller.id',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'remote',
				remoteAuthority: 'ssh-remote+server1'
			};

			const target: EndpointDescriptor = {
				id: 'target.id',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'remote',
				remoteAuthority: 'ssh-remote+server2'
			};

			const decision = policyService.canRoute(caller, target);
			assert.strictEqual(decision.allowed, false);
			assert.strictEqual(decision.reason, AiInteropErrorCode.REMOTE_AUTHORITY_MISMATCH);
		});

		test('canRoute - local to remote allowed', () => {
			const caller: EndpointDescriptor = {
				id: 'caller.id',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const target: EndpointDescriptor = {
				id: 'target.id',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'remote',
				remoteAuthority: 'ssh-remote+server1'
			};

			const decision = policyService.canRoute(caller, target);
			assert.strictEqual(decision.allowed, true);
		});

		test('canRoute - web to web allowed', () => {
			const caller: EndpointDescriptor = {
				id: 'caller.id',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'web'
			};

			const target: EndpointDescriptor = {
				id: 'target.id',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'web'
			};

			const decision = policyService.canRoute(caller, target);
			assert.strictEqual(decision.allowed, true);
		});
	});

	suite('Persistence', () => {
		test('permissions are persisted and loaded', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'session');

			// Create new service instance with same storage
			const newPolicyService = disposables.add(new AIInteropPolicyService(new NullLogService(), storageService, dialogService));

			const permissions = newPolicyService.getPermissions();
			assert.strictEqual(permissions.length, 1);
			assert.strictEqual(permissions[0].callerId, 'caller.id');
			assert.strictEqual(permissions[0].targetId, 'target.id');
		});

		test('expired permissions are not loaded', async () => {
			await policyService.grantPermission('caller.id', 'target.id', 'once');

			// Manually expire the permission in storage
			const permissions = policyService.getPermissions();
			permissions[0].expiresAt = Date.now() - 1000;

			// Manually persist the expired permission
			storageService.store('aiInterop.permissions', JSON.stringify(permissions), 0, 0);

			// Create new service instance with same storage
			const newPolicyService = disposables.add(new AIInteropPolicyService(new NullLogService(), storageService, dialogService));

			const loadedPermissions = newPolicyService.getPermissions();
			assert.strictEqual(loadedPermissions.length, 0);
		});
	});
});
