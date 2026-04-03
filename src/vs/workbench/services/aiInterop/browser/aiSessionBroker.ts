/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
import { generateUuid } from '../../../../base/common/uuid.js';
import { ILogService } from '../../../../platform/log/common/log.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import {
	IAISessionBrokerService,
	SessionDescriptor,
	SessionConfig,
	ParticipantDescriptor,
	SessionStatus
} from '../common/aiInterop.js';

export class AISessionBrokerService extends Disposable implements IAISessionBrokerService {
	declare readonly _serviceBrand: undefined;

	private readonly _sessions = new Map<string, SessionDescriptor>();
	private _activeSessionId: string | undefined;

	private readonly _onDidCreateSession = this._register(new Emitter<SessionDescriptor>());
	readonly onDidCreateSession = this._onDidCreateSession.event;

	private readonly _onDidDeleteSession = this._register(new Emitter<string>());
	readonly onDidDeleteSession = this._onDidDeleteSession.event;

	private readonly _onDidAddParticipant = this._register(new Emitter<{ sessionId: string; participant: ParticipantDescriptor }>());
	readonly onDidAddParticipant = this._onDidAddParticipant.event;

	private readonly _onDidRemoveParticipant = this._register(new Emitter<{ sessionId: string; participantId: string }>());
	readonly onDidRemoveParticipant = this._onDidRemoveParticipant.event;

	private readonly _onDidUpdateSessionStatus = this._register(new Emitter<{ sessionId: string; status: SessionStatus }>());
	readonly onDidUpdateSessionStatus = this._onDidUpdateSessionStatus.event;

	constructor(
		@ILogService private readonly logService: ILogService,
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadSessions();
	}

	// ========================================
	// Session Management
	// ========================================

	async createSession(config: SessionConfig): Promise<SessionDescriptor> {
		const session: SessionDescriptor = {
			id: generateUuid(),
			displayName: config.displayName,
			description: config.description,
			status: 'active',
			participants: [],
			invocations: [],
			createdAt: Date.now(),
			lastActiveAt: Date.now(),
			metadata: config.metadata
		};

		this._sessions.set(session.id, session);
		this._onDidCreateSession.fire(session);
		this._persistSessions();

		this.logService.info(`[SessionBroker] Session created: ${session.id}`);
		return session;
	}

	getSession(sessionId: string): SessionDescriptor | undefined {
		return this._sessions.get(sessionId);
	}

	getAllSessions(): SessionDescriptor[] {
		return Array.from(this._sessions.values())
			.sort((a, b) => b.lastActiveAt - a.lastActiveAt);
	}

	async deleteSession(sessionId: string): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		// Clear active session if this is the active one
		if (this._activeSessionId === sessionId) {
			this._activeSessionId = undefined;
		}

		this._sessions.delete(sessionId);
		this._onDidDeleteSession.fire(sessionId);
		this._persistSessions();

		this.logService.info(`[SessionBroker] Session deleted: ${sessionId}`);
	}

	// ========================================
	// Participant Management
	// ========================================

	async addParticipant(sessionId: string, participant: ParticipantDescriptor): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		// Check if participant already exists
		if (session.participants.some(p => p.id === participant.id)) {
			throw new Error(`Participant ${participant.id} already exists in session`);
		}

		session.participants.push(participant);
		session.lastActiveAt = Date.now();
		this._sessions.set(sessionId, session);

		this._onDidAddParticipant.fire({ sessionId, participant });
		this._persistSessions();

		this.logService.info(`[SessionBroker] Participant added: ${participant.id} to session ${sessionId}`);
	}

	async removeParticipant(sessionId: string, participantId: string): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		const index = session.participants.findIndex(p => p.id === participantId);
		if (index === -1) {
			throw new Error(`Participant ${participantId} not found in session`);
		}

		session.participants.splice(index, 1);
		session.lastActiveAt = Date.now();
		this._sessions.set(sessionId, session);

		this._onDidRemoveParticipant.fire({ sessionId, participantId });
		this._persistSessions();

		this.logService.info(`[SessionBroker] Participant removed: ${participantId} from session ${sessionId}`);
	}

	getParticipants(sessionId: string): ParticipantDescriptor[] {
		const session = this._sessions.get(sessionId);
		return session ? session.participants : [];
	}

	// ========================================
	// Invocation Association
	// ========================================

	async associateInvocation(sessionId: string, invocationId: string): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		if (!session.invocations.includes(invocationId)) {
			session.invocations.push(invocationId);
			session.lastActiveAt = Date.now();
			this._sessions.set(sessionId, session);
			this._persistSessions();
		}
	}

	getSessionInvocations(sessionId: string): string[] {
		const session = this._sessions.get(sessionId);
		return session ? session.invocations : [];
	}

	// ========================================
	// Session State Management
	// ========================================

	async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		session.status = status;
		session.lastActiveAt = Date.now();
		this._sessions.set(sessionId, session);

		this._onDidUpdateSessionStatus.fire({ sessionId, status });
		this._persistSessions();

		this.logService.info(`[SessionBroker] Session status updated: ${sessionId} -> ${status}`);
	}

	getActiveSession(): SessionDescriptor | undefined {
		return this._activeSessionId ? this._sessions.get(this._activeSessionId) : undefined;
	}

	async setActiveSession(sessionId: string): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (!session) {
			throw new Error(`Session ${sessionId} not found`);
		}

		this._activeSessionId = sessionId;
		session.lastActiveAt = Date.now();
		this._sessions.set(sessionId, session);
		this._persistSessions();

		this.logService.info(`[SessionBroker] Active session set: ${sessionId}`);
	}

	// ========================================
	// Persistence
	// ========================================

	private _loadSessions(): void {
		const stored = this.storageService.get('aiInterop.sessions', StorageScope.WORKSPACE);
		if (stored) {
			try {
				const data = JSON.parse(stored);
				for (const session of data.sessions || []) {
					this._sessions.set(session.id, session);
				}
				this._activeSessionId = data.activeSessionId;
				this.logService.info(`[SessionBroker] Loaded ${this._sessions.size} sessions from storage`);
			} catch (error) {
				this.logService.error('[SessionBroker] Failed to load sessions', error);
			}
		}
	}

	private _persistSessions(): void {
		const data = {
			sessions: Array.from(this._sessions.values()),
			activeSessionId: this._activeSessionId
		};
		this.storageService.store('aiInterop.sessions', JSON.stringify(data), StorageScope.WORKSPACE, StorageTarget.MACHINE);
	}
}

registerSingleton(IAISessionBrokerService, AISessionBrokerService, InstantiationType.Delayed);
