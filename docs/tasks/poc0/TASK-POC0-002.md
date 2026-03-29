# 任务卡：TASK-POC0-002

## 任务信息
- **任务编号**：TASK-POC0-002
- **任务名称**：CancellationToken 穿透验证
- **对应验收**：TEST-POC0-002
- **开发 AI**：AI-Dev-002
- **验收 AI**：AI-QA-002
- **依赖任务**：TASK-POC0-001（可复用其 RPC 基础设施）
- **优先级**：高
- **状态**：⬜ 待开始

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目的 AI Interop 平台能力开发。本任务是 PoC-0 技术预研阶段的第二个验证点，目标是验证 CancellationToken 能否从 controller 扩展穿透到 worker 扩展的 handler，且在 200ms 内生效。

**核心风险**：CancellationToken 在跨 RPC 边界传递时可能失效或延迟。

**影响范围**：
- 用户体验严重受损（点击取消无响应）
- 资源浪费（模型继续推理、CLI 进程继续运行）
- 审计记录混乱（状态不一致）

## 任务目标

在 TASK-POC0-001 的基础上，扩展 RPC Shape 以支持 CancellationToken 传递和 cancel 操作，验证 cancel 信号能够在 200ms 内从 controller 穿透到 worker 并生效。

## 必须先阅读的文件

1. [docs/ai-interop/00-poc-0-technical-validation.md](../../ai-interop/00-poc-0-technical-validation.md) 第 4 节
   - 了解 CancellationToken 穿透的验证计划和通过标准
2. [docs/tasks/poc0/TASK-POC0-001.md](TASK-POC0-001.md)
   - 了解已实现的 RPC 基础设施，本任务将在此基础上扩展
3. [src/vs/base/common/cancellation.ts](../../../src/vs/base/common/cancellation.ts)
   - 学习 VS Code 的 CancellationToken 和 CancellationTokenSource 实现
4. [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts)
   - 查看现有的 RPC Shape 定义，了解如何传递 CancellationToken

## 实现位置

### 修改文件

1. **RPC Shape 扩展**：
   - 文件：`src/vs/workbench/api/common/extHost.protocol.ts`
   - 操作：扩展 TASK-POC0-001 中定义的 Shape，添加 cancel 方法和 token 参数

2. **MainThread Customer 扩展**：
   - 文件：`src/vs/workbench/api/browser/mainThreadTestAiInterop.ts`
   - 操作：添加 `$cancel` 方法实现，管理 CancellationTokenSource

3. **ExtHost API 扩展**：
   - 文件：`src/vs/workbench/api/common/extHostTestAiInterop.ts`
   - 操作：修改 `$onInvoke` 方法签名，添加 CancellationToken 参数

4. **Worker 扩展修改**：
   - 文件：`extensions/test-ai-interop-worker/src/extension.ts`
   - 操作：修改 handler 以接收和检查 CancellationToken

5. **Controller 扩展修改**：
   - 文件：`extensions/test-ai-interop-controller/src/extension.ts`
   - 操作：添加 cancel 测试场景，统计 cancel 生效时间

## 实现要求

### 1. RPC Shape 扩展

在 `extHost.protocol.ts` 中修改现有 Shape：

```typescript
export interface MainThreadTestAiInteropShape {
	$acceptChunk(invocationId: string, seq: number, text: string): void;
	$cancel(invocationId: string): void; // 新增
}

export interface ExtHostTestAiInteropShape {
	$onInvoke(invocationId: string, token: CancellationToken): void; // 增加 token 参数
}
```

- 添加 `$cancel` 方法用于从主线程通知 ExtHost 取消操作
- 修改 `$onInvoke` 方法签名，添加 `CancellationToken` 参数

### 2. MainThread Customer 扩展

在 `mainThreadTestAiInterop.ts` 中：

```typescript
export class MainThreadTestAiInterop implements MainThreadTestAiInteropShape {
	private readonly _cancellationTokenSources = new Map<string, CancellationTokenSource>();

	$cancel(invocationId: string): void {
		const cts = this._cancellationTokenSources.get(invocationId);
		if (cts) {
			cts.cancel();
			this.logService.info(`[MainThreadTestAiInterop] Canceled invocation: ${invocationId}`);
		}
	}

	// 在发起调用时创建 CancellationTokenSource
	async invoke(invocationId: string): Promise<void> {
		const cts = new CancellationTokenSource();
		this._cancellationTokenSources.set(invocationId, cts);

		try {
			await this._proxy.$onInvoke(invocationId, cts.token);
		} finally {
			this._cancellationTokenSources.delete(invocationId);
			cts.dispose();
		}
	}
}
```

