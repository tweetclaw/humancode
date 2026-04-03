# AI Interop 扩展开发示例

## 1. 概述

本文档提供完整的可运行示例,展示如何使用 AI Interop API 构建扩展。

## 2. 示例 1: 简单的 AI Agent

### 2.1 项目结构

```
my-ai-agent/
├── package.json
├── tsconfig.json
└── src/
    └── extension.ts
```

### 2.2 package.json

```json
{
  "name": "my-ai-agent",
  "displayName": "My AI Agent",
  "version": "1.0.0",
  "publisher": "your-publisher",
  "engines": {
    "vscode": "^1.85.0"
  },
  "enabledApiProposals": [
    "aiInterop"
  ],
  "activationEvents": [
    "onStartupFinished"
  ],
  "main": "./out/extension.js",
  "contributes": {
    "commands": [
      {
        "command": "my-ai-agent.start",
        "title": "Start My AI Agent"
      }
    ]
  },
  "scripts": {
    "compile": "tsc -p ./",
    "watch": "tsc -watch -p ./"
  },
  "devDependencies": {
    "@types/vscode": "^1.85.0",
    "typescript": "^5.3.0"
  }
}
```

### 2.3 extension.ts

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  console.log('My AI Agent is activating...');

  // 注册 endpoint
  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-ai-agent.simple-agent',
    extensionId: 'your-publisher.my-ai-agent',
    displayName: 'Simple AI Agent',
    description: 'A simple AI agent that echoes your input',
    capabilities: [
      { type: 'streaming' }
    ],
    hostKind: 'local'
  };

  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    handleInvocation
  );

  context.subscriptions.push(registration);

  // 注册命令
  const command = vscode.commands.registerCommand(
    'my-ai-agent.start',
    async () => {
      vscode.window.showInformationMessage('My AI Agent is ready!');
    }
  );

  context.subscriptions.push(command);

  console.log('My AI Agent activated successfully');
}

async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  console.log('Received invocation:', request);

  return {
    async *stream() {
      // 发送状态更新
      yield {
        kind: 'status',
        status: 'streaming',
        message: 'Processing your request...'
      };

      // 模拟处理
      const input = request.input.text || 'No input provided';
      const words = input.split(' ');

      for (let i = 0; i < words.length; i++) {
        if (token.isCancellationRequested) {
          break;
        }

        yield {
          kind: 'text',
          text: words[i] + ' '
        };

        // 模拟延迟
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      // 发送完成状态
      yield {
        kind: 'status',
        status: 'completed',
        message: 'Done!'
      };
    }
  };
}

export function deactivate() {
  console.log('My AI Agent is deactivating...');
}
```

## 3. 示例 2: Controller 和 Worker 协作

### 3.1 Controller Extension

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // 注册 controller endpoint
  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-extension.controller',
    extensionId: 'publisher.my-extension',
    displayName: 'Task Controller',
    capabilities: [{ type: 'streaming' }],
    hostKind: 'local'
  };

  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    handleControllerInvocation
  );

  context.subscriptions.push(registration);

  // 注册命令来触发协作
  const command = vscode.commands.registerCommand(
    'my-extension.runTask',
    async () => {
      await runCollaborativeTask();
    }
  );

  context.subscriptions.push(command);
}

async function handleControllerInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  return {
    async *stream() {
      yield {
        kind: 'text',
        text: 'Controller received: ' + request.input.text
      };
    }
  };
}

async function runCollaborativeTask() {
  try {
    // 创建 session
    const session = await vscode.aiInterop.createSession({
      title: 'Collaborative Task',
      ownerExtensionId: 'publisher.my-extension',
      workspaceKey: vscode.workspace.workspaceFolders?.[0]?.uri.toString() || 'default'
    });

    console.log('Session created:', session.sessionId);

    // 加入 session
    await vscode.aiInterop.joinSession({
      sessionId: session.sessionId,
      endpointId: 'my-extension.controller',
      role: 'controller'
    });

    // 调用 worker
    const handle = await vscode.aiInterop.invoke({
      sessionId: session.sessionId,
      callerEndpointId: 'my-extension.controller',
      targetEndpointId: 'my-extension.worker',
      input: {
        text: 'Please process this task'
      }
    });

    // 收集结果
    const chunks: string[] = [];

    handle.onChunk(chunk => {
      if (chunk.kind === 'text') {
        chunks.push(chunk.text);
        console.log('Received chunk:', chunk.text);
      }
    });

    handle.onComplete(result => {
      console.log('Task completed:', chunks.join(''));
      vscode.window.showInformationMessage('Task completed successfully!');
    });

    handle.onError(error => {
      console.error('Task failed:', error);
      vscode.window.showErrorMessage('Task failed: ' + error.message);
    });

  } catch (error) {
    console.error('Failed to run task:', error);
    vscode.window.showErrorMessage('Failed to run task');
  }
}
```

