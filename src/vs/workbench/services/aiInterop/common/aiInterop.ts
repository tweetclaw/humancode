/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Event } from '../../../../base/common/event.js';
import { CancellationToken } from '../../../../base/common/cancellation.js';
import { createDecorator } from '../../../../platform/instantiation/common/instantiation.js';

// ========================================
// Service ID Constants
// ========================================

export const IAIInteropBusService = createDecorator<IAIInteropBusService>('aiInteropBusService');
export const IAISessionBrokerService = createDecorator<IAISessionBrokerService>('aiSessionBrokerService');
export const IAIInteropPolicyService = createDecorator<IAIInteropPolicyService>('aiInteropPolicyService');
export const IAIInteropAuditService = createDecorator<IAIInteropAuditService>('aiInteropAuditService');

// ========================================
// Error Definitions
// ========================================

export interface AiInteropError {
	code: AiInteropErrorCode;
	message: string;
	details?: Record<string, any>;
}

export const enum AiInteropErrorCode {
	// Endpoint related
	ENDPOINT_NOT_FOUND = 'ENDPOINT_NOT_FOUND',
	ENDPOINT_ALREADY_REGISTERED = 'ENDPOINT_ALREADY_REGISTERED',

	// Invocation related
	INVOCATION_NOT_FOUND = 'INVOCATION_NOT_FOUND',
	INVOCATION_TIMEOUT = 'INVOCATION_TIMEOUT',
	INVOCATION_CANCELED = 'INVOCATION_CANCELED',
	INVOCATION_FAILED = 'INVOCATION_FAILED',

	// Permission related
	PERMISSION_DENIED = 'PERMISSION_DENIED',
	PERMISSION_NOT_FOUND = 'PERMISSION_NOT_FOUND',

	// Routing related (reuse from PoC-0)
	REMOTE_AUTHORITY_MISMATCH = 'REMOTE_AUTHORITY_MISMATCH',
	HOST_KIND_UNSUPPORTED = 'HOST_KIND_UNSUPPORTED',

	// Session related
	SESSION_NOT_FOUND = 'SESSION_NOT_FOUND',
	SESSION_ALREADY_EXISTS = 'SESSION_ALREADY_EXISTS',
	PARTICIPANT_NOT_FOUND = 'PARTICIPANT_NOT_FOUND',

	// General errors
	INVALID_ARGUMENT = 'INVALID_ARGUMENT',
	INTERNAL_ERROR = 'INTERNAL_ERROR',
}

// ========================================
// Endpoint DTOs
// ========================================

export interface EndpointDescriptor {
	id: string;
	extensionId: string;
	displayName: string;
	description?: string;
	capabilities: EndpointCapability[];
	hostKind: 'local' | 'remote' | 'web';
	remoteAuthority?: string;
	metadata?: Record<string, any>;
}

export interface EndpointCapability {
	type: 'streaming' | 'tool' | 'mcp' | 'cli';
	config?: Record<string, any>;
}

// ========================================
// Invocation DTOs
// ========================================

export interface InvocationDescriptor {
	id: string;
	callerId: string;
	targetId: string;
	sessionId?: string;
	request: InvocationRequest;
	status: InvocationStatus;
	startTime: number;
	endTime?: number;
	error?: AiInteropError;
	metadata?: Record<string, any>;
}

export interface InvocationRequest {
	prompt?: string;
	context?: Record<string, any>;
	options?: InvocationOptions;
}

export interface InvocationOptions {
	streaming?: boolean;
	timeout?: number;
	maxTokens?: number;
	temperature?: number;
}

export type InvocationStatus = 'pending' | 'running' | 'completed' | 'failed' | 'canceled';

export interface InvocationHandle {
	invocationId: string;
	onChunk: Event<InvocationChunk>;
	onComplete: Event<any>;
	onError: Event<AiInteropError>;
	cancel(): void;
}

export interface InvocationChunk {
	seq: number;
	text: string;
	metadata?: Record<string, any>;
}

// ========================================
// Session DTOs
// ========================================

export interface SessionDescriptor {
	id: string;
	displayName: string;
	description?: string;
	status: SessionStatus;
	participants: ParticipantDescriptor[];
	invocations: string[];
	createdAt: number;
	lastActiveAt: number;
	metadata?: Record<string, any>;
}

export type SessionStatus = 'active' | 'idle' | 'archived';

export interface SessionConfig {
	displayName: string;
	description?: string;
	metadata?: Record<string, any>;
}

export interface ParticipantDescriptor {
	id: string;
	endpointId: string;
	role: 'controller' | 'worker' | 'observer';
	joinedAt: number;
}

// ========================================
// Permission & Policy DTOs
// ========================================

export interface PermissionDecision {
	allowed: boolean;
	reason?: string;
	scope?: PermissionScope;
}

export type PermissionScope = 'once' | 'session' | 'always';

export interface PermissionRecord {
	callerId: string;
	targetId: string;
	scope: PermissionScope;
	grantedAt: number;
	expiresAt?: number;
}

export interface RouteDecision {
	allowed: boolean;
	reason?: string;
}

// ========================================
// Audit DTOs
// ========================================

export interface AuditEvent {
	id: string;
	type: AuditEventType;
	timestamp: number;
	extensionId?: string;
	invocationId?: string;
	sessionId?: string;
	details: Record<string, any>;
}

