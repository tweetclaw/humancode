/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

interface TestAiInteropAPI {
	onInvoke: vscode.Event<{ invocationId: string; token: vscode.CancellationToken; resolve: () => void; reject: (err: any) => void }>;
	sendChunk(invocationId: string, seq: number, text: string): Promise<void>;
	onInvocationComplete(invocationId: string): Promise<void>;
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}

export function activate(context: vscode.ExtensionContext) {
	try {
		console.log('[Worker] Test AI Interop Worker extension activated');
		console.log('[Worker] vscode object keys:', Object.keys(vscode).filter(k => k.includes('test') || k.includes('Test')));

		// Get the internal test API
		const api = (vscode as any).testAiInterop as TestAiInteropAPI | undefined;

		console.log('[Worker] testAiInterop API:', api ? 'available' : 'NOT AVAILABLE');
		console.log('[Worker] testAiInterop type:', typeof api);

		if (!api) {
			console.error('[Worker] Test AI Interop API not available');
			vscode.window.showErrorMessage('[Worker] Test AI Interop API not available');
			return;
		}

		// Listen for invocations
		const disposable = api.onInvoke(async ({ invocationId, token, resolve, reject }) => {
			console.log(`[Worker] Received invocation: ${invocationId}`);

			try {
				// Send 1000 chunks with 20ms interval, but respond to cancel
				for (let i = 0; i < 1000; i++) {
					// Check if cancellation was requested
					if (token.isCancellationRequested) {
						console.log(`[Worker] Canceled at chunk ${i}, invocationId: ${invocationId}`);
						resolve(); // Resolve the promise to complete the RPC call
						return;
					}

					await api.sendChunk(invocationId, i, `chunk-${i}`);
					await sleep(20);
				}

				console.log(`[Worker] Completed invocation: ${invocationId}`);

				// Notify completion for cleanup
				await api.onInvocationComplete(invocationId);

				// Resolve the promise to complete the RPC call
				resolve();
			} catch (error) {
				console.error(`[Worker] Error during invocation ${invocationId}:`, error);
				reject(error);
			}
		});

		context.subscriptions.push(disposable);
	} catch (error) {
		console.error('[Worker] Fatal error during activation:', error);
		vscode.window.showErrorMessage(`[Worker] Fatal error: ${error}`);
	}
}

export function deactivate() {
	console.log('[Worker] Test AI Interop Worker extension deactivated');
}
