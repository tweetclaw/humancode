# 任务卡：TASK-POC0-001

## 任务信息
- **任务编号**：TASK-POC0-001
- **任务名称**：RPC 流式传输性能验证
- **对应验收**：TEST-POC0-001
- **开发 AI**：AI-Dev-001
- **验收 AI**：AI-QA-001
- **依赖任务**：无
- **优先级**：高（最高优先级，架构级风险验证）
- **状态**：⬜ 待开始

## 任务背景

你是一个 VS Code 源码级别的 TypeScript 工程师。你正在参与 HumanCode 项目的 AI Interop 平台能力开发。本任务是 PoC-0 技术预研阶段的第一个验证点，目标是验证 VS Code 的 MainThread ↔ ExtHost RPC 机制能否承载高频流式 AI chunk 传输。

**核心风险**：VS Code RPC 基于 JSON-RPC 消息传递，设计初衷不是为高频流式场景设计。如果无法支撑，整个 AI Interop 架构需要重新设计。

**影响范围**：如果性能不达标，用户体验会严重受损（AI 响应卡顿、延迟），可能需要改用 SharedArrayBuffer、WebSocket 等替代方案。

## 任务目标

实现最小 RPC bridge 骨架和两个测试扩展，验证 VS Code RPC 机制能够承载高频流式 AI chunk 传输，且不会导致延迟累积、丢失或 UI 卡顿。

## 必须先阅读的文件

1. [docs/ai-interop/00-poc-0-technical-validation.md](../../ai-interop/00-poc-0-technical-validation.md)
   - 了解完整的验证计划、通过标准和失败应对方案
2. [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts)
   - 学习 VS Code RPC Shape 的定义规范和命名约定
3. [src/vs/workbench/api/browser/mainThreadLanguageModels.ts](../../../src/vs/workbench/api/browser/mainThreadLanguageModels.ts)
   - 参考现有的流式 AI 响应处理实现模式
4. [docs/ai-interop/02-core-architecture.md](../../ai-interop/02-core-architecture.md)
   - 理解 AI Interop 平台的整体架构和模块职责

## 实现位置

### 新建文件

1. **RPC Shape 定义**：
   - 文件：`src/vs/workbench/api/common/extHost.protocol.ts`
   - 操作：在现有文件中添加最小 RPC Shape 定义

2. **MainThread Customer**：
   - 文件：`src/vs/workbench/api/browser/mainThreadTestAiInterop.ts`
   - 操作：新建文件，实现主线程侧的测试 RPC customer

3. **ExtHost API**：
   - 文件：`src/vs/workbench/api/common/extHostTestAiInterop.ts`
   - 操作：新建文件，实现扩展宿主侧的测试 API

4. **测试扩展 - Worker**：
   - 目录：`extensions/test-ai-interop-worker/`
   - 文件：`package.json`, `src/extension.ts`
   - 操作：创建 Worker 扩展，接收调用并流式发送 chunk

5. **测试扩展 - Controller**：
   - 目录：`extensions/test-ai-interop-controller/`
   - 文件：`package.json`, `src/extension.ts`
   - 操作：创建 Controller 扩展，发起调用并统计接收情况

## 实现要求

### 1. RPC Shape 定义

在 `extHost.protocol.ts` 中添加：

```typescript
export interface MainThreadTestAiInteropShape {
	$acceptChunk(invocationId: string, seq: number, text: string): void;
}

export interface ExtHostTestAiInteropShape {
	$onInvoke(invocationId: string): void;
}
```

- 使用 VS Code 标准的 `$` 前缀命名约定
- `seq` 用于检测丢失和乱序
- `invocationId` 用于关联同一次调用的多个 chunk

### 2. MainThread Customer 实现

在 `mainThreadTestAiInterop.ts` 中：

