# 验收卡：TEST-POC0-001

## 验收信息
- **验收编号**：TEST-POC0-001
- **对应任务**：TASK-POC0-001
- **验收 AI**：AI-QA-001
- **验收类型**：技术验证验收
- **状态**：⬜ 待验收

## 验收目标

验证 TASK-POC0-001 的实现是否符合要求，确认 VS Code RPC 机制能够承载高频流式 AI chunk 传输，且性能指标达到预设标准。

## 验收前准备

1. 阅读对应的开发任务卡 [TASK-POC0-001.md](TASK-POC0-001.md)
2. 阅读技术验证计划 [docs/ai-interop/00-poc-0-technical-validation.md](../../ai-interop/00-poc-0-technical-validation.md)
3. 确认开发 AI 已标记任务为"待验收"
4. 拉取最新代码，确保环境干净
5. 确认 Node.js 18+ 和 TypeScript 5.3+ 已安装

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
    - 使用 PascalCase 命名 type 和 enum
    - 使用 camelCase 命名 function 和 method
    - 使用依赖注入模式（constructor 参数使用 `@IServiceName`）
  - 参考：[.claude/CLAUDE.md](../../../.claude/CLAUDE.md)

- [ ] **文件结构符合 VS Code 架构**
  - 检查以下文件是否存在且位置正确：
    - `src/vs/workbench/api/common/extHost.protocol.ts`（RPC Shape 定义）
    - `src/vs/workbench/api/browser/mainThreadTestAiInterop.ts`（MainThread Customer）
    - `src/vs/workbench/api/common/extHostTestAiInterop.ts`（ExtHost API）
    - `extensions/test-ai-interop-worker/`（Worker 扩展）
    - `extensions/test-ai-interop-controller/`（Controller 扩展）

- [ ] **依赖注入正确使用**
  - MainThread Customer 使用 `@ILogService` 等装饰器
  - 服务通过 constructor 注入，非服务参数在服务参数之后
  - 使用 VS Code 标准的 `Emitter<T>` 实现事件

### 2. 功能验收

#### 2.1 RPC Shape 定义验证

- [ ] **Shape 定义完整**
  - 检查 `extHost.protocol.ts` 中是否包含：
    - `MainThreadTestAiInteropShape` 接口
    - `ExtHostTestAiInteropShape` 接口
  - 方法签名：
    - `$acceptChunk(invocationId: string, seq: number, text: string): void`
    - `$onInvoke(invocationId: string): void`

- [ ] **命名符合规范**
  - 所有 RPC 方法使用 `$` 前缀
  - 参数命名清晰（invocationId, seq, text）

#### 2.2 MainThread Customer 验证

- [ ] **正确实现 Shape 接口**
  - `MainThreadTestAiInterop` 类实现 `MainThreadTestAiInteropShape`
  - `$acceptChunk` 方法正确接收参数

- [ ] **统计数据记录**
  - 记录每个 chunk 的接收时间戳
  - 维护 invocationId 到统计数据的映射
  - 能够触发事件通知 Controller 扩展

- [ ] **ExtHost Proxy 正确获取**
  - 通过 `extHostContext.getProxy()` 获取 ExtHost 代理
  - 能够调用 ExtHost 侧的方法

#### 2.3 ExtHost API 验证

- [ ] **正确实现事件机制**
  - 使用 `Emitter<T>` 实现 `onInvoke` 事件
  - `$onInvoke` 方法正确触发事件

- [ ] **sendChunk 方法正确实现**
  - 能够调用 MainThread 的 `$acceptChunk` 方法
  - 参数正确传递（invocationId, seq, text）

- [ ] **MainThread Proxy 正确获取**
  - 通过 `mainContext.getProxy()` 获取 MainThread 代理

#### 2.4 Worker 扩展验证

- [ ] **扩展正确激活**
  - `package.json` 配置正确
  - `activate` 函数正确导出
  - 能够获取测试 API

- [ ] **监听调用事件**
  - 正确订阅 `onInvoke` 事件
  - 收到调用后开始发送 chunk

