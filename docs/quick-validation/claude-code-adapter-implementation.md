# Claude Code Adapter 实现方案

**目标**: 将 Claude Code 扩展包装为 AI Interop Endpoint，实现零侵入式接入

---

## 一、技术方案

### 方案 A: 基于命令 + Webview 监听（推荐）

**核心思路**: 
1. 使用命令打开 Claude Code 并聚焦输入框
2. 使用剪贴板传递输入内容
3. 监听 Claude Code Webview 的输出变化

```typescript
class ClaudeCodeAdapter {
    async invoke(request: IAIInteropInvocationRequest): Promise<void> {
        // 1. 将输入复制到剪贴板
        await vscode.env.clipboard.writeText(request.input);
        
        // 2. 打开 Claude Code
        await vscode.commands.executeCommand('claude-vscode.editor.open');
        await delay(500);
        
        // 3. 聚焦输入框
        await vscode.commands.executeCommand('claude-vscode.focus');
        
        // 4. 提示用户粘贴（或尝试自动粘贴）
        await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        
        // 5. 监听输出（需要实现 Webview 监听机制）
        const output = await this.waitForClaudeCodeOutput();
        
        // 6. 返回结果
        await request.acceptChunk({ seq: 0, content: output });
        await request.complete();
    }
}
```

**优点**: 
- 不依赖 Claude Code 的内部 API
- 可以获取输出内容

**缺点**: 
- 需要实现 Webview 监听（技术难度中等）
- 用户体验可能需要手动粘贴

### 方案 B: 基于 MCP 协议（长期方案）

**核心思路**: 
1. 我们实现 MCP Server
2. 配置 Claude Code 连接到我们的 MCP Server
3. Claude Code 调用我们的工具时，我们反向获取其输出

```typescript
// 我们的 MCP Server
class HumanCodeMCPServer {
    registerTool({
        name: 'report_result',
        description: 'Report task completion result to HumanCode IDE',
        handler: async (args) => {
            // Claude Code 完成任务后调用此工具
            // 我们在这里获取结果
            this.onClaudeCodeResult(args.result);
        }
    });
}
```

**优点**: 
- 官方支持的协议
- 双向通信
- 稳定性高

**缺点**: 
- 需要用户配置 Claude Code
- 实现复杂度较高

---

## 二、推荐实施路径

### 阶段 1: 命令调用 + 剪贴板（本周）

**目标**: 实现基础的输入传递

**实现**:
```typescript
// src/vs/workbench/services/aiInterop/browser/adapters/claudeCodeAdapter.ts
export class ClaudeCodeAdapter {
    constructor(
        @ICommandService private commandService: ICommandService,
        @IClipboardService private clipboardService: IClipboardService
    ) {}
    
    async sendInput(text: string): Promise<void> {
        // 复制到剪贴板
        await this.clipboardService.writeText(text);
        
        // 打开 Claude Code
        await this.commandService.executeCommand('claude-vscode.editor.open');
        
        // 聚焦输入框
        await this.commandService.executeCommand('claude-vscode.focus');
        
        // 提示用户粘贴
        // TODO: 尝试自动粘贴
    }
}
```

### 阶段 2: Webview 输出监听（下周）

**目标**: 获取 Claude Code 的输出

**技术方案**:
1. 获取 Claude Code 的 Webview Panel 实例
2. 注入监听脚本
3. 监听 DOM 变化或消息事件

```typescript
// 伪代码
class ClaudeCodeOutputMonitor {
    async monitorOutput(): Promise<string> {
        // 1. 获取 Claude Code 的 Webview
        const webview = this.findClaudeCodeWebview();
        
        // 2. 注入监听脚本
        await webview.postMessage({
            type: 'inject-monitor',
            script: `
                // 监听 DOM 变化
                const observer = new MutationObserver((mutations) => {
                    // 检测到新的输出
                    const output = extractOutput();
                    vscode.postMessage({ type: 'output', content: output });
                });
                observer.observe(document.body, { childList: true, subtree: true });
            `
        });
        
        // 3. 等待输出
        return new Promise((resolve) => {
            webview.onDidReceiveMessage((msg) => {
                if (msg.type === 'output') {
                    resolve(msg.content);
                }
            });
        });
    }
}
```

### 阶段 3: 集成到 AI Interop Bus（下下周）

**目标**: 将 Claude Code 注册为 Endpoint

```typescript
// 注册 Claude Code Endpoint
aiInteropBus.registerEndpoint(
    {
        endpointId: 'claude-code',
        extensionId: 'anthropic.claude-code',
        displayName: 'Claude Code',
        capabilities: ['code-generation', 'chat'],
        hostKind: 'local'
    },
    async (request, token) => {
        const adapter = new ClaudeCodeAdapter();
        await adapter.sendInput(request.input);
        const output = await adapter.waitForOutput();
        await request.acceptChunk({ seq: 0, content: output });
        await request.complete();
    }
);
```

---

## 三、关键技术点

### 3.1 如何获取 Claude Code 的 Webview？

**方法 1: 通过 Extension Service**
```typescript
const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');
// 需要访问扩展的内部状态来获取 Webview 实例
// 这可能需要反射或内部 API
```

**方法 2: 通过 Webview Panel Registry**
```typescript
// VS Code 内部维护了所有 Webview Panel 的注册表
// 需要访问内部 API: IWebviewService
const webviewService = accessor.get(IWebviewService);
const panels = webviewService.getAllWebviewPanels();
const claudePanel = panels.find(p => p.viewType === 'claudeVSCodePanel');
```

### 3.2 如何监听 Webview 输出？

**方法 1: DOM Mutation Observer**
```javascript
// 在 Webview 中注入
const observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
        if (mutation.addedNodes.length > 0) {
            // 检测到新内容
            const newContent = extractNewContent(mutation.addedNodes);
            if (newContent) {
                vscode.postMessage({ type: 'new-output', content: newContent });
            }
        }
    }
});
observer.observe(document.querySelector('.output-container'), {
    childList: true,
    subtree: true
});
```

**方法 2: 拦截 postMessage**
```javascript
// 拦截 Webview 的 postMessage
const originalPostMessage = window.postMessage;
window.postMessage = function(message, ...args) {
    // 记录所有消息
    console.log('[Intercepted]', message);
    return originalPostMessage.call(this, message, ...args);
};
```

---

## 四、实现优先级

| 任务 | 优先级 | 预计工时 | 依赖 |
|------|--------|----------|------|
| 命令调用 + 剪贴板 | P0 | 1天 | 无 |
| 自动粘贴 | P1 | 0.5天 | 命令调用 |
| Webview 实例获取 | P0 | 2天 | 无 |
| 输出监听 | P0 | 2天 | Webview 实例 |
| 集成到 AI Interop Bus | P0 | 1天 | 输出监听 |
| MCP 协议支持 | P2 | 5天 | 无 |

---

## 五、下一步行动

1. **立即执行**: 实现命令调用 + 剪贴板方案
2. **短期目标**: 研究如何获取 Claude Code 的 Webview 实例
3. **中期目标**: 实现输出监听
4. **长期目标**: 完善 MCP 协议支持

---

## 六、风险与应对

### 风险 1: 无法获取 Webview 实例

**应对**: 
- 使用反射或内部 API
- 如果完全无法获取，考虑使用屏幕截图 + OCR（最后手段）

### 风险 2: 输出监听不稳定

**应对**:
- 实现多种监听策略（DOM、postMessage、事件）
- 添加重试机制
- 提供手动确认选项

### 风险 3: 用户体验问题

**应对**:
- 提供清晰的状态提示
- 支持手动干预
- 记录详细日志便于调试
