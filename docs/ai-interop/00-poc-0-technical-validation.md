# PoC-0: 技术预研验证计划

## 1. 文档目标

本文档定义正式开发前的技术预研阶段,通过三个关键技术点的验证,确保 AI Interop 平台架构的可行性。**只有 PoC-0 全部通过,才能进入 PoC-1 正式开发**。

## 2. 验证原则

- **快速失败**: 优先验证最高风险点,尽早发现架构级阻塞问题
- **最小实现**: 仅实现验证所需的最小代码,不追求完整性
- **量化标准**: 所有验证必须有明确的通过/失败标准
- **独立验证**: 三个验证点可并行进行,互不依赖

## 3. 验证点 1: RPC 流式传输性能 (最高优先级)

### 3.1 验证目标

证明 VS Code 的 MainThread ↔ ExtHost RPC 机制能够承载高频流式 AI chunk 传输,且不会导致延迟累积、丢失或 UI 卡顿。

### 3.2 风险分析

**核心风险**: VS Code RPC 基于 JSON-RPC 消息传递,设计初衷不是为高频流式场景设计

**影响范围**:
- 如果无法支撑,整个架构需要重新设计(如改用 SharedArrayBuffer、WebSocket 等)
- 如果性能不达标,用户体验会严重受损(AI 响应卡顿、延迟)

### 3.3 实现方案

#### 最小 RPC Shape 定义

在 `src/vs/workbench/api/common/extHost.protocol.ts` 中添加:

```typescript
export interface MainThreadTestAiInteropShape {
	$acceptChunk(invocationId: string, seq: number, text: string): void;
}

export interface ExtHostTestAiInteropShape {
	$onInvoke(invocationId: string): void;
}
```

#### 测试扩展实现

**Worker 扩展** (`test-worker`):
```typescript
// 接收调用,连续发送 100 个 chunk,每 20ms 一个
async function handleInvoke(invocationId: string) {
	for (let i = 0; i < 100; i++) {
		await mainThreadProxy.$acceptChunk(invocationId, i, `chunk-${i}`);
		await sleep(20);
	}
}
```

**Controller 扩展** (`test-controller`):
```typescript
// 发起调用,统计接收情况
const received: number[] = [];
const startTime = Date.now();

await extHostProxy.$onInvoke('test-invocation-1');

// 统计结果
const endTime = Date.now();
const missing = findMissingSeq(received);
const outOfOrder = checkOrder(received);
```

### 3.4 验证步骤

1. 创建最小 RPC bridge 骨架
2. 实现两个测试扩展
3. 在 Extension Development Host 中运行
4. 执行以下测试场景:

#### 场景 1: 基础流式传输
- Worker 每 20ms 发送 1 个 chunk,共 100 个
- 统计: 丢失率、乱序率、总延迟

#### 场景 2: 高频传输
- Worker 每 10ms 发送 1 个 chunk,共 200 个
- 统计: 丢失率、乱序率、UI 响应性

#### 场景 3: 大 payload
- Worker 每 50ms 发送 1 个 4KB chunk,共 50 个
- 统计: 丢失率、内存占用

#### 场景 4: 并发调用
- 10 个 worker 同时发送,每个 50 chunk
- 统计: 总体丢失率、主线程 CPU 占用

### 3.5 通过标准

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| chunk 丢失率 | 0% | 对比发送与接收的 seq |
| chunk 乱序率 | 0% | 检查 seq 单调递增 |
| 单次往返延迟 p95 | < 100ms | 记录每个 chunk 的发送/接收时间戳 |
| UI 卡顿 | 无明显卡顿 | 手动测试:发送过程中点击菜单、切换文件 |
| 主线程 CPU 额外占用 | < 5% | 使用 Activity Monitor / Task Manager |
| 内存泄漏 | 无持续上升 | 连续运行 5 分钟,观察内存曲线 |

### 3.6 失败应对

如果验证失败,考虑以下备选方案:

1. **批量传输**: 改为 `$acceptChunks(chunks: Chunk[])`,减少 RPC 调用次数
2. **背压控制**: 增加流控机制,限制未确认 chunk 数量
3. **架构调整**: 考虑使用 SharedArrayBuffer 或 MessageChannel
4. **降级方案**: 仅支持低频场景,高频场景使用轮询

### 3.7 预计工时

- 实现: 2-3 天
- 测试与调优: 1-2 天
- **总计: 3-5 天**

---

## 4. 验证点 2: CancellationToken 穿透

### 4.1 验证目标

证明 cancel 信号可以从 controller 扩展穿透到 worker 扩展的 handler,且在 200ms 内生效。

### 4.2 风险分析

**核心风险**: CancellationToken 在跨 RPC 边界传递时可能失效或延迟

**影响范围**:
- 用户体验严重受损(点击取消无响应)
- 资源浪费(模型继续推理、CLI 进程继续运行)
- 审计记录混乱(状态不一致)

