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
	console.log('[Controller] Test AI Interop Controller extension activated');

	// Get the internal test API
	const api = (vscode as any).testAiInterop as TestAiInteropAPI | undefined;

	if (!api) {
		console.error('[Controller] Test AI Interop API not available');
		return;
	}

	const command = vscode.commands.registerCommand('test-ai-interop.runTest', async () => {
		const invocationId = `test-${Date.now()}`;
		const received: number[] = [];
		const timestamps: number[] = [];
		const startTime = Date.now();

		console.log(`[Controller] Starting test with invocationId: ${invocationId}`);

		// Subscribe to chunk received events
		const disposable = api.onDidReceiveChunk((data) => {
			if (data.invocationId === invocationId) {
				received.push(data.seq);
				timestamps.push(data.timestamp);
			}
		});

		try {
			// Invoke the worker
			await api.invoke(invocationId);

			// Wait for completion (max 5 seconds)
			await waitForCompletion(received, 100, 5000);

			// Calculate statistics
			const endTime = Date.now();
			const totalTime = endTime - startTime;
			const missing = findMissingSeq(received, 100);
			const outOfOrder = checkOrder(received);
			const lossRate = ((100 - received.length) / 100) * 100;

			// Calculate latencies
			const latencies: number[] = [];
			for (let i = 1; i < timestamps.length; i++) {
				latencies.push(timestamps[i] - timestamps[i - 1]);
			}

			// Output statistics report
			const report = [
				'',
				'=== AI Interop RPC Performance Test Results ===',
				'',
				`Invocation ID: ${invocationId}`,
				`Total time: ${totalTime}ms`,
				`Expected chunks: 100`,
				`Received chunks: ${received.length}`,
				`Loss rate: ${lossRate.toFixed(2)}%`,
				`Out of order: ${outOfOrder.length}`,
				'',
				'Latency Statistics:',
				`  Min: ${latencies.length > 0 ? Math.min(...latencies) : 0}ms`,
				`  Max: ${latencies.length > 0 ? Math.max(...latencies) : 0}ms`,
				`  Avg: ${latencies.length > 0 ? (latencies.reduce((a, b) => a + b, 0) / latencies.length).toFixed(2) : 0}ms`,
				`  P95: ${percentile(latencies, 0.95).toFixed(2)}ms`,
				'',
				missing.length > 0 ? `Missing sequences: ${missing.join(', ')}` : 'No missing sequences',
				outOfOrder.length > 0 ? `Out of order indices: ${outOfOrder.join(', ')}` : 'No out of order chunks',
				'',
				'===============================================',
				''
			].join('\n');

			console.log(report);
			vscode.window.showInformationMessage(`Test completed: ${received.length}/100 chunks received, ${lossRate.toFixed(2)}% loss`);

		} catch (error) {
			console.error(`[Controller] Test failed:`, error);
			vscode.window.showErrorMessage(`Test failed: ${error}`);
		} finally {
			disposable.dispose();
		}
	});

	context.subscriptions.push(command);
}

export function deactivate() {
	console.log('[Controller] Test AI Interop Controller extension deactivated');
}