```typescript
export class MainThreadTestAiInterop implements MainThreadTestAiInteropShape {
	constructor(
		extHostContext: IExtHostContext,
		@ILogService private readonly logService: ILogService
	) {
		this._proxy = extHostContext.getProxy(ExtHostContext.ExtHostTestAiInterop);
	}

	$acceptChunk(invocationId: string, seq: number, text: string): void {
		// 记录接收时间戳
		// 触发事件通知 Controller 扩展
		// 记录到统计数据
	}
}
```

- 使用依赖注入获取 `ILogService`
- 实现 `$acceptChunk` 方法接收来自 ExtHost 的 chunk
- 记录每个 chunk 的接收时间戳用于延迟统计
- 维护一个 Map 存储每个 invocationId 的统计数据

### 3. ExtHost API 实现

在 `extHostTestAiInterop.ts` 中：

```typescript
export class ExtHostTestAiInterop {
	private readonly _onInvoke = new Emitter<string>();
	readonly onInvoke = this._onInvoke.event;

	constructor(
		mainContext: IMainContext
	) {
		this._proxy = mainContext.getProxy(MainContext.MainThreadTestAiInterop);
	}

	$onInvoke(invocationId: string): void {
		this._onInvoke.fire(invocationId);
	}

	async sendChunk(invocationId: string, seq: number, text: string): Promise<void> {
		return this._proxy.$acceptChunk(invocationId, seq, text);
	}
}
```

- 使用 VS Code 的 `Emitter` 实现事件机制
- 提供 `sendChunk` 方法供 Worker 扩展调用
- 实现 `$onInvoke` 方法接收来自主线程的调用通知

### 4. Worker 扩展实现

在 `extensions/test-ai-interop-worker/src/extension.ts` 中：

```typescript
export function activate(context: vscode.ExtensionContext) {
	const api = vscode.extensions.getExtension('vscode.test-ai-interop')?.exports;

	api.onInvoke(async (invocationId: string) => {
		// 连续发送 100 个 chunk，每 20ms 一个
		for (let i = 0; i < 100; i++) {
			await api.sendChunk(invocationId, i, `chunk-${i}`);
			await sleep(20);
		}
	});
}

function sleep(ms: number): Promise<void> {
	return new Promise(resolve => setTimeout(resolve, ms));
}
```

- 监听 `onInvoke` 事件
- 收到调用后连续发送 100 个 chunk
- 每个 chunk 间隔 20ms
- chunk 内容格式：`chunk-${seq}`

### 5. Controller 扩展实现

在 `extensions/test-ai-interop-controller/src/extension.ts` 中：

```typescript
export function activate(context: vscode.ExtensionContext) {
	const api = vscode.extensions.getExtension('vscode.test-ai-interop')?.exports;

	const command = vscode.commands.registerCommand('test-ai-interop.runTest', async () => {
		const invocationId = `test-${Date.now()}`;
		const received: number[] = [];
		const startTime = Date.now();

		// 订阅 chunk 接收事件
		const disposable = api.onChunkReceived((data: any) => {
			if (data.invocationId === invocationId) {
				received.push(data.seq);
			}
		});

		// 发起调用
		await api.invoke(invocationId);

		// 等待接收完成（最多 5 秒）
		await waitForCompletion(received, 100, 5000);

		// 统计结果
		const endTime = Date.now();
		const missing = findMissingSeq(received);
		const outOfOrder = checkOrder(received);

		// 输出统计报告
		console.log(`Total time: ${endTime - startTime}ms`);
		console.log(`Received: ${received.length}/100`);
		console.log(`Loss rate: ${(1 - received.length / 100) * 100}%`);
		console.log(`Out of order: ${outOfOrder.length}`);
		console.log(`Missing seq: ${missing.join(', ')}`);

		disposable.dispose();
	});

	context.subscriptions.push(command);
}
```

- 注册命令 `test-ai-interop.runTest` 用于触发测试
- 生成唯一的 `invocationId`
- 订阅 chunk 接收事件并记录 seq
- 统计丢失率、乱序率、总延迟
- 输出详细的统计报告

### 6. 测试场景实现

实现以下四个测试场景（可以通过命令参数或配置切换）：