### 3.2 Worker Extension

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // 注册 worker endpoint
  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-extension.worker',
    extensionId: 'publisher.my-extension',
    displayName: 'Task Worker',
    capabilities: [
      { type: 'streaming' },
      { type: 'tool', config: { tools: ['file-read'] } }
    ],
    hostKind: 'local'
  };

  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    handleWorkerInvocation
  );

  context.subscriptions.push(registration);
}

async function handleWorkerInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  return {
    async *stream() {
      yield {
        kind: 'status',
        status: 'streaming',
        message: 'Worker starting...'
      };

      // 模拟工作
      for (let i = 0; i < 5; i++) {
        if (token.isCancellationRequested) {
          yield {
            kind: 'status',
            status: 'canceled',
            message: 'Work cancelled'
          };
          break;
        }

        yield {
          kind: 'text',
          text: `Processing step ${i + 1}/5...\n`
        };

        await new Promise(resolve => setTimeout(resolve, 500));
      }

      if (!token.isCancellationRequested) {
        yield {
          kind: 'status',
          status: 'completed',
          message: 'Work completed'
        };
      }
    }
  };
}
```

## 4. 示例 3: 带工具调用的 Agent

```typescript
import * as vscode from 'vscode';
import * as fs from 'fs/promises';
import * as path from 'path';

export function activate(context: vscode.ExtensionContext) {
  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-extension.tool-agent',
    extensionId: 'publisher.my-extension',
    displayName: 'Tool-Using Agent',
    capabilities: [
      { type: 'streaming' },
      { type: 'tool', config: { tools: ['file-read', 'file-write', 'file-list'] } }
    ],
    hostKind: 'local'
  };

  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    handleToolAgentInvocation
  );

  context.subscriptions.push(registration);
}

async function handleToolAgentInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  return {
    async *stream() {
      const input = request.input.text || '';

      yield {
        kind: 'text',
        text: 'Analyzing your request...\n'
      };

      // 决定使用哪个工具
      if (input.includes('read')) {
        yield* handleFileRead(input, token);
      } else if (input.includes('write')) {
        yield* handleFileWrite(input, token);
      } else if (input.includes('list')) {
        yield* handleFileList(token);
      } else {
        yield {
          kind: 'text',
          text: 'I can help you read, write, or list files. What would you like to do?'
        };
      }
    }
  };
}

async function* handleFileRead(
  input: string,
  token: vscode.CancellationToken
): AsyncGenerator<vscode.AiInteropChunk> {
  
  // 发送工具调用 chunk
  const toolCallId = 'read-' + Date.now();
  
  yield {
    kind: 'toolCall',
    toolCallId,
    toolId: 'file-read',
    input: { path: './README.md' },
    riskLevel: 'low'
  };

  try {
    // 执行实际的文件读取
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder');
    }

    const filePath = path.join(workspaceFolder.uri.fsPath, 'README.md');
    const content = await fs.readFile(filePath, 'utf-8');

    // 发送工具结果 chunk
    yield {
      kind: 'toolResult',
      toolCallId,
      result: { content }
    };

    // 发送摘要
    yield {
      kind: 'text',
      text: `\n\nFile read successfully. Content length: ${content.length} characters.\n`
    };

  } catch (error) {
    yield {
      kind: 'toolResult',
      toolCallId,
      result: { error: String(error) },
      isError: true
    };

    yield {
      kind: 'text',
      text: '\n\nFailed to read file: ' + String(error) + '\n'
    };
  }
}

async function* handleFileWrite(
  input: string,
  token: vscode.CancellationToken
): AsyncGenerator<vscode.AiInteropChunk> {
  
  const toolCallId = 'write-' + Date.now();
  
  yield {
    kind: 'toolCall',
    toolCallId,
    toolId: 'file-write',
    input: { path: './output.txt', content: 'Hello from AI Agent!' },
    riskLevel: 'medium'
  };

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder');
    }

    const filePath = path.join(workspaceFolder.uri.fsPath, 'output.txt');
    await fs.writeFile(filePath, 'Hello from AI Agent!', 'utf-8');

    yield {
      kind: 'toolResult',
      toolCallId,
      result: { success: true }
    };

    yield {
      kind: 'text',
      text: '\n\nFile written successfully.\n'
    };

  } catch (error) {
    yield {
      kind: 'toolResult',
      toolCallId,
      result: { error: String(error) },
      isError: true
    };
  }
}

