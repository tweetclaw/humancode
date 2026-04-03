# AI Interop 最佳实践指南

## 1. 概述

本文档提供使用 AI Interop API 的最佳实践,帮助开发者构建高质量、高性能、安全的 AI 扩展。

## 2. Endpoint 设计

### 2.1 选择合适的 Endpoint ID

```typescript
// ✅ 好的做法: 使用命名空间和描述性名称
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.code-reviewer',
  extensionId: 'publisher.my-extension',
  displayName: 'Code Reviewer',
  // ...
};

// ❌ 避免: 通用或模糊的名称
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'agent1',
  extensionId: 'publisher.my-extension',
  displayName: 'Agent',
  // ...
};
```

### 2.2 准确声明能力

只声明你实际支持的能力:

```typescript
// ✅ 好的做法: 只声明实际支持的能力
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.simple-agent',
  capabilities: [
    { type: 'streaming' }
  ],
  // ...
};

// ❌ 避免: 声明不支持的能力
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.simple-agent',
  capabilities: [
    { type: 'streaming' },
    { type: 'tool' },  // 但实际不处理工具调用
    { type: 'mcp' }    // 但实际不支持 MCP
  ],
  // ...
};
```

### 2.3 提供有意义的元数据

```typescript
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.code-reviewer',
  extensionId: 'publisher.my-extension',
  displayName: 'Code Reviewer',
  description: 'Reviews code for best practices and potential bugs',
  capabilities: [{ type: 'streaming' }],
  hostKind: 'local',
  metadata: {
    version: '1.0.0',
    supportedLanguages: ['typescript', 'javascript', 'python'],
    maxInputTokens: 4000
  }
};
```

## 3. 流式输出优化

### 3.1 批量发送 Chunk

避免每个 token 都单独发送:

```typescript
// ✅ 好的做法: 批量发送
return {
  async *stream() {
    const buffer: string[] = [];
    const BATCH_SIZE = 10;

    for (let i = 0; i < 1000; i++) {
      buffer.push(`token${i} `);
      
      if (buffer.length >= BATCH_SIZE) {
        yield {
          kind: 'text',
          text: buffer.join('')
        };
        buffer.length = 0;
      }
    }
    
    // 发送剩余的
    if (buffer.length > 0) {
      yield {
        kind: 'text',
        text: buffer.join('')
      };
    }
  }
};

// ❌ 避免: 每个 token 单独发送
return {
  async *stream() {
    for (let i = 0; i < 1000; i++) {
      yield {
        kind: 'text',
        text: `token${i} `
      };
    }
  }
};
```

### 3.2 合理使用状态更新

不要过于频繁地发送状态更新:

```typescript
// ✅ 好的做法: 在关键节点发送状态
return {
  async *stream() {
    yield { kind: 'status', status: 'streaming', message: 'Starting...' };
    
    // 执行工作...
    
    yield { kind: 'status', status: 'completed', message: 'Done' };
  }
};

// ❌ 避免: 过于频繁的状态更新
return {
  async *stream() {
    for (let i = 0; i < 100; i++) {
      yield { kind: 'status', status: 'streaming', message: `Step ${i}` };
      // 每次迭代都发送状态会产生大量开销
    }
  }
};
```

### 3.3 使用合适的 Chunk 类型

根据内容选择正确的 chunk 类型:

```typescript
return {
  async *stream() {
    // 纯文本
    yield { kind: 'text', text: 'Plain text response' };
    
    // 格式化内容
    yield { kind: 'markdown', markdown: '## Heading\n\n**Bold** text' };
    
    // 状态更新
    yield { kind: 'status', status: 'streaming', message: 'Processing...' };
    
    // 工具调用
    yield {
      kind: 'toolCall',
      toolCallId: 'call-1',
      toolId: 'file-read',
      input: { path: '/path/to/file' }
    };
  }
};
```

## 4. 取消处理

### 4.1 定期检查取消令牌

```typescript
// ✅ 好的做法: 定期检查取消
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  return {
    async *stream() {
      for (let i = 0; i < 100; i++) {
        // 每次迭代检查取消
        if (token.isCancellationRequested) {
          yield { kind: 'status', status: 'canceled' };
          break;
        }
        
        yield { kind: 'text', text: `Item ${i}` };
      }
    }
  };
}

// ❌ 避免: 从不检查取消
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  return {
    async *stream() {
      for (let i = 0; i < 100; i++) {
        // 即使用户取消也会继续执行
        yield { kind: 'text', text: `Item ${i}` };
      }
    }
  };
}
```

