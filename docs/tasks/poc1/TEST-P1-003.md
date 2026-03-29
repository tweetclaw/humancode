# 验收卡：TEST-P1-003

## 验收信息
- **验收编号**：TEST-P1-003
- **对应任务**：TASK-P1-003
- **验收 AI**：AI-QA-002
- **验收类型**：功能验收 + 集成验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-P1-003 的实现是否符合要求,确保 RPC Bridge 正确工作,扩展可以通过 `vscode.aiInterop` API 使用 AI Interop 平台功能。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-P1-003.md](TASK-P1-003.md)
2. 确认开发 AI 已标记任务为"待验收"
3. 确认 TASK-P1-001 已完成(接口定义已存在)
4. 拉取最新代码,确保环境干净

## 验收步骤

### 1. 代码质量检查

- [ ] **TypeScript 编译通过**
  - 运行 `npm run compile-check-ts-native`
  - 验证无编译错误

- [ ] **编码规范检查**
  - 所有 RPC 方法以 `$` 开头
  - MainThread Customer 使用 `@extHostNamedCustomer` 装饰器
  - 使用 tabs 缩进
  - 使用依赖注入模式

- [ ] **文件位置正确**
  - RPC Shape 定义在 `src/vs/workbench/api/common/extHost.protocol.ts`
  - MainThread Customer 在 `src/vs/workbench/api/browser/mainThreadAiInterop.ts`
  - ExtHost API 在 `src/vs/workbench/api/common/extHostAiInterop.ts`
  - API 装配在 `src/vs/workbench/api/common/extHost.api.impl.ts`

### 2. RPC Shape 定义验收

#### 2.1 MainThreadAiInteropShape

- [ ] **接口定义存在**
  - 接口名称为 `MainThreadAiInteropShape`
  - 继承 `IDisposable`

- [ ] **Endpoint 管理方法**
  - `$registerEndpoint(descriptor: EndpointDescriptorDto): Promise<void>`
  - `$unregisterEndpoint(endpointId: string): Promise<void>`

- [ ] **Invocation 管理方法**
  - `$invoke(callerId: string, targetId: string, request: InvocationRequestDto, token: CancellationToken): Promise<string>`
  - `$sendChunk(invocationId: string, chunk: InvocationChunkDto): Promise<void>`
  - `$complete(invocationId: string, result?: any): Promise<void>`
  - `$fail(invocationId: string, error: AiInteropErrorDto): Promise<void>`
  - `$cancel(invocationId: string): Promise<void>`

- [ ] **查询方法**
  - `$getEndpoint(endpointId: string): Promise<EndpointDescriptorDto | undefined>`
  - `$getAllEndpoints(): Promise<EndpointDescriptorDto[]>`
  - `$getInvocation(invocationId: string): Promise<InvocationDescriptorDto | undefined>`

#### 2.2 ExtHostAiInteropShape

- [ ] **接口定义存在**
  - 接口名称为 `ExtHostAiInteropShape`

- [ ] **Invocation 回调方法**
  - `$onInvoke(invocationId: string, callerId: string, request: InvocationRequestDto, token: CancellationToken): Promise<void>`
  - `$onChunk(invocationId: string, chunk: InvocationChunkDto): void`
  - `$onComplete(invocationId: string, result?: any): void`
  - `$onError(invocationId: string, error: AiInteropErrorDto): void`
  - `$onCancel(invocationId: string): void`

#### 2.3 DTO 定义

- [ ] **所有 DTO 定义完整**
  - `EndpointDescriptorDto`
  - `EndpointCapabilityDto`
  - `InvocationRequestDto`
  - `InvocationOptionsDto`
  - `InvocationChunkDto`
  - `InvocationDescriptorDto`
  - `AiInteropErrorDto`

- [ ] **DTO 字段类型正确**
  - 使用可序列化的类型(string, number, boolean, object)
  - 避免使用 VS Code 特定类型(如 Event, Disposable)

#### 2.4 Context 注册

- [ ] **MainContext 注册**
  - `MainThreadAiInterop` 已在 `MainContext` 中注册

- [ ] **ExtHostContext 注册**
  - `ExtHostAiInterop` 已在 `ExtHostContext` 中注册

### 3. MainThread Customer 验收

#### 3.1 基础结构

- [ ] **装饰器正确**
  - 使用 `@extHostNamedCustomer(MainContext.MainThreadAiInterop)`

- [ ] **依赖注入正确**
  - 注入 `IExtHostContext`
  - 注入 `IAIInteropBusService`
  - 注入 `ILogService`

- [ ] **Proxy 获取正确**
  - 通过 `extHostContext.getProxy(ExtHostContext.ExtHostAiInterop)` 获取 ExtHost Proxy

#### 3.2 方法实现

- [ ] **$registerEndpoint**
  - 调用 `busService.registerEndpoint`
  - DTO 转换正确

- [ ] **$unregisterEndpoint**
  - 调用 `busService.unregisterEndpoint`

