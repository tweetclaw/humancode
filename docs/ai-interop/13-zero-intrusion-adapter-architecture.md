# AI Interop 零侵入式适配器架构设计

**文档版本**: v1.0  
**创建日期**: 2026-04-02  
**状态**: 设计中

---

## 一、问题陈述

### 1.1 核心问题

当前 AI Interop 平台设计要求 AI 扩展必须主动适配 `vscode.proposed.aiInterop` API 才能互相通讯。这导致：

1. **无法兼容现有 AI 扩展**：GitHub Copilot、Lingma 等现有 AI 扩展无法直接使用
2. **生态割裂**：需要所有 AI 扩展重新开发，形成新的生态孤岛
3. **用户价值受限**：用户无法利用已安装的 AI 扩展进行协作

### 1.2 根本矛盾

**我们不能要求第三方 AI 扩展遵循我们的标准**。GitHub Copilot、Lingma 等扩展由其他公司开发维护，不可能为了适配 HumanCode 而重写代码。

### 1.3 设计目标

设计一个**零侵入式适配层**，使得：
- 现有 AI 扩展无需修改任何代码即可接入 AI Interop Bus
- 平台自动发现和包装现有 AI 能力
- 支持双向桥接：现有扩展 ↔ AI Interop Bus
- 渐进增强：扩展可选择主动适配以获得更好的功能

---

## 二、架构设计

### 2.1 整体架构

```
┌─────────────────────────────────────────────────────────────┐
│                    用户 / HumanCode IDE                      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              AI Interop Bus (平台协作中枢)                   │
│  - Endpoint Registry                                        │
│  - Invocation Router                                        │
│  - Session Broker                                           │
│  - Permission & Policy                                      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│           Zero-Intrusion Adapter Layer (新增)               │
│  ┌──────────────┬──────────────┬──────────────┐            │
│  │ Chat         │ Language     │ Command      │            │
│  │ Participant  │ Model API    │ Adapter      │            │
│  │ Adapter      │ Adapter      │              │            │
│  └──────────────┴──────────────┴──────────────┘            │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│              VS Code 标准 API (不修改)                       │
│  - vscode.chat API                                          │
│  - vscode.lm API (Language Model)                           │
│  - vscode.commands API                                      │
└─────────────────────────────────────────────────────────────┘
                              ↕
┌─────────────────────────────────────────────────────────────┐
│         现有 AI 扩展 (无需修改)                              │
│  - GitHub Copilot                                           │
│  - Lingma                                                   │
│  - 其他 AI 扩展                                             │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 核心理念

**Adapter Layer 从"可选兼容层"升级为"核心桥接层"**：

| 维度 | 原设计 | 新设计 |
|------|--------|--------|
| **定位** | 可选的兼容层 | 核心的桥接层 |
| **职责** | 为少数扩展提供降级支持 | 为所有现有扩展提供零侵入接入 |
| **实现方式** | 扩展主动 opt-in | 平台自动发现和包装 |
| **优先级** | Phase 2 可选功能 | Phase 1 核心功能 |

---

## 三、适配器设计

### 优先级调整（基于市场研究）

根据 [主流 AI IDE 扩展研究报告](14-mainstream-ai-extensions-research-report.md)，2026 年的市场格局已经明确：

| 优先级 | 适配器 | 目标扩展 | 市场份额 | 技术 |
|-------|--------|---------|---------|------|
| **P0** | **MCP Adapter** | **Codex, Claude Code** | **60%+** | **MCP Protocol** |
| P2 | Chat Participant Adapter | GitHub Copilot | < 20% | vscode.chat API |
| P2 | Language Model Adapter | GitHub Copilot | < 20% | vscode.lm API |
| P3 | Command Adapter | 其他 | < 5% | vscode.commands API |

**关键发现**：
- Codex 和 Claude Code 是 2026 年的真正主流（市场份额 60%+）
- 它们都使用 MCP (Model Context Protocol)，不是简单的 Chat API
- GitHub Copilot 这类对话式 AI 已经过时（市场份额 < 20%）

**结论**：MCP Adapter 是最高优先级，必须优先实现。

### 3.0 MCP Adapter (P0 - 最高优先级)

#### 3.0.1 适配目标

使用 MCP (Model Context Protocol) 的 AI 扩展：
- **Codex (OpenAI)** - 主流 agentic AI 系统
- **Claude Code (Anthropic)** - 主流 agentic AI 系统
- 其他支持 MCP 的 AI 扩展

#### 3.0.2 工作原理

```typescript
// 平台层作为 MCP 客户端，连接 MCP 服务器
class MCPAdapter {
  constructor(
    @IAIInteropBusService private aiInteropBus: IAIInteropBusService,
    @IConfigurationService private configService: IConfigurationService
  ) {
    // 读取 MCP 服务器配置
    // 启动 MCP 客户端
    // 自动包装 MCP Tools 为 AI Interop Endpoints
  }