### 4.2 快速响应取消

```typescript
// ✅ 好的做法: 立即停止工作
if (token.isCancellationRequested) {
  yield { kind: 'status', status: 'canceled', message: 'Cancelled by user' };
  return; // 立即返回
}

// ❌ 避免: 取消后继续执行清理工作
if (token.isCancellationRequested) {
  // 不要在取消后执行耗时操作
  await expensiveCleanup();
  yield { kind: 'status', status: 'canceled' };
}
```

### 4.3 传播取消到子操作

```typescript
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  return {
    async *stream() {
      // 将取消令牌传递给子操作
      const result = await performLongOperation(token);
      
      if (token.isCancellationRequested) {
        yield { kind: 'status', status: 'canceled' };
        return;
      }
      
      yield { kind: 'text', text: result };
    }
  };
}

async function performLongOperation(token: vscode.CancellationToken): Promise<string> {
  // 子操作也检查取消
  if (token.isCancellationRequested) {
    throw new Error('Cancelled');
  }
  // 执行工作...
  return 'result';
}
```

## 5. 错误处理

### 5.1 提供有意义的错误信息

```typescript
// ✅ 好的做法: 详细的错误信息
handle.onError(error => {
  if (error.code === 'ENDPOINT_NOT_FOUND') {
    vscode.window.showErrorMessage(
      `Agent "${targetId}" is not available. Please ensure the extension is installed and activated.`
    );
  } else if (error.code === 'UNAUTHORIZED') {
    vscode.window.showErrorMessage(
      'Permission denied. Please grant access in the AI Interop permissions view.'
    );
  } else {
    vscode.window.showErrorMessage(`Error: ${error.message}`);
  }
});

// ❌ 避免: 通用错误处理
handle.onError(error => {
  vscode.window.showErrorMessage('Something went wrong');
});
```

### 5.2 实现重试逻辑

```typescript
// ✅ 好的做法: 智能重试
async function invokeWithRetry(
  request: vscode.AiInteropInvocationRequest,
  maxRetries: number = 3
): Promise<void> {
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    try {
      const handle = await vscode.aiInterop.invoke(request);
      
      await new Promise<void>((resolve, reject) => {
        handle.onComplete(() => resolve());
        handle.onError(error => {
          // 只重试可重试的错误
          if (error.retriable && attempt < maxRetries - 1) {
            reject(new Error('Retriable error'));
          } else {
            reject(error);
          }
        });
      });
      
      return; // 成功
    } catch (error) {
      if (attempt === maxRetries - 1) {
        throw error;
      }
      
      // 指数退避
      const delay = Math.min(1000 * Math.pow(2, attempt), 10000);
      await new Promise(resolve => setTimeout(resolve, delay));
    }
  }
}
```

### 5.3 优雅降级

```typescript
// ✅ 好的做法: 提供降级方案
async function invokeAgent(targetId: string, input: string): Promise<string> {
  try {
    const handle = await vscode.aiInterop.invoke({
      sessionId: currentSession,
      callerEndpointId: myEndpointId,
      targetEndpointId: targetId,
      input: { text: input }
    });
    
    return await collectResponse(handle);
  } catch (error) {
    // 降级到本地处理
    console.warn('Remote agent unavailable, using local fallback');
    return await localFallback(input);
  }
}
```

## 6. Session 管理

### 6.1 及时清理 Session

```typescript
// ✅ 好的做法: 使用 try-finally 确保清理
async function runTask() {
  const session = await vscode.aiInterop.createSession({
    title: 'My Task',
    ownerExtensionId: 'publisher.my-extension',
    workspaceKey: 'default'
  });
  
  try {
    await vscode.aiInterop.joinSession({
      sessionId: session.sessionId,
      endpointId: 'my-extension.agent',
      role: 'controller'
    });
    
    // 执行工作...
    
  } finally {
    // 确保清理
    await vscode.aiInterop.closeSession(session.sessionId);
  }
}
```

### 6.2 合理使用上下文模式

```typescript
// ✅ 好的做法: 根据需要选择上下文模式
const handle = await vscode.aiInterop.invoke({
  sessionId: session.sessionId,
  callerEndpointId: 'my-extension.controller',
  targetEndpointId: 'other-extension.worker',
  contextMode: 'lastTurn', // 只需要上一轮的上下文
  input: { text: 'Continue from last response' }
});

// ❌ 避免: 总是使用 'full' 模式
const handle = await vscode.aiInterop.invoke({
  sessionId: session.sessionId,
  callerEndpointId: 'my-extension.controller',
  targetEndpointId: 'other-extension.worker',
  contextMode: 'full', // 可能传递不必要的数据
  input: { text: 'Simple query' }
});
```