### 4.3 实现方案

#### RPC Shape 扩展

```typescript
export interface MainThreadTestAiInteropShape {
	$acceptChunk(invocationId: string, seq: number, text: string): void;
	$cancel(invocationId: string): void; // 新增
}

export interface ExtHostTestAiInteropShape {
	$onInvoke(invocationId: string, token: CancellationToken): void; // 增加 token
}
```

#### Worker Handler 实现

```typescript
async function handleInvoke(invocationId: string, token: CancellationToken) {
	for (let i = 0; i < 1000; i++) {
		// 关键: 检查 cancel 状态
		if (token.isCancellationRequested) {
			console.log(`Canceled at chunk ${i}`);
			return;
		}

		await mainThreadProxy.$acceptChunk(invocationId, i, `chunk-${i}`);
		await sleep(20);
	}
}
```

#### Controller 实现

```typescript
const cts = new CancellationTokenSource();

// 启动调用
extHostProxy.$onInvoke('test-invocation-1', cts.token);

// 在第 50 个 chunk 后取消
setTimeout(() => {
	const cancelTime = Date.now();
	mainThreadProxy.$cancel('test-invocation-1');

	// 统计取消生效时间
	waitForStop().then(stopTime => {
		console.log(`Cancel latency: ${stopTime - cancelTime}ms`);
	});
}, 1000);
```

### 4.4 验证步骤

#### 场景 1: 基础取消
- Worker 准备发送 1000 个 chunk
- Controller 在第 50 个 chunk 后取消
- 验证: worker 在 200ms 内停止发送

#### 场景 2: 立即取消
- Controller 发起调用后立即取消
- 验证: worker 收到 cancel,未发送任何 chunk

#### 场景 3: 并发取消
- 10 个并发调用,随机时间点取消
- 验证: 所有 cancel 都正确生效

### 4.5 通过标准

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| Cancel 生效时间 | < 200ms | 记录 cancel 调用到 worker 停止的时间差 |
| Cancel 成功率 | 100% | 所有测试场景 worker 都正确停止 |
| 状态一致性 | 100% | invocation 终态正确标记为 canceled |

### 4.6 失败应对

如果验证失败:

1. **轮询优化**: 减少 `isCancellationRequested` 检查间隔
2. **主动推送**: 改为 `$onCancel(invocationId)` 回调模式
3. **超时兜底**: 增加 timeout 机制,强制终止

### 4.7 预计工时

- 实现: 1-2 天
- 测试: 1 天
- **总计: 2-3 天**

---

## 5. 验证点 3: 跨 Host 路由与隔离

### 5.1 验证目标

证明平台可以正确识别 endpoint 的 hostKind 和 remoteAuthority,并在错配时拒绝调用。

### 5.2 风险分析

**核心风险**: VS Code 存在 local/remote/web 多种 Extension Host,路由逻辑复杂

**影响范围**:
- 数据泄露风险(remote A 访问 remote B 的会话)
- 安全漏洞(web host 执行 CLI 命令)
- 跨 host 协作场景无法实现

### 5.3 实现方案

#### Endpoint Descriptor 扩展

```typescript
export interface EndpointDescriptorDto {
	id: string;
	extensionId: string;
	hostKind: 'local' | 'remote' | 'web'; // 新增
	remoteAuthority?: string; // 新增
}
```

#### 路由逻辑

```typescript
function canRoute(caller: EndpointDescriptor, target: EndpointDescriptor): boolean {
	// 规则 1: hostKind 必须兼容
	if (caller.hostKind === 'web' && target.hostKind === 'local') {
		return false; // web 不能调用 local
	}

	// 规则 2: remoteAuthority 必须匹配
	if (caller.remoteAuthority !== target.remoteAuthority) {
		return false;
	}

	return true;
}
```

### 5.4 验证步骤

#### 场景 1: 同 host 调用
- local → local: 应成功
- remote(A) → remote(A): 应成功

#### 场景 2: 跨 host 调用
- local → remote: 应成功(如果策略允许)
- remote → local: 应成功(如果策略允许)

#### 场景 3: 错配拒绝
- remote(A) → remote(B): 应拒绝,错误码 `REMOTE_AUTHORITY_MISMATCH`
- web → local: 应拒绝,错误码 `HOST_KIND_UNSUPPORTED`

### 5.5 通过标准

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| 匹配路由成功率 | 100% | 同 host / 兼容 host 调用成功 |
| 错配拒绝率 | 100% | remoteAuthority 不匹配时拒绝 |
| 错误码准确性 | 100% | 返回正确的错误码 |
| 审计记录完整性 | 100% | 拒绝原因写入审计日志 |

### 5.6 失败应对

如果验证失败:

1. **简化策略**: Phase 1 仅支持 local host,remote/web 作为 Phase 2
2. **显式配置**: 要求用户在 settings 中显式配置跨 host 策略
3. **降级方案**: 跨 host 调用改为异步队列模式

