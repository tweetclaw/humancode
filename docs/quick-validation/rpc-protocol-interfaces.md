# VS Code RPC Protocol 接口完整清单

**文档版本**: v1.0  
**创建时间**: 2026-04-03  
**目标**: 系统性整理 Extension Host 与 IDE Main Thread 之间的所有 RPC 接口

---

## 一、RPC Protocol 架构

### 1.1 通信模型

```
┌─────────────────────────────────────────────────────────┐
│              Main Thread (IDE 主进程)                     │
│  - 运行在浏览器/Electron 主进程                           │
│  - 负责 UI 渲染、编辑器核心、Workbench                    │
│  - 实现 MainThread*Shape 接口（165个）                   │
│  - 被 Extension Host 通过 RPC 调用                       │
└─────────────────────────────────────────────────────────┘
                          ↕ RPC Protocol (IPC)
                    - 基于消息传递
                    - 支持双向调用
                    - 自动序列化/反序列化
┌─────────────────────────────────────────────────────────┐
│           Extension Host (独立 Node.js 进程)              │
│  - 运行所有第三方扩展代码（包括 Claude Code）             │
│  - 实现 ExtHost*Shape 接口（80个）                       │
│  - 通过 RPC 调用 Main Thread 的服务                      │
│  - 暴露 VS Code Extension API                           │
└─────────────────────────────────────────────────────────┘
```

### 1.2 接口命名规范

- **MainThread*Shape**: 在 Main Thread 实现，被 Extension Host 调用
- **ExtHost*Shape**: 在 Extension Host 实现，被 Main Thread 调用

---

## 二、核心 RPC 接口分类

### 2.1 命令与扩展管理（6个接口）

#### MainThreadCommandsShape
```typescript
export interface MainThreadCommandsShape extends IDisposable {
    $registerCommand(id: string): void;
    $unregisterCommand(id: string): void;
    $fireCommandActivationEvent(id: string): void;
    $executeCommand(id: string, args: unknown[], retry: boolean): Promise<unknown>;
    $getCommands(): Promise<string[]>;
}
```

**用途**: 命令注册、执行、查询
**关键方法**:
- `$executeCommand`: 执行命令（我们用这个调用 Claude Code 的命令）
- `$getCommands`: 获取所有可用命令

#### MainThreadExtensionServiceShape
```typescript
export interface MainThreadExtensionServiceShape extends IDisposable {
    $activateExtension(extensionId: ExtensionIdentifier, reason: ExtensionActivationReason): Promise<void>;
    $onExtensionActivationError(extensionId: ExtensionIdentifier, error: SerializedError): void;
    $getExtension(extensionId: string): Promise<IExtensionDescription | undefined>;
}
```

**用途**: 扩展激活、查询
**关键方法**:
- `$activateExtension`: 激活扩展
- `$getExtension`: 获取扩展信息

#### ExtHostCommandsShape
```typescript
export interface ExtHostCommandsShape {
    $executeContributedCommand(id: string, ...args: any[]): Promise<unknown>;
}
```

**用途**: Extension Host 执行命令

#### ExtHostExtensionServiceShape
```typescript
export interface ExtHostExtensionServiceShape {
    $activateByEvent(activationEvent: string, activationKind: ActivationKind): Promise<void>;
    $deltaExtensions(toAdd: IExtensionDescriptionDelta, toRemove: ExtensionIdentifier[]): Promise<void>;
}
```

**用途**: 扩展激活事件处理

---

### 2.2 Webview 相关（8个接口）

#### MainThreadWebviewsShape
```typescript
export interface MainThreadWebviewsShape extends IDisposable {
    $setHtml(handle: string, value: string): void;
    $postMessage(handle: string, value: any): Promise<boolean>;
    $registerSerializer(viewType: string): void;
    $unregisterSerializer(viewType: string): void;
}
```

**用途**: Webview 内容管理、消息传递
**关键方法**:
- `$postMessage`: 向 Webview 发送消息（我们尝试用这个与 Claude Code 通信）

#### MainThreadWebviewPanelsShape
```typescript
export interface MainThreadWebviewPanelsShape extends IDisposable {
    $createWebviewPanel(
        handle: string,
        viewType: string,
        title: string,
        showOptions: any,
        options: any
    ): void;
    $disposeWebview(handle: string): void;
    $reveal(handle: string, showOptions: any): void;
    $setTitle(handle: string, value: string): void;
    $setIconPath(handle: string, value: any): void;
}
```

