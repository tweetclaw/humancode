/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { CancellationToken } from '../../../../../base/common/cancellation.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AIInteropService } from '../../browser/aiInteropService.js';
import { AISessionBrokerService } from '../../browser/aiSessionBroker.js';
import { AIInteropPolicyService } from '../../browser/aiInteropPolicyService.js';
import { AIInteropAuditService } from '../../browser/aiInteropAuditService.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import { TestDialogService } from '../../../../../platform/dialogs/test/common/testDialogService.js';
import {
	EndpointDescriptor,
	InvocationRequest,
	AiInteropErrorCode
} from '../../common/aiInterop.js';

suite('AIInteropService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let aiInteropService: AIInteropService;
	let sessionBroker: AISessionBrokerService;
	let policyService: AIInteropPolicyService;
	let auditService: AIInteropAuditService;

	setup(() => {
		const storageService = disposables.add(new TestStorageService());
		const logService = new NullLogService();
		const dialogService = new TestDialogService();

		auditService = disposables.add(new AIInteropAuditService(logService));
		policyService = disposables.add(new AIInteropPolicyService(logService, storageService, dialogService));
		sessionBroker = disposables.add(new AISessionBrokerService(logService, storageService));
		aiInteropService = disposables.add(new AIInteropService(
			logService,
			sessionBroker,
			policyService,
			auditService
		));
	});

	suite('Endpoint Management', () => {
		test('registerEndpoint - success', async () => {
			const descriptor: EndpointDescriptor = {
				id: 'test.endpoint1',
				extensionId: 'test.extension',
				displayName: 'Test Endpoint',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const registered = Event.toPromise(aiInteropService.onDidRegisterEndpoint);
			await aiInteropService.registerEndpoint(descriptor);

			const result = await registered;
			assert.deepStrictEqual(result, descriptor);

			const retrieved = aiInteropService.getEndpoint('test.endpoint1');
			assert.deepStrictEqual(retrieved, descriptor);
		});

		test('registerEndpoint - duplicate ID throws error', async () => {
			const descriptor: EndpointDescriptor = {
				id: 'test.endpoint2',
				extensionId: 'test.extension',
				displayName: 'Test Endpoint',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			await aiInteropService.registerEndpoint(descriptor);

			await assert.rejects(
				async () => await aiInteropService.registerEndpoint(descriptor),
				(error: Error) => {
					assert.ok(error.message.includes('already registered'));
					return true;
				}
			);
		});

		test('registerEndpoint - invalid descriptor throws error', async () => {
			const invalidDescriptor = {
				id: '',
				extensionId: '',
				displayName: 'Invalid',
				capabilities: [],
				hostKind: 'local'
			} as EndpointDescriptor;

			await assert.rejects(
				async () => await aiInteropService.registerEndpoint(invalidDescriptor),
				(error: Error) => {
					assert.ok(error.message.includes('Invalid endpoint descriptor'));
					return true;
				}
			);
		});

		test('unregisterEndpoint - success', async () => {
			const descriptor: EndpointDescriptor = {
				id: 'test.endpoint3',
				extensionId: 'test.extension',
				displayName: 'Test Endpoint',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			await aiInteropService.registerEndpoint(descriptor);

			const unregistered = Event.toPromise(aiInteropService.onDidUnregisterEndpoint);
			await aiInteropService.unregisterEndpoint('test.endpoint3');

			const result = await unregistered;
			assert.strictEqual(result, 'test.endpoint3');

			const retrieved = aiInteropService.getEndpoint('test.endpoint3');
			assert.strictEqual(retrieved, undefined);
		});

		test('unregisterEndpoint - non-existent endpoint throws error', async () => {
			await assert.rejects(
				async () => await aiInteropService.unregisterEndpoint('non.existent'),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('getAllEndpoints - returns all registered endpoints', async () => {
			const descriptor1: EndpointDescriptor = {
				id: 'test.endpoint4',
				extensionId: 'test.extension',
				displayName: 'Test Endpoint 1',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const descriptor2: EndpointDescriptor = {
				id: 'test.endpoint5',
				extensionId: 'test.extension',
				displayName: 'Test Endpoint 2',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			await aiInteropService.registerEndpoint(descriptor1);
			await aiInteropService.registerEndpoint(descriptor2);

			const endpoints = aiInteropService.getAllEndpoints();
			assert.strictEqual(endpoints.length, 2);
			assert.ok(endpoints.some(e => e.id === 'test.endpoint4'));
			assert.ok(endpoints.some(e => e.id === 'test.endpoint5'));
		});
	});

	suite('Invocation Management', () => {
		let callerDescriptor: EndpointDescriptor;
		let targetDescriptor: EndpointDescriptor;

		setup(async () => {
			callerDescriptor = {
				id: 'test.caller',
				extensionId: 'test.extension',
				displayName: 'Caller',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			targetDescriptor = {
				id: 'test.target',
				extensionId: 'test.extension',
				displayName: 'Target',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			await aiInteropService.registerEndpoint(callerDescriptor);
			await aiInteropService.registerEndpoint(targetDescriptor);

			// Grant permission
			await policyService.grantPermission('test.caller', 'test.target', 'session');
		});

		test('invoke - success', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt',
				options: { streaming: true }
			};

			const started = Event.toPromise(aiInteropService.onDidStartInvocation);
			const handle = await aiInteropService.invoke(
				'test.caller',
				'test.target',
				request,
				CancellationToken.None
			);

			assert.ok(handle);
			assert.ok(handle.invocationId);

			const invocation = await started;
			assert.strictEqual(invocation.callerId, 'test.caller');
			assert.strictEqual(invocation.targetId, 'test.target');
			assert.strictEqual(invocation.status, 'pending');
		});

		test('invoke - caller not found throws error', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			await assert.rejects(
				async () => await aiInteropService.invoke(
					'non.existent',
					'test.target',
					request,
					CancellationToken.None
				),
				(error: Error) => {
					assert.ok(error.message.includes('Caller endpoint not found'));
					return true;
				}
			);
		});

		test('invoke - target not found throws error', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			await assert.rejects(
				async () => await aiInteropService.invoke(
					'test.caller',
					'non.existent',
					request,
					CancellationToken.None
				),
				(error: Error) => {
					assert.ok(error.message.includes('Target endpoint not found'));
					return true;
				}
			);
		});

		test('invoke - permission denied throws error', async () => {
			const blockedTarget: EndpointDescriptor = {
				id: 'test.blocked',
				extensionId: 'test.extension',
				displayName: 'Blocked',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			await aiInteropService.registerEndpoint(blockedTarget);

			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			await assert.rejects(
				async () => await aiInteropService.invoke(
					'test.caller',
					'test.blocked',
					request,
					CancellationToken.None
				),
				(error: Error) => {
					assert.ok(error.message.includes('Permission denied'));
					return true;
				}
			);
		});

		test('sendChunk - success', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			const handle = await aiInteropService.invoke(
				'test.caller',
				'test.target',
				request,
				CancellationToken.None
			);

			const chunkReceived = Event.toPromise(handle.onChunk);

			await aiInteropService.sendChunk(handle.invocationId, {
				seq: 0,
				text: 'test chunk'
			});

			const chunk = await chunkReceived;
			assert.strictEqual(chunk.seq, 0);
			assert.strictEqual(chunk.text, 'test chunk');
		});

		test('complete - success', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			const handle = await aiInteropService.invoke(
				'test.caller',
				'test.target',
				request,
				CancellationToken.None
			);

			const completed = Event.toPromise(handle.onComplete);

			await aiInteropService.complete(handle.invocationId, { result: 'done' });

			const result = await completed;
			assert.deepStrictEqual(result, { result: 'done' });

			const invocation = aiInteropService.getInvocation(handle.invocationId);
			assert.strictEqual(invocation?.status, 'completed');
		});

		test('fail - success', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			const handle = await aiInteropService.invoke(
				'test.caller',
				'test.target',
				request,
				CancellationToken.None
			);

			const failed = Event.toPromise(handle.onError);

			await aiInteropService.fail(handle.invocationId, {
				code: AiInteropErrorCode.INVOCATION_FAILED,
				message: 'test error'
			});

			const error = await failed;
			assert.strictEqual(error.code, AiInteropErrorCode.INVOCATION_FAILED);
			assert.strictEqual(error.message, 'test error');

			const invocation = aiInteropService.getInvocation(handle.invocationId);
			assert.strictEqual(invocation?.status, 'failed');
		});

		test('cancel - success', async () => {
			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			const handle = await aiInteropService.invoke(
				'test.caller',
				'test.target',
				request,
				CancellationToken.None
			);

			const canceled = Event.toPromise(aiInteropService.onDidCancelInvocation);

			await aiInteropService.cancel(handle.invocationId);

			const invocationId = await canceled;
			assert.strictEqual(invocationId, handle.invocationId);

			const invocation = aiInteropService.getInvocation(handle.invocationId);
			assert.strictEqual(invocation?.status, 'canceled');
		});
	});

	suite('Routing Policy', () => {
		test('invoke - remote authority mismatch throws error', async () => {
			const localCaller: EndpointDescriptor = {
				id: 'test.local',
				extensionId: 'test.extension',
				displayName: 'Local',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			const remoteTarget: EndpointDescriptor = {
				id: 'test.remote',
				extensionId: 'test.extension',
				displayName: 'Remote',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'remote',
				remoteAuthority: 'ssh-remote+server'
			};

			await aiInteropService.registerEndpoint(localCaller);
			await aiInteropService.registerEndpoint(remoteTarget);

			const request: InvocationRequest = {
				prompt: 'test prompt'
			};

			await assert.rejects(
				async () => await aiInteropService.invoke(
					'test.local',
					'test.remote',
					request,
					CancellationToken.None
				),
				(error: Error) => {
					assert.ok(error.message.includes('Route not allowed'));
					return true;
				}
			);
		});
	});

	suite('Event Firing', () => {
		test('onDidRegisterEndpoint fires on registration', async () => {
			const descriptor: EndpointDescriptor = {
				id: 'test.event1',
				extensionId: 'test.extension',
				displayName: 'Test',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			let fired = false;
			disposables.add(aiInteropService.onDidRegisterEndpoint(() => {
				fired = true;
			}));

			await aiInteropService.registerEndpoint(descriptor);
			assert.strictEqual(fired, true);
		});

		test('onDidUnregisterEndpoint fires on unregistration', async () => {
			const descriptor: EndpointDescriptor = {
				id: 'test.event2',
				extensionId: 'test.extension',
				displayName: 'Test',
				capabilities: [{ type: 'streaming' }],
				hostKind: 'local'
			};

			await aiInteropService.registerEndpoint(descriptor);

			let fired = false;
			disposables.add(aiInteropService.onDidUnregisterEndpoint(() => {
				fired = true;
			}));

			await aiInteropService.unregisterEndpoint('test.event2');
			assert.strictEqual(fired, true);
		});
	});
});