  private async startMCPServer(config: MCPServerConfig) {
    // 启动 MCP 服务器（通过 STDIO）
    const client = new MCPClient(config);
    await client.start();
    
    // 获取所有 Tools
    const tools = await client.listTools();
    
    // 为每个 Tool 创建 AI Interop Endpoint
    for (const tool of tools) {
      this.wrapMCPTool(client, tool);
    }
  }

  private wrapMCPTool(client: MCPClient, tool: MCPTool) {
    const endpoint: IAIInteropEndpointDescriptor = {
      endpointId: `mcp.${tool.name}`,
      displayName: tool.name,
      description: tool.description,
      capabilities: ['tool-calling'],
      
      // 关键：这是平台自动生成的 handler
      handler: async (request: IAIInteropInvocationRequest, token: CancellationToken) => {
        // 将 AI Interop 请求转换为 MCP Tool Call
        const toolCall = this.convertToMCPToolCall(tool, request);
        
        // 调用 MCP Tool
        const result = await client.callTool(toolCall, token);
        
        // 转换并返回结果
        await request.acceptChunk({
          seq: 0,
          content: this.convertMCPResultToContent(result),
          metadata: {}
        });
        
        await request.complete();
      }
    };
    
    // 注册到 AI Interop Bus
    this.aiInteropBus.registerEndpoint(endpoint);
  }
}
```

#### 3.0.3 关键特性

1. **自动发现**：读取配置文件，自动启动 MCP 服务器
2. **零侵入**：MCP 服务器无需修改任何代码
3. **协议转换**：AI Interop ↔ MCP 双向转换
4. **流式支持**：支持 MCP 的流式输出（如果有）
5. **Cancel 支持**：CancellationToken 正确传递
6. **工具调用**：完整支持 MCP Tools

#### 3.0.4 配置示例

用户在 `settings.json` 中配置 MCP 服务器：

```json
{
  "aiInterop.mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/workspace"]
    },
    {
      "name": "github",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-github"],
      "env": {
        "GITHUB_TOKEN": "ghp_xxxxxxxxxxxx"
      }
    }
  ]
}
```

#### 3.0.5 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/mcpAdapter.ts`
- `src/vs/workbench/services/aiInterop/browser/adapters/mcpClient.ts`
- `src/vs/workbench/services/aiInterop/browser/adapters/mcpTypes.ts`

#### 3.0.6 详细设计

参见 [TASK-P1-014.md](../tasks/poc1/TASK-P1-014.md)

---

### 3.1 Chat Participant Adapter (P2 - 降级)

#### 3.1.1 适配目标

现有使用 `vscode.chat` API 的 AI 扩展：
- GitHub Copilot Chat
- 其他 Chat 扩展

#### 3.1.2 工作原理

```typescript
// 平台层监听所有 Chat Participant 注册
class ChatParticipantAdapter {
  constructor(
    @IChatAgentService private chatAgentService: IChatAgentService,
    @IAIInteropBusService private aiInteropBus: IAIInteropBusService
  ) {
    // 监听 Chat Participant 注册事件
    this.chatAgentService.onDidRegisterAgent((agent) => {
      this.wrapChatParticipant(agent);
    });
  }

  private wrapChatParticipant(agent: IChatAgent) {
    // 自动将 Chat Participant 包装为 AI Interop Endpoint
    const endpoint: IAIInteropEndpointDescriptor = {
      endpointId: `chat.${agent.id}`,
      extensionId: agent.extensionId,
      displayName: agent.metadata.name || agent.id,
      description: agent.metadata.description,
      capabilities: ['streaming', 'context-aware'],
      
      // 关键：这是平台自动生成的 handler
      handler: async (request: IAIInteropInvocationRequest, token: CancellationToken) => {
        // 将 AI Interop 请求转换为 Chat 请求
        const chatRequest = this.convertToChatRequest(request);
        
        // 调用原始的 Chat Participant
        const response = await agent.invoke(chatRequest, token);
        
        // 流式返回结果
        for await (const part of response.stream) {
          if (token.isCancellationRequested) break;
          
          await request.acceptChunk({
            seq: part.index,
            content: this.convertChatPartToContent(part),
            metadata: { type: part.kind }
          });
        }
        
        await request.complete();
      }
    };
    
    // 注册到 AI Interop Bus
    this.aiInteropBus.registerEndpoint(endpoint);
  }
}
```

