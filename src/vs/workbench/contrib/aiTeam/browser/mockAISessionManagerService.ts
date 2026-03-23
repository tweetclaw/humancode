/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import {
	IAISessionManagerService,
	IMessage,
	IRelayRequest,
	ISessionConfig,
	ISessionContext,
	SessionStatus
} from '../../../services/aiSessionManager/common/aiSessionManager.js';

/**
 * Mock implementation of IAISessionManagerService for UI development.
 * Returns hardcoded data to allow UI development without waiting for real service.
 */
export class MockAISessionManagerService implements IAISessionManagerService {

	readonly _serviceBrand: undefined;

	private sessions: Map<string, ISessionContext> = new Map();
	private activeSessionId: string | null = null;

	private readonly _onDidSessionsChange = new Emitter<void>();
	readonly onDidSessionsChange: Event<void> = this._onDidSessionsChange.event;

	private readonly _onDidMessageAppend = new Emitter<{ sessionId: string; message: IMessage }>();
	readonly onDidMessageAppend: Event<{ sessionId: string; message: IMessage }> = this._onDidMessageAppend.event;

	private readonly _onDidSessionStatusChange = new Emitter<{ sessionId: string; status: SessionStatus }>();
	readonly onDidSessionStatusChange: Event<{ sessionId: string; status: SessionStatus }> = this._onDidSessionStatusChange.event;

	private readonly _onDidRelayMessage = new Emitter<{ request: IRelayRequest; prompt: string }>();
	readonly onDidRelayMessage: Event<{ request: IRelayRequest; prompt: string }> = this._onDidRelayMessage.event;

	constructor() {
		this.initializeMockData();
	}

	private initializeMockData(): void {
		const now = Date.now();

		// Mock session 1: Frontend Engineer
		const frontendSession: ISessionContext = {
			sessionId: 'mock-frontend-001',
			name: 'Frontend Alex',
			role: 'Frontend Development',
			extensionId: 'github.copilot',
			systemPrompt: 'You are a frontend development expert specializing in React, TypeScript, and modern CSS.',
			avatarColor: '#4FC3F7',
			skillTags: ['React', 'TypeScript', 'CSS', 'Tailwind'],
			conversationHistory: [
				{
					id: 'msg-1',
					direction: 'user',
					content: 'Help me create a responsive navigation bar',
					timestamp: now - 3600000
				},
				{
					id: 'msg-2',
					direction: 'assistant',
					content: 'I can help you create a responsive navigation bar using flexbox and media queries...',
					timestamp: now - 3500000
				}
			],
			metadata: {
				status: 'idle',
				createdAt: now - 7200000,
				lastActiveAt: now - 3500000,
				messageCount: 2
			}
		};

		// Mock session 2: QA Tester
		const qaSession: ISessionContext = {
			sessionId: 'mock-qa-002',
			name: 'QA Jordan',
			role: 'Quality Assurance',
			extensionId: 'github.copilot',
			systemPrompt: 'You are a QA testing expert focused on test automation, edge cases, and quality standards.',
			avatarColor: '#FF9800',
			skillTags: ['Testing', 'Jest', 'Playwright', 'E2E'],
			conversationHistory: [
				{
					id: 'msg-3',
					direction: 'user',
					content: 'Review this component for potential bugs',
					timestamp: now - 1800000
				}
			],
			metadata: {
				status: 'working',
				createdAt: now - 5400000,
				lastActiveAt: now - 1800000,
				messageCount: 1
			}
		};

		// Mock session 3: Backend Engineer
		const backendSession: ISessionContext = {
			sessionId: 'mock-backend-003',
			name: 'Backend Sam',
			role: 'Backend Development',
			extensionId: 'github.copilot',
			systemPrompt: 'You are a backend development expert specializing in Node.js, databases, and API design.',
			avatarColor: '#4CAF50',
			skillTags: ['Node.js', 'PostgreSQL', 'REST API', 'GraphQL'],
			conversationHistory: [],
			metadata: {
				status: 'idle',
				createdAt: now - 10800000,
				lastActiveAt: now - 10800000,
				messageCount: 0
			}
		};

		this.sessions.set(frontendSession.sessionId, frontendSession);
		this.sessions.set(qaSession.sessionId, qaSession);
		this.sessions.set(backendSession.sessionId, backendSession);
	}

