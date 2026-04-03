# AI Interop 故障排查指南

## 1. 概述

本文档提供 AI Interop 平台常见问题的诊断和解决方案。

## 2. Endpoint 注册问题

### 2.1 Endpoint 注册失败

**症状**: 调用 `registerEndpoint` 后没有错误,但 endpoint 无法被发现。

**可能原因**:
1. API 未正确启用
2. ExtHost 与 MainThread 通信失败
3. Endpoint ID 冲突

**诊断步骤**:

```typescript
// 1. 检查 API 是否可用
console.log('aiInterop API available:', !!vscode.aiInterop);

// 2. 检查注册返回值
const registration = vscode.aiInterop.registerEndpoint(descriptor, handler);
console.log('Registration:', registration);

// 3. 查看开发者工具控制台
// Help > Toggle Developer Tools
// 查找 "MainThreadAiInterop" 相关日志
```

**解决方案**:

```json
// 确保 package.json 中正确声明
{
  "enabledApiProposals": [
    "aiInterop"
  ]
}
```

### 2.2 Endpoint ID 冲突

**症状**: 注册时报错 "Endpoint already registered"。

**原因**: 同一个 ID 被注册了多次。

**解决方案**:

```typescript
// ✅ 确保只注册一次
export function activate(context: vscode.ExtensionContext) {
  const registration = vscode.aiInterop.registerEndpoint(descriptor, handler);
  context.subscriptions.push(registration); // 自动清理
}

// ❌ 避免重复注册
export function activate(context: vscode.ExtensionContext) {
  // 不要在循环或事件处理器中注册
  someEvent.on(() => {
    vscode.aiInterop.registerEndpoint(descriptor, handler); // 错误!
  });
}
```

### 2.3 Handler 未被调用

**症状**: Endpoint 已注册,但 handler 从未执行。

**诊断步骤**:

```typescript
const registration = vscode.aiInterop.registerEndpoint(
  descriptor,
  async (request, token) => {
    console.log('Handler called!', request); // 添加日志
    return {
      async *stream() {
        yield { kind: 'text', text: 'test' };
      }
    };
  }
);
```

**可能原因**:
1. 调用方使用了错误的 endpoint ID
2. 权限被拒绝
3. Host kind 不匹配

**解决方案**: 检查审计视图查看拒绝原因。

## 3. 调用问题

### 3.1 ENDPOINT_NOT_FOUND 错误

**症状**: 调用时报错 "Endpoint not found"。

**诊断步骤**:

```typescript
// 1. 验证 endpoint 是否存在
// 在目标扩展中添加日志
console.log('Endpoint registered:', descriptor.id);

// 2. 检查 ID 拼写
const handle = await vscode.aiInterop.invoke({
  sessionId: session.sessionId,
  callerEndpointId: 'my-extension.caller',
  targetEndpointId: 'target-extension.target', // 确保拼写正确
  input: { text: 'test' }
});
```

**解决方案**:
- 确保目标扩展已安装并激活
- 验证 endpoint ID 拼写正确
- 检查目标扩展的 `package.json` 中的 `activationEvents`

### 3.2 UNAUTHORIZED 错误

**症状**: 调用被拒绝,错误码 "UNAUTHORIZED"。

**原因**: 用户拒绝了权限请求。

**解决方案**:

1. 打开权限视图: `View > AI Interop Permissions`
2. 找到相关的权限记录
3. 修改决策或删除记录以重新提示

```typescript
// 在代码中处理权限错误
handle.onError(error => {
  if (error.code === 'UNAUTHORIZED') {
    vscode.window.showWarningMessage(
      'Permission denied. Please grant access in AI Interop Permissions view.',
      'Open Permissions'
    ).then(choice => {
      if (choice === 'Open Permissions') {
        vscode.commands.executeCommand('aiInterop.openPermissionsView');
      }
    });
  }
});
```

### 3.3 SESSION_NOT_FOUND 错误

**症状**: 调用时报错 "Session not found"。

**可能原因**:
1. Session 已关闭
2. Session ID 错误
3. Session 在不同的 workspace

**解决方案**:

```typescript
// ✅ 验证 session 存在
let currentSession: string | null = null;

async function ensureSession(): Promise<string> {
  if (!currentSession) {
    const session = await vscode.aiInterop.createSession({
      title: 'My Session',
      ownerExtensionId: 'publisher.my-extension',
      workspaceKey: vscode.workspace.workspaceFolders?.[0]?.uri.toString() || 'default'
    });
    currentSession = session.sessionId;
  }
  return currentSession;
}

// 监听 session 关闭
vscode.aiInterop.onSessionClosed(sessionId => {
  if (sessionId === currentSession) {
    currentSession = null;
  }
});
```

### 3.4 REMOTE_AUTHORITY_MISMATCH 错误

**症状**: 跨 remote 调用失败。

**原因**: 尝试从 local 调用 remote endpoint,或 remoteAuthority 不匹配。

**解决方案**:

```typescript
// 检查当前环境
const currentRemoteAuthority = vscode.env.remoteName;
console.log('Current remote authority:', currentRemoteAuthority);

// 只调用匹配的 endpoint
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.agent',
  extensionId: 'publisher.my-extension',
  displayName: 'My Agent',
  capabilities: [{ type: 'streaming' }],
  hostKind: currentRemoteAuthority ? 'remote' : 'local',
  remoteAuthority: currentRemoteAuthority
};
```

## 4. 流式输出问题

### 4.1 Chunk 未到达

**症状**: Handler 发送了 chunk,但调用方未收到。

**诊断步骤**:

```typescript
// 在 handler 中添加日志
return {
  async *stream() {
    console.log('Sending chunk 1');
    yield { kind: 'text', text: 'chunk 1' };
    
    console.log('Sending chunk 2');
    yield { kind: 'text', text: 'chunk 2' };
  }
};

// 在调用方添加日志
handle.onChunk(chunk => {
  console.log('Received chunk:', chunk);
});
```

**可能原因**:
1. Generator 未正确实现
2. 异常被吞没
3. 取消令牌已触发

**解决方案**:

```typescript
// ✅ 正确的 generator
return {
  async *stream() {
    try {
      for (let i = 0; i < 10; i++) {
        yield { kind: 'text', text: `Chunk ${i}` };
      }
    } catch (error) {
      console.error('Stream error:', error);
      throw error;
    }
  }
};

// ❌ 错误的实现
return {
  stream: async function*() { // 不要使用 function 关键字
    yield { kind: 'text', text: 'test' };
  }
};
```

### 4.2 Chunk 顺序错乱

**症状**: Chunk 到达顺序与发送顺序不一致。

**原因**: 这不应该发生。平台保证顺序。

**诊断步骤**:

```typescript
let expectedSeq = 0;

handle.onChunk(chunk => {
  if (chunk.seq !== expectedSeq) {
    console.error(`Sequence error: expected ${expectedSeq}, got ${chunk.seq}`);
  }
  expectedSeq++;
});
```

**解决方案**: 如果确实发生,这是平台 bug,请报告。

### 4.3 流式输出中断

**症状**: 流式输出突然停止,没有完成或错误事件。

**可能原因**:
1. Handler 抛出异常
2. 取消令牌被触发
3. 超时

**解决方案**:

```typescript
// ✅ 正确处理异常
return {
  async *stream() {
    try {
      for (let i = 0; i < 100; i++) {
        if (token.isCancellationRequested) {
          yield { kind: 'status', status: 'canceled' };
          return;
        }
        
        yield { kind: 'text', text: `Item ${i}` };
      }
      
      yield { kind: 'status', status: 'completed' };
    } catch (error) {
      console.error('Stream error:', error);
      yield {
        kind: 'status',
        status: 'failed',
        message: String(error)
      };
    }
  }
};
```

## 5. 取消问题

### 5.1 取消不生效

**症状**: 调用 `cancel()` 后,handler 继续执行。

**原因**: Handler 未检查取消令牌。

**解决方案**:

```typescript
// ✅ 定期检查取消
return {
  async *stream() {
    for (let i = 0; i < 100; i++) {
      if (token.isCancellationRequested) {
        console.log('Cancelled at iteration', i);
        break;
      }
      
      yield { kind: 'text', text: `Item ${i}` };
      await new Promise(resolve => setTimeout(resolve, 100));
    }
  }
};
```