#### 3.1.3 关键特性

1. **自动发现**：平台启动时自动扫描所有已注册的 Chat Participant
2. **零侵入**：Chat 扩展无需修改任何代码
3. **流式支持**：完整支持 Chat 的流式输出
4. **Cancel 支持**：CancellationToken 正确传递
5. **上下文转换**：自动将 AI Interop 上下文转换为 Chat 上下文

#### 3.1.4 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/chatParticipantAdapter.ts`

---

### 3.2 Language Model API Adapter (高优先级)

#### 3.2.1 适配目标

使用 `vscode.lm` API 的 AI 扩展：
- GitHub Copilot (使用 Language Model API)
- 其他使用 LM API 的扩展

#### 3.2.2 工作原理

```typescript
class LanguageModelAdapter {
  constructor(
    @ILanguageModelsService private lmService: ILanguageModelsService,
    @IAIInteropBusService private aiInteropBus: IAIInteropBusService
  ) {
    // 监听 Language Model 注册
    this.lmService.onDidChangeLanguageModels(() => {
      this.refreshLanguageModels();
    });
  }

  private async refreshLanguageModels() {
    const models = await this.lmService.getLanguageModelIds();
    
    for (const modelId of models) {
      const model = await this.lmService.lookupLanguageModel(modelId);
      if (model) {
        this.wrapLanguageModel(model);
      }
    }
  }

  private wrapLanguageModel(model: ILanguageModelChat) {
    const endpoint: IAIInteropEndpointDescriptor = {
      endpointId: `lm.${model.id}`,
      extensionId: model.vendor,
      displayName: `${model.vendor} ${model.family}`,
      description: `Language Model: ${model.id}`,
      capabilities: ['streaming', 'tool-calling'],
      
      handler: async (request: IAIInteropInvocationRequest, token: CancellationToken) => {
        // 将 AI Interop 请求转换为 LM 请求
        const messages = this.convertToLMMessages(request);
        const options = this.convertToLMOptions(request);
        
        // 调用 Language Model
        const response = await model.sendRequest(messages, options, token);
        
        // 流式返回
        let seq = 0;
        for await (const chunk of response.text) {
          if (token.isCancellationRequested) break;
          
          await request.acceptChunk({
            seq: seq++,
            content: chunk,
            metadata: {}
          });
        }
        
        await request.complete();
      }
    };
    
    this.aiInteropBus.registerEndpoint(endpoint);
  }
}
```

#### 3.2.3 关键特性

1. **动态发现**：监听 Language Model 的注册和变更
2. **完整功能**：支持流式输出、工具调用
3. **参数映射**：自动转换请求参数和选项
4. **错误处理**：正确处理 LM API 的错误和限流

#### 3.2.4 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/languageModelAdapter.ts`

---

### 3.3 Command Adapter (降级方案)

#### 3.3.1 适配目标

只提供 Command 的 AI 扩展（没有 Chat 或 LM API）

#### 3.3.2 工作原理

通过配置文件手动声明需要暴露的 Command：

```json
// settings.json
{
  "aiInterop.exposeCommands": {
    "extension.someAICommand": {
      "displayName": "AI Command Name",
      "description": "What this command does",
      "inputMapping": {
        "type": "prompt",
        "argIndex": 0
      },
      "outputMapping": {
        "type": "text"
      }
    }
  }
}
```