#### 场景 1：基础流式传输
- Worker 每 20ms 发送 1 个 chunk，共 100 个
- 统计：丢失率、乱序率、总延迟

#### 场景 2：高频传输
- Worker 每 10ms 发送 1 个 chunk，共 200 个
- 统计：丢失率、乱序率、UI 响应性

#### 场景 3：大 payload
- Worker 每 50ms 发送 1 个 4KB chunk，共 50 个
- 统计：丢失率、内存占用

#### 场景 4：并发调用
- 10 个 worker 同时发送，每个 50 chunk
- 统计：总体丢失率、主线程 CPU 占用

### 7. 统计工具函数

实现以下工具函数：

```typescript
function findMissingSeq(received: number[]): number[] {
	const sorted = [...received].sort((a, b) => a - b);
	const missing: number[] = [];
	for (let i = 0; i < 100; i++) {
		if (!sorted.includes(i)) {
			missing.push(i);
		}
	}
	return missing;
}

function checkOrder(received: number[]): number[] {
	const outOfOrder: number[] = [];
	for (let i = 1; i < received.length; i++) {
		if (received[i] < received[i - 1]) {
			outOfOrder.push(i);
		}
	}
	return outOfOrder;
}

async function waitForCompletion(
	received: number[],
	expected: number,
	timeout: number
): Promise<void> {
	const startTime = Date.now();
	while (received.length < expected && Date.now() - startTime < timeout) {
		await sleep(100);
	}
}
```

## 不需要实现的部分

- **不需要实现完整的 AI Interop Bus**：本任务只验证 RPC 性能，不需要实现完整的 endpoint 注册、路由、权限等功能
- **不需要实现 UI 界面**：统计结果输出到控制台即可，不需要创建专门的视图面板
- **不需要持久化测试结果**：测试结果只需要在控制台输出，不需要保存到文件或数据库
- **不需要实现 CancellationToken**：cancel 功能在验证点 2 中实现，本任务不涉及
- **不需要实现跨 Host 路由**：本任务只验证 local Extension Host，跨 Host 功能在验证点 3 中实现
- **不需要注册到 DI 容器**：测试代码可以独立运行，不需要集成到 Workbench 服务体系

## 自验证清单（开发 AI 完成后自查）

### 代码质量
- [ ] TypeScript 编译通过（`npm run compile-check-ts-native`）
- [ ] 代码符合 VS Code 编码规范（见 [CLAUDE.md](../../../.claude/CLAUDE.md)）
- [ ] 使用 VS Code 标准的依赖注入模式
- [ ] RPC Shape 命名符合 VS Code 约定（`$` 前缀）

### 功能完整性
- [ ] RPC Shape 定义完整且符合规范
- [ ] MainThread Customer 正确实现 `$acceptChunk` 方法
- [ ] ExtHost API 正确实现 `$onInvoke` 和 `sendChunk` 方法
- [ ] Worker 扩展能够接收调用并流式发送 chunk
- [ ] Controller 扩展能够发起调用并统计接收情况
- [ ] 四个测试场景全部实现

### 统计功能
- [ ] 能够统计 chunk 丢失率
- [ ] 能够检测 chunk 乱序
- [ ] 能够计算往返延迟（p95）
- [ ] 能够输出详细的统计报告

### 测试验证
- [ ] 场景 1（基础流式传输）可以正常运行
- [ ] 场景 2（高频传输）可以正常运行
- [ ] 场景 3（大 payload）可以正常运行
- [ ] 场景 4（并发调用）可以正常运行
- [ ] 统计数据准确可靠

## 完成后操作

1. 在任务跟踪表中将状态改为 ⏸️ 待验收
2. 在"实施记录"区域补充实现要点和遇到的问题
3. 通知验收 AI 开始验收（引用验收任务编号 TEST-POC0-001）
4. 提供测试运行的控制台输出截图或日志文件

## 实施记录

**开发 AI**：[待填写]
**完成时间**：[待填写]

**实现要点**：
- [待填写]

**遇到的问题**：
- [待填写]

**测试结果摘要**：
- [待填写]