### 6.3 监听 Session 事件

```typescript
// ✅ 好的做法: 监听并响应 session 事件
export function activate(context: vscode.ExtensionContext) {
  const disposables: vscode.Disposable[] = [];
  
  disposables.push(
    vscode.aiInterop.onSessionCreated(session => {
      console.log('Session created:', session.sessionId);
    })
  );
  
  disposables.push(
    vscode.aiInterop.onSessionClosed(sessionId => {
      console.log('Session closed:', sessionId);
      // 清理相关资源
      cleanupSessionResources(sessionId);
    })
  );
  
  context.subscriptions.push(...disposables);
}
```

## 7. 性能优化

### 7.1 避免阻塞主线程

```typescript
// ✅ 好的做法: 使用异步操作
return {
  async *stream() {
    for (let i = 0; i < 100; i++) {
      yield { kind: 'text', text: `Item ${i}` };
      
      // 定期让出控制权
      if (i % 10 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }
};

// ❌ 避免: 同步阻塞操作
return {
  async *stream() {
    // 长时间的同步计算会阻塞
    const result = expensiveSyncComputation();
    yield { kind: 'text', text: result };
  }
};
```

### 7.2 限制并发调用

```typescript
// ✅ 好的做法: 控制并发数
class AgentController {
  private activeInvocations = 0;
  private readonly maxConcurrent = 5;
  
  async invoke(request: vscode.AiInteropInvocationRequest): Promise<void> {
    while (this.activeInvocations >= this.maxConcurrent) {
      await new Promise(resolve => setTimeout(resolve, 100));
    }
    
    this.activeInvocations++;
    try {
      const handle = await vscode.aiInterop.invoke(request);
      await this.waitForCompletion(handle);
    } finally {
      this.activeInvocations--;
    }
  }
}
```

### 7.3 缓存频繁访问的数据

```typescript
// ✅ 好的做法: 缓存结果
class CachedAgent {
  private cache = new Map<string, string>();
  
  async handleInvocation(
    request: vscode.AiInteropInvocationRequest,
    token: vscode.CancellationToken
  ): Promise<vscode.AiInteropInvocationResponse> {
    const cacheKey = request.input.text || '';
    
    return {
      async *stream() {
        // 检查缓存
        if (this.cache.has(cacheKey)) {
          yield { kind: 'text', text: this.cache.get(cacheKey)! };
          return;
        }
        
        // 计算结果
        const result = await this.compute(cacheKey);
        this.cache.set(cacheKey, result);
        
        yield { kind: 'text', text: result };
      }
    };
  }
}
```

## 8. 安全性

### 8.1 验证输入

```typescript
// ✅ 好的做法: 验证和清理输入
async function handleInvocation(
  request: vscode.AiInteropInvocationRequest,
  token: vscode.CancellationToken
): Promise<vscode.AiInteropInvocationResponse> {
  return {
    async *stream() {
      const input = request.input.text || '';
      
      // 验证输入
      if (input.length > 10000) {
        throw new Error('Input too large');
      }
      
      // 清理输入
      const sanitized = input.replace(/[<>]/g, '');
      
      // 处理...
    }
  };
}
```

### 8.2 谨慎处理工具调用

```typescript
// ✅ 好的做法: 标记风险级别
yield {
  kind: 'toolCall',
  toolCallId: 'call-1',
  toolId: 'file-write',
  input: { path: '/path/to/file', content: 'data' },
  riskLevel: 'high' // 写操作是高风险
};

yield {
  kind: 'toolCall',
  toolCallId: 'call-2',
  toolId: 'file-read',
  input: { path: '/path/to/file' },
  riskLevel: 'low' // 读操作是低风险
};
```

### 8.3 不要在元数据中包含敏感信息

```typescript
// ✅ 好的做法: 只包含非敏感信息
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.agent',
  extensionId: 'publisher.my-extension',
  displayName: 'My Agent',
  metadata: {
    version: '1.0.0',
    capabilities: ['code-review']
  }
};

// ❌ 避免: 包含敏感信息
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.agent',
  extensionId: 'publisher.my-extension',
  displayName: 'My Agent',
  metadata: {
    apiKey: 'secret-key', // 不要这样做!
    userToken: 'token'    // 不要这样做!
  }
};
```

