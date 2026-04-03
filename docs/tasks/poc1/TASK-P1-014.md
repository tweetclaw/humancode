# 任务卡：TASK-P1-014

## 任务信息
- **任务编号**：TASK-P1-014
- **任务名称**：MCP Adapter 实现
- **对应验收**：TEST-P1-014
- **开发 AI**：AI-Dev-006
- **验收 AI**：AI-QA-005
- **依赖任务**：TASK-P1-002 (AI Interop Bus 实现)
- **优先级**：P0（最高优先级 - 架构关键突破）
- **状态**：⬜ 待开始

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目，这是一个基于 VS Code 深度改造的多 AI 协作 IDE。

本任务实现 **MCP (Model Context Protocol) Adapter**，这是零侵入式适配器架构的**最核心组件**，负责适配真正主流的 agentic AI 系统（Codex、Claude Code）。

**关键突破**：
- 2026 年的主流 AI IDE 扩展（Codex、Claude Code）都使用 MCP 协议
- MCP Adapter 可以覆盖 60%+ 的市场份额
- 这是 HumanCode 实现多 AI 协作的核心技术

**为什么 MCP Adapter 是最高优先级**：
根据 [研究报告](../../ai-interop/14-mainstream-ai-extensions-research-report.md)：
- Codex 和 Claude Code 是 2026 年的主流（市场份额 60%+）
- 它们都支持 MCP 协议
- GitHub Copilot 这类简单对话式 AI 已经过时（市场份额 < 20%）

## 任务目标

实现 MCP Adapter 服务，支持：
1. MCP 协议客户端实现（STDIO transport）
2. 自动发现和连接 MCP 服务器
3. 将 MCP Tools 包装为 AI Interop Endpoints
4. 协议转换（AI Interop ↔ MCP）
5. 流式输出支持
6. CancellationToken 传递

## 必须先阅读的文件

1. `docs/ai-interop/14-mainstream-ai-extensions-research-report.md`
   - 主流 AI IDE 扩展研究报告（理解为什么 MCP Adapter 是最高优先级）
2. `docs/ai-interop/13-zero-intrusion-adapter-architecture.md`
   - 零侵入式适配器架构设计（理解整体架构）
3. `src/vs/workbench/services/aiInterop/common/aiInterop.ts`
   - AI Interop 接口定义（了解 Endpoint 和 Invocation 的数据结构）
4. `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`
   - AI Interop Bus 实现（了解如何注册 Endpoint）

## 实现位置

新建文件：
- `src/vs/workbench/services/aiInterop/browser/adapters/mcpAdapter.ts`
- `src/vs/workbench/services/aiInterop/browser/adapters/mcpClient.ts`（MCP 协议客户端）
- `src/vs/workbench/services/aiInterop/browser/adapters/mcpTypes.ts`（MCP 类型定义）

## 实现要求

### 1. MCP 协议类型定义

在 `src/vs/workbench/services/aiInterop/browser/adapters/mcpTypes.ts` 中定义：

```typescript
/**
 * MCP (Model Context Protocol) 类型定义
 * 参考：https://modelcontextprotocol.io/
 */

// JSON-RPC 2.0 消息格式
export interface MCPRequest {
	jsonrpc: '2.0';
	id: string | number;
	method: string;
	params?: any;
}

export interface MCPResponse {
	jsonrpc: '2.0';
	id: string | number;
	result?: any;
	error?: MCPError;
}

export interface MCPError {
	code: number;
	message: string;
	data?: any;
}

// MCP Tool 定义
export interface MCPTool {
	name: string;
	description?: string;
	inputSchema: {
		type: 'object';
		properties: Record<string, any>;
		required?: string[];
	};
}

// MCP Tool Call
export interface MCPToolCall {
	name: string;
	arguments: Record<string, any>;
}

// MCP Tool Result
export interface MCPToolResult {
	content: Array<{
		type: 'text' | 'image' | 'resource';
		text?: string;
		data?: string;
		mimeType?: string;
	}>;
	isError?: boolean;
}

// MCP Server 配置
export interface MCPServerConfig {
	name: string;
	command: string;
	args?: string[];
	env?: Record<string, string>;
}
```

### 2. MCP 客户端实现

在 `src/vs/workbench/services/aiInterop/browser/adapters/mcpClient.ts` 中实现：