- 维护一个 Map 存储每个 invocationId 对应的 CancellationTokenSource
- 实现 `$cancel` 方法，调用对应的 `cts.cancel()`
- 在 `invoke` 方法中创建 CancellationTokenSource 并传递给 ExtHost
- 调用完成后清理 CancellationTokenSource

### 3. ExtHost API 扩展

在 `extHostTestAiInterop.ts` 中：

```typescript
export class ExtHostTestAiInterop {
	private readonly _onInvoke = new Emitter<{ invocationId: string; token: CancellationToken }>();
	readonly onInvoke = this._onInvoke.event;

	$onInvoke(invocationId: string, token: CancellationToken): void {
		this._onInvoke.fire({ invocationId, token });
	}
}
```

- 修改 `onInvoke` 事件的数据结构，包含 `invocationId` 和 `token`
- 修改 `$onInvoke` 方法签名，接收 CancellationToken 参数

### 4. Worker 扩展修改

在 `extensions/test-ai-interop-worker/src/extension.ts` 中：

```typescript
export function activate(context: vscode.ExtensionContext) {
	const api = vscode.extensions.getExtension('vscode.test-ai-interop')?.exports;

	api.onInvoke(async ({ invocationId, token }: { invocationId: string; token: vscode.CancellationToken }) => {
		console.log(`[Worker] Starting invocation: ${invocationId}`);

		// 准备发送 1000 个 chunk，但会响应 cancel
		for (let i = 0; i < 1000; i++) {
			// 关键：检查 cancel 状态
			if (token.isCancellationRequested) {
				console.log(`[Worker] Canceled at chunk ${i}, invocationId: ${invocationId}`);
				return;
			}

			await api.sendChunk(invocationId, i, `chunk-${i}`);
			await sleep(20);
		}

		console.log(`[Worker] Completed invocation: ${invocationId}`);
	});
}
```

- 修改 handler 以接收包含 token 的对象
- 在每次发送 chunk 前检查 `token.isCancellationRequested`
- 如果 cancel 被请求，立即返回并记录停止位置
- 将 chunk 总数从 100 改为 1000，以便有足够时间测试 cancel

### 5. Controller 扩展修改

在 `extensions/test-ai-interop-controller/src/extension.ts` 中添加三个 cancel 测试场景：

#### 场景 1：基础取消

```typescript
vscode.commands.registerCommand('test-ai-interop.testCancelBasic', async () => {
	const invocationId = `cancel-basic-${Date.now()}`;
	const received: number[] = [];
	let lastChunkTime = 0;

	// 订阅 chunk 接收事件
	const disposable = api.onChunkReceived((data: any) => {
		if (data.invocationId === invocationId) {
			received.push(data.seq);
			lastChunkTime = Date.now();
		}
	});

	// 发起调用
	const invokePromise = api.invoke(invocationId);

	// 等待接收到第 50 个 chunk 后取消
	await waitForChunks(received, 50, 5000);

	const cancelTime = Date.now();
	console.log(`[Controller] Canceling at chunk ${received.length}, time: ${cancelTime}`);
	await api.cancel(invocationId);

	// 等待 worker 停止（最多 1 秒）
	await sleep(1000);
	const stopTime = Date.now();

	// 统计结果
	const cancelLatency = stopTime - cancelTime;
	const chunksAfterCancel = received.filter(seq => seq > 50).length;

	console.log(`[Controller] Cancel latency: ${cancelLatency}ms`);
	console.log(`[Controller] Chunks received after cancel: ${chunksAfterCancel}`);
	console.log(`[Controller] Last chunk seq: ${received[received.length - 1]}`);
	console.log(`[Controller] Total chunks: ${received.length}`);

	disposable.dispose();
});
```

#### 场景 2：立即取消

```typescript
vscode.commands.registerCommand('test-ai-interop.testCancelImmediate', async () => {
	const invocationId = `cancel-immediate-${Date.now()}`;
	const received: number[] = [];

	const disposable = api.onChunkReceived((data: any) => {
		if (data.invocationId === invocationId) {
			received.push(data.seq);
		}
	});

	// 发起调用
	const invokePromise = api.invoke(invocationId);

	// 立即取消（不等待任何 chunk）
	const cancelTime = Date.now();
	await api.cancel(invocationId);

	// 等待 500ms 确保没有 chunk 到达
	await sleep(500);
	const stopTime = Date.now();

	const cancelLatency = stopTime - cancelTime;

	console.log(`[Controller] Immediate cancel latency: ${cancelLatency}ms`);
	console.log(`[Controller] Chunks received: ${received.length}`);
	console.log(`[Controller] Expected: 0 or very few chunks`);

	disposable.dispose();
});
```

