import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
	console.log('[ClaudeBridgeTest] Extension activated');

	const disposable = vscode.commands.registerCommand('claude-bridge-test.openDialog', () => {
		ClaudeBridgePanel.createOrShow(context.extensionUri);
	});

	context.subscriptions.push(disposable);
}

export function deactivate() {}

class ClaudeBridgePanel {
	public static currentPanel: ClaudeBridgePanel | undefined;
	private readonly _panel: vscode.WebviewPanel;
	private _disposables: vscode.Disposable[] = [];

	public static createOrShow(extensionUri: vscode.Uri) {
		// 如果已存在，则显示
		if (ClaudeBridgePanel.currentPanel) {
			ClaudeBridgePanel.currentPanel._panel.reveal();
			return;
		}

		// 创建新的 Webview Panel
		const panel = vscode.window.createWebviewPanel(
			'claudeBridge',
			'Claude Bridge Dialog',
			vscode.ViewColumn.One,
			{
				enableScripts: true,
				retainContextWhenHidden: true
			}
		);

		ClaudeBridgePanel.currentPanel = new ClaudeBridgePanel(panel, extensionUri);
	}

	private constructor(panel: vscode.WebviewPanel, extensionUri: vscode.Uri) {
		this._panel = panel;

		// 设置 HTML 内容
		this._panel.webview.html = this._getHtmlContent();

		// 监听 Webview 消息
		this._panel.webview.onDidReceiveMessage(
			async message => {
				switch (message.type) {
					case 'sendToClaudeCode':
						await this._sendToClaudeCode(message.text);
						break;
				}
			},
			null,
			this._disposables
		);

		// 监听 Panel 关闭
		this._panel.onDidDispose(() => this.dispose(), null, this._disposables);
	}

	private async _sendToClaudeCode(text: string) {
		try {
			console.log('[ClaudeBridgeTest] Sending to Claude Code:', text);

			// 方案 1: 尝试通过命令打开 Claude Code
			// 这会打开 Claude Code 的界面
			await vscode.commands.executeCommand('claude-vscode.editor.open');

			// 等待一下让 Claude Code 初始化
			await new Promise(resolve => setTimeout(resolve, 500));

			// 方案 2: 尝试获取 Claude Code 扩展的 API
			const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');

			if (claudeExtension) {
				console.log('[ClaudeBridgeTest] Claude Code extension found');

				if (!claudeExtension.isActive) {
					console.log('[ClaudeBridgeTest] Activating Claude Code extension...');
					await claudeExtension.activate();
				}

				// 获取扩展导出的 API（如果有）
				const api = claudeExtension.exports;
				console.log('[ClaudeBridgeTest] Claude Code API:', api);

				// 发送消息到 Webview
				this._panel.webview.postMessage({
					type: 'claudeCodeResponse',
					text: `✅ Claude Code 扩展已找到并激活\n\n扩展信息:\n- ID: ${claudeExtension.id}\n- 版本: ${claudeExtension.packageJSON.version}\n- 已激活: ${claudeExtension.isActive}\n\n导出的 API: ${JSON.stringify(api, null, 2)}\n\n注意: Claude Code 主要通过 Webview 工作，需要进一步研究其内部通信机制。`
				});
			} else {
				console.log('[ClaudeBridgeTest] Claude Code extension not found');
				this._panel.webview.postMessage({
					type: 'claudeCodeResponse',
					text: '❌ 未找到 Claude Code 扩展，请确保已安装 anthropic.claude-code'
				});
			}

			// 方案 3: 尝试通过 focus 命令聚焦到 Claude Code 输入框
			try {
				await vscode.commands.executeCommand('claude-vscode.focus');
				console.log('[ClaudeBridgeTest] Focused Claude Code input');
			} catch (error) {
				console.log('[ClaudeBridgeTest] Failed to focus:', error);
			}

		} catch (error) {
			console.error('[ClaudeBridgeTest] Error:', error);
			this._panel.webview.postMessage({
				type: 'claudeCodeResponse',
				text: `❌ 错误: ${error}`
			});
		}
	}

	private _getHtmlContent(): string {
		return `<!DOCTYPE html>
<html lang="en">
<head>
	<meta charset="UTF-8">
	<meta name="viewport" content="width=device-width, initial-scale=1.0">
	<title>Claude Bridge Dialog</title>
	<style>
		body {
			padding: 20px;
			font-family: var(--vscode-font-family);
			color: var(--vscode-foreground);
			background-color: var(--vscode-editor-background);
		}
		.container {
			max-width: 800px;
			margin: 0 auto;
		}
		h1 {
			color: var(--vscode-foreground);
			margin-bottom: 20px;
		}
		.input-area {
			margin-bottom: 20px;
		}
		textarea {
			width: 100%;
			min-height: 100px;
			padding: 10px;
			font-family: var(--vscode-editor-font-family);
			font-size: var(--vscode-editor-font-size);
			background-color: var(--vscode-input-background);
			color: var(--vscode-input-foreground);
			border: 1px solid var(--vscode-input-border);
			border-radius: 4px;
			resize: vertical;
		}
		button {
			padding: 8px 16px;
			background-color: var(--vscode-button-background);
			color: var(--vscode-button-foreground);
			border: none;
			border-radius: 4px;
			cursor: pointer;
			font-size: 14px;
		}
		button:hover {
			background-color: var(--vscode-button-hoverBackground);
		}
		.output-area {
			margin-top: 20px;
			padding: 15px;
			background-color: var(--vscode-editor-background);
			border: 1px solid var(--vscode-panel-border);
			border-radius: 4px;
			min-height: 200px;
			white-space: pre-wrap;
			font-family: var(--vscode-editor-font-family);
		}
		.status {
			margin-top: 10px;
			padding: 10px;
			background-color: var(--vscode-inputValidation-infoBackground);
			border-left: 3px solid var(--vscode-inputValidation-infoBorder);
			border-radius: 4px;
		}
	</style>
</head>
<body>
	<div class="container">
		<h1>🔗 Claude Bridge Test Dialog</h1>

		<div class="status">
			<strong>目标:</strong> 测试与 Claude Code 扩展的交互<br>
			<strong>方法:</strong> 通过 VS Code Extension API 调用 Claude Code 命令
		</div>

		<div class="input-area">
			<h3>输入消息</h3>
			<textarea id="inputText" placeholder="输入要发送给 Claude Code 的消息...">Hello Claude Code! 这是一个测试消息。</textarea>
			<br><br>
			<button onclick="sendMessage()">📤 发送到 Claude Code</button>
		</div>

		<div class="output-area" id="output">
			<em>等待响应...</em>
		</div>
	</div>

	<script>
		const vscode = acquireVsCodeApi();

		function sendMessage() {
			const text = document.getElementById('inputText').value;
			document.getElementById('output').textContent = '⏳ 正在发送到 Claude Code...';

			vscode.postMessage({
				type: 'sendToClaudeCode',
				text: text
			});
		}

		// 监听来自扩展的消息
		window.addEventListener('message', event => {
			const message = event.data;

			switch (message.type) {
				case 'claudeCodeResponse':
					document.getElementById('output').textContent = message.text;
					break;
			}
		});
	</script>
</body>
</html>`;
	}

	public dispose() {
		ClaudeBridgePanel.currentPanel = undefined;

		this._panel.dispose();

		while (this._disposables.length) {
			const disposable = this._disposables.pop();
			if (disposable) {
				disposable.dispose();
			}
		}
	}
}
