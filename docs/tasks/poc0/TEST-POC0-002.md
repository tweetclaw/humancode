# 验收卡：TEST-POC0-002

## 验收信息
- **验收编号**：TEST-POC0-002
- **对应任务**：TASK-POC0-002
- **验收 AI**：AI-QA-002
- **验收类型**：技术验证验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-POC0-002 的实现是否符合要求，确认 CancellationToken 能够从 controller 扩展穿透到 worker 扩展，且 cancel 生效时间 < 200ms，成功率 100%。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-POC0-002.md](TASK-POC0-002.md)
2. 阅读技术验证计划 [docs/ai-interop/00-poc-0-technical-validation.md](../../ai-interop/00-poc-0-technical-validation.md) 第 4 节
3. 确认开发 AI 已标记任务为"待验收"
4. 拉取最新代码，确保环境干净
5. 确认 TASK-POC0-001 已完成（本任务依赖其 RPC 基础设施）

## 验收环境

**启动方式**：
- 使用启动脚本：`/Users/immeta/work/humancode/startcode.sh`
- 这将启动 Extension Development Host 环境

**日志位置**：
- 运行日志文件：`/Users/immeta/work/humancode/1.log`
- 所有运行时日志都会输出到此文件
- 验收主要通过分析日志内容来验证功能

**验收方法**：
- 启动程序 → 执行测试命令 → 分析日志输出 → 判断是否符合预期
- 人工测试步骤主要用于触发功能并生成日志
- 真正的验收依据是日志中的关键信息

## 验收步骤

### 1. 代码质量检查

- [ ] **TypeScript 编译通过**
  - 运行：`npm run compile-check-ts-native`
  - 预期：无编译错误
  - 如果失败：记录具体错误信息和文件位置

- [ ] **代码符合 VS Code 编码规范**
  - 检查点：
    - 使用 tabs 而非 spaces 缩进
    - RPC Shape 方法使用 `$` 前缀
    - 正确使用 VS Code 的 CancellationToken 和 CancellationTokenSource
    - 使用依赖注入模式
  - 参考：[.claude/CLAUDE.md](../../../.claude/CLAUDE.md)

- [ ] **资源正确清理**
  - 检查 CancellationTokenSource 是否正确 dispose
  - 检查 Map 中的条目是否在调用完成后清理
  - 检查事件订阅是否正确 dispose

### 2. 功能验收

#### 2.1 RPC Shape 扩展验证

- [ ] **Shape 定义正确扩展**
  - 检查 `extHost.protocol.ts` 中：
    - `MainThreadTestAiInteropShape` 包含 `$cancel(invocationId: string): void` 方法
    - `ExtHostTestAiInteropShape` 的 `$onInvoke` 方法签名包含 `token: CancellationToken` 参数
  - 日志关键字：查找日志中是否有 `$cancel` 相关的调用记录

#### 2.2 MainThread Customer 验证

- [ ] **CancellationTokenSource 管理**
  - 检查 `mainThreadTestAiInterop.ts` 中：
    - 维护 `_cancellationTokenSources` Map
    - `$cancel` 方法正确实现
    - 调用完成后清理 CancellationTokenSource
  - 日志验证：
    - 启动程序，执行测试命令
    - 在 `1.log` 中搜索 `[MainThreadTestAiInterop] Canceled invocation`
    - 预期：能找到 cancel 操作的日志记录

#### 2.3 ExtHost API 验证

- [ ] **CancellationToken 传递**
  - 检查 `extHostTestAiInterop.ts` 中：
    - `onInvoke` 事件包含 `{ invocationId, token }` 结构
    - `$onInvoke` 方法正确接收和传递 token
  - 日志验证：
    - 在 `1.log` 中搜索 ExtHost 相关日志
    - 预期：能看到 token 被传递的痕迹

#### 2.4 Worker 扩展验证

- [ ] **Token 检查实现**
  - 检查 `extensions/test-ai-interop-worker/src/extension.ts` 中：
    - Handler 接收包含 token 的参数
    - 在循环中检查 `token.isCancellationRequested`
    - 收到 cancel 后立即返回并记录位置
  - 日志验证：
    - 在 `1.log` 中搜索 `[Worker] Canceled at chunk`
    - 预期：能看到 worker 停止的位置（第几个 chunk）

#### 2.5 Controller 扩展验证