## 9. 测试

### 9.1 编写单元测试

```typescript
import * as assert from 'assert';
import * as vscode from 'vscode';

suite('AI Interop Tests', () => {
  test('Endpoint registration', async () => {
    const descriptor: vscode.AiInteropEndpointDescriptor = {
      id: 'test.agent',
      extensionId: 'test.extension',
      displayName: 'Test Agent',
      capabilities: [{ type: 'streaming' }],
      hostKind: 'local'
    };
    
    const registration = vscode.aiInterop.registerEndpoint(
      descriptor,
      async (request, token) => ({
        async *stream() {
          yield { kind: 'text', text: 'test' };
        }
      })
    );
    
    assert.ok(registration);
    registration.dispose();
  });
});
```

### 9.2 测试取消行为

```typescript
test('Cancellation support', async () => {
  const session = await vscode.aiInterop.createSession({
    title: 'Test',
    ownerExtensionId: 'test.extension',
    workspaceKey: 'test'
  });
  
  const handle = await vscode.aiInterop.invoke({
    sessionId: session.sessionId,
    callerEndpointId: 'test.caller',
    targetEndpointId: 'test.target',
    input: { text: 'test' }
  });
  
  let cancelled = false;
  handle.onError(error => {
    if (error.code === 'INVOCATION_CANCELED') {
      cancelled = true;
    }
  });
  
  // 立即取消
  handle.cancel();
  
  // 等待取消生效
  await new Promise(resolve => setTimeout(resolve, 500));
  assert.ok(cancelled);
});
```

### 9.3 测试错误处理

```typescript
test('Error handling', async () => {
  const handle = await vscode.aiInterop.invoke({
    sessionId: 'invalid-session',
    callerEndpointId: 'test.caller',
    targetEndpointId: 'non-existent',
    input: { text: 'test' }
  });
  
  let errorReceived = false;
  handle.onError(error => {
    errorReceived = true;
    assert.strictEqual(error.code, 'ENDPOINT_NOT_FOUND');
  });
  
  await new Promise(resolve => setTimeout(resolve, 1000));
  assert.ok(errorReceived);
});
```

## 10. 调试技巧

### 10.1 启用详细日志

```typescript
export function activate(context: vscode.ExtensionContext) {
  const outputChannel = vscode.window.createOutputChannel('My AI Agent');
  context.subscriptions.push(outputChannel);
  
  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    async (request, token) => {
      outputChannel.appendLine(`[${new Date().toISOString()}] Received invocation`);
      outputChannel.appendLine(`Input: ${JSON.stringify(request.input)}`);
      
      return {
        async *stream() {
          let chunkCount = 0;
          for await (const chunk of generateChunks()) {
            chunkCount++;
            outputChannel.appendLine(`Chunk ${chunkCount}: ${chunk.kind}`);
            yield chunk;
          }
        }
      };
    }
  );
}
```

### 10.2 使用审计视图

在 VS Code 中打开审计视图查看所有调用:

```
View > AI Interop Audit
```

### 10.3 监控性能指标

```typescript
class PerformanceMonitor {
  private metrics = new Map<string, number[]>();
  
  recordInvocation(invocationId: string, duration: number) {
    if (!this.metrics.has(invocationId)) {
      this.metrics.set(invocationId, []);
    }
    this.metrics.get(invocationId)!.push(duration);
  }
  
  getStats(invocationId: string) {
    const durations = this.metrics.get(invocationId) || [];
    if (durations.length === 0) return null;
    
    const sorted = [...durations].sort((a, b) => a - b);
    return {
      count: durations.length,
      avg: durations.reduce((a, b) => a + b, 0) / durations.length,
      p50: sorted[Math.floor(sorted.length * 0.5)],
      p95: sorted[Math.floor(sorted.length * 0.95)],
      p99: sorted[Math.floor(sorted.length * 0.99)]
    };
  }
}
```

## 11. 总结

遵循这些最佳实践可以帮助你构建:
- 高性能的流式 AI 交互
- 响应迅速的取消处理
- 健壮的错误处理
- 安全的跨扩展通信
- 易于调试和维护的代码

更多信息请参考:
- [API 使用指南](./09-api-usage-guide.md)
- [扩展开发示例](./10-extension-examples.md)
- [故障排查指南](./12-troubleshooting.md)