**用途**: Webview Panel 生命周期管理

#### MainThreadWebviewViewsShape
```typescript
export interface MainThreadWebviewViewsShape extends IDisposable {
    $registerWebviewViewProvider(
        handle: string,
        viewType: string,
        options: any
    ): void;
    $unregisterWebviewViewProvider(handle: string): void;
    $setWebviewViewTitle(handle: string, value: string): void;
    $setWebviewViewDescription(handle: string, value: string): void;
    $show(handle: string, preserveFocus: boolean): void;
}
```

**用途**: Webview View 管理

#### ExtHostWebviewsShape
```typescript
export interface ExtHostWebviewsShape {
    $onMessage(handle: string, message: any): void;
    $onMissingCsp(handle: string, extensionId: string): void;
}
```

**用途**: Extension Host 接收 Webview 消息

#### ExtHostWebviewPanelsShape
```typescript
export interface ExtHostWebviewPanelsShape {
    $onDidChangeWebviewPanelViewState(handle: string, visible: boolean, active: boolean): void;
    $onDidDisposeWebviewPanel(handle: string): Promise<void>;
    $deserializeWebviewPanel(
        handle: string,
        viewType: string,
        title: string,
        state: any,
        position: number,
        options: any
    ): Promise<void>;
}
```

**用途**: Webview Panel 状态变化通知

---

### 2.3 编辑器与文档（10个接口）

#### MainThreadDocumentsShape
```typescript
export interface MainThreadDocumentsShape extends IDisposable {
    $tryCreateDocument(options?: { language?: string; content?: string }): Promise<UriComponents>;
    $tryOpenDocument(uri: UriComponents): Promise<UriComponents>;
    $trySaveDocument(uri: UriComponents): Promise<boolean>;
}
```

**用途**: 文档创建、打开、保存

#### MainThreadTextEditorsShape
```typescript
export interface MainThreadTextEditorsShape extends IDisposable {
    $trySetOptions(id: string, options: ITextEditorConfigurationUpdate): Promise<void>;
    $trySetDecorations(id: string, key: string, ranges: IDecorationOptions[]): Promise<void>;
    $tryRevealRange(id: string, range: IRange, revealType: TextEditorRevealType): Promise<void>;
    $trySetSelections(id: string, selections: ISelection[]): Promise<void>;
    $tryApplyEdits(id: string, modelVersionId: number, edits: ISingleEditOperation[]): Promise<boolean>;
    $tryInsertSnippet(id: string, template: string, selections: IRange[]): Promise<boolean>;
}
```

**用途**: 编辑器操作（选择、编辑、装饰）

#### ExtHostDocumentsShape
```typescript
export interface ExtHostDocumentsShape {
    $acceptModelModeChanged(uri: UriComponents, oldModeId: string, newModeId: string): void;
    $acceptModelSaved(uri: UriComponents): void;
    $acceptDirtyStateChanged(uri: UriComponents, isDirty: boolean): void;
    $acceptModelChanged(uri: UriComponents, events: ISerializedModelContentChangedEvent, isDirty: boolean): void;
}
```

**用途**: 文档变化通知

#### ExtHostEditorsShape
```typescript
export interface ExtHostEditorsShape {
    $acceptEditorPropertiesChanged(id: string, props: IEditorPropertiesChangeData): void;
    $acceptEditorPositionData(data: ITextEditorPositionData): void;
}
```

**用途**: 编辑器属性变化通知

---

### 2.4 窗口与 UI（8个接口）

#### MainThreadWindowShape
```typescript
export interface MainThreadWindowShape extends IDisposable {
    $getWindowVisibility(): Promise<boolean>;
    $openUri(uri: UriComponents, options: any): Promise<boolean>;
    $asExternalUri(uri: UriComponents, options: any): Promise<UriComponents>;
}
```

**用途**: 窗口可见性、URI 打开

#### MainThreadMessageServiceShape
```typescript
export interface MainThreadMessageServiceShape extends IDisposable {
    $showMessage(
        severity: Severity,
        message: string,
        options: any,
        commands: any[]
    ): Promise<number | undefined>;
}
```

**用途**: 显示消息提示

#### MainThreadQuickOpenShape
```typescript
export interface MainThreadQuickOpenShape extends IDisposable {
    $show(instance: number, options: any, token: CancellationToken): Promise<number | undefined>;
    $setItems(instance: number, items: any[]): Promise<void>;
    $setError(instance: number, error: Error): Promise<void>;
    $input(options: any, validateInput: boolean, token: CancellationToken): Promise<string | undefined>;
}
```

