# Claude Bridge 快速验证方案

**目标**: 创建一个对话框，与已安装的 Claude Code 扩展进行交互

**创建时间**: 2026-04-02

---

## 一、方案概述

### 核心思路

通过创建一个简单的 VS Code 扩展，使用 Webview Panel 作为对话框，通过 VS Code Extension API 与 Claude Code 扩展进行通信。

### 技术路径

```
用户输入 → Webview Panel → Extension Host → Claude Code Extension → 响应返回
```

---

## 二、已实现的 PoC 扩展

### 文件结构

```
extensions/claude-bridge-test/
├── package.json          # 扩展配置
├── tsconfig.json         # TypeScript 配置
└── src/
    └── extension.ts      # 主要实现代码
```

### 核心功能

1. **Webview 对话框**
   - 简洁的输入界面
   - 实时显示响应
   - 使用 VS Code 主题样式

2. **与 Claude Code 交互的三种方案**

   **方案 1: 命令调用**
   ```typescript
   await vscode.commands.executeCommand('claude-vscode.editor.open');
   await vscode.commands.executeCommand('claude-vscode.focus');
   ```
   - ✅ 可以打开 Claude Code 界面
   - ✅ 可以聚焦到输入框
   - ❌ 无法直接传递消息内容

   **方案 2: Extension API**
   ```typescript
   const claudeExtension = vscode.extensions.getExtension('anthropic.claude-code');
   await claudeExtension.activate();
   const api = claudeExtension.exports;
   ```
   - ✅ 可以获取扩展实例
   - ✅ 可以激活扩展
   - ⚠️ 需要检查 Claude Code 是否导出了公共 API

   **方案 3: Webview 消息传递**（待验证）
   - Claude Code 使用 Webview Panel 实现 UI
   - 理论上可以通过 Webview 消息机制进行通信
   - 需要研究 Claude Code 的内部消息协议

---

## 三、下一步验证计划

### 3.1 验证 Claude Code 的 API

**目标**: 确认 Claude Code 是否导出了公共 API

**步骤**:
1. 启动开发环境（F5）
2. 运行命令 "Open Claude Bridge Dialog"
3. 输入测试消息并点击发送
4. 查看输出区域，检查 `claudeExtension.exports` 的内容

**预期结果**:
- 如果有导出 API，会显示 API 的结构
- 如果没有导出，需要采用其他方案

### 3.2 研究 Claude Code 的内部通信机制

**方法 1: 分析源码**
```bash
# 查看 Claude Code 扩展的主文件
cat ~/.vscode/extensions/anthropic.claude-code-*/extension.js | head -100
```

**方法 2: 监听 Webview 消息**
- 使用 Chrome DevTools 连接到 Webview
- 监听 `postMessage` 事件
- 分析消息格式

**方法 3: 查看 package.json 的 contributes**
- 查看暴露的命令
- 查看配置项
- 查看 activation events

### 3.3 实现消息传递

**如果 Claude Code 有公共 API**:
```typescript
// 假设 API 结构
interface ClaudeCodeAPI {
  sendMessage(text: string): Promise<string>;
  onResponse(callback: (response: string) => void): void;
}

const api = claudeExtension.exports as ClaudeCodeAPI;
const response = await api.sendMessage(userInput);
```

**如果没有公共 API，使用 Webview 通信**:
```typescript
// 获取 Claude Code 的 Webview
const claudeWebview = // 需要找到获取方式
claudeWebview.postMessage({
  type: 'user-input',
  text: userInput
});
```

**如果以上都不行，使用剪贴板 + 命令组合**:
```typescript
// 1. 将消息复制到剪贴板
await vscode.env.clipboard.writeText(userInput);

// 2. 打开 Claude Code
await vscode.commands.executeCommand('claude-vscode.editor.open');

// 3. 聚焦输入框
await vscode.commands.executeCommand('claude-vscode.focus');

// 4. 模拟粘贴（需要用户手动 Cmd+V）
// 或者使用 workbench.action.terminal.paste 命令
```

---

## 四、技术难点与解决思路

### 难点 1: Claude Code 可能不导出公共 API

**原因**: Claude Code 是商业产品，可能不希望被其他扩展直接调用

**解决思路**:
1. 查看 Claude Code 的文档，看是否有官方的集成方式
2. 使用 MCP (Model Context Protocol) 协议（如果 Claude Code 支持）
3. 通过 Webview 消息传递（需要逆向工程）
4. 使用剪贴板 + 命令组合（用户体验较差）

