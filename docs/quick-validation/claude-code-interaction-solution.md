# Claude Code 交互方案 - 基于测试结果的技术设计

**文档版本**: v2.0  
**创建时间**: 2026-04-02  
**测试结果**: Claude Code 扩展不导出公共 API (exports = undefined)

---

## 一、测试结果分析

### 1.1 关键发现

```typescript
const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');
// ✅ 扩展可以被找到
// ✅ 扩展可以被激活
// ❌ exports = undefined (没有导出公共 API)
```

**结论**: Claude Code 不提供公共 API，所有交互必须通过其他方式实现。

### 1.2 可用的交互方式

| 方式 | 可行性 | 实现难度 | 推荐度 |
|------|--------|----------|--------|
| 命令调用 | ✅ 已验证 | 低 | ⭐⭐⭐ |
| Webview 消息拦截 | ⚠️ 理论可行 | 高 | ⭐⭐ |
| 剪贴板 + 自动化 | ✅ 可行 | 中 | ⭐⭐⭐⭐ |
| MCP 协议 | ⚠️ 待验证 | 中 | ⭐⭐⭐⭐⭐ |

---

## 二、推荐方案：剪贴板 + 命令自动化

### 2.1 方案概述

由于 Claude Code 没有公共 API，我们采用"间接交互"的方式：

```
用户输入 → 我们的对话框
    ↓
复制到剪贴板
    ↓
打开 Claude Code (命令)
    ↓
聚焦输入框 (命令)
    ↓
模拟粘贴 (workbench.action.terminal.paste 或用户手动)
    ↓
Claude Code 处理
```

### 2.2 实现代码

```typescript
async function sendToClaudeCode(text: string): Promise<void> {
    try {
        // 1. 将消息复制到剪贴板
        await vscode.env.clipboard.writeText(text);
        
        // 2. 打开 Claude Code
        await vscode.commands.executeCommand('claude-vscode.editor.open');
        
        // 等待 Claude Code 初始化
        await new Promise(resolve => setTimeout(resolve, 500));
        
        // 3. 聚焦输入框
        await vscode.commands.executeCommand('claude-vscode.focus');
        
        // 4. 提示用户粘贴
        vscode.window.showInformationMessage(
            '消息已复制到剪贴板，请在 Claude Code 中按 Cmd+V 粘贴',
            '已粘贴'
        );
        
        // 或者尝试自动粘贴（可能需要权限）
        // await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
        
    } catch (error) {
        vscode.window.showErrorMessage(`发送失败: ${error}`);
    }
}
```

### 2.3 优化：自动粘贴

**方法 1: 使用 VS Code 的粘贴命令**
```typescript
// 尝试自动粘贴
await vscode.commands.executeCommand('editor.action.clipboardPasteAction');
```

**方法 2: 使用 Webview 注入**（高级）
```typescript
// 如果能获取到 Claude Code 的 Webview，可以直接注入文本
// 但这需要访问内部 API
```

---

## 三、终极方案：MCP 协议集成

### 3.1 为什么 MCP 是最佳方案

根据 [主流 AI IDE 扩展研究报告](../ai-interop/14-mainstream-ai-extensions-research-report.md)：

- Claude Code 支持 MCP (Model Context Protocol)
- MCP 是 Anthropic 官方推荐的 AI 工具集成协议
- 通过 MCP，我们可以将自己注册为 Claude Code 的工具

### 3.2 MCP 集成架构

```
┌─────────────────────────────────────────────────────────┐
│                  我们的 IDE 扩展                         │
│  - 实现 MCP Server                                       │
│  - 暴露 "send_to_dialog" 工具                           │
└─────────────────────────────────────────────────────────┘
                          ↕ MCP Protocol (STDIO)
┌─────────────────────────────────────────────────────────┐
│                  Claude Code 扩展                        │
│  - 作为 MCP Client                                       │
│  - 调用我们的工具                                        │
└─────────────────────────────────────────────────────────┘
```

### 3.3 MCP Server 实现

**步骤 1: 创建 MCP Server**

