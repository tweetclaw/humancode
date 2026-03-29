# PoC-0: AI Interop 技术预研验证阶段

**阶段目标**: 验证 AI Interop 平台架构的三个核心技术可行性点

**状态**: ✅ 已完成

**开始时间**: 2026-03-26

**预计工时**: 9-13 天 (约 2 周)

---

## 一、阶段概述

PoC-0 是 AI Interop 平台能力开发的**技术预研阶段**,目标是在正式开发前验证三个最高风险的技术点:

1. **RPC 流式传输性能** - MainThread ↔ ExtHost RPC 能否承载高频 AI chunk
2. **CancellationToken 穿透** - cancel 信号能否在 200ms 内生效
3. **跨 Host 路由与隔离** - local/remote/web 环境的路由和安全隔离

**Go/No-Go 决策**: 只有三个验证点**全部通过**,才能进入 PoC-1 正式开发阶段。

---

## 二、任务跟踪表

| 任务编号 | 任务名称 | 开发 AI | 验收 AI | 依赖任务 | 状态 | 验收编号 | 验收状态 |
|---------|---------|---------|---------|---------|------|---------|---------|
| TASK-POC0-001 | RPC 流式传输性能验证 | AI-Dev-001 | AI-QA-001 | - | ✅ 已完成 | TEST-POC0-001 | ✅ 通过 |
| TASK-POC0-002 | CancellationToken 穿透验证 | AI-Dev-001 | AI-QA-002 | - | ✅ 已完成 | TEST-POC0-002 | ✅ 通过 |
| TASK-POC0-003 | 跨 Host 路由验证 | AI-Dev-002 | AI-QA-002 | - | ✅ 已完成 | TEST-POC0-003 | ✅ 通过 |
| TASK-POC0-004 | PoC-0 总结报告 | AI-PM-001 | - | TASK-POC0-001, TASK-POC0-002, TASK-POC0-003 | ✅ 已完成 | - | - |

**状态说明**:
- ⬜ 待开始: 任务尚未分配或开始
- 🏗️ 进行中: 开发 AI 正在实现
- ⏸️ 待验收: 开发完成,等待验收 AI 验收
- ✅ 已完成: 验收通过,任务完成
- ❌ 验收失败: 验收未通过,需要修复

---

## 三、验证点详细说明

### 验证点 1: RPC 流式传输性能 (最高优先级)

**验证目标**: 证明 VS Code 的 MainThread ↔ ExtHost RPC 机制能够承载高频流式 AI chunk 传输

**通过标准**:
- ✅ 100 个 chunk 全量到达,无丢失
- ✅ seq 无乱序
- ✅ 单次往返延迟 p95 < 100ms
- ✅ 无 UI 卡顿
- ✅ 主线程 CPU 额外占用 < 5%
- ✅ 无内存泄漏

**测试场景**:
1. 基础流式传输: 每 20ms 发送 1 个 chunk,共 100 个
2. 高频传输: 每 10ms 发送 1 个 chunk,共 200 个
3. 大 payload: 每 50ms 发送 1 个 4KB chunk,共 50 个
4. 并发调用: 10 个 worker 同时发送,每个 50 chunk

**预计工时**: 3-5 天

---

### 验证点 2: CancellationToken 穿透

**验证目标**: 证明 cancel 信号可以从 controller 扩展穿透到 worker 扩展的 handler,且在 200ms 内生效

**通过标准**:
- ✅ Cancel 生效时间 < 200ms
- ✅ Cancel 成功率 100%
- ✅ 状态一致性 100%

**测试场景**:
1. 基础取消: Worker 准备发送 1000 个 chunk,Controller 在第 50 个后取消
2. 立即取消: Controller 发起调用后立即取消
3. 并发取消: 10 个并发调用,随机时间点取消

**预计工时**: 2-3 天

---

### 验证点 3: 跨 Host 路由与隔离

**验证目标**: 证明平台可以正确识别 endpoint 的 hostKind 和 remoteAuthority,并在错配时拒绝调用

**通过标准**:
- ✅ 匹配路由成功率 100%
- ✅ 错配拒绝率 100%
- ✅ 错误码准确性 100%
- ✅ 审计记录完整性 100%

**测试场景**:
1. 同 host 调用: local → local, remote(A) → remote(A)
2. 跨 host 调用: local → remote, remote → local
3. 错配拒绝: remote(A) → remote(B), web → local

**预计工时**: 3-4 天

---

## 四、AI 角色分配

| AI 标识 | 角色类型 | 负责任务(开发) | 负责任务(验收) |
|---------|---------|----------------|----------------|
| AI-Dev-001 | 开发 AI | TASK-P0-001, TASK-P0-002 | - |
| AI-Dev-002 | 开发 AI | TASK-P0-003 | - |
| AI-QA-001 | 验收 AI | - | TEST-P0-001, TEST-P0-002 |
| AI-QA-002 | 验收 AI | - | TEST-P0-003 |
| AI-PM-001 | 项目经理 AI | TASK-P0-004 (总结报告) | - |

---

## 五、成功标准

PoC-0 成功必须同时满足:

1. ✅ RPC 流式传输: 100 chunk 无丢失,p95 延迟 < 100ms,无 UI 卡顿
2. ✅ Cancel 穿透: 200ms 内生效,100% 成功率
3. ✅ 跨 Host 路由: 匹配时成功,错配时拒绝,错误码准确

**只有三个验证点全部通过,才能进入 PoC-1 正式开发阶段。**

---

## 六、失败应对策略

### 如果验证点 1 失败 (RPC 流式传输)

**备选方案**:
1. 批量传输: 改为 `$acceptChunks(chunks: Chunk[])`,减少 RPC 调用次数
2. 背压控制: 增加流控机制,限制未确认 chunk 数量
3. 架构调整: 考虑使用 SharedArrayBuffer 或 MessageChannel
4. 降级方案: 仅支持低频场景,高频场景使用轮询

### 如果验证点 2 失败 (Cancel 穿透)

**备选方案**:
1. 轮询优化: 减少 `isCancellationRequested` 检查间隔
2. 主动推送: 改为 `$onCancel(invocationId)` 回调模式
3. 超时兜底: 增加 timeout 机制,强制终止

### 如果验证点 3 失败 (跨 Host 路由)

**备选方案**:
1. 简化策略: Phase 1 仅支持 local host,remote/web 作为 Phase 2
2. 显式配置: 要求用户在 settings 中显式配置跨 host 策略
3. 降级方案: 跨 host 调用改为异步队列模式

---

## 七、关键文档

- **详细验证计划**: [00-poc-0-technical-validation.md](../ai-interop/00-poc-0-technical-validation.md)
- **核心架构设计**: [02-core-architecture.md](../ai-interop/02-core-architecture.md)
- **RPC 协议规范**: [03-rpc-and-dto-spec.md](../ai-interop/03-rpc-and-dto-spec.md)

---

## 八、更新日志

| 日期 | 更新内容 | 更新人 |
|------|---------|--------|
| 2026-03-26 | 创建 PoC-0 阶段文档,定义三个验证点 | AI-PM-001 |
| 2026-03-29 | 更新任务跟踪表:TASK-POC0-001 和 TASK-POC0-002 已完成并通过验收 | AI-PM-001 |
| 2026-03-29 | PoC-0 阶段全部完成,创建总结报告,建议进入 PoC-1 阶段 | AI-PM-001 |
