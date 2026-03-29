/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { Emitter } from '../../../../base/common/event.js';
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

	async createSession(config: SessionConfig): Promise<SessionDescriptor> {
		const session: SessionDescriptor = {
			id: `session-${Date.now()}`,
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

		return session;
	}

	getSession(sessionId: string): SessionDescriptor | undefined {
		return this._sessions.get(sessionId);
	}

	getAllSessions(): SessionDescriptor[] {
		return Array.from(this._sessions.values());
	}

	async deleteSession(sessionId: string): Promise<void> {
		this._sessions.delete(sessionId);
		if (this._activeSessionId === sessionId) {
			this._activeSessionId = undefined;
		}
		this._onDidDeleteSession.fire(sessionId);
	}

	async addParticipant(sessionId: string, participant: ParticipantDescriptor): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (session) {
			session.participants.push(participant);
			this._onDidAddParticipant.fire({ sessionId, participant });
		}
	}

	async removeParticipant(sessionId: string, participantId: string): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (session) {
			session.participants = session.participants.filter(p => p.id !== participantId);
			this._onDidRemoveParticipant.fire({ sessionId, participantId });
		}
	}

	getParticipants(sessionId: string): ParticipantDescriptor[] {
		const session = this._sessions.get(sessionId);
		return session ? session.participants : [];
	}

	async associateInvocation(sessionId: string, invocationId: string): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (session) {
			session.invocations.push(invocationId);
			session.lastActiveAt = Date.now();
		}
	}

	getSessionInvocations(sessionId: string): string[] {
		const session = this._sessions.get(sessionId);
		return session ? session.invocations : [];
	}

	async updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void> {
		const session = this._sessions.get(sessionId);
		if (session) {
			session.status = status;
			this._onDidUpdateSessionStatus.fire({ sessionId, status });
		}
	}

	getActiveSession(): SessionDescriptor | undefined {
		return this._activeSessionId ? this._sessions.get(this._activeSessionId) : undefined;
	}

	async setActiveSession(sessionId: string): Promise<void> {
		this._activeSessionId = sessionId;
	}
}

registerSingleton(IAISessionBrokerService, AISessionBrokerService, InstantiationType.Delayed);