#### 场景 3：并发取消

```typescript
vscode.commands.registerCommand('test-ai-interop.testCancelConcurrent', async () => {
	const numInvocations = 10;
	const invocations: Array<{
		id: string;
		received: number[];
		cancelTime: number;
		stopTime: number;
	}> = [];

	// 创建 10 个并发调用
	for (let i = 0; i < numInvocations; i++) {
		const invocationId = `cancel-concurrent-${i}-${Date.now()}`;
		const received: number[] = [];

		invocations.push({
			id: invocationId,
			received,
			cancelTime: 0,
			stopTime: 0
		});

		// 订阅 chunk 接收
		api.onChunkReceived((data: any) => {
			if (data.invocationId === invocationId) {
				received.push(data.seq);
			}
		});

		// 发起调用
		api.invoke(invocationId);
	}

	// 等待所有调用都接收到至少 20 个 chunk
	await Promise.all(invocations.map(inv =>
		waitForChunks(inv.received, 20, 5000)
	));

	// 随机时间点取消所有调用
	for (const inv of invocations) {
		const randomDelay = Math.random() * 500; // 0-500ms 随机延迟
		await sleep(randomDelay);

		inv.cancelTime = Date.now();
		await api.cancel(inv.id);
	}

	// 等待所有 worker 停止
	await sleep(1000);

	// 统计结果
	let totalLatency = 0;
	let successCount = 0;

	for (const inv of invocations) {
		inv.stopTime = Date.now();
		const latency = inv.stopTime - inv.cancelTime;
		totalLatency += latency;

		if (latency < 200) {
			successCount++;
		}

		console.log(`[Controller] Invocation ${inv.id}: latency=${latency}ms, chunks=${inv.received.length}`);
	}

	const avgLatency = totalLatency / numInvocations;
	const successRate = (successCount / numInvocations) * 100;

	console.log(`[Controller] Average cancel latency: ${avgLatency}ms`);
	console.log(`[Controller] Success rate (< 200ms): ${successRate}%`);
});
```

### 6. 工具函数

添加以下工具函数：

```typescript
async function waitForChunks(
	received: number[],
	count: number,
	timeout: number
): Promise<void> {
	const startTime = Date.now();
	while (received.length < count && Date.now() - startTime < timeout) {
		await sleep(50);
	}
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
```

## 不需要实现的部分

- **不需要实现完整的状态机**：本任务只验证 cancel 穿透，不需要实现完整的 invocation 状态管理（pending/running/completed/canceled）
- **不需要实现审计记录**：审计功能在后续阶段实现，本任务只需要在日志中记录 cancel 事件
- **不需要实现 UI 界面**：测试结果输出到控制台即可
- **不需要持久化 cancel 状态**：cancel 状态只需要在内存中维护
- **不需要实现超时机制**：超时功能不在本任务范围内

## 自验证清单（开发 AI 完成后自查）

### 代码质量
- [ ] TypeScript 编译通过（`npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 [CLAUDE.md](../../../.claude/CLAUDE.md)）
- [ ] 正确使用 VS Code 的 CancellationToken 和 CancellationTokenSource
- [ ] 资源正确清理（CancellationTokenSource 正确 dispose）

### 功能完整性
- [ ] RPC Shape 正确扩展（添加 `$cancel` 方法和 token 参数）
- [ ] MainThread Customer 正确管理 CancellationTokenSource
- [ ] ExtHost API 正确传递 CancellationToken
- [ ] Worker 扩展正确检查 `token.isCancellationRequested`
- [ ] Controller 扩展实现三个测试场景

### Cancel 功能
- [ ] 场景 1（基础取消）可以正常运行
- [ ] 场景 2（立即取消）可以正常运行
- [ ] 场景 3（并发取消）可以正常运行
- [ ] Cancel 信号能够从 Controller 传递到 Worker
- [ ] Worker 收到 cancel 后立即停止发送 chunk

### 日志输出
- [ ] MainThread 记录 cancel 操作日志
- [ ] Worker 记录收到 cancel 的位置（停止在第几个 chunk）
- [ ] Controller 输出 cancel 延迟统计
- [ ] 日志包含 invocationId 便于追踪

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-POC0-002）
4. 提供三个测试场景的控制台输出日志

## 实施记录

**开发 AI**：[待填写]
**完成时间**：[待填写]

**实现要点**：
- [待填写]

**遇到的问题**：
- [待填写]

**测试结果摘要**：
- 场景 1（基础取消）：[待填写]
- 场景 2（立即取消）：[待填写]
- 场景 3（并发取消）：[待填写]