- [ ] **$invoke**
  - 调用 `busService.invoke`
  - 返回 `invocationId`
  - DTO 转换正确
  - CancellationToken 正确传递

- [ ] **$sendChunk**
  - 调用 `busService.sendChunk`
  - DTO 转换正确

- [ ] **$complete**
  - 调用 `busService.complete`

- [ ] **$fail**
  - 调用 `busService.fail`
  - DTO 转换正确

- [ ] **$cancel**
  - 调用 `busService.cancel`

- [ ] **查询方法**
  - `$getEndpoint` 调用 `busService.getEndpoint`
  - `$getAllEndpoints` 调用 `busService.getAllEndpoints`
  - `$getInvocation` 调用 `busService.getInvocation`
  - DTO 转换正确

#### 3.3 事件订阅与转发

- [ ] **订阅 Bus 事件**
  - 订阅 `onDidStartInvocation`
  - 订阅 `onDidReceiveChunk`
  - 订阅 `onDidCompleteInvocation`
  - 订阅 `onDidFailInvocation`
  - 订阅 `onDidCancelInvocation`

- [ ] **转发给 ExtHost**
  - `onDidStartInvocation` → `$onInvoke`
  - `onDidReceiveChunk` → `$onChunk`
  - `onDidCompleteInvocation` → `$onComplete`
  - `onDidFailInvocation` → `$onError`
  - `onDidCancelInvocation` → `$onCancel`

#### 3.4 DTO 转换

- [ ] **转换方法完整**
  - `_toDto` / `_fromDto` (EndpointDescriptor)
  - `_toRequestDto` / `_fromRequestDto` (InvocationRequest)
  - `_toChunkDto` / `_fromChunkDto` (InvocationChunk)
  - `_toErrorDto` / `_fromErrorDto` (AiInteropError)
  - `_toInvocationDto` / `_fromInvocationDto` (InvocationDescriptor)

- [ ] **转换逻辑正确**
  - 双向转换一致
  - 处理可选字段
  - 处理嵌套对象

### 4. ExtHost API 验收

#### 4.1 基础结构

- [ ] **Proxy 获取正确**
  - 通过 `mainContext.getProxy(MainContext.MainThreadAiInterop)` 获取 MainThread Proxy

- [ ] **内部状态管理**
  - 使用 Map 存储 endpoints
  - 使用 Map 存储 invocation handlers

- [ ] **事件 Emitters**
  - `_onDidReceiveChunk`
  - `_onDidComplete`
  - `_onDidError`
  - `_onDidCancel`

#### 4.2 ExtHost Shape 实现

- [ ] **$onInvoke**
  - 找到对应的 handler
  - 调用 handler
  - 处理 CancellationToken

- [ ] **$onChunk**
  - 触发 `_onDidReceiveChunk` 事件

- [ ] **$onComplete**
  - 触发 `_onDidComplete` 事件

- [ ] **$onError**
  - 触发 `_onDidError` 事件

- [ ] **$onCancel**
  - 触发 `_onDidCancel` 事件

#### 4.3 扩展 API 实现

- [ ] **registerEndpoint**
  - 存储 handler
  - 调用 `$registerEndpoint`
  - 返回 Disposable
  - Dispose 时调用 `$unregisterEndpoint`

- [ ] **invoke**
  - 调用 `$invoke`
  - 返回 `InvocationHandle`
  - Handle 包含 `invocationId`、`onChunk`、`onComplete`、`onError`、`cancel`
  - 事件过滤正确(只接收对应 invocationId 的事件)

- [ ] **sendChunk**
  - 调用 `$sendChunk`
  - DTO 转换正确

- [ ] **complete**
  - 调用 `$complete`

- [ ] **fail**
  - 调用 `$fail`
  - DTO 转换正确

### 5. API 装配验收

- [ ] **namespace 定义**
  - 在 `extHost.api.impl.ts` 中定义 `aiInterop` namespace

- [ ] **方法暴露**
  - `registerEndpoint`
  - `invoke`
  - `sendChunk`
  - `complete`
  - `fail`

- [ ] **方法调用正确**
  - 所有方法正确调用 `extHostAiInterop` 的对应方法

### 6. TypeScript 类型定义验收

- [ ] **类型定义文件存在**
  - `vscode.d.ts` 或 `vscode.proposed.aiInterop.d.ts`

- [ ] **namespace 定义**
  - `export namespace aiInterop`

- [ ] **函数签名正确**
  - `registerEndpoint`
  - `invoke`
  - `sendChunk`
  - `complete`
  - `fail`

- [ ] **接口定义完整**
  - `AiInteropEndpointDescriptor`
  - `AiInteropEndpointCapability`
  - `AiInteropInvocationRequest`
  - `AiInteropInvocationOptions`
  - `AiInteropInvocationHandle`
  - `AiInteropChunk`
  - `AiInteropError`

### 7. 注册验收

