# 验收卡：TEST-P1-002

## 验收信息
- **验收编号**：TEST-P1-002
- **对应任务**：TASK-P1-002
- **验收 AI**：AI-QA-001
- **验收类型**：功能验收 + 集成验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-P1-002 的实现是否符合要求,确保 AI Interop Bus 核心功能正确工作。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-P1-002.md](TASK-P1-002.md)
2. 确认开发 AI 已标记任务为"待验收"
3. 确认 TASK-P1-001 已完成(接口定义已存在)
4. 拉取最新代码,确保环境干净

## 验收步骤

### 1. 代码质量检查

- [ ] **TypeScript 编译通过**
  - 运行 `npm run compile-check-ts-native`
  - 验证无编译错误

- [ ] **编码规范检查**
  - Service 类继承 `Disposable`
  - Service 类实现 `IAIInteropBusService` 接口
  - 使用 tabs 缩进
  - 使用依赖注入模式
  - 正确使用 `Emitter<T>` 实现事件

- [ ] **文件位置正确**
  - 文件位于 `src/vs/workbench/services/aiInterop/browser/aiInteropService.ts`
  - Service 已在 `src/vs/workbench/workbench.common.main.ts` 中注册

### 2. Service 注册验收

- [ ] **DI 容器注册**
  - 在 `workbench.common.main.ts` 中使用 `registerSingleton` 注册
  - Service ID 为 `IAIInteropBusService`
  - 实现类为 `AIInteropService`
  - 使用 `InstantiationType.Delayed`

### 3. Endpoint 管理功能验收

#### 3.1 registerEndpoint

- [ ] **基础功能**
  - 可以成功注册 endpoint
  - 注册后可以通过 `getEndpoint` 查询到
  - 注册后触发 `onDidRegisterEndpoint` 事件
  - 记录审计日志(`endpoint_registered`)

- [ ] **错误处理**
  - 重复注册相同 ID 的 endpoint 抛出错误
  - 无效的 descriptor(缺少 id 或 extensionId)抛出错误

#### 3.2 unregisterEndpoint

- [ ] **基础功能**
  - 可以成功注销 endpoint
  - 注销后 `getEndpoint` 返回 undefined
  - 注销后触发 `onDidUnregisterEndpoint` 事件
  - 记录审计日志(`endpoint_unregistered`)

- [ ] **级联处理**
  - 注销 endpoint 时,相关的 invocation 被取消

- [ ] **错误处理**
  - 注销不存在的 endpoint 抛出错误

#### 3.3 查询方法

- [ ] **getEndpoint**
  - 存在的 endpoint 返回正确的 descriptor
  - 不存在的 endpoint 返回 undefined

- [ ] **getAllEndpoints**
  - 返回所有已注册的 endpoint
  - 返回数组,不是 Map

### 4. Invocation 管理功能验收

#### 4.1 invoke

- [ ] **基础功能**
  - 可以成功发起 invocation
  - 返回 `InvocationHandle`
  - Handle 包含 `invocationId`、`onChunk`、`onComplete`、`onError`、`cancel` 方法
  - Invocation 状态从 `pending` 变为 `running`
  - 触发 `onDidStartInvocation` 事件
  - 记录审计日志(`invocation_started`)

- [ ] **路由检查**
  - 调用 `policyService.canRoute` 检查路由策略
  - 路由不允许时抛出错误并记录审计日志(`invocation_rejected`)

- [ ] **权限检查**
  - 调用 `policyService.checkPermission` 检查权限
  - 权限拒绝时抛出错误并记录审计日志(`permission_denied`)

- [ ] **Session 关联**
  - 如果有 active session,invocation 关联到该 session
  - 调用 `sessionBroker.associateInvocation`

- [ ] **Cancel 支持**
  - 监听 `CancellationToken.onCancellationRequested`
  - Token 取消时调用 `cancel` 方法

- [ ] **错误处理**
  - Caller 或 target 不存在时抛出错误

#### 4.2 sendChunk

- [ ] **基础功能**
  - 可以成功发送 chunk
  - 触发 `onDidReceiveChunk` 事件
  - 事件包含 `invocationId` 和 `chunk`

- [ ] **错误处理**
  - Invocation 不存在时抛出错误
  - Invocation 状态不是 `running` 时抛出错误

#### 4.3 complete

- [ ] **基础功能**
  - 可以成功完成 invocation
  - Invocation 状态变为 `completed`
  - 设置 `endTime`
  - 触发 `onDidCompleteInvocation` 事件
  - 记录审计日志(`invocation_completed`)

- [ ] **错误处理**
  - Invocation 不存在时抛出错误

#### 4.4 fail

- [ ] **基础功能**
  - 可以成功标记 invocation 失败
  - Invocation 状态变为 `failed`
  - 设置 `endTime` 和 `error`
  - 触发 `onDidFailInvocation` 事件
  - 记录审计日志(`invocation_failed`)