```typescript
import { Disposable } from 'vs/base/common/lifecycle';
import { Emitter, Event } from 'vs/base/common/event';
import { CancellationToken } from 'vs/base/common/cancellation';
import { ILogService } from 'vs/platform/log/common/log';
import { MCPRequest, MCPResponse, MCPTool, MCPToolCall, MCPToolResult } from './mcpTypes';

/**
 * MCP 客户端
 * 负责与 MCP 服务器通信（通过 STDIO）
 */
export class MCPClient extends Disposable {
	private _process: any; // Node.js ChildProcess
	private _requestId = 0;
	private _pendingRequests = new Map<number, {
		resolve: (value: any) => void;
		reject: (error: any) => void;
	}>();
	
	private readonly _onDidReceiveMessage = this._register(new Emitter<MCPResponse>());
	readonly onDidReceiveMessage: Event<MCPResponse> = this._onDidReceiveMessage.event;
	
	constructor(
		private readonly serverConfig: MCPServerConfig,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}
	
	/**
	 * 启动 MCP 服务器
	 */
	async start(): Promise<void> {
		// 使用 Node.js child_process 启动 MCP 服务器
		const { spawn } = require('child_process');
		
		this._process = spawn(this.serverConfig.command, this.serverConfig.args || [], {
			env: { ...process.env, ...this.serverConfig.env },
			stdio: ['pipe', 'pipe', 'pipe']
		});
		
		// 监听 stdout（MCP 消息）
		this._process.stdout.on('data', (data: Buffer) => {
			this.handleStdout(data);
		});
		
		// 监听 stderr（日志）
		this._process.stderr.on('data', (data: Buffer) => {
			this.logService.warn(`[MCPClient] ${this.serverConfig.name} stderr:`, data.toString());
		});
		
		// 监听进程退出
		this._process.on('exit', (code: number) => {
			this.logService.info(`[MCPClient] ${this.serverConfig.name} exited with code ${code}`);
		});
		
		this.logService.info(`[MCPClient] Started MCP server: ${this.serverConfig.name}`);
	}
	
	/**
	 * 处理 stdout 数据（JSON-RPC 消息）
	 */
	private handleStdout(data: Buffer): void {
		const lines = data.toString().split('\n').filter(line => line.trim());
		
		for (const line of lines) {
			try {
				const message: MCPResponse = JSON.parse(line);
				
				// 处理响应
				if ('id' in message) {
					const pending = this._pendingRequests.get(message.id as number);
					if (pending) {
						this._pendingRequests.delete(message.id as number);
						if (message.error) {
							pending.reject(new Error(message.error.message));
						} else {
							pending.resolve(message.result);
						}
					}
				}
				
				this._onDidReceiveMessage.fire(message);
			} catch (error) {
				this.logService.error(`[MCPClient] Failed to parse message:`, error);
			}
		}
	}
	
	/**
	 * 发送 JSON-RPC 请求
	 */
	private async sendRequest(method: string, params?: any): Promise<any> {
		const id = ++this._requestId;
		const request: MCPRequest = {
			jsonrpc: '2.0',
			id,
			method,
			params
		};
		
		return new Promise((resolve, reject) => {
			this._pendingRequests.set(id, { resolve, reject });
			
			// 发送到 stdin
			this._process.stdin.write(JSON.stringify(request) + '\n');
		});
	}
	
	/**
	 * 列出所有可用的 Tools
	 */
	async listTools(): Promise<MCPTool[]> {
		const result = await this.sendRequest('tools/list');
		return result.tools || [];
	}
	
	/**
	 * 调用 Tool
	 */
	async callTool(toolCall: MCPToolCall, token: CancellationToken): Promise<MCPToolResult> {
		// 注册 Cancel 监听
		const cancelListener = token.onCancellationRequested(() => {
			// 发送 cancel 请求（如果 MCP 支持）
			this.sendRequest('tools/cancel', { name: toolCall.name }).catch(() => {});
		});
		
		try {
			const result = await this.sendRequest('tools/call', {
				name: toolCall.name,
				arguments: toolCall.arguments
			});
			return result;
		} finally {
			cancelListener.dispose();
		}
	}
	
	/**
	 * 停止 MCP 服务器
	 */
	async stop(): Promise<void> {
		if (this._process) {
			this._process.kill();
			this._process = undefined;
		}
	}
	
	override dispose(): void {
		this.stop();
		super.dispose();
	}
}
```

### 3. MCP Adapter 服务实现

在 `src/vs/workbench/services/aiInterop/browser/adapters/mcpAdapter.ts` 中实现：

