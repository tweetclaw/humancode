# AI Interop API 使用指南

## 1. 概述

AI Interop API 是 VS Code 的 proposed API,用于实现扩展之间的 AI 能力互操作。本文档提供完整的 API 使用说明。

## 2. 启用 API

### 2.1 在 package.json 中声明

```json
{
  "name": "my-ai-extension",
  "enabledApiProposals": [
    "aiInterop"
  ]
}
```

### 2.2 TypeScript 类型支持

```typescript
import * as vscode from 'vscode';

// API 通过 vscode.aiInterop 命名空间访问
const api = vscode.aiInterop;
```

## 3. 核心概念

### 3.1 Endpoint (端点)

Endpoint 是 AI 能力的提供者,可以是:
- Agent: 智能助手
- Tool: 工具能力
- UI: 用户界面组件
- Model: 模型服务

### 3.2 Session (会话)

Session 是多个 endpoint 协作的上下文环境,管理参与者、状态和权限。

### 3.3 Invocation (调用)

Invocation 是一次具体的 AI 能力调用,支持流式输出和取消。

## 4. 注册 Endpoint

### 4.1 基本注册

```typescript
import * as vscode from 'vscode';

export function activate(context: vscode.ExtensionContext) {
  // 创建 endpoint 描述符
  const descriptor: vscode.AiInteropEndpointDescriptor = {
    id: 'my-extension.my-agent',
    extensionId: 'publisher.my-extension',
    displayName: 'My AI Agent',
    description: 'A helpful AI assistant',
    capabilities: [
      { type: 'streaming' }
    ],
    hostKind: 'local'
  };

  // 注册 endpoint
  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    async (request, token) => {
      // 处理调用请求
      return {
        async *stream() {
          yield { kind: 'text', text: 'Hello from my agent!' };
        }
      };
    }
  );

  context.subscriptions.push(registration);
}
```

### 4.2 支持多种能力

```typescript
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.advanced-agent',
  extensionId: 'publisher.my-extension',
  displayName: 'Advanced Agent',
  capabilities: [
    { type: 'streaming' },
    { type: 'tool', config: { tools: ['file-read', 'file-write'] } },
    { type: 'mcp', config: { protocol: '1.0' } }
  ],
  hostKind: 'local',
  metadata: {
    version: '1.0.0',
    model: 'gpt-4'
  }
};
```

### 4.3 Remote Endpoint

```typescript
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.remote-agent',
  extensionId: 'publisher.my-extension',
  displayName: 'Remote Agent',
  capabilities: [{ type: 'streaming' }],
  hostKind: 'remote',
  remoteAuthority: 'ssh-remote+myserver'
};
```

## 5. 处理调用请求

### 5.1 基本 Handler

```typescript
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  // 检查取消
  if (token.isCancellationRequested) {
    throw new Error('Invocation cancelled');
  }

  // 返回流式响应
  return {
    async *stream() {
      for (let i = 0; i < 10; i++) {
        if (token.isCancellationRequested) {
          break;
        }
        
        yield {
          kind: 'text',
          text: `Chunk ${i}\n`
        };
        
        await new Promise(resolve => setTimeout(resolve, 100));
      }
    }
  };
}
```

### 5.2 处理不同类型的输入

```typescript
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  
  // 文本输入
  if (request.input.text) {
    console.log('Received text:', request.input.text);
  }

  // 结构化输入
  if (request.input.structured) {
    console.log('Received structured data:', request.input.structured);
  }

  // 附件
  if (request.input.attachments) {
    for (const attachment of request.input.attachments) {
      console.log('Attachment:', attachment.kind, attachment.uri);
    }
  }

  return {
    async *stream() {
      yield { kind: 'text', text: 'Processing complete' };
    }
  };
}
```

### 5.3 发送不同类型的 Chunk

```typescript
return {
  async *stream() {
    // 文本 chunk
    yield {
      kind: 'text',
      text: 'Plain text response'
    };

    // Markdown chunk
    yield {
      kind: 'markdown',
      markdown: '## Heading\n\nFormatted **content**'
    };

    // 状态 chunk
    yield {
      kind: 'status',
      status: 'streaming',
      message: 'Processing your request...'
    };

    // 工具调用 chunk
    yield {
      kind: 'toolCall',
      toolCallId: 'call-123',
      toolId: 'file-read',
      input: { path: '/path/to/file' },
      riskLevel: 'low'
    };

    // 工具结果 chunk
    yield {
      kind: 'toolResult',
      toolCallId: 'call-123',
      result: { content: 'file contents...' }
    };

    // Artifact chunk
    yield {
      kind: 'artifact',
      ref: {
        id: 'artifact-1',
        kind: 'file',
        uri: 'file:///path/to/output.txt',
        name: 'output.txt'
      }
    };
  }
};
```

## 6. 调用其他 Endpoint

### 6.1 基本调用

```typescript
async function invokeOtherAgent() {
  const handle = await vscode.aiInterop.invoke({
    sessionId: 'my-session',
    callerEndpointId: 'my-extension.my-agent',
    targetEndpointId: 'other-extension.other-agent',
    input: {
      text: 'Hello, can you help me?'
    }
  });

  // 监听 chunk
  handle.onChunk(chunk => {
    console.log('Received chunk:', chunk);
  });

  // 监听完成
  handle.onComplete(result => {
    console.log('Invocation completed:', result);
  });

  // 监听错误
  handle.onError(error => {
    console.error('Invocation failed:', error);
  });
}
```

### 6.2 带取消的调用