- [ ] **流式发送 chunk**
  - 连续发送 100 个 chunk
  - 每个 chunk 间隔 20ms
  - chunk 格式：`chunk-${seq}`
  - seq 从 0 到 99 递增

#### 2.5 Controller 扩展验证

- [ ] **命令注册正确**
  - 注册 `test-ai-interop.runTest` 命令
  - 命令可以通过命令面板执行

- [ ] **发起调用**
  - 生成唯一的 invocationId
  - 正确调用 API 发起 invocation

- [ ] **接收统计**
  - 订阅 chunk 接收事件
  - 记录所有接收到的 seq
  - 等待接收完成（超时机制）

- [ ] **统计报告输出**
  - 输出总耗时
  - 输出接收数量（received/total）
  - 输出丢失率（loss rate）
  - 输出乱序情况（out of order）
  - 输出缺失的 seq 列表

### 3. 性能验收

#### 3.1 场景 1：基础流式传输

**测试步骤**：
1. 启动 Extension Development Host
2. 加载 Worker 和 Controller 扩展
3. 执行命令 `test-ai-interop.runTest`（场景 1 配置）
4. 观察控制台输出

**验收标准**：
- [ ] **chunk 丢失率 = 0%**
  - 接收到全部 100 个 chunk
  - 无缺失的 seq

- [ ] **chunk 乱序率 = 0%**
  - seq 按顺序到达（0, 1, 2, ..., 99）
  - 无乱序情况

- [ ] **总延迟合理**
  - 总耗时约 2000ms（100 chunk × 20ms）
  - 允许误差范围：±500ms

- [ ] **UI 无卡顿**
  - 测试过程中点击菜单响应正常
  - 切换文件无延迟
  - 输入文本流畅

#### 3.2 场景 2：高频传输

**测试步骤**：
1. 修改配置为场景 2（每 10ms 发送 1 个 chunk，共 200 个）
2. 执行测试命令
3. 观察控制台输出和 UI 响应性

**验收标准**：
- [ ] **chunk 丢失率 = 0%**
  - 接收到全部 200 个 chunk

- [ ] **chunk 乱序率 = 0%**
  - seq 按顺序到达

- [ ] **UI 响应性良好**
  - 测试过程中 UI 操作无明显延迟
  - 主线程无阻塞

#### 3.3 场景 3：大 payload

**测试步骤**：
1. 修改配置为场景 3（每 50ms 发送 1 个 4KB chunk，共 50 个）
2. 执行测试命令
3. 观察内存占用

**验收标准**：
- [ ] **chunk 丢失率 = 0%**
  - 接收到全部 50 个 chunk

- [ ] **内存无泄漏**
  - 使用 Activity Monitor / Task Manager 监控
  - 测试前后内存占用差异 < 50MB
  - 测试过程中内存无持续上升趋势

#### 3.4 场景 4：并发调用

**测试步骤**：
1. 修改配置为场景 4（10 个 worker 同时发送，每个 50 chunk）
2. 执行测试命令
3. 观察主线程 CPU 占用

**验收标准**：
- [ ] **总体丢失率 = 0%**
  - 所有 worker 的 chunk 全部接收（500 个 chunk）

- [ ] **主线程 CPU 额外占用 < 5%**
  - 使用 Activity Monitor / Task Manager 监控
  - 测试前记录基线 CPU 占用
  - 测试中 CPU 增量 < 5%

- [ ] **无 RPC 错误日志**
  - 控制台无 RPC 相关错误
  - 无超时或连接断开

### 4. 边界条件测试

- [ ] **空 invocationId 处理**
  - 传入空字符串作为 invocationId
  - 预期：不应导致崩溃，应有错误处理或忽略

- [ ] **重复 seq 处理**
  - Worker 发送重复的 seq
  - 预期：Controller 能够检测到重复

- [ ] **超大 seq 处理**
  - Worker 发送 seq = 999999
  - 预期：正常接收，统计正确