```typescript
// src/mcpServer.ts
import { MCPServer, MCPTool } from './mcp';

export class OurMCPServer {
    private server: MCPServer;
    
    constructor() {
        this.server = new MCPServer({
            name: 'humancode-bridge',
            version: '1.0.0'
        });
        
        // 注册工具
        this.server.registerTool({
            name: 'show_dialog',
            description: 'Show a dialog to the user with a message',
            inputSchema: {
                type: 'object',
                properties: {
                    message: {
                        type: 'string',
                        description: 'The message to show'
                    }
                },
                required: ['message']
            },
            handler: async (args) => {
                // 显示我们的对话框
                return this.showDialog(args.message);
            }
        });
    }
    
    async start(): Promise<void> {
        // 启动 MCP Server (STDIO)
        await this.server.listen();
    }
    
    private async showDialog(message: string): Promise<any> {
        // 显示对话框并返回结果
        const panel = vscode.window.createWebviewPanel(
            'ourDialog',
            'Message from Claude Code',
            vscode.ViewColumn.One,
            { enableScripts: true }
        );
        
        panel.webview.html = `
            <html>
                <body>
                    <h1>Message from Claude Code</h1>
                    <p>${message}</p>
                </body>
            </html>
        `;
        
        return {
            content: [
                {
                    type: 'text',
                    text: 'Dialog shown successfully'
                }
            ]
        };
    }
}
```

**步骤 2: 配置 Claude Code 连接到我们的 MCP Server**

在 Claude Code 的配置中添加：

```json
{
    "claudeCode.mcpServers": [
        {
            "name": "humancode-bridge",
            "command": "node",
            "args": ["/path/to/our/mcp-server.js"]
        }
    ]
}
```

### 3.4 MCP 方案的优势

1. **官方支持**: MCP 是 Anthropic 官方协议
2. **双向通信**: Claude Code 可以主动调用我们的工具
3. **标准化**: 遵循标准协议，稳定性高
4. **扩展性**: 可以注册多个工具，实现复杂交互

---

## 四、实施路线图

### 阶段 1: 快速验证（今天）

**目标**: 实现基于剪贴板的基础交互

**任务**:
1. ✅ 完善 [claude-bridge-test](../../extensions/claude-bridge-test/) 扩展
2. ✅ 实现剪贴板 + 命令自动化
3. ✅ 测试用户体验

**预期结果**: 用户可以通过我们的对话框向 Claude Code 发送消息（需要手动粘贴）

### 阶段 2: MCP 集成（本周）

**目标**: 实现基于 MCP 的双向通信

**任务**:
1. ⏳ 研究 Claude Code 的 MCP 配置
2. ⏳ 实现 MCP Server
3. ⏳ 注册 "show_dialog" 工具
4. ⏳ 测试 Claude Code 调用我们的工具

**预期结果**: Claude Code 可以主动调用我们的对话框

### 阶段 3: 完整集成（下周）

**目标**: 实现完整的双向通信和流式响应

**任务**:
1. ⏳ 实现流式响应处理
2. ⏳ 实现上下文管理
3. ⏳ 集成到 AI Interop Bus
4. ⏳ 实现多 AI 协作

**预期结果**: 完整的多 AI 协作平台

---

## 五、技术细节

### 5.1 如何获取 Claude Code 的响应？

**问题**: 即使我们能发送消息给 Claude Code，如何获取它的响应？

**方案 1: MCP 工具调用**
- Claude Code 在响应中调用我们的 MCP 工具
- 我们在工具中接收响应内容

**方案 2: Webview 监听**（高级）
- 监听 Claude Code Webview 的 DOM 变化
- 提取响应内容
- 需要访问内部 API

**方案 3: 输出通道监听**
- 如果 Claude Code 输出到 Output Channel
- 我们可以监听该通道
- 需要验证 Claude Code 是否有输出通道

### 5.2 MCP 协议详解

**MCP 消息格式** (JSON-RPC 2.0):

```json
// 请求
{
    "jsonrpc": "2.0",
    "id": 1,
    "method": "tools/call",
    "params": {
        "name": "show_dialog",
        "arguments": {
            "message": "Hello from Claude Code!"
        }
    }
}

// 响应
{
    "jsonrpc": "2.0",
    "id": 1,
    "result": {
        "content": [
            {
                "type": "text",
                "text": "Dialog shown successfully"
            }
        ]
    }
}
```

**MCP Server 生命周期**:

1. **初始化**: Claude Code 启动我们的 MCP Server 进程
2. **工具列表**: Claude Code 请求 `tools/list`
3. **工具调用**: Claude Code 调用 `tools/call`
4. **关闭**: Claude Code 关闭时终止我们的进程

---

## 六、代码示例

### 6.1 完整的 MCP Server 实现

```typescript
// mcp-server.ts
import { spawn } from 'child_process';

interface MCPRequest {
    jsonrpc: '2.0';
    id: string | number;
    method: string;
    params?: any;
}

interface MCPResponse {
    jsonrpc: '2.0';
    id: string | number;
    result?: any;
    error?: {
        code: number;
        message: string;
    };
}

class MCPServer {
    private requestId = 0;
    
    constructor() {
        // 监听 stdin
        process.stdin.on('data', (data) => {
            this.handleRequest(data.toString());
        });
    }
    
    private handleRequest(data: string): void {
        const lines = data.split('\n').filter(line => line.trim());
        
        for (const line of lines) {
            try {
                const request: MCPRequest = JSON.parse(line);
                this.processRequest(request);
            } catch (error) {
                console.error('Failed to parse request:', error);
            }
        }
    }
    
    private async processRequest(request: MCPRequest): Promise<void> {
        switch (request.method) {
            case 'tools/list':
                this.sendResponse(request.id, {
                    tools: [
                        {
                            name: 'show_dialog',
                            description: 'Show a dialog to the user',
                            inputSchema: {
                                type: 'object',
                                properties: {
                                    message: { type: 'string' }
                                },
                                required: ['message']
                            }
                        }
                    ]
                });
                break;
                
            case 'tools/call':
                const { name, arguments: args } = request.params;
                if (name === 'show_dialog') {
                    // 显示对话框
                    const result = await this.showDialog(args.message);
                    this.sendResponse(request.id, result);
                }
                break;
        }
    }
    
    private sendResponse(id: string | number, result: any): void {
        const response: MCPResponse = {
            jsonrpc: '2.0',
            id,
            result
        };
        
        // 输出到 stdout
        process.stdout.write(JSON.stringify(response) + '\n');
    }
    
    private async showDialog(message: string): Promise<any> {
        // 这里需要与 VS Code 扩展通信
        // 可以通过 IPC、文件、或其他方式
        
        return {
            content: [
                {
                    type: 'text',
                    text: `Dialog shown: ${message}`
                }
            ]
        };
    }
}

// 启动 MCP Server
new MCPServer();
```

### 6.2 VS Code 扩展集成

```typescript
// extension.ts
import { spawn } from 'child_process';

export function activate(context: vscode.ExtensionContext) {
    // 启动 MCP Server
    const mcpServerPath = path.join(context.extensionPath, 'out', 'mcp-server.js');
    const mcpProcess = spawn('node', [mcpServerPath]);
    
    // 监听 MCP Server 的输出
    mcpProcess.stdout.on('data', (data) => {
        console.log('[MCP Server]', data.toString());
    });
    
    // 清理
    context.subscriptions.push({
        dispose: () => {
            mcpProcess.kill();
        }
    });
}
```

---

## 七、下一步行动

### 立即执行（今天）

1. **完善剪贴板方案**
   - 更新 [claude-bridge-test](../../extensions/claude-bridge-test/) 扩展
   - 实现自动粘贴（如果可能）
   - 测试用户体验

2. **研究 Claude Code 的 MCP 配置**
   - 查看 Claude Code 的文档
   - 查看 `~/.claude/settings.json`
   - 确认 MCP Server 配置方式

### 短期目标（本周）

3. **实现 MCP Server**
   - 创建独立的 MCP Server 进程
   - 实现 `tools/list` 和 `tools/call`
   - 测试与 Claude Code 的连接

4. **实现双向通信**
   - MCP Server 与 VS Code 扩展的 IPC 通信
   - 显示对话框
   - 接收用户输入

### 中期目标（下周）

5. **集成到 AI Interop Bus**
   - 将 Claude Code 包装为 AI Interop Endpoint
   - 实现流式响应
   - 实现多 AI 协作

---

## 八、参考资源

- MCP 协议文档: https://modelcontextprotocol.io/
- Claude Code 文档: https://code.claude.com/docs
- VS Code Extension API: https://code.visualstudio.com/api
- 测试扩展: [extensions/claude-bridge-test/](../../extensions/claude-bridge-test/)