- [ ] **MainThread Customer 注册**
  - 在 `extensionHost.contribution.ts` 中注册
  - 使用正确的注册方式

### 8. 端到端功能验收

#### 8.1 Endpoint 注册

- [ ] **扩展可以注册 endpoint**
  - 调用 `vscode.aiInterop.registerEndpoint`
  - MainThread 收到注册请求
  - Bus Service 成功注册 endpoint

- [ ] **Endpoint 可以注销**
  - 调用 Disposable.dispose()
  - MainThread 收到注销请求
  - Bus Service 成功注销 endpoint

#### 8.2 Invocation 流程

- [ ] **扩展可以发起 invocation**
  - 调用 `vscode.aiInterop.invoke`
  - MainThread 收到 invoke 请求
  - Bus Service 成功创建 invocation
  - 返回 InvocationHandle

- [ ] **Worker 可以接收 invocation**
  - ExtHost 收到 `$onInvoke` 回调
  - Handler 被正确调用
  - CancellationToken 正确传递

- [ ] **Worker 可以发送 chunk**
  - 调用 `vscode.aiInterop.sendChunk`
  - MainThread 收到 chunk
  - Bus Service 转发 chunk
  - Controller 收到 chunk(通过 `onChunk` 事件)

- [ ] **Worker 可以完成 invocation**
  - 调用 `vscode.aiInterop.complete`
  - MainThread 收到 complete 请求
  - Bus Service 标记 invocation 为 completed
  - Controller 收到 complete 事件

- [ ] **Worker 可以标记失败**
  - 调用 `vscode.aiInterop.fail`
  - MainThread 收到 fail 请求
  - Bus Service 标记 invocation 为 failed
  - Controller 收到 error 事件

- [ ] **Controller 可以取消 invocation**
  - 调用 `handle.cancel()`
  - MainThread 收到 cancel 请求
  - Bus Service 标记 invocation 为 canceled
  - Worker 收到 cancel 事件(通过 CancellationToken)

### 9. 错误处理验收

- [ ] **RPC 错误正确传递**
  - MainThread 抛出的错误正确传递到 ExtHost
  - ExtHost 抛出的错误正确传递到 MainThread

- [ ] **DTO 转换错误处理**
  - 无效的 DTO 抛出清晰的错误

### 10. 资源清理验收

- [ ] **Disposable 正确实现**
  - MainThread Customer 继承 Disposable
  - 所有事件订阅使用 `this._register()` 注册
  - Dispose 时清理所有资源

### 11. 文档检查

- [ ] 开发 AI 已填写 TASK-P1-003.md 的"实施记录"区域
- [ ] 实施记录包含实现要点和遇到的问题

## 验收结果

**⚠️ 重要说明**:
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后,应创建独立的**验收报告文件**
- 验收报告位置: `docs/reports/TEST-P1-003-report.md`

**验收 AI 操作流程**:
1. 按照验收步骤逐项检查
2. 创建验收报告文件(参考 PoC-0 的验收报告格式)
3. 在任务跟踪表([docs/phases/poc-1.md](../../phases/poc-1.md))中更新状态
4. 通知项目经理验收结果

## 后续操作

### 如果验收通过
- [ ] 在任务跟踪表中将 TASK-P1-003 状态改为 ✅ 已完成
- [ ] 在任务跟踪表中将 TEST-P1-003 状态改为 ✅ 通过
- [ ] 通知项目经理验收通过
- [ ] 通知后续依赖任务的开发 AI 可以开始工作

### 如果验收失败
- [ ] 在任务跟踪表中将 TASK-P1-003 状态改为 ❌ 验收失败
- [ ] 在任务跟踪表中将 TEST-P1-003 状态改为 ❌ 失败
- [ ] 在验收报告中详细记录发现的问题
- [ ] 通知开发 AI 修复问题,修复后重新提交验收

## 附录

### 测试环境信息
- 操作系统: macOS
- Node 版本: [验收时填写]
- VS Code 版本: Code - OSS (开发版本)

### 关键代码位置

**RPC Shape 定义**:
- [src/vs/workbench/api/common/extHost.protocol.ts](../../../src/vs/workbench/api/common/extHost.protocol.ts)

**MainThread Customer**:
- [src/vs/workbench/api/browser/mainThreadAiInterop.ts](../../../src/vs/workbench/api/browser/mainThreadAiInterop.ts)

**ExtHost API**:
- [src/vs/workbench/api/common/extHostAiInterop.ts](../../../src/vs/workbench/api/common/extHostAiInterop.ts)

**API 装配**:
- [src/vs/workbench/api/common/extHost.api.impl.ts](../../../src/vs/workbench/api/common/extHost.api.impl.ts)

### 参考文档

- [03-rpc-and-dto-spec.md](../../ai-interop/03-rpc-and-dto-spec.md) - RPC 协议规范
- [POC0-Final-Summary.md](../../reports/POC0-Final-Summary.md) - PoC-0 验证成果