- [ ] **错误处理**
  - Invocation 不存在时抛出错误

#### 4.5 cancel

- [ ] **基础功能**
  - 可以成功取消 invocation
  - Invocation 状态变为 `canceled`
  - 设置 `endTime`
  - 触发 `onDidCancelInvocation` 事件
  - 记录审计日志(`invocation_canceled`)

- [ ] **状态检查**
  - 只能取消 `pending` 或 `running` 状态的 invocation
  - 已结束的 invocation 不会重复取消

- [ ] **错误处理**
  - Invocation 不存在时抛出错误

#### 4.6 查询方法

- [ ] **getInvocation**
  - 存在的 invocation 返回正确的 descriptor
  - 不存在的 invocation 返回 undefined

- [ ] **getAllInvocations**
  - 返回所有 invocation
  - 返回数组,不是 Map

### 5. 事件机制验收

- [ ] **所有事件都正确触发**
  - `onDidRegisterEndpoint`
  - `onDidUnregisterEndpoint`
  - `onDidStartInvocation`
  - `onDidReceiveChunk`
  - `onDidCompleteInvocation`
  - `onDidFailInvocation`
  - `onDidCancelInvocation`

- [ ] **事件数据正确**
  - 事件携带的数据完整且正确

### 6. 审计日志验收

- [ ] **所有关键操作都记录审计日志**
  - Endpoint 注册/注销
  - Invocation 开始/完成/失败/取消
  - 路由拒绝
  - 权限拒绝

- [ ] **审计日志格式正确**
  - 包含 `id`、`type`、`timestamp`
  - 包含相关的 `extensionId`、`invocationId`、`sessionId`
  - `details` 包含必要信息

### 7. 依赖注入验收

- [ ] **正确注入依赖 Service**
  - `ILogService`
  - `IAISessionBrokerService`
  - `IAIInteropPolicyService`
  - `IAIInteropAuditService`

- [ ] **正确调用依赖 Service**
  - 调用 `sessionBroker.getActiveSession()`
  - 调用 `sessionBroker.associateInvocation()`
  - 调用 `policyService.canRoute()`
  - 调用 `policyService.checkPermission()`
  - 调用 `auditService.logEvent()`
  - 调用 `logService.info/error/debug()`

### 8. 状态转换验收

- [ ] **Invocation 状态转换正确**
  - `pending` → `running` (invoke)
  - `running` → `completed` (complete)
  - `running` → `failed` (fail)
  - `pending`/`running` → `canceled` (cancel)

- [ ] **不允许的状态转换被拒绝**
  - 已完成的 invocation 不能再发送 chunk
  - 已取消的 invocation 不能再完成

### 9. 资源清理验收

- [ ] **Disposable 正确实现**
  - Service 继承 `Disposable`
  - 所有 Emitter 使用 `this._register()` 注册
  - Dispose 时清理所有资源

### 10. 文档检查

- [ ] 开发 AI 已填写 TASK-P1-002.md 的"实施记录"区域
- [ ] 实施记录包含实现要点和遇到的问题

## 验收结果

**⚠️ 重要说明**:
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后,应创建独立的**验收报告文件**
- 验收报告位置: `docs/reports/TEST-P1-002-report.md`

**验收 AI 操作流程**:
1. 按照验收步骤逐项检查
2. 创建验收报告文件(参考 PoC-0 的验收报告格式)
3. 在任务跟踪表([docs/phases/poc-1.md](../../phases/poc-1.md))中更新状态
4. 通知项目经理验收结果

## 后续操作

### 如果验收通过
- [ ] 在任务跟踪表中将 TASK-P1-002 状态改为 ✅ 已完成
- [ ] 在任务跟踪表中将 TEST-P1-002 状态改为 ✅ 通过
- [ ] 通知项目经理验收通过
- [ ] 通知后续依赖任务的开发 AI 可以开始工作

### 如果验收失败
- [ ] 在任务跟踪表中将 TASK-P1-002 状态改为 ❌ 验收失败
- [ ] 在任务跟踪表中将 TEST-P1-002 状态改为 ❌ 失败
- [ ] 在验收报告中详细记录发现的问题
- [ ] 通知开发 AI 修复问题,修复后重新提交验收

## 附录

### 测试环境信息
- 操作系统: macOS
- Node 版本: [验收时填写]
- VS Code 版本: Code - OSS (开发版本)

### 关键代码位置

**Service 实现**:
- [src/vs/workbench/services/aiInterop/browser/aiInteropService.ts](../../../src/vs/workbench/services/aiInterop/browser/aiInteropService.ts)

**Service 注册**:
- [src/vs/workbench/workbench.common.main.ts](../../../src/vs/workbench/workbench.common.main.ts)

### 参考文档

- [02-core-architecture.md](../../ai-interop/02-core-architecture.md) - 核心架构设计
- [POC0-Final-Summary.md](../../reports/POC0-Final-Summary.md) - PoC-0 验证成果
