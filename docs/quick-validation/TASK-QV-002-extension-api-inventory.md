# 任务卡：TASK-QV-002 - 扩展交互 API 清单

**任务编号**: TASK-QV-002  
**任务名称**: IDE 中所有扩展交互 API 和函数的完整清单  
**创建时间**: 2026-04-02  
**优先级**: P0（最高优先级）  
**状态**: 🏗️ 进行中

---

## 一、任务目标

系统性地整理 VS Code IDE 中所有与扩展交互相关的 API、函数、服务和机制，为实现与 Claude Code 扩展的交互提供完整的技术参考。

---

## 二、清单分类

### 2.1 扩展生命周期管理

#### 扩展发现与加载
- [ ] 扩展扫描路径
- [ ] package.json 解析
- [ ] 扩展依赖解析
- [ ] 扩展激活事件（Activation Events）

#### 扩展激活与停用
- [ ] `activate()` 函数调用时机
- [ ] `deactivate()` 函数调用时机
- [ ] Extension Host 进程管理

### 2.2 Extension API (vscode.*)

#### 核心 API
- [ ] `vscode.extensions` - 扩展管理
  - `getExtension(extensionId)` - 获取扩展实例
  - `all` - 所有已安装扩展
  - `onDidChange` - 扩展变更事件

#### 命令系统
- [ ] `vscode.commands`
  - `registerCommand()` - 注册命令
  - `executeCommand()` - 执行命令
  - `getCommands()` - 获取所有命令

#### Webview API
- [ ] `vscode.window.createWebviewPanel()` - 创建 Webview
- [ ] `webview.postMessage()` - 发送消息到 Webview
- [ ] `webview.onDidReceiveMessage()` - 接收 Webview 消息

#### 窗口与 UI
- [ ] `vscode.window.showInformationMessage()`
- [ ] `vscode.window.showInputBox()`
- [ ] `vscode.window.createOutputChannel()`

### 2.3 RPC 通信机制

#### Main Thread ↔ Extension Host
- [ ] RPC Protocol 实现
- [ ] RPC Shape 定义
- [ ] 消息序列化与反序列化
- [ ] 流式数据传输

#### 关键文件
- [ ] `src/vs/workbench/services/extensions/common/rpcProtocol.ts`
- [ ] `src/vs/workbench/api/common/extHost.protocol.ts`
- [ ] `src/vs/workbench/api/browser/mainThreadExtensionService.ts`

### 2.4 扩展间通信

#### 获取其他扩展
```typescript
const extension = vscode.extensions.getExtension('publisher.extensionId');
if (extension) {
  if (!extension.isActive) {
    await extension.activate();
  }
  const api = extension.exports;
}
```

#### 导出 API
```typescript
export function activate(context: vscode.ExtensionContext) {
  return {
    // 导出的公共 API
    myPublicFunction: () => {},
    myPublicProperty: 'value'
  };
}
```

### 2.5 Contribution Points (package.json)

#### 命令贡献
```json
"contributes": {
  "commands": [
    {
      "command": "extension.commandId",
      "title": "Command Title"
    }
  ]
}
```

#### 视图贡献
```json
"contributes": {
  "views": {
    "explorer": [
      {
        "id": "myView",
        "name": "My View"
      }
    ]
  }
}
```

#### 配置贡献
```json
"contributes": {
  "configuration": {
    "properties": {
      "myExtension.setting": {
        "type": "string",
        "default": "value"
      }
    }
  }
}
```

---

## 三、研究方法

### 3.1 代码搜索策略

#### 搜索扩展服务
```bash
# 搜索扩展服务接口
grep -r "IExtensionService" src/vs/workbench/services/extensions/

# 搜索 Extension Host 相关
grep -r "ExtensionHost" src/vs/workbench/services/extensions/

# 搜索 RPC 相关
grep -r "rpcProtocol" src/vs/workbench/
```

#### 搜索 Extension API
```bash
# 搜索 vscode.extensions API
grep -r "getExtension" src/vs/workbench/api/

# 搜索命令注册
grep -r "registerCommand" src/vs/workbench/api/

# 搜索 Webview API
grep -r "createWebviewPanel" src/vs/workbench/api/
```

### 3.2 关键文件列表

