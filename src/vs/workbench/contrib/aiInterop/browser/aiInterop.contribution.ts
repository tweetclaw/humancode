/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize2 } from '../../../../nls.js';
import { SyncDescriptor } from '../../../../platform/instantiation/common/descriptors.js';
import { Registry } from '../../../../platform/registry/common/platform.js';
import { Extensions as ViewExtensions, IViewsRegistry, IViewDescriptor } from '../../../common/views.js';
import { AIInteropPermissionsView } from './aiInteropPermissionsView.js';
import { AIInteropAuditView } from './aiInteropAuditView.js';
import { ViewPaneContainer } from '../../../browser/parts/views/viewPaneContainer.js';
import { ViewContainerLocation, IViewContainersRegistry, Extensions as ViewContainerExtensions } from '../../../common/views.js';
import { Codicon } from '../../../../base/common/codicons.js';

// View IDs
const AI_INTEROP_PERMISSIONS_VIEW_ID = 'aiInterop.permissionsView';
const AI_INTEROP_AUDIT_VIEW_ID = 'aiInterop.auditView';
const AI_INTEROP_VIEW_CONTAINER_ID = 'workbench.view.aiInterop';

// Register view container
const viewContainerRegistry = Registry.as<IViewContainersRegistry>(ViewContainerExtensions.ViewContainersRegistry);
const aiInteropViewContainer = viewContainerRegistry.registerViewContainer({
	id: AI_INTEROP_VIEW_CONTAINER_ID,
	title: localize2('aiInterop.viewContainer', 'AI Interop'),
	icon: Codicon.extensions,
	order: 10,
	ctorDescriptor: new SyncDescriptor(ViewPaneContainer, [AI_INTEROP_VIEW_CONTAINER_ID, { mergeViewWithContainerWhenSingleView: true }]),
	storageId: AI_INTEROP_VIEW_CONTAINER_ID,
	hideIfEmpty: false
}, ViewContainerLocation.Panel);

// Register permissions view
const viewsRegistry = Registry.as<IViewsRegistry>(ViewExtensions.ViewsRegistry);
const permissionsViewDescriptor: IViewDescriptor = {
	id: AI_INTEROP_PERMISSIONS_VIEW_ID,
	name: localize2('aiInterop.permissionsView', 'Permissions'),
	containerIcon: Codicon.shield,
	ctorDescriptor: new SyncDescriptor(AIInteropPermissionsView),
	canToggleVisibility: true,
	canMoveView: true,
	order: 1
};

// Register audit view
const auditViewDescriptor: IViewDescriptor = {
	id: AI_INTEROP_AUDIT_VIEW_ID,
	name: localize2('aiInterop.auditView', 'Audit'),
	containerIcon: Codicon.history,
	ctorDescriptor: new SyncDescriptor(AIInteropAuditView),
	canToggleVisibility: true,
	canMoveView: true,
	order: 2
};

viewsRegistry.registerViews([permissionsViewDescriptor, auditViewDescriptor], aiInteropViewContainer);

// Import adapters contribution to initialize zero-intrusion adapters
import './aiInteropAdapters.contribution.js';

// Import test commands for Claude Code integration
import './testClaudeCodeCommand.js';
import './testClaudeCodeWebviewCommand.js';
import './testClaudeCodeSimpleCommand.js';
import './testClaudeCodeKeySequenceCommand.js';
import './testClaudeCodeDirectMessageCommand.js';
