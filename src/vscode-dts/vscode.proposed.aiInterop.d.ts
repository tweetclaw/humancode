/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

declare module 'vscode' {

	/**
	 * Namespace for AI Interop platform capabilities
	 */
	export namespace aiInterop {

		/**
		 * Register an AI endpoint that can be invoked by other extensions
		 * @param descriptor The endpoint descriptor
		 * @param handler The handler function to process invocations
		 * @returns A disposable that unregisters the endpoint
		 */
		export function registerEndpoint(
			descriptor: AiInteropEndpointDescriptor,
			handler: (request: AiInteropInvocationRequest, token: CancellationToken) => Promise<void>
		): Disposable;

		/**
		 * Invoke another AI endpoint
		 * @param callerId The caller endpoint ID
		 * @param targetId The target endpoint ID
		 * @param request The invocation request
		 * @param token Cancellation token
		 * @returns An invocation handle for receiving responses
		 */
		export function invoke(
			callerId: string,
			targetId: string,
			request: AiInteropInvocationRequest,
			token: CancellationToken
		): Promise<AiInteropInvocationHandle>;

		/**
		 * Send a chunk of streaming output
		 * @param invocationId The invocation ID
		 * @param chunk The chunk to send
		 */
		export function sendChunk(invocationId: string, chunk: AiInteropChunk): Promise<void>;

		/**
		 * Complete an invocation
		 * @param invocationId The invocation ID
		 * @param result Optional result data
		 */
		export function complete(invocationId: string, result?: any): Promise<void>;

		/**
		 * Fail an invocation with an error
		 * @param invocationId The invocation ID
		 * @param error The error
		 */
		export function fail(invocationId: string, error: AiInteropError): Promise<void>;

		/**
		 * Get an endpoint descriptor by ID
		 * @param endpointId The endpoint ID
		 * @returns The endpoint descriptor or undefined
		 */
		export function getEndpoint(endpointId: string): Promise<AiInteropEndpointDescriptor | undefined>;

		/**
		 * Get all registered endpoints
		 * @returns Array of endpoint descriptors
		 */
		export function getAllEndpoints(): Promise<AiInteropEndpointDescriptor[]>;

		/**
		 * Endpoint descriptor
		 */
		export interface AiInteropEndpointDescriptor {
			id: string;
			extensionId: string;
			displayName: string;
			description?: string;
			capabilities: AiInteropEndpointCapability[];
			hostKind: 'local' | 'remote' | 'web';
			remoteAuthority?: string;
			metadata?: { [key: string]: any };
		}

		/**
		 * Endpoint capability
		 */
		export interface AiInteropEndpointCapability {
			type: 'streaming' | 'tool' | 'mcp' | 'cli';
			config?: { [key: string]: any };
		}

		/**
		 * Invocation request
		 */
		export interface AiInteropInvocationRequest {
			prompt?: string;
			context?: { [key: string]: any };
			options?: AiInteropInvocationOptions;
		}

		/**
		 * Invocation options
		 */
		export interface AiInteropInvocationOptions {
			streaming?: boolean;
			timeout?: number;
			maxTokens?: number;
			temperature?: number;
		}

		/**
		 * Invocation handle for receiving responses
		 */
		export interface AiInteropInvocationHandle {
			invocationId: string;
			onChunk: Event<AiInteropChunk>;
			onComplete: Event<any>;
			onError: Event<AiInteropError>;
			cancel(): void;
		}

		/**
		 * Streaming chunk
		 */
		export interface AiInteropChunk {
			seq: number;
			text: string;
			metadata?: { [key: string]: any };
		}

		/**
		 * Error
		 */
		export interface AiInteropError {
			code: string;
			message: string;
			details?: { [key: string]: any };
		}
	}
}
