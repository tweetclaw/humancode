# AI Interop 平台能力：开发计划手册

## 1. 文档目标

本文档用于指导团队与自动化工具按阶段推进开发，明确依赖顺序、PoC 路径、验证方式与失败排查要点。

## 2. 阶段划分

### 2.1 PoC

目标：

- 两个扩展在 local host 通过平台总线流式通信；
- 支持 cancel；
- 最小审计落地。

### 2.2 MVP

目标：

- 增加 Session Broker；
- 增加权限策略与弹窗；
- 增加跨 host 路由基础；
- 增加基础审计 UI。

### 2.3 Phase 2

目标：

- Tool / MCP / CLI 深集成；
- remote / multi-host 扩展；
- 背压与限流；
- soak test。

### 2.4 Phase 3

目标：

- proposed -> stable
- 完整恢复
- 企业治理
- 审计能力完善

## 3. 任务顺序

### Step 1：最小 service 骨架

实现：

- `IAIInteropBusService`
- `IAISessionBrokerService`
- endpoint registry
- invocation registry

完成标准：

- Workbench service 能启动
- 可注册 / 注销 endpoint

### Step 2：RPC bridge

实现：

- `mainThreadAiInterop.ts`
- `extHostAiInterop.ts`
- `extHost.protocol.ts`
- `extHost.api.impl.ts` namespace 挂载

完成标准：

- 扩展能调用 `registerEndpoint`
- 主线程能收到 descriptor

### Step 3：PoC-1 同 host 流式调用

实现：

- `invoke`
- `acceptInvocationChunk`
- `complete`
- `fail`

验证：

- A 调 B
- B 连续发 chunk
- A 收到完整流

日志观察点：

- mainThread register log
- invocation start log
- chunk seq log
- completion log

### Step 4：PoC-2 cancel 穿透

实现：

- cancel API
- handler CancellationToken 透传
- canceled 状态写入

验证：

- A 调 B 后 cancel
- B 停止工作
- invocation 正确终止

日志观察点：

- cancel requested
- cancel forwarded
- handler acknowledged
- session state updated

### Step 5：PoC-3 跨 host 路由

实现：

- endpoint 记录 hostKind / remoteAuthority
- route selector
- mismatch reject

验证：

- local -> remote 成功
- remoteAuthority mismatch 拒绝

日志观察点：

- route decision
- remoteAuthority compare
- denied reason

### Step 6：PoC-4 权限弹窗

实现：

- 首次授权弹窗
- allow once / allow session / deny
- 决策持久化

验证：

- 未授权调用先弹窗
- 拒绝后不得调用
- session 内二次调用可复用决策

日志观察点：

- policy evaluation
- prompt shown
- decision stored

### Step 7：PoC-5 Tool / MCP 接入

实现：

- ToolCall chunk
- ToolRouter
- MCP adapter
- 审批接入

验证：

- worker 发 toolCall
- 平台审批
- 结果回写原 invocation

日志观察点：

- tool selected
- approval decision
- tool result mapped

## 4. 失败排查 checklist

### 注册失败

- namespace 是否挂载
- shape 是否注册
- mainThread customer 是否注入
- descriptor 是否合法

### 调用失败

- endpoint 是否存在
- target host 是否可达
- remoteAuthority 是否匹配
- session 是否已建立

### chunk 异常

- seq 是否递增
- payload 是否超限
- 调用是否已被 cancel / complete

### 权限异常

- 调用方是否有 invoke capability
- 目标方是否可被调用
- 授权记录是否存在
- 共享范围是否允许

### CLI / MCP 异常

- host 是否是 Node
- transport 是否可用
- 审批是否通过
- 工具是否只读 / 高危

## 5. POC 通过判定

### PoC-1 通过

- 注册成功
- 流式 chunk 无丢失
- completion 正常到达

### PoC-2 通过

- cancel 200ms 内生效
- target handler 不再继续流式输出

### PoC-3 通过

- 匹配 host 时成功路由
- 错配时明确拒绝

### PoC-4 通过

- 未授权调用会弹窗
- deny 后真实阻断
- allow_session 可复用

### PoC-5 通过

- toolCall 可以被调度
- 需要审批时会审批
- tool result 正确回写

## 6. 建议资源估算

- PoC：6–10 engineer-weeks
- MVP：18–28 engineer-weeks
- Phase 2：24–40 engineer-weeks

如果需要更高的 SLA，还需额外投入在：

- 协议压缩
- 流控
- 限流
- 内存回收
- 多 host 恢复