```typescript
import { Disposable, DisposableStore } from 'vs/base/common/lifecycle';
import { CancellationToken } from 'vs/base/common/cancellation';
import { ILogService } from 'vs/platform/log/common/log';
import { IConfigurationService } from 'vs/platform/configuration/common/configuration';
import { IAIInteropBusService, IAIInteropEndpointDescriptor, IAIInteropInvocationRequest } from 'vs/workbench/services/aiInterop/common/aiInterop';
import { MCPClient } from './mcpClient';
import { MCPServerConfig, MCPTool } from './mcpTypes';

/**
 * MCP Adapter 服务
 * 负责自动发现和包装 MCP 服务器为 AI Interop Endpoints
 */
export class MCPAdapterService extends Disposable {
	private readonly _mcpClients = new Map<string, MCPClient>();
	private readonly _adaptedEndpoints = new Map<string, IAIInteropEndpointDescriptor>();
	private readonly _disposables = new DisposableStore();
	
	constructor(
		@IAIInteropBusService private readonly aiInteropBus: IAIInteropBusService,
		@IConfigurationService private readonly configService: IConfigurationService,
		@ILogService private readonly logService: ILogService
	) {
		super();
	}
	
	/**
	 * 初始化适配器
	 */
	async initialize(): Promise<void> {
		// 读取 MCP 服务器配置
		const mcpServers = this.loadMCPServerConfigs();
		
		// 启动并包装每个 MCP 服务器
		for (const serverConfig of mcpServers) {
			await this.startAndWrapMCPServer(serverConfig);
		}
		
		this.logService.info(`[MCPAdapter] Initialized with ${mcpServers.length} MCP servers`);
	}
	
	/**
	 * 加载 MCP 服务器配置
	 */
	private loadMCPServerConfigs(): MCPServerConfig[] {
		// 从 VS Code 配置中读取
		const config = this.configService.getValue<any>('aiInterop.mcpServers');
		
		if (!config || !Array.isArray(config)) {
			this.logService.warn('[MCPAdapter] No MCP servers configured');
			return [];
		}
		
		return config;
	}
	
	/**
	 * 启动并包装 MCP 服务器
	 */
	private async startAndWrapMCPServer(serverConfig: MCPServerConfig): Promise<void> {
		try {
			// 创建 MCP 客户端
			const client = new MCPClient(serverConfig, this.logService);
			this._mcpClients.set(serverConfig.name, client);
			
			// 启动 MCP 服务器
			await client.start();
			
			// 获取所有 Tools
			const tools = await client.listTools();
			
			// 为每个 Tool 创建一个 AI Interop Endpoint
			for (const tool of tools) {
				this.wrapMCPTool(serverConfig.name, client, tool);
			}
			
			this.logService.info(`[MCPAdapter] Wrapped MCP server: ${serverConfig.name} with ${tools.length} tools`);
		} catch (error) {
			this.logService.error(`[MCPAdapter] Failed to start MCP server: ${serverConfig.name}`, error);
		}
	}
	
	/**
	 * 将 MCP Tool 包装为 AI Interop Endpoint
	 */
	private wrapMCPTool(serverName: string, client: MCPClient, tool: MCPTool): void {
		const endpointId = `mcp.${serverName}.${tool.name}`;
		
		// 避免重复包装
		if (this._adaptedEndpoints.has(endpointId)) {
			return;
		}
		
		const endpoint: IAIInteropEndpointDescriptor = {
			endpointId,
			extensionId: `mcp.${serverName}`,
			displayName: `${serverName}: ${tool.name}`,
			description: tool.description || `MCP tool: ${tool.name}`,
			capabilities: ['tool-calling'],
			hostKind: 'local',
			remoteAuthority: undefined
		};
		
		this._adaptedEndpoints.set(endpointId, endpoint);
		
		// 注册到 AI Interop Bus
		this.aiInteropBus.registerEndpoint(endpoint, async (request, token) => {
			return this.handleInvocation(client, tool, request, token);
		});
		
		this.logService.info(`[MCPAdapter] Wrapped MCP tool: ${endpointId}`);
	}
	
	/**
	 * 处理 Invocation
	 */
	private async handleInvocation(
		client: MCPClient,
		tool: MCPTool,
		request: IAIInteropInvocationRequest,
		token: CancellationToken
	): Promise<void> {
		try {
			// 1. 将 AI Interop 请求转换为 MCP Tool Call
			const toolCall = this.convertToMCPToolCall(tool, request);
			
			// 2. 调用 MCP Tool
			const result = await client.callTool(toolCall, token);
			
			// 3. 将结果转换为 AI Interop Response
			const content = this.convertMCPResultToContent(result);
			
			// 4. 发送结果
			await request.acceptChunk({
				seq: 0,
				content,
				metadata: { isError: result.isError }
			});
			
			// 5. 完成调用
			if (!token.isCancellationRequested) {
				await request.complete();
			}
		} catch (error) {
			this.logService.error(`[MCPAdapter] Invocation failed: ${request.invocationId}`, error);
			await request.fail(String(error));
		}
	}
	
	/**
	 * 协议转换：AI Interop Request → MCP Tool Call
	 */
	private convertToMCPToolCall(tool: MCPTool, request: IAIInteropInvocationRequest): any {
		// 从 request.input 中提取参数
		const args = typeof request.input === 'object' 
			? request.input 
			: { input: request.input };
		
		return {
			name: tool.name,
			arguments: args
		};
	}
	
	/**
	 * 协议转换：MCP Tool Result → AI Interop Content
	 */
	private convertMCPResultToContent(result: any): string {
		if (!result.content || !Array.isArray(result.content)) {
			return JSON.stringify(result);
		}
		
		// 合并所有 text 内容
		return result.content
			.filter((item: any) => item.type === 'text' && item.text)
			.map((item: any) => item.text)
			.join('\n');
	}
	
	/**
	 * 获取所有已适配的 Endpoints
	 */
	getAdaptedEndpoints(): IAIInteropEndpointDescriptor[] {
		return Array.from(this._adaptedEndpoints.values());
	}
	
	override dispose(): void {
		// 停止所有 MCP 客户端
		for (const client of this._mcpClients.values()) {
			client.dispose();
		}
		this._mcpClients.clear();
		this._disposables.dispose();
		super.dispose();
	}
}
```