export type AuditEventType =
	| 'endpoint_registered'
	| 'endpoint_unregistered'
	| 'invocation_started'
	| 'invocation_completed'
	| 'invocation_failed'
	| 'invocation_canceled'
	| 'permission_granted'
	| 'permission_denied'
	| 'permission_revoked'
	| 'session_created'
	| 'session_deleted'
	| 'participant_added'
	| 'participant_removed';

export interface AuditEventFilter {
	type?: AuditEventType;
	extensionId?: string;
	invocationId?: string;
	sessionId?: string;
	startTime?: number;
	endTime?: number;
}

// ========================================
// Service Interfaces
// ========================================

/**
 * AI Interop Bus Service
 * Manages endpoint registration, invocation routing, and streaming communication
 */
export interface IAIInteropBusService {
	readonly _serviceBrand: undefined;

	// Endpoint management
	registerEndpoint(descriptor: EndpointDescriptor): Promise<void>;
	unregisterEndpoint(endpointId: string): Promise<void>;
	getEndpoint(endpointId: string): EndpointDescriptor | undefined;
	getAllEndpoints(): EndpointDescriptor[];

	// Invocation management
	invoke(callerId: string, targetId: string, request: InvocationRequest, token: CancellationToken): Promise<InvocationHandle>;
	sendChunk(invocationId: string, chunk: InvocationChunk): Promise<void>;
	complete(invocationId: string, result?: any): Promise<void>;
	fail(invocationId: string, error: AiInteropError): Promise<void>;
	cancel(invocationId: string): Promise<void>;

	// Query
	getInvocation(invocationId: string): InvocationDescriptor | undefined;
	getAllInvocations(): InvocationDescriptor[];

	// Events
	readonly onDidRegisterEndpoint: Event<EndpointDescriptor>;
	readonly onDidUnregisterEndpoint: Event<string>;
	readonly onDidStartInvocation: Event<InvocationDescriptor>;
	readonly onDidReceiveChunk: Event<{ invocationId: string; chunk: InvocationChunk }>;
	readonly onDidCompleteInvocation: Event<{ invocationId: string; result?: any }>;
	readonly onDidFailInvocation: Event<{ invocationId: string; error: AiInteropError }>;
	readonly onDidCancelInvocation: Event<string>;
}

/**
 * AI Session Broker Service
 * Manages session lifecycle, participants, and invocation associations
 */
export interface IAISessionBrokerService {
	readonly _serviceBrand: undefined;

	// Session management
	createSession(config: SessionConfig): Promise<SessionDescriptor>;
	getSession(sessionId: string): SessionDescriptor | undefined;
	getAllSessions(): SessionDescriptor[];
	deleteSession(sessionId: string): Promise<void>;

	// Participant management
	addParticipant(sessionId: string, participant: ParticipantDescriptor): Promise<void>;
	removeParticipant(sessionId: string, participantId: string): Promise<void>;
	getParticipants(sessionId: string): ParticipantDescriptor[];

	// Invocation association
	associateInvocation(sessionId: string, invocationId: string): Promise<void>;
	getSessionInvocations(sessionId: string): string[];

	// Session state
	updateSessionStatus(sessionId: string, status: SessionStatus): Promise<void>;
	getActiveSession(): SessionDescriptor | undefined;
	setActiveSession(sessionId: string): Promise<void>;

	// Events
	readonly onDidCreateSession: Event<SessionDescriptor>;
	readonly onDidDeleteSession: Event<string>;
	readonly onDidAddParticipant: Event<{ sessionId: string; participant: ParticipantDescriptor }>;
	readonly onDidRemoveParticipant: Event<{ sessionId: string; participantId: string }>;
	readonly onDidUpdateSessionStatus: Event<{ sessionId: string; status: SessionStatus }>;
}

/**
 * AI Interop Policy Service
 * Manages authorization decisions, permission records, and routing policies
 */
export interface IAIInteropPolicyService {
	readonly _serviceBrand: undefined;

	// Authorization decisions
	checkPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision>;
	requestPermission(caller: EndpointDescriptor, target: EndpointDescriptor, request: InvocationRequest): Promise<PermissionDecision>;

	// Permission record management
	grantPermission(caller: string, target: string, scope: PermissionScope): Promise<void>;
	revokePermission(caller: string, target: string): Promise<void>;
	getPermissions(callerId?: string): PermissionRecord[];

	// Routing policy (reuse PoC-0 implementation)
	canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): RouteDecision;

	// Events
	readonly onDidGrantPermission: Event<PermissionRecord>;
	readonly onDidRevokePermission: Event<{ callerId: string; targetId: string }>;
}

/**
 * AI Interop Audit Service
 * Records and queries structured audit events for observability and compliance
 */
export interface IAIInteropAuditService {
	readonly _serviceBrand: undefined;

	// Event recording
	logEvent(event: AuditEvent): void;

	// Query
	getEvents(filter?: AuditEventFilter): AuditEvent[];
	getEventsByType(type: AuditEventType): AuditEvent[];
	getEventsByExtension(extensionId: string): AuditEvent[];
	getEventsByTimeRange(start: number, end: number): AuditEvent[];

	// Cleanup
	clearEvents(): void;

	// Events
	readonly onDidLogEvent: Event<AuditEvent>;
}
