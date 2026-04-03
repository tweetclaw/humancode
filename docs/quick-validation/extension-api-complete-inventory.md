# VS Code 扩展与 IDE 交互 API 完整清单

**文档版本**: v1.0  
**创建时间**: 2026-04-02  
**目标**: 系统性整理 VS Code IDE 中所有与扩展交互相关的 API、函数、服务和机制

---

## 一、扩展生命周期管理

### 1.1 Extension 类（扩展实例）

**位置**: [src/vs/workbench/api/common/extHostExtensionService.ts:1167](src/vs/workbench/api/common/extHostExtensionService.ts#L1167)

```typescript
export class Extension<T> implements vscode.Extension<T> {
    readonly id: string;
    readonly extensionUri: URI;
    readonly extensionPath: string;
    readonly packageJSON: IExtensionDescription;
    readonly extensionKind: vscode.ExtensionKind;
    readonly isActive: boolean;
    readonly exports: T;
    
    activate(): Promise<T>;
}
```

**关键方法**:
- `activate()`: 激活扩展，返回扩展导出的 API
- `isActive`: 检查扩展是否已激活
- `exports`: 获取扩展导出的公共 API

### 1.2 获取扩展实例

**API**: `vscode.extensions.getExtension(extensionId: string)`

**实现位置**: [src/vs/workbench/api/common/extHost.api.impl.ts](src/vs/workbench/api/common/extHost.api.impl.ts)

```typescript
// 用法示例
const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');
if (claudeExtension) {
    if (!claudeExtension.isActive) {
        await claudeExtension.activate();
    }
    const api = claudeExtension.exports;
    // 使用 api...
}
```

### 1.3 扩展激活事件

**配置位置**: `package.json` 的 `activationEvents` 字段

```json
"activationEvents": [
    "onStartupFinished",           // IDE 启动完成后
    "onCommand:extension.command", // 命令执行时
    "onLanguage:javascript",       // 打开特定语言文件时
    "onView:myView",               // 打开特定视图时
    "onUri",                       // 通过 URI 激活
    "onWebviewPanel:myWebview",    // 打开特定 Webview 时
    "*"                            // 立即激活（不推荐）
]
```

### 1.4 扩展上下文 (ExtensionContext)

```typescript
interface ExtensionContext {
    // 扩展路径
    extensionPath: string;
    extensionUri: Uri;
    
    // 存储
    globalState: Memento;
    workspaceState: Memento;
    secrets: SecretStorage;
    
    // 订阅管理
    subscriptions: { dispose(): any }[];
    
    // 扩展模式
    extensionMode: ExtensionMode;
    
    // 日志
    logUri: Uri;
    logPath: string;
    
    // 存储路径
    storageUri: Uri | undefined;
    storagePath: string | undefined;
    globalStorageUri: Uri;
    globalStoragePath: string;
}
```

---

## 二、命令系统 API

### 2.1 命令注册

**API**: `vscode.commands.registerCommand(command: string, callback: Function)`

**实现位置**: [src/vs/workbench/api/common/extHostCommands.ts:147](src/vs/workbench/api/common/extHostCommands.ts#L147)

```typescript
// 注册命令
const disposable = vscode.commands.registerCommand('myExtension.myCommand', (arg1, arg2) => {
    console.log('Command executed with args:', arg1, arg2);
    return 'result';
});

// 记得在 deactivate 时清理
context.subscriptions.push(disposable);
```

### 2.2 命令执行

**API**: `vscode.commands.executeCommand<T>(command: string, ...args: any[]): Promise<T>`

**实现位置**: [src/vs/workbench/api/common/extHostCommands.ts:172](src/vs/workbench/api/common/extHostCommands.ts#L172)

```typescript
// 执行命令
const result = await vscode.commands.executeCommand('workbench.action.files.save');

// 执行其他扩展的命令
await vscode.commands.executeCommand('claude-vscode.editor.open');
await vscode.commands.executeCommand('claude-vscode.focus');
```

### 2.3 获取所有命令

**API**: `vscode.commands.getCommands(filterInternal?: boolean): Promise<string[]>`

```typescript
// 获取所有命令
const allCommands = await vscode.commands.getCommands(true);
console.log('Available commands:', allCommands);
```

### 2.4 命令贡献点 (package.json)

```json
"contributes": {
    "commands": [
        {
            "command": "myExtension.myCommand",
            "title": "My Command",
            "category": "My Extension",
            "icon": {
                "light": "resources/icon-light.svg",
                "dark": "resources/icon-dark.svg"
            }
        }
    ]
}
```

---

## 三、Webview API

### 3.1 创建 Webview Panel

**API**: `vscode.window.createWebviewPanel()`

**实现位置**: [src/vs/workbench/api/common/extHostWebviewPanels.ts](src/vs/workbench/api/common/extHostWebviewPanels.ts)

```typescript
const panel = vscode.window.createWebviewPanel(
    'myWebview',                    // viewType
    'My Webview',                   // title
    vscode.ViewColumn.One,          // showOptions
    {
        enableScripts: true,        // 启用 JavaScript
        retainContextWhenHidden: true, // 隐藏时保留上下文
        localResourceRoots: [       // 允许访问的本地资源
            vscode.Uri.file(extensionPath)
        ]
    }
);
```

### 3.2 Webview 消息传递

**从扩展发送消息到 Webview**:
```typescript
panel.webview.postMessage({ type: 'update', data: 'Hello from extension' });
```

**从 Webview 接收消息**:
```typescript
panel.webview.onDidReceiveMessage(
    message => {
        switch (message.type) {
            case 'action':
                console.log('Received action:', message.data);
                break;
        }
    },
    undefined,
    context.subscriptions
);
```

**Webview 中的代码**:
```html
<script>
    const vscode = acquireVsCodeApi();
    
    // 发送消息到扩展
    vscode.postMessage({ type: 'action', data: 'Hello from webview' });
    
    // 接收来自扩展的消息
    window.addEventListener('message', event => {
        const message = event.data;
        console.log('Received from extension:', message);
    });
</script>
```

### 3.3 Webview 生命周期

```typescript
// 监听 Webview 可见性变化
panel.onDidChangeViewState(e => {
    console.log('Webview visible:', e.webviewPanel.visible);
});

// 监听 Webview 关闭
panel.onDidDispose(() => {
    console.log('Webview disposed');
});

// 手动关闭 Webview
panel.dispose();
```

---

## 四、扩展间通信

### 4.1 获取其他扩展

**API**: `vscode.extensions.getExtension(extensionId: string)`

```typescript
const extension = vscode.extensions.getExtension('publisher.extensionId');

if (extension) {
    // 检查是否已激活
    if (!extension.isActive) {
        // 激活扩展
        await extension.activate();
    }
    
    // 获取导出的 API
    const api = extension.exports;
    
    // 使用 API
    if (api && typeof api.someMethod === 'function') {
        const result = await api.someMethod('arg1', 'arg2');
    }
}
```

### 4.2 导出公共 API

**在 extension.ts 中**:
```typescript
export function activate(context: vscode.ExtensionContext) {
    // 扩展激活逻辑...
    
    // 返回公共 API
    return {
        // 导出的方法
        sendMessage: async (text: string) => {
            console.log('Received message:', text);
            return 'Response from extension';
        },
        
        // 导出的属性
        version: '1.0.0',
        
        // 导出的事件
        onDidSomething: myEmitter.event
    };
}
```

### 4.3 获取所有扩展

**API**: `vscode.extensions.all`

```typescript
// 获取所有已安装的扩展
const allExtensions = vscode.extensions.all;

for (const ext of allExtensions) {
    console.log(`Extension: ${ext.id}, Active: ${ext.isActive}`);
}
```

### 4.4 监听扩展变更

**API**: `vscode.extensions.onDidChange`

```typescript
vscode.extensions.onDidChange(() => {
    console.log('Extensions changed (installed/uninstalled/enabled/disabled)');
});
```

---

## 五、RPC 通信机制

### 5.1 RPC Protocol 架构

```
┌─────────────────────────────────────────────────────────┐
│                  Main Thread (Browser)                   │
│  - MainThreadExtensionService                            │
│  - MainThreadCommands                                    │
│  - MainThreadWebview                                     │
└─────────────────────────────────────────────────────────┘
                          ↕ RPC Protocol
┌─────────────────────────────────────────────────────────┐
│              Extension Host (Node.js Process)            │
│  - ExtHostExtensionService                               │
│  - ExtHostCommands                                       │
│  - ExtHostWebview                                        │
└─────────────────────────────────────────────────────────┘
```

### 5.2 RPC Shape 定义

**位置**: [src/vs/workbench/api/common/extHost.protocol.ts](src/vs/workbench/api/common/extHost.protocol.ts)

```typescript
// Main Thread Shape (在 Main Thread 实现，ExtHost 调用)
export interface MainThreadExtensionServiceShape extends IDisposable {
    $activateExtension(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void>;
    $onExtensionActivationError(extensionId: ExtensionIdentifier, error: SerializedError, missingDependency: MissingExtensionDependency | null): void;
    $getExtension(extensionId: string): Promise<Dto<IExtensionDescription> | undefined>;
}

// ExtHost Shape (在 ExtHost 实现，Main Thread 调用)
export interface ExtHostExtensionServiceShape {
    $activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void>;
    $deltaExtensions(toAdd: IExtensionDescriptionDelta, toRemove: ExtensionIdentifier[]): Promise<void>;
}
```

### 5.3 RPC 调用示例

**从 ExtHost 调用 Main Thread**:
```typescript
// 在 ExtHost 中
const mainThreadProxy = rpcProtocol.getProxy(MainContext.MainThreadExtensionService);
await mainThreadProxy.$activateExtension(extensionId, reason);
```

**从 Main Thread 调用 ExtHost**:
```typescript
// 在 Main Thread 中
const extHostProxy = rpcProtocol.getProxy(ExtHostContext.ExtHostExtensionService);
await extHostProxy.$activateByEvent('onCommand:myCommand', ActivationKind.Normal);
```

### 5.4 自定义 RPC Shape

**步骤 1**: 在 `extHost.protocol.ts` 中定义 Shape:
```typescript
export interface MainThreadMyServiceShape extends IDisposable {
    $doSomething(arg: string): Promise<string>;
}

export interface ExtHostMyServiceShape {
    $onSomethingHappened(data: any): void;
}
```

**步骤 2**: 在 Main Thread 实现:
```typescript
export class MainThreadMyService implements MainThreadMyServiceShape {
    constructor(
        extHostContext: IExtHostContext,
        @IMyService private readonly myService: IMyService
    ) {
        // 获取 ExtHost 代理
        this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostMyService);
    }
    
    async $doSomething(arg: string): Promise<string> {
        // 实现逻辑
        return this.myService.doSomething(arg);
    }
    
    dispose(): void {
        // 清理
    }
}
```

**步骤 3**: 在 ExtHost 实现:
```typescript
export class ExtHostMyService implements ExtHostMyServiceShape {
    constructor(
        @IExtHostRpcService extHostRpc: IExtHostRpcService
    ) {
        // 获取 Main Thread 代理
        this._proxy = extHostRpc.getProxy(MainContext.MainThreadMyService);
    }
    
    $onSomethingHappened(data: any): void {
        // 处理来自 Main Thread 的调用
    }
    
    // 扩展可调用的方法
    async doSomething(arg: string): Promise<string> {
        return this._proxy.$doSomething(arg);
    }
}
```

---

## 六、Extension Service API

### 6.1 IExtensionService 接口

**位置**: [src/vs/workbench/services/extensions/common/extensions.ts:38](src/vs/workbench/services/extensions/common/extensions.ts#L38)

```typescript
export interface IExtensionService {
    // 激活扩展
    activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void>;
    
    // 获取扩展描述
    getExtension(id: string): Promise<IExtensionDescription | undefined>;
    
    // 获取所有扩展
    getExtensions(): Promise<IExtensionDescription[]>;
    
    // 检查扩展是否已激活
    isActivated(extensionId: ExtensionIdentifier): boolean;
    
    // 扩展状态变更事件
    onDidChangeExtensionsStatus: Event<ExtensionIdentifier[]>;
    
    // 扩展激活事件
    onWillActivateByEvent: Event<IWillActivateEvent>;
    onDidChangeExtensions: Event<IExtensionDescriptionDelta>;
}
```

### 6.2 ExtHostExtensionService

**位置**: [src/vs/workbench/api/common/extHostExtensionService.ts:1150](src/vs/workbench/api/common/extHostExtensionService.ts#L1150)

```typescript
export interface IExtHostExtensionService {
    // 获取扩展
    getExtension(extensionId: string): Promise<IExtensionDescription | undefined>;
    
    // 检查是否已激活
    isActivated(extensionId: ExtensionIdentifier): boolean;
    
    // 激活扩展
    activateByIdWithErrors(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void>;
    
    // 获取扩展导出的 API
    getExtensionExports(extensionId: ExtensionIdentifier): IExtensionAPI | null | undefined;
    
    // 获取扩展路径
    getExtensionPathIndex(): Promise<ExtensionPaths>;
}
```

---

## 七、Claude Code 扩展分析

### 7.1 package.json 关键信息

**扩展 ID**: `anthropic.claude-code`  
**版本**: `2.1.89`  
**主文件**: `./extension.js`

**激活事件**:
```json
"activationEvents": [
    "onStartupFinished",
    "onWebviewPanel:claudeVSCodePanel"
]
```

### 7.2 可用命令列表

```json
"commands": [
    {
        "command": "claude-vscode.editor.open",
        "title": "Claude Code: Open in New Tab"
    },
    {
        "command": "claude-vscode.editor.openLast",
        "title": "Claude Code: Open"
    },
    {
        "command": "claude-vscode.sidebar.open",
        "title": "Claude Code: Open in Side Bar"
    },
    {
        "command": "claude-vscode.focus",
        "title": "Claude Code: Focus input"
    },
    {
        "command": "claude-vscode.blur",
        "title": "Claude Code: Blur input"
    },
    {
        "command": "claude-vscode.newConversation",
        "title": "Claude Code: New Conversation"
    }
]
```

### 7.3 与 Claude Code 交互的方式

#### 方式 1: 命令调用（已验证可行）

```typescript
// 打开 Claude Code
await vscode.commands.executeCommand('claude-vscode.editor.open');

// 聚焦输入框
await vscode.commands.executeCommand('claude-vscode.focus');

// 新建对话
await vscode.commands.executeCommand('claude-vscode.newConversation');
```

**优点**: 简单直接，无需了解内部实现  
**缺点**: 无法直接传递消息内容，只能触发 UI 操作

#### 方式 2: Extension API（需验证）

```typescript
const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');

if (claudeExtension) {
    await claudeExtension.activate();
    const api = claudeExtension.exports;
    
    // 需要验证 api 的结构
    console.log('Claude Code API:', api);
    
    // 如果有 sendMessage 方法
    if (api && typeof api.sendMessage === 'function') {
        await api.sendMessage('Hello Claude!');
    }
}
```

**优点**: 如果有导出 API，可以直接调用  
**缺点**: 需要 Claude Code 导出公共 API（待验证）

#### 方式 3: Webview 消息传递（高级，需逆向）

```typescript
// 理论上可以获取 Claude Code 的 Webview 实例
// 然后通过 postMessage 发送消息
// 但需要了解 Claude Code 的内部消息协议
```

**优点**: 可以实现完整的双向通信  
**缺点**: 需要逆向工程，可能不稳定

#### 方式 4: 剪贴板 + 命令组合（备选方案）

```typescript
// 1. 将消息复制到剪贴板
await vscode.env.clipboard.writeText(userInput);

// 2. 打开 Claude Code
await vscode.commands.executeCommand('claude-vscode.editor.open');

// 3. 聚焦输入框
await vscode.commands.executeCommand('claude-vscode.focus');

// 4. 用户手动粘贴（Cmd+V）
```

**优点**: 不依赖 Claude Code 的内部实现  
**缺点**: 需要用户手动操作，体验较差

---

## 八、实用工具 API

### 8.1 窗口与 UI

```typescript
// 显示信息消息
vscode.window.showInformationMessage('Hello!');

// 显示警告消息
vscode.window.showWarningMessage('Warning!');

// 显示错误消息
vscode.window.showErrorMessage('Error!');

// 显示输入框
const input = await vscode.window.showInputBox({
    prompt: 'Enter something',
    placeHolder: 'Type here...'
});

// 显示快速选择
const selected = await vscode.window.showQuickPick(['Option 1', 'Option 2'], {
    placeHolder: 'Select an option'
});

// 创建输出通道
const outputChannel = vscode.window.createOutputChannel('My Extension');
outputChannel.appendLine('Hello from extension!');
outputChannel.show();
```

### 8.2 文件系统

```typescript
// 读取文件
const uri = vscode.Uri.file('/path/to/file.txt');
const content = await vscode.workspace.fs.readFile(uri);
const text = Buffer.from(content).toString('utf8');

// 写入文件
const data = Buffer.from('Hello World', 'utf8');
await vscode.workspace.fs.writeFile(uri, data);

// 删除文件
await vscode.workspace.fs.delete(uri);

// 创建目录
await vscode.workspace.fs.createDirectory(uri);
```

### 8.3 配置

```typescript
// 读取配置
const config = vscode.workspace.getConfiguration('myExtension');
const value = config.get<string>('mySetting');

// 更新配置
await config.update('mySetting', 'newValue', vscode.ConfigurationTarget.Global);

// 监听配置变更
vscode.workspace.onDidChangeConfiguration(e => {
    if (e.affectsConfiguration('myExtension.mySetting')) {
        console.log('Setting changed!');
    }
});
```

---

## 九、关键发现与建议

### 9.1 与 Claude Code 交互的推荐方案

**短期方案（立即可用）**:
1. 使用命令调用打开 Claude Code UI
2. 使用剪贴板传递消息内容
3. 用户手动粘贴到 Claude Code

**中期方案（需验证）**:
1. 验证 Claude Code 是否导出公共 API
2. 如果有，直接调用 API 方法
3. 如果没有，考虑提交 Feature Request

**长期方案（需深入研究）**:
1. 研究 Claude Code 的 Webview 消息协议
2. 实现 Webview 消息拦截和注入
3. 实现完整的双向通信

### 9.2 技术风险评估

| 方案 | 可行性 | 稳定性 | 开发难度 | 用户体验 |
|------|--------|--------|----------|----------|
| 命令调用 | ✅ 高 | ✅ 高 | ✅ 低 | ⚠️ 中 |
| Extension API | ⚠️ 待验证 | ✅ 高 | ✅ 低 | ✅ 高 |
| Webview 消息 | ⚠️ 中 | ❌ 低 | ❌ 高 | ✅ 高 |
| 剪贴板方案 | ✅ 高 | ✅ 高 | ✅ 低 | ❌ 低 |

### 9.3 下一步行动

1. **立即执行**: 运行 [claude-bridge-test](../../extensions/claude-bridge-test/) 扩展，验证 Claude Code 的 API
2. **短期目标**: 实现基于命令调用的基础交互
3. **中期目标**: 如果有 API，实现完整的消息传递
4. **长期目标**: 研究 Webview 通信，实现流式响应

---

## 十、参考资源

- VS Code Extension API: https://code.visualstudio.com/api
- VS Code 源码: https://github.com/microsoft/vscode
- Extension Host 架构: https://code.visualstudio.com/api/advanced-topics/extension-host
- Claude Code 扩展路径: `~/.vscode/extensions/anthropic.claude-code-2.1.89-darwin-x64/`
- 测试扩展: [extensions/claude-bridge-test/](../../extensions/claude-bridge-test/)
