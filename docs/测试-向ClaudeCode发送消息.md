# 测试：向 Claude Code 实例发送消息

## 前提条件

1. 已经修改了 `mainThreadWebviews.ts` 并重新编译
2. 重新加载 VS Code 窗口（Developer: Reload Window）
3. 打开开发者工具（Help → Toggle Developer Tools）
4. 打开至少一个 Claude Code 对话窗口

## 测试步骤

### 1. 获取所有 Claude Code 实例

在开发者控制台中运行：

```javascript
// 获取 MainThreadWebviews 实例
const webviews = window.__mainThreadWebviews;

// 获取所有 Claude Code 实例
const instances = webviews.getClaudeCodeInstances();
console.log('Claude Code 实例列表:', instances);
```

**预期输出**：
```javascript
[
  {
    handle: "558891e3-5cf6-4935-a311-c94283024802",
    viewType: "claudeVSCodePanel"
  },
  {
    handle: "83ffe611-81db-426e-afdb-ceb70f9716b7",
    viewType: "claudeVSCodePanel"
  }
]
```

### 2. 向特定实例发送测试消息

根据日志分析，Claude Code 的消息格式如下：

```javascript
// 选择第一个实例
const targetHandle = instances[0].handle;

// 构造测试消息（模拟用户发送消息）
const testMessage = {
  type: "request",
  requestId: "test_" + Date.now(),
  request: {
    type: "send_message",
    sessionId: "test-session-id",
    message: "你好，这是一条测试消息！"
  }
};

// 发送消息到 Extension Host
const success = webviews.sendMessageToExtensionHost(targetHandle, testMessage);
console.log('消息发送结果:', success);
```

### 3. 观察日志输出

发送消息后，你应该能在 Console 中看到：

```
========================================
[MainThreadWebviews] Sending message to Extension Host
Handle: 558891e3-5cf6-4935-a311-c94283024802
ViewType: claudeVSCodePanel
Message: {
  "type": "request",
  "requestId": "test_1712410000000",
  "request": {
    "type": "send_message",
    "sessionId": "test-session-id",
    "message": "你好，这是一条测试消息！"
  }
}
========================================
```

同时，你应该能看到 RPC 调用日志：
```
[LocalProcess][Win → Ext] request: ExtHostWebviews.$onMessage(...)
```

### 4. 测试不同的消息类型

根据日志分析，Claude Code 支持多种消息类型：

#### 4.1 更新会话状态
```javascript
const updateStateMessage = {
  type: "request",
  requestId: "test_" + Date.now(),
  request: {
    type: "update_session_state",
    sessionId: "your-session-id",
    state: "idle",
    title: "测试标题"
  }
};

webviews.sendMessageToExtensionHost(targetHandle, updateStateMessage);
```

#### 4.2 中断 Claude
```javascript
const interruptMessage = {
  type: "interrupt_claude",
  channelId: "test-channel-id"
};

webviews.sendMessageToExtensionHost(targetHandle, interruptMessage);
```

#### 4.3 发送用户消息（推测格式）
```javascript
const userMessage = {
  type: "request",
  requestId: "test_" + Date.now(),
  request: {
    type: "user_message",
    text: "请帮我写一个 Hello World 程序",
    sessionId: "your-session-id"
  }
};

webviews.sendMessageToExtensionHost(targetHandle, userMessage);
```

## 完整测试脚本

将以下代码复制到开发者控制台中一次性执行：

```javascript
(function testClaudeCodeMessaging() {
  console.log('=== 开始测试 Claude Code 消息发送 ===');
  
  // 1. 获取 MainThreadWebviews 实例
  const webviews = window.__mainThreadWebviews;
  if (!webviews) {
    console.error('错误: window.__mainThreadWebviews 未找到');
    return;
  }
  console.log('✓ MainThreadWebviews 实例已找到');
  
  // 2. 获取所有 Claude Code 实例
  const instances = webviews.getClaudeCodeInstances();
  console.log('✓ 找到', instances.length, '个 Claude Code 实例');
  console.log('实例列表:', instances);
  
  if (instances.length === 0) {
    console.error('错误: 没有找到 Claude Code 实例，请先打开 Claude Code');
    return;
  }
  
  // 3. 选择第一个实例
  const targetHandle = instances[0].handle;
  console.log('✓ 选择实例:', targetHandle);
  
  // 4. 发送测试消息
  const testMessage = {
    type: "request",
    requestId: "test_" + Date.now(),
    request: {
      type: "send_message",
      sessionId: "test-session-" + Date.now(),
      message: "你好，这是一条通过 RPC 发送的测试消息！"
    }
  };
  
  console.log('✓ 发送测试消息:', testMessage);
  const success = webviews.sendMessageToExtensionHost(targetHandle, testMessage);
  
  if (success) {
    console.log('✓ 消息发送成功！');
    console.log('=== 测试完成 ===');
  } else {
    console.error('✗ 消息发送失败');
  }
})();
```