#### Extension Service 层
- [ ] `src/vs/workbench/services/extensions/common/extensions.ts`
- [ ] `src/vs/workbench/services/extensions/browser/extensionService.ts`
- [ ] `src/vs/workbench/services/extensions/common/extensionHostManager.ts`
- [ ] `src/vs/workbench/services/extensions/common/extensionHostProcessManager.ts`

#### Extension API 层
- [ ] `src/vs/workbench/api/common/extHost.api.impl.ts`
- [ ] `src/vs/workbench/api/common/extHostExtensionService.ts`
- [ ] `src/vs/workbench/api/common/extHostCommands.ts`
- [ ] `src/vs/workbench/api/common/extHostWebview.ts`

#### Main Thread 层
- [ ] `src/vs/workbench/api/browser/mainThreadExtensionService.ts`
- [ ] `src/vs/workbench/api/browser/mainThreadCommands.ts`
- [ ] `src/vs/workbench/api/browser/mainThreadWebview.ts`

#### RPC 层
- [ ] `src/vs/workbench/services/extensions/common/rpcProtocol.ts`
- [ ] `src/vs/workbench/services/extensions/common/proxyIdentifier.ts`
- [ ] `src/vs/workbench/api/common/extHost.protocol.ts`

---

## 四、API 清单（详细）

### 4.1 扩展管理 API

#### IExtensionService
```typescript
interface IExtensionService {
  // 激活扩展
  activateByEvent(activationEvent: string): Promise<void>;
  
  // 获取扩展描述
  getExtension(id: string): Promise<IExtensionDescription | undefined>;
  
  // 获取所有扩展
  getExtensions(): Promise<IExtensionDescription[]>;
  
  // 扩展状态变更事件
  onDidChangeExtensionsStatus: Event<ExtensionIdentifier[]>;
}
```

#### IExtensionManagementService
```typescript
interface IExtensionManagementService {
  // 安装扩展
  install(vsix: URI): Promise<ILocalExtension>;
  
  // 卸载扩展
  uninstall(extension: ILocalExtension): Promise<void>;
  
  // 获取已安装扩展
  getInstalled(): Promise<ILocalExtension[]>;
}
```

### 4.2 命令系统 API

#### ICommandService
```typescript
interface ICommandService {
  // 执行命令
  executeCommand<T>(id: string, ...args: any[]): Promise<T>;
  
  // 命令执行事件
  onWillExecuteCommand: Event<ICommandEvent>;
  onDidExecuteCommand: Event<ICommandEvent>;
}
```

#### ExtHost Commands
```typescript
class ExtHostCommands {
  // 注册命令
  registerCommand(id: string, callback: Function): Disposable;
  
  // 执行命令
  executeCommand<T>(id: string, ...args: any[]): Promise<T>;
  
  // 获取所有命令
  getCommands(filterInternal?: boolean): Promise<string[]>;
}
```

### 4.3 Webview API

#### Main Thread Webview
```typescript
interface MainThreadWebviews {
  // 创建 Webview
  $createWebviewPanel(
    handle: WebviewHandle,
    viewType: string,
    title: string,
    showOptions: any,
    options: WebviewOptions
  ): void;
  
  // 发送消息到 Webview
  $postMessage(handle: WebviewHandle, message: any): void;
  
  // 销毁 Webview
  $disposeWebview(handle: WebviewHandle): void;
}
```

#### ExtHost Webview
```typescript
class ExtHostWebview {
  // 创建 Webview Panel
  createWebviewPanel(
    viewType: string,
    title: string,
    showOptions: ViewColumn | { viewColumn: ViewColumn },
    options?: WebviewPanelOptions & WebviewOptions
  ): WebviewPanel;
  
  // 接收消息
  onDidReceiveMessage: Event<any>;
  
  // 发送消息
  postMessage(message: any): Promise<boolean>;
}
```

### 4.4 RPC 通信 API

#### RPCProtocol
```typescript
class RPCProtocol {
  // 获取代理
  getProxy<T>(identifier: ProxyIdentifier<T>): T;
  
  // 设置实现
  set<T>(identifier: ProxyIdentifier<T>, value: T): void;
  
  // 发送消息
  send(msg: MessageType, ...args: any[]): void;
  
  // 接收消息
  private _receiveOneMessage(msg: MessageType, ...args: any[]): void;
}
```