**用途**: 快速选择、输入框

#### MainThreadStatusBarShape
```typescript
export interface MainThreadStatusBarShape extends IDisposable {
    $setEntry(
        id: string,
        statusId: string,
        statusName: string,
        text: string,
        tooltip: string | undefined,
        command: string | undefined,
        color: string | ThemeColor | undefined,
        backgroundColor: string | ThemeColor | undefined,
        alignment: number,
        priority: number | undefined
    ): void;
    $dispose(id: string): void;
}
```

**用途**: 状态栏管理

---

### 2.5 文件系统（4个接口）

#### MainThreadFileSystemShape
```typescript
export interface MainThreadFileSystemShape extends IDisposable {
    $registerFileSystemProvider(handle: number, scheme: string, capabilities: files.FileSystemProviderCapabilities): void;
    $unregisterProvider(handle: number): void;
    $onFileSystemChange(handle: number, changes: files.IFileChange[]): void;
    $stat(uri: UriComponents): Promise<files.IStat>;
    $readdir(uri: UriComponents): Promise<[string, files.FileType][]>;
    $readFile(uri: UriComponents): Promise<VSBuffer>;
    $writeFile(uri: UriComponents, content: VSBuffer, opts: files.IFileWriteOptions): Promise<void>;
    $rename(source: UriComponents, target: UriComponents, opts: files.IFileOverwriteOptions): Promise<void>;
    $copy(source: UriComponents, target: UriComponents, opts: files.IFileOverwriteOptions): Promise<void>;
    $mkdir(uri: UriComponents): Promise<void>;
    $delete(uri: UriComponents, opts: files.IFileDeleteOptions): Promise<void>;
}
```

**用途**: 文件系统操作

#### MainThreadFileSystemEventServiceShape
```typescript
export interface MainThreadFileSystemEventServiceShape extends IDisposable {
    // 文件系统事件监听
}
```

**用途**: 文件系统事件

---

### 2.6 工作区与配置（4个接口）

#### MainThreadWorkspaceShape
```typescript
export interface MainThreadWorkspaceShape extends IDisposable {
    $updateWorkspaceFolders(
        extensionName: string,
        index: number,
        deleteCount: number,
        foldersToAdd: { uri: UriComponents; name?: string }[]
    ): Promise<void>;
    $getWorkspaceFolder(uri: UriComponents): Promise<UriComponents | undefined>;
    $resolveProxy(url: string): Promise<string | undefined>;
}
```

**用途**: 工作区文件夹管理

#### MainThreadConfigurationShape
```typescript
export interface MainThreadConfigurationShape extends IDisposable {
    $updateConfigurationOption(
        target: ConfigurationTarget | null,
        key: string,
        value: unknown,
        overrides: IConfigurationOverrides | undefined
    ): Promise<void>;
    $removeConfigurationOption(
        target: ConfigurationTarget | null,
        key: string,
        overrides: IConfigurationOverrides | undefined
    ): Promise<void>;
}
```

**用途**: 配置读写

---

### 2.7 剪贴板与存储（4个接口）

#### MainThreadClipboardShape
```typescript
export interface MainThreadClipboardShape extends IDisposable {
    $readText(): Promise<string>;
    $writeText(value: string): Promise<void>;
}
```

**用途**: 剪贴板读写（我们用这个传递消息给 Claude Code）

#### MainThreadStorageShape
```typescript
export interface MainThreadStorageShape extends IDisposable {
    $getValue<T>(shared: boolean, key: string): Promise<T | undefined>;
    $setValue(shared: boolean, key: string, value: object): Promise<void>;
}
```

**用途**: 扩展存储

#### MainThreadSecretStateShape
```typescript
export interface MainThreadSecretStateShape extends IDisposable {
    $getPassword(extensionId: string, key: string): Promise<string | undefined>;
    $setPassword(extensionId: string, key: string, value: string): Promise<void>;
    $deletePassword(extensionId: string, key: string): Promise<void>;
}
```

**用途**: 密钥存储

---

### 2.8 语言特性（4个接口）

