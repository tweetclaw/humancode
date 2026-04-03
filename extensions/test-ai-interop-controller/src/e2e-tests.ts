/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import * as vscode from 'vscode';

/**
 * Test Scenario 3: Session Management
 * Tests that multiple invocations can be associated with the same session
 */
export async function testSessionManagement(): Promise<void> {
	console.log('[E2E] Starting Session Management test');

	try {
		// Access the aiInterop API (proposed API)
		const aiInterop = (vscode as any).aiInterop;
		if (!aiInterop) {
			throw new Error('aiInterop API not available');
		}

		// Create a new session
		console.log('[E2E] Creating session...');
		const session = await aiInterop.createSession({
			displayName: 'E2E Test Session',
			description: 'Session for end-to-end integration testing',
			metadata: { testType: 'e2e', timestamp: Date.now() }
		});
		console.log(`[E2E] Session created: ${session.id}`);

		// Set as active session
		await aiInterop.setActiveSession(session.id);
		console.log('[E2E] Session set as active');

		// Register test endpoints
		const controllerEndpoint = {
			id: 'e2e-controller',
			extensionId: 'vscode.test-ai-interop-controller',
			displayName: 'E2E Controller',
			description: 'Controller for E2E testing',
			capabilities: [{ type: 'streaming' as const }],
			hostKind: 'local' as const,
			metadata: {}
		};

		const workerEndpoint = {
			id: 'e2e-worker',
			extensionId: 'vscode.test-ai-interop-worker',
			displayName: 'E2E Worker',
			description: 'Worker for E2E testing',
			capabilities: [{ type: 'streaming' as const }],
			hostKind: 'local' as const,
			metadata: {}
		};

		await aiInterop.registerEndpoint(controllerEndpoint);
		await aiInterop.registerEndpoint(workerEndpoint);
		console.log('[E2E] Endpoints registered');

		// Add participants to session
		await aiInterop.addParticipant(session.id, {
			id: 'participant-controller',
			endpointId: 'e2e-controller',
			role: 'controller',
			joinedAt: Date.now()
		});

		await aiInterop.addParticipant(session.id, {
			id: 'participant-worker',
			endpointId: 'e2e-worker',
			role: 'worker',
			joinedAt: Date.now()
		});
		console.log('[E2E] Participants added to session');

		// Verify session state
		const retrievedSession = await aiInterop.getSession(session.id);
		console.log(`[E2E] Session has ${retrievedSession.participants.length} participants`);
		console.log(`[E2E] Session status: ${retrievedSession.status}`);

		// Get all sessions
		const allSessions = await aiInterop.getAllSessions();
		console.log(`[E2E] Total sessions: ${allSessions.length}`);

		// Verify active session
		const activeSession = await aiInterop.getActiveSession();
		console.log(`[E2E] Active session: ${activeSession?.id}`);

		if (activeSession?.id !== session.id) {
			throw new Error('Active session mismatch');
		}

		vscode.window.showInformationMessage(`✓ Session Management test passed: ${retrievedSession.participants.length} participants`);
	} catch (error) {
		console.error('[E2E] Session Management test failed:', error);
		vscode.window.showErrorMessage(`✗ Session Management test failed: ${error}`);
		throw error;
	}
}

/**
 * Test Scenario 4: Permission Control
 * Tests that permission checks work correctly
 */
