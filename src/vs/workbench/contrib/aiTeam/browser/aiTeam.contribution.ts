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
import { AITeamPanel } from './aiTeamPanel.js';
import { IAISessionManagerService } from '../../../services/aiSessionManager/common/aiSessionManager.js';
import { AISessionManagerService } from '../../../services/aiSessionManager/browser/aiSessionManagerService.js';
import { Codicon } from '../../../../base/common/codicons.js';

// Register Real Service (Mock service available in mockAISessionManagerService.ts for testing)
registerSingleton(IAISessionManagerService, AISessionManagerService, InstantiationType.Delayed);

// Register view container in Sidebar
const VIEW_CONTAINER = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry)
	.registerViewContainer({
		id: 'aiTeam',
		title: { value: localize('aiTeam', "AI Team"), original: 'AI Team' },
		icon: Codicon.organization,
		order: 4,
		ctorDescriptor: new SyncDescriptor(ViewPaneContainer, ['aiTeam', { mergeViewWithContainerWhenSingleView: true }]),
		storageId: 'aiTeamViewContainer',
		hideIfEmpty: false
	}, ViewContainerLocation.Sidebar);

// Register view
Registry.as<IViewsRegistry>(ViewContainerExtensions.ViewsRegistry).registerViews([{
	id: 'aiTeam.panel',
	name: { value: localize('aiTeamPanel', "AI Team Commander"), original: 'AI Team Commander' },
	containerIcon: Codicon.organization,
	canToggleVisibility: true,
	canMoveView: true,
	ctorDescriptor: new SyncDescriptor(AITeamPanel),
}], VIEW_CONTAINER);