### 5.7 预计工时

- 实现: 2-3 天
- 测试: 1 天
- **总计: 3-4 天**

---

## 6. 验证总体计划

### 6.1 时间安排

| 阶段 | 工作内容 | 工时 | 依赖 |
|------|----------|------|------|
| Week 1 | 验证点 1: RPC 流式传输 | 3-5 天 | 无 |
| Week 1-2 | 验证点 2: Cancel 穿透 | 2-3 天 | 无 |
| Week 2 | 验证点 3: 跨 Host 路由 | 3-4 天 | 无 |
| Week 2 | 总结与决策 | 1 天 | 全部验证完成 |

**总计: 9-13 天 (约 2 周)**

### 6.2 并行策略

三个验证点可以并行进行:
- 开发者 A: 验证点 1 (RPC 流式传输)
- 开发者 B: 验证点 2 (Cancel 穿透)
- 开发者 C: 验证点 3 (跨 Host 路由)

### 6.3 Go/No-Go 决策

#### Go (进入 PoC-1)
- 三个验证点**全部通过**
- 性能指标达标
- 无架构级阻塞问题

#### No-Go (调整方案)
- 任一验证点失败且无可行备选方案
- 性能指标严重不达标(如延迟 > 500ms)
- 发现架构级设计缺陷

---

## 7. 验证环境

### 7.1 开发环境
- VS Code Insiders (最新版)
- Node.js 18+
- TypeScript 5.3+

### 7.2 测试工具
- Extension Development Host
- Chrome DevTools (性能分析)
- Activity Monitor / Task Manager (资源监控)

### 7.3 测试扩展
创建两个最小测试扩展:
- `test-ai-interop-controller`: 发起调用,统计结果
- `test-ai-interop-worker`: 接收调用,流式返回

---

## 8. 验证产出

### 8.1 必须交付
1. **验证报告**: 每个验证点的测试结果、性能数据、通过/失败判定
2. **测试代码**: 可复现的测试扩展与测试脚本
3. **性能基线**: 延迟、吞吐、资源占用的基线数据
4. **风险清单**: 发现的问题与备选方案

### 8.2 可选交付
1. 性能优化建议
2. 架构调整建议
3. Phase 1 范围调整建议

---

## 9. 成功标准

PoC-0 成功必须同时满足:

1. ✅ RPC 流式传输: 100 chunk 无丢失,p95 延迟 < 100ms,无 UI 卡顿
2. ✅ Cancel 穿透: 200ms 内生效,100% 成功率
3. ✅ 跨 Host 路由: 匹配时成功,错配时拒绝,错误码准确

**只有三个验证点全部通过,才能进入 PoC-1 正式开发阶段。**

---

## 10. 附录: 快速验证脚本

### 10.1 RPC 性能测试

```typescript
// test-rpc-performance.ts
async function testRPCPerformance() {
	const results = {
		sent: 0,
		received: 0,
		missing: [] as number[],
		latencies: [] as number[]
	};

	// 发送 100 个 chunk
	for (let i = 0; i < 100; i++) {
		const start = Date.now();
		await proxy.$acceptChunk('test', i, `chunk-${i}`);
		results.latencies.push(Date.now() - start);
		results.sent++;
	}

	// 统计
	console.log('Sent:', results.sent);
	console.log('Received:', results.received);
	console.log('Loss rate:', (1 - results.received / results.sent) * 100 + '%');
	console.log('P95 latency:', percentile(results.latencies, 0.95) + 'ms');
}
```

### 10.2 Cancel 测试

```typescript
// test-cancel.ts
async function testCancel() {
	const cts = new CancellationTokenSource();
	let chunkCount = 0;

	// 启动 worker
	const workerPromise = worker.invoke('test', cts.token, (chunk) => {
		chunkCount++;
	});

	// 1 秒后取消
	setTimeout(() => {
		const cancelTime = Date.now();
		cts.cancel();

		workerPromise.then(() => {
			const stopTime = Date.now();
			console.log('Cancel latency:', stopTime - cancelTime + 'ms');
			console.log('Chunks before cancel:', chunkCount);
		});
	}, 1000);
}
```

### 10.3 路由测试

```typescript
// test-routing.ts
function testRouting() {
	const cases = [
		{ caller: { hostKind: 'local' }, target: { hostKind: 'local' }, expected: true },
		{ caller: { hostKind: 'web' }, target: { hostKind: 'local' }, expected: false },
		{
			caller: { hostKind: 'remote', remoteAuthority: 'ssh://host-a' },
			target: { hostKind: 'remote', remoteAuthority: 'ssh://host-b' },
			expected: false
		}
	];

	for (const c of cases) {
		const result = canRoute(c.caller, c.target);
		console.assert(result === c.expected, `Failed: ${JSON.stringify(c)}`);
	}

	console.log('All routing tests passed');
}
```
