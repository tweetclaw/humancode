/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/extensionMessages.css';
import * as dom from '../../../../base/browser/dom.js';
import { IListVirtualDelegate } from '../../../../base/browser/ui/list/list.js';
import { IListAccessibilityProvider } from '../../../../base/browser/ui/list/listWidget.js';
import { localize } from '../../../../nls.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IExtensionMessagesService } from '../../../services/extensionMessages/common/extensionMessages.js';
import { IRPCMessage } from '../../../services/extensions/common/extensionHostManager.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { WorkbenchList } from '../../../../platform/list/browser/listService.js';
import { IListRenderer } from '../../../../base/browser/ui/list/list.js';

interface IMessageTemplateData {
	container: HTMLElement;
	direction: HTMLElement;
	method: HTMLElement;
	timestamp: HTMLElement;
	data: HTMLElement;
}

class MessageDelegate implements IListVirtualDelegate<IRPCMessage> {
	getHeight(element: IRPCMessage): number {
		return 22;
	}

	getTemplateId(element: IRPCMessage): string {
		return 'message';
	}
}

class MessageRenderer implements IListRenderer<IRPCMessage, IMessageTemplateData> {

	templateId = 'message';

	renderTemplate(container: HTMLElement): IMessageTemplateData {
		const messageContainer = dom.append(container, dom.$('.extension-message'));
		const direction = dom.append(messageContainer, dom.$('.message-direction'));
		const method = dom.append(messageContainer, dom.$('.message-method'));
		const timestamp = dom.append(messageContainer, dom.$('.message-timestamp'));
		const data = dom.append(messageContainer, dom.$('.message-data'));

		return { container: messageContainer, direction, method, timestamp, data };
	}

	renderElement(element: IRPCMessage, index: number, templateData: IMessageTemplateData): void {
		// 显示方向
		templateData.direction.textContent = element.direction === 'incoming' ? '← Ext' : '→ Ext';
		templateData.direction.className = `message-direction ${element.direction}`;

		// 显示方法名
		templateData.method.textContent = element.method || element.type;

		// 显示时间戳
		const time = new Date(element.timestamp);
		templateData.timestamp.textContent = time.toLocaleTimeString();

		// 显示数据预览
		const dataStr = JSON.stringify(element.data);
		templateData.data.textContent = dataStr.length > 50 ? dataStr.substring(0, 50) + '...' : dataStr;
	}

	disposeTemplate(templateData: IMessageTemplateData): void {
		// No-op
	}
}

class MessageAccessibilityProvider implements IListAccessibilityProvider<IRPCMessage> {
	getWidgetAriaLabel(): string {
		return localize('extensionMessages', "Extension Messages");
	}

	getAriaLabel(element: IRPCMessage): string {
		return `${element.direction === 'incoming' ? 'Incoming' : 'Outgoing'} ${element.method || element.type}`;
	}
}

export class ExtensionMessagesViewPane extends ViewPane {

	private list: WorkbenchList<IRPCMessage> | undefined;
	private messages: IRPCMessage[] = [];
	private detailsContainer: HTMLElement | undefined;
	private splitContainer: HTMLElement | undefined;

	constructor(
		options: IViewPaneOptions,
		@IExtensionMessagesService private readonly extensionMessagesService: IExtensionMessagesService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IInstantiationService instantiationService: IInstantiationService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

		// 订阅消息事件
		this._register(this.extensionMessagesService.onDidLogMessage(msg => {
			this.messages.push(msg);
			if (this.list) {
				this.list.splice(this.messages.length - 1, 0, [msg]);
				this.list.reveal(this.messages.length - 1);
			}
		}));

		// 加载已有消息
		this.messages = this.extensionMessagesService.getMessages();
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.splitContainer = dom.append(container, dom.$('.extension-messages-split'));
		const listContainer = dom.append(this.splitContainer, dom.$('.extension-messages-list'));
		this.detailsContainer = dom.append(this.splitContainer, dom.$('.extension-messages-details'));

		this.list = this.instantiationService.createInstance(
			WorkbenchList,
			'ExtensionMessages',
			listContainer,
			new MessageDelegate(),
			[new MessageRenderer()],
			{
				identityProvider: {
					getId: (element: IRPCMessage) => `${element.requestId}-${element.timestamp}`
				},
				accessibilityProvider: new MessageAccessibilityProvider(),
				multipleSelectionSupport: false
			}
		) as WorkbenchList<IRPCMessage>;

		this._register(this.list);
		this._register(this.list.onDidChangeSelection(e => {
			if (e.elements.length > 0) {
				this.showDetails(e.elements[0]);
			}
		}));

		// 初始化列表数据
		this.list.splice(0, 0, this.messages);
	}

	private showDetails(message: IRPCMessage): void {
		if (!this.detailsContainer) {
			return;
		}

		dom.clearNode(this.detailsContainer);

		const header = dom.append(this.detailsContainer, dom.$('.details-header'));
		const direction = dom.append(header, dom.$('.details-direction'));
		direction.textContent = message.direction === 'incoming' ? '← Incoming from Extension' : '→ Outgoing to Extension';
		direction.className = `details-direction ${message.direction}`;

		const info = dom.append(this.detailsContainer, dom.$('.details-info'));

		const method = dom.append(info, dom.$('.details-row'));
		const methodLabel = dom.append(method, dom.$('strong'));
		methodLabel.textContent = 'Method: ';
		const methodValue = dom.append(method, dom.$('span'));
		methodValue.textContent = message.method || message.type;

		const time = dom.append(info, dom.$('.details-row'));
		const timeLabel = dom.append(time, dom.$('strong'));
		timeLabel.textContent = 'Time: ';
		const timeValue = dom.append(time, dom.$('span'));
		const timestamp = new Date(message.timestamp);
		timeValue.textContent = timestamp.toLocaleString();

		if (message.requestId) {
			const reqId = dom.append(info, dom.$('.details-row'));
			const reqIdLabel = dom.append(reqId, dom.$('strong'));
			reqIdLabel.textContent = 'Request ID: ';
			const reqIdValue = dom.append(reqId, dom.$('span'));
			reqIdValue.textContent = String(message.requestId);
		}

		const dataSection = dom.append(this.detailsContainer, dom.$('.details-data-section'));
		const dataHeader = dom.append(dataSection, dom.$('.details-data-header'));
		const dataHeaderLabel = dom.append(dataHeader, dom.$('strong'));
		dataHeaderLabel.textContent = 'Data:';

		const dataContent = dom.append(dataSection, dom.$('.details-data-content'));
		const dataStr = JSON.stringify(message.data, null, 2);
		dataContent.textContent = dataStr;

		const copyButton = dom.append(dataSection, dom.$('button.details-copy-button'));
		copyButton.textContent = 'Copy JSON';
		copyButton.onclick = () => {
			navigator.clipboard.writeText(dataStr);
			copyButton.textContent = 'Copied!';
			setTimeout(() => {
				copyButton.textContent = 'Copy JSON';
			}, 2000);
		};
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
		if (this.splitContainer) {
			this.splitContainer.style.height = `${height}px`;
		}
		this.list?.layout(height, width / 2);
	}
}