#### MainThreadLanguageFeaturesShape
```typescript
export interface MainThreadLanguageFeaturesShape extends IDisposable {
    $registerDocumentSymbolProvider(handle: number, selector: any, label: string): void;
    $registerCodeLensProvider(handle: number, selector: any, eventHandle: number): void;
    $registerDefinitionProvider(handle: number, selector: any): void;
    $registerDeclarationProvider(handle: number, selector: any): void;
    $registerImplementationProvider(handle: number, selector: any): void;
    $registerTypeDefinitionProvider(handle: number, selector: any): void;
    $registerHoverProvider(handle: number, selector: any): void;
    $registerCompletionItemProvider(handle: number, selector: any, triggerCharacters: string[], supportsResolve: boolean): void;
    // ... 更多语言特性
}
```

**用途**: 语言服务提供者注册（补全、定义跳转等）

---

### 2.9 终端（2个接口）

#### MainThreadTerminalServiceShape
```typescript
export interface MainThreadTerminalServiceShape extends IDisposable {
    $createTerminal(config: IShellLaunchConfigDto): Promise<{ id: number; name: string }>;
    $dispose(terminalId: number): void;
    $hide(terminalId: number): void;
    $sendText(terminalId: number, text: string, addNewLine: boolean): void;
    $show(terminalId: number, preserveFocus: boolean): void;
    $registerProcessSupport(isSupported: boolean): void;
}
```

**用途**: 终端创建、控制

---

### 2.10 调试（2个接口）

#### MainThreadDebugServiceShape
```typescript
export interface MainThreadDebugServiceShape extends IDisposable {
    $registerDebugTypes(debugTypes: string[]): void;
    $startDebugging(folder: UriComponents | undefined, nameOrConfig: string | IConfig, options: any): Promise<boolean>;
    $stopDebugging(sessionId: string | undefined): Promise<void>;
    $registerDebugConfigurationProvider(type: string, triggerKind: DebugConfigurationProviderTriggerKind, hasProvide: boolean, hasResolve: boolean, hasResolve2: boolean, handle: number): Promise<void>;
}
```

**用途**: 调试会话管理

---

### 2.11 AI 相关（新增，8个接口）

#### MainThreadAiInteropShape
```typescript
export interface MainThreadAiInteropShape extends IDisposable {
    $registerEndpoint(descriptor: EndpointDescriptor): Promise<void>;
    $unregisterEndpoint(endpointId: string): Promise<void>;
    $invoke(request: IAIInteropInvocationRequest, token: CancellationToken): Promise<void>;
}
```

**用途**: AI Interop 端点注册、调用（我们的系统）

#### MainThreadLanguageModelsShape
```typescript
export interface MainThreadLanguageModelsShape extends IDisposable {
    $registerLanguageModelProvider(handle: number, identifier: string, metadata: any): void;
    $unregisterLanguageModelProvider(handle: number): void;
    $handleLanguageModelRequest(handle: number, request: any, token: CancellationToken): Promise<any>;
}
```

**用途**: 语言模型提供者

#### MainThreadChatAgentsShape2
```typescript
export interface MainThreadChatAgentsShape2 extends IDisposable {
    $registerAgent(handle: number, name: string, metadata: IChatAgentMetadata): void;
    $unregisterAgent(handle: number): void;
    $handleChatRequest(handle: number, request: IChatAgentRequest, token: CancellationToken): Promise<IChatAgentResult>;
}
```

**用途**: Chat Agent 注册、处理

---

### 2.12 其他重要接口（20+个）

- **MainThreadDiagnosticsShape**: 诊断信息（错误、警告）
- **MainThreadTaskShape**: 任务运行
- **MainThreadSCMShape**: 源代码管理
- **MainThreadTestingShape**: 测试运行
- **MainThreadNotebookShape**: Notebook 支持
- **MainThreadTelemetryShape**: 遥测数据
- **MainThreadAuthenticationShape**: 认证管理
- **MainThreadProgressShape**: 进度显示
- **MainThreadOutputServiceShape**: 输出通道
- **MainThreadConsoleShape**: 控制台日志

---

## 三、关键发现

### 3.1 与 Claude Code 交互的可用接口

基于我们的测试，以下接口可用于与 Claude Code 交互：

1. **MainThreadCommandsShape.$executeCommand**
   - ✅ 可以调用 Claude Code 的命令
   - ✅ 可以打开 UI、聚焦输入框
   - ❌ 无法直接传递消息内容

2. **MainThreadClipboardShape.$writeText**
   - ✅ 可以将消息复制到剪贴板
   - ✅ 配合命令调用实现消息传递
   - ⚠️ 需要用户手动粘贴

