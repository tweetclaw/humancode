/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

interface TestAiInteropAPI {
	invoke(invocationId: string): Promise<void>;
	onDidReceiveChunk: vscode.Event<{ invocationId: string; seq: number; text: string; timestamp: number }>;
	getStats(invocationId: string): InvocationStats | undefined;
	clearStats(): void;
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
		console.log('[Controller] Test AI Interop Controller extension activated');
		console.log('[Controller] vscode object keys:', Object.keys(vscode).filter(k => k.includes('test') || k.includes('Test')));

		// Get the internal test API
		const api = (vscode as any).testAiInterop as TestAiInteropAPI | undefined;

		console.log('[Controller] testAiInterop API:', api ? 'available' : 'NOT AVAILABLE');
		console.log('[Controller] testAiInterop type:', typeof api);

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

				// Start all workers in parallel
				await Promise.all(invocationIds.map(id => api.invoke(id)));

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
	} catch (error) {
		console.error('[Controller] Fatal error during activation:', error);
		vscode.window.showErrorMessage(`[Controller] Fatal error: ${error}`);
	}
}

export function deactivate() {
	console.log('[Controller] Test AI Interop Controller extension deactivated');
}
