/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import './media/aiInteropPermissionsView.css';
import { localize } from '../../../../nls.js';
import { append, $, clearNode } from '../../../../base/browser/dom.js';
import { IViewPaneOptions, ViewPane } from '../../../browser/parts/views/viewPane.js';
import { IInstantiationService } from '../../../../platform/instantiation/common/instantiation.js';
import { IViewDescriptorService } from '../../../common/views.js';
import { IKeybindingService } from '../../../../platform/keybinding/common/keybinding.js';
import { IContextMenuService } from '../../../../platform/contextview/browser/contextView.js';
import { IConfigurationService } from '../../../../platform/configuration/common/configuration.js';
import { IContextKeyService } from '../../../../platform/contextkey/common/contextkey.js';
import { IOpenerService } from '../../../../platform/opener/common/opener.js';
import { IThemeService } from '../../../../platform/theme/common/themeService.js';
import { IHoverService } from '../../../../platform/hover/browser/hover.js';
import { IAIInteropPolicyService, PermissionRecord } from '../../../services/aiInterop/common/aiInterop.js';
import { Button } from '../../../../base/browser/ui/button/button.js';
import { defaultButtonStyles } from '../../../../platform/theme/browser/defaultStyles.js';

export class AIInteropPermissionsView extends ViewPane {
	private contentContainer: HTMLElement | undefined;
	private permissionsListContainer: HTMLElement | undefined;

	constructor(
		options: IViewPaneOptions,
		@IInstantiationService instantiationService: IInstantiationService,
		@IViewDescriptorService viewDescriptorService: IViewDescriptorService,
		@IKeybindingService keybindingService: IKeybindingService,
		@IContextMenuService contextMenuService: IContextMenuService,
		@IConfigurationService configurationService: IConfigurationService,
		@IContextKeyService contextKeyService: IContextKeyService,
		@IOpenerService openerService: IOpenerService,
		@IThemeService themeService: IThemeService,
		@IHoverService hoverService: IHoverService,
		@IAIInteropPolicyService private readonly policyService: IAIInteropPolicyService
	) {
		super(options, keybindingService, contextMenuService, configurationService, contextKeyService, viewDescriptorService, instantiationService, openerService, themeService, hoverService);

		this._register(this.policyService.onDidGrantPermission(() => this.refresh()));
		this._register(this.policyService.onDidRevokePermission(() => this.refresh()));
	}

	protected override renderBody(container: HTMLElement): void {
		super.renderBody(container);

		this.contentContainer = append(container, $('.ai-interop-permissions-view'));
		this.permissionsListContainer = append(this.contentContainer, $('.permissions-list'));

		this.refresh();
	}

	private async refresh(): Promise<void> {
		if (!this.permissionsListContainer) {
			return;
		}

		// Clear existing content
		clearNode(this.permissionsListContainer);

		// Get all permissions
		const permissions = await this.policyService.getPermissions();

		if (permissions.length === 0) {
			const emptyMessage = append(this.permissionsListContainer, $('.empty-message'));
			emptyMessage.textContent = localize('aiInterop.noPermissions', 'No permissions granted');
			return;
		}

		// Render each permission
		for (const permission of permissions) {
			this.renderPermission(permission);
		}
	}

	private renderPermission(permission: PermissionRecord): void {
		if (!this.permissionsListContainer) {
			return;
		}

		const permissionItem = append(this.permissionsListContainer, $('.permission-item'));

		// Permission info
		const infoContainer = append(permissionItem, $('.permission-info'));
		const callerTarget = append(infoContainer, $('.caller-target'));
		callerTarget.textContent = `${permission.callerId} → ${permission.targetId}`;

		const details = append(infoContainer, $('.permission-details'));
		const scopeText = localize('aiInterop.scope', 'Scope: {0}', permission.scope);
		const dateText = new Date(permission.grantedAt).toLocaleString();
		details.textContent = `${scopeText} | ${localize('aiInterop.grantedAt', 'Granted: {0}', dateText)}`;

		// Revoke button
		const buttonContainer = append(permissionItem, $('.permission-actions'));
		const revokeButton = this._register(new Button(buttonContainer, defaultButtonStyles));
		revokeButton.label = localize('aiInterop.revoke', 'Revoke');
		this._register(revokeButton.onDidClick(async () => {
			await this.policyService.revokePermission(permission.callerId, permission.targetId);
		}));
	}

	protected override layoutBody(height: number, width: number): void {
		super.layoutBody(height, width);
	}
}
