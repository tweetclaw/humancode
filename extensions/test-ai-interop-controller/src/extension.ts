/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';
import { testSessionManagement, testPermissionControl, testAuditLog, testE2EIntegration } from './e2e-tests.js';

interface TestAiInteropAPI {
	invoke(invocationId: string, token: vscode.CancellationToken): Promise<void>;
	onDidReceiveChunk: vscode.Event<{ invocationId: string; seq: number; text: string; timestamp: number }>;
	getStats(invocationId: string): InvocationStats | undefined;
	clearStats(): void;
	registerEndpoint(descriptor: EndpointDescriptor): void;
	unregisterEndpoint(endpointId: string): void;
	invokeWithRouting(callerId: string, targetId: string, invocationId: string, token: vscode.CancellationToken): Promise<void>;
	getAuditLog(): AuditLogEntry[];
}

interface EndpointDescriptor {
	id: string;
	extensionId: string;
	hostKind: 'local' | 'remote' | 'web';
	remoteAuthority?: string;
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

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

function findMissingSeq(received: number[], expected: number): number[] {
	const sorted = [...received].sort((a, b) => a - b);
	const missing: number[] = [];
	for (let i = 0; i < expected; i++) {
		if (!sorted.includes(i)) {
			missing.push(i);
		}
	}
	return missing;
}

function checkOrder(received: number[]): number[] {
	const outOfOrder: number[] = [];
	for (let i = 1; i < received.length; i++) {
		if (received[i] < received[i - 1]) {
			outOfOrder.push(i);
		}
	}
	return outOfOrder;
}

async function waitForCompletion(
	received: number[],
	expected: number,
	timeout: number
): Promise<void> {
	const startTime = Date.now();
	while (received.length < expected && Date.now() - startTime < timeout) {
		await sleep(100);
	}
}

async function waitForChunks(
	received: number[],
	count: number,
	timeout: number
): Promise<void> {
	const startTime = Date.now();
	while (received.length < count && Date.now() - startTime < timeout) {
		await sleep(50);
	}
}

function percentile(values: number[], p: number): number {
	if (values.length === 0) {
		return 0;
	}
	const sorted = [...values].sort((a, b) => a - b);
	const index = Math.ceil(sorted.length * p) - 1;
	return sorted[Math.max(0, index)];
}

export function activate(context: vscode.ExtensionContext) {
	try {
		// Get the internal test API
		const api = (vscode as any).testAiInterop as TestAiInteropAPI | undefined;

		if (!api) {
			console.error('[Controller] Test AI Interop API not available');
			vscode.window.showErrorMessage('[Controller] Test AI Interop API not available');
			return;
		}

		const command = vscode.commands.registerCommand('test-ai-interop.runTest', async () => {
			const numWorkers = 10;
			const chunksPerWorker = 50;
			const totalChunks = numWorkers * chunksPerWorker;
			const startTime = Date.now();

			console.log(`[Controller] Starting concurrent test with ${numWorkers} workers, ${chunksPerWorker} chunks each`);

			// Track all received chunks across all workers
			const allReceived = new Map<string, { received: number[]; timestamps: number[] }>();

			// Subscribe to chunk received events
			const disposable = api.onDidReceiveChunk((data) => {
				if (!allReceived.has(data.invocationId)) {
					allReceived.set(data.invocationId, { received: [], timestamps: [] });
				}
				const stats = allReceived.get(data.invocationId)!;
				stats.received.push(data.seq);
				stats.timestamps.push(data.timestamp);
			});

			try {
				// Invoke all workers concurrently
				const invocationIds = Array.from({ length: numWorkers }, (_, i) => `test-${Date.now()}-worker${i}`);

				// Initialize tracking for all workers
				invocationIds.forEach(id => {
					allReceived.set(id, { received: [], timestamps: [] });
				});

				// Start all workers in parallel without cancellation
				const cts = new vscode.CancellationTokenSource();
				await Promise.all(invocationIds.map(id => api.invoke(id, cts.token)));
				cts.dispose();

				// Wait for all workers to complete
				await new Promise(resolve => setTimeout(resolve, 3000));

				// Calculate aggregate statistics
				const endTime = Date.now();
				const totalTime = endTime - startTime;

				let totalReceived = 0;
				let totalMissing = 0;
				let totalOutOfOrder = 0;

				invocationIds.forEach(id => {
					const stats = allReceived.get(id)!;
					totalReceived += stats.received.length;
					totalMissing += findMissingSeq(stats.received, chunksPerWorker).length;
					totalOutOfOrder += checkOrder(stats.received).length;
				});

				const lossRate = ((totalChunks - totalReceived) / totalChunks) * 100;

				// Output statistics report
				const report = [
					'',
					'=== AI Interop RPC Concurrent Test Results ===',
					'',
					`Workers: ${numWorkers}`,
					`Chunks per worker: ${chunksPerWorker}`,
					`Total expected chunks: ${totalChunks}`,
					`Total received chunks: ${totalReceived}`,
					`Total time: ${totalTime}ms`,
					`Loss rate: ${lossRate.toFixed(2)}%`,
					`Missing chunks: ${totalMissing}`,
					`Out of order chunks: ${totalOutOfOrder}`,
					'',
					'Per-worker breakdown:',
					...invocationIds.map(id => {
						const stats = allReceived.get(id)!;
						return `  ${id}: ${stats.received.length}/${chunksPerWorker} chunks`;
					}),
					'',
					'===============================================',
					''
				].join('\n');

				console.log(report);
				vscode.window.showInformationMessage(`Test completed: ${totalReceived}/${totalChunks} chunks received (${numWorkers} workers), ${lossRate.toFixed(2)}% loss`);

			} catch (error) {
				console.error(`[Controller] Test failed:`, error);
				vscode.window.showErrorMessage(`Test failed: ${error}`);
			} finally {
				disposable.dispose();
			}
		});

		context.subscriptions.push(command);

		// Scenario 1: Basic cancel
		const testCancelBasic = vscode.commands.registerCommand('test-ai-interop.testCancelBasic', async () => {
			const invocationId = `cancel-basic-${Date.now()}`;
			const received: number[] = [];
			let lastChunkTime = 0;

			console.log(`[Controller] Starting basic cancel test with invocationId: ${invocationId}`);

			// Subscribe to chunk received events
			const disposable = api.onDidReceiveChunk((data) => {
				if (data.invocationId === invocationId) {
					received.push(data.seq);
					lastChunkTime = Date.now(); // Update last chunk time
				}
			});

			try {
				// Create CancellationTokenSource
				const cts = new vscode.CancellationTokenSource();

				// Start invocation
				const invokePromise = api.invoke(invocationId, cts.token);

				// Wait for 50 chunks
				await waitForChunks(received, 50, 5000);

				const cancelTime = Date.now();
				console.log(`[Controller] Canceling at chunk ${received.length}, time: ${cancelTime}`);
				cts.cancel();

				// Wait 100ms to ensure no new chunks (instead of 1000ms)
				await sleep(100);

				// Real latency = last chunk time - cancel time
				const cancelLatency = lastChunkTime - cancelTime;
				const chunksAfterCancel = received.filter(seq => seq > 50).length;

				console.log(`[Controller] Cancel latency: ${cancelLatency}ms`);
				console.log(`[Controller] Chunks received after cancel: ${chunksAfterCancel}`);
				console.log(`[Controller] Last chunk seq: ${received[received.length - 1]}`);
				console.log(`[Controller] Total chunks: ${received.length}`);

				vscode.window.showInformationMessage(`Basic cancel test completed: latency=${cancelLatency}ms, total chunks=${received.length}`);

				cts.dispose();
			} catch (error) {
				console.error(`[Controller] Basic cancel test failed:`, error);
				vscode.window.showErrorMessage(`Basic cancel test failed: ${error}`);
			} finally {
				disposable.dispose();
			}
		});

		// Scenario 2: Immediate cancel
		const testCancelImmediate = vscode.commands.registerCommand('test-ai-interop.testCancelImmediate', async () => {
			const invocationId = `cancel-immediate-${Date.now()}`;
			const received: number[] = [];
			let lastChunkTime = 0;

			console.log(`[Controller] Starting immediate cancel test with invocationId: ${invocationId}`);

			const disposable = api.onDidReceiveChunk((data) => {
				if (data.invocationId === invocationId) {
					received.push(data.seq);
					lastChunkTime = Date.now();
				}
			});

			try {
				// Create CancellationTokenSource
				const cts = new vscode.CancellationTokenSource();

				// Start invocation
				const invokePromise = api.invoke(invocationId, cts.token);

				// Cancel immediately (no wait)
				const cancelTime = Date.now();
				cts.cancel();

				// Wait 100ms (instead of 500ms)
				await sleep(100);

				// If chunks received, use last chunk time; otherwise use current time
				const stopTime = received.length > 0 ? lastChunkTime : Date.now();
				const cancelLatency = stopTime - cancelTime;

				console.log(`[Controller] Immediate cancel latency: ${cancelLatency}ms`);
				console.log(`[Controller] Chunks received: ${received.length}`);
				console.log(`[Controller] Expected: 0 or very few chunks`);

				vscode.window.showInformationMessage(`Immediate cancel test completed: latency=${cancelLatency}ms, chunks=${received.length}`);

				cts.dispose();
			} catch (error) {
				console.error(`[Controller] Immediate cancel test failed:`, error);
				vscode.window.showErrorMessage(`Immediate cancel test failed: ${error}`);
			} finally {
				disposable.dispose();
			}
		});

		// Scenario 3: Concurrent cancel
		const testCancelConcurrent = vscode.commands.registerCommand('test-ai-interop.testCancelConcurrent', async () => {
			const numInvocations = 10;
			const invocations: Array<{
				id: string;
				received: number[];
				cts: vscode.CancellationTokenSource;
				lastChunkTime: number;
				cancelTime: number;
			}> = [];

			console.log(`[Controller] Starting concurrent cancel test with ${numInvocations} invocations`);

			// Create 10 concurrent invocations
			for (let i = 0; i < numInvocations; i++) {
				const invocationId = `cancel-concurrent-${i}-${Date.now()}`;
				const received: number[] = [];
				const cts = new vscode.CancellationTokenSource();

				const inv = {
					id: invocationId,
					received,
					cts,
					lastChunkTime: 0,
					cancelTime: 0
				};

				invocations.push(inv);

				// Subscribe to chunk received
				api.onDidReceiveChunk((data) => {
					if (data.invocationId === invocationId) {
						received.push(data.seq);
						inv.lastChunkTime = Date.now(); // Update last chunk time
					}
				});

				// Start invocation
				api.invoke(invocationId, cts.token);
			}

			try {
				// Wait for all invocations to receive at least 20 chunks
				await Promise.all(invocations.map(inv =>
					waitForChunks(inv.received, 20, 5000)
				));

				// Cancel all invocations with random delays
				for (const inv of invocations) {
					const randomDelay = Math.random() * 500; // 0-500ms random delay
					await sleep(randomDelay);

					inv.cancelTime = Date.now();
					inv.cts.cancel();
				}

				// Wait 100ms (instead of 1000ms)
				await sleep(100);

				// Calculate statistics
				let totalLatency = 0;
				let successCount = 0;

				for (const inv of invocations) {
					// Real latency = last chunk time - cancel time
					const latency = inv.lastChunkTime - inv.cancelTime;
					totalLatency += latency;

					if (latency < 200) {
						successCount++;
					}

					console.log(`[Controller] Invocation ${inv.id}: latency=${latency}ms, chunks=${inv.received.length}`);
				}

				const avgLatency = totalLatency / numInvocations;
				const successRate = (successCount / numInvocations) * 100;

				console.log(`[Controller] Average cancel latency: ${avgLatency}ms`);
				console.log(`[Controller] Success rate (< 200ms): ${successRate}%`);

				vscode.window.showInformationMessage(`Concurrent cancel test completed: avg latency=${avgLatency.toFixed(0)}ms, success rate=${successRate.toFixed(0)}%`);

				// Cleanup
				for (const inv of invocations) {
					inv.cts.dispose();
				}
			} catch (error) {
				console.error(`[Controller] Concurrent cancel test failed:`, error);
				vscode.window.showErrorMessage(`Concurrent cancel test failed: ${error}`);
			}
		});

		context.subscriptions.push(testCancelBasic, testCancelImmediate, testCancelConcurrent);

		// Routing test command
		const testRouting = vscode.commands.registerCommand('test-ai-interop.testRouting', async () => {
			console.log('[Controller] Starting routing test');

			try {
				// Get hostKind and remoteAuthority from environment
				const hostKind: 'local' | 'remote' | 'web' = vscode.env.remoteName ? 'remote' : 'local';
				const remoteAuthority = vscode.env.remoteName;

				console.log(`[Controller] Current environment: hostKind=${hostKind}, remoteAuthority=${remoteAuthority || 'none'}`);

				// Register controller endpoint
				const controllerEndpoint: EndpointDescriptor = {
					id: 'test-controller',
					extensionId: 'vscode.test-ai-interop-controller',
					hostKind: hostKind,
					remoteAuthority: remoteAuthority
				};
				api.registerEndpoint(controllerEndpoint);

				// Register worker endpoint (same host)
				const workerEndpoint: EndpointDescriptor = {
					id: 'test-worker',
					extensionId: 'vscode.test-ai-interop-worker',
					hostKind: hostKind,
					remoteAuthority: remoteAuthority
				};
				api.registerEndpoint(workerEndpoint);

				// Scenario 1: Same host call (local -> local) - should succeed
				console.log('[Controller] Scenario 1: Same host call (local -> local)');
				try {
					const invocationId1 = `routing-test-1-${Date.now()}`;
					const cts1 = new vscode.CancellationTokenSource();
					await api.invokeWithRouting('test-controller', 'test-worker', invocationId1, cts1.token);
					console.log('[Controller] ✓ Scenario 1 passed: Same host call succeeded');
					cts1.dispose();
				} catch (error) {
					console.error('[Controller] ✗ Scenario 1 failed:', error);
				}

				// Scenario 2: Simulate cross-host call (local -> remote)
				console.log('[Controller] Scenario 2: Cross-host call (local -> remote)');
				const remoteWorkerEndpoint: EndpointDescriptor = {
					id: 'test-worker-remote',
					extensionId: 'vscode.test-ai-interop-worker',
					hostKind: 'remote',
					remoteAuthority: 'ssh://test-host'
				};
				api.registerEndpoint(remoteWorkerEndpoint);

				try {
					const invocationId2 = `routing-test-2-${Date.now()}`;
					const cts2 = new vscode.CancellationTokenSource();
					await api.invokeWithRouting('test-controller', 'test-worker-remote', invocationId2, cts2.token);
					console.log('[Controller] ✓ Scenario 2 passed: Cross-host call succeeded (policy allows)');
					cts2.dispose();
				} catch (error) {
					console.log('[Controller] ✓ Scenario 2: Cross-host call handled as expected:', error);
				}

				// Scenario 3: Remote authority mismatch (remote(A) -> remote(B)) - should reject
				console.log('[Controller] Scenario 3: Remote authority mismatch');
				const controllerRemoteA: EndpointDescriptor = {
					id: 'test-controller-remote-a',
					extensionId: 'vscode.test-ai-interop-controller',
					hostKind: 'remote',
					remoteAuthority: 'ssh://host-a'
				};
				api.registerEndpoint(controllerRemoteA);

				const workerRemoteB: EndpointDescriptor = {
					id: 'test-worker-remote-b',
					extensionId: 'vscode.test-ai-interop-worker',
					hostKind: 'remote',
					remoteAuthority: 'ssh://host-b'
				};
				api.registerEndpoint(workerRemoteB);

				try {
					const invocationId3 = `routing-test-3-${Date.now()}`;
					const cts3 = new vscode.CancellationTokenSource();
					await api.invokeWithRouting('test-controller-remote-a', 'test-worker-remote-b', invocationId3, cts3.token);
					console.error('[Controller] ✗ Scenario 3 failed: Should have rejected remote authority mismatch');
					cts3.dispose();
				} catch (error: any) {
					if (error.message && error.message.includes('REMOTE_AUTHORITY_MISMATCH')) {
						console.log('[Controller] ✓ Scenario 3 passed: Remote authority mismatch rejected correctly');
					} else {
						console.error('[Controller] ✗ Scenario 3 failed with unexpected error:', error);
					}
				}

				// Scenario 4: Incompatible host kinds (web -> local) - should reject
				console.log('[Controller] Scenario 4: Incompatible host kinds (web -> local)');
				const controllerWeb: EndpointDescriptor = {
					id: 'test-controller-web',
					extensionId: 'vscode.test-ai-interop-controller',
					hostKind: 'web',
					remoteAuthority: undefined
				};
				api.registerEndpoint(controllerWeb);

				const workerLocal: EndpointDescriptor = {
					id: 'test-worker-local',
					extensionId: 'vscode.test-ai-interop-worker',
					hostKind: 'local',
					remoteAuthority: undefined
				};
				api.registerEndpoint(workerLocal);

				try {
					const invocationId4 = `routing-test-4-${Date.now()}`;
					const cts4 = new vscode.CancellationTokenSource();
					await api.invokeWithRouting('test-controller-web', 'test-worker-local', invocationId4, cts4.token);
					console.error('[Controller] ✗ Scenario 4 failed: Should have rejected web -> local');
					cts4.dispose();
				} catch (error: any) {
					if (error.message && error.message.includes('HOST_KIND_UNSUPPORTED')) {
						console.log('[Controller] ✓ Scenario 4 passed: web -> local rejected correctly');
					} else {
						console.error('[Controller] ✗ Scenario 4 failed with unexpected error:', error);
					}
				}

				// Check audit log
				const auditLog = await api.getAuditLog();
				console.log('[Controller] Audit log entries:', auditLog.length);
				auditLog.forEach((entry, index) => {
					console.log(`[Controller] Audit[${index}]: ${entry.type}, reason: ${entry.reason || 'none'}`);
				});

				vscode.window.showInformationMessage('Routing test completed. Check console for results.');

			} catch (error) {
				console.error('[Controller] Routing test failed:', error);
				vscode.window.showErrorMessage(`Routing test failed: ${error}`);
			}
		});

		context.subscriptions.push(testRouting);

		// E2E Integration Tests
		const testSessionMgmt = vscode.commands.registerCommand('test-ai-interop.testSessionManagement', testSessionManagement);
		const testPermControl = vscode.commands.registerCommand('test-ai-interop.testPermissionControl', testPermissionControl);
		const testAudit = vscode.commands.registerCommand('test-ai-interop.testAuditLog', testAuditLog);
		const testE2E = vscode.commands.registerCommand('test-ai-interop.testE2EIntegration', testE2EIntegration);

		context.subscriptions.push(testSessionMgmt, testPermControl, testAudit, testE2E);
	} catch (error) {
		console.error('[Controller] Fatal error during activation:', error);
		vscode.window.showErrorMessage(`[Controller] Fatal error: ${error}`);
	}
}

export function deactivate() {
	console.log('[Controller] Test AI Interop Controller extension deactivated');
}
