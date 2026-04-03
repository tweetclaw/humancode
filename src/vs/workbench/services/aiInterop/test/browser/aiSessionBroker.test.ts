/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import assert from 'assert';
import { Event } from '../../../../../base/common/event.js';
import { ensureNoDisposablesAreLeakedInTestSuite } from '../../../../../base/test/common/utils.js';
import { NullLogService } from '../../../../../platform/log/common/log.js';
import { AISessionBrokerService } from '../../browser/aiSessionBroker.js';
import { TestStorageService } from '../../../../test/common/workbenchTestServices.js';
import {
	SessionConfig,
	ParticipantDescriptor
} from '../../common/aiInterop.js';

suite('AISessionBrokerService', () => {
	const disposables = ensureNoDisposablesAreLeakedInTestSuite();

	let sessionBroker: AISessionBrokerService;
	let storageService: TestStorageService;

	setup(() => {
		storageService = disposables.add(new TestStorageService());
		const logService = new NullLogService();
		sessionBroker = disposables.add(new AISessionBrokerService(logService, storageService));
	});

	suite('Session Management', () => {
		test('createSession - success', async () => {
			const config: SessionConfig = {
				displayName: 'Test Session',
				description: 'A test session',
				metadata: { purpose: 'testing' }
			};

			const created = Event.toPromise(sessionBroker.onDidCreateSession);
			const session = await sessionBroker.createSession(config);

			assert.ok(session.id);
			assert.strictEqual(session.displayName, 'Test Session');
			assert.strictEqual(session.description, 'A test session');
			assert.strictEqual(session.status, 'active');
			assert.strictEqual(session.participants.length, 0);
			assert.strictEqual(session.invocations.length, 0);
			assert.ok(session.createdAt);
			assert.ok(session.lastActiveAt);

			const result = await created;
			assert.deepStrictEqual(result, session);
		});

		test('getSession - returns session', async () => {
			const config: SessionConfig = {
				displayName: 'Test Session'
			};

			const session = await sessionBroker.createSession(config);
			const retrieved = sessionBroker.getSession(session.id);

			assert.deepStrictEqual(retrieved, session);
		});

		test('getSession - returns undefined for non-existent session', () => {
			const retrieved = sessionBroker.getSession('non-existent');
			assert.strictEqual(retrieved, undefined);
		});

		test('getAllSessions - returns all sessions sorted by lastActiveAt', async () => {
			const config1: SessionConfig = { displayName: 'Session 1' };
			const config2: SessionConfig = { displayName: 'Session 2' };

			const session1 = await sessionBroker.createSession(config1);
			await new Promise(resolve => setTimeout(resolve, 10));
			const session2 = await sessionBroker.createSession(config2);

			const sessions = sessionBroker.getAllSessions();
			assert.strictEqual(sessions.length, 2);
			assert.strictEqual(sessions[0].id, session2.id); // Most recent first
			assert.strictEqual(sessions[1].id, session1.id);
		});

		test('deleteSession - success', async () => {
			const config: SessionConfig = { displayName: 'Test Session' };
			const session = await sessionBroker.createSession(config);

			const deleted = Event.toPromise(sessionBroker.onDidDeleteSession);
			await sessionBroker.deleteSession(session.id);

			const result = await deleted;
			assert.strictEqual(result, session.id);

			const retrieved = sessionBroker.getSession(session.id);
			assert.strictEqual(retrieved, undefined);
		});

		test('deleteSession - throws error for non-existent session', async () => {
			await assert.rejects(
				async () => await sessionBroker.deleteSession('non-existent'),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('deleteSession - clears active session if deleted', async () => {
			const config: SessionConfig = { displayName: 'Test Session' };
			const session = await sessionBroker.createSession(config);
			await sessionBroker.setActiveSession(session.id);

			assert.ok(sessionBroker.getActiveSession());

			await sessionBroker.deleteSession(session.id);

			assert.strictEqual(sessionBroker.getActiveSession(), undefined);
		});
	});

	suite('Participant Management', () => {
		let sessionId: string;

		setup(async () => {
			const config: SessionConfig = { displayName: 'Test Session' };
			const session = await sessionBroker.createSession(config);
			sessionId = session.id;
		});

		test('addParticipant - success', async () => {
			const participant: ParticipantDescriptor = {
				id: 'participant1',
				endpointId: 'test.endpoint',
				role: 'controller',
				joinedAt: Date.now()
			};

			const added = Event.toPromise(sessionBroker.onDidAddParticipant);
			await sessionBroker.addParticipant(sessionId, participant);

			const result = await added;
			assert.strictEqual(result.sessionId, sessionId);
			assert.deepStrictEqual(result.participant, participant);

			const participants = sessionBroker.getParticipants(sessionId);
			assert.strictEqual(participants.length, 1);
			assert.deepStrictEqual(participants[0], participant);
		});

		test('addParticipant - throws error for duplicate participant', async () => {
			const participant: ParticipantDescriptor = {
				id: 'participant1',
				endpointId: 'test.endpoint',
				role: 'controller',
				joinedAt: Date.now()
			};

			await sessionBroker.addParticipant(sessionId, participant);

			await assert.rejects(
				async () => await sessionBroker.addParticipant(sessionId, participant),
				(error: Error) => {
					assert.ok(error.message.includes('already exists'));
					return true;
				}
			);
		});

		test('addParticipant - throws error for non-existent session', async () => {
			const participant: ParticipantDescriptor = {
				id: 'participant1',
				endpointId: 'test.endpoint',
				role: 'controller',
				joinedAt: Date.now()
			};

			await assert.rejects(
				async () => await sessionBroker.addParticipant('non-existent', participant),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('removeParticipant - success', async () => {
			const participant: ParticipantDescriptor = {
				id: 'participant1',
				endpointId: 'test.endpoint',
				role: 'controller',
				joinedAt: Date.now()
			};

			await sessionBroker.addParticipant(sessionId, participant);

			const removed = Event.toPromise(sessionBroker.onDidRemoveParticipant);
			await sessionBroker.removeParticipant(sessionId, 'participant1');

			const result = await removed;
			assert.strictEqual(result.sessionId, sessionId);
			assert.strictEqual(result.participantId, 'participant1');

			const participants = sessionBroker.getParticipants(sessionId);
			assert.strictEqual(participants.length, 0);
		});

		test('removeParticipant - throws error for non-existent participant', async () => {
			await assert.rejects(
				async () => await sessionBroker.removeParticipant(sessionId, 'non-existent'),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('getParticipants - returns empty array for non-existent session', () => {
			const participants = sessionBroker.getParticipants('non-existent');
			assert.strictEqual(participants.length, 0);
		});
	});

	suite('Invocation Association', () => {
		let sessionId: string;

		setup(async () => {
			const config: SessionConfig = { displayName: 'Test Session' };
			const session = await sessionBroker.createSession(config);
			sessionId = session.id;
		});

		test('associateInvocation - success', async () => {
			await sessionBroker.associateInvocation(sessionId, 'invocation1');

			const invocations = sessionBroker.getSessionInvocations(sessionId);
			assert.strictEqual(invocations.length, 1);
			assert.strictEqual(invocations[0], 'invocation1');
		});

		test('associateInvocation - does not add duplicates', async () => {
			await sessionBroker.associateInvocation(sessionId, 'invocation1');
			await sessionBroker.associateInvocation(sessionId, 'invocation1');

			const invocations = sessionBroker.getSessionInvocations(sessionId);
			assert.strictEqual(invocations.length, 1);
		});

		test('associateInvocation - throws error for non-existent session', async () => {
			await assert.rejects(
				async () => await sessionBroker.associateInvocation('non-existent', 'invocation1'),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('getSessionInvocations - returns empty array for non-existent session', () => {
			const invocations = sessionBroker.getSessionInvocations('non-existent');
			assert.strictEqual(invocations.length, 0);
		});
	});

	suite('Session State Management', () => {
		let sessionId: string;

		setup(async () => {
			const config: SessionConfig = { displayName: 'Test Session' };
			const session = await sessionBroker.createSession(config);
			sessionId = session.id;
		});

		test('updateSessionStatus - success', async () => {
			const updated = Event.toPromise(sessionBroker.onDidUpdateSessionStatus);
			await sessionBroker.updateSessionStatus(sessionId, 'idle');

			const result = await updated;
			assert.strictEqual(result.sessionId, sessionId);
			assert.strictEqual(result.status, 'idle');

			const session = sessionBroker.getSession(sessionId);
			assert.strictEqual(session?.status, 'idle');
		});

		test('updateSessionStatus - throws error for non-existent session', async () => {
			await assert.rejects(
				async () => await sessionBroker.updateSessionStatus('non-existent', 'idle'),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('setActiveSession - success', async () => {
			await sessionBroker.setActiveSession(sessionId);

			const activeSession = sessionBroker.getActiveSession();
			assert.ok(activeSession);
			assert.strictEqual(activeSession.id, sessionId);
		});

		test('setActiveSession - throws error for non-existent session', async () => {
			await assert.rejects(
				async () => await sessionBroker.setActiveSession('non-existent'),
				(error: Error) => {
					assert.ok(error.message.includes('not found'));
					return true;
				}
			);
		});

		test('getActiveSession - returns undefined when no active session', () => {
			const activeSession = sessionBroker.getActiveSession();
			assert.strictEqual(activeSession, undefined);
		});
	});

	suite('Persistence', () => {
		test('sessions are persisted and loaded', async () => {
			const config: SessionConfig = {
				displayName: 'Persistent Session',
				metadata: { test: true }
			};

			const session = await sessionBroker.createSession(config);

			// Create new service instance with same storage
			const newBroker = disposables.add(new AISessionBrokerService(new NullLogService(), storageService));

			const retrieved = newBroker.getSession(session.id);
			assert.ok(retrieved);
			assert.strictEqual(retrieved.displayName, 'Persistent Session');
			assert.deepStrictEqual(retrieved.metadata, { test: true });
		});
	});
});
