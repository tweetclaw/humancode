/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { InstantiationType, registerSingleton } from '../../../../platform/instantiation/common/extensions.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { IViewContainersRegistry, IViewsRegistry, Extensions as ViewContainerExtensions, ViewContainerLocation } from '../../../common/views.js';
import { ExtensionMessagesViewPane } from './extensionMessagesView.js';
import { IExtensionMessagesService } from '../../../services/extensionMessages/common/extensionMessages.js';
import { ExtensionMessagesService } from '../../../services/extensionMessages/browser/extensionMessagesService.js';
import { Codicon } from '../../../../base/common/codicons.js';

// 注册服务
registerSingleton(IExtensionMessagesService, ExtensionMessagesService, InstantiationType.Delayed);

// 注册视图容器
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry)
	.registerViewContainer({
		id: 'extensionMessages',
		title: { value: localize('extensionMessages', "Extension Messages"), original: 'Extension Messages' },
		icon: Codicon.commentDiscussion,
		order: 5,
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['extensionMessages', { mergeViewWithContainerWhenSingleView: true }]),
		storageId: 'extensionMessagesViewContainer',
		hideIfEmpty: false
	}, ViewContainerLocation.Panel);

// 注册视图
Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry).registerViews([{
	id: 'extensionMessages.view',
	name: { value: localize('extensionMessagesView', "Extension Messages"), original: 'Extension Messages' },
	containerIcon: Codicon.commentDiscussion,
	canToggleVisibility: true,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(ExtensionMessagesViewPane),
}], VIEW_CONTAINER);