	createSession(config: ISessionConfig): string {
		const sessionId = `mock-${Date.now()}-${Math.random().toString(36).substring(7)}`;
		const now = Date.now();

		const session: ISessionContext = {
			sessionId,
			name: config.name,
			role: config.role,
			extensionId: config.extensionId,
			systemPrompt: config.systemPrompt,
			avatarColor: config.avatarColor,
			skillTags: config.skillTags,
			conversationHistory: [],
			metadata: {
				status: 'idle',
				createdAt: now,
				lastActiveAt: now,
				messageCount: 0
			}
		};

		this.sessions.set(sessionId, session);
		this._onDidSessionsChange.fire();
		return sessionId;
	}

	getSession(sessionId: string): ISessionContext | undefined {
		return this.sessions.get(sessionId);
	}

	deleteSession(sessionId: string): void {
		this.sessions.delete(sessionId);
		if (this.activeSessionId === sessionId) {
			this.activeSessionId = null;
		}
		this._onDidSessionsChange.fire();
	}

	getAllSessions(): ISessionContext[] {
		return Array.from(this.sessions.values()).sort((a, b) => a.metadata.createdAt - b.metadata.createdAt);
	}

	getActiveSessionId(): string | null {
		return this.activeSessionId;
	}

	setActiveSession(sessionId: string): void {
		this.activeSessionId = sessionId;
	}

	clearActiveSession(): void {
		this.activeSessionId = null;
	}

	appendMessage(sessionId: string, message: Omit<IMessage, 'id' | 'timestamp'>): void {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const fullMessage: IMessage = {
			id: `msg-${Date.now()}-${Math.random().toString(36).substring(7)}`,
			timestamp: Date.now(),
			...message
		};

		// Update session (need to work around readonly)
		const updatedHistory = [...session.conversationHistory, fullMessage];
		const updatedSession: ISessionContext = {
			...session,
			conversationHistory: updatedHistory,
			metadata: {
				...session.metadata,
				lastActiveAt: Date.now(),
				messageCount: session.metadata.messageCount + 1
			}
		};

		this.sessions.set(sessionId, updatedSession);
		this._onDidMessageAppend.fire({ sessionId, message: fullMessage });
	}

	getSessionContext(sessionId: string, maxMessages: number = 20): string {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return '';
		}

		let context = `# Role\n${session.systemPrompt}\n\n`;

		const recentMessages = session.conversationHistory.slice(-maxMessages);
		if (recentMessages.length > 0) {
			context += '# Conversation History\n';
			for (const msg of recentMessages) {
				const label = msg.direction === 'user' ? '[User]' : '[AI]';
				context += `${label}: ${msg.content}\n`;
			}
		}

		return context;
	}

	updateSessionStatus(sessionId: string, status: SessionStatus): void {
		const session = this.sessions.get(sessionId);
		if (!session) {
			return;
		}

		const updatedSession: ISessionContext = {
			...session,
			metadata: {
				...session.metadata,
				status
			}
		};

		this.sessions.set(sessionId, updatedSession);
		this._onDidSessionStatusChange.fire({ sessionId, status });
	}

	relayMessage(request: IRelayRequest): void {
		const fromSession = this.sessions.get(request.fromSessionId);
		if (!fromSession) {
			return;
		}

		const lastAssistantMessage = [...fromSession.conversationHistory]
			.reverse()
			.find(msg => msg.direction === 'assistant');

		if (!lastAssistantMessage) {
			return;
		}

		let prompt: string;
		if (request.customInstruction) {
			prompt = `${request.customInstruction}\n\n${lastAssistantMessage.content}`;
		} else {
			const prefixes = {
				review: 'Please review and test the following code/content:',
				handoff: 'Previous colleague has completed the following work, please continue:',
				feedback: 'Received the following feedback, please modify accordingly:'
			};
			prompt = `${prefixes[request.relayType]}\n\n${lastAssistantMessage.content}`;
		}

		this.setActiveSession(request.toSessionId);
		this._onDidRelayMessage.fire({ request, prompt });
	}
}