### 难点 2: 获取 Claude Code 的响应

**原因**: Claude Code 的响应是流式的，且显示在自己的 Webview 中

**解决思路**:
1. 如果有 API，使用回调函数监听响应
2. 如果没有 API，监听 Webview 的 `postMessage` 事件
3. 使用 VS Code 的 Output Channel 作为中转（如果 Claude Code 支持）

### 难点 3: 保持对话上下文

**原因**: 每次调用可能是独立的，无法保持上下文

**解决思路**:
1. 在我们的扩展中维护对话历史
2. 每次调用时，将历史上下文一起发送给 Claude Code
3. 使用 Claude Code 的 Session 机制（如果支持）

---

## 五、替代方案：基于 MCP 的实现

如果 Claude Code 支持 MCP 协议，我们可以：

### 5.1 作为 MCP 客户端

```typescript
// 连接到 Claude Code 的 MCP 服务器
const mcpClient = new MCPClient({
  command: 'claude-code',
  args: ['--mcp']
});

await mcpClient.start();

// 调用 Claude Code 的 Tool
const result = await mcpClient.callTool({
  name: 'chat',
  arguments: { message: userInput }
});
```

### 5.2 作为 MCP 服务器

```typescript
// 我们的扩展作为 MCP 服务器
// Claude Code 可以调用我们的 Tools
const mcpServer = new MCPServer();

mcpServer.registerTool({
  name: 'show-dialog',
  description: 'Show a dialog to the user',
  handler: async (args) => {
    // 显示对话框
    return { success: true };
  }
});
```

---

## 六、测试步骤

### 6.1 编译扩展

```bash
cd extensions/claude-bridge-test
npm install
npm run compile
```

### 6.2 启动开发环境

1. 在 VS Code 中打开 `humancode` 项目
2. 按 F5 启动 Extension Development Host
3. 在新窗口中，按 Cmd+Shift+P
4. 运行命令 "Open Claude Bridge Dialog"

### 6.3 测试交互

1. 在对话框中输入测试消息
2. 点击 "发送到 Claude Code"
3. 观察输出区域的响应
4. 检查 Claude Code 是否被激活
5. 查看 Developer Tools 的 Console 日志

---

## 七、成功标准

### 最小可行方案（MVP）

- ✅ 对话框可以正常显示
- ✅ 可以检测到 Claude Code 扩展
- ✅ 可以激活 Claude Code 扩展
- ⏳ 可以将消息传递给 Claude Code
- ⏳ 可以接收 Claude Code 的响应

### 理想方案

- ✅ 所有 MVP 功能
- ⏳ 支持流式响应
- ⏳ 保持对话上下文
- ⏳ 支持取消操作
- ⏳ 良好的错误处理

---

## 八、关键发现（待更新）

### Claude Code Extension API

```typescript
// 运行测试后，在这里记录发现的 API 结构
// 例如：
// claudeExtension.exports = {
//   sendMessage: (text: string) => Promise<string>,
//   ...
// }
```

### Claude Code 命令列表

从 package.json 中发现的命令：
- `claude-vscode.editor.open` - 在新标签页打开
- `claude-vscode.editor.openLast` - 打开上次的会话
- `claude-vscode.sidebar.open` - 在侧边栏打开
- `claude-vscode.focus` - 聚焦输入框
- `claude-vscode.blur` - 失焦输入框
- `claude-vscode.newConversation` - 新建对话

### 可能的集成点

1. **命令组合**: 使用多个命令的组合来实现交互
2. **配置项**: 通过修改 Claude Code 的配置来影响行为
3. **Webview 通信**: 如果能获取到 Webview 实例，可以直接通信
4. **MCP 协议**: 如果 Claude Code 支持 MCP，这是最标准的方式

---

## 九、后续工作

1. **立即执行**: 运行测试，验证 Claude Code 的 API
2. **短期目标**: 实现基本的消息传递
3. **中期目标**: 实现流式响应和上下文管理
4. **长期目标**: 与 AI Interop Bus 集成，实现多 AI 协作

---

## 十、相关资源

- Claude Code 扩展路径: `~/.vscode/extensions/anthropic.claude-code-2.1.89-darwin-x64/`
- 扩展 ID: `anthropic.claude-code`
- 测试扩展路径: `extensions/claude-bridge-test/`
- MCP 协议文档: https://modelcontextprotocol.io/

---

**下一步行动**: 启动开发环境，运行测试，验证 Claude Code 的 API 结构。
