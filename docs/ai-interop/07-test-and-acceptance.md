# AI Interop 平台能力：测试计划与验收文档

## 1. 文档目标

本文档定义平台能力的四层测试体系、关键测试场景与量化验收指标。

## 2. 测试分层

### 2.1 Unit Tests
覆盖：
- DTO 序列化
- 错误码映射
- ACL 判断
- 状态机转移
- chunk batching / backpressure
- 去重逻辑

目标：
- 核心模块覆盖率 ≥ 80%
- 关键状态机与权限逻辑 ≥ 90%

### 2.2 Integration Tests
运行在平台集成环境中，验证：
- mainThread / extHost RPC
- endpoint 注册
- invocation 生命周期
- cancel 穿透
- 权限弹窗决策
- audit 记录

### 2.3 Extension Fixture Tests
使用控制扩展 / 工作扩展 / 观察者扩展 fixture：
- controller 调 worker
- worker 发 chunk
- worker 发 toolCall
- observer 非法订阅失败
- chat / tool / webview adapter 接入

### 2.4 Multi-host / Remote Tests
验证：
- local -> local
- local -> remote
- remote -> local
- web host 降级
- remoteAuthority mismatch 拒绝。

## 3. 关键验收场景

### A. 本地双扩展流式调用
- A 调 B
- B 返回 1000 个 chunk
- A 正确收到并完成
- 审计完整

### B. cancel 穿透
- A 调 B
- 第 300 个 chunk 时 cancel
- B 收到取消并停止
- 平台记录 canceled

### C. 权限拒绝
- A 未授权调用 B
- 平台必须阻断
- B 不得被触发
- 审计写入 unauthorized

### D. remoteAuthority 错配
- 本地 session 调用远端不匹配 endpoint
- 平台必须 hard reject

### E. ext host 崩溃
- 目标 host 被 kill
- invocation 标记 orphaned
- session 状态更新可见
- 可 retry 或 abort。

## 4. 量化指标

| 指标 | 目标 |
|---|---|
| 本地消息往返 p95 | < 100ms |
| 远端消息往返 p95 | < 300ms |
| cancel 生效时间 | < 200ms |
| 流式吞吐 | >= 500 tokens/s 或等效 chunk 流 |
| 主线程额外 CPU | < 5% |
| 长时间高频流内存增长 | 可回收、无持续泄漏 |
| 未授权调用 | 100% 阻断 |
| remoteAuthority 错配 | 100% 阻断 |
| ext host crash 标记正确率 | 100% | :contentReference[oaicite:46]{index=46}

## 5. 通过 / 不通过判定

### 必须全部通过
1. 本地流式闭环
2. cancel 穿透
3. 权限拒绝
4. remoteAuthority 拒绝
5. orphaned 标记

### 任一失败即不通过
- 未授权调用仍可执行
- cancel 后仍有业务 chunk 继续流入
- ext host crash 未被记录
- 同一 invocation chunk 顺序错乱
- 主线程明显阻塞或失去响应。

## 6. CI Gate

建议将以下检查纳入 CI：
- 单元测试
- 集成测试
- fixture 扩展测试
- 多 host smoke
- 资源泄漏检查
- 性能基线回归。:contentReference[oaicite:48]{index=48}
