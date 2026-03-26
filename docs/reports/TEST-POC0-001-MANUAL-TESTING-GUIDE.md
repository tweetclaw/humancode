# TEST-POC0-001 人工验收操作手册

## 文档说明

本文档提供 TASK-POC0-001（VS Code RPC 流式传输性能验证）的人工验收操作步骤。AI 已完成自动化验收的部分，本手册指导人工验收员完成需要实际运行和观察的测试场景。

## 验收前准备

### 1. 环境要求

- Node.js 18+
- TypeScript 5.3+
- macOS/Linux/Windows 操作系统
- 至少 8GB 可用内存

### 2. 代码准备

```bash
# 确保在项目根目录
cd /Users/immeta/work/humancode

# 拉取最新代码（如需要）
git pull

# 安装依赖（如未安装）
npm install
```

### 3. 编译扩展

```bash
# 编译 Worker 扩展
cd extensions/test-ai-interop-worker
npm install
npm run compile

# 编译 Controller 扩展
cd ../test-ai-interop-controller
npm install
npm run compile

# 返回项目根目录
cd ../..
```

## 自动化验收结果摘要

以下项目已通过 AI 自动验收：

✅ **代码质量检查**
- TypeScript 编译通过（无错误）
- 代码使用 tabs 缩进（符合 VS Code 规范）
- RPC 方法使用 `$` 前缀
- 依赖注入正确使用

✅ **文件结构验证**
- [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts) - RPC Shape 定义
- [src/vs/workbench/api/browser/mainThreadTestAiInterop.ts](../../../src/vs/workbench/api/browser/mainThreadTestAiInterop.ts) - MainThread Customer
- [src/vs/workbench/api/common/extHostTestAiInterop.ts](../../../src/vs/workbench/api/common/extHostTestAiInterop.ts) - ExtHost API
- [extensions/test-ai-interop-worker/](../../../extensions/test-ai-interop-worker/) - Worker 扩展
- [extensions/test-ai-interop-controller/](../../../extensions/test-ai-interop-controller/) - Controller 扩展