- [ ] **超长 text 处理**
  - Worker 发送 100KB 的 text
  - 预期：正常接收，无性能问题

- [ ] **快速连续调用**
  - Controller 连续发起 5 次调用
  - 预期：每次调用独立，统计数据不混淆

### 5. 错误处理验证

- [ ] **Worker 扩展未加载**
  - Controller 发起调用时 Worker 未激活
  - 预期：有明确的错误提示

- [ ] **ExtHost 崩溃恢复**
  - 测试过程中手动终止 ExtHost 进程
  - 预期：主线程能够检测到连接断开

- [ ] **超时处理**
  - Worker 不发送 chunk
  - 预期：Controller 的 `waitForCompletion` 超时返回

### 6. 文档检查

- [ ] **实施记录完整**
  - 开发 AI 已填写"实施记录"区域
  - 包含实现要点和遇到的问题

- [ ] **测试结果摘要**
  - 提供四个场景的测试输出
  - 包含关键性能指标

- [ ] **代码注释适当**
  - 关键逻辑有必要的注释
  - 不过度注释显而易见的代码

## 验收结果

**⚠️ 重要说明**：
- 验收任务卡本身**不应被修改**
- 验收 AI 完成验收后，应创建独立的**验收报告文件**
- 验收报告位置：`docs/reports/TEST-POC0-001-report.md`
- 如果多次验收，只更新最后一次的验收报告文件即可

**验收 AI 操作流程**：
1. 按照验收步骤逐项检查
2. 创建验收报告文件（见下方验收报告模板）
3. 在任务跟踪表中更新状态
4. 通知项目经理验收结果

## 验收报告模板

验收完成后，在 `docs/reports/TEST-POC0-001-report.md` 创建报告：