```typescript
class CommandAdapter {
  constructor(
    @ICommandService private commandService: ICommandService,
    @IAIInteropBusService private aiInteropBus: IAIInteropBusService,
    @IConfigurationService private configService: IConfigurationService
  ) {
    // 监听配置变更
    this.configService.onDidChangeConfiguration((e) => {
      if (e.affectsConfiguration('aiInterop.exposeCommands')) {
        this.refreshCommandAdapters();
      }
    });
  }

  private refreshCommandAdapters() {
    const config = this.configService.getValue<any>('aiInterop.exposeCommands');
    
    for (const [commandId, commandConfig] of Object.entries(config)) {
      this.wrapCommand(commandId, commandConfig);
    }
  }

  private wrapCommand(commandId: string, config: any) {
    const endpoint: IAIInteropEndpointDescriptor = {
      endpointId: `cmd.${commandId}`,
      displayName: config.displayName,
      description: config.description,
      capabilities: ['one-shot'], // 不支持流式
      
      handler: async (request: IAIInteropInvocationRequest, token: CancellationToken) => {
        // 将请求映射为 Command 参数
        const args = this.mapRequestToArgs(request, config.inputMapping);
        
        // 执行 Command
        const result = await this.commandService.executeCommand(commandId, ...args);
        
        // 返回结果
        const content = this.mapResultToContent(result, config.outputMapping);
        await request.acceptChunk({ seq: 0, content, metadata: {} });
        await request.complete();
      }
    };
    
    this.aiInteropBus.registerEndpoint(endpoint);
  }
}
```

#### 3.3.3 关键特性

1. **手动配置**：需要用户或扩展作者提供配置
2. **有限功能**：不支持流式、不支持 Cancel
3. **降级方案**：仅用于没有更好 API 的扩展

#### 3.3.4 实现位置

- `src/vs/workbench/services/aiInterop/browser/adapters/commandAdapter.ts`

---

## 四、双向桥接

### 4.1 正向桥接：现有扩展 → AI Interop Bus

**已在上述适配器中实现**：平台自动将现有扩展包装为 AI Interop Endpoint

### 4.2 反向桥接：AI Interop Bus → 现有扩展

允许通过 AI Interop Bus 调用现有扩展的原生 API：

```typescript
class ReverseAdapter {
  // 允许 AI Interop 扩展调用 Chat Participant
  async invokeChatParticipant(
    participantId: string,
    request: IAIInteropInvocationRequest,
    token: CancellationToken
  ): Promise<void> {
    const agent = this.chatAgentService.getAgent(participantId);
    if (!agent) {
      throw new Error(`Chat participant not found: ${participantId}`);
    }
    
    // 转换并调用
    const chatRequest = this.convertToChatRequest(request);
    const response = await agent.invoke(chatRequest, token);
    
    // 流式返回
    for await (const part of response.stream) {
      await request.acceptChunk({
        seq: part.index,
        content: this.convertChatPartToContent(part),
        metadata: {}
      });
    }
  }
}
```

---

## 五、渐进增强策略

### 5.1 三级兼容性

| Level | 方式 | 功能 | 性能 | 适用场景 |
|-------|------|------|------|---------|
| **Level 1** | 完全适配新 API | 完整功能 | 最优 | 新开发的 AI 扩展 |
| **Level 2** | 自动适配 (Chat/LM) | 核心功能 | 良好 | 现有主流 AI 扩展 |
| **Level 3** | 手动配置 (Command) | 基础功能 | 一般 | 降级方案 |

### 5.2 扩展开发者指南

**推荐路径**：
1. **短期**：无需修改，平台自动适配
2. **中期**：可选择主动适配 `vscode.proposed.aiInterop` API 以获得更好的功能
3. **长期**：API 稳定后，推荐主动适配以获得最佳体验

---

## 六、实现计划

### 6.1 Phase 1: Chat Participant Adapter (Week 1-2)

**目标**：实现 Chat Participant 的自动适配

**任务**：
1. 实现 ChatParticipantAdapter 服务
2. 监听 Chat Participant 注册事件
3. 自动包装为 AI Interop Endpoint
4. 实现请求/响应转换
5. 测试与 GitHub Copilot Chat 的兼容性

**验收标准**：
- GitHub Copilot Chat 自动出现在 AI Interop Endpoint 列表
- 可以通过 AI Interop Bus 调用 Copilot Chat
- 流式输出正常
- Cancel 正常工作

### 6.2 Phase 2: Language Model API Adapter (Week 3)

**目标**：实现 Language Model API 的自动适配

**任务**：
1. 实现 LanguageModelAdapter 服务
2. 监听 Language Model 注册和变更
3. 自动包装为 AI Interop Endpoint
4. 实现参数映射和转换
5. 测试与 GitHub Copilot LM API 的兼容性

