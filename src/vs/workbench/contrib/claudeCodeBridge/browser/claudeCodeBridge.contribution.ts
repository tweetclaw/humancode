/*---------------------------------------------------------------------------------------------
 *  Copyright (c) Microsoft Corporation. All rights reserved.
 *  Licensed under the MIT License. See License.txt in the project root for license information.
 *--------------------------------------------------------------------------------------------*/

// Import the test commands
import './testClaudeCodeBridgeCommand.js';
import './testClaudeCodeDirectDOM.js';
import './testClaudeCodeWebviewAccess.js';
import './testClaudeCodeExecuteScript.js';

// Import the Main Thread service (it will be auto-registered via @extHostNamedCustomer)
import '../../../api/browser/mainThreadClaudeCodeBridge.js';