async function* handleFileList(
  token: vscode.CancellationToken
): AsyncGenerator<vscode.AiInteropChunk> {
  
  const toolCallId = 'list-' + Date.now();
  
  yield {
    kind: 'toolCall',
    toolCallId,
    toolId: 'file-list',
    input: { path: './' },
    riskLevel: 'low'
  };

  try {
    const workspaceFolder = vscode.workspace.workspaceFolders?.[0];
    if (!workspaceFolder) {
      throw new Error('No workspace folder');
    }

    const files = await fs.readdir(workspaceFolder.uri.fsPath);

    yield {
      kind: 'toolResult',
      toolCallId,
      result: { files }
    };

    yield {
      kind: 'markdown',
      markdown: '\n\n## Files in workspace:\n\n' + files.map(f => `- ${f}`).join('\n') + '\n'
    };

  } catch (error) {
    yield {
      kind: 'toolResult',
      toolCallId,
      result: { error: String(error) },
      isError: true
    };
  }
}
```

## 5. 示例 4: 带取消支持的长时间任务

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-extension.long-task',
    extensionId: 'publisher.my-extension',
    displayName: 'Long Task Agent',
    capabilities: [{ type: 'streaming' }],
    hostKind: 'local'
  };

  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    handleLongTask
  );

  context.subscriptions.push(registration);

  // 注册测试命令
  const command = vscode.commands.registerCommand(
    'my-extension.testLongTask',
    async () => {
      await testLongTaskWithCancellation();
    }
  );

  context.subscriptions.push(command);
}

async function handleLongTask(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  return {
    async *stream() {
      const totalSteps = 100;

      for (let i = 0; i < totalSteps; i++) {
        // 检查取消
        if (token.isCancellationRequested) {
          yield {
            kind: 'status',
            status: 'canceled',
            message: `Canceled at step ${i}/${totalSteps}`
          };
          break;
        }

        // 发送进度
        if (i % 10 === 0) {
          yield {
            kind: 'status',
            status: 'streaming',
            message: `Progress: ${i}/${totalSteps}`
          };
        }

        yield {
          kind: 'text',
          text: '.'
        };

        // 模拟工作
        await new Promise(resolve => setTimeout(resolve, 100));
      }

      if (!token.isCancellationRequested) {
        yield {
          kind: 'status',
          status: 'completed',
          message: 'All steps completed'
        };
      }
    }
  };
}

async function testLongTaskWithCancellation() {
  const session = await vscode.aiInterop.createSession({
    title: 'Long Task Test',
    ownerExtensionId: 'publisher.my-extension',
    workspaceKey: 'test'
  });

  await vscode.aiInterop.joinSession({
    sessionId: session.sessionId,
    endpointId: 'my-extension.long-task',
    role: 'worker'
  });

  const handle = await vscode.aiInterop.invoke({
    sessionId: session.sessionId,
    callerEndpointId: 'my-extension.long-task',
    targetEndpointId: 'my-extension.long-task',
    input: { text: 'Start long task' }
  });

  let chunkCount = 0;

  handle.onChunk(chunk => {
    chunkCount++;
    console.log(`Chunk ${chunkCount}:`, chunk);
  });

  handle.onComplete(() => {
    console.log('Task completed, total chunks:', chunkCount);
    vscode.window.showInformationMessage('Long task completed!');
  });

  handle.onError(error => {
    console.error('Task error:', error);
  });

  // 5 秒后取消
  setTimeout(() => {
    console.log('Cancelling task...');
    handle.cancel();
  }, 5000);
}
```

## 6. 示例 5: Remote Endpoint

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // 检测当前环境
  const remoteAuthority = vscode.env.remoteName;
  const hostKind = remoteAuthority ? 'remote' : 'local';

  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-extension.remote-agent',
    extensionId: 'publisher.my-extension',
    displayName: 'Remote-Aware Agent',
    capabilities: [{ type: 'streaming' }],
    hostKind,
    remoteAuthority
  };

  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    handleRemoteInvocation
  );

  context.subscriptions.push(registration);

  console.log(`Agent registered as ${hostKind}${remoteAuthority ? ` (${remoteAuthority})` : ''}`);
}

async function handleRemoteInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  return {
    async *stream() {
      const remoteAuthority = vscode.env.remoteName;
      const hostInfo = remoteAuthority 
        ? `remote host (${remoteAuthority})` 
        : 'local host';

      yield {
        kind: 'text',
        text: `Processing on ${hostInfo}...\n`
      };

      // 执行特定于环境的逻辑
      if (remoteAuthority) {
        yield {
          kind: 'text',
          text: 'Running remote-specific operations...\n'
        };
      } else {
        yield {
          kind: 'text',
          text: 'Running local-specific operations...\n'
        };
      }

      yield {
        kind: 'status',
        status: 'completed',
        message: 'Done'
      };
    }
  };
}
```

## 7. 运行示例

### 7.1 编译扩展

```bash
cd my-ai-agent
npm install
npm run compile
```

### 7.2 调试扩展

1. 在 VS Code 中打开扩展项目
2. 按 F5 启动调试
3. 在新窗口中测试扩展

### 7.3 测试 API

```typescript
// 在调试控制台中执行
vscode.commands.executeCommand('my-ai-agent.start');
```

## 8. 完整测试项目

参考 VS Code 源码中的测试扩展:
- `extensions/test-ai-interop-controller/` - Controller 示例
- `extensions/test-ai-interop-worker/` - Worker 示例

这些扩展包含完整的端到端测试场景。