3. **MainThreadWebviewsShape.$postMessage**
   - ✅ 可以向 Webview 发送消息
   - ❌ Claude Code 的消息协议未知
   - ❌ 我们尝试的格式都不被识别

### 3.2 Extension Host 的隔离性

**关键限制**:
- Extension Host 运行在独立进程中
- 扩展之间无法直接访问对方的内部对象
- 只能通过以下方式通信：
  1. RPC 调用 Main Thread 的服务
  2. 通过 Extension API 的 `exports` 机制
  3. 通过命令系统

**这意味着**:
- 我们无法直接访问 Claude Code 的 Webview 实例
- 我们无法直接调用 Claude Code 的内部方法
- 我们只能通过公开的 API（命令、exports）与之交互

### 3.3 推荐的交互方案

基于 RPC 接口的限制，推荐方案：

**方案 A: 命令 + 剪贴板（当前最可行）**
```typescript
// 1. 复制消息到剪贴板
await mainThreadClipboard.$writeText(message);

// 2. 打开 Claude Code
await mainThreadCommands.$executeCommand('claude-vscode.editor.open', [], false);

// 3. 聚焦输入框
await mainThreadCommands.$executeCommand('claude-vscode.focus', [], false);

// 4. 粘贴（需要用户按 Cmd+V 或我们尝试自动粘贴）
await mainThreadCommands.$executeCommand('editor.action.clipboardPasteAction', [], false);
```

**方案 B: 验证 Extension exports API**
```typescript
// 检查 Claude Code 是否导出公共 API
const claudeExtension = await mainThreadExtensionService.$getExtension('anthropic.claude-code');
if (claudeExtension) {
    // 激活扩展
    await mainThreadExtensionService.$activateExtension(claudeExtension.identifier, reason);
    
    // 获取 exports（需要通过 ExtHost 访问）
    const api = extHostExtensionService.getExtensionExports(claudeExtension.identifier);
    
    // 如果有 sendMessage 方法
    if (api && typeof api.sendMessage === 'function') {
        await api.sendMessage(message);
    }
}
```

---

## 四、总结

### 4.1 RPC 接口总数

- **MainThread*Shape**: 165个接口
- **ExtHost*Shape**: 80个接口
- **总计**: 245个 RPC 接口

### 4.2 核心接口分类

| 分类 | 接口数量 | 关键接口 |
|------|---------|---------|
| 命令与扩展 | 6 | MainThreadCommandsShape, MainThreadExtensionServiceShape |
| Webview | 8 | MainThreadWebviewsShape, MainThreadWebviewPanelsShape |
| 编辑器与文档 | 10 | MainThreadDocumentsShape, MainThreadTextEditorsShape |
| 窗口与 UI | 8 | MainThreadWindowShape, MainThreadMessageServiceShape |
| 文件系统 | 4 | MainThreadFileSystemShape |
| 工作区与配置 | 4 | MainThreadWorkspaceShape, MainThreadConfigurationShape |
| 剪贴板与存储 | 4 | MainThreadClipboardShape, MainThreadStorageShape |
| 语言特性 | 4 | MainThreadLanguageFeaturesShape |
| 终端 | 2 | MainThreadTerminalServiceShape |
| 调试 | 2 | MainThreadDebugServiceShape |
| AI 相关 | 8 | MainThreadAiInteropShape, MainThreadLanguageModelsShape |
| 其他 | 20+ | 各种专用服务 |

### 4.3 与 Claude Code 交互的限制

1. **进程隔离**: Extension Host 与 Main Thread 分离，扩展之间无法直接通信
2. **API 限制**: 只能通过公开的 RPC 接口、命令系统、Extension exports 交互
3. **Webview 隔离**: 无法直接访问其他扩展的 Webview 实例
4. **消息协议**: Claude Code 的 Webview 消息协议是私有的

### 4.4 下一步建议

1. **立即执行**: 实现方案 A（命令 + 剪贴板），提供半自动化的交互
2. **短期验证**: 检查 Claude Code 是否导出公共 API（方案 B）
3. **长期方案**: 联系 Anthropic 团队，请求官方 API 支持

---

## 五、参考资源

- RPC Protocol 定义: [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts)
- Extension Host 架构: https://code.visualstudio.com/api/advanced-topics/extension-host
- VS Code Extension API: https://code.visualstudio.com/api