- [ ] **三个测试场景实现**
  - 检查 `extensions/test-ai-interop-controller/src/extension.ts` 中：
    - 注册 `test-ai-interop.testCancelBasic` 命令
    - 注册 `test-ai-interop.testCancelImmediate` 命令
    - 注册 `test-ai-interop.testCancelConcurrent` 命令
  - 日志验证：
    - 在 `1.log` 中搜索 `[Controller] Cancel latency`
    - 预期：能看到 cancel 延迟统计

### 3. 性能验收（日志驱动）

#### 3.1 场景 1：基础取消

**测试步骤**：
1. 启动程序：`/Users/immeta/work/humancode/startcode.sh`
2. 在 Extension Development Host 中打开命令面板（Cmd+Shift+P）
3. 执行命令：`Test AI Interop: Test Cancel Basic`
4. 等待命令执行完成
5. 分析日志文件：`tail -100 /Users/immeta/work/humancode/1.log`

**日志验收标准**：
- [ ] **Cancel 生效时间 < 200ms**
  - 在日志中查找：`[Controller] Cancel latency: XXXms`
  - 预期：XXX < 200
  - 如果失败：记录实际延迟值

- [ ] **Worker 正确停止**
  - 在日志中查找：`[Worker] Canceled at chunk XX`
  - 预期：能找到停止位置，且在第 50 个 chunk 附近
  - 如果失败：记录实际停止位置

- [ ] **统计数据正确**
  - 在日志中查找：
    - `[Controller] Chunks received after cancel: XX`
    - `[Controller] Last chunk seq: XX`
    - `[Controller] Total chunks: XX`
  - 预期：
    - 收到的 chunk 数量在 50-70 之间（考虑延迟）
    - 最后一个 chunk 的 seq 接近停止位置
  - 如果失败：记录实际数据

**日志示例**：
```
[MainThreadTestAiInterop] Canceled invocation: cancel-basic-1234567890
[Worker] Canceled at chunk 52, invocationId: cancel-basic-1234567890
[Controller] Cancel latency: 85ms
[Controller] Chunks received after cancel: 2
[Controller] Last chunk seq: 53
[Controller] Total chunks: 54
```

#### 3.2 场景 2：立即取消

**测试步骤**：
1. 在 Extension Development Host 中执行命令：`Test AI Interop: Test Cancel Immediate`
2. 等待命令执行完成
3. 分析日志文件

**日志验收标准**：
- [ ] **Cancel 生效时间 < 200ms**
  - 在日志中查找：`[Controller] Immediate cancel latency: XXXms`
  - 预期：XXX < 200

- [ ] **Worker 未发送或仅发送极少 chunk**
  - 在日志中查找：`[Controller] Chunks received: XX`
  - 预期：XX = 0 或 XX <= 3（考虑竞态条件）
  - 在日志中查找：`[Controller] Expected: 0 or very few chunks`

- [ ] **Worker 收到 cancel**
  - 在日志中查找：`[Worker] Canceled at chunk`
  - 预期：能找到，且 chunk 数量很小（0-3）

**日志示例**：
```
[MainThreadTestAiInterop] Canceled invocation: cancel-immediate-1234567890
[Worker] Canceled at chunk 0, invocationId: cancel-immediate-1234567890
[Controller] Immediate cancel latency: 45ms
[Controller] Chunks received: 0
[Controller] Expected: 0 or very few chunks
```

#### 3.3 场景 3：并发取消

**测试步骤**：
1. 在 Extension Development Host 中执行命令：`Test AI Interop: Test Cancel Concurrent`
2. 等待命令执行完成（可能需要 5-10 秒）
3. 分析日志文件

**日志验收标准**：
- [ ] **所有调用都正确取消**
  - 在日志中查找：`[Controller] Invocation cancel-concurrent-`
  - 预期：能找到 10 条记录，每条对应一个并发调用

- [ ] **平均 Cancel 延迟 < 200ms**
  - 在日志中查找：`[Controller] Average cancel latency: XXXms`
  - 预期：XXX < 200

- [ ] **Cancel 成功率 100%**
  - 在日志中查找：`[Controller] Success rate (< 200ms): XX%`
  - 预期：XX = 100
  - 如果失败：记录实际成功率和失败的调用详情

- [ ] **每个调用的详细统计**
  - 在日志中查找：`[Controller] Invocation cancel-concurrent-X-XXXXX: latency=XXms, chunks=XX`
  - 预期：每个调用都有统计记录
  - 检查是否有异常值（延迟 > 200ms 或 chunks 数量异常）

