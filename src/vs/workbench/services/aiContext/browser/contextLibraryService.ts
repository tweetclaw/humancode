/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Disposable } from '../../../../base/common/lifecycle.js';
import { IStorageService, StorageScope, StorageTarget } from '../../../../platform/storage/common/storage.js';
import {
	IContextLibraryService,
	IContextEntry,
	ITokenBudget
} from '../common/contextLibrary.js';

export class ContextLibraryService extends Disposable implements IContextLibraryService {

	declare readonly _serviceBrand: undefined;

	private readonly _contexts: IContextEntry[] = [];
	private _tokenBudget: ITokenBudget = {
		systemPrompt: 2000,
		conversationHistory: 4000,
		globalContext: 2000,
		total: 8000
	};

	private static readonly STORAGE_KEY_CONTEXT = 'humancode.context';
	private static readonly STORAGE_KEY_TOKEN_BUDGET = 'humancode.tokenBudget';

	constructor(
		@IStorageService private readonly storageService: IStorageService
	) {
		super();
		this._loadContext();
		this._loadTokenBudget();
	}

	addContext(entry: Omit<IContextEntry, 'id' | 'timestamp'>): string {
		const id = this.generateContextId();
		const fullEntry: IContextEntry = {
			id,
			timestamp: Date.now(),
			...entry
		};

		this._contexts.push(fullEntry);
		this._saveContext();

		return id;
	}

	getAllContext(): IContextEntry[] {
		return [...this._contexts];
	}

	retrieveContext(tags: string[]): IContextEntry[] {
		if (tags.length === 0) {
			return this.getAllContext();
		}

		return this._contexts.filter(entry =>
			tags.some(tag => entry.tags.includes(tag))
		);
	}

	removeContext(id: string): void {
		const index = this._contexts.findIndex(c => c.id === id);
		if (index !== -1) {
			this._contexts.splice(index, 1);
			this._saveContext();
		}
	}

	clearAll(): void {
		this._contexts.length = 0;
		this._saveContext();
	}

	getTokenBudget(): ITokenBudget {
		return { ...this._tokenBudget };
	}

	setTokenBudget(budget: ITokenBudget): void {
		this._tokenBudget = { ...budget };
		this._saveTokenBudget();
	}

	private generateContextId(): string {
		return `ctx_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
	}

	private _loadContext(): void {
		try {
			const stored = this.storageService.get(
				ContextLibraryService.STORAGE_KEY_CONTEXT,
				StorageScope.WORKSPACE
			);

			if (stored) {
				const contexts: IContextEntry[] = JSON.parse(stored);
				this._contexts.push(...contexts);
			}
		} catch (error) {
			console.error('[ContextLibraryService] Failed to load context:', error);
		}
	}

	private _saveContext(): void {
		try {
			this.storageService.store(
				ContextLibraryService.STORAGE_KEY_CONTEXT,
				JSON.stringify(this._contexts),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);
		} catch (error) {
			console.error('[ContextLibraryService] Failed to save context:', error);
		}
	}

	private _loadTokenBudget(): void {
		try {
			const stored = this.storageService.get(
				ContextLibraryService.STORAGE_KEY_TOKEN_BUDGET,
				StorageScope.WORKSPACE
			);

			if (stored) {
				this._tokenBudget = JSON.parse(stored);
			}
		} catch (error) {
			console.error('[ContextLibraryService] Failed to load token budget:', error);
		}
	}

	private _saveTokenBudget(): void {
		try {
			this.storageService.store(
				ContextLibraryService.STORAGE_KEY_TOKEN_BUDGET,
				JSON.stringify(this._tokenBudget),
				StorageScope.WORKSPACE,
				StorageTarget.USER
			);
		} catch (error) {
			console.error('[ContextLibraryService] Failed to save token budget:', error);
		}
	}
}