#### ProxyIdentifier
```typescript
class ProxyIdentifier<T> {
  public readonly id: string;
  constructor(id: string) {
    this.id = id;
  }
}

// 示例
const MainThreadExtensionServiceShape = new ProxyIdentifier<MainThreadExtensionServiceShape>('MainThreadExtensionService');
```

### 4.5 扩展激活 API

#### Activation Events
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

#### Extension Context
```typescript
interface ExtensionContext {
  // 扩展路径
  extensionPath: string;
  extensionUri: Uri;
  
  // 存储
  globalState: Memento;
  workspaceState: Memento;
  
  // 订阅管理
  subscriptions: { dispose(): any }[];
  
  // 扩展模式
  extensionMode: ExtensionMode;
}
```

---

## 五、Claude Code 扩展分析

### 5.1 package.json 分析

#### 激活事件
```json
"activationEvents": [
  "onStartupFinished",
  "onWebviewPanel:claudeVSCodePanel"
]
```

#### 命令列表
```json
"commands": [
  {
    "command": "claude-vscode.editor.open",
    "title": "Claude Code: Open in New Tab"
  },
  {
    "command": "claude-vscode.focus",
    "title": "Claude Code: Focus input"
  },
  {
    "command": "claude-vscode.blur",
    "title": "Claude Code: Blur input"
  }
  // ... 更多命令
]
```

### 5.2 可能的交互方式

#### 方式 1: 命令调用
```typescript
// 打开 Claude Code
await vscode.commands.executeCommand('claude-vscode.editor.open');

// 聚焦输入框
await vscode.commands.executeCommand('claude-vscode.focus');
```

#### 方式 2: Extension API
```typescript
// 获取 Claude Code 扩展
const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');

if (claudeExtension) {
  // 激活扩展
  await claudeExtension.activate();
  
  // 获取导出的 API
  const api = claudeExtension.exports;
  
  // 调用 API（如果有）
  if (api && api.sendMessage) {
    await api.sendMessage('Hello Claude!');
  }
}
```

#### 方式 3: Webview 消息传递
```typescript
// 需要获取 Claude Code 的 Webview 实例
// 这可能需要通过内部 API 或反射机制
```

---

## 六、研究进展

### 已完成
- [x] 创建任务卡
- [x] 初步分析 Claude Code 的 package.json
- [ ] 整理扩展生命周期 API
- [ ] 整理 Extension API (vscode.*)
- [ ] 整理 RPC 通信 API
- [ ] 整理扩展间通信 API
- [ ] 整理 Webview API
- [ ] 分析 Claude Code 的内部实现

### 当前进展
- 正在整理 API 清单...

### 关键发现
- Claude Code 使用 Webview Panel 实现 UI
- 主要通过命令系统暴露功能
- 需要验证是否导出了公共 API

---

## 七、输出成果

### 7.1 完整 API 清单文档

**文件**: `docs/quick-validation/extension-api-complete-inventory.md`

**内容**:
- 所有扩展相关的 Service 接口
- 所有 Extension API (vscode.*)
- 所有 RPC Shape 定义
- 所有 Contribution Points
- 代码示例和使用说明

### 7.2 Claude Code 交互方案

**文件**: `docs/quick-validation/claude-code-interaction-methods.md`

**内容**:
- 可行的交互方式列表
- 每种方式的优缺点
- 实现难度评估
- 推荐方案

### 7.3 代码示例集

**文件**: `docs/quick-validation/extension-interaction-examples.md`

**内容**:
- 获取扩展实例的示例
- 调用扩展命令的示例
- 扩展间通信的示例
- Webview 通信的示例

---

## 八、下一步行动

1. **立即执行**: 使用 Grep 和 Read 工具系统性地搜索和阅读关键文件
2. **短期目标**: 完成 API 清单的整理
3. **中期目标**: 验证 Claude Code 的交互方式
4. **长期目标**: 实现与 Claude Code 的完整交互

---

## 九、参考资源

- VS Code Extension API: https://code.visualstudio.com/api
- VS Code 源码: https://github.com/microsoft/vscode
- Claude Code 扩展路径: `~/.vscode/extensions/anthropic.claude-code-2.1.89-darwin-x64/`