**日志示例**：
```
[Controller] Invocation cancel-concurrent-0-1234567890: latency=95ms, chunks=24
[Controller] Invocation cancel-concurrent-1-1234567890: latency=120ms, chunks=28
[Controller] Invocation cancel-concurrent-2-1234567890: latency=88ms, chunks=22
...
[Controller] Average cancel latency: 105ms
[Controller] Success rate (< 200ms): 100%
```

### 4. 边界条件测试（日志驱动）

#### 4.1 重复 cancel 测试

**测试步骤**：
1. 手动修改 Controller 扩展，对同一个 invocationId 调用两次 `cancel`
2. 执行测试命令
3. 分析日志

**日志验收标准**：
- [ ] **第二次 cancel 不应导致错误**
  - 在日志中搜索 `Error` 或 `Exception`
  - 预期：没有与 cancel 相关的错误
  - 第二次 cancel 可能被忽略或记录警告

#### 4.2 不存在的 invocationId

**测试步骤**：
1. 手动修改 Controller 扩展，对不存在的 invocationId 调用 `cancel`
2. 执行测试命令
3. 分析日志

**日志验收标准**：
- [ ] **不应导致崩溃**
  - 在日志中搜索 `Error` 或 `Exception`
  - 预期：没有崩溃，可能有警告日志

#### 4.3 调用完成后 cancel

**测试步骤**：
1. 手动修改 Controller 扩展，在调用完成后调用 `cancel`
2. 执行测试命令
3. 分析日志

**日志验收标准**：
- [ ] **不应导致错误**
  - 在日志中搜索相关日志
  - 预期：cancel 被忽略或记录为"已完成"

### 5. 状态一致性验证（日志驱动）

- [ ] **Invocation 终态正确**
  - 在日志中查找每个 invocation 的生命周期：
    - 开始：`[Worker] Starting invocation`
    - 取消：`[Worker] Canceled at chunk`
    - 主线程确认：`[MainThreadTestAiInterop] Canceled invocation`
  - 预期：每个被取消的 invocation 都有完整的生命周期记录

- [ ] **无资源泄漏**
  - 多次运行测试场景（至少 5 次）
  - 观察日志中是否有内存或资源相关的警告
  - 预期：无内存泄漏警告

### 6. 文档检查

- [ ] **实施记录完整**
  - 开发 AI 已填写"实施记录"区域
  - 包含实现要点和遇到的问题
  - 包含三个场景的测试结果摘要

- [ ] **日志输出清晰**
  - 日志包含足够的信息用于调试
  - 日志格式一致（使用统一的前缀如 `[Worker]`、`[Controller]`）
  - 关键操作都有日志记录

## 验收结果

**⚠️ 重要说明**：
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后，应创建独立的**验收报告文件**
- 验收报告位置：`docs/reports/TEST-POC0-002-report.md`
- 如果多次验收，只更新最后一次的验收报告文件即可

**验收 AI 操作流程**：
1. 按照验收步骤逐项检查
2. 创建验收报告文件（见下方验收报告模板）
3. 在任务跟踪表中更新状态
4. 通知项目经理验收结果

## 验收报告模板

验收完成后，在 `docs/reports/TEST-POC0-002-report.md` 创建报告：