### 4. 服务接口定义

在 `src/vs/workbench/services/aiInterop/common/aiInterop.ts` 中添加：

```typescript
export const IMCPAdapterService = createDecorator<IMCPAdapterService>('mcpAdapterService');

export interface IMCPAdapterService {
	readonly _serviceBrand: undefined;
	
	/**
	 * 初始化适配器，启动所有配置的 MCP 服务器
	 */
	initialize(): Promise<void>;
	
	/**
	 * 获取所有已适配的 MCP Endpoints
	 */
	getAdaptedEndpoints(): IAIInteropEndpointDescriptor[];
}
```

### 5. 服务注册

在 `src/vs/workbench/services/services.ts` 中注册服务：

```typescript
import { IMCPAdapterService } from 'vs/workbench/services/aiInterop/common/aiInterop';
import { MCPAdapterService } from 'vs/workbench/services/aiInterop/browser/adapters/mcpAdapter';

registerSingleton(IMCPAdapterService, MCPAdapterService, InstantiationType.Eager);
```

### 6. 自动初始化

在 `src/vs/workbench/browser/workbench.contribution.ts` 中添加初始化逻辑：

```typescript
import { IMCPAdapterService } from 'vs/workbench/services/aiInterop/common/aiInterop';

// 在 Workbench 启动时初始化 MCP Adapter
class MCPAdapterInitializer extends Disposable implements IWorkbenchContribution {
	constructor(
		@IMCPAdapterService mcpAdapter: IMCPAdapterService
	) {
		super();
		mcpAdapter.initialize().catch(err => {
			console.error('Failed to initialize MCP Adapter:', err);
		});
	}
}

registerWorkbenchContribution2(
	'workbench.contrib.mcpAdapterInitializer',
	MCPAdapterInitializer,
	WorkbenchPhase.BlockRestore
);
```

### 7. 配置示例

在用户的 `settings.json` 中配置 MCP 服务器：

```json
{
  "aiInterop.mcpServers": [
    {
      "name": "filesystem",
      "command": "npx",
      "args": ["-y", "@modelcontextprotocol/server-filesystem", "/Users/user/workspace"]
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

## 不需要实现的部分

- 不需要实现 HTTP/SSE transport（Phase 1 只实现 STDIO）
- 不需要实现 MCP Resources 和 Prompts（Phase 1 只实现 Tools）
- 不需要实现 UI（UI 由其他任务负责）
- 不需要实现权限控制（由 Policy Service 负责）
- 不需要实现审计日志（由 Audit Service 负责）
- 不需要实现 Chat Participant Adapter（由 TASK-P1-012 负责，已降级）
- 不需要实现 Language Model Adapter（由 TASK-P1-013 负责，已降级）

## 自验证清单（开发 AI 完成后自查）

- [ ] TypeScript 编译通过（`npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 CLAUDE.md）
- [ ] MCP 类型定义完整
- [ ] MCP 客户端可以启动 MCP 服务器
- [ ] MCP 客户端可以通过 STDIO 通信
- [ ] MCP 客户端可以列出 Tools
- [ ] MCP 客户端可以调用 Tools
- [ ] MCP Adapter 可以自动发现和包装 MCP 服务器
- [ ] 协议转换正确（AI Interop ↔ MCP）
- [ ] CancellationToken 正确传递
- [ ] 错误处理完整
- [ ] 日志输出清晰
- [ ] 服务正确注册到 DI 容器

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-P1-014）

## 实施记录

**开发 AI**：[AI 标识]
**完成时间**：[YYYY-MM-DD]

**实现要点**：
- [关键实现点 1]
- [关键实现点 2]

**遇到的问题**：
- [问题描述] → [解决方案]
