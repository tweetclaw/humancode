/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

import { localize } from '../../../../nls.js';
import { IDialogService } from '../../../../platform/dialogs/common/dialogs.js';
import Severity from '../../../../base/common/severity.js';
import { EndpointDescriptor, PermissionScope } from '../../../services/aiInterop/common/aiInterop.js';

/**
 * Shows a permission authorization dialog for cross-extension AI Interop calls.
 *
 * @param dialogService The dialog service to use for showing the dialog
 * @param caller The endpoint descriptor of the calling extension
 * @param target The endpoint descriptor of the target extension
 * @returns The permission scope chosen by the user ('once', 'session') or 'deny' if denied
 */
export async function showPermissionDialog(
	dialogService: IDialogService,
	caller: EndpointDescriptor,
	target: EndpointDescriptor
): Promise<PermissionScope | 'deny'> {
	const { result } = await dialogService.prompt<PermissionScope | 'deny'>({
		type: Severity.Info,
		message: localize(
			'aiInterop.permissionRequest',
			"Extension '{0}' wants to call '{1}'",
			caller.displayName || caller.extensionId,
			target.displayName || target.extensionId
		),
		detail: localize(
			'aiInterop.permissionDetail',
			"Caller: {0}\nTarget: {1}\n\nThis will allow the caller extension to invoke AI capabilities provided by the target extension.",
			caller.extensionId,
			target.extensionId
		),
		buttons: [
			{
				label: localize({ key: 'aiInterop.allowSession', comment: ['&& denotes a mnemonic'] }, '&&Allow for Session'),
				run: () => 'session' as PermissionScope
			},
			{
				label: localize({ key: 'aiInterop.allowOnce', comment: ['&& denotes a mnemonic'] }, 'Allow &&Once'),
				run: () => 'once' as PermissionScope
			}
		],
		cancelButton: {
			label: localize('aiInterop.deny', "Deny"),
			run: () => 'deny' as const
		}
	});

	return result ?? 'deny';
}