```markdown
# 验收报告：TEST-POC0-002

## 基本信息
- **验收编号**：TEST-POC0-002
- **对应任务**：TASK-POC0-002
- **验收 AI**：AI-QA-002
- **验收时间**：[YYYY-MM-DD HH:MM]
- **验收轮次**：第 [N] 次验收
- **验收结论**：✅ 通过 / ❌ 失败

## 验收执行情况

### 代码质量检查
- [✅/❌] TypeScript 编译：[通过/失败原因]
- [✅/❌] 编码规范：[通过/失败原因]
- [✅/❌] 资源清理：[通过/失败原因]

### 功能验收结果
- [✅/❌] RPC Shape 扩展：[结果描述]
- [✅/❌] MainThread Customer：[结果描述]
- [✅/❌] ExtHost API：[结果描述]
- [✅/❌] Worker 扩展：[结果描述]
- [✅/❌] Controller 扩展：[结果描述]

### 性能验收结果

#### 场景 1：基础取消
- Cancel 生效时间：[实际值]ms
- Worker 停止位置：第 [X] 个 chunk
- 收到的 chunk 总数：[X]
- **结论**：[✅ 通过 / ❌ 失败]
- **日志摘录**：
```
[粘贴关键日志片段]
```

#### 场景 2：立即取消
- Cancel 生效时间：[实际值]ms
- 收到的 chunk 数量：[X]
- **结论**：[✅ 通过 / ❌ 失败]
- **日志摘录**：
```
[粘贴关键日志片段]
```

#### 场景 3：并发取消
- 平均 Cancel 延迟：[实际值]ms
- Cancel 成功率：[实际值]%
- 失败的调用（如有）：[列出失败的调用及其延迟]
- **结论**：[✅ 通过 / ❌ 失败]
- **日志摘录**：
```
[粘贴关键日志片段]
```

### 边界条件测试结果
- [✅/❌] 重复 cancel：[结果描述]
- [✅/❌] 不存在的 invocationId：[结果描述]
- [✅/❌] 调用完成后 cancel：[结果描述]

### 状态一致性验证结果
- [✅/❌] Invocation 终态正确：[结果描述]
- [✅/❌] 无资源泄漏：[结果描述]

## 验收总结

### 通过情况（如通过）

所有验收点均通过，CancellationToken 穿透功能符合预设标准。

**关键验收要点**：
- Cancel 生效时间 < 200ms
- Cancel 成功率 100%
- 三个测试场景全部通过
- 状态一致性正确

**性能基线数据**：
- 基础取消：cancel 延迟 [X]ms，停止位置第 [X] 个 chunk
- 立即取消：cancel 延迟 [X]ms，收到 [X] 个 chunk
- 并发取消：平均延迟 [X]ms，成功率 [X]%

**重要发现**（如有）：
- [发现 1]
- [发现 2]

### 失败情况（如失败）

**发现的问题**：

1. **问题 1**：[问题描述]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 复现步骤：
     1. [步骤 1]
     2. [步骤 2]
   - 预期结果：[应该是什么]
   - 实际结果：[实际是什么]
   - 日志证据：
   ```
   [粘贴相关日志]
   ```
   - 建议修复方案：[具体建议]

2. **问题 2**：[问题描述]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 复现步骤：[具体步骤]
   - 预期结果：[应该是什么]
   - 实际结果：[实际是什么]
   - 日志证据：[粘贴相关日志]
   - 建议修复方案：[具体建议]

## 后续操作

### 如果验收通过
- [✅] 在任务跟踪表中将 TASK-POC0-002 状态改为 ✅ 已完成
- [✅] 在任务跟踪表中将 TEST-POC0-002 状态改为 ✅ 通过
- [✅] 通知项目经理验收通过
- [✅] 将性能基线数据记录到 PoC-0 验证计划文档

### 如果验收失败
- [✅] 在任务跟踪表中将 TASK-POC0-002 状态改为 ❌ 验收失败
- [✅] 在任务跟踪表中将 TEST-POC0-002 状态改为 ❌ 失败
- [✅] 通知开发 AI 修复问题，修复后重新提交验收
- [✅] 如果 cancel 严重不达标，考虑启动备选方案讨论

## 附录

### 测试环境信息
- 操作系统：[macOS/Linux/Windows]
- OS 版本：[版本号]
- Node 版本：[版本号]
- TypeScript 版本：[版本号]
- VS Code 版本：[版本号]

### 完整日志文件

**场景 1 日志**：
```
[粘贴场景 1 的完整日志输出，从 1.log 中提取]
```

**场景 2 日志**：
```
[粘贴场景 2 的完整日志输出]
```

**场景 3 日志**：
```
[粘贴场景 3 的完整日志输出]
```

### 备选方案评估（如验收失败）

如果 CancellationToken 穿透验证失败，根据失败原因考虑以下备选方案：

1. **轮询优化**：减少 `isCancellationRequested` 检查间隔（如每 5ms 检查一次）
2. **主动推送**：改为 `$onCancel(invocationId)` 回调模式，而非轮询
3. **超时兜底**：增加 timeout 机制，强制终止超时的 invocation
4. **降级方案**：如果 cancel 延迟无法满足要求，考虑在 UI 层面优化用户体验
```

## 关键验收指标汇总

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| Cancel 生效时间 | < 200ms | 从日志中提取 `Cancel latency: XXms` |
| Cancel 成功率 | 100% | 所有测试场景 worker 都正确停止 |
| 状态一致性 | 100% | 日志中 invocation 终态正确标记为 canceled |

**验收通过的必要条件**：
- 所有性能指标达标
- 三个测试场景全部通过
- 日志中能清晰追踪 cancel 流程
- 无资源泄漏
- 代码质量符合 VS Code 规范