```markdown
# 验收报告：TEST-POC0-001

## 基本信息
- **验收编号**：TEST-POC0-001
- **对应任务**：TASK-POC0-001
- **验收 AI**：AI-QA-001
- **验收时间**：[YYYY-MM-DD HH:MM]
- **验收轮次**：第 [N] 次验收
- **验收结论**：✅ 通过 / ❌ 失败

## 验收执行情况

### 代码质量检查
- [✅/❌] TypeScript 编译：[通过/失败原因]
- [✅/❌] 编码规范：[通过/失败原因]
- [✅/❌] 文件结构：[通过/失败原因]
- [✅/❌] 依赖注入：[通过/失败原因]

### 功能验收结果
- [✅/❌] RPC Shape 定义：[结果描述]
- [✅/❌] MainThread Customer：[结果描述]
- [✅/❌] ExtHost API：[结果描述]
- [✅/❌] Worker 扩展：[结果描述]
- [✅/❌] Controller 扩展：[结果描述]

### 性能验收结果

#### 场景 1：基础流式传输
- chunk 丢失率：[实际值]
- chunk 乱序率：[实际值]
- 总延迟：[实际值]ms
- UI 卡顿：[有/无]
- **结论**：[✅ 通过 / ❌ 失败]

#### 场景 2：高频传输
- chunk 丢失率：[实际值]
- chunk 乱序率：[实际值]
- UI 响应性：[描述]
- **结论**：[✅ 通过 / ❌ 失败]

#### 场景 3：大 payload
- chunk 丢失率：[实际值]
- 内存占用变化：[实际值]MB
- 内存泄漏：[有/无]
- **结论**：[✅ 通过 / ❌ 失败]

#### 场景 4：并发调用
- 总体丢失率：[实际值]
- 主线程 CPU 额外占用：[实际值]%
- RPC 错误：[有/无]
- **结论**：[✅ 通过 / ❌ 失败]

### 边界条件测试结果
- [✅/❌] 空 invocationId：[结果描述]
- [✅/❌] 重复 seq：[结果描述]
- [✅/❌] 超大 seq：[结果描述]
- [✅/❌] 超长 text：[结果描述]
- [✅/❌] 快速连续调用：[结果描述]

### 错误处理验证结果
- [✅/❌] Worker 未加载：[结果描述]
- [✅/❌] ExtHost 崩溃恢复：[结果描述]
- [✅/❌] 超时处理：[结果描述]

## 验收总结

### 通过情况（如通过）

所有验收点均通过，RPC 流式传输性能符合预设标准。

**关键验收要点**：
- chunk 丢失率 0%，乱序率 0%
- 四个测试场景全部通过
- UI 无卡顿，主线程 CPU 占用 < 5%
- 内存无泄漏

**性能基线数据**：
- 基础流式传输（100 chunk × 20ms）：总延迟 [X]ms
- 高频传输（200 chunk × 10ms）：总延迟 [X]ms
- 大 payload（50 chunk × 4KB）：内存增量 [X]MB
- 并发调用（10 worker × 50 chunk）：CPU 增量 [X]%

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
   - 性能数据：[具体数值]
   - 建议修复方案：[具体建议]

2. **问题 2**：[问题描述]
   - 位置：[文件路径:行号]
   - 严重程度：[高/中/低]
   - 复现步骤：[具体步骤]
   - 预期结果：[应该是什么]
   - 实际结果：[实际是什么]
   - 建议修复方案：[具体建议]

## 后续操作

### 如果验收通过
- [✅] 在任务跟踪表中将 TASK-POC0-001 状态改为 ✅ 已完成
- [✅] 在任务跟踪表中将 TEST-POC0-001 状态改为 ✅ 通过
- [✅] 通知项目经理验收通过
- [✅] 将性能基线数据记录到 PoC-0 验证计划文档

### 如果验收失败
- [✅] 在任务跟踪表中将 TASK-POC0-001 状态改为 ❌ 验收失败
- [✅] 在任务跟踪表中将 TEST-POC0-001 状态改为 ❌ 失败
- [✅] 通知开发 AI 修复问题，修复后重新提交验收
- [✅] 如果性能严重不达标，考虑启动备选方案讨论

## 附录

### 测试环境信息
- 操作系统：[macOS/Linux/Windows]
- OS 版本：[版本号]
- Node 版本：[版本号]
- TypeScript 版本：[版本号]
- VS Code 版本：[版本号]
- CPU：[型号]
- 内存：[容量]

### 测试日志

#### 场景 1 输出
```
[粘贴场景 1 的完整控制台输出]
```

#### 场景 2 输出
```
[粘贴场景 2 的完整控制台输出]
```

#### 场景 3 输出
```
[粘贴场景 3 的完整控制台输出]
```

#### 场景 4 输出
```
[粘贴场景 4 的完整控制台输出]
```

### 性能监控截图
- [Activity Monitor / Task Manager 截图]
- [Chrome DevTools Performance 截图（如有）]

### 备选方案评估（如验收失败）

如果 RPC 流式传输验证失败，根据失败原因考虑以下备选方案：

1. **批量传输**：改为 `$acceptChunks(chunks: Chunk[])`，减少 RPC 调用次数
2. **背压控制**：增加流控机制，限制未确认 chunk 数量
3. **架构调整**：考虑使用 SharedArrayBuffer 或 MessageChannel
4. **降级方案**：仅支持低频场景，高频场景使用轮询
```

## 关键验收指标汇总

| 指标 | 目标值 | 测量方法 |
|------|--------|----------|
| chunk 丢失率 | 0% | 对比发送与接收的 seq |
| chunk 乱序率 | 0% | 检查 seq 单调递增 |
| 单次往返延迟 p95 | < 100ms | 记录每个 chunk 的发送/接收时间戳 |
| UI 卡顿 | 无明显卡顿 | 手动测试：发送过程中点击菜单、切换文件 |
| 主线程 CPU 额外占用 | < 5% | 使用 Activity Monitor / Task Manager |
| 内存泄漏 | 无持续上升 | 连续运行 5 分钟，观察内存曲线 |

**验收通过的必要条件**：
- 所有性能指标达标
- 四个测试场景全部通过
- 无架构级阻塞问题
- 代码质量符合 VS Code 规范