export async function testPermissionControl(): Promise<void> {
	console.log('[E2E] Starting Permission Control test');

	try {
		const aiInterop = (vscode as any).aiInterop;
		if (!aiInterop) {
			throw new Error('aiInterop API not available');
		}

		// Use unique endpoint IDs to avoid registration conflicts
		const timestamp = Date.now();
		const callerId = `perm-caller-${timestamp}`;
		const targetId = `perm-target-${timestamp}`;

		// Register endpoints
		await aiInterop.registerEndpoint({
			id: callerId,
			extensionId: 'vscode.test-ai-interop-controller',
			displayName: 'Permission Caller',
			capabilities: [{ type: 'streaming' as const }],
			hostKind: 'local' as const,
			metadata: {}
		});

		await aiInterop.registerEndpoint({
			id: targetId,
			extensionId: 'vscode.test-ai-interop-worker',
			displayName: 'Permission Target',
			capabilities: [{ type: 'streaming' as const }],
			hostKind: 'local' as const,
			metadata: {}
		});

		// Check permission (should be denied initially)
		console.log('[E2E] Checking permission (should be denied)...');
		const checkResult1 = await aiInterop.checkPermission(callerId, targetId);
		console.log(`[E2E] Permission check result: allowed=${checkResult1.allowed}, reason=${checkResult1.reason}`);

		// Request permission (should auto-grant in Phase 1)
		console.log('[E2E] Requesting permission (should auto-grant)...');
		const requestResult = await aiInterop.requestPermission(callerId, targetId);
		console.log(`[E2E] Permission request result: allowed=${requestResult.allowed}, scope=${requestResult.scope}`);

		if (!requestResult.allowed) {
			throw new Error('Permission request was denied');
		}

		// Check permission again (should be allowed now)
		console.log('[E2E] Checking permission again (should be allowed)...');
		const checkResult2 = await aiInterop.checkPermission(callerId, targetId);
		console.log(`[E2E] Permission check result: allowed=${checkResult2.allowed}, scope=${checkResult2.scope}`);

		if (!checkResult2.allowed) {
			throw new Error('Permission check failed after grant');
		}

		// Get all permissions
		const permissions = await aiInterop.getPermissions();
		console.log(`[E2E] Total permissions: ${permissions.length}`);

		vscode.window.showInformationMessage(`✓ Permission Control test passed: ${permissions.length} permissions`);
	} catch (error) {
		console.error('[E2E] Permission Control test failed:', error);
		vscode.window.showErrorMessage(`✗ Permission Control test failed: ${error}`);
		throw error;
	}
}

/**
 * Test Scenario 5: Audit Log
 * Tests that all events are properly logged
 */
export async function testAuditLog(): Promise<void> {
	console.log('[E2E] Starting Audit Log test');

	try {
		const aiInterop = (vscode as any).aiInterop;
		if (!aiInterop) {
			throw new Error('aiInterop API not available');
		}

		// Clear existing audit events
		await aiInterop.clearAuditEvents();
		console.log('[E2E] Cleared audit events');

		// Perform some operations that should be audited
		const endpoint = {
			id: 'audit-test-endpoint',
			extensionId: 'vscode.test-ai-interop-controller',
			displayName: 'Audit Test Endpoint',
			capabilities: [{ type: 'streaming' as const }],
			hostKind: 'local' as const,
			metadata: {}
		};

		await aiInterop.registerEndpoint(endpoint);
		console.log('[E2E] Registered endpoint (should be audited)');

		// Create a session
		const session = await aiInterop.createSession({
			displayName: 'Audit Test Session',
			description: 'Session for audit testing'
		});
		console.log('[E2E] Created session (should be audited)');

		// Get all audit events
		const allEvents = await aiInterop.getAuditEvents();
		console.log(`[E2E] Total audit events: ${allEvents.length}`);

		// Filter by type
		const endpointEvents = await aiInterop.getAuditEvents({ type: 'endpoint_registered' });
		console.log(`[E2E] Endpoint registration events: ${endpointEvents.length}`);

		const sessionEvents = await aiInterop.getAuditEvents({ type: 'session_created' });
		console.log(`[E2E] Session creation events: ${sessionEvents.length}`);

		// Verify events were logged
		if (allEvents.length === 0) {
			throw new Error('No audit events were logged');
		}

		// Display event details
		allEvents.forEach((event: any, index: number) => {
			console.log(`[E2E] Event ${index + 1}: type=${event.type}, timestamp=${event.timestamp}`);
		});

		vscode.window.showInformationMessage(`✓ Audit Log test passed: ${allEvents.length} events logged`);
	} catch (error) {
		console.error('[E2E] Audit Log test failed:', error);
		vscode.window.showErrorMessage(`✗ Audit Log test failed: ${error}`);
		throw error;
	}
}

/**
 * Test Scenario: Complete E2E Integration
 * Tests all components working together
 */
export async function testE2EIntegration(): Promise<void> {
	console.log('[E2E] Starting Complete E2E Integration test');

	try {
		// Run all test scenarios in sequence
		console.log('[E2E] Running Session Management test...');
		await testSessionManagement();

		console.log('[E2E] Running Permission Control test...');
		await testPermissionControl();

		console.log('[E2E] Running Audit Log test...');
		await testAuditLog();

		vscode.window.showInformationMessage('✓ All E2E Integration tests passed!');
	} catch (error) {
		console.error('[E2E] E2E Integration test failed:', error);
		vscode.window.showErrorMessage(`✗ E2E Integration test failed: ${error}`);
		throw error;
	}
}
