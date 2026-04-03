# Claude Code Command Adapter - 实施说明

## 概述

这是一个**零侵入式适配器**，将 Claude Code 扩展包装为 AI Interop Endpoint，无需修改 Claude Code 的任何代码。

## 工作原理

```
用户请求 → AI Interop Bus → Claude Code Adapter
                                    ↓
                            1. 复制输入到剪贴板
                                    ↓
                            2. 打开 Claude Code UI
                                    ↓
                            3. 聚焦输入框
                                    ↓
                            4. 提示用户粘贴
                                    ↓
                            用户在 Claude Code 中查看结果
```

## 当前限制

### 限制 1: 需要手动粘贴
- **原因**: Claude Code 不导出公共 API
- **影响**: 用户需要手动按 Cmd+V 粘贴输入
- **改进方向**: 研究自动粘贴机制

### 限制 2: 无法自动获取输出
- **原因**: 无法访问 Claude Code 的 Webview 内容
- **影响**: 用户需要手动查看 Claude Code 的响应
- **改进方向**: 实现 Webview 监听机制

## 使用方式

### 1. 注册 Adapter

在 [extensionHost.contribution.ts](../../../api/browser/extensionHost.contribution.ts) 中初始化：

```typescript
import { ClaudeCodeCommandAdapter } from 'vs/workbench/services/aiInterop/browser/adapters/claudeCodeCommandAdapter';

// 在 Workbench 启动时创建 Adapter
const claudeCodeAdapter = instantiationService.createInstance(ClaudeCodeCommandAdapter);
```

### 2. 通过 AI Interop Bus 调用

```typescript
// 获取 AI Interop Bus
const aiInteropBus = accessor.get(IAIInteropBusService);

// 调用 Claude Code
const invocation = await aiInteropBus.invoke({
    targetEndpointId: 'claude-code.command-adapter',
    input: '请帮我实现一个登录页面',
    sessionId: 'my-session',
    metadata: {}
});

// 监听响应
invocation.onDidReceiveChunk(chunk => {
    console.log('Received:', chunk.content);
});
```

### 3. 用户工作流

1. 用户通过 HumanCode IDE 发起请求
2. IDE 将请求路由到 Claude Code Adapter
3. Adapter 打开 Claude Code 并提示用户粘贴
4. 用户在 Claude Code 中粘贴并查看响应
5. 用户可以手动将结果复制回 IDE（如需要）

## 改进路线图

### 阶段 1: 当前实现（本周）
- ✅ 基于命令的输入传递
- ✅ 剪贴板集成
- ✅ 注册为 AI Interop Endpoint

### 阶段 2: 自动粘贴（下周）
- ⏳ 研究 VS Code 的自动粘贴机制
- ⏳ 实现自动粘贴功能
- ⏳ 减少用户手动操作

### 阶段 3: 输出监听（下下周）
- ⏳ 研究 Webview 访问机制
- ⏳ 实现输出监听
- ⏳ 自动获取 Claude Code 的响应

### 阶段 4: 流式响应（未来）
- ⏳ 实现实时输出监听
- ⏳ 支持流式 chunk 传输
- ⏳ 完整的双向通信

## 技术细节

### 依赖的服务

- `IAIInteropBusService`: AI Interop 总线
- `ICommandService`: 执行 VS Code 命令
- `IClipboardService`: 剪贴板操作
- `ILogService`: 日志记录

### 关键命令

- `claude-vscode.editor.open`: 打开 Claude Code
- `claude-vscode.focus`: 聚焦输入框
- `vscode.getCommands`: 检测扩展是否已安装

### 错误处理

- 扩展未安装：静默失败，记录警告日志
- 命令执行失败：调用 `request.fail()` 通知调用方
- 取消操作：通过 `CancellationToken` 支持

## 与其他 Adapter 的对比

| Adapter | 目标扩展 | 输入方式 | 输出方式 | 自动化程度 |
|---------|---------|---------|---------|-----------|
| **Claude Code Command** | Claude Code | 剪贴板 | 手动查看 | 半自动 |
| MCP Adapter | Codex, Claude Code | MCP 协议 | MCP 协议 | 全自动 |
| Chat Participant | Copilot | vscode.chat API | vscode.chat API | 全自动 |
| Language Model | Copilot | vscode.lm API | vscode.lm API | 全自动 |

## 测试方法

### 1. 单元测试

```typescript
// TODO: 添加单元测试
suite('ClaudeCodeCommandAdapter', () => {
    test('should register endpoint', async () => {
        // ...
    });
    
    test('should handle invocation', async () => {
        // ...
    });
});
```

### 2. 集成测试

使用 [test-ai-interop-controller](../../../../extensions/test-ai-interop-controller/) 扩展测试：

```typescript
// 调用 Claude Code Adapter
const result = await vscode.commands.executeCommand(
    'test-ai-interop.invoke',
    'claude-code.command-adapter',
    'Hello Claude Code!'
);
```

### 3. 手动测试

1. 启动 Extension Development Host
2. 打开命令面板
3. 运行测试命令
4. 验证 Claude Code 是否正确打开
5. 验证剪贴板内容是否正确

## 常见问题

### Q: 为什么不直接使用 Claude API？
A: 我们的目标是将**现有的 Claude Code 扩展**作为黑盒工具使用，而不是绕过它直接调用 API。这样可以：
- 利用 Claude Code 的现有功能和 UI
- 保持与用户已安装扩展的一致性
- 验证零侵入式适配器架构的可行性

### Q: 为什么需要手动粘贴？
A: 因为 Claude Code 不导出公共 API，我们无法直接向其发送输入。剪贴板是目前最可靠的方式。

### Q: 如何获取 Claude Code 的输出？
A: 当前版本无法自动获取。未来可以通过：
- Webview 内容监听
- DOM Mutation Observer
- 拦截 postMessage

### Q: 这个 Adapter 的性能如何？
A: 由于涉及 UI 操作和用户交互，性能不如直接 API 调用。但作为 PoC 验证零侵入式架构是足够的。

## 参考资源

- [AI Interop 核心架构](../../../../docs/ai-interop/02-core-architecture.md)
- [零侵入式适配器架构](../../../../docs/ai-interop/13-zero-intrusion-adapter-architecture.md)
- [扩展 API 清单](../../../../docs/quick-validation/extension-api-complete-inventory.md)
- [Claude Code 交互方案](../../../../docs/quick-validation/claude-code-interaction-solution.md)