```typescript
async function invokeWithCancellation() {
  const handle = await vscode.aiInterop.invoke({
    sessionId: 'my-session',
    callerEndpointId: 'my-extension.my-agent',
    targetEndpointId: 'other-extension.other-agent',
    input: { text: 'Start processing...' }
  });

  // 5 秒后取消
  setTimeout(() => {
    handle.cancel();
  }, 5000);

  handle.onChunk(chunk => {
    console.log('Chunk:', chunk);
  });
}
```

### 6.3 指定上下文模式

```typescript
const handle = await vscode.aiInterop.invoke({
  sessionId: 'my-session',
  callerEndpointId: 'my-extension.my-agent',
  targetEndpointId: 'other-extension.other-agent',
  contextMode: 'full', // 'none' | 'lastTurn' | 'full' | 'redacted'
  input: { text: 'Use full session context' }
});
```

## 7. Session 管理

### 7.1 创建 Session

```typescript
const session = await vscode.aiInterop.createSession({
  title: 'My AI Session',
  ownerExtensionId: 'publisher.my-extension',
  workspaceKey: vscode.workspace.workspaceFolders?.[0]?.uri.toString() || 'default',
  metadata: {
    purpose: 'code-review',
    priority: 'high'
  }
});

console.log('Session created:', session.sessionId);
```

### 7.2 加入 Session

```typescript
await vscode.aiInterop.joinSession({
  sessionId: session.sessionId,
  endpointId: 'my-extension.my-agent',
  role: 'worker' // 'controller' | 'worker' | 'observer' | 'ui'
});
```

### 7.3 离开 Session

```typescript
await vscode.aiInterop.leaveSession({
  sessionId: session.sessionId,
  endpointId: 'my-extension.my-agent'
});
```

### 7.4 关闭 Session

```typescript
await vscode.aiInterop.closeSession(session.sessionId);
```

### 7.5 监听 Session 事件

```typescript
vscode.aiInterop.onSessionCreated(session => {
  console.log('Session created:', session.sessionId);
});

vscode.aiInterop.onSessionUpdated(session => {
  console.log('Session updated:', session.sessionId, session.members);
});

vscode.aiInterop.onSessionClosed(sessionId => {
  console.log('Session closed:', sessionId);
});
```

## 8. 错误处理

### 8.1 常见错误码

```typescript
handle.onError(error => {
  switch (error.code) {
    case 'ENDPOINT_NOT_FOUND':
      console.error('Target endpoint does not exist');
      break;
    case 'UNAUTHORIZED':
      console.error('Permission denied');
      break;
    case 'SESSION_NOT_FOUND':
      console.error('Session does not exist');
      break;
    case 'INVOCATION_CANCELED':
      console.log('Invocation was cancelled');
      break;
    case 'INVOCATION_TIMEOUT':
      console.error('Invocation timed out');
      break;
    case 'REMOTE_AUTHORITY_MISMATCH':
      console.error('Cannot route to different remote authority');
      break;
    default:
      console.error('Unknown error:', error.message);
  }
});
```

### 8.2 重试逻辑

```typescript
async function invokeWithRetry(
  request: vscode.AiInteropInvocationRequest,
  maxRetries: number = 3
): Promise<void> {
  for (let i = 0; i < maxRetries; i++) {
    try {
      const handle = await vscode.aiInterop.invoke(request);
      
      await new Promise<void>((resolve, reject) => {
        handle.onComplete(() => resolve());
        handle.onError(error => {
          if (error.retriable && i < maxRetries - 1) {
            reject(new Error('Retriable error'));
          } else {
            reject(error);
          }
        });
      });
      
      return; // Success
    } catch (error) {
      if (i === maxRetries - 1) {
        throw error;
      }
      await new Promise(resolve => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
}
```

## 9. 最佳实践

### 9.1 资源清理

```typescript
export function activate(context: vscode.ExtensionContext) {
  const registration = vscode.aiInterop.registerEndpoint(descriptor, handler);
  
  // 确保在扩展停用时清理
  context.subscriptions.push(registration);
}
```

### 9.2 取消令牌检查

```typescript
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  return {
    async *stream() {
      for (let i = 0; i < 100; i++) {
        // 定期检查取消
        if (token.isCancellationRequested) {
          break;
        }
        
        yield { kind: 'text', text: `Item ${i}` };
      }
    }
  };
}
```

### 9.3 批量发送 Chunk

```typescript
return {
  async *stream() {
    const buffer: vscode.AiInteropChunk[] = [];
    
    for (let i = 0; i < 1000; i++) {
      buffer.push({
        kind: 'text',
        text: `Token ${i} `
      });
      
      // 每 10 个 chunk 批量发送
      if (buffer.length >= 10) {
        for (const chunk of buffer) {
          yield chunk;
        }
        buffer.length = 0;
      }
    }
    
    // 发送剩余的
    for (const chunk of buffer) {
      yield chunk;
    }
  }
};
```

## 10. 调试技巧

### 10.1 启用详细日志

```typescript
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.my-agent',
  extensionId: 'publisher.my-extension',
  displayName: 'My Agent',
  capabilities: [{ type: 'streaming' }],
  hostKind: 'local',
  metadata: {
    debug: true,
    logLevel: 'verbose'
  }
};
```

### 10.2 使用审计视图

在 VS Code 中打开审计视图查看所有调用记录:

```
View > AI Interop Audit
```

### 10.3 监控性能

```typescript
const startTime = Date.now();
let chunkCount = 0;

handle.onChunk(chunk => {
  chunkCount++;
  const elapsed = Date.now() - startTime;
  console.log(`Chunk ${chunkCount} at ${elapsed}ms`);
});

handle.onComplete(() => {
  const totalTime = Date.now() - startTime;
  console.log(`Completed: ${chunkCount} chunks in ${totalTime}ms`);
});
```

## 11. 完整示例

参见 [扩展开发示例](./10-extension-examples.md) 获取完整的可运行示例。