✅ **功能实现验证**
- RPC Shape 定义完整（MainThreadTestAiInteropShape, ExtHostTestAiInteropShape）
- MainThread Customer 正确实现 `$acceptChunk` 方法
- ExtHost API 正确实现事件机制和 `sendChunk` 方法
- API 已在 [extHost.api.impl.ts:1844](../../../src/vs/workbench/api/common/extHost.api.impl.ts#L1844) 正确集成
- MainThread Customer 已在 [extensionHost.contribution.ts:104](../../../src/vs/workbench/api/browser/extensionHost.contribution.ts#L104) 正确注册

## 人工验收任务

### 任务 1：启动 Extension Development Host

**目的**：验证扩展能够正确加载和激活

**步骤**：

1. 在 VS Code 中打开项目根目录
2. 按 `F5` 或通过菜单 `Run > Start Debugging` 启动 Extension Development Host
3. 等待新的 VS Code 窗口打开（标题栏显示 `[Extension Development Host]`）

**预期结果**：
- 新窗口成功打开
- 控制台输出包含：
  ```
  [Worker] Test AI Interop Worker extension activated
  [Controller] Test AI Interop Controller extension activated
  ```

**如果失败**：
- 检查扩展是否编译成功（查看 `extensions/*/out/` 目录）
- 查看 Developer Tools 控制台（Help > Toggle Developer Tools）的错误信息

---

### 任务 2：场景 1 - 基础流式传输测试

**目的**：验证基础 RPC 流式传输功能和性能指标

**配置**：
- Worker 发送 100 个 chunk
- 每个 chunk 间隔 20ms
- 预期总耗时约 2000ms

**步骤**：

1. 在 Extension Development Host 窗口中，打开命令面板（`Cmd+Shift+P` 或 `Ctrl+Shift+P`）
2. 输入并执行命令：`Run AI Interop RPC Test`
3. 观察控制台输出（Help > Toggle Developer Tools > Console）
4. 同时进行 UI 响应性测试：
   - 点击菜单栏的各个菜单项
   - 切换打开的文件标签
   - 在编辑器中输入文本

**预期结果**：

控制台输出类似：
```
[Controller] Starting test with invocationId: test-1234567890
[Worker] Received invocation: test-1234567890
[Worker] Completed invocation: test-1234567890

=== AI Interop RPC Performance Test Results ===

Invocation ID: test-1234567890
Total time: 2000-2500ms
Expected chunks: 100
Received chunks: 100
Loss rate: 0.00%
Out of order: 0

Latency Statistics:
  Min: 0-5ms
  Max: 30-50ms
  Avg: 15-25ms
  P95: 25-40ms

No missing sequences
No out of order chunks

===============================================
```

**验收标准**：
- ✅ chunk 丢失率 = 0%（接收到全部 100 个 chunk）
- ✅ chunk 乱序率 = 0%（无乱序情况）
- ✅ 总延迟在 1500-2500ms 范围内（允许 ±500ms 误差）
- ✅ UI 无卡顿（菜单点击响应正常，文件切换无延迟，输入文本流畅）

**记录数据**：
- 实际总耗时：_______ ms
- 接收 chunk 数量：_______ / 100
- 丢失率：_______ %
- P95 延迟：_______ ms
- UI 卡顿情况：□ 无卡顿  □ 轻微卡顿  □ 明显卡顿

---

### 任务 3：场景 2 - 高频传输测试

**目的**：验证高频率 RPC 调用下的性能和稳定性

**配置修改**：

编辑 [extensions/test-ai-interop-worker/src/extension.ts](../../../extensions/test-ai-interop-worker/src/extension.ts#L34)：

```typescript
// 修改前（场景 1）：
for (let i = 0; i < 100; i++) {
    await api.sendChunk(invocationId, i, `chunk-${i}`);
    await sleep(20);
}

// 修改为（场景 2）：
for (let i = 0; i < 200; i++) {
    await api.sendChunk(invocationId, i, `chunk-${i}`);
    await sleep(10);
}
```

编辑 [extensions/test-ai-interop-controller/src/extension.ts](../../../extensions/test-ai-interop-controller/src/extension.ts#L105)：

```typescript
// 修改前：
await waitForCompletion(received, 100, 5000);

// 修改为：
await waitForCompletion(received, 200, 5000);
```

**步骤**：

1. 保存修改后的文件
2. 重新编译扩展：
   ```bash
   cd extensions/test-ai-interop-worker && npm run compile
   cd ../test-ai-interop-controller && npm run compile
   ```
3. 重启 Extension Development Host（关闭后重新按 `F5`）
4. 执行命令：`Run AI Interop RPC Test`
5. 观察控制台输出和 UI 响应性

**预期结果**：
- 接收到全部 200 个 chunk
- 总耗时约 2000ms
- 丢失率 = 0%
- 乱序率 = 0%
- UI 操作无明显延迟

**验收标准**：
- ✅ chunk 丢失率 = 0%
- ✅ chunk 乱序率 = 0%
- ✅ UI 响应性良好（无明显延迟）

**记录数据**：
- 实际总耗时：_______ ms
- 接收 chunk 数量：_______ / 200
- 丢失率：_______ %
- UI 响应性：□ 良好  □ 一般  □ 较差

---

### 任务 4：场景 3 - 大 Payload 测试

**目的**：验证大数据量传输时的内存管理

**配置修改**：

编辑 [extensions/test-ai-interop-worker/src/extension.ts](../../../extensions/test-ai-interop-worker/src/extension.ts#L34)：

```typescript
// 修改为（场景 3）：
const largeText = 'x'.repeat(4096); // 4KB payload
for (let i = 0; i < 50; i++) {
    await api.sendChunk(invocationId, i, `chunk-${i}-${largeText}`);
    await sleep(50);
}
```

编辑 [extensions/test-ai-interop-controller/src/extension.ts](../../../extensions/test-ai-interop-controller/src/extension.ts#L105)：

```typescript
// 修改为：
await waitForCompletion(received, 50, 5000);
```

**步骤**：

1. 保存修改后的文件
2. 重新编译扩展
3. **在测试前**：打开 Activity Monitor（macOS）或 Task Manager（Windows）
4. 记录 VS Code 的初始内存占用：_______ MB
5. 重启 Extension Development Host
6. 执行命令：`Run AI Interop RPC Test`
7. **测试后**：记录 VS Code 的内存占用：_______ MB
8. 等待 1 分钟，再次记录内存占用：_______ MB

**预期结果**：
- 接收到全部 50 个 chunk
- 总耗时约 2500ms
- 测试前后内存占用差异 < 50MB
- 测试后内存无持续上升趋势

**验收标准**：
- ✅ chunk 丢失率 = 0%
- ✅ 内存增量 < 50MB
- ✅ 无内存泄漏（1 分钟后内存稳定或下降）

**记录数据**：
- 接收 chunk 数量：_______ / 50
- 测试前内存：_______ MB
- 测试后内存：_______ MB
- 1 分钟后内存：_______ MB
- 内存增量：_______ MB

---

### 任务 5：场景 4 - 并发调用测试

**目的**：验证多个并发 RPC 调用的性能

**配置修改**：

编辑 [extensions/test-ai-interop-controller/src/extension.ts](../../../extensions/test-ai-interop-controller/src/extension.ts#L84)，替换整个命令处理函数：

```typescript
const command = vscode.commands.registerCommand('test-ai-interop.runTest', async () => {
    const numWorkers = 10;
    const chunksPerWorker = 50;
    const allReceived = new Map<string, number[]>();
    const startTime = Date.now();

    console.log(`[Controller] Starting concurrent test with ${numWorkers} workers`);

    // 记录测试前 CPU（需要人工观察）
    const promises = [];

    for (let w = 0; w < numWorkers; w++) {
        const invocationId = `test-${Date.now()}-${w}`;
        allReceived.set(invocationId, []);

        const promise = (async () => {
            const disposable = api.onDidReceiveChunk((data) => {
                if (data.invocationId === invocationId) {
                    allReceived.get(invocationId)!.push(data.seq);
                }
            });

            try {
                await api.invoke(invocationId);
                await waitForCompletion(allReceived.get(invocationId)!, chunksPerWorker, 5000);
            } finally {
                disposable.dispose();
            }
        })();

        promises.push(promise);
    }

    await Promise.all(promises);

    const endTime = Date.now();
    const totalTime = endTime - startTime;
    let totalReceived = 0;
    let totalExpected = numWorkers * chunksPerWorker;

    for (const received of allReceived.values()) {
        totalReceived += received.length;
    }

    const lossRate = ((totalExpected - totalReceived) / totalExpected) * 100;

    const report = [
        '',
        '=== Concurrent Test Results ===',
        '',
        `Workers: ${numWorkers}`,
        `Chunks per worker: ${chunksPerWorker}`,
        `Total expected: ${totalExpected}`,
        `Total received: ${totalReceived}`,
        `Loss rate: ${lossRate.toFixed(2)}%`,
        `Total time: ${totalTime}ms`,
        '',
        '================================',
        ''
    ].join('\n');

    console.log(report);
    vscode.window.showInformationMessage(`Concurrent test: ${totalReceived}/${totalExpected} chunks, ${lossRate.toFixed(2)}% loss`);
});
```

编辑 [extensions/test-ai-interop-worker/src/extension.ts](../../../extensions/test-ai-interop-worker/src/extension.ts#L34)：

```typescript
// 修改为（场景 4）：
for (let i = 0; i < 50; i++) {
    await api.sendChunk(invocationId, i, `chunk-${i}`);
    await sleep(20);
}
```

**步骤**：

1. 保存修改后的文件
2. 重新编译扩展
3. **在测试前**：打开 Activity Monitor 或 Task Manager
4. 记录 VS Code 主进程的基线 CPU 占用：_______ %
5. 重启 Extension Development Host
6. 执行命令：`Run AI Interop RPC Test`
7. **测试中**：观察 CPU 占用峰值：_______ %
8. 观察控制台是否有 RPC 错误日志

**预期结果**：
- 接收到全部 500 个 chunk（10 workers × 50 chunks）
- 总丢失率 = 0%
- 主线程 CPU 额外占用 < 5%
- 无 RPC 错误日志

**验收标准**：
- ✅ 总体丢失率 = 0%
- ✅ 主线程 CPU 额外占用 < 5%
- ✅ 无 RPC 错误日志

**记录数据**：
- 接收 chunk 数量：_______ / 500
- 基线 CPU：_______ %
- 测试中 CPU 峰值：_______ %
- CPU 增量：_______ %
- RPC 错误：□ 无  □ 有（描述：_____________）

---

## 边界条件测试（可选）

以下测试为可选项，用于验证系统的健壮性：

### 测试 1：空 invocationId

修改 Controller 扩展，传入空字符串：
```typescript
await api.invoke('');
```

**预期**：不应导致崩溃，应有错误处理或忽略

### 测试 2：重复 seq

修改 Worker 扩展，发送重复的 seq：
```typescript
await api.sendChunk(invocationId, 0, 'chunk-0');
await api.sendChunk(invocationId, 0, 'chunk-0-duplicate');
```

**预期**：Controller 能够检测到重复

### 测试 3：超长 text

修改 Worker 扩展，发送 100KB 的 text：
```typescript
const hugeText = 'x'.repeat(100 * 1024);
await api.sendChunk(invocationId, 0, hugeText);
```

**预期**：正常接收，无性能问题

---

## 验收结论

### 通过标准

所有以下条件必须满足才能通过验收：

- [ ] 场景 1：chunk 丢失率 = 0%，乱序率 = 0%，总延迟在合理范围内，UI 无卡顿
- [ ] 场景 2：chunk 丢失率 = 0%，乱序率 = 0%，UI 响应性良好
- [ ] 场景 3：chunk 丢失率 = 0%，内存增量 < 50MB，无内存泄漏
- [ ] 场景 4：总体丢失率 = 0%，CPU 额外占用 < 5%，无 RPC 错误

### 验收结果

- [ ] ✅ **通过** - 所有测试场景均符合标准
- [ ] ❌ **失败** - 存在不符合标准的场景（请在下方记录问题）

### 发现的问题（如有）

**问题 1**：
- 场景：_____________
- 描述：_____________
- 严重程度：□ 高  □ 中  □ 低
- 复现步骤：_____________

**问题 2**：
- 场景：_____________
- 描述：_____________
- 严重程度：□ 高  □ 中  □ 低
- 复现步骤：_____________

---

## 测试环境信息

请填写实际测试环境信息：

- 操作系统：_____________
- OS 版本：_____________
- Node 版本：_____________
- TypeScript 版本：_____________
- VS Code 版本：_____________
- CPU 型号：_____________
- 内存容量：_____________

---

## 附录：常见问题

### Q1: Extension Development Host 无法启动

**A**: 检查是否有编译错误，运行 `npm run compile-check-ts-native` 确认。

### Q2: 扩展未激活

**A**: 检查 `package.json` 中的 `activationEvents` 配置，确保为 `onStartupFinished`。

### Q3: 找不到测试命令

**A**: 确认 Controller 扩展的 `package.json` 中正确注册了 `test-ai-interop.runTest` 命令。

### Q4: 控制台无输出

**A**: 打开 Developer Tools（Help > Toggle Developer Tools），切换到 Console 标签。

### Q5: 如何重置测试环境

**A**: 关闭 Extension Development Host，删除 `extensions/*/out/` 目录，重新编译。

---

**验收员签名**：_____________

**验收日期**：_____________