### 5.2 取消后仍收到 Chunk

**症状**: 调用 `cancel()` 后,仍然收到新的 chunk。

**原因**: Handler 在取消后继续发送。

**解决方案**: 确保 handler 在检测到取消后立即停止。

```typescript
return {
  async *stream() {
    for (let i = 0; i < 100; i++) {
      if (token.isCancellationRequested) {
        // 立即停止,不再发送
        return;
      }
      
      yield { kind: 'text', text: `Item ${i}` };
    }
  }
};
```

## 6. 性能问题

### 6.1 高延迟

**症状**: Chunk 到达延迟很高。

**诊断步骤**:

```typescript
const startTime = Date.now();
let lastChunkTime = startTime;

handle.onChunk(chunk => {
  const now = Date.now();
  const totalElapsed = now - startTime;
  const chunkDelay = now - lastChunkTime;
  
  console.log(`Chunk at ${totalElapsed}ms (delay: ${chunkDelay}ms)`);
  lastChunkTime = now;
});
```

**可能原因**:
1. Handler 中有阻塞操作
2. 发送频率过高
3. Payload 过大

**解决方案**:

```typescript
// ✅ 批量发送
return {
  async *stream() {
    const buffer: string[] = [];
    
    for (let i = 0; i < 1000; i++) {
      buffer.push(`token${i} `);
      
      if (buffer.length >= 10) {
        yield { kind: 'text', text: buffer.join('') };
        buffer.length = 0;
        
        // 让出控制权
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }
};
```

### 6.2 内存泄漏

**症状**: 内存使用持续增长。

**诊断步骤**:

1. 打开 VS Code 开发者工具
2. 切换到 Memory 标签
3. 拍摄堆快照
4. 执行操作
5. 再次拍摄快照
6. 比较差异

**可能原因**:
1. 未清理事件监听器
2. 缓存无限增长
3. Session 未关闭

**解决方案**:

```typescript
// ✅ 正确清理
export function activate(context: vscode.ExtensionContext) {
  const disposables: vscode.Disposable[] = [];
  
  // 注册 endpoint
  disposables.push(
    vscode.aiInterop.registerEndpoint(descriptor, handler)
  );
  
  // 监听事件
  disposables.push(
    vscode.aiInterop.onSessionCreated(session => {
      // 处理...
    })
  );
  
  // 确保清理
  context.subscriptions.push(...disposables);
}

// ✅ 限制缓存大小
class LRUCache<K, V> {
  private cache = new Map<K, V>();
  private maxSize = 100;
  
  set(key: K, value: V) {
    if (this.cache.size >= this.maxSize) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
    this.cache.set(key, value);
  }
}
```

### 6.3 CPU 占用过高

**症状**: VS Code 响应缓慢,CPU 占用高。

**可能原因**:
1. Handler 中有密集计算
2. 发送频率过高
3. 同步阻塞操作

**解决方案**:

```typescript
// ✅ 使用 Worker 处理密集计算
import { Worker } from 'worker_threads';

async function heavyComputation(data: any): Promise<any> {
  return new Promise((resolve, reject) => {
    const worker = new Worker('./worker.js');
    worker.postMessage(data);
    worker.on('message', resolve);
    worker.on('error', reject);
  });
}

// ✅ 定期让出控制权
return {
  async *stream() {
    for (let i = 0; i < 1000; i++) {
      yield { kind: 'text', text: `Item ${i}` };
      
      if (i % 100 === 0) {
        await new Promise(resolve => setImmediate(resolve));
      }
    }
  }
};
```

## 7. 工具调用问题

### 7.1 工具调用未执行

**症状**: 发送了 `toolCall` chunk,但工具未执行。

**可能原因**:
1. 工具未注册
2. 审批被拒绝
3. 工具 ID 错误

**解决方案**:

```typescript
// 检查工具是否在 capabilities 中声明
const descriptor: vscode.AiInteropEndpointDescriptor = {
  id: 'my-extension.agent',
  extensionId: 'publisher.my-extension',
  displayName: 'My Agent',
  capabilities: [
    { type: 'streaming' },
    { type: 'tool', config: { tools: ['file-read', 'file-write'] } }
  ],
  hostKind: 'local'
};

// 发送工具调用时使用正确的 ID
yield {
  kind: 'toolCall',
  toolCallId: 'call-' + Date.now(),
  toolId: 'file-read', // 必须在 capabilities 中声明
  input: { path: '/path/to/file' }
};
```

### 7.2 工具审批超时

**症状**: 工具调用等待审批时超时。

**解决方案**:

```typescript
// 设置合理的超时
const handle = await vscode.aiInterop.invoke({
  sessionId: session.sessionId,
  callerEndpointId: 'my-extension.caller',
  targetEndpointId: 'my-extension.worker',
  input: { text: 'test' },
  timeoutMs: 60000 // 60 秒
});
```

## 8. 调试技巧

### 8.1 启用详细日志

```typescript
// 在扩展中
const outputChannel = vscode.window.createOutputChannel('My AI Agent Debug');

function log(message: string, ...args: any[]) {
  const timestamp = new Date().toISOString();
  outputChannel.appendLine(`[${timestamp}] ${message}`);
  if (args.length > 0) {
    outputChannel.appendLine(JSON.stringify(args, null, 2));
  }
}

// 使用
log('Endpoint registered', descriptor);
log('Invocation received', request);
```

### 8.2 使用审计视图

打开审计视图查看所有调用历史:

```
View > AI Interop Audit
```

审计视图显示:
- 所有 invocation 记录
- 权限决策
- 错误和失败原因
- 性能指标

### 8.3 使用开发者工具

```
Help > Toggle Developer Tools
```

在控制台中查找:
- `[MainThreadAiInterop]` - 主线程日志
- `[ExtHostAiInterop]` - 扩展宿主日志
- `[AIInteropBusService]` - 总线服务日志

### 8.4 断点调试

在 VS Code 中调试扩展:

1. 打开扩展项目
2. 按 F5 启动调试
3. 在代码中设置断点
4. 触发相关操作

```typescript
export function activate(context: vscode.ExtensionContext) {
  const registration = vscode.aiInterop.registerEndpoint(
    descriptor,
    async (request, token) => {
      debugger; // 断点会在这里触发
      return {
        async *stream() {
          yield { kind: 'text', text: 'test' };
        }
      };
    }
  );
}
```

## 9. 常见错误码参考

| 错误码 | 含义 | 常见原因 | 解决方案 |
|--------|------|----------|----------|
| `ENDPOINT_NOT_FOUND` | 目标 endpoint 不存在 | 拼写错误、扩展未激活 | 检查 ID、确保扩展已安装 |
| `UNAUTHORIZED` | 权限被拒绝 | 用户拒绝授权 | 检查权限视图 |
| `SESSION_NOT_FOUND` | Session 不存在 | Session 已关闭、ID 错误 | 验证 session 存在 |
| `REMOTE_AUTHORITY_MISMATCH` | Remote authority 不匹配 | 跨 remote 调用 | 确保 host kind 匹配 |
| `INVOCATION_CANCELED` | 调用被取消 | 用户或代码取消 | 正常情况,无需处理 |
| `INVOCATION_TIMEOUT` | 调用超时 | 处理时间过长 | 增加超时时间 |
| `TARGET_HANDLER_ERROR` | Handler 抛出异常 | Handler 代码错误 | 检查 handler 日志 |
| `PROTOCOL_VIOLATION` | 协议违规 | Chunk seq 错误、状态错误 | 检查 chunk 发送逻辑 |

## 10. 获取帮助

如果问题仍未解决:

1. 查看 [API 使用指南](./09-api-usage-guide.md)
2. 查看 [最佳实践指南](./11-best-practices.md)
3. 查看 [扩展开发示例](./10-extension-examples.md)
4. 在 VS Code 仓库提交 issue
5. 查看审计视图和开发者工具日志

提交 issue 时请包含:
- VS Code 版本
- 扩展版本
- 重现步骤
- 错误日志
- 审计视图截图