**验收标准**：
- GitHub Copilot 的 Language Model 自动出现在 Endpoint 列表
- 可以通过 AI Interop Bus 调用 Copilot LM
- 支持工具调用
- 性能符合预期

### 6.3 Phase 3: Command Adapter (Week 4)

**目标**：实现 Command 的手动适配

**任务**：
1. 实现 CommandAdapter 服务
2. 支持配置文件声明
3. 实现参数映射
4. 提供配置示例和文档

**验收标准**：
- 可以通过配置暴露 Command
- 参数映射正确
- 文档完整

---

## 七、架构调整

### 7.1 五层架构更新

原五层架构：
```
Layer 1: AI Interop Bus
Layer 2: AI Session Broker
Layer 3: Permission & Policy
Layer 4: Adapter Layer (可选兼容层)
Layer 5: Audit & Observability
```

新五层架构：
```
Layer 1: AI Interop Bus
Layer 2: AI Session Broker
Layer 3: Permission & Policy
Layer 4: Zero-Intrusion Adapter Layer (核心桥接层) ← 升级
Layer 5: Audit & Observability
```

### 7.2 Adapter Layer 新职责

| 职责 | 说明 |
|------|------|
| **自动发现** | 扫描和监听现有 AI 扩展的注册 |
| **零侵入包装** | 自动将现有 API 包装为 AI Interop Endpoint |
| **协议转换** | 双向转换 AI Interop 协议和现有 API |
| **能力映射** | 将现有 API 的能力映射为 AI Interop 能力 |
| **降级支持** | 为不支持的功能提供降级方案 |

---

## 八、关键技术决策

### 8.1 为什么选择自动适配而非手动注册？

**决策**：平台自动发现和包装，而非要求扩展主动注册

**原因**：
1. 现有扩展不会为了我们而修改代码
2. 自动适配提供更好的用户体验
3. 降低接入门槛

### 8.2 为什么优先适配 Chat Participant？

**决策**：Chat Participant Adapter 是最高优先级

**原因**：
1. Chat 是最常见的 AI 交互模式
2. GitHub Copilot Chat 是最重要的目标扩展
3. Chat API 功能完整，支持流式和上下文

### 8.3 为什么保留 Command Adapter？

**决策**：保留 Command Adapter 作为降级方案

**原因**：
1. 部分扩展只提供 Command
2. 提供完整的兼容性覆盖
3. 用户可以手动配置暴露特定功能

---

## 九、风险与应对

### 9.1 性能风险

**风险**：适配层增加额外的转换开销

**应对**：
- 最小化转换逻辑
- 使用流式传输避免缓冲
- 性能测试和优化

### 9.2 兼容性风险

**风险**：VS Code API 变更可能导致适配器失效

**应对**：
- 监听 API 变更
- 提供版本兼容性检查
- 及时更新适配器

### 9.3 功能覆盖风险

**风险**：部分扩展的特殊功能无法完全适配

**应对**：
- 优先适配核心功能
- 提供能力声明机制
- 文档说明限制

---

## 十、成功标准

### 10.1 功能标准

1. ✅ GitHub Copilot Chat 自动接入 AI Interop Bus
2. ✅ 可以通过 AI Interop Bus 调用 Copilot
3. ✅ 流式输出正常工作
4. ✅ Cancel 正确传递
5. ✅ 其他 Chat 扩展也能自动接入

### 10.2 性能标准

1. ✅ 适配层开销 < 10ms
2. ✅ 流式传输无明显延迟
3. ✅ 内存占用合理

### 10.3 用户体验标准

1. ✅ 用户无需配置即可使用现有 AI 扩展
2. ✅ 所有 AI 扩展在统一界面中展示
3. ✅ 扩展间协作流畅

---

## 十一、后续演进

### 11.1 Phase 2 增强

- 支持更多 VS Code API (如 Notebook、Terminal)
- 优化性能和内存占用
- 增强错误处理和降级策略

### 11.2 Phase 3 生态建设

- 提供扩展开发者指南
- 建立扩展兼容性测试套件
- 推动主流扩展主动适配

---

## 十二、参考文档

- [02-core-architecture.md](02-core-architecture.md) - 核心架构设计
- [06-adapter-strategy.md](06-adapter-strategy.md) - 原 Adapter 策略(需更新)
- [VS Code Chat API](https://code.visualstudio.com/api/extension-guides/chat)
- [VS Code Language Model API](https://code.visualstudio.com/api/extension-guides/language-model)
