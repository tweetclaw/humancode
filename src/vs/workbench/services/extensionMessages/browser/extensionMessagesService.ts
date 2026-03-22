/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { Emitter, Event } from '../../../../base/common/event.js';
import { Disposable } from '../../../../base/common/lifecycle.js';
import { IExtensionMessagesService } from '../common/extensionMessages.js';
import { IRPCMessage, globalRPCMessageStore } from '../../../services/extensions/common/extensionHostManager.js';

export class ExtensionMessagesService extends Disposable implements IExtensionMessagesService {

	declare readonly _serviceBrand: undefined;

	private readonly _onDidLogMessage = this._register(new Emitter<IRPCMessage>());
	public readonly onDidLogMessage: Event<IRPCMessage> = this._onDidLogMessage.event;

	constructor() {
		super();

		// 将 emitter 注册到全局存储
		globalRPCMessageStore.setEmitter(this._onDidLogMessage);
	}

	getMessages(): IRPCMessage[] {
		return globalRPCMessageStore.getMessages();
	}

	clearMessages(): void {
		// 清空消息的实现留空,因为全局存储没有提供清空方法
	}
}