## 预期结果

1. **Console 输出**：
   - 显示找到的 Claude Code 实例数量和详细信息
   - 显示消息发送成功的确认
   - 显示详细的消息内容日志

2. **RPC 日志**：
   - 看到 `[LocalProcess][Win → Ext]` 的 RPC 调用日志
   - 看到 `ExtHostWebviews.$onMessage` 被调用

3. **Claude Code UI**（可能）：
   - 如果消息格式正确，Claude Code 的 UI 可能会有响应
   - 注意：由于我们还不完全了解 Claude Code 的消息协议，可能需要调整消息格式

## 下一步

1. **分析真实消息格式**：
   - 在 Claude Code 中发送真实消息
   - 观察 Console 中的消息格式
   - 根据真实格式调整测试消息

2. **实现消息适配器**：
   - 创建标准化的消息格式
   - 实现不同 AI 扩展的消息转换

3. **创建统一 UI**：
   - 创建一个 Webview Panel 管理多个 AI 实例
   - 实现消息路由和调度

## 故障排除

### 问题 1：`window.__mainThreadWebviews` 未定义

**原因**：代码未重新编译或窗口未重新加载

**解决方案**：
1. 运行 `npm run compile-check-ts-native`
2. 重新加载 VS Code 窗口（Developer: Reload Window）

### 问题 2：`getClaudeCodeInstances()` 返回空数组

**原因**：没有打开 Claude Code 对话窗口

**解决方案**：
1. 打开至少一个 Claude Code 对话窗口
2. 重新运行测试脚本

### 问题 3：消息发送成功但 Claude Code 没有响应

**原因**：消息格式不正确

**解决方案**：
1. 在 Claude Code 中发送真实消息
2. 查看 Console 中的 "Message FROM Claude Code" 日志
3. 根据真实格式调整测试消息

## 技术原理

### 消息流程

```
开发者控制台
    ↓ (调用 sendMessageToExtensionHost)
MainThreadWebviews
    ↓ (serializeWebviewMessage)
RPC 层
    ↓ (ExtHostWebviews.$onMessage)
Extension Host
    ↓
Claude Code Extension
    ↓
Claude Code Agent
```

### 关键代码

**[mainThreadWebviews.ts:169-195](../src/vs/workbench/api/browser/mainThreadWebviews.ts#L169-L195)**：
```typescript
public sendMessageToExtensionHost(handle: extHostProtocol.WebviewHandle, message: any): boolean {
    const webview = this.tryGetWebview(handle);
    if (!webview) {
        console.error('[MainThreadWebviews] Cannot send message: webview not found:', handle);
        return false;
    }

    console.log('[MainThreadWebviews] ========================================');
    console.log('[MainThreadWebviews] Sending message to Extension Host');
    console.log('[MainThreadWebviews] Handle:', handle);
    console.log('[MainThreadWebviews] ViewType:', (webview as any).providedViewType);
    console.log('[MainThreadWebviews] Message:', JSON.stringify(message, null, 2));
    console.log('[MainThreadWebviews] ========================================');

    // Serialize the message and send it to Extension Host via RPC
    const serialized = serializeWebviewMessage(message, { serializeBuffersForPostMessage: true });
    this._proxy.$onMessage(handle, serialized.message, new SerializableObjectWithBuffers(serialized.buffers));

    return true;
}
```

这个方法模拟了 Webview 向 Extension Host 发送消息的过程，通过 RPC 调用 `ExtHostWebviews.$onMessage` 方法。

---

**文档版本**：v1.0  
**创建日期**：2026-04-06  
**作者**：AI Team
